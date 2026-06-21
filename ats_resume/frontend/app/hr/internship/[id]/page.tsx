"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import CandidateRanking from "@/components/hr/CandidateRanking";
import { internshipApi, hrApi } from "@/lib/api";
import type { InternshipDetail } from "@/types/ats";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  Edit3,
  MapPin,
  Users,
} from "lucide-react";
import { format } from "date-fns";

export default function HRInternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    internshipApi
      .get(id)
      .then(setInternship)
      .catch(() => toast.error("Failed to load internship"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = async () => {
    try {
      await hrApi.exportCSV(id);
      toast.success("CSV exported!");
    } catch {
      toast.error("Export failed.");
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 page-container">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6 animate-slide-up">
            <button onClick={() => router.back()} className="btn-ghost btn-sm p-2 mt-1">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-6 w-1/3 rounded-lg" />
                  <div className="skeleton h-4 w-1/4 rounded-lg" />
                </div>
              ) : (
                <>
                  <h1 className="section-title text-2xl">{internship?.title}</h1>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={13} />
                      {internship?.company_name}
                    </span>
                    {internship?.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} />
                        {internship.location}
                      </span>
                    )}
                    {internship?.deadline && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        Deadline: {format(new Date(internship.deadline), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href={`/hr/internship/${id}/edit`}
                className="btn-ghost btn-sm gap-1.5"
              >
                <Edit3 size={14} />
                Edit
              </Link>
              <button
                onClick={handleExport}
                className="btn-outline btn-sm gap-1.5"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-5">
              <SkeletonCard rows={4} />
              <SkeletonCard rows={5} />
            </div>
          ) : internship ? (
            <div className="space-y-6 animate-fade-in">
              {/* JD Details */}
              <div className="grid md:grid-cols-3 gap-5">
                <div className="md:col-span-2 card p-6">
                  <h2 className="font-semibold text-slate-700 mb-3">Job Description</h2>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {internship.jd_text ?? "No description provided."}
                  </p>
                </div>
                <div className="card p-6 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {internship.required_skills?.map((sk) => (
                        <span key={sk} className="badge badge-indigo font-mono text-2xs">{sk}</span>
                      ))}
                    </div>
                  </div>
                  {internship.preferred_skills && internship.preferred_skills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Preferred Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {internship.preferred_skills.map((sk) => (
                          <span key={sk} className="badge badge-slate font-mono text-2xs">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                    {internship.min_experience != null && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min Experience</span>
                        <span className="font-semibold text-slate-700">{internship.min_experience} yrs</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Candidates</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Users size={13} />
                        {internship.candidate_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate ranking */}
              <CandidateRanking jdId={id} />
            </div>
          ) : (
            <p className="text-slate-400 text-center py-12">Internship not found.</p>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
