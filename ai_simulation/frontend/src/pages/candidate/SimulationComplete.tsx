import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptsApi } from '@/services/api';

export const SimulationComplete: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attemptsApi.getReport(parseInt(attemptId!)).then(r => setReport(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [attemptId]);

  const score = report?.total_score || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg text-center">
        {loading ? (
          <div className="text-slate-400">Evaluating your simulation...</div>
        ) : (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Simulation Complete!</h1>
            <p className="text-slate-500 mb-8">Your responses have been evaluated by AI. Here's your summary:</p>

            <div className="bg-white backdrop-blur border border-slate-200 rounded-2xl p-8 mb-6">
              <div className="text-5xl font-bold text-slate-900 mb-1">{score.toFixed(1)}</div>
              <div className="text-slate-500 text-sm mb-6">out of 100</div>

              {/* Round scores */}
              {report?.round_scores && (
                <div className="space-y-2 mb-6 text-left">
                  {Object.entries(report.round_scores).map(([rk, s]: any) => {
                    const labels: Record<string, string> = { round_1: 'Requirement Analysis', round_2: 'Technical Execution', round_3: 'Architecture', round_4: 'Communication', round_5: 'Debugging' };
                    return (
                      <div key={rk} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-40">{labels[rk] || rk}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-900 w-10 text-right">{s.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                  report?.cheating_risk_level === 'LOW' ? 'bg-green-50 text-green-600 border-green-200' :
                  report?.cheating_risk_level === 'HIGH' || report?.cheating_risk_level === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  Integrity: {report?.cheating_risk_level || 'LOW'}
                </div>
              </div>
            </div>

            {report?.evaluation_report?.summary && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 text-left">
                <p className="text-xs text-slate-400 mb-2">AI Summary</p>
                <p className="text-sm text-slate-600 leading-relaxed">{report.evaluation_report.summary}</p>
              </div>
            )}

            <div className="space-y-3">
              <button onClick={() => navigate('/candidate/dashboard')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-slate-900 font-semibold transition shadow-lg shadow-indigo-600/20 text-sm">
                Go to Dashboard
              </button>
              <button onClick={() => navigate('/candidate/internships')}
                className="w-full py-3 rounded-xl border border-slate-300/60 text-slate-600 hover:text-slate-900 hover:border-gray-600 transition text-sm">
                Browse More Internships
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
