import re
import time
from collections import Counter
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.schemas import ContentSEO, PageSignals, PerformanceSEO, ScanData, TechnicalSEO

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "shall", "can", "this", "that", "these", "those", "it",
    "its", "they", "them", "their", "we", "our", "you", "your", "he", "she", "his",
    "her", "not", "no", "yes", "all", "any", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "than", "too", "very", "just", "also", "into",
    "about", "over", "after", "before", "between", "through", "during", "without",
    "within", "along", "following", "including", "until", "against", "among",
    "while", "when", "where", "which", "who", "whom", "what", "how", "why", "if",
    "then", "so", "up", "out", "off", "down", "only", "own", "same", "new", "old",
    "get", "got", "use", "used", "using", "make", "made", "like", "one", "two",
    "first", "last", "next", "back", "here", "there", "now", "still", "even",
    "well", "much", "many", "way", "may", "say", "said", "see", "know", "take",
    "come", "go", "want", "give", "find", "tell", "work", "call", "try", "ask",
    "need", "feel", "become", "leave", "put", "mean", "keep", "let", "begin",
    "seem", "help", "show", "play", "run", "move", "live", "believe", "hold",
    "bring", "happen", "write", "provide", "sit", "stand", "lose", "pay", "meet",
    "include", "continue", "set", "learn", "change", "lead", "understand", "watch",
    "follow", "stop", "create", "speak", "read", "allow", "add", "spend", "grow",
    "open", "walk", "win", "offer", "remember", "love", "consider", "appear",
    "buy", "wait", "serve", "die", "send", "expect", "build", "stay", "fall",
    "cut", "reach", "kill", "remain", "suggest", "raise", "pass", "sell", "require",
    "report", "decide", "pull", "www", "com", "http", "https", "html", "page",
}


def _filename_from_src(src: str) -> str:
    path = urlparse(src).path
    name = path.rsplit("/", 1)[-1] if path else ""
    return name[:80] if name else "image"


def _normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _extract_visible_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def _keyword_density(text: str, top_n: int = 10) -> tuple[dict[str, float], list[dict]]:
    words = re.findall(r"[a-zA-Z]{3,}", text.lower())
    words = [w for w in words if w not in STOP_WORDS]
    if not words:
        return {}, []
    total = len(words)
    counts = Counter(words)
    density = {w: round((c / total) * 100, 2) for w, c in counts.most_common(top_n)}
    top_keywords = [
        {"word": w, "count": c, "density_percent": round((c / total) * 100, 2)}
        for w, c in counts.most_common(top_n)
    ]
    return density, top_keywords


def _count_syllables(word: str) -> int:
    word = word.lower().strip()
    if len(word) <= 3:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def _flesch_reading_ease(text: str) -> float:
    sentences = max(1, len(re.split(r"[.!?]+", text)) - 1)
    words = text.split()
    if not words:
        return 0.0
    syllables = sum(_count_syllables(w) for w in words)
    asl = len(words) / sentences
    asw = syllables / len(words)
    return round(206.835 - 1.015 * asl - 84.6 * asw, 1)


def _flesch_kincaid_grade(text: str) -> float:
    sentences = max(1, len(re.split(r"[.!?]+", text)) - 1)
    words = text.split()
    if not words:
        return 0.0
    syllables = sum(_count_syllables(w) for w in words)
    return round(0.39 * (len(words) / sentences) + 11.8 * (syllables / len(words)) - 15.59, 1)


def _basic_grammar_checks(text: str) -> list[str]:
    issues: list[str] = []
    if len(text) < 100:
        issues.append("Content is very short — may hurt SEO rankings")
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    if sentences:
        long_sentences = [s for s in sentences if len(s.split()) > 35]
        if len(long_sentences) > len(sentences) * 0.3:
            issues.append(
                f"{len(long_sentences)} sentences are very long (>35 words) — consider shortening"
            )
    if re.search(r"\s{2,}", text):
        issues.append("Multiple consecutive spaces detected in content")
    if text.isupper() and len(text) > 50:
        issues.append("Large blocks of ALL CAPS text detected")
    doubled = re.findall(r"\b(\w+)\s+\1\b", text, re.IGNORECASE)
    if doubled:
        issues.append(f"Repeated words detected: {', '.join(set(doubled[:5]))}")
    return issues[:8]


