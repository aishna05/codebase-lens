from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..models.report import GhostReport, ReportItem, ReportStatus, ItemType, Severity
from ..models.meeting import Meeting
from ..models.transcript import Transcript
from ..models.brief import PrivateBrief
from .claude_service import generate_ghost_report


async def generate_report_for_user(
    db: AsyncSession,
    meeting_id: int,
    user_id: int,
) -> GhostReport:
    # Get or create report
    result = await db.execute(
        select(GhostReport).where(
            GhostReport.meeting_id == meeting_id,
            GhostReport.user_id == user_id,
        )
    )
    report = result.scalar_one_or_none()

    if report is None:
        report = GhostReport(meeting_id=meeting_id, user_id=user_id, status=ReportStatus.pending)
        db.add(report)
        await db.commit()
        await db.refresh(report)

    # Mark as generating
    report.status = ReportStatus.generating
    await db.commit()

    try:
        # Load transcript with turns
        transcript_result = await db.execute(
            select(Transcript)
            .where(Transcript.meeting_id == meeting_id)
            .options(selectinload(Transcript.turns))
        )
        transcript = transcript_result.scalar_one_or_none()
        if not transcript:
            raise ValueError("No transcript found for this meeting")

        # Load private brief
        brief_result = await db.execute(
            select(PrivateBrief).where(
                PrivateBrief.meeting_id == meeting_id,
                PrivateBrief.user_id == user_id,
            )
        )
        brief = brief_result.scalar_one_or_none()
        if not brief:
            raise ValueError("No private brief found — please complete your brief before generating a report")

        # Load user name
        from ..models.user import User
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one()

        # Build turn dicts with resolved speaker names
        speaker_map = transcript.speaker_map or {}
        turns = [
            {
                "speaker_label": t.speaker_label,
                "speaker_name": speaker_map.get(t.speaker_label, t.speaker_label),
                "start_time": t.start_time,
                "content": t.content,
            }
            for t in transcript.turns
        ]

        brief_dict = {
            "role": brief.role,
            "goals": brief.goals,
            "relationships": brief.relationships,
            "stakes": brief.stakes,
            "ammunition": brief.ammunition,
            "ideas": brief.ideas,
        }

        # Call Claude
        result_data = await generate_ghost_report(turns, brief_dict, user.name)

        # Persist results
        # Delete old items if regenerating
        for old_item in report.items:
            await db.delete(old_item)

        report.summary = result_data.get("summary", "")
        report.status = ReportStatus.ready
        report.error_message = None

        for item_data in result_data.get("items", []):
            item = ReportItem(
                report_id=report.id,
                item_type=ItemType(item_data["item_type"]),
                severity=Severity(item_data["severity"]),
                timestamp_seconds=float(item_data.get("timestamp_seconds", 0)),
                timestamp_label=item_data.get("timestamp_label", "0:00"),
                title=item_data["title"],
                description=item_data["description"],
                suggested_response=item_data.get("suggested_response"),
                context_quote=item_data.get("context_quote"),
            )
            db.add(item)

        await db.commit()
        await db.refresh(report)
        return report

    except Exception as e:
        report.status = ReportStatus.failed
        report.error_message = str(e)
        await db.commit()
        raise
