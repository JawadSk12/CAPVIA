/**
 * frontend/store/atsStore.ts
 * ───────────────────────────
 * Zustand store for ATS analysis state.
 * Manages upload pipeline, status polling, analysis results, and SSE rewrites.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  ATSAnalysisResponse,
  ProcessingStatus,
  ResumeSummary,
  ResumeUploadResponse,
  RewriteSuggestion,
} from "@/types/ats";
import { resumeApi } from "@/features/ats/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadState {
  file: File | null;
  resumeId: string | null;
  uploadProgress: number;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  stageLabel: string;
  error: string | null;
}

interface RewriteState {
  section: string | null;
  isGenerating: boolean;
  streamingText: string;
  finalResult: RewriteSuggestion | null;
  error: string | null;
}

interface ATSState {
  upload: UploadState;
  analysisResult: ATSAnalysisResponse | null;
  isLoadingResult: boolean;
  rewrite: RewriteState;
  history: ResumeSummary[];
  isLoadingHistory: boolean;
  // Convenience flat accessors for components
  isUploading: boolean;
  uploadProgress: number;
}

interface ATSActions {
  /** Upload file and begin AI pipeline. Returns the raw upload response. */
  startUpload: (
    file: File,
    mode?: "GLOBAL" | "INTERNSHIP",
    jdId?: string,
  ) => Promise<ResumeUploadResponse>;

  /** Legacy alias for startUpload (keeps atsStore API compatible) */
  uploadResume: (file: File, mode?: "GLOBAL" | "INTERNSHIP", jdId?: string) => Promise<void>;

  startPolling: (resumeId: string) => void;
  stopPolling:  () => void;

  loadAnalysis:  (resumeId: string) => Promise<void>;
  clearAnalysis: () => void;

  requestRewrite: (section: string, resumeId?: string) => Promise<void>;
  clearRewrite:   () => void;

  loadHistory: () => Promise<void>;
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const initialUpload: UploadState = {
  file: null,
  resumeId: null,
  uploadProgress: 0,
  processingStatus: "PENDING",
  processingProgress: 0,
  stageLabel: "",
  error: null,
};

const initialRewrite: RewriteState = {
  section: null,
  isGenerating: false,
  streamingText: "",
  finalResult: null,
  error: null,
};

let pollingInterval: ReturnType<typeof setInterval> | null = null;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useATSStore = create<ATSState & ATSActions>()(
  immer((set, get) => ({
    upload: { ...initialUpload },
    analysisResult: null,
    isLoadingResult: false,
    rewrite: { ...initialRewrite },
    history: [],
    isLoadingHistory: false,

    // Flat convenience accessors
    isUploading: false,
    uploadProgress: 0,

    // ── Upload ─────────────────────────────────────────────────────────────

    startUpload: async (file, mode = "GLOBAL", jdId) => {
      set((s) => {
        s.upload = { ...initialUpload, file, stageLabel: "Uploading…" };
        s.analysisResult = null;
        s.isUploading = true;
        s.uploadProgress = 0;
      });

      try {
        const response = await resumeApi.upload(file, mode, jdId, (pct) => {
          set((s) => {
            s.upload.uploadProgress = pct;
            s.uploadProgress = pct;
          });
        });

        set((s) => {
          s.upload.resumeId = response.resume_id;
          s.upload.processingStatus = response.status;
          s.upload.stageLabel = "Processing started…";
          s.isUploading = false;
          s.uploadProgress = 100;
        });

        get().startPolling(response.resume_id);
        return response;
      } catch (err: any) {
        set((s) => {
          s.upload.error = err?.response?.data?.detail ?? "Upload failed";
          s.upload.processingStatus = "ERROR";
          s.isUploading = false;
        });
        throw err;
      }
    },

    uploadResume: async (file, mode = "GLOBAL", jdId) => {
      await get().startUpload(file, mode, jdId);
    },

    // ── Polling ────────────────────────────────────────────────────────────

    startPolling: (resumeId) => {
      if (pollingInterval) clearInterval(pollingInterval);

      pollingInterval = setInterval(async () => {
        try {
          const status = await resumeApi.getStatus(resumeId);
          set((s) => {
            s.upload.processingStatus   = status.status;
            s.upload.processingProgress = status.progress_percent;
            s.upload.stageLabel         = status.stage_label;
            if (status.error_message) s.upload.error = status.error_message;
          });

          if (status.status === "DONE" || status.status === "COMPLETED" || status.status === "ERROR" || status.status === "FAILED") {
            get().stopPolling();
            if (status.status === "DONE" || status.status === "COMPLETED") {
              await get().loadAnalysis(resumeId);
            }
          }
        } catch (e) {
          console.warn("Status polling error:", e);
        }
      }, 2500);
    },

    stopPolling: () => {
      if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
    },

    // ── Analysis ───────────────────────────────────────────────────────────

    loadAnalysis: async (resumeId) => {
      set((s) => { s.isLoadingResult = true; });
      try {
        const result = await resumeApi.getAnalysis(resumeId);
        set((s) => { s.analysisResult = result; s.isLoadingResult = false; });
      } catch (err: any) {
        set((s) => {
          s.isLoadingResult = false;
          s.upload.error = err?.response?.data?.detail ?? "Failed to load analysis";
        });
      }
    },

    clearAnalysis: () => set((s) => { s.analysisResult = null; }),

    // ── Rewrite SSE ────────────────────────────────────────────────────────

    requestRewrite: async (section, resumeId) => {
      const rid = resumeId ?? get().upload.resumeId;
      if (!rid) return;

      set((s) => {
        s.rewrite = { section, isGenerating: true, streamingText: "", finalResult: null, error: null };
      });

      try {
        const response = await resumeApi.requestRewrite(rid, section);
        const reader = (response as any).body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  set((s) => { s.rewrite.streamingText += data.text; });
                } else if (data.type === "complete") {
                  set((s) => { s.rewrite.isGenerating = false; s.rewrite.finalResult = data.result; });
                } else if (data.type === "error") {
                  set((s) => { s.rewrite.isGenerating = false; s.rewrite.error = data.message; });
                }
              } catch { /* ignore malformed SSE */ }
            }
          }
        }
        set((s) => { s.rewrite.isGenerating = false; });
      } catch {
        set((s) => { s.rewrite.isGenerating = false; s.rewrite.error = "Rewrite failed"; });
      }
    },

    clearRewrite: () => set((s) => { s.rewrite = { ...initialRewrite }; }),

    // ── History ────────────────────────────────────────────────────────────

    loadHistory: async () => {
      set((s) => { s.isLoadingHistory = true; });
      try {
        const history = await resumeApi.getHistory();
        set((s) => { s.history = history; s.isLoadingHistory = false; });
      } catch {
        set((s) => { s.isLoadingHistory = false; });
      }
    },

    // ── Reset ──────────────────────────────────────────────────────────────

    reset: () => {
      get().stopPolling();
      set((s) => {
        s.upload = { ...initialUpload };
        s.analysisResult = null;
        s.rewrite = { ...initialRewrite };
        s.isUploading = false;
        s.uploadProgress = 0;
      });
    },
  })),
);