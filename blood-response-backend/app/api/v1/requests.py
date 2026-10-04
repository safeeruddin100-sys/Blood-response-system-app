"""
Blood request API endpoints — CRUD, lifecycle management, donor response, emergency SOS.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_local_user
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.schemas.request import (
    BloodRequestCreate,
    BloodRequestUpdate,
    BloodRequestResponse,
    DonationMatchResponse,
    EmergencySOSCreate,
    DonorResponseAction,
)
from app.services.matching_service import process_new_request
from app.services.cooldown_service import start_cooldown
from app.services.notification_service import notification_service

router = APIRouter(prefix="/requests", tags=["Blood Requests"])


def _check_and_expire(request: BloodRequest, db: Session) -> BloodRequest:
    """Lazy expire check — if expires_at has passed, mark as expired."""
    expires_at = request.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if (
        request.status in ("pending", "in_progress")
        and expires_at
        and expires_at <= datetime.now(timezone.utc)
    ):
        request.status = "expired"
        db.add(request)
        db.commit()
        db.refresh(request)
    return request


def _build_request_response(request: BloodRequest, db: Session) -> BloodRequestResponse:
    """Build response with donation matches and donor info."""
    matches = db.query(DonationMatch).filter(DonationMatch.request_id == request.id).all()
    match_responses = []
    for m in matches:
        donor = db.query(DonorProfile).filter(DonorProfile.id == m.donor_id).first()
        user = db.query(User).filter(User.id == donor.user_id).first() if donor else None
        match_responses.append(DonationMatchResponse(
            id=str(m.id),
            request_id=str(m.request_id),
            donor_id=str(m.donor_id),
            status=m.status,
            notified_at=m.notified_at,
            responded_at=m.responded_at,
            donor_name=user.full_name if user else None,
            donor_blood_group=donor.blood_group if donor else None,
        ))

    response = BloodRequestResponse.model_validate(request)
    response.donation_matches = match_responses
    return response


@router.post("/", response_model=BloodRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    data: BloodRequestCreate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """
    Create a blood request and automatically find + notify matching donors.
    """
    request = BloodRequest(
        requester_id=current_user.id,
        patient_name=data.patient_name,
        blood_group=data.blood_group,
        units_needed=data.units_needed,
        urgency=data.urgency,
        hospital_name=data.hospital_name,
        hospital_id=data.hospital_id,
        latitude=data.latitude,
        longitude=data.longitude,
        city=data.city,
        contact_phone=data.contact_phone,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    # Auto-match and notify donors
    matches = process_new_request(request, db)

    # Notify the requester that their request was submitted and donors contacted
    match_count = len(matches)
    if match_count > 0:
        requester_body = (
            f"Your request for {request.units_needed} unit(s) of {request.blood_group} "
            f"blood has been broadcast to {match_count} compatible donor(s) near "
            f"{request.city or 'your location'}. They will be notified immediately."
        )
    else:
        requester_body = (
            f"Your request for {request.units_needed} unit(s) of {request.blood_group} "
            f"blood has been posted. No donors are currently available in the area — "
            f"you will be notified as soon as a match is found."
        )
    notification_service.send(
        user_id=request.requester_id,
        title="🚊 Request Submitted" + (f" — {match_count} Donors Notified" if match_count else " — No Donors Found Yet"),
        body=requester_body,
        notification_type="request_update",
        data={"request_id": request.id, "matches_found": match_count},
        db=db,
    )

    return _build_request_response(request, db)


@router.get("/", response_model=list[BloodRequestResponse])
def list_requests(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    city: Optional[str] = Query(default=None),
    blood_group: Optional[str] = Query(default=None),
    my_requests: Optional[bool] = Query(default=False, description="Only show my requests"),
    exclude_expired: Optional[bool] = Query(default=True, description="Hide expired/fulfilled requests"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """List blood requests with optional filters. Expired/fulfilled entries are hidden by default."""
    query = db.query(BloodRequest)

    if my_requests:
        query = query.filter(BloodRequest.requester_id == current_user.id)
    if status_filter:
        query = query.filter(BloodRequest.status == status_filter)
    elif exclude_expired and not my_requests:
        # By default, hide expired and fulfilled from the public feed
        query = query.filter(BloodRequest.status.in_(["pending", "in_progress"]))
    if city:
        query = query.filter(BloodRequest.city.ilike(f"%{city}%"))
    if blood_group:
        query = query.filter(BloodRequest.blood_group == blood_group.strip().upper())

    # Order by urgency (critical first), then by creation date (newest first)
    requests = (
        query
        .order_by(
            BloodRequest.urgency.desc(),  # "critical" > "normal" alphabetically
            BloodRequest.created_at.desc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Lazy expire check on each
    results = []
    for req in requests:
        req = _check_and_expire(req, db)
        # Skip just-expired entries (those that passed the lazy check above)
        if req.status in ("expired", "fulfilled") and not my_requests:
            continue
        results.append(_build_request_response(req, db))

    return results


@router.get("/{request_id}", response_model=BloodRequestResponse)
def get_request(
    request_id: int,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Get a blood request by ID with match details."""
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    request = _check_and_expire(request, db)
    return _build_request_response(request, db)


