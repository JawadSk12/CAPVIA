"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import ProgressBar from "@/components/shared/ProgressBar";
import CandidateCard from "@/components/hr/CandidateCard";
import { hrApi, internshipApi } from "@/lib/api";
import type { CandidateRankingResponse, InternshipSummary } from "@/types/ats";
import {
  AlertTriangle,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const STATUS_OPTIONS = ["ALL", "SHORTLISTED", "UNDER_REVIEW", "REJECTED", "PENDING"];

export default function HRCandidatesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateRankingResponse | null>(null);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJd, setSelectedJd] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [minScore, setMinScore] = useState(0);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    internshipApi.list().then(setInternships).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    hrApi
      .getAllCandidates({
        jdId:        selectedJd   || undefined,
        hrStatus:    statusFilter !== "ALL" ? statusFilter : undefined,
        minScore:    minScore     > 0       ? minScore     : undefined,
        flaggedOnly: flaggedOnly  || undefined,
        limit: 50,
      })
      .then(setCandidates)
      .catch(() => toast.error("Failed to load candidates"))
      .finally(() => setLoading(false));
  }, [selectedJd, statusFilter, minScore, flaggedOnly]);

  const handleExport = async () => {
    if (!selectedJd) {
      toast.error("Select an internship to export.");
      return;
    }
    setExporting(true);
    try {
      const { hrApi: h } = await import("@/lib/api");
      await h.exportCSV(selectedJd);
      toast.success("CSV exported!");
    } catch {
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const filteredCandidates = candidates?.candidates?.filter((c) =>
    search
      ? c.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.filename?.toLowerCase().includes(search.toLowerCase())
      : true
  ) ?? [];

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 page-container">
          <div className="flex items-center justify-between mb-6 animate-slide-up">
            <div>
              <h1 className="section-title text-2xl">Candidates</h1>
              <p className="section-subtitle">
                {candidates?.total_count ?? 0} total candidates
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || !selectedJd}
              className="btn-outline btn-sm gap-1.5"
            >
              <Download size={14} />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>

          {/* Filters */}
          <div className="card p-4 mb-6 space-y-3 animate-slide-up delay-100">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 py-2 text-sm"
                />
              </div>

              {/* JD filter */}
              <select
                value={selectedJd}
                onChange={(e) => setSelectedJd(e.target.value)}
                className="input py-2 text-sm"
              >
                <option value="">All Internships</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s.replace("_", " ")}</option>
                ))}
              </select>

              {/* Flagged toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setFlaggedOnly((v) => !v)}
                  className={clsx(
                    "relative w-10 h-5 rounded-full transition-colors duration-200",
                    flaggedOnly ? "bg-rose-500" : "bg-slate-200"
                  )}
                >
                  <div
                    className={clsx(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                      flaggedOnly ? "left-5" : "left-0.5"
                    )}
                  />
                </div>
                <span className="text-sm text-slate-600">Flagged only</span>
                <AlertTriangle size={13} className={flaggedOnly ? "text-rose-500" : "text-slate-300"} />
              </label>
            </div>

            {/* Min score slider */}
            <div className="flex items-center gap-4">
              <SlidersHorizontal size={15} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 flex-shrink-0">Min score:</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs font-bold text-indigo-600 w-8 text-right">{minScore}%</span>
            </div>
          </div>

          {/* Candidate list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => <SkeletonCard key={n} rows={2} />)}
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="card p-16 text-center space-y-3 animate-fade-in">
              <Users size={40} className="mx-auto text-slate-200" />
              <p className="font-semibold text-slate-500">No candidates match your filters</p>
              <p className="text-sm text-slate-400">Try adjusting the filters above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((candidate, i) => (
                <CandidateCard
                  key={candidate.resume_id}
                  candidate={candidate}
                  rank={i + 1}
                />
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
