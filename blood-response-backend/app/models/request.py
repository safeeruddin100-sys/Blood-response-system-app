from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.donor import DonorProfile
    from app.models.hospital import Hospital
    from app.models.report import Report


class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    # Patient info
    patient_name: Mapped[str] = mapped_column(String(100), nullable=False)
    blood_group: Mapped[str] = mapped_column(
        String(5), nullable=False, index=True,
        comment="Blood group needed (recipient's type)"
    )

    # Units tracking
    units_needed: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    units_confirmed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Urgency & status
    urgency: Mapped[str] = mapped_column(
        String(20), nullable=False, default="normal",
        comment="One of: critical, normal"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True,
        comment="One of: pending, in_progress, fulfilled, expired"
    )

    # Hospital & location
    hospital_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hospital_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("hospitals.id"), nullable=True
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Contact
    contact_phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="PRODUCTION TODO: encrypt at rest"
    )

    # Verification & moderation
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)

    # Expiry
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(hours=48),
        comment="Auto-expire after this timestamp if not fulfilled"
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
    requester: Mapped[User] = relationship("User", back_populates="blood_requests")
    hospital: Mapped[Hospital | None] = relationship("Hospital", back_populates="blood_requests")
    donation_matches: Mapped[list[DonationMatch]] = relationship(
        "DonationMatch", back_populates="blood_request"
    )
    reports: Mapped[list[Report]] = relationship(
        "Report", back_populates="blood_request"
    )

    def __repr__(self) -> str:
        return (
            f"<BloodRequest(id={self.id}, blood_group='{self.blood_group}', "
            f"status='{self.status}', urgency='{self.urgency}')>"
        )


class DonationMatch(Base):
    """
    Tracks the relationship between a blood request and a matched donor.
    Created when a request is posted and matching donors are found.
    """
    __tablename__ = "donation_matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("blood_requests.id"), nullable=False
    )
    donor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("donor_profiles.id"), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="notified",
        comment="One of: notified, accepted, confirmed, declined, expired"
    )

    notified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    blood_request: Mapped[BloodRequest] = relationship(
        "BloodRequest", back_populates="donation_matches"
    )
    donor: Mapped[DonorProfile] = relationship(
        "DonorProfile", back_populates="donation_matches"
    )

    def __repr__(self) -> str:
        return (
            f"<DonationMatch(id={self.id}, request={self.request_id}, "
            f"donor={self.donor_id}, status='{self.status}')>"
        )
