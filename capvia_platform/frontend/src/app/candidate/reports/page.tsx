'use client';

import React from 'react';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { FileText, Download, Calendar, ArrowUpRight, CheckCircle2, Star } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    {
      id: 1,
      title: 'Global ATS Fit Analysis',
      type: 'ATS Report',
      date: 'June 25, 2026',
      size: '240 KB',
      score: '84%',
      status: 'Ready',
    },
    {
      id: 2,
      title: 'Full stack Engineer Simulation Evaluation',
      type: 'Simulation Report',
      date: 'June 20, 2026',
      size: '1.2 MB',
      score: '78.5%',
      status: 'Ready',
    },
    {
      id: 3,
      title: 'AI Speech & Integrity Webcam Audit',
      type: 'Webcam Audit',
      date: 'June 18, 2026',
      size: '850 KB',
      score: '96/100',
      status: 'Ready',
    },
  ];

  return (
    <UnifiedLayout title="Verified Capability Reports">
      <div className="space-y-8 animate-fade-in font-sans text-slate-800">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-blue-100 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-outfit tracking-tight flex items-center gap-1.5">
              <FileText className="h-5 w-5 text-[#0D47A1]" />
              Assessment Reports
            </h2>
            <p className="text-xs text-slate-500 mt-1">Download and share verified proctored feedback with potential recruiters.</p>
          </div>
          <button 
            onClick={() => alert('Exporting all data...')}
            className="px-4 py-2 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Export All Records
          </button>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-slate-100 rounded-[20px] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between relative group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {report.type}
                  </span>
                  <span className="text-xs font-black text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {report.score}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-[#0D47A1] transition-colors font-outfit mt-2">
                  {report.title}
                </h3>
                
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold mt-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {report.date}
                  </span>
                  <span>•</span>
                  <span>{report.size}</span>
                </div>
              </div>

              <div className="border-t border-slate-50 pt-4 mt-6 flex justify-between items-center">
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Verified
                </span>
                <button
                  onClick={() => alert(`Downloading report: ${report.title}`)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#0D47A1] text-slate-400 transition"
                  title="Download File"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State / Share section */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="text-4xl">🔗</div>
          <h3 className="font-bold text-slate-800 font-outfit">Share Verified Profile Link</h3>
          <p className="text-slate-455 text-xs font-medium leading-relaxed">
            Generate a secure, expiring URL containing your verified ATS fit matrices, coding round proctor logs, and speech evaluation scores to share with hiring managers.
          </p>
          <button
            onClick={() => alert('Link copied to clipboard!')}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
          >
            Create Expiring Link
          </button>
        </div>

      </div>
    </UnifiedLayout>
  );
}
