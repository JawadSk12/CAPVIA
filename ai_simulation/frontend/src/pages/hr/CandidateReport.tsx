import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipsApi, attemptsApi } from '@/services/api';

const ScoreBar = ({ label, score }: { label: string; score: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{score.toFixed(1)}/100</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
        style={{ width: `${score}%` }} />
    </div>
  </div>
);

export const CandidateReport: React.FC = () => {
  const { id, candidateId } = useParams<{ id: string; candidateId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find attempt for this candidate in this internship via rankings
    internshipsApi.getRankings(parseInt(id!))
      .then(r => {
        const entry = r.data.rankings?.find((e: any) => e.candidate_id === parseInt(candidateId!));
        if (entry?.attempt_id) return attemptsApi.getReport(entry.attempt_id);
        throw new Error('Not found');
      })
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, candidateId]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading report...</div>;
  if (!report) return <div className="p-8 text-center text-slate-500">Report not found</div>;

  const ev = report.evaluation_report || {};
  const roundLabels: Record<string, string> = {
    round_1: 'Requirement Analysis', round_2: 'Technical Execution',
    round_3: 'Architecture', round_4: 'Communication', round_5: 'Debugging',
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate(`/hr/internships/${id}/rankings`)} className="text-sm text-slate-400 hover:text-slate-600 transition mb-6 flex items-center gap-1">← Back to Rankings</button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-500">
                {(report.candidate?.name || 'C')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{report.candidate?.name}</h1>
                <p className="text-xs text-slate-400">{report.candidate?.email}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600">{report.role}</span>
              {report.specialization && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600">{report.specialization}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{report.total_score?.toFixed(1)}</p>
            <p className="text-xs text-slate-400">/ 100</p>
            <div className="mt-2">
              {ev.recommendation === 'hire' && <span className="text-xs px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-600 font-semibold">✓ Recommend Hire</span>}
              {ev.recommendation === 'consider' && <span className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">~ Consider</span>}
              {ev.recommendation === 'reject' && <span className="text-xs px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 font-semibold">✗ Reject</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Round Scores */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Round Scores</h2>
        <div className="space-y-3">
          {Object.entries(report.round_scores || {}).map(([rk, score]: any) => (
            <ScoreBar key={rk} label={roundLabels[rk] || rk} score={score} />
          ))}
        </div>
      </div>

      {/* Integrity */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Behavioral Integrity</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Cheating Risk</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
              report.cheating_risk_level === 'LOW' ? 'bg-green-50 text-green-600 border-green-200' :
              report.cheating_risk_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-red-50 text-red-600 border-red-200'}`}>
              {report.cheating_risk_level}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${report.cheating_risk_score || 0}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">{(report.cheating_risk_score || 0).toFixed(0)}/100 risk score</p>
          <p className="text-xs text-slate-400 mt-1">{report.behavior_events} behavioral events logged</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Dependency</h3>
          <p className={`text-3xl font-bold mb-2 ${(report.ai_dependency_score || 0) >= 60 ? 'text-red-600' : (report.ai_dependency_score || 0) >= 30 ? 'text-amber-400' : 'text-green-600'}`}>
            {(report.ai_dependency_score || 0).toFixed(0)}%
          </p>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full ${(report.ai_dependency_score || 0) >= 60 ? 'bg-red-500' : (report.ai_dependency_score || 0) >= 30 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${report.ai_dependency_score || 0}%` }} />
          </div>
          <p className="text-xs text-slate-400">{(report.ai_dependency_score || 0) >= 60 ? 'High AI tool usage detected' : (report.ai_dependency_score || 0) >= 30 ? 'Moderate AI assistance possible' : 'Likely independent work'}</p>
        </div>
      </div>

      {/* Strengths & Improvements */}
      {(ev.strengths || ev.areas_for_improvement) && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-green-600 mb-3">💪 Strengths</h3>
            <ul className="space-y-2">
              {(ev.strengths || []).map((s: string, i: number) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2"><span className="text-green-600 mt-0.5">✓</span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">⚡ Areas to Improve</h3>
            <ul className="space-y-2">
              {(ev.areas_for_improvement || []).map((s: string, i: number) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2"><span className="text-amber-400 mt-0.5">→</span>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary */}
      {ev.summary && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">AI Summary</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{ev.summary}</p>
          {report.submitted_at && <p className="text-xs text-slate-500 mt-3">Submitted: {new Date(report.submitted_at).toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
};
