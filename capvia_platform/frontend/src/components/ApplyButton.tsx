'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';
import {
  X, Send, AlertCircle, CheckCircle, FileText, ChevronRight,
  ChevronLeft, Loader2, Sparkles, Shield, Cpu, BarChart3,
  Upload, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../services/api';

interface ApplyButtonProps {
  internshipId: string;
  internshipTitle: string;
  isDeadlinePassed?: boolean;
  onSuccess?: (applicationId: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface AtsStatus {
  stage: 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'matching' | 'done' | 'redirecting' | 'error';
  progress: number;
  message: string;
}

const ATS_PIPELINE: Array<{ id: AtsStatus['stage']; label: string; sublabel: string; icon: typeof Cpu }> = [
  { id: 'uploading',  label: 'Resume Uploaded',    sublabel: 'Transmitting resume data',  icon: Upload },
  { id: 'parsing',   label: 'ATS Analysis Running', sublabel: 'Extracting text & matching',  icon: FileText },
  { id: 'redirecting', label: 'Launching Simulation',  sublabel: 'Redirecting to coding test', icon: Cpu },
];

export default function ApplyButton({
  internshipId,
  internshipTitle,
  isDeadlinePassed = false,
  onSuccess,
}: ApplyButtonProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [atsStatus, setAtsStatus] = useState<AtsStatus>({ stage: 'idle', progress: 0, message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const isHrOrAdmin = user?.role === 'hr' || user?.role === 'admin';

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  if (isHrOrAdmin) return null;

  if (isDeadlinePassed) {
    return (
      <button disabled className="w-full py-3.5 px-6 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
        <AlertCircle size={16} />
        Deadline Passed
      </button>
    );
  }

  if (success) {
    return (
      <div className="w-full py-3.5 px-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm text-center flex items-center justify-center gap-2">
        <CheckCircle size={16} className="text-emerald-600 animate-bounce" />
        Applied Successfully!
      </div>
    );
  }

  const resetModal = () => {
    setStep(1);
    setResumeFile(null);
    setCoverLetter('');
    setError(null);
    setAtsStatus({ stage: 'idle', progress: 0, message: '' });
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const handleOpen = () => { resetModal(); setShowModal(true); };
  
  const handleClose = () => {
    if (isSubmitting) return;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setShowModal(false);
    resetModal();
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setError('File size must be less than 10MB.');
      return;
    }
    setError(null);
    setResumeFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const pollApplicationStatus = (appId: string) => {
    setAtsStatus({ stage: 'parsing', progress: 50, message: 'ATS Analysis Running...' });
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get(`/applications/${appId}`);
        const app = response.data;
        
        if (['simulation_invited', 'simulation_started', 'simulation_completed', 'interview_invited', 'interview_completed', 'shortlisted', 'hired'].includes(app.status)) {
          clearInterval(pollIntervalRef.current);
          setAtsStatus({ stage: 'redirecting', progress: 100, message: 'Launching Simulation...' });
          
          // Auto-start simulation and redirect
          try {
            const { applicationsApi: simApi } = await import('@/features/simulation/services/api');
            const r = await simApi.startSimulation(appId);
            
            setTimeout(() => {
              setSuccess(true);
              setShowModal(false);
              router.push(`/candidate/simulation/${r.data.attempt_id}`);
            }, 1500);
          } catch (simErr) {
            console.error(simErr);
            setError('Could not start simulation automatically. Go to your dashboard to start.');
            setAtsStatus({ stage: 'error', progress: 100, message: 'Could not start simulation' });
          }
        }
      } catch (err) {
        console.error('Error polling application:', err);
      }
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!resumeFile) {
      setError('Resume upload is compulsory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStep(4);
    setAtsStatus({ stage: 'uploading', progress: 15, message: 'Uploading resume...' });
    
    let finalResumeUrl = '';

    try {
      // 1. Upload PDF resume
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('mode', 'GLOBAL');
      
      const { tokenStore } = await import('../features/ats/services/api');
      const token = tokenStore.get() || localStorage.getItem('capvia_access_token');
      
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData?.error || 'Failed to upload PDF resume.');
      }
      
      finalResumeUrl = resData.resume_url || resData.file_url || '';
      setAtsStatus({ stage: 'parsing', progress: 40, message: 'Creating application...' });

      // 2. Submit the application to the gateway
      const { applicationApi } = await import('../services/api');
      const result = await applicationApi.apply({
        internship_id: internshipId,
        cover_letter: coverLetter || undefined,
        resume_url: finalResumeUrl || undefined,
      });

      const appId = result.id || result.application_id;
      if (onSuccess) onSuccess(appId);

      // 3. Begin polling for ATS evaluation completion
      pollApplicationStatus(appId);

    } catch (err: any) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to submit application. Please try again.';
      setError(msg);
      setAtsStatus({ stage: 'error', progress: 0, message: msg });
      setStep(3); // Send back to review
      setIsSubmitting(false);
    }
  };

  const activePipelineIdx = ATS_PIPELINE.findIndex(s => s.id === atsStatus.stage);

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full py-3.5 px-6 rounded-xl bg-[#0D47A1] hover:bg-[#1565C0] text-white font-black text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#0D47A1]/30 flex items-center justify-center gap-2 group"
      >
        <Send size={15} className="group-hover:translate-x-0.5 transition-transform" />
        Apply Now
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />

            <motion.div
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="bg-[#0D47A1] p-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X size={14} />
                </button>

                {step < 4 && (
                  <div className="flex items-center gap-2 mb-3">
                    {([1, 2, 3] as WizardStep[]).map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                          s < step ? 'bg-emerald-400 text-white' :
                          s === step ? 'bg-white text-[#0D47A1]' :
                          'bg-white/20 text-white/50'
                        }`}>
                          {s < step ? <CheckCircle size={12} /> : s}
                        </div>
                        {s < 3 && <div className={`h-0.5 w-8 rounded ${s < step ? 'bg-emerald-400' : 'bg-white/20'}`} />}
                      </div>
                    ))}
                    <span className="text-blue-200/70 text-[10px] font-semibold ml-1">STEP {step} OF 3</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-[#FFC107] uppercase tracking-widest">
                    {internshipTitle.toUpperCase().slice(0, 30)}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white font-outfit">
                  {step === 1 && 'Attach Your Resume'}
                  {step === 2 && 'Cover Letter'}
                  {step === 3 && 'Review & Submit'}
                  {step === 4 && 'ATS Processing Pipeline'}
                </h2>
              </div>

              {/* Body */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* Step 1: Resume Upload */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                          <AlertCircle size={14} className="flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                          isDragging
                            ? 'border-[#0D47A1] bg-[#0D47A1]/5 scale-[0.98]'
                            : resumeFile
                            ? 'border-emerald-300 bg-emerald-50/10'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                          accept=".pdf"
                          className="hidden"
                        />
                        
                        {resumeFile ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-650">
                              <FileText size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{resumeFile.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{(resumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setResumeFile(null);
                              }}
                              className="mt-1 flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100/70 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <Trash2 size={12} />
                              Remove File
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <Upload size={20} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">Drag & drop your PDF resume here</p>
                              <p className="text-[10px] text-slate-400 mt-1">Accept PDF format only (Max 10MB)</p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Cover Letter */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      <textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Hi team, I would love to join because..."
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 text-slate-800 placeholder:text-slate-300 resize-none transition-all"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-400">{coverLetter.length} characters</p>
                        <p className="text-[11px] text-slate-400">Optional</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Review & Submit */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                          <AlertCircle size={14} className="flex-shrink-0" />
                          {error}
                        </div>
                      )}
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resume Attachment</span>
                          <button onClick={() => setStep(1)} className="text-[10px] text-[#0D47A1] hover:underline font-bold">Change</button>
                        </div>
                        {resumeFile ? (
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <FileText size={14} className="text-slate-400" />
                            <span className="font-bold">{resumeFile.name}</span>
                            <span className="text-[10px] text-slate-400">({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        ) : (
                          <p className="text-xs text-red-500 italic font-bold">Resume upload is compulsory.</p>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cover Letter</span>
                          <button onClick={() => setStep(2)} className="text-[10px] text-[#0D47A1] hover:underline font-bold">Edit</button>
                        </div>
                        {coverLetter ? (
                          <p className="text-xs text-slate-700 line-clamp-4 leading-relaxed">{coverLetter}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No cover letter written</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Processing */}
                  {step === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                      {atsStatus.stage === 'error' && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
                          <AlertCircle size={14} />
                          {atsStatus.message}
                        </div>
                      )}

                      {/* Pipeline steps */}
                      <div className="space-y-2.5">
                        {ATS_PIPELINE.map((stage, i) => {
                          const Icon = stage.icon;
                          const isActive = stage.id === atsStatus.stage;
                          const isDone = activePipelineIdx > i || atsStatus.stage === 'done' || (stage.id === 'parsing' && atsStatus.stage === 'redirecting');
                          return (
                            <div
                              key={stage.id}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isActive ? 'bg-blue-50 border border-blue-100' :
                                isDone ? 'bg-emerald-50 border border-emerald-100 opacity-70' :
                                'bg-slate-50 border border-transparent opacity-40'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-[#0D47A1] text-white' : 'bg-slate-250 text-slate-400'
                              }`}>
                                {isDone ? <CheckCircle size={13} /> :
                                 isActive ? <Loader2 size={13} className="animate-spin" /> :
                                 <Icon size={13} />}
                              </div>
                              <div>
                                <p className={`text-xs font-bold ${isActive ? 'text-[#0D47A1]' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>{stage.label}</p>
                                <p className="text-[10px] text-slate-400">{stage.sublabel}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI PIPELINE PROGRESS</span>
                          <span className="text-[10px] font-black text-[#0D47A1]">{atsStatus.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#0D47A1] to-[#42A5F5] rounded-full"
                            animate={{ width: `${atsStatus.progress}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {step < 4 && (
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                  {step > 1 ? (
                    <button
                      onClick={() => setStep((s) => (s - 1) as WizardStep)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition-all"
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  ) : <div />}

                  {step < 3 ? (
                    <button
                      onClick={() => {
                        if (step === 1 && !resumeFile) {
                          setError('Resume upload is compulsory.');
                          return;
                        }
                        setError(null);
                        setStep((s) => (s + 1) as WizardStep);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white bg-[#0D47A1] hover:bg-[#0A3B85] text-xs font-bold transition-all"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white bg-[#0D47A1] hover:bg-[#0A3B85] text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Submit
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
