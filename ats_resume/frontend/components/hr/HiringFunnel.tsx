"use client";

interface HiringFunnelProps {
  data: { stage: string; count: number; color?: string }[];
  loading?: boolean;
}

const DEFAULT_COLORS = [
  "#4F46E5",
  "#7C3AED",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
];

export default function HiringFunnel({ data, loading }: HiringFunnelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton h-10 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400 py-8">
        No funnel data available for this internship.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((stage, i) => {
        const pct = (stage.count / maxCount) * 100;
        const color = stage.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

        return (
          <div key={stage.stage} className="flex items-center gap-4">
            <div className="w-32 text-right">
              <p className="text-sm font-medium text-slate-600 truncate">{stage.stage}</p>
            </div>

            <div className="flex-1 relative">
              {/* Track */}
              <div className="h-9 bg-slate-100 rounded-xl overflow-hidden">
                {/* Fill */}
                <div
                  className="h-full rounded-xl flex items-center px-3 transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    minWidth: stage.count > 0 ? "3rem" : "0",
                  }}
                >
                  {pct > 15 && (
                    <span className="text-white text-xs font-bold">
                      {stage.count}
                    </span>
                  )}
                </div>
              </div>
              {pct <= 15 && stage.count > 0 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  {stage.count}
                </span>
              )}
            </div>

            <div className="w-16 text-right">
              <p className="text-xs text-slate-400 font-medium">
                {((stage.count / (data[0]?.count || 1)) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        );
      })}

      {/* Conversion summary */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Top of funnel: <b className="text-slate-600">{data[0]?.count ?? 0}</b></span>
        <span>Bottom of funnel: <b className="text-slate-600">{data[data.length - 1]?.count ?? 0}</b></span>
        <span>
          Overall conversion:{" "}
          <b className="text-indigo-600">
            {data[0]?.count
              ? ((data[data.length - 1]?.count / data[0].count) * 100).toFixed(1)
              : 0}%
          </b>
        </span>
      </div>
    </div>
  );
}
