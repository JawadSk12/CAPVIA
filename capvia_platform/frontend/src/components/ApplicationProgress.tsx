'use client';

interface ApplicationProgressProps {
  currentStatus: string;
  isTerminal?: boolean;
}

const STAGES = [
  { key: 'APPLIED', label: 'Applied', icon: '📨', description: 'Application received' },
  { key: 'ATS', label: 'Resume Screen', icon: '🤖', description: 'AI resume analysis' },
  { key: 'SIMULATION', label: 'Simulation', icon: '🎯', description: 'Skills assessment' },
  { key: 'INTERVIEW', label: 'Interview', icon: '🎤', description: 'AI video interview' },
  { key: 'DECISION', label: 'Decision', icon: '⭐', description: 'Final evaluation' },
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
      <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>↩️</div>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Application Withdrawn</p>
      </div>
    );
  }

  if (currentStatus === 'HIRED') {
    return (
      <div style={{ padding: '24px', borderRadius: '14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎊</div>
        <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>Congratulations!</p>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(74,222,128,0.7)' }}>You've been hired!</p>
      </div>
    );
  }

  if (currentStatus === 'REJECTED') {
    return (
      <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(248,113,113,0.8)', fontWeight: 600 }}>Application Reviewed</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Thank you for your interest.</p>
      </div>
    );
  }

  const activeStageIdx = STATUS_TO_STAGE_INDEX[currentStatus] ?? 0;
  const activeState = STATUS_WITHIN_STAGE[currentStatus] ?? 'pending';

  return (
    <div style={{ padding: '20px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ margin: '0 0 20px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>YOUR PROGRESS</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStageIdx || (idx === activeStageIdx && activeState === 'done');
          const isActive = idx === activeStageIdx && activeState !== 'done';
          const isPending = idx > activeStageIdx;
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {/* Node + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  background: isDone ? 'linear-gradient(135deg, #4ade80, #22c55e)' : isActive ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : 'rgba(255,255,255,0.07)',
                  border: isActive ? '2px solid rgba(167,139,250,0.6)' : isDone ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isActive ? '0 0 16px rgba(167,139,250,0.4)' : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  {isDone ? '✓' : stage.icon}
                </div>
                {!isLast && (
                  <div style={{ width: '2px', height: '28px', background: isDone ? 'linear-gradient(180deg, #4ade80, rgba(74,222,128,0.3))' : 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: isLast ? 0 : '20px', paddingTop: '6px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: isDone || isActive ? 700 : 500, color: isDone ? '#4ade80' : isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                  {stage.label}
                  {isActive && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 700 }}>
                      IN PROGRESS
                    </span>
                  )}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: isPending ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)' }}>
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
