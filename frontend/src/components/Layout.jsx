import { motion } from "framer-motion";
import { BarChart3, FileText, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              SEO<span className="text-brand-400">Analyzer</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" icon={<Search className="w-4 h-4" />} label="Scan" active={location.pathname === "/"} />
            <NavLink
              to="/reports"
              icon={<FileText className="w-4 h-4" />}
              label="Reports"
              active={location.pathname === "/reports"}
            />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/5 py-6 text-center text-sm text-gray-500">
        <BarChart3 className="w-4 h-4 inline mr-1 opacity-50" />
        Technical · Content · Performance · AI Insights
      </footer>
    </div>
  );
}

function NavLink({
  to,
  icon,
  label,
  active,
}) {
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "text-brand-300" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-brand-500/10 border border-brand-500/20 rounded-lg"
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {label}
      </span>
    </Link>
  );
}
