"""
Donor profile API endpoints — CRUD, nearby donors, cooldown management.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_local_user
from app.models.user import User
from app.models.donor import DonorProfile
from app.schemas.donor import (
    DonorProfileCreate,
    DonorProfileUpdate,
    DonorProfileResponse,
    NearbyDonorResponse,
)
from app.services.cooldown_service import (
    check_and_update_cooldown,
    start_cooldown,
    get_cooldown_status,
)
from app.utils.blood_compatibility import get_compatible_donor_groups
from app.utils.geo import filter_by_radius
from app.core.config import settings

router = APIRouter(prefix="/donors", tags=["Donors"])


def _enrich_donor_response(donor: DonorProfile) -> DonorProfileResponse:
    """Add computed cooldown fields to donor response."""
    cooldown = get_cooldown_status(donor)
    response = DonorProfileResponse.model_validate(donor)
    response.days_until_available = cooldown["days_until_available"]
    response.cooldown_status = cooldown["cooldown_status"]
    return response


@router.post("/profile", response_model=DonorProfileResponse, status_code=status.HTTP_201_CREATED)
def create_donor_profile(
    data: DonorProfileCreate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Create a donor profile for the current user."""
    # Check if profile already exists
    existing = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Donor profile already exists. Use PUT to update.",
        )

    profile = DonorProfile(
        user_id=current_user.id,
        blood_group=data.blood_group,
        latitude=data.latitude,
        longitude=data.longitude,
        city=data.city,
        last_donation_date=data.last_donation_date,
    )

    # If last_donation_date is provided, check if cooldown should be applied
    if data.last_donation_date:
        from datetime import datetime, timedelta, timezone
        cooldown_end = data.last_donation_date + timedelta(days=settings.COOLDOWN_DAYS)
        if cooldown_end > datetime.now(timezone.utc):
            profile.is_available = False
            profile.cooldown_expires_at = cooldown_end

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return _enrich_donor_response(profile)


@router.get("/profile", response_model=DonorProfileResponse)
def get_donor_profile(
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """
    Get the current user's donor profile.
    Performs a lazy cooldown check — if cooldown has expired, auto-updates availability.
    """
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found. Create one first.",
        )

    # Lazy cooldown check
    profile = check_and_update_cooldown(profile, db)
    return _enrich_donor_response(profile)


@router.put("/profile", response_model=DonorProfileResponse)
def update_donor_profile(
    data: DonorProfileUpdate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Update the current user's donor profile."""
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found.",
        )

    update_data = data.model_dump(exclude_unset=True)

    # If updating last_donation_date, trigger cooldown
    if "last_donation_date" in update_data and update_data["last_donation_date"]:
        profile = start_cooldown(profile, db, update_data["last_donation_date"])
        update_data.pop("last_donation_date")
        update_data.pop("is_available", None)  # Cooldown overrides manual availability

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return _enrich_donor_response(profile)


@router.get("/nearby", response_model=list[NearbyDonorResponse])
def get_nearby_donors(
    lat: float = Query(..., description="Latitude of the search center"),
    lng: float = Query(..., description="Longitude of the search center"),
    blood_group: str = Query(..., description="Blood group needed (recipient's type)"),
    radius_km: Optional[float] = Query(
        default=None,
        description="Search radius in km (defaults to configured value)",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    """
    Find nearby donors matching a blood group.
    Uses the blood compatibility matrix — returns donors of ALL compatible types,
    not just exact matches.
    """
    if radius_km is None:
        radius_km = settings.DEFAULT_SEARCH_RADIUS_KM

    # Get all compatible donor blood groups
    try:
        compatible_groups = get_compatible_donor_groups(blood_group.strip().upper())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Query available donors with compatible blood groups
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

    # Lazy cooldown check
    valid = []
    for donor in candidates:
        donor = check_and_update_cooldown(donor, db)
        if donor.is_available:
            valid.append(donor)

    # Filter by radius
    nearby = filter_by_radius(valid, lat, lng, radius_km)

    # Build response with donor names
    results = []
    for donor, distance in nearby:
        user = db.query(User).filter(User.id == donor.user_id).first()
        results.append(NearbyDonorResponse(
            donor=_enrich_donor_response(donor),
            distance_km=distance,
            donor_name=user.full_name if user else "Unknown",
        ))

    return results
