from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="system",
        comment="One of: match_found, request_update, donation_confirmed, system"
    )

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    data_json: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="JSON payload with extra data (e.g. request_id, match_id)"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return (
            f"<Notification(id={self.id}, type='{self.type}', "
            f"read={self.is_read})>"
        )
