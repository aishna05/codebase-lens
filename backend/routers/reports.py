from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.report import GhostReport, ReportStatus
from ..models.meeting import MeetingParticipant
from ..models.user import User
from ..schemas.report import GhostReportOut
from ..services.report_service import generate_report_for_user
from ..dependencies import get_current_user

router = APIRouter(prefix="/meetings/{meeting_id}/report", tags=["reports"])


@router.post("/generate", response_model=GhostReportOut, status_code=202)
async def request_report(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify participant
    result = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant in this meeting")

    # Check if already generating
    existing = await db.execute(
        select(GhostReport).where(
            GhostReport.meeting_id == meeting_id,
            GhostReport.user_id == current_user.id,
        )
    )
    report = existing.scalar_one_or_none()
    if report and report.status == ReportStatus.generating:
        raise HTTPException(status_code=409, detail="Report is already being generated")

    # Run generation in background
    background_tasks.add_task(
        _run_generation,
        meeting_id=meeting_id,
        user_id=current_user.id,
    )

    # Return placeholder
    if not report:
        report = GhostReport(
            meeting_id=meeting_id,
            user_id=current_user.id,
            status=ReportStatus.generating,
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
    else:
        report.status = ReportStatus.generating
        await db.commit()

    return report


@router.get("", response_model=GhostReportOut)
async def get_my_report(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GhostReport)
        .where(
            GhostReport.meeting_id == meeting_id,
            GhostReport.user_id == current_user.id,
        )
        .options(selectinload(GhostReport.items))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="No report found — request generation first")
    return report


async def _run_generation(meeting_id: int, user_id: int):
    """Background task: create a new DB session and generate the report."""
    from ..database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await generate_report_for_user(db, meeting_id, user_id)
        except Exception:
            pass  # errors are persisted to report.error_message inside the service
