"""
Blood Response System — FastAPI Application Entry Point (MongoDB Version).

Run with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
API docs: http://localhost:8000/docs
"""

import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure UTF-8 output encoding on Windows to prevent UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.core.config import settings
from app.core.database import client, db
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    On startup: ping MongoDB to verify connection.
    On shutdown: close MongoDB client.
    """
    # MongoDB connection check
    try:
        await client.admin.command('ping')
        print("✅ MongoDB connected successfully!")
    except Exception as e:
        print("[WARN] MongoDB connection warning (not connected):", e)

    print(f"[RUNNING] {settings.APP_NAME} is running!")
    print(f"[DOCS] API docs: http://localhost:8000/docs")
    yield

    # Cleanup
    client.close()
    print(f"[SHUTDOWN] {settings.APP_NAME} shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Emergency blood donation platform for Alkhidmat Foundation Pakistan. "
        "Connects verified donors with urgent blood requests using real-time "
        "matching, blood group compatibility, and location-based search."
    ),
    version="1.0.0-mvp",
    lifespan=lifespan,
)

# CORS — Allow all origins for development (Web, Mobile Expo, Localhost, IPs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 routes
app.include_router(api_v1_router)


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0-mvp",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check with MongoDB status."""
    try:
        await client.admin.command('ping')
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": "MongoDB",
        "db_status": db_status,
        "debug": settings.DEBUG,
    }