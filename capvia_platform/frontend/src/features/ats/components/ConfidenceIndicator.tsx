"use client";

import clsx from "clsx";

interface ConfidenceIndicatorProps {
  confidence: number;   // 0.0 – 1.0
  label?: string;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  className?: string;
}

function getConfidenceLevel(c: number): { label: string; color: string; bg: string; ring: string } {
  if (c >= 0.8) return { label: "High",   color: "text-emerald-700", bg: "bg-emerald-100", ring: "bg-emerald-500" };
  if (c >= 0.6) return { label: "Medium", color: "text-indigo-700",  bg: "bg-indigo-100",  ring: "bg-indigo-500"  };
  if (c >= 0.4) return { label: "Low",    color: "text-amber-700",   bg: "bg-amber-100",   ring: "bg-amber-500"   };
  return          { label: "Very Low", color: "text-rose-700",    bg: "bg-rose-100",    ring: "bg-rose-500"    };
}

export default function ConfidenceIndicator({
  confidence,
  label = "AI Confidence",
  size = "md",
  showBar = true,
  className,
}: ConfidenceIndicatorProps) {
  const pct = Math.round(Math.min(Math.max(confidence, 0), 1) * 100);
  const level = getConfidenceLevel(confidence);

  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const badgeSize = size === "sm" ? "text-2xs px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        {label && (
          <span className={clsx("font-medium text-slate-500", textSize)}>{label}</span>
        )}
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full font-semibold",
            level.bg,
            level.color,
            badgeSize,
          )}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", level.ring)} />
          {level.label} ({pct}%)
        </span>
      </div>

      {showBar && (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-700", level.ring)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
