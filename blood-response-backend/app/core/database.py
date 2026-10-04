"""
Database engine, session management, and MongoDB client/collections.
"""

import os
from typing import Generator
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# ---------------------------------------------------------------------------
# MongoDB (Async Motor)
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", settings.MONGO_URI)
DB_NAME = os.getenv("DB_NAME", settings.DB_NAME)

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

# Collections
users_collection = db["users"]
donor_profiles_collection = db["donor_profiles"]
blood_requests_collection = db["blood_requests"]
notifications_collection = db["notifications"]
hospitals_collection = db["hospitals"]
reports_collection = db["reports"]

# ---------------------------------------------------------------------------
# Relational DB (SQLAlchemy — for backward compatibility during migration)
# ---------------------------------------------------------------------------
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a DB session, auto-closes on request end."""
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
