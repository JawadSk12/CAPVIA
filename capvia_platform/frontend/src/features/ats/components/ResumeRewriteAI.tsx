"use client";

import { useState } from "react";
import { resumeApi } from "@/features/ats/services/api";
import type { ATSAnalysisResponse } from "@/types/ats";
import { Sparkles, Wand2, Copy, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

interface ResumeRewriteAIProps {
  resumeId: string;
  analysis: ATSAnalysisResponse | any;
}

const SECTIONS = [
  "Summary",
  "Work Experience",
  "Skills",
  "Education",
  "Projects",
  "Achievements",
];

export default function ResumeRewriteAI({ resumeId, analysis }: ResumeRewriteAIProps) {
  const [selectedSection, setSelectedSection] = useState("Summary");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRewrite = async () => {
    setStreaming(true);
    setOutput("");
    try {
      const response = await resumeApi.requestRewrite(
        resumeId,
        selectedSection,
        analysis?.detected_role,
      );

      // Read the SSE stream from fetch response body
      const body = (response as any).body as ReadableStream<Uint8Array>;
      const reader = body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE data lines
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              setOutput((prev) => prev + (parsed.token ?? parsed.text ?? ""));
            } catch {
              setOutput((prev) => prev + data);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error("Rewrite failed. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          AI Resume Rewriter
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Select a section and let GPT-4-grade AI rewrite it to maximize your ATS score for{" "}
          <b>{analysis?.detected_role ?? "your target role"}</b>.
        </p>

        {/* Section selector */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSection(s)}
              className={
                selectedSection === s
                  ? "btn-primary btn-sm"
                  : "btn-ghost btn-sm border border-slate-200"
              }
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={handleRewrite}
          disabled={streaming}
          className="btn-primary gap-2 w-full sm:w-auto"
        >
          {streaming ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Rewrite {selectedSection}
            </>
          )}
        </button>
      </div>

      {/* Output */}
      {(output || streaming) && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" />
              AI-Rewritten: {selectedSection}
            </h3>
            {output && !streaming && (
              <button onClick={handleCopy} className="btn-ghost btn-sm gap-1.5">
                {copied ? (
                  <>
                    <CheckCheck size={13} className="text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 min-h-24 font-mono text-sm text-slate-700 leading-relaxed whitespace-pre-wrap relative">
            {output}
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {!streaming && output && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
              <p className="text-xs text-indigo-700">
                <b>💡 Tip:</b> Copy this rewritten section and replace the corresponding part in your original resume document.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
