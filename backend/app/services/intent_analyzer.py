"""Search intent detection and keyword strategy from on-page signals."""

import re
from urllib.parse import urlparse

from app.schemas import KeywordStrategyItem, ScanData, SearchIntentStrategy

COMMERCIAL_WORDS = {
    "buy", "price", "pricing", "order", "shop", "cart", "checkout", "sale",
    "discount", "quote", "hire", "book", "subscribe", "demo", "trial", "package",
    "cost", "affordable", "cheap", "free", "consultation", "contact",
}
TRANSACTIONAL_WORDS = {"checkout", "cart", "payment", "purchase", "signup", "register", "download"}
INFORMATIONAL_PATTERNS = [
    r"\bhow\b", r"\bwhat\b", r"\bwhy\b", r"\bwhen\b", r"\bwhere\b", r"\bguide\b",
    r"\btutorial\b", r"\blearn\b", r"\btips\b", r"\bblog\b", r"\bfaq\b",
]
NAV_PATHS = {"", "home", "index", "about", "contact", "login", "signin"}


def _text_blob(scan: ScanData) -> str:
    parts = [
        scan.technical.page_title or "",
        " ".join(scan.technical.h1_texts),
        " ".join(scan.technical.h2_texts[:6]),
        scan.technical.meta_description or "",
        scan.content.content_snippet,
        urlparse(scan.url).path,
    ]
    return " ".join(parts).lower()


def detect_search_intent(scan: ScanData) -> tuple[str, list[str], str]:
    """Returns (primary_intent, evidence_list, confidence)."""
    blob = _text_blob(scan)
    path = urlparse(scan.url).path.lower().strip("/")
    evidence: list[str] = []
    scores = {
        "informational": 0,
        "commercial": 0,
        "transactional": 0,
        "navigational": 0,
    }

    for w in COMMERCIAL_WORDS:
        if w in blob:
            scores["commercial"] += 1
            if len(evidence) < 6:
                evidence.append(f'Commercial signal: "{w}" in page copy or meta')

    for w in TRANSACTIONAL_WORDS:
        if w in blob:
            scores["transactional"] += 2
            evidence.append(f'Transactional signal: "{w}" detected')

    for pat in INFORMATIONAL_PATTERNS:
        if re.search(pat, blob):
            scores["informational"] += 1
            if len(evidence) < 8:
                evidence.append(f"Informational pattern matched in content ({pat[2:5] if len(pat) > 5 else 'query'})")

    if scan.signals.form_count > 0:
        scores["commercial"] += 2
        evidence.append(f"{scan.signals.form_count} form(s) on page (lead-gen / commercial)")

    if scan.signals.cta_phrases:
        scores["commercial"] += 1
        evidence.append(f'CTAs found: "{scan.signals.cta_phrases[0]}"' + (
            f' (+{len(scan.signals.cta_phrases) - 1} more)' if len(scan.signals.cta_phrases) > 1 else ""
        ))

    if path in NAV_PATHS or path.split("/")[0] in NAV_PATHS:
        scores["navigational"] += 2
        evidence.append(f"URL path /{path or ''} suggests brand/navigational landing")

    if scan.technical.h1_texts:
        h1 = scan.technical.h1_texts[0]
        if any(w in h1.lower() for w in ("services", "agency", "company", "solutions")):
            scores["commercial"] += 2
            evidence.append(f'H1 "{h1}" indicates commercial/service intent')

    top = max(scores, key=scores.get)
    max_score = scores[top]
    second = sorted(scores.values(), reverse=True)[1] if len(scores) > 1 else 0

    if max_score == 0:
        return "mixed", ["Insufficient signals — defaulting to mixed intent"], "low"

    if max_score - second <= 1 and second > 0:
        confidence = "medium"
        intent = "mixed"
        tied = [k for k, v in scores.items() if v >= max_score - 1 and v > 0]
        evidence.insert(0, f"Competing intents: {', '.join(tied)}")
    elif max_score >= 4:
        confidence = "high"
        intent = top
    else:
        confidence = "medium"
        intent = top

    return intent, evidence[:10], confidence


