"""
Tests for blood request lifecycle — status transitions, auto-expire,
units confirmed tracking.
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.models.user import User
from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.core.security import hash_password


class TestRequestLifecycle:
    """Test blood request status transitions and tracking."""

    def test_create_request_via_api(self, client, requester_headers):
        """Creating a request via API should default to 'pending' status."""
        response = client.post(
            "/api/v1/requests/",
            json={
                "patient_name": "Ali Raza",
                "blood_group": "B+",
                "units_needed": 2,
                "urgency": "normal",
                "hospital_name": "Aga Khan Hospital",
                "latitude": 24.8918,
                "longitude": 67.0283,
                "city": "Karachi",
            },
            headers=requester_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert data["units_needed"] == 2
        assert data["units_confirmed"] == 0
        assert data["blood_group"] == "B+"

    def test_request_transitions_to_in_progress(self, client, db, requester_headers, auth_headers, sample_user):
        """Request should transition to 'in_progress' when a donor accepts."""
        # Create a donor profile for the donor user
        donor = DonorProfile(
            user_id=sample_user.id,
            blood_group="B+",
            latitude=24.8607,
            longitude=67.0011,
            city="Karachi",
            is_available=True,
        )
        db.add(donor)
        db.commit()

        # Create a request
        resp = client.post(
            "/api/v1/requests/",
            json={
                "patient_name": "Test Patient",
                "blood_group": "B+",
                "units_needed": 2,
                "urgency": "normal",
                "latitude": 24.8918,
                "longitude": 67.0283,
                "city": "Karachi",
            },
            headers=requester_headers,
        )
        request_id = resp.json()["id"]

        # Donor accepts the request
        resp2 = client.post(
            f"/api/v1/requests/{request_id}/respond",
            json={"action": "accept"},
            headers=auth_headers,
        )
        assert resp2.status_code == 200

        # Check request status
        resp3 = client.get(f"/api/v1/requests/{request_id}", headers=auth_headers)
        data = resp3.json()
        assert data["status"] == "in_progress"
        assert data["units_confirmed"] == 1

    def test_request_fulfilled_when_all_units_confirmed(self, client, db, requester_headers):
        """Request should become 'fulfilled' when units_confirmed >= units_needed."""
        # Create requester request
        resp = client.post(
            "/api/v1/requests/",
            json={
                "patient_name": "Test Patient",
                "blood_group": "O+",
                "units_needed": 1,
                "urgency": "normal",
                "city": "Karachi",
            },
            headers=requester_headers,
        )
        request_id = resp.json()["id"]

        # Create a donor user and profile
        user = User(
            phone="+923005555555",
            hashed_password=hash_password("test123"),
            full_name="Donor One",
            role="donor",
            consent_given=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        donor = DonorProfile(
            user_id=user.id,
            blood_group="O+",
            latitude=24.86,
            longitude=67.0,
            city="Karachi",
            is_available=True,
        )
        db.add(donor)
        db.commit()

        # Login as donor
        login_resp = client.post("/api/v1/auth/login", json={
            "phone": "+923005555555",
            "password": "test123",
        })
        donor_token = login_resp.json()["access_token"]
        donor_headers = {"Authorization": f"Bearer {donor_token}"}

        # Donor accepts
        client.post(
            f"/api/v1/requests/{request_id}/respond",
            json={"action": "accept"},
            headers=donor_headers,
        )

        # Check request is fulfilled
        resp3 = client.get(f"/api/v1/requests/{request_id}", headers=donor_headers)
        assert resp3.json()["status"] == "fulfilled"

    def test_request_auto_expire(self, db):
        """Requests past their expires_at should be marked as expired on read."""
        user = User(
            phone="+923006666666",
            hashed_password=hash_password("test123"),
            full_name="Test User",
            role="requester",
            consent_given=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create an expired request
        request = BloodRequest(
            requester_id=user.id,
            patient_name="Expired Patient",
            blood_group="A+",
            units_needed=1,
            urgency="normal",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Already expired
        )
        db.add(request)
        db.commit()
        db.refresh(request)

        assert request.status == "pending"  # Initial status

        # Simulate the lazy expire check
        from app.api.v1.requests import _check_and_expire
        request = _check_and_expire(request, db)
        assert request.status == "expired"

    def test_emergency_sos_creates_critical_request(self, client, auth_headers):
        """Emergency SOS should create a critical-urgency request."""
        response = client.post(
            "/api/v1/requests/emergency-sos",
            json={
                "blood_group": "O-",
                "latitude": 24.8607,
                "longitude": 67.0011,
                "contact_phone": "+923001234567",
                "city": "Karachi",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["urgency"] == "critical"
        assert data["blood_group"] == "O-"
        assert data["patient_name"] == "Emergency SOS"

    def test_list_requests_with_filters(self, client, requester_headers):
        """Should be able to filter requests by status, city, blood group."""
        # Create a request
        client.post(
            "/api/v1/requests/",
            json={
                "patient_name": "Filter Test",
                "blood_group": "A+",
                "units_needed": 1,
                "urgency": "normal",
                "city": "Lahore",
            },
            headers=requester_headers,
        )

        # Filter by city
        resp = client.get(
            "/api/v1/requests/?city=Lahore",
            headers=requester_headers,
        )
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) >= 1
        assert all("Lahore" in r.get("city", "") for r in results if r.get("city"))
