"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import FileUpload from "@/components/shared/FileUpload";
import { StageProgress } from "@/components/shared/ProgressBar";
import { resumeApi, internshipApi } from "@/lib/api";
import { useATSStore } from "@/store/atsStore";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Globe,
} from "lucide-react";
import type { InternshipSummary } from "@/types/ats";
import { useEffect } from "react";
import clsx from "clsx";

const STAGES = [
  { label: "OCR / Parse" },
  { label: "NER Extract" },
  { label: "Embed" },
  { label: "Score" },
];

type UploadMode = "GLOBAL" | "INTERNSHIP";

export default function UploadPage() {
  const router = useRouter();
  const { uploadProgress, isUploading, startUpload } = useATSStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<UploadMode>("GLOBAL");
  const [selectedJd, setSelectedJd] = useState<string>("");
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [resumeId, setResumeId] = useState<string | null>(null);

  useEffect(() => {
    internshipApi.list(true).then(setInternships).catch(() => {});
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
        mode === "INTERNSHIP" ? selectedJd : undefined,
      );
      setResumeId(resp.resume_id);
      setProcessing(true);
      // Simulate stage polling
      const stageInterval = setInterval(() => {
        setCurrentStage((s) => {
          if (s >= STAGES.length - 1) {
            clearInterval(stageInterval);
            setTimeout(() => router.push(`/student/analysis/${resp.resume_id}`), 800);
          }
          return Math.min(s + 1, STAGES.length);
        });
      }, 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      toast.error(msg);
    }
  };

  const stages = STAGES.map((s, i) => ({
    ...s,
    complete: i < currentStage,
    active: i === currentStage && processing,
  }));

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 page-container max-w-3xl">
          <div className="mb-8 animate-slide-up">
            <h1 className="section-title text-2xl">Upload Resume</h1>
            <p className="section-subtitle">
              Upload your resume and our AI pipeline will score it in under 60 seconds.
            </p>
          </div>

          {/* Analysis mode */}
          <div className="card p-6 mb-6 animate-slide-up delay-100">
            <h2 className="font-semibold text-slate-700 mb-4 text-sm">Analysis Mode</h2>
            <div className="grid grid-cols-2 gap-3">
              {([
                {
                  value: "GLOBAL",
                  label: "Global ATS Score",
                  icon: Globe,
                  desc: "Score against 50+ role templates",
                },
                {
                  value: "INTERNSHIP",
                  label: "Internship Match",
                  icon: BookOpen,
                  desc: "Compare against a specific JD",
                },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-150",
                    mode === value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <Icon size={22} />
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* JD Selector */}
            {mode === "INTERNSHIP" && (
              <div className="mt-4">
                <label className="label">Select Internship</label>
                <select
                  value={selectedJd}
                  onChange={(e) => setSelectedJd(e.target.value)}
                  className="input"
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
          </div>

          {/* Drop zone */}
          <div className="card p-6 mb-6 animate-slide-up delay-200">
            <h2 className="font-semibold text-slate-700 mb-4 text-sm">Your Resume</h2>
            <FileUpload
              onFileSelect={setSelectedFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </div>

          {/* Processing stages */}
          {processing && (
            <div className="card p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit size={18} className="text-indigo-600 animate-pulse" />
                <h2 className="font-semibold text-slate-700 text-sm">AI Pipeline Running</h2>
              </div>
              <StageProgress stages={stages} />
              <p className="text-xs text-slate-400 mt-4 text-center">
                This typically takes 30–60 seconds. We&apos;ll redirect you automatically.
              </p>
            </div>
          )}

          {/* Submit */}
          {!processing && (
            <div className="animate-slide-up delay-300">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="btn-primary w-full btn-lg"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    Start Analysis
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                Supports PDF, DOC, DOCX · Max 10MB · Your data is encrypted
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
