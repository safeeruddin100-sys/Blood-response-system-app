"""
Trust score service — placeholder for Phase 2 expansion.

For MVP, provides a basic score calculation based on:
- Number of successful donations
- Number of reports against the user
- Account age

Phase 2 will add: verification badges, donation streaks, community endorsements.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.request import DonationMatch
from app.models.report import Report


def calculate_trust_score(user_id: int, db: Session) -> dict:
    """
    Calculate a basic trust score for a user.

    Returns:
        dict with score (0-100), breakdown, and level label.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"score": 0, "level": "unknown", "breakdown": {}}

    # Count confirmed donations
    confirmed_donations = (
        db.query(DonationMatch)
        .join(DonationMatch.donor)
        .filter(
            DonationMatch.donor.has(user_id=user_id),
            DonationMatch.status == "confirmed",
        )
        .count()
    )

    # Count reports against user's requests
    reports_against = (
        db.query(Report)
        .join(Report.blood_request)
        .filter(Report.blood_request.has(requester_id=user_id))
        .count()
    )

    # Account age in days
    created_at = user.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    account_age_days = (datetime.now(timezone.utc) - (created_at or datetime.now(timezone.utc))).days

    # Score calculation
    donation_score = min(confirmed_donations * 10, 40)  # Max 40 from donations
    age_score = min(account_age_days // 30 * 5, 20)  # Max 20 from account age
    verification_score = 20 if user.is_verified else 0  # 20 from verification
    base_score = 20  # Everyone starts with 20

    # Penalties
    report_penalty = reports_against * 10

    total = max(0, min(100, base_score + donation_score + age_score + verification_score - report_penalty))

    # Level label
    if total >= 80:
        level = "Excellent"
    elif total >= 60:
        level = "Good"
    elif total >= 40:
        level = "Fair"
    else:
        level = "New"

    return {
        "score": total,
        "level": level,
        "breakdown": {
            "base": base_score,
            "donations": donation_score,
            "account_age": age_score,
            "verification": verification_score,
            "report_penalty": -report_penalty,
        },
    }