@router.put("/{request_id}", response_model=BloodRequestResponse)
def update_request(
    request_id: int,
    data: BloodRequestUpdate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Update a blood request. Only the creator can update."""
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.requester_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this request")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(request, key, value)

    db.add(request)
    db.commit()
    db.refresh(request)

    return _build_request_response(request, db)


@router.post("/{request_id}/respond", response_model=DonationMatchResponse)
def respond_to_request(
    request_id: int,
    data: DonorResponseAction,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """
    Donor responds to a blood request (accept or decline).
    On accept: increments units_confirmed, starts cooldown for donor.
    """
    # Get the donor's profile
    donor_profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not donor_profile:
        raise HTTPException(status_code=404, detail="You don't have a donor profile")

    # Find the match record
    match = (
        db.query(DonationMatch)
        .filter(
            DonationMatch.request_id == request_id,
            DonationMatch.donor_id == donor_profile.id,
        )
        .first()
    )

    # If no existing match, create one (for walk-in donors)
    if not match:
        match = DonationMatch(
            request_id=request_id,
            donor_id=donor_profile.id,
            status="notified",
        )
        db.add(match)
        db.commit()
        db.refresh(match)

    if match.status not in ("notified", "accepted"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot {data.action} — match is already {match.status}",
        )

    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if data.action == "accept":
        match.status = "confirmed"
        match.responded_at = datetime.now(timezone.utc)

        # Update request status & confirmed count
        request.units_confirmed += 1
        if request.units_confirmed >= request.units_needed:
            request.status = "fulfilled"
        elif request.status == "pending":
            request.status = "in_progress"

        # Start cooldown for the donor
        start_cooldown(donor_profile, db)

        # Notify the requester
        donor_blood_group = getattr(donor_profile, "blood_group", None)
        donor_identity = current_user.full_name
        if donor_blood_group:
            donor_identity = f"{donor_identity} ({donor_blood_group})"
        notification_service.send(
            user_id=request.requester_id,
            title="🎉 Donor Confirmed!",
            body=(
                f"{donor_identity} has confirmed "
                f"to donate. {request.units_confirmed}/{request.units_needed} units confirmed."
            ),
            notification_type="donation_confirmed",
            data={
                "request_id": request.id,
                "donor_name": current_user.full_name,
                **({"donor_blood_group": donor_blood_group} if donor_blood_group else {}),
            },
            db=db,
        )

    elif data.action == "decline":
        match.status = "declined"
        match.responded_at = datetime.now(timezone.utc)

    db.add(match)
    db.add(request)
    db.commit()
    db.refresh(match)

    user = db.query(User).filter(User.id == donor_profile.user_id).first()
    return DonationMatchResponse(
        id=match.id,
        request_id=match.request_id,
        donor_id=match.donor_id,
        status=match.status,
        notified_at=match.notified_at,
        responded_at=match.responded_at,
        donor_name=user.full_name if user else None,
        donor_blood_group=donor_profile.blood_group,
    )


@router.post("/emergency-sos", response_model=BloodRequestResponse, status_code=status.HTTP_201_CREATED)
def emergency_sos(
    data: EmergencySOSCreate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """
    Emergency SOS — minimal-friction endpoint that creates a critical-urgency
    request from just blood group + location + phone.
    """
    request = BloodRequest(
        requester_id=current_user.id,
        patient_name="Emergency SOS",
        blood_group=data.blood_group,
        units_needed=1,
        urgency="critical",
        latitude=data.latitude,
        longitude=data.longitude,
        city=data.city,
        contact_phone=data.contact_phone,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    # Auto-match with larger radius for emergencies
    from app.services.matching_service import find_matching_donors, create_matches
    matched = find_matching_donors(request, db, radius_km=50.0)
    if matched:
        create_matches(request, matched, db)

    return _build_request_response(request, db)
