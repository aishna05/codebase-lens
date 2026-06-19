from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class ReportStatus(str, enum.Enum):
    pending = "pending"
    generating = "generating"
    ready = "ready"
    failed = "failed"


class ItemType(str, enum.Enum):
    missed_defense = "missed_defense"
    unclaimed_idea = "unclaimed_idea"
    missed_opportunity = "missed_opportunity"
    power_dynamic = "power_dynamic"
    positive_moment = "positive_moment"


class Severity(str, enum.Enum):
    red = "red"
    yellow = "yellow"
    green = "green"


class GhostReport(Base):
    __tablename__ = "ghost_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[ReportStatus] = mapped_column(SAEnum(ReportStatus), default=ReportStatus.pending)
    summary: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="reports")
    user: Mapped["User"] = relationship(back_populates="reports")
    items: Mapped[list["ReportItem"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportItem.timestamp_seconds"
    )


class ReportItem(Base):
    __tablename__ = "report_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("ghost_reports.id"), nullable=False)
    item_type: Mapped[ItemType] = mapped_column(SAEnum(ItemType), nullable=False)
    severity: Mapped[Severity] = mapped_column(SAEnum(Severity), nullable=False)
    timestamp_seconds: Mapped[float] = mapped_column(nullable=False)
    timestamp_label: Mapped[str] = mapped_column(String(20), nullable=False)  # "9:14"
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_response: Mapped[str | None] = mapped_column(Text)
    context_quote: Mapped[str | None] = mapped_column(Text)

    report: Mapped["GhostReport"] = relationship(back_populates="items")
