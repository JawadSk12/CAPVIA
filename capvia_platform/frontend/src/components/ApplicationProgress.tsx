'use client';

import React from 'react';
import { Check, Loader2, Sparkles, Trophy, Video, FileText, Code2, AlertTriangle, ShieldCheck, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface ApplicationProgressProps {
  currentStatus: string;
  isTerminal?: boolean;
  resumeUrl?: string | null;
  atsScore?: number | null;
  simulationScore?: number | null;
  interviewScore?: number | null;
  events?: any[];
}

const STAGES = [
  { key: 'APPLIED', label: 'Applied', description: 'Application dossier received', icon: <Mail className="w-4 h-4" /> },
  { key: 'RESUME_UPLOADED', label: 'Resume Uploaded', description: 'Resume PDF successfully stored', icon: <FileText className="w-4 h-4" /> },
  { key: 'ATS', label: 'ATS Screening', description: 'AI ATS resume screen', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'SIMULATION_INVITED', label: 'Assessment Invited', description: 'Coding challenge invitation sent', icon: <Code2 className="w-4 h-4" /> },
  { key: 'SIMULATION_IN_PROGRESS', label: 'Assessment In Progress', description: 'Coding simulation active', icon: <Loader2 className="w-4 h-4" /> },
  { key: 'SIMULATION_COMPLETED', label: 'Assessment Completed', description: 'Coding challenge submitted', icon: <Check className="w-4 h-4" /> },
  { key: 'INTERVIEW_INVITED', label: 'Interview Invited', description: 'Speech voice kiosk ready', icon: <Video className="w-4 h-4" /> },
  { key: 'INTERVIEW_IN_PROGRESS', label: 'Interview In Progress', description: 'Proctoring feed streaming', icon: <Loader2 className="w-4 h-4" /> },
  { key: 'INTERVIEW_COMPLETED', label: 'Interview Completed', description: 'Speech recordings finalized', icon: <Check className="w-4 h-4" /> },
  { key: 'EVALUATED', label: 'AI Evaluation Complete', description: 'DNA matching & profiling ready', icon: <Trophy className="w-4 h-4" /> },
  { key: 'SHORTLISTED', label: 'Recruiter Review', description: 'Shortlist review active', icon: <ShieldCheck className="w-4 h-4" /> },
  { key: 'DECISION', label: 'Final Decision', description: 'Hiring decision finalized', icon: <Sparkles className="w-4 h-4" /> },
];

// Helper to determine status order index
const STATUS_ORDER: Record<string, number> = {
  APPLIED:                  0,
  ATS_PENDING:              2,
  ATS_COMPLETED:            3,
  SIMULATION_INVITED:       4,
  SIMULATION_IN_PROGRESS:   5,
  SIMULATION_COMPLETED:     6,
  INTERVIEW_INVITED:        7,
  INTERVIEW_IN_PROGRESS:    8,
  INTERVIEW_COMPLETED:      9,
  EVALUATED:                10,
  EVALUATED_LOCAL_BASELINE: 10,
  SHORTLISTED:              11,
  HIRED:                    12,
  REJECTED:                 12,
  WITHDRAWN:                -1,
};

export default function ApplicationProgress({
  currentStatus,
  isTerminal = false,
  resumeUrl,
  atsScore,
  simulationScore,
  interviewScore,
  events = [],
}: ApplicationProgressProps) {

  if (currentStatus === 'WITHDRAWN') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-center shadow-sm">
        <div className="text-3xl mb-2">↩️</div>
        <p className="font-bold text-slate-800 text-sm">Application Withdrawn</p>
        <p className="text-slate-400 text-xs mt-1">This application was withdrawn and evaluations are disabled.</p>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER[currentStatus] ?? 0;

  // Extract timestamps from application events
  const getEventTime = (stageKey: string) => {
    let matchedEvent = null;
    if (stageKey === 'APPLIED') {
      matchedEvent = events.find(e => e.event_type === 'APPLICATION_SUBMITTED');
    } else if (stageKey === 'RESUME_UPLOADED') {
      matchedEvent = events.find(e => e.event_type === 'APPLICATION_SUBMITTED'); // Same time as applied
    } else if (stageKey === 'ATS') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_ATS_COMPLETED');
    } else if (stageKey === 'SIMULATION_INVITED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_SIMULATION_INVITED');
    } else if (stageKey === 'SIMULATION_COMPLETED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_SIMULATION_COMPLETED');
    } else if (stageKey === 'INTERVIEW_INVITED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_INTERVIEW_INVITED');
    } else if (stageKey === 'INTERVIEW_COMPLETED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_INTERVIEW_COMPLETED');
    } else if (stageKey === 'EVALUATED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_EVALUATED' || e.event_type === 'STATUS_UPDATED_EVALUATED_LOCAL_BASELINE');
    } else if (stageKey === 'SHORTLISTED') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_SHORTLISTED');
    } else if (stageKey === 'DECISION') {
      matchedEvent = events.find(e => e.event_type === 'STATUS_UPDATED_HIRED' || e.event_type === 'STATUS_UPDATED_REJECTED');
    }
    
    if (matchedEvent) {
      const d = new Date(matchedEvent.created_at);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Recruitment Timeline
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#0D47A1] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
          <Loader2 size={10} className="animate-spin text-[#0D47A1]" />
          Real-time updates
        </span>
      </div>

      <div className="relative pl-1 space-y-1">
        {STAGES.map((stage, idx) => {
          let isDone = false;
          let isActive = false;

          // Determine done / active per stage
          if (stage.key === 'APPLIED') {
            isDone = true;
          } else if (stage.key === 'RESUME_UPLOADED') {
            isDone = !!resumeUrl;
          } else if (stage.key === 'ATS') {
            isDone = currentIdx > 2;
            isActive = currentStatus === 'ATS_PENDING';
          } else if (stage.key === 'SIMULATION_INVITED') {
            isDone = currentIdx >= 4;
            isActive = currentStatus === 'ATS_COMPLETED';
          } else if (stage.key === 'SIMULATION_IN_PROGRESS') {
            isDone = currentIdx > 5;
            isActive = currentStatus === 'SIMULATION_IN_PROGRESS' || currentStatus === 'SIMULATION_INVITED';
          } else if (stage.key === 'SIMULATION_COMPLETED') {
            isDone = currentIdx >= 6;
          } else if (stage.key === 'INTERVIEW_INVITED') {
            isDone = currentIdx >= 7;
            isActive = currentStatus === 'SIMULATION_COMPLETED';
          } else if (stage.key === 'INTERVIEW_IN_PROGRESS') {
            isDone = currentIdx > 8;
            isActive = currentStatus === 'INTERVIEW_IN_PROGRESS' || currentStatus === 'INTERVIEW_INVITED';
          } else if (stage.key === 'INTERVIEW_COMPLETED') {
            isDone = currentIdx >= 9;
          } else if (stage.key === 'EVALUATED') {
            isDone = currentIdx >= 10;
            isActive = currentStatus === 'INTERVIEW_COMPLETED';
          } else if (stage.key === 'SHORTLISTED') {
            isDone = currentIdx >= 11;
            isActive = currentStatus === 'EVALUATED' || currentStatus === 'EVALUATED_LOCAL_BASELINE';
          } else if (stage.key === 'DECISION') {
            isDone = currentIdx >= 12;
            isActive = currentStatus === 'SHORTLISTED';
          }

          const isLast = idx === STAGES.length - 1;
          const timestamp = getEventTime(stage.key);

          // Inline scores
          let scoreBadge = null;
          if (stage.key === 'ATS' && atsScore !== null && atsScore !== undefined) {
            scoreBadge = (
              <span className="text-[10px] font-black text-[#0D47A1] bg-blue-50 border border-blue-150 px-2 py-0.5 rounded-full ml-2">
                {atsScore}% Match
              </span>
            );
          } else if (stage.key === 'SIMULATION_COMPLETED' && simulationScore !== null && simulationScore !== undefined) {
            scoreBadge = (
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-full ml-2">
                {simulationScore}% Score
              </span>
            );
          } else if (stage.key === 'INTERVIEW_COMPLETED' && interviewScore !== null && interviewScore !== undefined) {
            scoreBadge = (
              <span className="text-[10px] font-black text-pink-700 bg-pink-50 border border-pink-150 px-2 py-0.5 rounded-full ml-2">
                {interviewScore}% Score
              </span>
            );
          }

          return (
            <div key={stage.key} className="flex gap-4 items-start relative group">
              
              {/* Stepper Node Column */}
              <div className="flex flex-col items-center flex-shrink-0 relative">
                
                {/* Node representation */}
                {isDone ? (
                  <div className="w-8 h-8 rounded-full bg-[#0D47A1] border border-[#0D47A1] flex items-center justify-center shadow-sm z-10">
                    <Check size={14} className="text-white font-bold" />
                  </div>
                ) : isActive ? (
                  <div className="w-8 h-8 rounded-full border border-[#42A5F5] bg-[#08152E] shadow-[0_0_10px_rgba(66,165,245,0.45)] flex items-center justify-center z-10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#42A5F5] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#42A5F5]"></span>
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border border-dashed border-slate-200 bg-white flex items-center justify-center text-slate-400 z-10">
                    {stage.icon}
                  </div>
                )}

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-10 my-0.5 transition-colors duration-300 ${
                      isDone ? 'bg-[#0D47A1]' : isActive ? 'bg-gradient-to-b from-[#42A5F5] to-slate-100 border-dashed border-slate-200' : 'bg-slate-100'
                    }`}
                  />
                )}
              </div>

              {/* Text Description Column */}
              <div className="pt-1 pb-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <h5
                      className={`text-xs font-bold transition-colors ${
                        isDone ? 'text-slate-800' : isActive ? 'text-[#0D47A1]' : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </h5>
                    {scoreBadge}
                  </div>

                  {/* Timestamp / Status badge */}
                  {timestamp ? (
                    <span className="text-[9px] font-semibold text-slate-400">{timestamp}</span>
                  ) : isActive ? (
                    <span className="inline-flex items-center text-[9px] font-black bg-blue-50 text-[#0D47A1] px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                      Active
                    </span>
                  ) : null}
                </div>
                <p
                  className={`text-[10px] mt-0.5 transition-colors leading-relaxed ${
                    isDone ? 'text-slate-500 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {stage.description}
                </p>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
