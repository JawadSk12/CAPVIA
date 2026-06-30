"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, File, X, CheckCircle, AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  className?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

const DEFAULT_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export default function FileUpload({
  onFileSelect,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  className,
  isUploading = false,
  uploadProgress = 0,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setError(null);
      if (rejected.length > 0) {
        const r = rejected[0];
        if (r.errors[0]?.code === "file-too-large") {
          setError(`File exceeds ${maxSizeMB}MB limit.`);
        } else if (r.errors[0]?.code === "file-invalid-type") {
          setError("Only PDF, DOC, and DOCX files are accepted.");
        } else {
          setError("Invalid file. Please try again.");
        }
        return;
      }
      if (accepted[0]) {
        setSelectedFile(accepted[0]);
        onFileSelect(accepted[0]);
      }
    },
    [maxSizeMB, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize: maxBytes,
    multiple: false,
    disabled: isUploading,
  });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={clsx("w-full", className)}>
      <div
        {...getRootProps()}
        className={clsx(
          "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragActive && !isDragReject
            ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
            : isDragReject
            ? "border-rose-400 bg-rose-50"
            : error
            ? "border-rose-300 bg-rose-50/50"
            : selectedFile
            ? "border-emerald-400 bg-emerald-50/50"
            : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          /* Upload progress */
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center">
              <CloudUpload size={26} className="text-indigo-600 animate-bounce" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Uploading…</p>
              <p className="text-sm text-slate-400">{selectedFile?.name}</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-indigo-600">{uploadProgress}%</p>
          </div>
        ) : selectedFile ? (
          /* File selected */
          <div className="space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{selectedFile.name}</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {formatFileSize(selectedFile.size)} · Ready to analyze
              </p>
            </div>
            <button
              onClick={clearFile}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors"
            >
              <X size={13} />
              Remove and select different file
            </button>
          </div>
        ) : (
          /* Default empty state */
          <div className="space-y-3">
            <div
              className={clsx(
                "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center transition-colors",
                isDragActive ? "bg-indigo-200" : "bg-slate-100"
              )}
            >
              {isDragReject ? (
                <AlertTriangle size={26} className="text-rose-500" />
              ) : (
                <CloudUpload
                  size={26}
                  className={isDragActive ? "text-indigo-600" : "text-slate-400"}
                />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-700">
                {isDragActive
                  ? isDragReject
                    ? "File type not supported"
                    : "Drop your resume here"
                  : "Drag & drop your resume"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                or{" "}
                <span className="text-indigo-600 font-medium underline underline-offset-2">
                  browse files
                </span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["PDF", "DOC", "DOCX"].map((ext) => (
                <span key={ext} className="badge badge-slate font-mono text-2xs">
                  .{ext.toLowerCase()}
                </span>
              ))}
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">Max {maxSizeMB}MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-rose-600 animate-fade-in">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
