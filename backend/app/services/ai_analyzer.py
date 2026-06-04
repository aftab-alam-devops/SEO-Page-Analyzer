import json
import re

import httpx

from app.config import settings
from app.schemas import AIAnalysis, ScanData
from app.services.report_builder import build_detailed_analysis, normalize_ai_response

AI_JSON_SCHEMA = """
{
  "seo_score": 78,
  "summary": "One sentence overview with score rationale",
  "sections": {
    "critical": [
      {
        "id": "unique-id",
        "category": "title|meta|headings|images|keywords|performance|content|links|social|technical",
        "severity": "critical",
        "title": "Short issue label",
        "current": "EXACT value from the page (quote title, meta, H1 text, image src, ms, keyword %)",
        "recommended": "EXACT replacement text or fix (full suggested title, meta, alt text, H2 change)",
        "evidence": "Quoted snippet from scan data proving the issue",
        "impact": "Why this hurts SEO/UX"
      }
    ],
    "warning": [],
    "bad": [],
    "good": [],
    "best": []
  },
  "suggestions": {
    "title": "Full suggested <title> tag text 50-60 chars using page keywords",
    "meta_description": "Full suggested meta description 120-160 chars with CTA",
    "primary_keywords": ["keyword1", "keyword2"],
    "h1_recommended": "Single H1 text to keep",
    "headings_fix": ["Change \\"Secondary H1\\" from H1 to H2"],
    "image_alt": [
      {"src": "/path/image.png", "suggested_alt": "Descriptive alt for that exact image"}
    ]
  },
  "search_intent_strategy": {
    "primary_intent": "commercial|informational|transactional|navigational|mixed",
    "intent_confidence": "high|medium|low",
    "intent_evidence": ["quoted signals from title/H1/CTAs/URL"],
    "page_topic": "main topic string",
    "keywords": [{"keyword": "shopify", "role": "primary", "density_percent": 5.8, "recommendation": "specific fix"}],
    "content_gaps": ["specific missing section for this intent"],
    "strategy_summary": "2-3 sentence intent-aligned strategy"
  },
  "performance_ux_review": {
    "overall_rating": "best|good|warning|bad|critical",
    "summary": "performance & UX summary with real ms and KB",
    "ux_checks": [{"check": "TTFB", "status": "warning", "current": "1127 ms", "recommended": "fix", "impact": "why"}]
  }
}
"""


def _build_prompt(scan: ScanData) -> str:
    data = scan.model_dump()
    return f"""You are a senior SEO auditor (Ahrefs-style). Analyze ONLY the scan data below.

RULES — violations make the response invalid:
1. NEVER give generic advice like "add a meta description" or "improve readability" without quoting what exists on the page.
2. Every finding in sections MUST include:
   - current: exact text/value from scan (title, meta, H1 list, image URLs, ms, keyword %)
   - recommended: concrete replacement (write the full new title, meta, each alt text)
3. Populate ALL five sections where applicable: critical, warning, bad, good, best
4. suggestions.title and suggestions.meta_description must be ready-to-paste HTML values tailored to this page's H1/keywords/domain
5. For each image in images_missing_alt_details, provide suggested_alt in suggestions.image_alt
6. If multiple H1s in h1_texts, headings_fix must name each extra H1 and say "Change \\"...\\" from H1 to H2"
7. For keyword density >4%, cite the word, %, and recommend specific reduction
8. Fill search_intent_strategy and performance_ux_review using signals.* and performance.* from scan data

Return ONLY valid JSON matching this structure (no markdown):
{AI_JSON_SCHEMA}

SEO Scan Data:
{json.dumps(data, indent=2)}
"""


async def analyze_with_gemini(scan: ScanData) -> AIAnalysis:
    base = build_detailed_analysis(scan)

    if not settings.openrouter_api_key:
        return base

    prompt = _build_prompt(scan)

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://seo-page-analyzer.local",
                    "X-Title": settings.app_name,
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.25,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            body = response.json()

        content = body["choices"][0]["message"]["content"]
        parsed = _parse_json_response(content)
        return normalize_ai_response(parsed, scan)
    except Exception:
        return base


def _parse_json_response(content: str) -> dict:
    content = content.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
    if fence:
        content = fence.group(1)
    return json.loads(content)
