"use client";

import clsx from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "indigo" | "emerald" | "white" | "slate";
  label?: string;
  className?: string;
  fullPage?: boolean;
}

const sizes = {
  sm:  "w-4 h-4 border-2",
  md:  "w-7 h-7 border-[3px]",
  lg:  "w-10 h-10 border-4",
  xl:  "w-14 h-14 border-4",
};

const colors = {
  indigo:  "border-indigo-200 border-t-indigo-600",
  emerald: "border-emerald-200 border-t-emerald-600",
  white:   "border-white/30 border-t-white",
  slate:   "border-slate-200 border-t-slate-500",
};

export default function LoadingSpinner({
  size = "md",
  color = "indigo",
  label,
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={clsx("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={clsx(
          "rounded-full animate-spin",
          sizes[size],
          colors[color]
        )}
      />
      {label && (
        <p className="text-sm font-medium text-slate-500 animate-pulse">{label}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/* Skeleton loader utility */
export function SkeletonBlock({
  width = "w-full",
  height = "h-4",
  className,
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "skeleton",
        width,
        height,
        className
      )}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card p-6 space-y-4">
      <SkeletonBlock height="h-5" width="w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} height="h-3" width={i % 2 === 0 ? "w-full" : "w-4/5"} />
        ))}
      </div>
    </div>
  );
}
