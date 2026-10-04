"""
Auth API endpoints — registration, login, JWT refresh, OTP verification.

OTP verification uses the generated phone-keyed code in the dev/email flow.
    Use a shared cache or database-backed store before running multiple workers.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import users_collection, get_db
from app.services.email_service import send_otp_email
from app.core.security import (
    hash_password,
    verify_password,
    hash_cnic,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    verify_otp,
    get_current_user,   # Note: is ko MongoDB ke liye update karna hoga
)
from app.schemas.user import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    OTPVerify,
    ResendOTPRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_response(user_doc) -> UserResponse:
    """Convert MongoDB user document (or SimpleNamespace) to UserResponse.

    Accepts either:
    - a raw MongoDB document dict  (e.g. result from find_one in /register)
    - a SimpleNamespace             (e.g. returned by get_current_user dep)
    """
    if not user_doc:
        return None

    # SimpleNamespace from get_current_user already has .id set as str
    from types import SimpleNamespace
    if isinstance(user_doc, SimpleNamespace):
        # FIX: Issue 1 — The fallback SimpleNamespace (for SQLite users) has
        # created_at=None / updated_at=None, but UserResponse declares them
        # as non-optional datetimes.  Supply a safe default so /auth/me
        # doesn't raise a ValidationError for seeded / test accounts.
        _now = datetime.utcnow()
        return UserResponse(
            id=user_doc.id,
            phone=user_doc.phone,
            full_name=user_doc.full_name,
            email=getattr(user_doc, 'email', None),
            role=user_doc.role,
            is_verified=getattr(user_doc, 'is_verified', False),
            is_active=getattr(user_doc, 'is_active', True),
            consent_given=getattr(user_doc, 'consent_given', False),
            created_at=user_doc.created_at or _now,
            updated_at=user_doc.updated_at or _now,
        )

    # Raw MongoDB dict — make a shallow copy before mutating
    doc = dict(user_doc)
    doc["id"] = str(doc.pop("_id"))  # ObjectId → 24-char hex string
    return UserResponse(**doc)



@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister):
    """
    Register a new user.
    Requires consent_given=True.
    CNIC is stored as a one-way SHA-256 hash (not plaintext).
    """
    # Check if phone already registered
    existing = await users_collection.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    # Check email uniqueness when an email was provided
    if data.email:
        existing_email = await users_collection.find_one({"email": data.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    # Check CNIC uniqueness (if provided)
    cnic_hash_value = None
    if data.cnic:
        cnic_hash_value = hash_cnic(data.cnic)
        existing_cnic = await users_collection.find_one({"cnic_hash": cnic_hash_value})
        if existing_cnic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CNIC already registered",
            )

    # Determine safe role server-side (only donor or requester allowed)
    assigned_role = "donor"
    if hasattr(data, "intended_role") and data.intended_role in {"donor", "requester"}:
        assigned_role = data.intended_role

    # Security Guard: "admin" is NEVER allowed in public registration
    if assigned_role == "admin":
        assigned_role = "donor"

    # Prepare user document — strictly enforce assigned_role
    user_doc = {
        "phone": data.phone,
        "email": data.email,
        "hashed_password": hash_password(data.password),
        "full_name": data.full_name,
        "role": assigned_role,
        "cnic_hash": cnic_hash_value,
        "consent_given": data.consent_given,
        "is_verified": False,          # start as unverified
        "is_active": True,             # active by default
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await users_collection.insert_one(user_doc)
    # Retrieve the inserted user for response
    inserted_user = await users_collection.find_one({"_id": result.inserted_id})

    # Generate and store OTP for this phone number
    otp = generate_otp(data.phone)
    print(f"[*] OTP for {data.phone}: {otp}")
    if settings.SMS_PROVIDER == "email" and data.email:
        await send_otp_email(
            to_email=data.email,
            otp=otp,
            full_name=data.full_name,
        )

    return _user_to_response(inserted_user)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
    user = None
    try:
        user = await users_collection.find_one({"phone": data.phone})
    except Exception:
        user = None

    if user:
        if not verify_password(data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid phone number or password",
            )

        if not user.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        user_id = str(user["_id"])
        role = user.get("role", "donor")
    else:
        # Fallback to SQLite users table (for test fixtures & legacy SQLite users)
        from app.models.user import User as SQLUser

        sql_user = db.query(SQLUser).filter(SQLUser.phone == data.phone).first()
        if not sql_user or not verify_password(data.password, sql_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid phone number or password",
            )

        if not sql_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        user_id = str(sql_user.id)
        role = sql_user.role

    access_token = create_access_token(data={"sub": user_id, "role": role})
    refresh_token = create_refresh_token(data={"sub": user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh an access token using a valid refresh token.

    Supports both MongoDB users (24-char hex ObjectId sub) and SQLite users
    (numeric integer sub) so that seeded/test accounts can also refresh.
    """
    payload = decode_token(data.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    # ── FIX: Issue 1 — Dual-DB refresh ──────────────────────────────────────
    # Try MongoDB first (primary store for newly registered users).
    # Fall back to SQLite for seeded / legacy users whose sub is a numeric ID.
    # ─────────────────────────────────────────────────────────────────────────
    if ObjectId.is_valid(user_id):
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            new_sub = str(user["_id"])
            new_role = user["role"]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
    else:
        # Numeric ID → SQLite fallback path
        from app.models.user import User as SQLUser
        sql_user = db.query(SQLUser).filter(SQLUser.id == int(user_id)).first() if user_id.isdigit() else None
        if not sql_user or not sql_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated",
            )
        new_sub = str(sql_user.id)
        new_role = sql_user.role

    access_token = create_access_token(data={"sub": new_sub, "role": new_role})
    new_refresh_token = create_refresh_token(data={"sub": new_sub})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/verify-otp", response_model=dict)
async def verify_otp_endpoint(data: OTPVerify):
    """
    Verify OTP sent to phone.
    The generated OTP must match the code stored for this phone number.
    """
    user = await users_collection.find_one({"phone": data.phone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_otp(data.phone, data.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    # Update verification flag
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
    )

    return {"message": "Phone verified successfully", "is_verified": True}


@router.post("/resend-otp")
async def resend_otp(data: ResendOTPRequest):
    """Generate and deliver a replacement OTP for an existing user."""
    user = await users_collection.find_one({"phone": data.phone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    stored_email = user.get("email")
    if stored_email and stored_email != data.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email does not match the registered account",
        )

    otp = generate_otp(data.phone)
    print(f"[*] OTP for {data.phone}: {otp}")
    if settings.SMS_PROVIDER == "email" and data.email:
        await send_otp_email(
            to_email=data.email,
            otp=otp,
            full_name=user.get("full_name", "User"),
        )

    return {"message": "OTP resent successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_to_response(current_user)