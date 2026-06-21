"use client";

import clsx from "clsx";

interface ProgressBarProps {
  value: number;          // 0–100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "auto" | "indigo" | "emerald" | "amber" | "rose";
  animated?: boolean;
  className?: string;
}

function getScoreColor(value: number) {
  if (value >= 80) return "bg-gradient-to-r from-emerald-400 to-emerald-500";
  if (value >= 60) return "bg-gradient-to-r from-indigo-400 to-indigo-500";
  if (value >= 40) return "bg-gradient-to-r from-amber-400 to-amber-500";
  return "bg-gradient-to-r from-rose-400 to-rose-500";
}

const colorMap = {
  indigo:  "bg-gradient-to-r from-indigo-400 to-indigo-600",
  emerald: "bg-gradient-to-r from-emerald-400 to-emerald-600",
  amber:   "bg-gradient-to-r from-amber-400 to-amber-600",
  rose:    "bg-gradient-to-r from-rose-400 to-rose-600",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  color = "auto",
  animated = true,
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor =
    color === "auto" ? getScoreColor(pct) : colorMap[color] ?? colorMap.indigo;

  return (
    <div className={clsx("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
          {showValue && (
            <span
              className={clsx(
                "text-xs font-bold tabular-nums",
                pct >= 80
                  ? "text-emerald-600"
                  : pct >= 60
                  ? "text-indigo-600"
                  : pct >= 40
                  ? "text-amber-600"
                  : "text-rose-600"
              )}
            >
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={clsx(
          "w-full rounded-full bg-slate-100 overflow-hidden",
          sizeMap[size]
        )}
      >
        {/* Fill */}
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700 ease-out",
            barColor,
            animated && "animate-pulse-slow"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* Multi-segment progress (for pipeline stages) */
interface StageProgressProps {
  stages: { label: string; complete: boolean; active?: boolean }[];
}

export function StageProgress({ stages }: StageProgressProps) {
  const completedCount = stages.filter((s) => s.complete).length;
  const pct = (completedCount / stages.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{completedCount} of {stages.length} stages complete</span>
        <span className="font-semibold text-indigo-600">{Math.round(pct)}%</span>
      </div>

      <div className="relative flex items-center gap-0">
        {stages.map((stage, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Dot */}
            <div
              className={clsx(
                "w-3 h-3 rounded-full z-10 transition-all duration-300",
                stage.complete
                  ? "bg-indigo-600 scale-110"
                  : stage.active
                  ? "bg-indigo-400 animate-pulse"
                  : "bg-slate-200"
              )}
            />
            <span className="text-2xs text-center text-slate-500 leading-tight px-0.5">
              {stage.label}
            </span>
            {/* Connector */}
            {i < stages.length - 1 && (
              <div
                className={clsx(
                  "absolute top-1.5 h-0.5 transition-all duration-500",
                  stage.complete ? "bg-indigo-400" : "bg-slate-200"
                )}
                style={{
                  left: `${((i + 0.5) / stages.length) * 100}%`,
                  width: `${(1 / stages.length) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
