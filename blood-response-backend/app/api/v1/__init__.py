# API v1 package
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.donors import router as donors_router
from app.api.v1.requests import router as requests_router
from app.api.v1.hospitals import router as hospitals_router
from app.api.v1.reports import router as reports_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notifications import router as notifications_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(donors_router)
api_v1_router.include_router(requests_router)
api_v1_router.include_router(hospitals_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(notifications_router)
