import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Heading1,
  Image,
  Link2,
  Timer,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getReport } from "../api";
import AuditReport from "../components/AuditReport";
import MetricCard from "../components/MetricCard";
import PerformanceUXPanel from "../components/PerformanceUXPanel";
import SearchIntentPanel from "../components/SearchIntentPanel";
import ScoreRing from "../components/ScoreRing";

const CHART_COLORS = ["#14b8a6", "#2dd4bf", "#5eead4", "#0d9488", "#0f766e", "#115e59"];

export default function Results() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reportId) return;
    getReport(Number(reportId))
      .then(setReport)
      .catch(() => setError("Could not load report"))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report || !report.scan_data) {
    return (
      <div className="text-center py-20 text-gray-400">
        {error || "Report not found"}
        <Link to="/" className="block mt-4 text-brand-400 hover:underline">
          Back to scan
        </Link>
      </div>
    );
  }

  const { technical: t, content: c, performance: p } = report.scan_data;
  const ai = report.ai_analysis;
  const score = ai?.seo_score ?? report.seo_score ?? 0;

  const linkData = [
    { name: "Internal", value: t.internal_links },
    { name: "External", value: t.external_links },
  ].filter((d) => d.value > 0);

  const keywordData = (c.top_keywords ?? []).slice(0, 8).map((k) => ({
    word: k.word,
    density: k.density_percent,
  }));

  const perfData = [
    { metric: "Response (ms)", value: p.response_time_ms },
    { metric: "Size (KB)", value: p.page_size_kb },
    { metric: "Words", value: c.word_count / 10 },
    { metric: "Readability", value: c.readability_score },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-300 text-sm mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        New scan
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 mb-8"
      >
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <ScoreRing score={score} />
          <div className="flex-1 text-center lg:text-left">
            <a
              href={report.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-300 hover:text-brand-200 text-lg font-medium break-all"
            >
              {report.url}
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
            <p className="text-gray-500 text-sm mt-2">
              Scanned {new Date(report.created_at).toLocaleString()}
            </p>
            {ai && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                {(ai.sections?.critical?.length ?? ai.critical_issues?.length ?? 0) > 0 && (
                  <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-300 text-xs border border-red-500/20">
                    {ai.sections?.critical?.length ?? ai.critical_issues?.length} critical
                  </span>
                )}
                {(ai.sections?.warning?.length ?? 0) > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs border border-amber-500/20">
                    {ai.sections?.warning?.length} warning
                  </span>
                )}
                {(ai.sections?.best?.length ?? 0) > 0 && (
                  <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-xs border border-brand-500/20">
                    {ai.sections?.best?.length} best
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {ai?.search_intent_strategy && (
        <SearchIntentPanel data={ai.search_intent_strategy} />
      )}

      {ai?.performance_ux_review && (
        <PerformanceUXPanel data={ai.performance_ux_review} />
      )}

      {ai && (
        <>
          <h2 className="font-display text-xl font-semibold mb-4">SEO Audit Report</h2>
          <AuditReport ai={ai} />
        </>
      )}

      <h2 className="font-display text-xl font-semibold mb-4">Technical SEO</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Type}
          label="Page Title"
          value={t.page_title ? `${t.title_length} chars` : "Missing"}
          sub={t.page_title?.slice(0, 40) ?? undefined}
          status={t.page_title ? (t.title_length >= 30 && t.title_length <= 60 ? "good" : "warn") : "bad"}
        />
        <MetricCard
          icon={FileText}
          label="Meta Description"
          value={t.meta_description ? `${t.meta_description_length} chars` : "Missing"}
          sub={t.meta_description?.slice(0, 50) ?? undefined}
          status={t.meta_description ? "good" : "bad"}
        />
        <MetricCard
          icon={Heading1}
          label="H1 / H2"
          value={`${t.h1_count} / ${t.h2_count}`}
          sub={t.h1_texts?.[0]?.slice(0, 35) ?? undefined}
          status={t.h1_count === 1 ? "good" : t.h1_count === 0 ? "bad" : "warn"}
        />
        <MetricCard
          icon={Image}
          label="Images (no alt)"
          value={`${t.images_missing_alt} / ${t.images_total}`}
          status={t.images_missing_alt === 0 ? "good" : "bad"}
        />
        <MetricCard icon={Link2} label="Internal Links" value={t.internal_links} />
        <MetricCard icon={ExternalLink} label="External Links" value={t.external_links} />
        <MetricCard
          icon={FileText}
          label="Canonical"
          value={t.canonical_tag ? "Present" : "Missing"}
          status={t.canonical_tag ? "good" : "warn"}
        />
        <MetricCard
          icon={FileText}
          label="OG Tags"
          value={Object.keys(t.open_graph).length}
          status={Object.keys(t.open_graph).length >= 3 ? "good" : "warn"}
        />
      </div>

      <h2 className="font-display text-xl font-semibold mb-4">Content & Performance</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Type} label="Word Count" value={c.word_count} status={c.word_count >= 300 ? "good" : "warn"} />
        <MetricCard icon={FileText} label="Readability" value={c.readability_score} sub={`Grade ${c.readability_grade}`} />
        <MetricCard icon={Timer} label="Response Time" value={`${p.response_time_ms.toFixed(0)} ms`} status={p.response_time_ms < 2000 ? "good" : "warn"} />
        <MetricCard icon={FileText} label="Page Size" value={`${p.page_size_kb.toFixed(1)} KB`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {linkData.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-gray-300">Link Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={linkData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {linkData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {keywordData.length > 0 && (
          <div className="glass rounded-2xl p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4 text-gray-300">Top Keyword Density (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={keywordData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis type="category" dataKey="word" stroke="#6b7280" fontSize={12} width={55} />
                <Tooltip
                  contentStyle={{ background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <Bar dataKey="density" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 mb-8">
        <h3 className="font-semibold mb-4 text-gray-300">Performance Overview</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={perfData}>
            <XAxis dataKey="metric" stroke="#6b7280" fontSize={11} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <Bar dataKey="value" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(c.grammar_issues?.length ?? 0) > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3 text-gray-300">Content Notes</h3>
          <ul className="space-y-1 text-sm text-gray-400">
            {c.grammar_issues.map((g, i) => (
              <li key={i}>• {g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
