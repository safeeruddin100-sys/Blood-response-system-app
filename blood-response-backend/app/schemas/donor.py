"""
Pydantic v2 schemas for Donor Profile domain.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

from app.utils.blood_compatibility import VALID_BLOOD_GROUPS


class DonorProfileCreate(BaseModel):
    """Create donor profile request."""
    blood_group: str = Field(..., examples=["B+"])
    latitude: Optional[float] = Field(default=None, examples=[24.8607])
    longitude: Optional[float] = Field(default=None, examples=[67.0011])
    city: Optional[str] = Field(default=None, max_length=100, examples=["Karachi"])
    last_donation_date: Optional[datetime] = Field(default=None)

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Blood group must be one of: {VALID_BLOOD_GROUPS}")
        return v


class DonorProfileUpdate(BaseModel):
    """Update donor profile request."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = Field(default=None, max_length=100)
    is_available: Optional[bool] = None
    last_donation_date: Optional[datetime] = None


class DonorProfileResponse(BaseModel):
    """Donor profile response with cooldown info."""
    id: str
    user_id: str
    blood_group: str
    latitude: Optional[float]
    longitude: Optional[float]
    city: Optional[str]
    is_available: bool
    last_donation_date: Optional[datetime]
    cooldown_expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Computed fields added by the API
    days_until_available: Optional[int] = None
    cooldown_status: Optional[str] = None

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}


class NearbyDonorResponse(BaseModel):
    """Nearby donor result with distance info."""
    donor: DonorProfileResponse
    distance_km: float
    donor_name: str
