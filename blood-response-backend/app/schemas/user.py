"""
Pydantic v2 schemas for User domain.
"""

from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class UserRegister(BaseModel):
    """Registration request schema."""
    phone: str = Field(..., min_length=10, max_length=20, examples=["+923001234567"])
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Ahmed Khan"])
    email: Optional[str] = Field(
        default=None,
        examples=["user@gmail.com"],
        description="Email address for OTP delivery (required if SMS not available)"
    )
    intended_role: Optional[str] = Field(default="donor", examples=["donor"])
    cnic: Optional[str] = Field(
        default=None,
        min_length=13,
        max_length=15,
        examples=["35202-1234567-1"],
        description="CNIC number — will be stored as one-way hash, not plaintext"
    )
    consent_given: bool = Field(
        ...,
        description="User must consent to data collection/processing"
    )

    @model_validator(mode="before")
    @classmethod
    def handle_role_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "role" in data and "intended_role" not in data:
                data["intended_role"] = data.get("role")
        return data

    @field_validator("cnic", mode="before")
    @classmethod
    def normalize_cnic(cls, v: Any) -> Optional[str]:
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Optional[str]:
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("intended_role")
    @classmethod
    def validate_intended_role(cls, v: Optional[str]) -> str:
        if not v:
            return "donor"
        allowed = {"donor", "requester"}
        if v not in allowed:
            raise ValueError(f"Intended role must be one of: {allowed}")
        return v

    @field_validator("consent_given")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Consent must be given to register")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "phone": "+923001234567",
                "password": "strongPassword123",
                "full_name": "Ahmed Khan",
                "email": "ahmed@gmail.com",
                "intended_role": "donor",
                "cnic": "35202-1234567-1",
                "consent_given": True,
            }
        }
    }


class UserLogin(BaseModel):
    """Login request schema."""
    phone: str = Field(..., examples=["+923001234567"])
    password: str = Field(...)


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Refresh token request."""
    refresh_token: str


class OTPVerify(BaseModel):
    """OTP verification request."""
    phone: str = Field(..., examples=["+923001234567"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class ResendOTPRequest(BaseModel):
    """Request a replacement OTP for a registered phone and email."""
    phone: str
    email: str


class UserResponse(BaseModel):
    """User response schema (public-safe — no sensitive data)."""
    id: str  # MongoDB ObjectId serialised as a 24-char hex string
    phone: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_verified: bool
    is_active: bool
    consent_given: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """User profile update schema."""
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=100)
