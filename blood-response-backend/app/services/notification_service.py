from __future__ import annotations

import json
import logging
from typing import Protocol, Optional
from sqlalchemy.orm import Session

from app.models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationService(Protocol):
    """
    STUB INTERFACE: Abstract notification delivery.
    Implement this protocol for real push/SMS/WhatsApp providers.
    """

    def send(
        self,
        user_id: int,
        title: str,
        body: str,
        notification_type: str,
        data: Optional[dict],
        db: Optional[Session],
    ) -> Optional[Notification]: ...

    def send_bulk(
        self,
        user_ids: list[int],
        title: str,
        body: str,
        notification_type: str,
        data: Optional[dict],
        db: Optional[Session],
    ) -> list[Notification]: ...


class ConsoleNotificationService:
    """
    STUB IMPLEMENTATION: Logs notifications to console and stores in DB.
    Replace with real provider before production deployment.
    """

    def send(
        self,
        user_id: int,
        title: str,
        body: str,
        notification_type: str = "system",
        data: Optional[dict] = None,
        db: Optional[Session] = None,
    ) -> Optional[Notification]:
        """Send a notification — logs to console + saves to DB."""
        # Console log (visible in uvicorn output)
        logger.info(
            f"📱 NOTIFICATION [STUB] → User {user_id}: "
            f"[{notification_type}] {title} — {body}"
        )
        try:
            print(
                f"📱 NOTIFICATION [STUB] → User {user_id}: "
                f"[{notification_type}] {title} — {body}"
            )
        except Exception:
            print(
                f"[*] NOTIFICATION [STUB] -> User {user_id}: "
                f"[{notification_type}] {title} - {body}"
            )

        # Save to DB for in-app retrieval
        if db is not None:
            notification = Notification(
                user_id=user_id,
                title=title,
                body=body,
                type=notification_type,
                data_json=json.dumps(data) if data else None,
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            return notification

        return None

    def send_bulk(
        self,
        user_ids: list[int],
        title: str,
        body: str,
        notification_type: str = "system",
        data: Optional[dict] = None,
        db: Optional[Session] = None,
    ) -> list[Notification]:
        """Send the same notification to multiple users."""
        notifications = []
        for user_id in user_ids:
            n = self.send(user_id, title, body, notification_type, data, db)
            if n:
                notifications.append(n)
        return notifications


# Default service instance — swap this for production
notification_service = ConsoleNotificationService()
