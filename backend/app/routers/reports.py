from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SEOReport
from app.schemas import AIAnalysis, ReportListItem, ReportResponse

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=list[ReportListItem])
def list_reports(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    reports = (
        db.query(SEOReport)
        .filter(SEOReport.status == "completed")
        .order_by(SEOReport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return reports


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(SEOReport).filter(SEOReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    ai = None
    if report.ai_analysis:
        ai = AIAnalysis(**report.ai_analysis)

    return ReportResponse(
        id=report.id,
        job_id=report.job_id,
        url=report.url,
        status=report.status,
        seo_score=report.seo_score,
        scan_data=report.scan_data,
        ai_analysis=ai,
        response_time_ms=report.response_time_ms,
        page_size_kb=report.page_size_kb,
        created_at=report.created_at,
        completed_at=report.completed_at,
    )
