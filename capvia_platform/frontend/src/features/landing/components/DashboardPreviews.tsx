"use client";

import React, { useState } from "react";
import { LayoutDashboard, Award, CheckCircle2, Eye } from "lucide-react";

export default function DashboardPreviews() {
  const [activeTab, setActiveTab] = useState<"recruiter" | "candidate">("recruiter");

  const candidatesList = [
    { name: "John Doe", score: "91.8", tier: "PLATINUM", rank: "#1", match: "94%", fraud: "Low" },
    { name: "Alice Smith", score: "84.2", tier: "GOLD", rank: "#2", match: "89%", fraud: "Low" },
    { name: "Robert Johnson", score: "72.4", tier: "GOLD", rank: "#3", match: "82%", fraud: "Low" },
  ];

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-dash-thread" />
          
          {/* Branch to the preview dashboard panel */}
          <path d="M 600,280 L 480,280 L 400,280" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="400" cy="280" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            Designed for Recruiters and Candidates
          </h2>
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Explore a cohesive system designed to simplify high-volume screening and support talent progression.
          </p>

          {/* Toggle Tab Buttons - styled with dark theme accents */}
          <div className="mt-8 inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab("recruiter")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 uppercase tracking-wider ${
                activeTab === "recruiter"
                  ? "bg-white text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Recruiter Workspace</span>
            </button>
            <button
              onClick={() => setActiveTab("candidate")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 uppercase tracking-wider ${
                activeTab === "candidate"
                  ? "bg-white text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Candidate Progress Portal</span>
            </button>
          </div>
        </div>

        {/* Preview Frame - High density system console on dark glass */}
        <div className="bg-slate-950 border border-slate-850 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl p-6 md:p-8 shadow-2xl hover:shadow-[0_0_40px_rgba(13,71,161,0.15)] max-w-5xl mx-auto overflow-x-auto transition-all duration-300 font-mono text-slate-300">
          
          {activeTab === "recruiter" ? (
            /* Recruiter Dashboard Mockup */
            <div className="min-w-[700px] space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-900">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-outfit tracking-tight">Acme Corp Leaderboard</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Software Engineer Intern vacancy</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[8px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-extrabold">Active Cohort: 450 Candidates</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                    <th className="pb-3 pl-4">Rank</th>
                    <th className="pb-3">Candidate</th>
                    <th className="pb-3">ATS Score</th>
                    <th className="pb-3">Risk Level</th>
                    <th className="pb-3">Recommendation</th>
                    <th className="pb-3 text-right pr-4">Composite Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono text-slate-400">
                  {candidatesList.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 pl-4 font-bold text-slate-500">{c.rank}</td>
                      <td className="py-4 font-bold text-slate-200 font-sans">{c.name}</td>
                      <td className="py-4 text-[#42A5F5]">{c.match}</td>
                      <td className="py-4 text-emerald-450 flex items-center space-x-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{c.fraud}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-[9px] font-extrabold bg-[#0D47A1]/20 text-[#42A5F5] border border-[#0D47A1]/30 px-2.5 py-1 rounded-lg">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-4 font-extrabold text-[#FFC107]">{c.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Footer */}
              <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-550 select-none">
                <span>Displaying 3 of 450 entries</span>
                <span className="font-bold text-[#42A5F5] hover:underline cursor-pointer flex items-center space-x-1 uppercase tracking-wider">
                  <span>View Full Cohort Analytics</span>
                  <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ) : (
            /* Candidate Progress Mockup */
            <div className="min-w-[700px] space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-900">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-outfit tracking-tight">Application Lifecycle Status</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Acme Corp — Software Engineer Intern</p>
                </div>
                <span className="text-[8px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg">
                  Phase 5 Completed
                </span>
              </div>

              {/* Steps Stepper */}
              <div className="grid grid-cols-5 gap-4 relative py-4">
                <div className="absolute top-10 left-8 right-8 h-[1px] bg-slate-900 -z-10" />
                
                {[
                  { name: "ATS Screen", sub: "Score: 85%", status: "done" },
                  { name: "Simulation", sub: "Score: 88%", status: "done" },
                  { name: "Interview", sub: "Score: 82%", status: "done" },
                  { name: "DNA Profiling", sub: "Compiled", status: "done" },
                  { name: "Final Review", sub: "Platinum Tier", status: "active" },
                ].map((step, idx) => (
                  <div key={step.name} className="flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-md transition-colors ${
                        step.status === "done"
                          ? "bg-[#0D47A1] border-[#42A5F5] text-white"
                          : "bg-slate-900 border-[#FFC107] text-[#FFC107] animate-pulse"
                      }`}
                    >
                      {step.status === "done" ? <CheckCircle2 className="w-5 h-5 text-[#42A5F5]" /> : idx + 1}
                    </div>
                    <span className="mt-3 text-xs font-bold text-slate-300 block font-sans">{step.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{step.sub}</span>
                  </div>
                ))}
              </div>

              {/* Summary Panel */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-900 flex items-center justify-between">
                <div className="space-y-1 text-slate-400 font-sans text-xs">
                  <span className="text-[8px] font-mono font-extrabold text-slate-550 uppercase tracking-widest block">Latest Status update</span>
                  <h4 className="text-sm font-bold text-slate-200">
                    Application successfully evaluated by the DNA and Ranking Engine
                  </h4>
                  <p className="text-slate-500 leading-normal">
                    Your profile has been placed on the recruiter shortlist leaderboard. You will receive an email alert upon status review.
                  </p>
                </div>
                <div className="flex-shrink-0 bg-slate-950 border border-slate-850 p-4 rounded-xl shadow-md text-center select-none">
                  <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">Overall Percentile</span>
                  <span className="text-2xl font-extrabold text-[#42A5F5] font-sans">94.8%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes dash-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-dash-thread {
          animation: dash-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
