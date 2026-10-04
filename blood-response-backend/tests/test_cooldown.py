"""
Tests for donor cooldown logic.
Verifies the 90-day post-donation cooldown period and auto-flip behavior.
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.models.donor import DonorProfile
from app.models.user import User
from app.services.cooldown_service import (
    check_and_update_cooldown,
    start_cooldown,
    get_cooldown_status,
    run_bulk_cooldown_check,
)
from app.core.security import hash_password


class TestCooldown:
    """Test the cooldown service."""

    def _create_donor(self, db, phone="+923001111111"):
        """Helper to create a user + donor profile."""
        user = User(
            phone=phone,
            hashed_password=hash_password("test123"),
            full_name="Test Donor",
            role="donor",
            consent_given=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        donor = DonorProfile(
            user_id=user.id,
            blood_group="B+",
            latitude=24.8607,
            longitude=67.0011,
            city="Karachi",
            is_available=True,
        )
        db.add(donor)
        db.commit()
        db.refresh(donor)
        return donor

    def test_start_cooldown_makes_unavailable(self, db):
        """Starting cooldown should set is_available=False."""
        donor = self._create_donor(db)
        assert donor.is_available is True

        donor = start_cooldown(donor, db)
        assert donor.is_available is False
        assert donor.cooldown_expires_at is not None
        assert donor.last_donation_date is not None

    def test_cooldown_duration_is_90_days(self, db):
        """Cooldown should expire after 90 days."""
        donor = self._create_donor(db)
        now = datetime.now(timezone.utc)
        donor = start_cooldown(donor, db, donation_date=now)

        expected_expiry = now + timedelta(days=90)
        # Allow 1-second tolerance for test execution time
        expires_at = donor.cooldown_expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        diff = abs((expires_at - expected_expiry).total_seconds())
        assert diff < 2

    def test_lazy_check_restores_availability_after_cooldown(self, db):
        """Lazy check should auto-flip is_available=True after cooldown expires."""
        donor = self._create_donor(db)

        # Simulate a donation 91 days ago
        past = datetime.now(timezone.utc) - timedelta(days=91)
        donor.last_donation_date = past
        donor.cooldown_expires_at = past + timedelta(days=90)
        donor.is_available = False
        db.add(donor)
        db.commit()
        db.refresh(donor)

        assert donor.is_available is False

        # Lazy check should restore availability
        donor = check_and_update_cooldown(donor, db)
        assert donor.is_available is True
        assert donor.cooldown_expires_at is None

    def test_lazy_check_keeps_unavailable_during_cooldown(self, db):
        """Lazy check should NOT change availability during active cooldown."""
        donor = self._create_donor(db)

        # Simulate a donation 30 days ago (still in cooldown)
        past = datetime.now(timezone.utc) - timedelta(days=30)
        donor.last_donation_date = past
        donor.cooldown_expires_at = past + timedelta(days=90)
        donor.is_available = False
        db.add(donor)
        db.commit()

        donor = check_and_update_cooldown(donor, db)
        assert donor.is_available is False

    def test_cooldown_status_available(self, db):
        """Status should show 'Available' for donors not in cooldown."""
        donor = self._create_donor(db)
        status = get_cooldown_status(donor)
        assert status["is_available"] is True
        assert status["days_until_available"] == 0

    def test_cooldown_status_countdown(self, db):
        """Status should show days remaining during cooldown."""
        donor = self._create_donor(db)
        past = datetime.now(timezone.utc) - timedelta(days=30)
        donor.last_donation_date = past
        donor.cooldown_expires_at = past + timedelta(days=90)
        donor.is_available = False

        status = get_cooldown_status(donor)
        assert status["is_available"] is False
        assert status["days_until_available"] == 60  # 90 - 30

    def test_bulk_cooldown_check(self, db):
        """Bulk check should restore multiple expired cooldowns."""
        # Create 3 donors with expired cooldowns
        for i in range(3):
            donor = self._create_donor(db, phone=f"+92300{i}000000")
            past = datetime.now(timezone.utc) - timedelta(days=100)
            donor.last_donation_date = past
            donor.cooldown_expires_at = past + timedelta(days=90)
            donor.is_available = False
            db.add(donor)

        db.commit()

        restored = run_bulk_cooldown_check(db)
        assert restored == 3

        # Verify all are now available
        all_donors = db.query(DonorProfile).all()
        for d in all_donors:
            assert d.is_available is True
