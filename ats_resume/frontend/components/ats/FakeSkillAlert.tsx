"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";

interface FraudFlag {
  skill?: string;
  type?: string;
  reason: string;
  confidence?: number;
}

interface FakeSkillAlertProps {
  flags: FraudFlag[];
  compact?: boolean;
}

export default function FakeSkillAlert({ flags, compact = false }: FakeSkillAlertProps) {
  if (!flags || flags.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 w-full">
        <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
        <p className="text-xs text-rose-700 font-medium">
          {flags.length} fraud flag{flags.length !== 1 ? "s" : ""} detected — check Explainability tab.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-rose-200 bg-rose-50/60 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={20} className="text-rose-600" />
        </div>
        <div>
          <p className="font-bold text-rose-700">Fraud / Exaggeration Detected</p>
          <p className="text-xs text-rose-600 mt-0.5">
            Our ML model flagged {flags.length} potential concern{flags.length !== 1 ? "s" : ""} in this resume.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {flags.map((flag, i) => (
          <div
            key={i}
            className="flex items-start gap-3 bg-white border border-rose-100 rounded-xl p-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {(flag.skill || flag.type) && (
                  <span className="badge badge-rose text-xs">
                    {flag.skill ?? flag.type}
                  </span>
                )}
                {flag.confidence != null && (
                  <span className="text-xs text-rose-400">
                    {Math.round(flag.confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">{flag.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-rose-500 italic">
        Note: These flags are model predictions and may not always be accurate. Please verify manually.
      </p>
    </div>
  );
}
