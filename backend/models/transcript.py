from sqlalchemy import String, Text, ForeignKey, DateTime, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), unique=True, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    # Maps speaker labels (SPEAKER_00) to names
    speaker_map: Mapped[dict | None] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(50), default="upload")  # upload | whisper | paste
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meeting: Mapped["Meeting"] = relationship(back_populates="transcript")
    turns: Mapped[list["TranscriptTurn"]] = relationship(back_populates="transcript", cascade="all, delete-orphan", order_by="TranscriptTurn.start_time")


class TranscriptTurn(Base):
    __tablename__ = "transcript_turns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    transcript_id: Mapped[int] = mapped_column(ForeignKey("transcripts.id"), nullable=False)
    speaker_label: Mapped[str] = mapped_column(String(100), nullable=False)
    speaker_name: Mapped[str | None] = mapped_column(String(255))
    start_time: Mapped[float] = mapped_column(Float, nullable=False)  # seconds
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    transcript: Mapped["Transcript"] = relationship(back_populates="turns")
