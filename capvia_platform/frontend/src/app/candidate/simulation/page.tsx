"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import { applicationsApi } from "@/features/simulation/services/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Terminal, Award, ChevronRight, Play, CheckCircle } from "lucide-react";
import clsx from "clsx";

export default function CandidateSimulationListPage() {
  const { user, initialize } = useAuthStore();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) return;
    // CAPVIA /applications/me returns paginated result with .applications array
    applicationsApi.myApplications()
      .then((res) => {
        const data = res?.data;
        // CAPVIA paginates: { applications: [...], total: N, page: 1, per_page: 20 }
        const apps = Array.isArray(data)
          ? data
          : (data?.applications || data?.results || data?.items || []);
        setApplications(apps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleStartSim = async (appId: string) => {
    try {
      const r = await applicationsApi.startSimulation(appId);
      const attemptId = r.data?.attempt_id;
      if (!attemptId) {
        alert("Simulation is being prepared. Please try again in a moment.");
        return;
      }
      router.push(`/candidate/simulation/${attemptId}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === "object" ? detail?.message : detail;
      alert(msg || "Could not start simulation. Please try again.");
    }
  };

  // CAPVIA status values are uppercase; filter for simulation-eligible applications
  const simEligibleStatuses = [
    'APPLIED', 'ATS_COMPLETED', 'SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS',
    'SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS',
    'INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE',
    'SHORTLISTED', 'HIRED', 'REJECTED',
    // Legacy lowercase (from old simulation engine direct responses)
    'applied', 'simulation_invited', 'simulation_started', 'simulation_completed',
    'shortlisted', 'hired', 'rejected',
  ];
  const codeApps = applications.filter((app) => simEligibleStatuses.includes(app.status));

  const isCompleted = (status: string) =>
    ['SIMULATION_COMPLETED', 'INTERVIEW_INVITED', 'INTERVIEW_IN_PROGRESS',
     'INTERVIEW_COMPLETED', 'EVALUATED', 'EVALUATED_LOCAL_BASELINE',
     'SHORTLISTED', 'HIRED', 'REJECTED',
     'simulation_completed', 'shortlisted', 'hired', 'rejected'].includes(status);

  const canStart = (status: string) =>
    ['SIMULATION_INVITED', 'SIMULATION_IN_PROGRESS', 'ATS_COMPLETED',
     'simulation_invited', 'simulation_started'].includes(status);

  return (
    <UnifiedLayout title="Coding Assessments">
      <div className="bg-white border border-slate-200 rounded-[1.25rem] p-6 shadow-sm max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Terminal size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-display">Technical Code Assessments</h1>
            <p className="text-xs text-slate-500">Solve real-world coding problems with our live compiler and AI evaluation engine.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : codeApps.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
            <Terminal className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No assessments found</p>
            <p className="text-slate-400 text-xs mt-1 mb-5">Apply to an internship vacancy to trigger a coding simulation invitation.</p>
            <button
              onClick={() => router.push('/internships')}
              className="px-4 py-2 bg-[#0D47A1] hover:bg-[#0A3B85] text-white font-bold text-xs rounded-xl shadow transition"
            >
              Browse Openings
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {codeApps.map((app) => {
              const completed = isCompleted(app.status);
              const startable = canStart(app.status);
              // CAPVIA response uses vacancy_title and company_name at root level
              const title = app.vacancy_title || app.internship?.title || "Internship Role";
              const company = app.company_name || app.internship?.company_name || "CAPVIA Partner";

              return (
                <div
                  key={app.id}
                  className="p-5 border border-slate-100 rounded-xl bg-slate-50/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-200"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    <p className="text-xs text-slate-500">🏢 {company}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Application ID: {app.id}</p>
                    <p className="text-[10px] text-slate-400">Status: <span className="font-semibold">{app.status_label || app.status}</span></p>
                  </div>

                  <div className="flex items-center gap-3">
                    {completed ? (
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold">
                        <CheckCircle size={14} />
                        Completed
                      </div>
                    ) : startable ? (
                      <button
                        onClick={() => handleStartSim(app.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Play size={12} fill="white" />
                        {app.status === 'SIMULATION_IN_PROGRESS' || app.status === 'simulation_started' ? 'Resume Test' : 'Start Assessment'}
                      </button>
                    ) : (
                      <div className="text-xs text-slate-400 italic px-3.5 py-2">
                        Awaiting invite
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}
