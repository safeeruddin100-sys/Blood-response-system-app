"""
Pydantic v2 schemas for Notification domain.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: str
    user_id: str
    title: str
    body: str
    type: str
    is_read: bool
    data_json: Optional[str]
    created_at: datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v):
        return str(v) if v is not None else v

    model_config = {"from_attributes": True}
