"use client";

import Link from "next/link";
import type { CandidateRankEntry } from "@/types/ats";
import ProgressBar from "@/components/shared/ProgressBar";
import { AlertTriangle, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import clsx from "clsx";

interface ComparisonTableProps {
  candidates: CandidateRankEntry[];
  jdId?: string;
  showActions?: boolean;
  onAction?: (resumeId: string, action: string) => void;
}

const STATUS_BADGE: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
  SHORTLISTED:  { cls: "badge-emerald", icon: CheckCircle, label: "Shortlisted"  },
  REJECTED:     { cls: "badge-rose",    icon: XCircle,     label: "Rejected"     },
  UNDER_REVIEW: { cls: "badge-amber",   icon: Clock,       label: "Under Review" },
  PENDING:      { cls: "badge-slate",   icon: Clock,       label: "Pending"      },
  INTERVIEW:    { cls: "badge-indigo",  icon: CheckCircle, label: "Interview"    },
};

export default function ComparisonTable({
  candidates,
  jdId,
  showActions = true,
  onAction,
}: ComparisonTableProps) {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400 text-sm">
        No candidates to compare yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {["Rank", "Candidate", "ATS Score", "Role", "Skills", "Status", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-slate-50">
          {candidates.map((c, i) => {
            const score = c.ats_score ?? c.overall_score ?? 0;
            const name  = c.candidate_name ?? c.user_name ?? "Unknown";
            const statusKey = (c.hr_status ?? "PENDING").toUpperCase();
            const badge = STATUS_BADGE[statusKey] ?? STATUS_BADGE.PENDING;
            const StatusIcon = badge.icon;
            const isFlagged = (c.fraud_flags?.length ?? 0) > 0;

            return (
              <tr
                key={c.resume_id}
                className={clsx(
                  "hover:bg-slate-50/70 transition-colors",
                  isFlagged && "bg-rose-50/30"
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                    i === 0 ? "bg-amber-400 text-white" :
                    i === 1 ? "bg-slate-300 text-white" :
                    i === 2 ? "bg-amber-700 text-white" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {i + 1}
                  </div>
                </td>

                {/* Candidate */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        {name}
                        {isFlagged && (
                          <AlertTriangle size={12} className="text-rose-500" title="Fraud flags detected" />
                        )}
                      </p>
                      <p className="text-xs text-slate-400">{c.email ?? c.user_email ?? "—"}</p>
                    </div>
                  </div>
                </td>

                {/* ATS Score */}
                <td className="px-4 py-3 min-w-32">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "text-sm font-black tabular-nums",
                        score >= 80 ? "text-emerald-600" :
                        score >= 60 ? "text-indigo-600"  :
                        score >= 40 ? "text-amber-600"   : "text-rose-600"
                      )}>
                        {Math.round(score)}%
                      </span>
                    </div>
                    <ProgressBar value={score} size="sm" showValue={false} animated={false} />
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-slate-600">{c.detected_role ?? "—"}</span>
                </td>

                {/* Skills preview */}
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap max-w-48">
                    {c.matched_skills?.slice(0, 3).map((sk) => (
                      <span key={sk} className="badge badge-emerald text-2xs">{sk}</span>
                    ))}
                    {(c.matched_skills?.length ?? 0) > 3 && (
                      <span className="badge badge-slate text-2xs">
                        +{(c.matched_skills?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`badge ${badge.cls} gap-1`}>
                    <StatusIcon size={11} />
                    {badge.label}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {showActions && onAction && (
                      <>
                        <button
                          onClick={() => onAction(c.resume_id, "SHORTLIST")}
                          className="btn-ghost btn-sm py-1 text-emerald-600 hover:bg-emerald-50"
                          title="Shortlist"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => onAction(c.resume_id, "REJECT")}
                          className="btn-ghost btn-sm py-1 text-rose-500 hover:bg-rose-50"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    <Link
                      href={`/hr/candidate/${c.resume_id}${jdId ? `?jd_id=${jdId}` : ""}`}
                      className="btn-ghost btn-sm py-1 text-slate-500 hover:text-indigo-600"
                      title="View detail"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
