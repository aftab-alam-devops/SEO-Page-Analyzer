import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import SEOReport
from app.redis_client import set_scan_progress
from app.schemas import ScanStep
from app.services.ai_analyzer import analyze_with_gemini
from app.services.intent_analyzer import build_search_intent_strategy
from app.services.seo_scanner import scan_page
from app.services.ux_performance import build_performance_ux_review

SCAN_STEPS = [
    ("fetch", "Fetching page"),
    ("technical", "Analyzing technical SEO"),
    ("content", "Analyzing content & search intent"),
    ("performance", "Performance, speed & UX review"),
    ("ai", "Running AI analysis (Gemini)"),
    ("save", "Saving report"),
]


def _update_progress(
    job_id: str,
    url: str,
    status: str,
    progress: int,
    current_step: str | None,
    steps: list[ScanStep],
    report_id: int | None = None,
    error: str | None = None,
):
    set_scan_progress(
        job_id,
        {
            "job_id": job_id,
            "url": url,
            "status": status,
            "progress": progress,
            "current_step": current_step,
            "steps": [s.model_dump() for s in steps],
            "report_id": report_id,
            "error": error,
        },
    )


async def run_scan(job_id: str, url: str, db: Session) -> None:
    steps = [ScanStep(id=s[0], label=s[1], status="pending") for s in SCAN_STEPS]
    report = SEOReport(job_id=job_id, url=url, status="running")
    db.add(report)
    db.commit()
    db.refresh(report)

    scan_data = None
    ai_result = None

    try:
        _update_progress(job_id, url, "running", 5, "fetch", steps)

        for i, (step_id, _) in enumerate(SCAN_STEPS):
            steps[i].status = "running"
            _update_progress(
                job_id,
                url,
                "running",
                int((i / len(SCAN_STEPS)) * 100),
                step_id,
                steps,
            )

            if step_id == "fetch":
                scan_data = await scan_page(url)
                steps[i].status = "done"
                steps[i].detail = f"Status {scan_data.performance.status_code}"
            elif step_id == "technical":
                t = scan_data.technical  # type: ignore[union-attr]
                steps[i].status = "done"
                steps[i].detail = (
                    f"Title: {'✓' if t.page_title else '✗'}, "
                    f"H1: {t.h1_count}, Links: {t.internal_links} internal"
                )
            elif step_id == "content":
                c = scan_data.content  # type: ignore[union-attr]
                intent = build_search_intent_strategy(scan_data)  # type: ignore[arg-type]
                steps[i].status = "done"
                steps[i].detail = (
                    f"Intent: {intent.primary_intent}, "
                    f"keyword: {intent.keywords[0].keyword if intent.keywords else 'n/a'}"
                )
            elif step_id == "performance":
                p = scan_data.performance  # type: ignore[union-attr]
                ux = build_performance_ux_review(scan_data)  # type: ignore[arg-type]
                steps[i].status = "done"
                steps[i].detail = (
                    f"{p.response_time_ms:.0f}ms, {p.page_size_kb:.1f} KB — UX {ux.overall_rating}"
                )
            elif step_id == "ai":
                ai_result = await analyze_with_gemini(scan_data)  # type: ignore[arg-type]
                steps[i].status = "done"
                steps[i].detail = f"SEO Score: {ai_result.seo_score}/100"
            elif step_id == "save":
                report.status = "completed"
                report.seo_score = ai_result.seo_score  # type: ignore[union-attr]
                report.scan_data = scan_data.model_dump()  # type: ignore[union-attr]
                report.ai_analysis = ai_result.model_dump()  # type: ignore[union-attr]
                report.response_time_ms = scan_data.performance.response_time_ms  # type: ignore[union-attr]
                report.page_size_kb = scan_data.performance.page_size_kb  # type: ignore[union-attr]
                report.completed_at = datetime.now(timezone.utc)
                db.commit()
                steps[i].status = "done"
                steps[i].detail = "Report saved"

            _update_progress(
                job_id,
                url,
                "running",
                int(((i + 1) / len(SCAN_STEPS)) * 100),
                step_id,
                steps,
            )

        _update_progress(
            job_id, url, "completed", 100, None, steps, report_id=report.id
        )

    except Exception as e:
        for s in steps:
            if s.status == "running":
                s.status = "error"
                s.detail = str(e)[:200]
        report.status = "failed"
        db.commit()
        _update_progress(
            job_id, url, "failed", 0, None, steps, error=str(e)[:500]
        )
