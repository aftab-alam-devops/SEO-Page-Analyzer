export interface ScanStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string | null;
}

export interface ScanProgress {
  job_id: string;
  url: string;
  status: string;
  progress: number;
  current_step: string | null;
  steps: ScanStep[];
  report_id: number | null;
  error: string | null;
}

export type AuditSeverity = "critical" | "warning" | "bad" | "good" | "best";

export interface SEOFinding {
  id: string;
  category: string;
  severity: AuditSeverity;
  title: string;
  current?: string | null;
  recommended?: string | null;
  evidence?: string | null;
  impact?: string | null;
}

export interface ImageAltDetail {
  src: string;
  suggested_alt: string;
}

export interface AISuggestions {
  title?: string | null;
  meta_description?: string | null;
  primary_keywords?: string[];
  h1_recommended?: string | null;
  headings_fix?: string[];
  image_alt?: ImageAltDetail[];
}

export interface AuditSections {
  critical: SEOFinding[];
  warning: SEOFinding[];
  bad: SEOFinding[];
  good: SEOFinding[];
  best: SEOFinding[];
}

export interface KeywordStrategyItem {
  keyword: string;
  role: string;
  density_percent?: number | null;
  count?: number | null;
  recommendation?: string | null;
}

export interface SearchIntentStrategy {
  primary_intent: string;
  intent_confidence: string;
  intent_evidence: string[];
  page_topic: string;
  keywords: KeywordStrategyItem[];
  content_gaps: string[];
  strategy_summary: string;
}

export interface PerformanceUXCheck {
  check: string;
  status: string;
  current: string;
  recommended?: string | null;
  impact?: string | null;
}

export interface PerformanceUXReview {
  overall_rating: string;
  response_time_ms: number;
  response_rating: string;
  page_size_kb: number;
  page_size_rating: string;
  status_code: number;
  ux_checks: PerformanceUXCheck[];
  summary: string;
}

export interface PageSignals {
  has_viewport: boolean;
  html_lang?: string | null;
  script_count: number;
  stylesheet_count: number;
  form_count: number;
  cta_phrases: string[];
}

export interface AIAnalysis {
  seo_score: number;
  summary?: string;
  sections?: AuditSections;
  suggestions?: AISuggestions;
  search_intent_strategy?: SearchIntentStrategy | null;
  performance_ux_review?: PerformanceUXReview | null;
  critical_issues?: string[];
  recommendations?: string[];
}

export interface Report {
  id: number;
  job_id: string;
  url: string;
  status: string;
  seo_score: number | null;
  scan_data: ScanData | null;
  ai_analysis: AIAnalysis | null;
  response_time_ms: number | null;
  page_size_kb: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScanData {
  url: string;
  technical: TechnicalSEO;
  content: ContentSEO;
  performance: PerformanceSEO;
  signals?: PageSignals;
}

export interface TechnicalSEO {
  page_title: string | null;
  title_length: number;
  meta_description: string | null;
  meta_description_length: number;
  h1_count: number;
  h1_texts: string[];
  h2_count: number;
  h2_texts?: string[];
  images_total: number;
  images_missing_alt: number;
  images_without_alt_urls: string[];
  images_missing_alt_details?: { src: string; filename: string }[];
  canonical_tag: string | null;
  open_graph: Record<string, string>;
  robots_meta: string | null;
  internal_links: number;
  external_links: number;
}

export interface ContentSEO {
  word_count: number;
  readability_score: number;
  readability_grade: string;
  keyword_density: Record<string, number>;
  top_keywords: { word: string; count: number; density_percent: number }[];
  grammar_issues: string[];
  content_snippet?: string;
}

export interface PerformanceSEO {
  response_time_ms: number;
  page_size_kb: number;
  status_code: number;
}

export interface ReportListItem {
  id: number;
  job_id: string;
  url: string;
  status: string;
  seo_score: number | null;
  created_at: string;
  completed_at: string | null;
}
