import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.redis_client import get_scan_progress, set_scan_progress
from app.schemas import ScanProgressResponse, ScanRequest, ScanStartResponse, ScanStep
from app.services.scan_worker import SCAN_STEPS, run_scan

router = APIRouter(prefix="/api/scan", tags=["scan"])


@router.post("", response_model=ScanStartResponse)
async def start_scan(
    body: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    steps = [ScanStep(id=s[0], label=s[1], status="pending") for s in SCAN_STEPS]
    set_scan_progress(
        job_id,
        {
            "job_id": job_id,
            "url": url,
            "status": "pending",
            "progress": 0,
            "current_step": None,
            "steps": [s.model_dump() for s in steps],
            "report_id": None,
            "error": None,
        },
    )

    background_tasks.add_task(_run_scan_task, job_id, url)

    return ScanStartResponse(job_id=job_id, message="Scan started")


def _run_scan_task(job_id: str, url: str):
    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_scan(job_id, url, db))
        loop.close()
    finally:
        db.close()


@router.get("/{job_id}/progress", response_model=ScanProgressResponse)
def get_progress(job_id: str):
    data = get_scan_progress(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Scan job not found or expired")
    steps = [ScanStep(**s) for s in data.get("steps", [])]
    return ScanProgressResponse(
        job_id=data["job_id"],
        url=data["url"],
        status=data["status"],
        progress=data.get("progress", 0),
        current_step=data.get("current_step"),
        steps=steps,
        report_id=data.get("report_id"),
        error=data.get("error"),
    )
