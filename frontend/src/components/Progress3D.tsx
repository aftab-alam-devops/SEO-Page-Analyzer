import { AnimatePresence, motion } from "framer-motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LINE_H = 1.15;

export function RollingDigit({ value }: { value: number }) {
  const digit = Math.min(9, Math.max(0, value));
  return (
    <div className="relative h-[1.15em] w-[0.7em] overflow-hidden">
      <motion.div
        className="flex flex-col"
        animate={{ y: `-${digit * LINE_H}em` }}
        transition={{ type: "spring", stiffness: 100, damping: 16, mass: 0.9 }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="block h-[1.15em] leading-[1.15em] text-center font-display font-bold tabular-nums text-white"
          >
            {d}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function ProgressOdometer({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const chars = String(clamped).padStart(3, "0").split("");

  return (
    <div
      className="flex items-baseline justify-center gap-0.5 text-5xl sm:text-6xl"
      style={{ perspective: "500px", transformStyle: "preserve-3d" }}
    >
      {chars.map((c, i) => (
        <motion.div
          key={i}
          style={{
            transform: `rotateY(${-12 + i * 12}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <RollingDigit value={parseInt(c, 10)} />
        </motion.div>
      ))}
      <motion.span
        className="text-2xl sm:text-3xl text-brand-400 font-display ml-0.5 self-end mb-1"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        %
      </motion.span>
    </div>
  );
}

export function Ring3D({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative w-52 h-52 sm:w-60 sm:h-60 mx-auto"
      style={{ perspective: "900px" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ rotateX: 62, transformStyle: "preserve-3d" }}
        animate={{ rotateZ: [0, 360] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-4 rounded-full blur-3xl bg-teal-500/20"
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
          <motion.circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="url(#ringGrad3d)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: "spring", stiffness: 55, damping: 14 }}
          />
          <defs>
            <linearGradient id="ringGrad3d" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center">
        <ProgressOdometer value={progress} />
      </div>
    </div>
  );
}

export function RollingMessage3D({ message }: { message: string }) {
  return (
    <div className="h-14 overflow-hidden relative" style={{ perspective: "600px" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={message}
          initial={{ rotateX: -75, opacity: 0, z: -80 }}
          animate={{ rotateX: 0, opacity: 1, z: 0 }}
          exit={{ rotateX: 75, opacity: 0, z: 80 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center origin-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          <p className="text-gray-200 text-sm sm:text-base text-center px-6 font-medium">{message}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function CylinderProgressBar({ progress }: { progress: number }) {
  const segments = 24;
  return (
    <div className="flex gap-0.5 sm:gap-1 justify-center items-end h-10" style={{ perspective: "350px" }}>
      {Array.from({ length: segments }).map((_, i) => {
        const fill = (progress / 100) * segments;
        const active = i < fill;
        const partial = i < fill && i + 1 > fill;
        return (
          <motion.div
            key={i}
            className="w-1.5 sm:w-2 rounded-sm"
            style={{
              background: active
                ? "linear-gradient(to top, #0d9488, #5eead4)"
                : "rgba(255,255,255,0.06)",
              transformOrigin: "bottom center",
            }}
            animate={{
              height: active ? (partial ? 22 : 36) : 10,
              rotateX: active ? (partial ? -35 : 0) : 55,
              opacity: active ? 1 : 0.25,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 20, delay: i * 0.015 }}
          />
        );
      })}
    </div>
  );
}

export function StepCard3D({
  label,
  detail,
  status,
  index,
}: {
  label: string;
  detail?: string | null;
  status: string;
  index: number;
}) {
  const isDone = status === "done";
  const isRunning = status === "running";
  const isError = status === "error";

  return (
    <motion.li
      initial={{ opacity: 0, rotateX: -20, y: 20 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
      style={{ perspective: "700px" }}
    >
      <motion.div
        animate={{
          rotateY: isRunning ? [0, 3, -3, 0] : 0,
          scale: isRunning ? 1.015 : 1,
        }}
        transition={
          isRunning ? { rotateY: { duration: 2.5, repeat: Infinity }, scale: { duration: 0.3 } } : {}
        }
        className={`flex items-start gap-4 p-4 rounded-xl border ${
          isRunning
            ? "glass border-brand-500/50 shadow-[0_0_40px_rgba(20,184,166,0.12)]"
            : isDone
              ? "bg-emerald-950/30 border-emerald-500/25"
              : isError
                ? "bg-red-950/30 border-red-500/30"
                : "bg-surface-800/50 border-white/5"
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <motion.div
          animate={{ rotateY: isDone ? [0, 360] : 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-surface-700 to-surface-900 border border-white/10 shadow-inner"
        >
          {isDone ? (
            <span className="text-emerald-400 text-xl">✓</span>
          ) : isRunning ? (
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-teal-500/20 border-t-teal-300"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
            />
          ) : isError ? (
            <span className="text-red-400 text-lg">✕</span>
          ) : (
            <span className="text-gray-600 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isDone ? "text-emerald-300" : isRunning ? "text-white" : "text-gray-500"}`}>
            {label}
          </p>
          {detail && (
            <motion.p
              initial={{ opacity: 0, rotateX: -15 }}
              animate={{ opacity: 1, rotateX: 0 }}
              className="text-sm text-gray-500 mt-1 truncate"
            >
              {detail}
            </motion.p>
          )}
        </div>
      </motion.div>
    </motion.li>
  );
}

export function Scene3DBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-[45%] opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45,212,191,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,212,191,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: "rotateX(70deg)",
          transformOrigin: "center bottom",
        }}
      />
      <motion.div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-teal-500/10 blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </div>
  );
}
