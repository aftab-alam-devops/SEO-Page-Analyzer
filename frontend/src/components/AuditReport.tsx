import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, ThumbsUp, Star, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { AIAnalysis, AuditSeverity, SEOFinding } from "../types";

const SECTION_CONFIG: Record<
  AuditSeverity,
  { label: string; icon: typeof AlertTriangle; border: string; bg: string; text: string; badge: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    text: "text-red-300",
    badge: "bg-red-500/20 text-red-200",
  },
  warning: {
    label: "Warning",
    icon: AlertCircle,
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    text: "text-amber-300",
    badge: "bg-amber-500/20 text-amber-200",
  },
  bad: {
    label: "Bad",
    icon: AlertCircle,
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    text: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-200",
  },
  good: {
    label: "Good",
    icon: ThumbsUp,
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-300",
    badge: "bg-emerald-500/20 text-emerald-200",
  },
  best: {
    label: "Best",
    icon: Star,
    border: "border-brand-500/40",
    bg: "bg-brand-500/5",
    text: "text-brand-300",
    badge: "bg-brand-500/20 text-brand-200",
  },
};

const ORDER: AuditSeverity[] = ["critical", "warning", "bad", "good", "best"];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FindingCard({ finding }: { finding: SEOFinding }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-800/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-white text-sm">{finding.title}</h4>
        {finding.category && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-500 shrink-0">
            {finding.category}
          </span>
        )}
      </div>
      {finding.current && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Current (on page)</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap break-words font-mono bg-black/20 rounded-lg p-3 border border-red-500/10">
            {finding.current}
          </p>
        </div>
      )}
      {finding.recommended && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-wider text-brand-400">Recommended fix</p>
            <CopyBtn text={finding.recommended} />
          </div>
          <p className="text-sm text-brand-100 whitespace-pre-wrap break-words font-mono bg-brand-500/10 rounded-lg p-3 border border-brand-500/20">
            {finding.recommended}
          </p>
        </div>
      )}
      {finding.evidence && (
        <p className="text-xs text-gray-500">
          <span className="text-gray-600">Evidence: </span>
          {finding.evidence}
        </p>
      )}
      {finding.impact && (
        <p className="text-xs text-gray-400 italic">{finding.impact}</p>
      )}
    </div>
  );
}

function SectionBlock({
  severity,
  findings,
}: {
  severity: AuditSeverity;
  findings: SEOFinding[];
}) {
  if (!findings.length) return null;
  const cfg = SECTION_CONFIG[severity];
  const Icon = cfg.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6`}
    >
      <div className="flex items-center gap-3 mb-5">
        <Icon className={`w-5 h-5 ${cfg.text}`} />
        <h2 className={`font-display font-semibold ${cfg.text}`}>{cfg.label}</h2>
        <span className={`text-xs px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
          {findings.length}
        </span>
      </div>
      <div className="space-y-3">
        {findings.map((f) => (
          <FindingCard key={f.id || f.title} finding={f} />
        ))}
      </div>
    </motion.section>
  );
}

export default function AuditReport({ ai }: { ai: AIAnalysis }) {
  const sections = ai.sections;
  const sug = ai.suggestions;
  const hasSections =
    sections &&
    ORDER.some((k) => (sections[k]?.length ?? 0) > 0);

  const counts = sections
    ? {
        critical: sections.critical?.length ?? 0,
        warning: sections.warning?.length ?? 0,
        bad: sections.bad?.length ?? 0,
        good: sections.good?.length ?? 0,
        best: sections.best?.length ?? 0,
      }
    : null;

  return (
    <div className="space-y-8 mb-8">
      {ai.summary && (
        <p className="text-gray-400 text-sm leading-relaxed border-l-2 border-brand-500/50 pl-4">
          {ai.summary}
        </p>
      )}

      {counts && (
        <div className="flex flex-wrap gap-2">
          {ORDER.map((k) =>
            counts[k] > 0 ? (
              <span
                key={k}
                className={`text-xs px-3 py-1 rounded-full ${SECTION_CONFIG[k].badge} border ${SECTION_CONFIG[k].border}`}
              >
                {SECTION_CONFIG[k].label}: {counts[k]}
              </span>
            ) : null
          )}
        </div>
      )}

      {sug && (sug.title || sug.meta_description || (sug.image_alt?.length ?? 0) > 0) && (
        <div className="glass rounded-2xl p-6 border border-brand-500/20">
          <h2 className="font-display font-semibold text-brand-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Ready-to-use suggestions
          </h2>
          <div className="space-y-4">
            {sug.title && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Suggested title</p>
                  <CopyBtn text={sug.title} />
                </div>
                <p className="text-sm font-mono text-white bg-black/30 rounded-lg p-3 border border-white/10">
                  {sug.title}
                </p>
              </div>
            )}
            {sug.meta_description && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500">Suggested meta description</p>
                  <CopyBtn text={sug.meta_description} />
                </div>
                <p className="text-sm font-mono text-white bg-black/30 rounded-lg p-3 border border-white/10">
                  {sug.meta_description}
                  <span className="block text-gray-500 mt-1 text-xs">
                    {sug.meta_description.length} characters
                  </span>
                </p>
              </div>
            )}
            {sug.primary_keywords && sug.primary_keywords.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Target keywords</p>
                <div className="flex flex-wrap gap-2">
                  {sug.primary_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1 rounded-full bg-brand-500/15 text-brand-200 text-sm border border-brand-500/25"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sug.h1_recommended && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Recommended H1</p>
                <p className="text-sm font-mono text-emerald-200 bg-emerald-500/10 rounded-lg p-3">
                  {sug.h1_recommended}
                </p>
              </div>
            )}
            {sug.headings_fix && sug.headings_fix.length > 0 && (
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                {sug.headings_fix.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
            {sug.image_alt && sug.image_alt.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Image alt text</p>
                <div className="space-y-2">
                  {sug.image_alt.map((img, i) => (
                    <div
                      key={i}
                      className="grid sm:grid-cols-2 gap-2 text-xs rounded-lg border border-white/5 p-3 bg-black/20"
                    >
                      <div className="text-gray-500 break-all">
                        <span className="text-gray-600 block mb-0.5">Image</span>
                        {img.src.split("/").pop() || img.src}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-brand-200 font-mono break-words">{img.suggested_alt}</p>
                        <CopyBtn text={img.suggested_alt} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {hasSections && sections && (
        <div className="space-y-6">
          {ORDER.map((sev) => (
            <SectionBlock key={sev} severity={sev} findings={sections[sev] ?? []} />
          ))}
        </div>
      )}

      {!hasSections && (ai.critical_issues?.length || ai.recommendations?.length) ? (
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400">
          {ai.critical_issues?.map((x, i) => (
            <p key={i}>• {x}</p>
          ))}
          {ai.recommendations?.map((x, i) => (
            <p key={i}>{i + 1}. {x}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
