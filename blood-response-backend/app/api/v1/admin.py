from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_local_require_role
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.request import BloodRequest, DonationMatch
from app.models.report import Report
from app.schemas.report import ReportResponse, ReportReview

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/reports", response_model=list[ReportResponse])
def list_pending_reports(
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all pending reports for admin review."""
    return (
        db.query(Report)
        .filter(Report.status == "pending")
        .order_by(Report.created_at.desc())
        .all()
    )


@router.put("/reports/{report_id}", response_model=ReportResponse)
def review_report(
    report_id: int,
    data: ReportReview,
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Review a report — approve (mark request as flagged) or dismiss."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = data.status
    report.admin_notes = data.admin_notes
    report.reviewed_at = datetime.now(timezone.utc)

    # If reviewed (approved), flag the associated request
    if data.status == "reviewed":
        request = db.query(BloodRequest).filter(BloodRequest.id == report.request_id).first()
        if request:
            request.is_flagged = True
            db.add(request)

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.put("/requests/{request_id}/verify")
def verify_request(
    request_id: int,
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Mark a blood request as verified by admin."""
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    request.is_verified = True
    request.is_flagged = False  # Clear flag on verification
    db.add(request)
    db.commit()

    return {"message": "Request verified", "request_id": request_id}


@router.put("/requests/{request_id}/flag")
def flag_request(
    request_id: int,
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Flag a blood request as suspicious."""
    request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    request.is_flagged = True
    db.add(request)
    db.commit()

    return {"message": "Request flagged", "request_id": request_id}


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """Basic dashboard statistics for admin."""
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_donors": db.query(func.count(DonorProfile.id)).scalar(),
        "available_donors": db.query(func.count(DonorProfile.id)).filter(DonorProfile.is_available.is_(True)).scalar(),
        "total_requests": db.query(func.count(BloodRequest.id)).scalar(),
        "pending_requests": db.query(func.count(BloodRequest.id)).filter(BloodRequest.status == "pending").scalar(),
        "fulfilled_requests": db.query(func.count(BloodRequest.id)).filter(BloodRequest.status == "fulfilled").scalar(),
        "total_matches": db.query(func.count(DonationMatch.id)).scalar(),
        "confirmed_donations": db.query(func.count(DonationMatch.id)).filter(DonationMatch.status == "confirmed").scalar(),
        "pending_reports": db.query(func.count(Report.id)).filter(Report.status == "pending").scalar(),
    }


@router.post("/cleanup-expired")
def cleanup_expired_requests(
    older_than_days: int = 3,
    current_user: User = Depends(get_local_require_role("admin")),
    db: Session = Depends(get_db),
):
    """
    Admin utility: expire all pending/in_progress requests older than N days.
    Default is 3 days. Use to keep the home feed free of stale test entries.
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)

    stale = (
        db.query(BloodRequest)
        .filter(
            BloodRequest.status.in_(["pending", "in_progress"]),
            BloodRequest.created_at < cutoff,
        )
        .all()
    )

    count = 0
    for req in stale:
        req.status = "expired"
        db.add(req)
        count += 1

    db.commit()
    return {
        "message": f"Expired {count} stale request(s) older than {older_than_days} day(s).",
        "expired_count": count,
        "cutoff_date": cutoff.isoformat(),
    }
