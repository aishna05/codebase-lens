from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..database import Base
import enum


class MeetingStatus(str, enum.Enum):
    pending = "pending"
    transcribed = "transcribed"
    analyzing = "analyzing"
    ready = "ready"


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[MeetingStatus] = mapped_column(
        SAEnum(MeetingStatus), default=MeetingStatus.pending, nullable=False
    )
    meeting_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="meetings_owned")
    participants: Mapped[list["MeetingParticipant"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")
    transcript: Mapped["Transcript | None"] = relationship(back_populates="meeting", cascade="all, delete-orphan", uselist=False)
    briefs: Mapped[list["PrivateBrief"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")
    reports: Mapped[list["GhostReport"]] = relationship(back_populates="meeting", cascade="all, delete-orphan")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    speaker_label: Mapped[str | None] = mapped_column(String(50))
    joined_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(back_populates="participations")
