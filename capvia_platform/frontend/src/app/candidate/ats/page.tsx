"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import FileUpload from "@/components/shared/FileUpload";
import { StageProgress } from "@/components/shared/ProgressBar";
import ProgressBar from "@/components/shared/ProgressBar";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { resumeApi, internshipApi } from "@/features/ats/services/api";
import { useATSStore } from "@/store/atsStore";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Globe,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Trash2
} from "lucide-react";
import type { InternshipSummary, ResumeSummary } from "@/types/ats";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

const STAGES = [
  { label: "OCR / Parse" },
  { label: "NER Extract" },
  { label: "Embed" },
  { label: "Score" },
];

type UploadMode = "GLOBAL" | "INTERNSHIP";

export default function CandidateATSPage() {
  const router = useRouter();
  const { uploadProgress, isUploading, startUpload } = useATSStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<UploadMode>("GLOBAL");
  const [selectedJd, setSelectedJd] = useState<string>("");
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  
  // History state
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const history = await resumeApi.getHistory(20);
      setResumes(history);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    internshipApi.list(true).then(setInternships).catch(() => {});
    fetchHistory();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }
    if (mode === "INTERNSHIP" && !selectedJd) {
      toast.error("Please select an internship to compare against.");
      return;
    }

    try {
      const resp = await startUpload(
        selectedFile,
        mode,
        mode === "INTERNSHIP" ? selectedJd : undefined
      );
      setProcessing(true);
      
      // Simulate stage polling
      const stageInterval = setInterval(() => {
        setCurrentStage((s) => {
          if (s >= STAGES.length - 1) {
            clearInterval(stageInterval);
            setTimeout(() => {
              toast.success("Analysis complete!");
              router.push(`/candidate/ats/analysis/${resp.resume_id}`);
            }, 800);
          }
          return Math.min(s + 1, STAGES.length);
        });
      }, 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      toast.error(msg);
    }
  };

  const handleDelete = async (resumeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    try {
      await resumeApi.delete(resumeId);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      toast.success("Analysis deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const stages = STAGES.map((s, i) => ({
    ...s,
    complete: i < currentStage,
    active: i === currentStage && processing,
  }));

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cls: string; label: string; icon: any }> = {
      COMPLETED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed", icon: CheckCircle },
      PROCESSING: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Processing", icon: Clock },
      FAILED: { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Failed", icon: AlertTriangle },
      PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending", icon: Clock },
    };
    const current = config[status] || config.PENDING;
    const Icon = current.icon;

    return (
      <span className={clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", current.cls)}>
        <Icon size={12} />
        {current.label}
      </span>
    );
  };

  return (
    <UnifiedLayout title="ATS Resume Analyzer">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[1.25rem] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">Upload Resume</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Upload your resume to evaluate keyword density, formatting, and semantic match score against our active internships.
            </p>

            {/* Mode selection */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Analysis Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  {
                    value: "GLOBAL",
                    label: "Global ATS Score",
                    icon: Globe,
                    desc: "Score against standard industry frameworks",
                  },
                  {
                    value: "INTERNSHIP",
                    label: "Internship Match",
                    icon: BookOpen,
                    desc: "Compare against a specific opening",
                  },
                ] as const).map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={clsx(
                      "flex items-start gap-4 p-4 rounded-[1rem] border-2 text-left transition-all duration-200",
                      mode === value
                        ? "border-[#0D47A1] bg-blue-50/40 text-[#0D47A1]"
                        : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200"
                    )}
                  >
                    <div className={clsx("p-2 rounded-lg", mode === value ? "bg-[#0D47A1]/10 text-[#0D47A1]" : "bg-white text-slate-400 border border-slate-100")}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Internship Selection */}
            {mode === "INTERNSHIP" && (
              <div className="mb-6 animate-slide-up">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Select Target Internship
                </label>
                <select
                  value={selectedJd}
                  onChange={(e) => setSelectedJd(e.target.value)}
                  className="w-full px-4 py-3 rounded-[0.75rem] border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0D47A1] text-sm"
                >
                  <option value="">— Choose an internship —</option>
                  {internships.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title} — {i.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File Dropzone */}
            <div className="mb-6">
              <FileUpload
                onFileSelect={setSelectedFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </div>

            {/* AI pipeline status */}
            {processing && (
              <div className="bg-slate-50 border border-slate-100 rounded-[1rem] p-5 mb-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit size={18} className="text-[#0D47A1] animate-pulse" />
                  <h3 className="font-bold text-slate-800 text-sm">AI Pipeline Running</h3>
                </div>
                <StageProgress stages={stages} />
                <p className="text-xs text-slate-400 mt-4 text-center">
                  This typically takes 30–60 seconds. We'll redirect you automatically.
                </p>
              </div>
            )}

            {/* CTA Button */}
            {!processing && (
              <div>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full py-4 rounded-[0.75rem] bg-[#0D47A1] hover:bg-[#0A3B85] disabled:bg-slate-200 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      Start AI Analysis
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <p className="text-center text-2xs text-slate-400 mt-3">
                  Supported formats: PDF, DOC, DOCX • Size limit: 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[1.25rem] border border-slate-200 p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">Analysis History</h3>
            <p className="text-slate-500 text-xs mb-6">Review your previously analyzed resumes and scores.</p>

            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-[1rem] bg-slate-50/50 p-4">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="font-bold text-slate-700 text-xs">No analysis history</p>
                <p className="text-slate-400 text-2xs mt-1">Upload a resume to kick off the AI engine.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => r.status === "COMPLETED" && router.push(`/candidate/ats/analysis/${r.id}`)}
                    className={clsx(
                      "group p-3 border rounded-[1rem] flex items-center gap-3 transition",
                      r.status === "COMPLETED"
                        ? "border-slate-100 hover:border-blue-200 bg-slate-50/30 hover:bg-blue-50/10 cursor-pointer"
                        : "border-slate-100 bg-slate-50/10 cursor-default opacity-80"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 flex-shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-900 transition">
                        {r.original_filename}
                      </p>
                      <p className="text-2xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                      {r.ats_score != null && (
                        <div className="mt-1.5 max-w-xs">
                          <ProgressBar value={r.ats_score} size="sm" showValue={false} animated={false} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {r.ats_score != null ? (
                        <span className="text-sm font-black text-slate-700 tabular-nums">
                          {r.ats_score}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {r.status === "COMPLETED" && (
                          <ChevronRight size={12} className="text-slate-400 group-hover:text-[#0D47A1] group-hover:translate-x-0.5 transition" />
                        )}
                        <button
                          onClick={(e) => handleDelete(r.id, e)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </UnifiedLayout>
  );
}
