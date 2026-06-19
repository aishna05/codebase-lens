from sqlalchemy import String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..database import Base


class PrivateBrief(Base):
    __tablename__ = "private_briefs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Their role in this meeting
    role: Mapped[str] = mapped_column(String(500), nullable=False)

    # What they want to achieve
    goals: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships with other attendees (stored as free text)
    relationships: Mapped[str | None] = mapped_column(Text)

    # What's at stake for them
    stakes: Mapped[str | None] = mapped_column(Text)

    # Specific data points, arguments, or facts they have available
    ammunition: Mapped[str | None] = mapped_column(Text)

    # Ideas they want to propose or defend
    ideas: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="briefs")
    user: Mapped["User"] = relationship(back_populates="briefs")
