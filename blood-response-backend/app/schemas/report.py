from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ReportCreate(BaseModel):
    """Report a fake/suspicious request."""
    request_id: str = Field(...)
    reason: str = Field(..., min_length=10, max_length=1000, examples=["This request appears to be fake because..."])

    @field_validator("request_id", mode="before")
    @classmethod
    def convert_request_id(cls, v):
        return str(v) if v is not None else v


class ReportReview(BaseModel):
    """Admin review of a report."""
    status: str = Field(..., examples=["reviewed"])
    admin_notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"reviewed", "dismissed"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {allowed}")
        return v


class ReportResponse(BaseModel):
    """Report response schema."""
    id: str
    reporter_id: str
    request_id: str
    reason: str
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]

    @field_validator("id", "reporter_id", "request_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}