async def scan_page(url: str) -> ScanData:
    url = _normalize_url(url)
    parsed_base = urlparse(url)
    base_domain = parsed_base.netloc

    start = time.perf_counter()
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=30.0,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; SEOPageAnalyzer/1.0; +https://seo-analyzer.local)"
            )
        },
    ) as client:
        response = await client.get(url)
    elapsed_ms = (time.perf_counter() - start) * 1000
    page_size_kb = len(response.content) / 1024

    soup = BeautifulSoup(response.text, "lxml")

    title_tag = soup.find("title")
    page_title = title_tag.get_text(strip=True) if title_tag else None

    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_description = meta_desc_tag.get("content", "").strip() if meta_desc_tag else None

    h1_tags = soup.find_all("h1")
    h2_tags = soup.find_all("h2")

    images = soup.find_all("img")
    missing_alt: list[str] = []
    missing_alt_details: list[dict[str, str]] = []
    for img in images:
        alt = img.get("alt")
        if alt is None or str(alt).strip() == "":
            src = urljoin(url, img.get("src", "") or "")
            src_short = src[:200]
            missing_alt.append(src_short)
            missing_alt_details.append({"src": src_short, "filename": _filename_from_src(src)})

    canonical_tag = soup.find("link", rel=lambda x: x and "canonical" in x.lower())
    canonical = canonical_tag.get("href") if canonical_tag else None

    og_tags: dict[str, str] = {}
    for meta in soup.find_all("meta", property=re.compile(r"^og:", re.I)):
        prop = meta.get("property", "")
        content = meta.get("content", "")
        if prop and content:
            og_tags[prop] = content

    robots_tag = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
    robots_meta = robots_tag.get("content") if robots_tag else None

    internal_links = 0
    external_links = 0
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
            continue
        full = urljoin(url, href)
        link_domain = urlparse(full).netloc
        if link_domain == base_domain or not link_domain:
            internal_links += 1
        else:
            external_links += 1

    visible_text = _extract_visible_text(soup)
    word_count = len(visible_text.split()) if visible_text else 0
    readability = _flesch_reading_ease(visible_text) if word_count > 50 else 0.0
    grade = _flesch_kincaid_grade(visible_text) if word_count > 50 else 0.0
    density, top_kw = _keyword_density(visible_text)
    grammar = _basic_grammar_checks(visible_text)

    technical = TechnicalSEO(
        page_title=page_title,
        title_length=len(page_title) if page_title else 0,
        meta_description=meta_description,
        meta_description_length=len(meta_description) if meta_description else 0,
        h1_count=len(h1_tags),
        h1_texts=[h.get_text(strip=True)[:120] for h in h1_tags[:5]],
        h2_count=len(h2_tags),
        h2_texts=[h.get_text(strip=True)[:120] for h in h2_tags[:8]],
        images_total=len(images),
        images_missing_alt=len(missing_alt),
        images_without_alt_urls=missing_alt[:10],
        images_missing_alt_details=missing_alt_details[:12],
        canonical_tag=canonical,
        open_graph=og_tags,
        robots_meta=robots_meta,
        internal_links=internal_links,
        external_links=external_links,
    )

    content = ContentSEO(
        word_count=word_count,
        readability_score=round(readability, 1),
        readability_grade=str(grade) if word_count > 50 else "N/A",
        keyword_density=density,
        top_keywords=top_kw,
        grammar_issues=grammar,
        content_snippet=visible_text[:600] if visible_text else "",
    )

    performance = PerformanceSEO(
        response_time_ms=round(elapsed_ms, 1),
        page_size_kb=round(page_size_kb, 2),
        status_code=response.status_code,
    )

    viewport = soup.find("meta", attrs={"name": re.compile(r"^viewport$", re.I)})
    html_tag = soup.find("html")
    cta_phrases: list[str] = []
    cta_words = ("contact", "get started", "sign up", "book", "buy", "quote", "free", "demo", "call")
    for a in soup.find_all("a", href=True)[:40]:
        text = a.get_text(strip=True).lower()
        if any(w in text for w in cta_words) and 2 < len(text) < 50:
            cta_phrases.append(a.get_text(strip=True)[:50])
    cta_phrases = list(dict.fromkeys(cta_phrases))[:6]

    signals = PageSignals(
        has_viewport=viewport is not None,
        html_lang=html_tag.get("lang") if html_tag else None,
        script_count=len(soup.find_all("script")),
        stylesheet_count=len(soup.find_all("link", rel=lambda x: x and "stylesheet" in str(x).lower())),
        form_count=len(soup.find_all("form")),
        cta_phrases=cta_phrases,
    )

    return ScanData(
        url=url,
        technical=technical,
        content=content,
        performance=performance,
        signals=signals,
    )
