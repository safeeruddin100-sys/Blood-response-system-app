"""
Pydantic v2 schemas for Blood Request domain.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.utils.blood_compatibility import VALID_BLOOD_GROUPS


class BloodRequestCreate(BaseModel):
    """Create a blood request."""
    patient_name: str = Field(..., min_length=2, max_length=100, examples=["Ali Raza"])
    blood_group: str = Field(..., examples=["B+"])
    units_needed: int = Field(default=1, ge=1, le=20, examples=[2])
    urgency: str = Field(default="normal", examples=["critical"])
    hospital_name: Optional[str] = Field(default=None, max_length=200, examples=["Aga Khan University Hospital"])
    hospital_id: Optional[int] = None
    latitude: Optional[float] = Field(default=None, examples=[24.8918])
    longitude: Optional[float] = Field(default=None, examples=[67.0283])
    city: Optional[str] = Field(default=None, max_length=100, examples=["Karachi"])
    contact_phone: Optional[str] = Field(default=None, max_length=20, examples=["+923009876543"])

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Blood group must be one of: {VALID_BLOOD_GROUPS}")
        return v

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: str) -> str:
        allowed = {"critical", "normal"}
        if v not in allowed:
            raise ValueError(f"Urgency must be one of: {allowed}")
        return v


class BloodRequestUpdate(BaseModel):
    """Update a blood request."""
    patient_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    units_needed: Optional[int] = Field(default=None, ge=1, le=20)
    urgency: Optional[str] = None
    hospital_name: Optional[str] = None
    status: Optional[str] = None
    contact_phone: Optional[str] = None

    @field_validator("urgency")
    @classmethod
    def validate_urgency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"critical", "normal"}
            if v not in allowed:
                raise ValueError(f"Urgency must be one of: {allowed}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"pending", "in_progress", "fulfilled", "expired"}
            if v not in allowed:
                raise ValueError(f"Status must be one of: {allowed}")
        return v


class DonationMatchResponse(BaseModel):
    """Donation match response."""
    id: str
    request_id: str
    donor_id: str
    status: str
    notified_at: datetime
    responded_at: Optional[datetime]
    donor_name: Optional[str] = None
    donor_blood_group: Optional[str] = None

    @field_validator("id", "request_id", "donor_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}


class BloodRequestResponse(BaseModel):
    """Blood request response with match info."""
    id: str
    requester_id: str
    patient_name: str
    blood_group: str
    units_needed: int
    units_confirmed: int
    urgency: str
    status: str
    hospital_name: Optional[str]
    hospital_id: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    city: Optional[str]
    contact_phone: Optional[str]
    is_verified: bool
    is_flagged: bool
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    donation_matches: Optional[List[DonationMatchResponse]] = None

    @field_validator("id", "requester_id", "hospital_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}


class EmergencySOSCreate(BaseModel):
    """
    Emergency SOS request — minimal fields for fastest possible submission.
    Only blood group + location + phone needed.
    """
    blood_group: str = Field(..., examples=["O-"])
    latitude: float = Field(..., examples=[24.8607])
    longitude: float = Field(..., examples=[67.0011])
    contact_phone: str = Field(..., max_length=20, examples=["+923001234567"])
    city: Optional[str] = Field(default=None, max_length=100, examples=["Karachi"])

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in VALID_BLOOD_GROUPS:
            raise ValueError(f"Blood group must be one of: {VALID_BLOOD_GROUPS}")
        return v


class DonorResponseAction(BaseModel):
    """Donor response to a match (accept/decline)."""
    action: str = Field(..., examples=["accept"])

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"accept", "decline"}
        if v not in allowed:
            raise ValueError(f"Action must be one of: {allowed}")
        return v
