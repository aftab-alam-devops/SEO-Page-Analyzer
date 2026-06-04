"""Evidence-based SEO audit builder (fallback + AI response normalization)."""

import re
from urllib.parse import urlparse

from app.schemas import (
    AIAnalysis,
    AISuggestions,
    AuditSections,
    ImageAltDetail,
    ScanData,
    SEOFinding,
)
from app.services.intent_analyzer import build_search_intent_strategy
from app.services.ux_performance import build_performance_ux_review


def _slug_words(text: str, limit: int = 4) -> list[str]:
    words = re.findall(r"[a-zA-Z]{3,}", text.lower())
    seen: set[str] = set()
    out: list[str] = []
    for w in words:
        if w not in seen:
            seen.add(w)
            out.append(w)
        if len(out) >= limit:
            break
    return out


def _guess_primary_keyword(scan: ScanData) -> str:
    if scan.content.top_keywords:
        return scan.content.top_keywords[0]["word"]
    if scan.technical.h1_texts:
        return _slug_words(scan.technical.h1_texts[0], 1)[0] if _slug_words(scan.technical.h1_texts[0]) else "services"
    domain = urlparse(scan.url).netloc.replace("www.", "").split(".")[0]
    return domain or "page"


def _suggest_title(scan: ScanData, keyword: str) -> str:
    brand = urlparse(scan.url).netloc.replace("www.", "").split(".")[0].title()
    h1 = scan.technical.h1_texts[0] if scan.technical.h1_texts else keyword.title()
    base = f"{h1} | {brand}" if brand.lower() not in h1.lower() else h1
    if len(base) > 60:
        base = f"{keyword.title()} Services | {brand}"[:60]
    elif len(base) < 45:
        base = f"{base} — Expert {keyword.title()} Solutions"[:60]
    return base.strip()


def _suggest_meta(scan: ScanData, keyword: str) -> str:
    h1 = scan.technical.h1_texts[0] if scan.technical.h1_texts else keyword.title()
    brand = urlparse(scan.url).netloc.replace("www.", "").split(".")[0].title()
    meta = (
        f"Looking for {keyword}? {brand} offers {h1.lower()} with proven results. "
        f"Get a free consultation and grow your business today."
    )
    if len(meta) > 160:
        meta = meta[:157] + "..."
    elif len(meta) < 120:
        meta = f"{meta} Contact {brand} to learn more about our {keyword} expertise."
        meta = meta[:160]
    return meta


def _alt_from_filename(filename: str, keyword: str) -> str:
    stem = re.sub(r"\.[a-z0-9]+$", "", filename, flags=re.I)
    stem = re.sub(r"[-_]+", " ", stem).strip()
    if not stem or stem.lower() in ("image", "img", "photo", "banner", "logo"):
        return f"{keyword.title()} service illustration"
    words = stem.split()
    if keyword.lower() not in stem.lower():
        return f"{' '.join(words).title()} — {keyword.title()} related visual"
    return f"{' '.join(words).title()} showing {keyword} content"


def _finding(
    fid: str,
    category: str,
    severity: str,
    title: str,
    current: str | None = None,
    recommended: str | None = None,
    evidence: str | None = None,
    impact: str | None = None,
) -> SEOFinding:
    return SEOFinding(
        id=fid,
        category=category,
        severity=severity,
        title=title,
        current=current,
        recommended=recommended,
        evidence=evidence,
        impact=impact,
    )


