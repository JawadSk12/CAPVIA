'use client';

import React, { useState } from 'react';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { FileText, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResumePage() {
  const [resumes, setResumes] = useState([
    { id: 1, name: 'Jawad_Software_Engineer_Resume.pdf', date: 'June 25, 2026', active: true },
    { id: 2, name: 'Jawad_FullStack_React_Developer.pdf', date: 'June 10, 2026', active: false },
  ]);

  const handleMakeActive = (id: number) => {
    setResumes(resumes.map(r => ({ ...r, active: r.id === id })));
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this resume?')) {
      setResumes(resumes.filter(r => r.id !== id));
    }
  };

  return (
    <UnifiedLayout title="Resume Manager">
      <div className="space-y-8 animate-fade-in font-sans text-slate-800">
        
        {/* Top Info Banner */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-blue-100 rounded-[24px] p-6">
          <h2 className="text-lg font-bold text-slate-900 font-outfit tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0D47A1]" />
            Manage Resumes
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Upload and manage your resume profiles. The designated <strong>Active</strong> resume will be used as the primary source for automatic ATS matching evaluations.
          </p>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upload panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-850 font-outfit mb-4">Upload New File</h3>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-[#0D47A1]/40 bg-slate-50/50 hover:bg-[#0D47A1]/5/10 rounded-[20px] p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-[#0D47A1]">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Drag and drop your file here, or browse</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supported formats: PDF, DOCX, DOC • Size limit: 10MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* List of resumes */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-850 font-outfit mb-4">File Repository</h3>
              
              {resumes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No resumes uploaded.
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((resume) => (
                    <div 
                      key={resume.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                        resume.active 
                          ? 'border-[#0D47A1]/20 bg-[#0D47A1]/5/10' 
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-750 truncate" title={resume.name}>{resume.name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Uploaded {resume.date}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {resume.active ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMakeActive(resume.id)}
                            className="text-[9px] text-slate-500 hover:text-[#0D47A1] font-bold border border-slate-200 rounded px-2 py-0.5 bg-white hover:bg-slate-50 transition"
                          >
                            Use
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="text-slate-350 hover:text-rose-600 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </UnifiedLayout>
  );
}
