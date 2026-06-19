from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.meeting import Meeting, MeetingParticipant
from ..models.user import User
from ..models.brief import PrivateBrief
from ..models.transcript import Transcript
from ..models.report import GhostReport
from ..schemas.meeting import MeetingCreate, MeetingUpdate, MeetingOut, MeetingDetail, ParticipantOut, SpeakerMapUpdate
from ..dependencies import get_current_user

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("", response_model=MeetingOut, status_code=201)
async def create_meeting(
    body: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = Meeting(**body.model_dump(), owner_id=current_user.id)
    db.add(meeting)
    await db.flush()

    # Auto-add creator as participant
    participant = MeetingParticipant(meeting_id=meeting.id, user_id=current_user.id)
    db.add(participant)
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.get("", response_model=list[MeetingOut])
async def list_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Meetings user owns or participates in
    result = await db.execute(
        select(Meeting)
        .join(MeetingParticipant, MeetingParticipant.meeting_id == Meeting.id)
        .where(MeetingParticipant.user_id == current_user.id)
        .order_by(Meeting.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{meeting_id}", response_model=MeetingDetail)
async def get_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.participants).selectinload(MeetingParticipant.user),
            selectinload(Meeting.transcript),
            selectinload(Meeting.briefs),
            selectinload(Meeting.reports),
        )
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Check access
    participant_ids = {p.user_id for p in meeting.participants}
    if current_user.id not in participant_ids and meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")

    detail = MeetingDetail.model_validate(meeting)
    detail.has_transcript = meeting.transcript is not None
    detail.has_my_brief = any(b.user_id == current_user.id for b in meeting.briefs)
    detail.has_my_report = any(r.user_id == current_user.id for r in meeting.reports)
    detail.participants = [
        ParticipantOut(
            id=p.id,
            user_id=p.user_id,
            meeting_id=p.meeting_id,
            speaker_label=p.speaker_label,
            user_name=p.user.name,
            user_email=p.user.email,
        )
        for p in meeting.participants
    ]
    return detail


@router.patch("/{meeting_id}", response_model=MeetingOut)
async def update_meeting(
    meeting_id: int,
    body: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can update this meeting")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(meeting, field, value)

    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this meeting")
    await db.delete(meeting)
    await db.commit()


@router.post("/{meeting_id}/invite", response_model=ParticipantOut, status_code=201)
async def invite_participant(
    meeting_id: int,
    email: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting or meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised")

    user_result = await db.execute(select(User).where(User.email == email))
    invite_user = user_result.scalar_one_or_none()
    if not invite_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.user_id == invite_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a participant")

    p = MeetingParticipant(meeting_id=meeting_id, user_id=invite_user.id)
    db.add(p)
    await db.commit()
    await db.refresh(p)

    return ParticipantOut(
        id=p.id,
        user_id=p.user_id,
        meeting_id=p.meeting_id,
        speaker_label=p.speaker_label,
        user_name=invite_user.name,
        user_email=invite_user.email,
    )


@router.patch("/{meeting_id}/speaker-map")
async def update_speaker_map(
    meeting_id: int,
    body: SpeakerMapUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting or meeting.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised")

    transcript_result = await db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting_id)
    )
    transcript = transcript_result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="No transcript found")

    transcript.speaker_map = body.speaker_map
    await db.commit()
    return {"ok": True}
