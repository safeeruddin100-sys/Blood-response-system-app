"""
Models package — import all models here so Alembic and relationships resolve correctly.
"""

from app.models.base import Base
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.models.hospital import Hospital
from app.models.report import Report
from app.models.notification import Notification

__all__ = [
    "Base",
    "User",
    "DonorProfile",
    "BloodRequest",
    "DonationMatch",
    "Hospital",
    "Report",
    "Notification",
]
