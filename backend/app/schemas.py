from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)


class ScanStartResponse(BaseModel):
    job_id: str
    message: str = "Scan started"


class ScanStep(BaseModel):
    id: str
    label: str
    status: str  # pending | running | done | error
    detail: str | None = None


class ScanProgressResponse(BaseModel):
    job_id: str
    url: str
    status: str  # pending | running | completed | failed
    progress: int
    current_step: str | None = None
    steps: list[ScanStep]
    report_id: int | None = None
    error: str | None = None


class ImageAltDetail(BaseModel):
    src: str = ""
    suggested_alt: str = ""


class SEOFinding(BaseModel):
    id: str = ""
    category: str = ""
    severity: str = ""  # critical | warning | bad | good | best
    title: str = ""
    current: str | None = None
    recommended: str | None = None
    evidence: str | None = None
    impact: str | None = None


class AISuggestions(BaseModel):
    title: str | None = None
    meta_description: str | None = None
    primary_keywords: list[str] = Field(default_factory=list)
    h1_recommended: str | None = None
    headings_fix: list[str] = Field(default_factory=list)
    image_alt: list[ImageAltDetail] = Field(default_factory=list)


class AuditSections(BaseModel):
    critical: list[SEOFinding] = Field(default_factory=list)
    warning: list[SEOFinding] = Field(default_factory=list)
    bad: list[SEOFinding] = Field(default_factory=list)
    good: list[SEOFinding] = Field(default_factory=list)
    best: list[SEOFinding] = Field(default_factory=list)


class KeywordStrategyItem(BaseModel):
    keyword: str
    role: str = ""  # primary | secondary | long_tail | gap
    density_percent: float | None = None
    count: int | None = None
    recommendation: str | None = None


class SearchIntentStrategy(BaseModel):
    primary_intent: str = "mixed"
    intent_confidence: str = "medium"
    intent_evidence: list[str] = Field(default_factory=list)
    page_topic: str = ""
    keywords: list[KeywordStrategyItem] = Field(default_factory=list)
    content_gaps: list[str] = Field(default_factory=list)
    strategy_summary: str = ""


class PerformanceUXCheck(BaseModel):
    check: str
    status: str = "good"  # best | good | warning | bad | critical
    current: str = ""
    recommended: str | None = None
    impact: str | None = None


class PerformanceUXReview(BaseModel):
    overall_rating: str = "good"
    response_time_ms: float = 0.0
    response_rating: str = ""
    page_size_kb: float = 0.0
    page_size_rating: str = ""
    status_code: int = 200
    ux_checks: list[PerformanceUXCheck] = Field(default_factory=list)
    summary: str = ""


class PageSignals(BaseModel):
    has_viewport: bool = False
    html_lang: str | None = None
    script_count: int = 0
    stylesheet_count: int = 0
    form_count: int = 0
    cta_phrases: list[str] = Field(default_factory=list)


class AIAnalysis(BaseModel):
    seo_score: int
    summary: str = ""
    sections: AuditSections = Field(default_factory=AuditSections)
    suggestions: AISuggestions = Field(default_factory=AISuggestions)
    search_intent_strategy: SearchIntentStrategy | None = None
    performance_ux_review: PerformanceUXReview | None = None
    critical_issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class TechnicalSEO(BaseModel):
    page_title: str | None = None
    title_length: int = 0
    meta_description: str | None = None
    meta_description_length: int = 0
    h1_count: int = 0
    h1_texts: list[str] = []
    h2_count: int = 0
    h2_texts: list[str] = []
    images_total: int = 0
    images_missing_alt: int = 0
    images_without_alt_urls: list[str] = []
    images_missing_alt_details: list[dict[str, str]] = Field(default_factory=list)
    canonical_tag: str | None = None
    open_graph: dict[str, str] = {}
    robots_meta: str | None = None
    internal_links: int = 0
    external_links: int = 0


class ContentSEO(BaseModel):
    word_count: int = 0
    readability_score: float = 0.0
    readability_grade: str = ""
    keyword_density: dict[str, float] = {}
    top_keywords: list[dict[str, Any]] = []
    grammar_issues: list[str] = []
    content_snippet: str = ""


class PerformanceSEO(BaseModel):
    response_time_ms: float = 0.0
    page_size_kb: float = 0.0
    status_code: int = 0


class ScanData(BaseModel):
    url: str
    technical: TechnicalSEO
    content: ContentSEO
    performance: PerformanceSEO
    signals: PageSignals = Field(default_factory=PageSignals)


class ReportResponse(BaseModel):
    id: int
    job_id: str
    url: str
    status: str
    seo_score: int | None
    scan_data: dict[str, Any] | None
    ai_analysis: AIAnalysis | None
    response_time_ms: float | None
    page_size_kb: float | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class ReportListItem(BaseModel):
    id: int
    job_id: str
    url: str
    status: str
    seo_score: int | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
