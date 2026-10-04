"""
Report API endpoints — report fake/suspicious requests.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_local_user
from app.models.user import User
from app.models.request import BloodRequest
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Report a fake or suspicious blood request."""
    # Verify the request exists
    request = db.query(BloodRequest).filter(BloodRequest.id == data.request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Check for duplicate report
    existing = (
        db.query(Report)
        .filter(
            Report.reporter_id == current_user.id,
            Report.request_id == data.request_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reported this request",
        )

    report = Report(
        reporter_id=current_user.id,
        request_id=data.request_id,
        reason=data.reason,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get("/", response_model=list[ReportResponse])
def list_reports(
    current_user: User = Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """List reports — admins see all, regular users see only their own."""
    if current_user.role == "admin":
        return db.query(Report).order_by(Report.created_at.desc()).all()
    return (
        db.query(Report)
        .filter(Report.reporter_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
