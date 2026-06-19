from pydantic import BaseModel
from datetime import datetime
from ..models.report import ReportStatus, ItemType, Severity


class ReportItemOut(BaseModel):
    id: int
    item_type: ItemType
    severity: Severity
    timestamp_seconds: float
    timestamp_label: str
    title: str
    description: str
    suggested_response: str | None
    context_quote: str | None

    model_config = {"from_attributes": True}


class GhostReportOut(BaseModel):
    id: int
    meeting_id: int
    user_id: int
    status: ReportStatus
    summary: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    items: list[ReportItemOut] = []

    model_config = {"from_attributes": True}
