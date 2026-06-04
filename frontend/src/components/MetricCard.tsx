import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export default function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  status,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  status?: "good" | "warn" | "bad";
}) {
  const border =
    status === "good"
      ? "border-emerald-500/20"
      : status === "warn"
        ? "border-amber-500/20"
        : status === "bad"
          ? "border-red-500/20"
          : "border-white/10";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`glass rounded-xl p-4 border ${border}`}
    >
      <Icon className="w-5 h-5 text-brand-400 mb-2" />
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-white mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </motion.div>
  );
}
