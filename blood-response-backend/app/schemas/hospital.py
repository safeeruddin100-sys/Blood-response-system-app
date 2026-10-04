"""
Pydantic v2 schemas for Hospital domain.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class HospitalCreate(BaseModel):
    """Create hospital request."""
    name: str = Field(..., max_length=200, examples=["Aga Khan University Hospital"])
    city: str = Field(..., max_length=100, examples=["Karachi"])
    latitude: Optional[float] = Field(default=None, examples=[24.8918])
    longitude: Optional[float] = Field(default=None, examples=[67.0283])
    address: Optional[str] = Field(default=None, max_length=500)
    phone: Optional[str] = Field(default=None, max_length=20)


class HospitalResponse(BaseModel):
    """Hospital response schema."""
    id: str
    name: str
    city: str
    latitude: Optional[float]
    longitude: Optional[float]
    address: Optional[str]
    phone: Optional[str]
    is_verified: bool
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}
