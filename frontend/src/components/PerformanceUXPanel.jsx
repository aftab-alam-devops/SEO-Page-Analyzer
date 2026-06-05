import { motion } from "framer-motion";
import { Gauge, Zap } from "lucide-react";

const STATUS_STYLES = {
  best: { dot: "bg-brand-400", text: "text-brand-300" },
  good: { dot: "bg-emerald-400", text: "text-emerald-300" },
  warning: { dot: "bg-amber-400", text: "text-amber-300" },
  bad: { dot: "bg-orange-400", text: "text-orange-300" },
  critical: { dot: "bg-red-400", text: "text-red-300" },
};

export default function PerformanceUXPanel({ data }) {
  const overall = STATUS_STYLES[data.overall_rating] ?? STATUS_STYLES.good;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 border border-white/10 mb-8"
    >
      <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2 text-white">
        <Gauge className="w-5 h-5 text-brand-400" />
        Performance, Speed & UX Review
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Measurable speed signals and on-page UX checks
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-black/30 border border-white/5 p-4">
          <p className="text-xs text-gray-500 mb-1">Overall</p>
          <p className={`text-lg font-semibold capitalize flex items-center gap-2 ${overall.text}`}>
            <span className={`w-2 h-2 rounded-full ${overall.dot}`} />
            {data.overall_rating}
          </p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Response time
          </p>
          <p className="text-lg font-semibold text-white">{data.response_time_ms.toFixed(0)} ms</p>
          <p className={`text-xs capitalize ${STATUS_STYLES[data.response_rating]?.text ?? ""}`}>
            {data.response_rating}
          </p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 p-4">
          <p className="text-xs text-gray-500 mb-1">Page size</p>
          <p className="text-lg font-semibold text-white">{data.page_size_kb.toFixed(1)} KB</p>
          <p className={`text-xs capitalize ${STATUS_STYLES[data.page_size_rating]?.text ?? ""}`}>
            {data.page_size_rating}
          </p>
        </div>
      </div>

      {data.summary && (
        <p className="text-sm text-gray-400 mb-6">{data.summary.replace(/\*\*/g, "")}</p>
      )}

      <div className="space-y-3">
        {data.ux_checks.map((check) => {
          const st = STATUS_STYLES[check.status] ?? STATUS_STYLES.good;
          return (
            <div
              key={check.check}
              className="rounded-xl border border-white/5 bg-surface-800/50 p-4 grid sm:grid-cols-[1fr_auto] gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                  <span className="font-medium text-sm text-white">{check.check}</span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${st.text} bg-white/5`}>
                    {check.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Current: <span className="text-gray-300 font-mono">{check.current}</span>
                </p>
                {check.recommended && (
                  <p className="text-xs text-brand-300/90 mt-1">
                    Fix: {check.recommended}
                  </p>
                )}
                {check.impact && (
                  <p className="text-xs text-gray-500 mt-1 italic">{check.impact}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
