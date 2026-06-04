"""Performance, speed & UX review from measurable page signals."""

from app.schemas import PerformanceUXCheck, PerformanceUXReview, ScanData


def _rate_response(ms: float) -> tuple[str, str]:
    if ms < 500:
        return "best", "Excellent — under 500ms TTFB target"
    if ms < 800:
        return "good", "Good — within acceptable range"
    if ms < 1500:
        return "warning", "Moderate — consider caching/CDN"
    if ms < 2500:
        return "bad", "Slow — likely impacts Core Web Vitals"
    return "critical", "Critical — users may abandon before paint"


def _rate_size(kb: float) -> tuple[str, str]:
    if kb < 500:
        return "best", "Light page — fast download"
    if kb < 1500:
        return "good", "Reasonable HTML weight"
    if kb < 3000:
        return "warning", "Heavy — compress images and defer JS"
    return "bad", "Very heavy — split assets, lazy-load media"


def _overall_rating(checks: list[PerformanceUXCheck]) -> str:
    order = {"critical": 0, "bad": 1, "warning": 2, "good": 3, "best": 4}
    worst = min((order.get(c.status, 2) for c in checks), default=3)
    return {0: "critical", 1: "bad", 2: "warning", 3: "good", 4: "best"}[worst]


def build_performance_ux_review(scan: ScanData) -> PerformanceUXReview:
    p = scan.performance
    s = scan.signals
    t = scan.technical
    c = scan.content

    resp_status, resp_note = _rate_response(p.response_time_ms)
    size_status, size_note = _rate_size(p.page_size_kb)

    checks: list[PerformanceUXCheck] = [
        PerformanceUXCheck(
            check="Server response time (TTFB)",
            status=resp_status,
            current=f"{p.response_time_ms:.0f} ms",
            recommended="Under 500ms (enable server cache, CDN, HTTP/2)",
            impact=resp_note,
        ),
        PerformanceUXCheck(
            check="HTML document size",
            status=size_status,
            current=f"{p.page_size_kb:.1f} KB",
            recommended="Under 1.5 MB total page weight; compress images, minify CSS/JS",
            impact=size_note,
        ),
        PerformanceUXCheck(
            check="HTTP status",
            status="best" if p.status_code == 200 else "critical" if p.status_code >= 400 else "warning",
            current=str(p.status_code),
            recommended="200 OK for indexable landing pages",
            impact="Non-200 pages may not rank or pass link equity.",
        ),
        PerformanceUXCheck(
            check="Mobile viewport",
            status="best" if s.has_viewport else "critical",
            current="Present" if s.has_viewport else "Missing <meta name=\"viewport\">",
            recommended='width=device-width, initial-scale=1',
            impact="Required for mobile-first indexing and usable mobile UX.",
        ),
        PerformanceUXCheck(
            check="HTML language",
            status="good" if s.html_lang else "warning",
            current=s.html_lang or "Not set",
            recommended='lang="en" (or target locale) on <html>',
            impact="Helps screen readers and regional search targeting.",
        ),
        PerformanceUXCheck(
            check="JavaScript weight (script tags)",
            status="best" if s.script_count <= 10 else "warning" if s.script_count <= 25 else "bad",
            current=f"{s.script_count} <script> tags",
            recommended="Defer non-critical JS; aim for fewer blocking scripts",
            impact="High script count often delays interactivity (INP).",
        ),
        PerformanceUXCheck(
            check="Readability (UX)",
            status=(
                "best" if c.readability_score >= 60
                else "good" if c.readability_score >= 45
                else "warning" if c.readability_score >= 30
                else "bad"
            ),
            current=f"Flesch {c.readability_score}, grade {c.readability_grade}",
            recommended="Aim for Flesch 50–70 for general audiences (grade 8–10)",
            impact="Hard-to-read pages increase bounce rate and lower engagement signals.",
        ),
        PerformanceUXCheck(
            check="Internal navigation",
            status="good" if t.internal_links >= 5 else "warning" if t.internal_links >= 1 else "bad",
            current=f"{t.internal_links} internal links",
            recommended="5+ contextual internal links for crawl depth and UX",
            impact="Helps users and bots discover related content.",
        ),
    ]

    if s.stylesheet_count > 15:
        checks.append(
            PerformanceUXCheck(
                check="CSS requests",
                status="warning",
                current=f"{s.stylesheet_count} stylesheet links",
                recommended="Combine CSS files; remove unused styles",
                impact="Many CSS files increase render-blocking time.",
            )
        )

    overall = _overall_rating(checks)

    summary = (
        f"Performance & UX: **{overall}**. "
        f"TTFB {p.response_time_ms:.0f}ms ({resp_status}), "
        f"page {p.page_size_kb:.0f}KB ({size_status}). "
        f"{sum(1 for x in checks if x.status in ('critical', 'bad', 'warning'))} item(s) need attention."
    )

    return PerformanceUXReview(
        overall_rating=overall,
        response_time_ms=p.response_time_ms,
        response_rating=resp_status,
        page_size_kb=p.page_size_kb,
        page_size_rating=size_status,
        status_code=p.status_code,
        ux_checks=checks,
        summary=summary,
    )
