"""
Cooldown service — manages the 90-day post-donation cooldown period.

Two mechanisms ensure cooldown is enforced without requiring a cron job:
1. LAZY CHECK (on-read): When a donor profile is fetched, check if cooldown
   has expired and auto-flip is_available=True if so.
2. BULK CHECK (scheduled): run_bulk_cooldown_check() can be called periodically
   (e.g. via a cron job in production, or a startup event in dev).
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.donor import DonorProfile


def _to_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def check_and_update_cooldown(donor: DonorProfile, db: Session) -> DonorProfile:
    """
    Lazy cooldown check — called when a donor profile is read.
    If the cooldown period has expired, set is_available=True.

    Returns the (potentially updated) donor profile.
    """
    expires_at = _to_utc(donor.cooldown_expires_at)
    if (
        not donor.is_available
        and expires_at is not None
        and expires_at <= datetime.now(timezone.utc)
    ):
        donor.is_available = True
        donor.cooldown_expires_at = None
        db.add(donor)
        db.commit()
        db.refresh(donor)

    return donor


def start_cooldown(donor: DonorProfile, db: Session, donation_date: datetime | None = None) -> DonorProfile:
    """
    Start the cooldown period after a confirmed donation.
    Sets is_available=False and calculates cooldown_expires_at.

    Args:
        donor: The donor profile to put on cooldown.
        db: Database session.
        donation_date: When the donation happened. Defaults to now.
    """
    if donation_date is None:
        donation_date = datetime.now(timezone.utc)

    donor.last_donation_date = donation_date
    donor.cooldown_expires_at = donation_date + timedelta(days=settings.COOLDOWN_DAYS)
    donor.is_available = False

    db.add(donor)
    db.commit()
    db.refresh(donor)
    return donor


def get_cooldown_status(donor: DonorProfile) -> dict:
    """
    Get human-readable cooldown status for a donor.

    Returns:
        dict with keys: is_available, days_until_available, cooldown_status
    """
    if donor.is_available:
        return {
            "is_available": True,
            "days_until_available": 0,
            "cooldown_status": "Available for donation",
        }

    if donor.cooldown_expires_at is None:
        return {
            "is_available": False,
            "days_until_available": None,
            "cooldown_status": "Unavailable (manually set)",
        }

    now = datetime.now(timezone.utc)
    expires_at = _to_utc(donor.cooldown_expires_at)
    if expires_at <= now:
        return {
            "is_available": True,
            "days_until_available": 0,
            "cooldown_status": "Cooldown expired — available",
        }

    days_left = max(0, int(round((expires_at - now).total_seconds() / 86400.0)))
    return {
        "is_available": False,
        "days_until_available": days_left,
        "cooldown_status": f"Available in {days_left} days",
    }


def run_bulk_cooldown_check(db: Session) -> int:
    """
    Bulk update all donors whose cooldown has expired.
    Can be called on app startup or via a scheduled task.

    Returns:
        Number of donors whose availability was restored.
    """
    now = datetime.now(timezone.utc)
    expired_donors = (
        db.query(DonorProfile)
        .filter(
            DonorProfile.is_available == False,
            DonorProfile.cooldown_expires_at != None,
            DonorProfile.cooldown_expires_at <= now,
        )
        .all()
    )

    for donor in expired_donors:
        donor.is_available = True
        donor.cooldown_expires_at = None

    if expired_donors:
        db.commit()

    return len(expired_donors)
