from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.donor import DonorProfile
    from app.models.request import BloodRequest
    from app.models.report import Report
    from app.models.notification import Notification


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
        comment="PRODUCTION TODO: encrypt at rest with AES-256-GCM"
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="donor",
        comment="One of: donor, requester, admin"
    )

    # PRIVACY-SENSITIVE: One-way SHA-256 hash — see module docstring
    cnic_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True,
        comment="PRIVACY-SENSITIVE: SHA-256 hash of CNIC. One-way only."
    )

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Data privacy consent — required at registration
    consent_given: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="User consented to data collection/processing at registration"
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
    donor_profile: Mapped[DonorProfile | None] = relationship(
        "DonorProfile", back_populates="user", uselist=False
    )
    blood_requests: Mapped[list[BloodRequest]] = relationship(
        "BloodRequest", back_populates="requester"
    )
    reports: Mapped[list[Report]] = relationship(
        "Report", back_populates="reporter"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone='{self.phone}', role='{self.role}')>"
