from pydantic import BaseModel
from datetime import datetime
from ..models.meeting import MeetingStatus


class MeetingCreate(BaseModel):
    title: str
    description: str | None = None
    meeting_date: datetime | None = None


class MeetingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    meeting_date: datetime | None = None


class ParticipantOut(BaseModel):
    id: int
    user_id: int
    meeting_id: int
    speaker_label: str | None
    user_name: str
    user_email: str

    model_config = {"from_attributes": True}


class MeetingOut(BaseModel):
    id: int
    title: str
    description: str | None
    owner_id: int
    status: MeetingStatus
    meeting_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MeetingDetail(MeetingOut):
    participants: list[ParticipantOut] = []
    has_transcript: bool = False
    has_my_brief: bool = False
    has_my_report: bool = False


class SpeakerMapUpdate(BaseModel):
    speaker_map: dict[str, str]
