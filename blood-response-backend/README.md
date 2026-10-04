# 🩸 The Blood Response System — Backend

> Mobile Emergency Blood Donation Platform for **Alkhidmat Foundation Pakistan**

A high-reliability FastAPI backend providing emergency blood request management, automated compatibility matching, geolocation donor search, 90-day cooldown enforcement, trust & reporting moderation, and in-app notification dispatching.

---

## ⚡ Quick Start (< 5 Minutes)

### 1. Prerequisites
- Python 3.11+
- Git

### 2. Setup Virtual Environment & Install Dependencies
```bash
# Navigate to backend folder
cd blood-response-backend

# Create & activate virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS / Termux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Defaults work out-of-the-box with SQLite and zero external dependencies!)*

### 4. Seed Database with Realistic Pakistani Data
```bash
python scripts/seed_data.py
```

### 5. Run Local Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Automated Tests

Run the complete test suite covering blood compatibility matrices, 90-day donor cooldowns, Haversine geospatial radius filtering, and blood request lifecycle transitions:

```bash
pytest -v
```

---

## 🔑 Pre-Seeded Test Credentials

| Role | Phone Number | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `+923000000000` | `Admin@123` | Can review flagged requests, verify hospitals/requests |
| **Donor (O-)** | `+923001234001` | `Donor@123` | Universal Donor (Karachi) |
| **Donor (B+)** | `+923001234004` | `Donor@123` | Active Donor (Karachi) |
| **Requester** | `+923331112233` | `Requester@123` | Patient / Requester Account |

---

## 🏗️ Architecture & Features

```
blood-response-backend/
├── app/
│   ├── api/v1/          # Endpoints: auth, donors, requests, hospitals, reports, admin, notifications
│   ├── core/            # Config (Pydantic Settings), DB session, JWT/Password/CNIC security
│   ├── models/          # SQLAlchemy ORM models (declarative 2.0 syntax)
│   ├── schemas/         # Pydantic v2 schemas
│   ├── services/        # Business logic: matching_service, cooldown_service, notification_service
│   ├── utils/           # Blood compatibility matrix, Haversine geo distance
│   └── main.py          # FastAPI application factory & lifespan checks
├── alembic/             # Database migrations
├── scripts/             # Database seeding scripts (realistic Pakistani hospitals & coordinates)
├── tests/               # Pytest automated test suite
├── Dockerfile           # Production container build
└── requirements.txt
```

### 1. Blood Compatibility Engine (`app/utils/blood_compatibility.py`)
Implements the medical Red Blood Cell compatibility matrix:
- **Universal Donor**: `O-` can donate to `O-`, `O+`, `A-`, `A+`, `B-`, `B+`, `AB-`, `AB+`
- **Universal Recipient**: `AB+` can receive from all groups
- Matching logic queries all compatible donor blood types for any given recipient request.

### 2. Auto-Cooldown Service (`app/services/cooldown_service.py`)
- Post-donation, donor is automatically flagged `is_available = False` for **90 days**.
- Evaluated via dual-strategy:
  1. **Lazy On-Read Check**: Evaluated in real-time when profiles or queries are accessed (works with zero cron jobs).
  2. **Bulk Startup / Scheduled Check**: Refreshes expired donors automatically.

### 3. Geolocation & Matching (`app/services/matching_service.py`)
- Pure Python Haversine formula calculation (no heavy PostGIS / spatial extension required for local dev).
- Upon request creation, nearby compatible donors within search radius are identified, `DonationMatch` records are created, and notifications are sent.

---

## 🔒 Security, Privacy & Stubs (Internship Evaluation Notes)

### 1. CNIC Handling (Data Privacy)
- **Current MVP Implementation**: CNIC numbers are hashed using a one-way `SHA-256` digest (`app.core.security.hash_cnic`). The plain CNIC is never persisted to the database.
- **Production Hardening Requirement**: For production, if masked CNICs (e.g. `42201-*******-1`) need to be displayed in compliance with NADRA verification guidelines, field-level reversible encryption (`AES-256-GCM`) with an envelope encryption key manager (e.g. AWS KMS, HashiCorp Vault) must replace simple hashing.

### 2. SMS & Push Notification Stubs
- **Current MVP Implementation**: `NotificationService` runs with `ConsoleNotificationService` and dev OTP verification, printing SMS/OTP codes to console and logging in-app alerts into SQLite.
- **Production Hardening Requirement**: Implement the `NotificationService` protocol using Twilio / local Pakistan SMS Gateway (e.g. TeleStax / Zong SMS API) and Firebase Cloud Messaging (FCM).

### 3. Database Portability
- Built using standard SQLAlchemy ORM.
- **Switching to PostgreSQL**: Change `.env`:
  ```env
  DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/blood_response_db
  ```
