from pydantic import BaseModel
from datetime import datetime


class TranscriptTurnOut(BaseModel):
    id: int
    speaker_label: str
    speaker_name: str | None
    start_time: float
    end_time: float
    content: str

    model_config = {"from_attributes": True}


class TranscriptOut(BaseModel):
    id: int
    meeting_id: int
    raw_text: str
    duration_seconds: float | None
    speaker_map: dict | None
    source: str
    created_at: datetime
    turns: list[TranscriptTurnOut] = []

    model_config = {"from_attributes": True}


class TranscriptPaste(BaseModel):
    text: str
    speaker_map: dict[str, str] | None = None
