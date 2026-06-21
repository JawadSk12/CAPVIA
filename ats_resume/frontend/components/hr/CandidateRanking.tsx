"use client";

import { useState, useEffect } from "react";
import { internshipApi } from "@/lib/api";
import CandidateCard from "@/components/hr/CandidateCard";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import type { CandidateRankEntry } from "@/types/ats";
import { Users } from "lucide-react";

interface CandidateRankingProps {
  jdId: string;
}

export default function CandidateRanking({ jdId }: CandidateRankingProps) {
  const [candidates, setCandidates] = useState<CandidateRankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    if (!jdId) return;
    setLoading(true);
    internshipApi
      .getCandidates(jdId, { limit: 50 })
      .then((r) => setCandidates(r.candidates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jdId]);

  const filtered = candidates.filter((c) => (c.ats_score ?? 0) >= minScore);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <Users size={16} className="text-indigo-500" />
          Candidate Rankings ({filtered.length})
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Min score:</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-24 accent-indigo-600"
          />
          <span className="text-xs font-bold text-indigo-600 w-8">{minScore}%</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <SkeletonCard key={n} rows={2} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          No candidates yet for this internship.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => (
            <CandidateCard key={c.resume_id} candidate={c} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
