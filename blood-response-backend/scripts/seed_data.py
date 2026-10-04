"""
Seed script with realistic Pakistani sample data for Karachi, Lahore, and Islamabad.
Populates:
- 1 Admin user
- 12+ Donors across various blood groups with realistic coordinates
- 6+ Blood requests across major Pakistani hospitals
- 6 Major Pakistani hospitals
- Sample reports and notifications

Run with: python scripts/seed_data.py
"""

import sys
import os
from datetime import datetime, timedelta, timezone

# Add backend root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.models.hospital import Hospital
from app.models.report import Report
from app.models.notification import Notification
from app.core.security import hash_password, hash_cnic
from app.services.matching_service import process_new_request


def seed():
    print("🌱 Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.phone == "+923000000000").first():
            print("⚠️ Database already seeded. Skipping.")
            return

        print("👤 Creating Admin user...")
        admin = User(
            phone="+923000000000",
            hashed_password=hash_password("Admin@123"),
            full_name="Alkhidmat Admin",
            role="admin",
            cnic_hash=hash_cnic("42101-1111111-1"),
            is_verified=True,
            consent_given=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("🏥 Seeding Pakistani Hospitals...")
        hospitals_data = [
            {
                "name": "Aga Khan University Hospital",
                "city": "Karachi",
                "latitude": 24.8918,
                "longitude": 67.0283,
                "address": "National Stadium Rd, Aga Khan University Hospital, Karachi",
                "phone": "+9221111911911",
                "is_verified": True,
            },
            {
                "name": "Jinnah Postgraduate Medical Centre (JPMC)",
                "city": "Karachi",
                "latitude": 24.8532,
                "longitude": 67.0456,
                "address": "Rafiqui Shaheed Rd, Cantt, Karachi",
                "phone": "+922199201300",
                "is_verified": True,
            },
            {
                "name": "Mayo Hospital",
                "city": "Lahore",
                "latitude": 31.5725,
                "longitude": 74.3167,
                "address": "Hospital Rd, Anarkali Bazaar, Lahore",
                "phone": "+924299211100",
                "is_verified": True,
            },
            {
                "name": "Shaukat Khanum Memorial Hospital",
                "city": "Lahore",
                "latitude": 31.4827,
                "longitude": 74.2818,
                "address": "7A Block R-3, Johar Town, Lahore",
                "phone": "+924235905000",
                "is_verified": True,
            },
            {
                "name": "Pakistan Institute of Medical Sciences (PIMS)",
                "city": "Islamabad",
                "latitude": 33.7053,
                "longitude": 73.0538,
                "address": "G-8/3, Islamabad",
                "phone": "+92519261170",
                "is_verified": True,
            },
            {
                "name": "Alkhidmat Hospital Karachi",
                "city": "Karachi",
                "latitude": 24.9180,
                "longitude": 67.0971,
                "address": "Gulshan-e-Iqbal Block 6, Karachi",
                "phone": "+922134988888",
                "is_verified": True,
            },
        ]

        hospitals = []
        for h_data in hospitals_data:
            h = Hospital(**h_data)
            db.add(h)
            hospitals.append(h)
        db.commit()
        for h in hospitals:
            db.refresh(h)

        print("👥 Seeding Verified Donors...")
        donors_data = [
            # Karachi Donors
            {
                "name": "Muhammad Usman",
                "phone": "+923001234001",
                "bg": "O-",  # Universal Donor
                "city": "Karachi",
                "lat": 24.8607,
                "lng": 67.0011,
                "available": True,
                "cnic": "42201-1234567-1",
            },
            {
                "name": "Zainab Bibi",
                "phone": "+923001234002",
                "bg": "O+",
                "city": "Karachi",
                "lat": 24.8715,
                "lng": 67.0599,
                "available": True,
                "cnic": "42201-1234567-2",
            },
            {
                "name": "Hamza Tariq",
                "phone": "+923001234003",
                "bg": "A+",
                "city": "Karachi",
                "lat": 24.9207,
                "lng": 67.0850,
                "available": True,
                "cnic": "42201-1234567-3",
            },
            {
                "name": "Bilal Siddiqui",
                "phone": "+923001234004",
                "bg": "B+",
                "city": "Karachi",
                "lat": 24.8300,
                "lng": 67.0400,
                "available": True,
                "cnic": "42201-1234567-4",
            },
            {
                "name": "Ayesha Malik",
                "phone": "+923001234005",
                "bg": "B-",
                "city": "Karachi",
                "lat": 24.8850,
                "lng": 67.0200,
                "available": False,  # On cooldown
                "last_donation": datetime.now(timezone.utc) - timedelta(days=20),
                "cnic": "42201-1234567-5",
            },
            {
                "name": "Farhan Saeed",
                "phone": "+923001234006",
                "bg": "AB+",
                "city": "Karachi",
                "lat": 24.8450,
                "lng": 67.0600,
                "available": True,
                "cnic": "42201-1234567-6",
            },
            # Lahore Donors
            {
                "name": "Ali Raza",
                "phone": "+923001234007",
                "bg": "O-",
                "city": "Lahore",
                "lat": 31.5204,
                "lng": 74.3587,
                "available": True,
                "cnic": "35202-1234567-1",
            },
            {
                "name": "Fatima Noor",
                "phone": "+923001234008",
                "bg": "A+",
                "city": "Lahore",
                "lat": 31.4820,
                "lng": 74.2900,
                "available": True,
                "cnic": "35202-1234567-2",
            },
            {
                "name": "Omer Sheikh",
                "phone": "+923001234009",
                "bg": "B+",
                "city": "Lahore",
                "lat": 31.5600,
                "lng": 74.3100,
                "available": True,
                "cnic": "35202-1234567-3",
            },
            {
                "name": "Hassan Javed",
                "phone": "+923001234010",
                "bg": "AB-",
                "city": "Lahore",
                "lat": 31.5100,
                "lng": 74.3400,
                "available": True,
                "cnic": "35202-1234567-4",
            },
            # Islamabad / Rawalpindi Donors
            {
                "name": "Saad Abbasi",
                "phone": "+923001234011",
                "bg": "O+",
                "city": "Islamabad",
                "lat": 33.6844,
                "lng": 73.0479,
                "available": True,
                "cnic": "61101-1234567-1",
            },
            {
                "name": "Maryam Nawazish",
                "phone": "+923001234012",
                "bg": "B+",
                "city": "Islamabad",
                "lat": 33.7100,
                "lng": 73.0600,
                "available": True,
                "cnic": "61101-1234567-2",
            },
        ]

        created_donors = []
        for d in donors_data:
            user = User(
                phone=d["phone"],
                hashed_password=hash_password("Donor@123"),
                full_name=d["name"],
                role="donor",
                cnic_hash=hash_cnic(d["cnic"]),
                is_verified=True,
                consent_given=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            cooldown_expires = None
            if not d.get("available", True) and "last_donation" in d:
                cooldown_expires = d["last_donation"] + timedelta(days=90)

            profile = DonorProfile(
                user_id=user.id,
                blood_group=d["bg"],
                latitude=d["lat"],
                longitude=d["lng"],
                city=d["city"],
                is_available=d.get("available", True),
                last_donation_date=d.get("last_donation"),
                cooldown_expires_at=cooldown_expires,
            )
            db.add(profile)
            created_donors.append(profile)

        db.commit()

        print("📋 Creating Sample Requesters...")
        requester1 = User(
            phone="+923331112233",
            hashed_password=hash_password("Requester@123"),
            full_name="Kashif Mehmood",
            role="requester",
            cnic_hash=hash_cnic("42201-9988776-1"),
            is_verified=True,
            consent_given=True,
        )
        requester2 = User(
            phone="+923334445566",
            hashed_password=hash_password("Requester@123"),
            full_name="Noman Ali",
            role="requester",
            cnic_hash=hash_cnic("35202-9988776-2"),
            is_verified=True,
            consent_given=True,
        )
        db.add_all([requester1, requester2])
        db.commit()
        db.refresh(requester1)
        db.refresh(requester2)

        print("🚨 Seeding Active Blood Requests & Matching...")
        requests_data = [
            {
                "requester_id": requester1.id,
                "patient_name": "Tahir Hussain (Thalassemia Child)",
                "blood_group": "B+",
                "units_needed": 2,
                "urgency": "critical",
                "hospital_name": "Aga Khan University Hospital",
                "hospital_id": hospitals[0].id,
                "latitude": 24.8918,
                "longitude": 67.0283,
                "city": "Karachi",
                "contact_phone": "+923331112233",
                "is_verified": True,
            },
            {
                "requester_id": requester1.id,
                "patient_name": "Mrs. Shahida Perveen (Emergency Surgery)",
                "blood_group": "O-",
                "units_needed": 3,
                "urgency": "critical",
                "hospital_name": "Jinnah Postgraduate Medical Centre (JPMC)",
                "hospital_id": hospitals[1].id,
                "latitude": 24.8532,
                "longitude": 67.0456,
                "city": "Karachi",
                "contact_phone": "+923331112233",
                "is_verified": True,
            },
            {
                "requester_id": requester2.id,
                "patient_name": "Adnan Shahid (Accident Trauma)",
                "blood_group": "A+",
                "units_needed": 2,
                "urgency": "critical",
                "hospital_name": "Mayo Hospital",
                "hospital_id": hospitals[2].id,
                "latitude": 31.5725,
                "longitude": 74.3167,
                "city": "Lahore",
                "contact_phone": "+923334445566",
                "is_verified": True,
            },
            {
                "requester_id": requester2.id,
                "patient_name": "Zubair Ahmed (Platelets Required)",
                "blood_group": "O+",
                "units_needed": 1,
                "urgency": "normal",
                "hospital_name": "Shaukat Khanum Memorial Hospital",
                "hospital_id": hospitals[3].id,
                "latitude": 31.4827,
                "longitude": 74.2818,
                "city": "Lahore",
                "contact_phone": "+923334445566",
                "is_verified": False,
            },
            {
                "requester_id": requester2.id,
                "patient_name": "Baby of Sana (Pediatric Unit)",
                "blood_group": "AB+",
                "units_needed": 1,
                "urgency": "normal",
                "hospital_name": "Pakistan Institute of Medical Sciences (PIMS)",
                "hospital_id": hospitals[4].id,
                "latitude": 33.7053,
                "longitude": 73.0538,
                "city": "Islamabad",
                "contact_phone": "+923334445566",
                "is_verified": True,
            },
        ]

        for req_data in requests_data:
            req = BloodRequest(**req_data)
            db.add(req)
            db.commit()
            db.refresh(req)
            # Run auto-matching pipeline
            process_new_request(req, db)

        # Create one suspicious sample request with report for Admin verification
        fake_req = BloodRequest(
            requester_id=requester1.id,
            patient_name="Suspicious Claim",
            blood_group="AB-",
            units_needed=5,
            urgency="normal",
            hospital_name="Unknown Clinic",
            city="Karachi",
            contact_phone="+923009999999",
            is_flagged=False,
        )
        db.add(fake_req)
        db.commit()
        db.refresh(fake_req)

        report = Report(
            reporter_id=admin.id,
            request_id=fake_req.id,
            reason="Hospital contact could not verify patient admission in records.",
            status="pending",
        )
        db.add(report)
        db.commit()

        print("✅ Database seeding completed successfully!")
        print("--------------------------------------------------")
        print("🔑 Test Accounts:")
        print("   Admin:     Phone: +923000000000 | Password: Admin@123")
        print("   Donor 1:   Phone: +923001234001 | Password: Donor@123  (O- Karachi)")
        print("   Donor 2:   Phone: +923001234004 | Password: Donor@123  (B+ Karachi)")
        print("   Requester: Phone: +923331112233 | Password: Requester@123")
        print("--------------------------------------------------")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
