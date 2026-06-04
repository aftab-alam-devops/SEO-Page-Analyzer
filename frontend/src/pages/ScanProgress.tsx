import { motion, useSpring } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getScanProgress } from "../api";
import {
  CylinderProgressBar,
  Ring3D,
  RollingMessage3D,
  Scene3DBackground,
  StepCard3D,
} from "../components/Progress3D";
import type { ScanProgress as ScanProgressType } from "../types";

const ROLLING_MESSAGES = [
  "Connecting to target server...",
  "Parsing HTML structure...",
  "Extracting meta tags and headings...",
  "Counting internal and external links...",
  "Analyzing image alt attributes...",
  "Detecting search intent & keywords...",
  "Computing readability metrics...",
  "Measuring response time and page weight...",
  "Running performance & UX review...",
  "Sending data to Gemini for AI insights...",
  "Generating your SEO report...",
];

const STEP_MESSAGES: Record<string, number> = {
  fetch: 0,
  technical: 2,
  content: 5,
  performance: 7,
  ai: 9,
  save: 10,
};

export default function ScanProgressPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ScanProgressType | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const pct = progress?.progress ?? 0;
  const url = progress?.url ?? "";
  const isComplete = progress?.status === "completed";
  const isFailed = progress?.status === "failed";

  const smoothPct = useSpring(pct, { stiffness: 35, damping: 18 });
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    smoothPct.set(pct);
  }, [pct, smoothPct]);

  useEffect(() => {
    const unsub = smoothPct.on("change", (v) => setDisplayPct(Math.round(v)));
    return unsub;
  }, [smoothPct]);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const data = await getScanProgress(jobId);
        setProgress(data);
        if (data.current_step && STEP_MESSAGES[data.current_step] !== undefined) {
          setMessageIndex(STEP_MESSAGES[data.current_step]);
        }
        if (data.status === "completed" && data.report_id) {
          setTimeout(() => navigate(`/results/${data.report_id}`), 1600);
        }
      } catch {
        /* retry */
      }
    };
    poll();
    const interval = setInterval(poll, 800);
    return () => clearInterval(interval);
  }, [jobId, navigate]);

  useEffect(() => {
    if (progress?.current_step) return;
    const t = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ROLLING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(t);
  }, [progress?.current_step]);

  const activeMessage = useMemo(() => {
    const running = progress?.steps?.find((s) => s.status === "running");
    if (running?.detail) return running.detail;
    if (running?.label) return running.label + "...";
    return ROLLING_MESSAGES[messageIndex];
  }, [progress?.steps, messageIndex]);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <Scene3DBackground />

      <motion.div
        initial={{ opacity: 0, z: -40 }}
        animate={{ opacity: 1, z: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl"
        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      >
        <div className="text-center mb-8">
          <motion.h1
            className="font-display text-3xl sm:text-4xl font-bold mb-2"
            animate={isComplete ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.6 }}
          >
            {isComplete ? (
              <span className="gradient-text">Scan complete</span>
            ) : (
              "Scanning your page"
            )}
          </motion.h1>
          <p className="text-gray-500 truncate max-w-md mx-auto text-sm px-4">{url}</p>
        </div>

        {/* 3D ring + rolling odometer */}
        <motion.div
          className="mb-10"
          animate={
            isComplete
              ? { rotateX: [0, 8, 0], scale: [1, 1.05, 1] }
              : { rotateX: [0, 4, 0, -4, 0] }
          }
          transition={
            isComplete
              ? { duration: 0.8 }
              : { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          <Ring3D progress={displayPct} />
        </motion.div>

        {/* Cylindrical segment bar */}
        <div className="glass rounded-2xl p-6 sm:p-8 mb-8 border border-white/10">
          <CylinderProgressBar progress={displayPct} />

          <div className="mt-8">
            <RollingMessage3D message={activeMessage} />
          </div>

          {isComplete && (
            <motion.p
              initial={{ opacity: 0, rotateX: -30 }}
              animate={{ opacity: 1, rotateX: 0 }}
              className="text-center mt-6 text-emerald-400 text-sm font-medium"
            >
              Opening your report...
            </motion.p>
          )}
        </div>

        {/* 3D step cards */}
        <ul className="space-y-3" style={{ perspective: "800px" }}>
          {(progress?.steps ?? []).map((step, i) => (
            <StepCard3D
              key={step.id}
              label={step.label}
              detail={step.detail}
              status={step.status}
              index={i}
            />
          ))}
        </ul>

        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center"
          >
            {progress?.error || "Scan failed. Please try again."}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
