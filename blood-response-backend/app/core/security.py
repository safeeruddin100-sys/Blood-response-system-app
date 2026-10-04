"""
Security utilities: JWT tokens, password hashing, CNIC hashing, OTP, role guards.

PRIVACY NOTE:
- CNIC is stored as a one-way SHA-256 hash. This allows verification ("does this
  CNIC match?") but NOT retrieval/display of the original number.
- For production: if you need to display masked CNICs (e.g. "35202-*******-3"),
  you'll need reversible encryption (AES-256-GCM) with proper key management
  (e.g. AWS KMS, HashiCorp Vault). See README for details.

OTP verification uses a phone-keyed in-memory store for the current dev flow.
    Use a shared cache or database-backed store before running multiple workers.
"""

import hashlib
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import users_collection  # MongoDB collection

# ---------------------------------------------------------------------------
# Password hashing (bcrypt)
# ---------------------------------------------------------------------------
import bcrypt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")
    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# CNIC hashing — PRIVACY-SENSITIVE
# One-way SHA-256 hash. Cannot be reversed. See module docstring for trade-offs.
# ---------------------------------------------------------------------------
def hash_cnic(cnic: str) -> str:
    """
    Hash a CNIC number using SHA-256.
    PRIVACY-SENSITIVE: This is a one-way hash — the original CNIC cannot be
    recovered from this value. Suitable for duplicate-check / verification only.
    """
    # Normalize: strip dashes and whitespace
    normalized = cnic.replace("-", "").replace(" ", "").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# JWT tokens (access + refresh)
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Current user dependency (MongoDB version)
# ---------------------------------------------------------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    """
    FastAPI dependency — extracts and validates the current user from JWT.
    ObjectId subjects are resolved from MongoDB. Numeric subjects are retained only
    for legacy SQLite test users.

    Returns a SimpleNamespace so attribute access (current_user.id, .role, etc.)
    works identically across MongoDB and SQLite users.
    """
    from types import SimpleNamespace

    payload = decode_token(token)
    user_id_str: Optional[str] = payload.get("sub")
    token_type: Optional[str] = payload.get("type")

    if user_id_str is None or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = None
    if ObjectId.is_valid(user_id_str):
        try:
            user = await users_collection.find_one({"_id": ObjectId(user_id_str)})
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="MongoDB user lookup failed",
            ) from exc

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

    if user:
        return SimpleNamespace(
            _raw=user,                        # original Mongo doc (for auth helpers)
            _id=user["_id"],                  # raw ObjectId
            id=user_id_str,                   # str ObjectId — used in UserResponse
            phone=user.get("phone", ""),
            email=user.get("email"),
            full_name=user.get("full_name", ""),
            role=user.get("role", "donor"),
            is_verified=user.get("is_verified", False),
            is_active=user.get("is_active", True),
            consent_given=user.get("consent_given", False),
            created_at=user.get("created_at"),
            updated_at=user.get("updated_at"),
            hashed_password=user.get("hashed_password", ""),
            cnic_hash=user.get("cnic_hash"),
        )

    if not str(user_id_str).isdigit():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier",
        )

    # Legacy fallback for numeric SQLite test users only.
    role_from_token = payload.get("role", "donor")
    return SimpleNamespace(
        _raw=None,
        _id=user_id_str,
        id=user_id_str,
        phone="",  # Will be matched/upserted by get_local_user or fallback
        full_name="",
        role=role_from_token,
        is_verified=True,
        is_active=True,
        consent_given=True,
        created_at=None,
        updated_at=None,
        hashed_password="",
        cnic_hash=None,
    )


def require_role(*roles: str):
    """
    FastAPI dependency factory — restricts endpoint access to specific roles.
    Usage: `current_user = Depends(require_role("admin"))`
    Returns the SimpleNamespace user object.
    """

    async def role_checker(
        token: str = Depends(oauth2_scheme),
    ):
        user = await get_current_user(token)
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}",
            )
        return user

    return role_checker


# ---------------------------------------------------------------------------
# SQLite-bridge dependencies
# These upsert the current MongoDB-authenticated user into the SQLite users
# table (keyed by phone), returning a real SQLAlchemy User with an integer PK
# for use in all SQLAlchemy-backed routes (requests, donors, reports, etc.)
# ---------------------------------------------------------------------------

async def get_local_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(lambda: None),  # placeholder, real db injected below
):
    """
    Placeholder — real implementation uses SessionLocal directly (see below).
    This exists so the function signature is importable.
    """
    pass  # replaced by the real factory below


def _make_get_local_user():
    """
    Returns the real get_local_user dependency with a proper DB injection.
    We build it inside a factory to avoid a circular import at module level.
    """
    from fastapi import Depends as _Depends
    from sqlalchemy.orm import Session as _Session
    from app.core.database import get_db

    async def _get_local_user(
        token: str = _Depends(oauth2_scheme),
        db: _Session = _Depends(get_db),
    ):
        """
        FastAPI dependency — bridges MongoDB auth → SQLite integer user ID.

        1. Validates the JWT (via get_current_user).
          2. For Mongo users, uses MongoDB as the source of truth and maintains a
              SQL shadow row only for legacy SQL-backed route foreign keys.
          3. For numeric legacy subjects, uses the guarded SQLite lookup.
          4. Returns the SQLAlchemy User object so SQLite-backed routes get a
           proper integer ``.id`` for FK columns.
        """
        from app.models.user import User as SQLUser

        ns = await get_current_user(token)

        try:
            # The SQL tables are compatibility storage for SQL-backed routes;
            # MongoDB remains the authentication source of truth.
            from app.models.base import Base
            Base.metadata.create_all(bind=db.get_bind())

            if ns.id and ObjectId.is_valid(str(ns.id)):
                local = db.query(SQLUser).filter(SQLUser.phone == ns.phone).first()
            elif ns.id and str(ns.id).isdigit():
                local = db.query(SQLUser).filter(SQLUser.id == int(ns.id)).first()
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid user identifier",
                )

            if not local:
                phone_val = ns.phone or f"+000000{ns.id}"
                display_name = (getattr(ns, "full_name", "") or "").strip() or phone_val[-7:] or "User"
                local = SQLUser(
                    phone=phone_val,
                    hashed_password=getattr(ns, "hashed_password", "") or "",
                    full_name=display_name,
                    role=ns.role,
                    is_verified=getattr(ns, "is_verified", True),
                    is_active=getattr(ns, "is_active", True),
                    consent_given=getattr(ns, "consent_given", True),
                )
                db.add(local)
                db.commit()
                db.refresh(local)
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SQL compatibility database is unavailable",
            ) from exc

        return local

    return _get_local_user


# Build the real dependency
get_local_user = _make_get_local_user()


def get_local_require_role(*roles: str):
    """
    Like require_role but returns a SQLAlchemy User (integer PK).
    Usage: ``current_user = Depends(get_local_require_role("admin"))``
    """
    from fastapi import Depends as _Depends
    from sqlalchemy.orm import Session as _Session
    from app.core.database import get_db

    async def _checker(
        user= _Depends(get_local_user),
    ):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}",
            )
        return user

    return _checker


# ---------------------------------------------------------------------------
# OTP generation & verification
# STUB: In dev mode, ANY correctly-formatted OTP is accepted.
# Wire Twilio / SMS gateway before production. See README.
# ---------------------------------------------------------------------------
otp_store = {}


def generate_otp(phone: str) -> str:
    """Generate and store a random numeric OTP for the phone number."""
    otp = "".join(random.choices(string.digits, k=settings.OTP_LENGTH))
    otp_store[phone] = otp
    return otp


def verify_otp(phone: str, otp: str) -> bool:
    """Verify and consume the OTP currently stored for the phone number."""
    if otp_store.get(phone) != otp:
        return False

    del otp_store[phone]
    return True