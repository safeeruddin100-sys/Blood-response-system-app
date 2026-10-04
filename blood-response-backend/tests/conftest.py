"""
Test fixtures — shared test database, client, and sample data.
Uses in-memory SQLite for fast, isolated tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models import *  # noqa — import all models
from app.core.security import hash_password, hash_cnic

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_blood_response.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the DB dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with a fresh database."""
    Base.metadata.create_all(bind=test_engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def sample_user(db):
    """Create a sample donor user."""
    from app.models.user import User
    user = User(
        phone="+923001234567",
        hashed_password=hash_password("testpass123"),
        full_name="Ahmed Khan",
        role="donor",
        cnic_hash=hash_cnic("35202-1234567-1"),
        consent_given=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def sample_requester(db):
    """Create a sample requester user."""
    from app.models.user import User
    user = User(
        phone="+923009876543",
        hashed_password=hash_password("testpass123"),
        full_name="Sara Ahmed",
        role="requester",
        consent_given=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def sample_admin(db):
    """Create a sample admin user."""
    from app.models.user import User
    user = User(
        phone="+923000000000",
        hashed_password=hash_password("adminpass123"),
        full_name="Admin User",
        role="admin",
        consent_given=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


from app.core.security import create_access_token


@pytest.fixture
def auth_headers(sample_user):
    """Get auth headers for a donor user."""
    token = create_access_token(data={"sub": str(sample_user.id), "role": sample_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def requester_headers(sample_requester):
    """Get auth headers for a requester user."""
    token = create_access_token(data={"sub": str(sample_requester.id), "role": sample_requester.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(sample_admin):
    """Get auth headers for an admin user."""
    token = create_access_token(data={"sub": str(sample_admin.id), "role": sample_admin.role})
    return {"Authorization": f"Bearer {token}"}