def build_detailed_analysis(scan: ScanData) -> AIAnalysis:
    """Rule-based Ahrefs-style audit with real page evidence."""
    t = scan.technical
    c = scan.content
    p = scan.performance
    keyword = _guess_primary_keyword(scan)
    keywords = [k["word"] for k in c.top_keywords[:5]] or [keyword]
    suggested_title = _suggest_title(scan, keyword)
    suggested_meta = _suggest_meta(scan, keyword)
    h1_primary = t.h1_texts[0] if t.h1_texts else suggested_title.split("|")[0].strip()

    sections = AuditSections()
    score = 100

    # --- BEST / GOOD (what's working) ---
    if t.page_title and 45 <= t.title_length <= 65:
        sections.best.append(
            _finding(
                "title-length",
                "title",
                "best",
                "Title length is in the optimal range",
                current=f'"{t.page_title}" ({t.title_length} chars)',
                evidence=t.page_title,
                impact="Search engines can display your full title without truncation.",
            )
        )
    elif t.page_title:
        sections.good.append(
            _finding(
                "title-present",
                "title",
                "good",
                "Page title is set",
                current=f'"{t.page_title}" ({t.title_length} chars)',
                evidence=t.page_title,
            )
        )
        score -= 3

    if t.meta_description and 120 <= t.meta_description_length <= 165:
        sections.best.append(
            _finding(
                "meta-length",
                "meta",
                "best",
                "Meta description length is optimal",
                current=f'"{t.meta_description}" ({t.meta_description_length} chars)',
                evidence=t.meta_description[:200],
            )
        )
    elif t.meta_description:
        sections.good.append(
            _finding(
                "meta-present",
                "meta",
                "good",
                "Meta description exists",
                current=f'"{t.meta_description}" ({t.meta_description_length} chars)',
                evidence=t.meta_description[:200],
            )
        )

    if t.h1_count == 1:
        sections.best.append(
            _finding(
                "h1-single",
                "headings",
                "best",
                "Single H1 heading (best practice)",
                current=f'"{t.h1_texts[0]}"',
                evidence=t.h1_texts[0],
            )
        )
    elif t.h1_count > 0:
        sections.good.append(
            _finding(
                "h1-found",
                "headings",
                "good",
                "H1 heading present",
                current=" | ".join(f'"{x}"' for x in t.h1_texts[:3]),
                evidence=", ".join(t.h1_texts),
            )
        )

    if t.images_missing_alt == 0 and t.images_total > 0:
        sections.best.append(
            _finding(
                "alt-complete",
                "images",
                "best",
                "All images have alt text",
                current=f"{t.images_total} images checked",
                impact="Improves accessibility and image search visibility.",
            )
        )

    if p.response_time_ms < 800:
        sections.best.append(
            _finding(
                "speed-fast",
                "performance",
                "best",
                "Excellent server response time",
                current=f"{p.response_time_ms:.0f} ms",
                impact="Fast TTFB supports Core Web Vitals and crawl efficiency.",
            )
        )
    elif p.response_time_ms < 1500:
        sections.good.append(
            _finding(
                "speed-ok",
                "performance",
                "good",
                "Acceptable response time",
                current=f"{p.response_time_ms:.0f} ms",
                recommended="Under 800 ms for best results",
            )
        )

    if c.word_count >= 500:
        sections.good.append(
            _finding(
                "content-depth",
                "content",
                "good",
                "Solid content depth",
                current=f"{c.word_count} words",
                evidence=c.content_snippet[:200] + "..." if len(c.content_snippet) > 200 else c.content_snippet,
            )
        )

    if len(t.open_graph) >= 4:
        sections.good.append(
            _finding(
                "og-tags",
                "social",
                "good",
                "Open Graph tags configured",
                current=", ".join(t.open_graph.keys())[:120],
            )
        )

    # --- CRITICAL / BAD / WARNING ---
    image_alts: list[ImageAltDetail] = []

    if not t.page_title:
        score -= 15
        sections.critical.append(
            _finding(
                "title-missing",
                "title",
                "critical",
                "Missing page title",
                current="(empty <title> tag)",
                recommended=suggested_title,
                impact="Google may rewrite your SERP title from on-page content — hurting CTR.",
            )
        )
    elif t.title_length < 30 or t.title_length > 65:
        score -= 6
        sections.warning.append(
            _finding(
                "title-length-warn",
                "title",
                "warning",
                "Title length outside ideal range (50–60 chars)",
                current=f'"{t.page_title}" ({t.title_length} chars)',
                recommended=suggested_title,
                evidence=t.page_title,
                impact="Truncated or weak titles reduce click-through rate in search results.",
            )
        )

    if not t.meta_description:
        score -= 12
        sections.critical.append(
            _finding(
                "meta-missing",
                "meta",
                "critical",
                "Missing meta description",
                current="(no meta name=\"description\")",
                recommended=suggested_meta,
                evidence="SERP snippet will be auto-generated from page body.",
                impact="You lose control of the search result snippet users see.",
            )
        )
    elif t.meta_description_length < 120 or t.meta_description_length > 165:
        score -= 5
        sections.bad.append(
            _finding(
                "meta-length-bad",
                "meta",
                "bad",
                "Meta description length not optimal (120–160 chars)",
                current=f'"{t.meta_description}" ({t.meta_description_length} chars)',
                recommended=suggested_meta,
                evidence=t.meta_description,
            )
        )

    if t.h1_count == 0:
        score -= 10
        sections.critical.append(
            _finding(
                "h1-missing",
                "headings",
                "critical",
                "No H1 heading on page",
                current="(no <h1> found)",
                recommended=h1_primary or f"{keyword.title()} Services",
                impact="Primary topic signal is missing for crawlers.",
            )
        )
    elif t.h1_count > 1:
        score -= 8
        secondary = t.h1_texts[1:] if len(t.h1_texts) > 1 else []
        fix_lines = [
            f'Keep one H1: "{t.h1_texts[0]}"',
            *[f'Change "{h}" from H1 → H2' for h in secondary[:3]],
        ]
        sections.critical.append(
            _finding(
                "h1-multiple",
                "headings",
                "critical",
                f"Multiple H1 tags ({t.h1_count}) dilute topical focus",
                current=" | ".join(f'"{h}"' for h in t.h1_texts),
                recommended="; ".join(fix_lines),
                evidence=", ".join(t.h1_texts),
                impact="Only the first H1 should define the main topic; others should be H2.",
            )
        )

    if t.images_missing_alt > 0:
        score -= min(18, t.images_missing_alt * 3)
        for i, detail in enumerate(t.images_missing_alt_details[:8]):
            fname = detail.get("filename", "image")
            src = detail.get("src", fname)
            alt = _alt_from_filename(fname, keyword)
            image_alts.append(ImageAltDetail(src=src, suggested_alt=alt))
        sections.critical.append(
            _finding(
                "alt-missing",
                "images",
                "critical",
                f"{t.images_missing_alt} images missing alt text",
                current="\n".join(d.src[:80] for d in image_alts[:4]),
                recommended="\n".join(f'{d.src.split("/")[-1][:40]} → alt="{d.suggested_alt}"' for d in image_alts[:4]),
                evidence="Filenames: " + ", ".join(d.src.split("/")[-1][:30] for d in image_alts[:4]),
                impact="Screen readers and Google Image Search cannot interpret these images.",
            )
        )

    for kw in c.top_keywords[:3]:
        density = kw["density_percent"]
        if density > 4.0:
            score -= 6
            sections.warning.append(
                _finding(
                    f"kw-stuff-{kw['word']}",
                    "keywords",
                    "warning",
                    f'Keyword "{kw["word"]}" density may look like stuffing ({density}%)',
                    current=f'{kw["count"]} occurrences, {density}% density',
                    recommended=f'Reduce "{kw["word"]}" usage toward 2–3% (~{int(c.word_count * 0.025)} words in {c.word_count} total)',
                    evidence=f'Top keyword in body: "{kw["word"]}"',
                    impact="Over-optimization can trigger quality filters.",
                )
            )
        elif 1.0 <= density <= 3.5:
            sections.good.append(
                _finding(
                    f"kw-ok-{kw['word']}",
                    "keywords",
                    "good",
                    f'Healthy keyword presence for "{kw["word"]}"',
                    current=f"{density}% density ({kw['count']} uses)",
                )
            )

    if c.readability_score < 40 and c.word_count > 100:
        score -= 5
        sections.bad.append(
            _finding(
                "readability-bad",
                "content",
                "bad",
                "Content is hard to read for general audiences",
                current=f"Flesch score {c.readability_score}, grade level {c.readability_grade}",
                recommended="Shorten sentences under 20 words; replace jargon with plain language.",
                evidence=c.content_snippet[:250] if c.content_snippet else None,
                impact=f"Grade {c.readability_grade} reading level may increase bounce rate.",
            )
        )

    if p.response_time_ms >= 1000:
        sev = "critical" if p.response_time_ms >= 2000 else "warning"
        score -= 10 if sev == "critical" else 5
        target = 500 if p.response_time_ms >= 1500 else 800
        f = _finding(
            "speed-slow",
            "performance",
            sev,
            "Server response time above recommended threshold",
            current=f"{p.response_time_ms:.0f} ms measured",
            recommended=f"Target under {target} ms (enable caching, CDN, compress assets)",
            impact="Slow TTFB hurts rankings and user experience.",
        )
        (sections.critical if sev == "critical" else sections.warning).append(f)

    if c.word_count < 300:
        score -= 8
        sections.bad.append(
            _finding(
                "thin-content",
                "content",
                "bad",
                "Thin content for competitive SEO",
                current=f"{c.word_count} words",
                recommended="Add 300–800 words covering user intent, FAQs, and service details.",
                evidence=c.content_snippet[:200] if c.content_snippet else None,
            )
        )

    if not t.canonical_tag:
        score -= 3
        sections.warning.append(
            _finding(
                "canonical-missing",
                "technical",
                "warning",
                "Canonical tag missing",
                current="(not found)",
                recommended=scan.url,
                impact="Risk of duplicate URL indexing if parameters or mirrors exist.",
            )
        )

    if len(t.open_graph) < 3:
        score -= 4
        sections.warning.append(
            _finding(
                "og-incomplete",
                "social",
                "warning",
                "Incomplete Open Graph tags",
                current=str(list(t.open_graph.keys())) if t.open_graph else "(none)",
                recommended=f'og:title="{suggested_title}", og:description="{suggested_meta[:120]}..."',
            )
        )

    score = max(0, min(100, score))

    headings_fix: list[str] = []
    if t.h1_count > 1:
        headings_fix = [f'Change "{h}" from H1 → H2' for h in t.h1_texts[1:4]]

    suggestions = AISuggestions(
        title=suggested_title,
        meta_description=suggested_meta,
        primary_keywords=keywords,
        h1_recommended=h1_primary if t.h1_count != 1 else t.h1_texts[0] if t.h1_texts else h1_primary,
        headings_fix=headings_fix,
        image_alt=image_alts,
    )

    critical_legacy = [f"{x.title}: {x.current}" for x in sections.critical]
    rec_legacy = []
    if suggestions.title:
        rec_legacy.append(f'Title: "{suggestions.title}"')
    if suggestions.meta_description:
        rec_legacy.append(f'Meta: "{suggestions.meta_description}"')
    for alt in image_alts[:5]:
        rec_legacy.append(f'Alt for {alt.src.split("/")[-1]}: "{alt.suggested_alt}"')
    for x in sections.warning + sections.bad:
        if x.recommended:
            rec_legacy.append(f"{x.title} → {x.recommended}")

    summary = (
        f"Score {score}/100 for {scan.url}. "
        f"{len(sections.critical)} critical, {len(sections.warning)} warnings, "
        f"{len(sections.best)} best practices detected."
    )

    intent_strategy = build_search_intent_strategy(scan)
    perf_ux = build_performance_ux_review(scan)

    return AIAnalysis(
        seo_score=score,
        summary=summary,
        sections=sections,
        suggestions=suggestions,
        search_intent_strategy=intent_strategy,
        performance_ux_review=perf_ux,
        critical_issues=critical_legacy,
        recommendations=rec_legacy,
    )


