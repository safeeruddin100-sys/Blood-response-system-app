"""
Hospital API endpoints — CRUD.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_local_user, get_local_require_role
from app.models.user import User
from app.models.hospital import Hospital
from app.schemas.hospital import HospitalCreate, HospitalResponse

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


@router.post("/", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def create_hospital(
    data: HospitalCreate,
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Add a hospital (admin only)."""
    hospital = Hospital(**data.model_dump())
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


@router.get("/", response_model=list[HospitalResponse])
def list_hospitals(
    city: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    """List hospitals with optional city filter."""
    query = db.query(Hospital)
    if city:
        query = query.filter(Hospital.city.ilike(f"%{city}%"))

    return query.order_by(Hospital.name).offset(skip).limit(limit).all()


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_local_user),
):
    """Get hospital by ID."""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital
