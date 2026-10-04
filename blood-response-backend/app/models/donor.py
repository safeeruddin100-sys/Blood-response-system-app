from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.request import DonationMatch


class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
    )

    blood_group: Mapped[str] = mapped_column(
        String(5), nullable=False, index=True,
        comment="One of: A+, A-, B+, B-, AB+, AB-, O+, O-"
    )

    # Location
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Availability & cooldown
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    last_donation_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cooldown_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Auto-calculated: last_donation_date + COOLDOWN_DAYS"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="donor_profile")
    donation_matches: Mapped[list[DonationMatch]] = relationship(
        "DonationMatch", back_populates="donor"
    )

    def __repr__(self) -> str:
        return (
            f"<DonorProfile(id={self.id}, blood_group='{self.blood_group}', "
            f"available={self.is_available})>"
        )
