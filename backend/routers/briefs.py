from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.brief import PrivateBrief
from ..models.meeting import Meeting, MeetingParticipant
from ..models.user import User
from ..schemas.brief import BriefCreate, BriefUpdate, BriefOut
from ..dependencies import get_current_user

router = APIRouter(prefix="/meetings/{meeting_id}/brief", tags=["briefs"])


async def _assert_participant(meeting_id: int, user_id: int, db: AsyncSession):
    result = await db.execute(
        select(MeetingParticipant).where(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant in this meeting")


@router.post("", response_model=BriefOut, status_code=201)
async def create_brief(
    meeting_id: int,
    body: BriefCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_participant(meeting_id, current_user.id, db)

    existing = await db.execute(
        select(PrivateBrief).where(
            PrivateBrief.meeting_id == meeting_id,
            PrivateBrief.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Brief already exists — use PATCH to update")

    brief = PrivateBrief(**body.model_dump(), meeting_id=meeting_id, user_id=current_user.id)
    db.add(brief)
    await db.commit()
    await db.refresh(brief)
    return brief


@router.get("", response_model=BriefOut)
async def get_my_brief(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PrivateBrief).where(
            PrivateBrief.meeting_id == meeting_id,
            PrivateBrief.user_id == current_user.id,
        )
    )
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No brief found")
    return brief


@router.patch("", response_model=BriefOut)
async def update_brief(
    meeting_id: int,
    body: BriefUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PrivateBrief).where(
            PrivateBrief.meeting_id == meeting_id,
            PrivateBrief.user_id == current_user.id,
        )
    )
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No brief found — use POST to create")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(brief, field, value)

    await db.commit()
    await db.refresh(brief)
    return brief


@router.delete("", status_code=204)
async def delete_brief(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PrivateBrief).where(
            PrivateBrief.meeting_id == meeting_id,
            PrivateBrief.user_id == current_user.id,
        )
    )
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="No brief found")
    await db.delete(brief)
    await db.commit()
