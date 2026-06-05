import { motion } from "framer-motion";
import { ArrowRight, Globe, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startScan } from "../api";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleScan = async (e) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    setLoading(true);
    try {
      const { job_id } = await startScan(url.trim());
      navigate(`/scan/${job_id}`, { state: { url: url.trim() } });
    } catch (err) {
      setError(err.message || "Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-3xl text-center"
      >
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
          Analyze any page&apos;s{" "}
          <span className="gradient-text">SEO health</span>
        </h1>
        <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">
          Enter a URL to scan technical SEO, content quality, performance metrics,
          and get AI recommendations in seconds.
        </p>

        <form onSubmit={handleScan} className="w-full">
          <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-white">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Globe className="w-6 h-6 text-gray-400 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-transparent text-lg sm:text-xl py-4 outline-none placeholder:text-gray-500 text-white border-0"
                disabled={loading}
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-8 py-4 sm:py-5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 text-white font-semibold text-lg shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <>
                  Scan Page
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left">
          {[
            { icon: Zap, title: "Technical SEO", desc: "Title, meta, headings, links, OG tags" },
            { icon: Globe, title: "Intent & Keywords", desc: "Search intent, keyword strategy, gaps" },
            { icon: Sparkles, title: "Speed & UX", desc: "TTFB, page weight, mobile & readability" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <item.icon className="w-8 h-8 text-brand-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
