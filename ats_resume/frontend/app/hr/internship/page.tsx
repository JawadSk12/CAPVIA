"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import { internshipApi } from "@/lib/api";
import type { InternshipSummary } from "@/types/ats";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import clsx from "clsx";

export default function HRInternshipListPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    internshipApi
      .list(showAll ? false : true)
      .then(setInternships)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showAll]);

  const filtered = internships.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.company_name ?? i.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 page-container">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-slide-up">
            <div>
              <h1 className="section-title text-2xl">Internship Postings</h1>
              <p className="section-subtitle">{filtered.length} {showAll ? "total" : "active"} internship{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href="/hr/internship/new" className="btn-primary btn-sm gap-1.5">
              <Plus size={14} />
              Post New
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6 animate-slide-up delay-100 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search internships…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
              <div
                onClick={() => setShowAll((v) => !v)}
                className={clsx(
                  "relative w-10 h-5 rounded-full transition-colors duration-200",
                  showAll ? "bg-indigo-500" : "bg-slate-200"
                )}
              >
                <div className={clsx(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                  showAll ? "left-5" : "left-0.5"
                )} />
              </div>
              Show all (incl. expired)
            </label>
          </div>

          {/* List */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} rows={4} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-16 text-center space-y-4 animate-fade-in">
              <BookOpen size={40} className="mx-auto text-slate-200" />
              <p className="font-semibold text-slate-500">No internships found</p>
              <Link href="/hr/internship/new" className="btn-primary btn-sm inline-flex gap-1.5">
                <Plus size={13} />
                Post your first internship
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {filtered.map((internship, i) => {
                const company = internship.company_name ?? internship.company ?? "—";
                const deadline = internship.deadline ?? internship.application_deadline;
                const count = internship.candidate_count ?? internship.total_applicants ?? 0;
                const isActive = internship.is_active !== false;

                return (
                  <Link
                    key={internship.id}
                    href={`/hr/internship/${internship.id}`}
                    className={clsx(
                      "card card-hover p-6 block group animate-slide-up",
                      `delay-${Math.min(i * 50, 400)}`
                    )}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={20} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-slate-800 truncate">{internship.title}</h2>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                          <Building2 size={12} />
                          <span className="truncate">{company}</span>
                        </div>
                      </div>
                      <span className={clsx(
                        "badge flex-shrink-0",
                        isActive ? "badge-emerald" : "badge-slate"
                      )}>
                        {isActive ? (
                          <><CheckCircle size={11} /> Active</>
                        ) : (
                          <><Clock size={11} /> Expired</>
                        )}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Users size={11} />
                        {count} candidate{count !== 1 ? "s" : ""}
                      </span>
                      {deadline && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} />
                          Deadline: {format(new Date(deadline), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    {/* Required skills */}
                    {internship.required_skills && internship.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {internship.required_skills.slice(0, 5).map((sk) => (
                          <span key={sk} className="badge badge-indigo font-mono text-2xs">{sk}</span>
                        ))}
                        {internship.required_skills.length > 5 && (
                          <span className="badge badge-slate text-2xs">
                            +{internship.required_skills.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* View link */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">
                        {internship.shortlisted_count ?? 0} shortlisted
                      </span>
                      <span className="text-sm text-indigo-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        View candidates <ArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
