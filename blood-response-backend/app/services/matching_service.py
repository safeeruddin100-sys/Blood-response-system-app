"""
Matching service — finds compatible donors for a blood request and creates
DonationMatch records.

When a blood request is created:
1. Get compatible donor blood groups for the requested blood group
2. Query available donors with matching blood groups
3. Filter by radius (haversine) from the request location
4. Create DonationMatch records with status=notified
5. Send notifications to matched donors (via NotificationService stub)
"""

from typing import List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.services.cooldown_service import check_and_update_cooldown
from app.services.notification_service import notification_service
from app.utils.blood_compatibility import get_compatible_donor_groups
from app.utils.geo import filter_by_radius
from app.core.config import settings


def find_matching_donors(
    blood_request: BloodRequest,
    db: Session,
    radius_km: float | None = None,
) -> List[Tuple[DonorProfile, float]]:
    """
    Find available donors compatible with a blood request.

    Args:
        blood_request: The blood request to match against.
        db: Database session.
        radius_km: Search radius in km (defaults to config value).

    Returns:
        List of (DonorProfile, distance_km) tuples, sorted by distance.
    """
    if radius_km is None:
        radius_km = settings.DEFAULT_SEARCH_RADIUS_KM

    # Step 1: Get compatible blood groups
    compatible_groups = get_compatible_donor_groups(blood_request.blood_group)

    # Step 2: Query available donors with matching blood groups
    candidates = (
        db.query(DonorProfile)
        .filter(
            DonorProfile.blood_group.in_(compatible_groups),
            DonorProfile.is_available == True,
            DonorProfile.latitude != None,
            DonorProfile.longitude != None,
        )
        .all()
    )

    # Step 2.5: Lazy cooldown check on each candidate
    valid_candidates = []
    for donor in candidates:
        donor = check_and_update_cooldown(donor, db)
        if donor.is_available:
            valid_candidates.append(donor)

    # Step 3: Filter by radius if request has location
    if blood_request.latitude and blood_request.longitude:
        return filter_by_radius(
            valid_candidates,
            blood_request.latitude,
            blood_request.longitude,
            radius_km,
        )
    else:
        # No location on request — return all compatible donors (no distance filtering)
        return [(d, 0.0) for d in valid_candidates]


def create_matches(
    blood_request: BloodRequest,
    matched_donors: List[Tuple[DonorProfile, float]],
    db: Session,
) -> List[DonationMatch]:
    """
    Create DonationMatch records for matched donors and notify them.

    Args:
        blood_request: The blood request.
        matched_donors: List of (DonorProfile, distance_km) from find_matching_donors.
        db: Database session.

    Returns:
        List of created DonationMatch records.
    """
    matches = []
    user_ids_to_notify = []

    for donor, distance_km in matched_donors:
        match = DonationMatch(
            request_id=blood_request.id,
            donor_id=donor.id,
            status="notified",
        )
        db.add(match)
        matches.append(match)
        user_ids_to_notify.append(donor.user_id)

    db.commit()

    # Refresh to get IDs
    for match in matches:
        db.refresh(match)

    # Send notifications to matched donors
    if user_ids_to_notify:
        urgency_label = "🚨 CRITICAL" if blood_request.urgency == "critical" else "🩸"
        notification_service.send_bulk(
            user_ids=user_ids_to_notify,
            title=f"{urgency_label} Blood Needed: {blood_request.blood_group}",
            body=(
                f"A patient needs {blood_request.units_needed} unit(s) of "
                f"{blood_request.blood_group} blood"
                f"{' at ' + blood_request.hospital_name if blood_request.hospital_name else ''}. "
                f"Can you help?"
            ),
            notification_type="match_found",
            data={
                "request_id": blood_request.id,
                "blood_group": blood_request.blood_group,
                "urgency": blood_request.urgency,
            },
            db=db,
        )

    return matches


def process_new_request(blood_request: BloodRequest, db: Session) -> List[DonationMatch]:
    """
    Full matching pipeline for a new blood request:
    1. Find matching donors
    2. Create match records
    3. Notify donors

    Returns created matches.
    """
    matched_donors = find_matching_donors(blood_request, db)
    if matched_donors:
        return create_matches(blood_request, matched_donors, db)
    return []
