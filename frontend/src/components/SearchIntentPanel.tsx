import { motion } from "framer-motion";
import { Target, Search } from "lucide-react";
import type { SearchIntentStrategy } from "../types";

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  commercial: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  transactional: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  navigational: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  mixed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const ROLE_COLORS: Record<string, string> = {
  primary: "text-brand-300",
  secondary: "text-gray-300",
  long_tail: "text-gray-500",
};

export default function SearchIntentPanel({ data }: { data: SearchIntentStrategy }) {
  const intentClass = INTENT_COLORS[data.primary_intent] ?? INTENT_COLORS.mixed;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 border border-white/10 mb-8"
    >
      <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2 text-white">
        <Target className="w-5 h-5 text-brand-400" />
        Search Intent & Keyword Strategy
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        How this page matches what users are searching for
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`px-4 py-1.5 rounded-full text-sm font-medium border capitalize ${intentClass}`}>
          {data.primary_intent} intent
        </span>
        <span className="text-xs text-gray-500">
          Confidence: <span className="text-gray-300">{data.intent_confidence}</span>
        </span>
        {data.page_topic && (
          <span className="text-xs text-gray-500 truncate max-w-md">
            Topic: <span className="text-gray-300">{data.page_topic}</span>
          </span>
        )}
      </div>

      {data.strategy_summary && (
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">{data.strategy_summary.replace(/\*\*/g, "")}</p>
      )}

      {data.intent_evidence.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            Intent evidence (from your page)
          </h3>
          <ul className="space-y-2">
            {data.intent_evidence.map((e, i) => (
              <li key={i} className="text-sm text-gray-300 pl-3 border-l-2 border-brand-500/40">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.keywords.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Keyword strategy</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/5">
                  <th className="pb-2 pr-4">Keyword</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Density</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.keywords.map((kw) => (
                  <tr key={kw.keyword} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-white">{kw.keyword}</td>
                    <td className={`py-3 pr-4 capitalize ${ROLE_COLORS[kw.role] ?? ""}`}>{kw.role}</td>
                    <td className="py-3 pr-4 text-gray-400">
                      {kw.density_percent != null ? `${kw.density_percent}%` : "—"}
                    </td>
                    <td className="py-3 text-gray-400 text-xs">{kw.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.content_gaps.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-amber-400/80 mb-3">Content gaps for this intent</h3>
          <ul className="space-y-2">
            {data.content_gaps.map((g, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-amber-400 shrink-0">→</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
