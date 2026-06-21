"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgressBar from "@/components/shared/ProgressBar";
import type { CandidateRankEntry } from "@/types/ats";
import { AlertTriangle, ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

interface CandidateCardProps {
  candidate: CandidateRankEntry;
  rank: number;
}

function statusBadge(status?: string) {
  if (!status) return null;
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    SHORTLISTED:  { cls: "badge-emerald", icon: CheckCircle   },
    REJECTED:     { cls: "badge-rose",    icon: XCircle       },
    UNDER_REVIEW: { cls: "badge-amber",   icon: Clock         },
    PENDING:      { cls: "badge-slate",   icon: Clock         },
    INTERVIEW:    { cls: "badge-indigo",  icon: CheckCircle   },
  };
  const entry = map[status] ?? map.PENDING;
  const Icon = entry.icon;
  return (
    <span className={`badge ${entry.cls} gap-1`}>
      <Icon size={11} />
      {status.replace("_", " ")}
    </span>
  );
}

export default function CandidateCard({ candidate, rank }: CandidateCardProps) {
  const score = candidate.ats_score ?? 0;
  const isFlagged = candidate.fraud_flags && candidate.fraud_flags.length > 0;

  return (
    <Link
      href={`/hr/candidate/${candidate.resume_id}`}
      className={clsx(
        "card card-hover flex items-center gap-4 p-4 group",
        isFlagged && "border-rose-200 bg-rose-50/30"
      )}
    >
      {/* Rank */}
      <div className={clsx(
        "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0",
        rank === 1 ? "bg-amber-400 text-white shadow-md shadow-amber-200" :
        rank === 2 ? "bg-slate-300 text-white" :
        rank === 3 ? "bg-amber-700 text-white" :
        "bg-slate-100 text-slate-500"
      )}>
        {rank}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {candidate.candidate_name?.[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-slate-800 truncate">
            {candidate.candidate_name ?? candidate.filename ?? "Unknown"}
          </p>
          {isFlagged && (
            <span title="Fraud flags detected">
              <AlertTriangle size={13} className="text-rose-500 flex-shrink-0" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-slate-400">{candidate.detected_role ?? "Unknown role"}</p>
          {candidate.analyzed_at && (
            <span className="text-slate-300">·</span>
          )}
          {candidate.analyzed_at && (
            <p className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(candidate.analyzed_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="mt-2 max-w-xs">
          <ProgressBar value={score} size="sm" showValue={false} animated={false} />
        </div>
      </div>

      {/* Score + status + arrow */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="text-xl font-black text-slate-800 tabular-nums">
          {score}
          <span className="text-xs font-normal text-slate-400">%</span>
        </span>
        {statusBadge(candidate.hr_status)}
      </div>

      <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
    </Link>
  );
}
