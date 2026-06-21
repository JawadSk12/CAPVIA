"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import ProgressBar from "@/components/shared/ProgressBar";
import ExplainabilityPanel from "@/components/ats/ExplainabilityPanel";
import FakeSkillAlert from "@/components/ats/FakeSkillAlert";
import { hrApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Gavel,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const HR_ACTIONS = [
  { value: "SHORTLIST",    label: "Shortlist",    icon: CheckCircle, cls: "btn-secondary" },
  { value: "REJECT",       label: "Reject",       icon: XCircle,     cls: "btn-danger"    },
  { value: "UNDER_REVIEW", label: "Mark Review",  icon: Clock,       cls: "btn-outline"   },
  { value: "INTERVIEW",    label: "Invite Interview", icon: Zap,      cls: "btn-primary"   },
];

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    hrApi
      .getCandidateDetail(id)
      .then(setCandidate)
      .catch(() => toast.error("Failed to load candidate"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await hrApi.takeAction(id, action, candidate?.jd_id, notes || undefined);
      toast.success(`Action "${action}" applied.`);
      setCandidate((prev: any) => ({ ...prev, hr_status: action }));
    } catch {
      toast.error("Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const score = candidate?.ats_score ?? 0;

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 page-container max-w-5xl">
          {/* Back */}
          <div className="flex items-center gap-3 mb-6 animate-slide-up">
            <button onClick={() => router.back()} className="btn-ghost btn-sm p-2">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="section-title text-xl">
                {loading ? "Loading…" : candidate?.candidate_name ?? "Candidate Detail"}
              </h1>
              <p className="section-subtitle">Full ATS evaluation</p>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} rows={3} />)}
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Fraud banner */}
              {candidate?.fraud_flags?.length > 0 && (
                <FakeSkillAlert flags={candidate.fraud_flags} />
              )}

              <div className="grid md:grid-cols-3 gap-5">
                {/* Profile card */}
                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {candidate?.candidate_name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{candidate?.candidate_name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-400">{candidate?.email ?? "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ATS Score</span>
                      <span className="font-bold text-slate-800">{score}%</span>
                    </div>
                    <ProgressBar value={score} size="sm" showValue={false} animated={false} />
                    <div className="flex justify-between">
                      <span className="text-slate-500">Detected Role</span>
                      <span className="font-semibold text-slate-700">{candidate?.detected_role ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className={clsx(
                        "badge",
                        candidate?.hr_status === "SHORTLISTED" ? "badge-emerald" :
                        candidate?.hr_status === "REJECTED"    ? "badge-rose"    :
                        "badge-amber"
                      )}>
                        {candidate?.hr_status ?? "PENDING"}
                      </span>
                    </div>
                  </div>

                  <a
                    href={candidate?.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline btn-sm w-full gap-2"
                  >
                    <FileText size={14} />
                    View Resume
                  </a>
                </div>

                {/* Matched / Missing skills */}
                <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <p className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-1.5">
                      <CheckCircle size={13} /> Matched Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate?.matched_skills?.map((sk: string) => (
                        <span key={sk} className="badge badge-emerald">{sk}</span>
                      )) ?? <p className="text-xs text-slate-400">None</p>}
                    </div>
                  </div>
                  <div className="card p-5">
                    <p className="text-xs font-bold text-rose-600 mb-3 flex items-center gap-1.5">
                      <XCircle size={13} /> Missing Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate?.missing_skills?.map((sk: string) => (
                        <span key={sk} className="badge badge-rose">{sk}</span>
                      )) ?? <p className="text-xs text-slate-400">None</p>}
                    </div>
                  </div>
                  <div className="sm:col-span-2 card p-5">
                    <p className="text-xs font-bold text-slate-500 mb-3">AI Summary</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {candidate?.summary ?? "No summary available."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Explainability */}
              {candidate && (
                <ExplainabilityPanel analysis={candidate} />
              )}

              {/* HR Action Panel */}
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Gavel size={16} className="text-indigo-500" />
                  HR Decision
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes for this decision…"
                  rows={3}
                  className="input resize-none text-sm"
                />
                <div className="flex flex-wrap gap-3">
                  {HR_ACTIONS.map(({ value, label, icon: Icon, cls }) => (
                    <button
                      key={value}
                      onClick={() => handleAction(value)}
                      disabled={actionLoading !== null || candidate?.hr_status === value}
                      className={clsx("btn gap-2", cls, candidate?.hr_status === value && "opacity-60")}
                    >
                      {actionLoading === value ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Icon size={15} />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
