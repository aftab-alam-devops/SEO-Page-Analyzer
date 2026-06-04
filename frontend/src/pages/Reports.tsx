import { motion } from "framer-motion";
import { ArrowRight, Calendar, ExternalLink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReports } from "../api";
import type { ReportListItem } from "../types";

export default function Reports() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold mb-2">Saved Reports</h1>
        <p className="text-gray-500 mb-10">View and reopen your previous SEO scans</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-12 text-center"
        >
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">No reports yet. Run your first scan!</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition"
          >
            Start scanning
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      ) : (
        <ul className="space-y-4">
          {reports.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/results/${r.id}`}
                className="block glass rounded-xl p-5 hover:border-brand-500/30 border border-transparent transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate group-hover:text-brand-200 flex items-center gap-2">
                      {r.url}
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-50" />
                    </p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {r.seo_score != null && (
                      <div
                        className={`text-2xl font-bold font-display ${
                          r.seo_score >= 70
                            ? "text-emerald-400"
                            : r.seo_score >= 50
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {r.seo_score}
                      </div>
                    )}
                    <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-brand-400 transition" />
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
