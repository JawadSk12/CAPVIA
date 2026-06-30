'use client';

import { Check, Loader2, AlertCircle, Sparkles, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface ApplicationProgressProps {
  currentStatus: string;
  isTerminal?: boolean;
}

const STAGES = [
  { key: 'APPLIED', label: 'Applied', icon: '📨', description: 'Application dossier received' },
  { key: 'ATS', label: 'Resume Review', icon: '🤖', description: 'AI ATS resume screen' },
  { key: 'SIMULATION', label: 'Simulation', icon: '🎯', description: 'Technical skills test' },
  { key: 'INTERVIEW', label: 'Interview', icon: '🎤', description: 'AI video interview' },
  { key: 'DECISION', label: 'Decision', icon: '⭐', description: 'Final recruiter evaluation' },
];

const STATUS_TO_STAGE_INDEX: Record<string, number> = {
  APPLIED:                  0,
  ATS_PENDING:              1,
  ATS_COMPLETED:            1,
  SIMULATION_INVITED:       2,
  SIMULATION_IN_PROGRESS:   2,
  SIMULATION_COMPLETED:     2,
  INTERVIEW_INVITED:        3,
  INTERVIEW_IN_PROGRESS:    3,
  INTERVIEW_COMPLETED:      3,
  EVALUATED:                4,
  EVALUATED_LOCAL_BASELINE: 4,
  SHORTLISTED:              4,
  HIRED:                    4,
  REJECTED:                 4,
  WITHDRAWN:                -1,
};

const STATUS_WITHIN_STAGE: Record<string, 'pending' | 'active' | 'done'> = {
  APPLIED:                  'done',
  ATS_PENDING:              'active',
  ATS_COMPLETED:            'done',
  SIMULATION_INVITED:       'active',
  SIMULATION_IN_PROGRESS:   'active',
  SIMULATION_COMPLETED:     'done',
  INTERVIEW_INVITED:        'active',
  INTERVIEW_IN_PROGRESS:    'active',
  INTERVIEW_COMPLETED:      'done',
  EVALUATED:                'done',
  EVALUATED_LOCAL_BASELINE: 'done',
  SHORTLISTED:              'done',
  HIRED:                    'done',
  REJECTED:                 'done',
  WITHDRAWN:                'done',
};

export default function ApplicationProgress({ currentStatus, isTerminal = false }: ApplicationProgressProps) {
  if (currentStatus === 'WITHDRAWN') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-[20px] p-6 text-center shadow-sm">
        <div className="text-3xl mb-2">↩️</div>
        <p className="font-bold text-slate-800 text-sm">Application Withdrawn</p>
        <p className="text-slate-400 text-xs mt-1">This application was withdrawn and evaluations are disabled.</p>
      </div>
    );
  }

  if (currentStatus === 'HIRED') {
    return (
      <div className="bg-emerald-50 border border-emerald-250 rounded-[20px] p-6 text-center shadow-sm">
        <div className="text-4xl mb-3">🎉</div>
        <h4 className="font-extrabold text-emerald-800 text-base font-outfit">Hired & Selected!</h4>
        <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
          Congratulations! You completed all assessments and have been offered this internship role.
        </p>
      </div>
    );
  }

  if (currentStatus === 'REJECTED') {
    return (
      <div className="bg-red-50 border border-red-150 rounded-[20px] p-6 text-center shadow-sm">
        <div className="text-3xl mb-2">📋</div>
        <p className="font-bold text-red-800 text-sm">Application Closed</p>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          Recruitment reviews for this cohort have concluded. We appreciate your participation.
        </p>
      </div>
    );
  }

  const activeStageIdx = STATUS_TO_STAGE_INDEX[currentStatus] ?? 0;
  const activeState = STATUS_WITHIN_STAGE[currentStatus] ?? 'pending';

  return (
    <div className="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Recruitment Timeline
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full">
          <Loader2 size={10} className="animate-spin text-[#0D47A1]" />
          Real-time
        </span>
      </div>

      <div className="relative pl-1">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStageIdx || (idx === activeStageIdx && activeState === 'done');
          const isActive = idx === activeStageIdx && activeState !== 'done';
          const isPending = idx > activeStageIdx;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} className="flex gap-4 items-start relative group">
              {/* Stepper Node Column */}
              <div className="flex flex-col items-center flex-shrink-0 relative">
                {/* Visual Step Indicator */}
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isDone ? '#10B981' : isActive ? '#0D47A1' : '#FFFFFF',
                    borderColor: isDone ? '#10B981' : isActive ? '#0D47A1' : '#E2E8F0',
                  }}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-sm z-10`}
                >
                  {isDone ? (
                    <Check size={16} className="text-white font-bold" />
                  ) : isActive ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-semibold">{idx + 1}</span>
                  )}
                </motion.div>

                {/* Vertical Connector Line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-12 my-1 transition-colors duration-300 ${
                      isDone ? 'bg-[#10B981]' : 'bg-slate-100'
                    }`}
                  />
                )}
              </div>

              {/* Text Description Column */}
              <div className="pt-1.5 pb-6">
                <div className="flex items-center gap-2">
                  <h5
                    className={`text-sm font-bold transition-colors ${
                      isDone ? 'text-emerald-700' : isActive ? 'text-[#0D47A1]' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </h5>
                  {isActive && (
                    <span className="inline-flex items-center text-[9px] font-bold bg-blue-50 text-[#0D47A1] px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                      Active
                    </span>
                  )}
                  {isDone && (
                    <span className="text-emerald-600 font-medium text-xs">✓ Done</span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 transition-colors leading-relaxed ${
                    isPending ? 'text-slate-350' : 'text-slate-500 font-medium'
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
