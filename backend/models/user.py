from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meetings_owned: Mapped[list["Meeting"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    participations: Mapped[list["MeetingParticipant"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    briefs: Mapped[list["PrivateBrief"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reports: Mapped[list["GhostReport"]] = relationship(back_populates="user", cascade="all, delete-orphan")