def normalize_ai_response(raw: dict, scan: ScanData) -> AIAnalysis:
    """Merge AI JSON with fallback gaps filled from scan evidence."""
    base = build_detailed_analysis(scan)

    if "sections" not in raw and ("critical_issues" in raw or "recommendations" in raw):
        return base.model_copy(
            update={
                "seo_score": raw.get("seo_score", base.seo_score),
                "summary": raw.get("summary", base.summary),
            }
        )

    try:
        parsed = AIAnalysis.model_validate(raw)
    except Exception:
        return base

    if not parsed.suggestions.title and base.suggestions.title:
        parsed.suggestions.title = base.suggestions.title
    if not parsed.suggestions.meta_description and base.suggestions.meta_description:
        parsed.suggestions.meta_description = base.suggestions.meta_description
    if not parsed.suggestions.image_alt and base.suggestions.image_alt:
        parsed.suggestions.image_alt = base.suggestions.image_alt
    if not parsed.suggestions.primary_keywords:
        parsed.suggestions.primary_keywords = base.suggestions.primary_keywords

    for attr in ("critical", "warning", "bad", "good", "best"):
        if not getattr(parsed.sections, attr):
            setattr(parsed.sections, attr, getattr(base.sections, attr))

    if not parsed.summary:
        parsed.summary = base.summary

    if not parsed.search_intent_strategy:
        parsed.search_intent_strategy = base.search_intent_strategy
    if not parsed.performance_ux_review:
        parsed.performance_ux_review = base.performance_ux_review

    return parsed
