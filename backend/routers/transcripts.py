from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models.transcript import Transcript, TranscriptTurn
from ..models.meeting import Meeting, MeetingStatus
from ..models.user import User
from ..schemas.transcript import TranscriptOut, TranscriptPaste
from ..services.whisper_service import transcribe_audio, parse_pasted_transcript
from ..dependencies import get_current_user

router = APIRouter(prefix="/meetings/{meeting_id}/transcript", tags=["transcripts"])

ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "video/mp4", "video/webm"}


async def _get_meeting_as_owner(meeting_id: int, user_id: int, db: AsyncSession) -> Meeting:
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the meeting owner can upload transcripts")
    return meeting


@router.post("/upload-audio", response_model=TranscriptOut, status_code=201)
async def upload_audio(
    meeting_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting_as_owner(meeting_id, current_user.id, db)

    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    audio_bytes = await file.read()
    whisper_result = await transcribe_audio(audio_bytes, file.filename or "audio.mp3")

    return await _save_transcript(
        db=db,
        meeting=meeting,
        raw_text=whisper_result["text"],
        duration=whisper_result.get("duration"),
        turns_raw=[
            {"speaker_label": "SPEAKER", "start_time": s["start"], "content": s["text"]}
            for s in whisper_result["segments"]
        ],
        source="whisper",
    )


@router.post("/paste", response_model=TranscriptOut, status_code=201)
async def paste_transcript(
    meeting_id: int,
    body: TranscriptPaste,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting_as_owner(meeting_id, current_user.id, db)

    turns_raw = parse_pasted_transcript(body.text)

    return await _save_transcript(
        db=db,
        meeting=meeting,
        raw_text=body.text,
        duration=None,
        turns_raw=turns_raw,
        source="paste",
        speaker_map=body.speaker_map,
    )


@router.get("", response_model=TranscriptOut)
async def get_transcript(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transcript)
        .where(Transcript.meeting_id == meeting_id)
        .options(selectinload(Transcript.turns))
    )
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="No transcript for this meeting")
    return transcript


@router.delete("", status_code=204)
async def delete_transcript(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = await _get_meeting_as_owner(meeting_id, current_user.id, db)
    result = await db.execute(select(Transcript).where(Transcript.meeting_id == meeting_id))
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="No transcript found")
    await db.delete(transcript)
    meeting.status = MeetingStatus.pending
    await db.commit()


async def _save_transcript(
    db: AsyncSession,
    meeting: Meeting,
    raw_text: str,
    duration: float | None,
    turns_raw: list[dict],
    source: str,
    speaker_map: dict | None = None,
) -> Transcript:
    # Delete existing transcript if any
    existing = await db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting.id)
    )
    existing_transcript = existing.scalar_one_or_none()
    if existing_transcript:
        await db.delete(existing_transcript)
        await db.flush()

    transcript = Transcript(
        meeting_id=meeting.id,
        raw_text=raw_text,
        duration_seconds=duration,
        speaker_map=speaker_map,
        source=source,
    )
    db.add(transcript)
    await db.flush()

    for turn in turns_raw:
        t = TranscriptTurn(
            transcript_id=transcript.id,
            speaker_label=turn["speaker_label"],
            speaker_name=speaker_map.get(turn["speaker_label"]) if speaker_map else None,
            start_time=turn["start_time"],
            end_time=turn.get("end_time", turn["start_time"] + 30.0),
            content=turn["content"],
        )
        db.add(t)

    meeting.status = MeetingStatus.transcribed
    await db.commit()

    result = await db.execute(
        select(Transcript)
        .where(Transcript.id == transcript.id)
        .options(selectinload(Transcript.turns))
    )
    return result.scalar_one()