def build_keyword_strategy(scan: ScanData, primary_intent: str) -> list[KeywordStrategyItem]:
    items: list[KeywordStrategyItem] = []
    top = scan.content.top_keywords[:8]

    for i, kw in enumerate(top):
        word = kw["word"]
        density = kw["density_percent"]
        if i == 0:
            role = "primary"
            if density > 4:
                rec = (
                    f'Primary keyword "{word}" at {density}% — reduce to 2–3% by using synonyms '
                    f'({_synonyms(word)[:3]}) in H2s and body'
                )
            elif density < 0.8:
                rec = f'Increase "{word}" naturally in H1, first paragraph, and one H2'
            else:
                rec = f'Keep "{word}" as primary — density {density}% is in a healthy range'
        elif i < 4:
            role = "secondary"
            rec = f'Use "{word}" in subheadings and supporting paragraphs ({density}% now)'
        else:
            role = "long_tail"
            rec = f'Optional long-tail: build a FAQ or section targeting "{word}"'

        items.append(
            KeywordStrategyItem(
                keyword=word,
                role=role,
                density_percent=density,
                count=kw.get("count"),
                recommendation=rec,
            )
        )

    if not items and scan.technical.h1_texts:
        h1_kw = scan.technical.h1_texts[0].split()[0] if scan.technical.h1_texts[0] else "topic"
        items.append(
            KeywordStrategyItem(
                keyword=h1_kw.lower(),
                role="primary",
                recommendation=f'Establish "{h1_kw}" as primary keyword in title, H1, and meta',
            )
        )

    return items


def _synonyms(word: str) -> list[str]:
    generic = {
        "shopify": ["ecommerce", "online store", "Shopify development"],
        "seo": ["search optimization", "organic traffic", "rankings"],
        "web": ["website", "digital", "online"],
    }
    return generic.get(word.lower(), [f"{word} services", f"professional {word}", f"{word} expert"])


def build_content_gaps(scan: ScanData, intent: str) -> list[str]:
    gaps: list[str] = []
    blob = _text_blob(scan)

    if intent in ("informational", "mixed") and not re.search(r"\bfaq\b|frequently asked", blob):
        gaps.append("Add an FAQ section targeting question-based queries (People Also Ask)")

    if intent in ("commercial", "transactional", "mixed"):
        if "testimonial" not in blob and "review" not in blob:
            gaps.append("Add social proof (reviews, case studies) for commercial intent pages")
        if scan.signals.form_count == 0 and "contact" not in blob:
            gaps.append("Add a clear CTA form or contact block for conversion intent")

    if scan.content.word_count < 500 and intent == "informational":
        gaps.append(
            f"Informational intent needs depth — expand from {scan.content.word_count} to 800+ words"
        )

    if not scan.technical.h2_texts and scan.content.word_count > 200:
        gaps.append("Add H2 subtopics mapping to secondary keywords and search sub-intents")

    if scan.technical.meta_description and scan.content.top_keywords:
        pk = scan.content.top_keywords[0]["word"]
        if pk not in (scan.technical.meta_description or "").lower():
            gaps.append(f'Include primary keyword "{pk}" in meta description for SERP relevance')

    return gaps[:6]


def build_search_intent_strategy(scan: ScanData) -> SearchIntentStrategy:
    intent, evidence, confidence = detect_search_intent(scan)
    topic = scan.technical.h1_texts[0] if scan.technical.h1_texts else (
        scan.technical.page_title or urlparse(scan.url).path
    )
    keywords = build_keyword_strategy(scan, intent)
    gaps = build_content_gaps(scan, intent)

    intent_labels = {
        "informational": "users seeking answers, guides, or education",
        "commercial": "users comparing services or solutions before buying",
        "transactional": "users ready to purchase, sign up, or convert",
        "navigational": "users looking for a specific brand or homepage",
        "mixed": "multiple user goals on this page",
    }

    summary = (
        f"Detected **{intent}** search intent ({confidence} confidence). "
        f"Page topic: \"{topic[:80]}\". "
        f"Primary keyword: \"{keywords[0].keyword if keywords else 'n/a'}\". "
        f"{len(gaps)} content gap(s) identified for intent alignment."
    )

    return SearchIntentStrategy(
        primary_intent=intent,
        intent_confidence=confidence,
        intent_evidence=evidence,
        page_topic=topic[:200],
        keywords=keywords,
        content_gaps=gaps,
        strategy_summary=summary,
    )
