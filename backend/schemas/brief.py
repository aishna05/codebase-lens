from pydantic import BaseModel
from datetime import datetime


class BriefCreate(BaseModel):
    role: str
    goals: str
    relationships: str | None = None
    stakes: str | None = None
    ammunition: str | None = None
    ideas: str | None = None


class BriefUpdate(BriefCreate):
    pass


class BriefOut(BaseModel):
    id: int
    meeting_id: int
    user_id: int
    role: str
    goals: str
    relationships: str | None
    stakes: str | None
    ammunition: str | None
    ideas: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
