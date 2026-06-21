import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipsApi } from '@/services/api';

const RiskBadge = ({ level }: { level: string }) => {
  const colors: Record<string, string> = {
    LOW: 'bg-green-50 text-green-600 border-green-200',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    HIGH: 'bg-orange-50 text-orange-600 border-orange-500/20',
    CRITICAL: 'bg-red-50 text-red-600 border-red-200',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[level] || colors.LOW}`}>{level}</span>;
};

const RecBadge = ({ rec }: { rec: string }) => {
  const styles: Record<string, string> = {
    hire: 'bg-green-50 text-green-600 border-green-200',
    consider: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    reject: 'bg-red-50 text-red-600 border-red-200',
  };
  return <span className={`text-xs px-2 py-1 rounded-full border font-semibold capitalize ${styles[rec] || styles.consider}`}>{rec === 'hire' ? '✓ Hire' : rec === 'reject' ? '✗ Reject' : '~ Consider'}</span>;
};

export const InternshipRankings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [internship, setInternship] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      internshipsApi.get(parseInt(id)),
      internshipsApi.getRankings(parseInt(id)),
    ]).then(([iRes, rRes]) => {
      setInternship(iRes.data);
      setData(rRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading rankings...</div>;

  const rankings = data?.rankings || [];
  const hires = rankings.filter((r: any) => r.recommendation === 'hire').length;
  const considers = rankings.filter((r: any) => r.recommendation === 'consider').length;
  const rejects = rankings.filter((r: any) => r.recommendation === 'reject').length;

  return (
    <div className="p-8">
      <button onClick={() => navigate(`/hr/internships/${id}`)} className="text-sm text-slate-400 hover:text-slate-600 transition mb-6 flex items-center gap-1">← Back to Internship</button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Candidate Rankings</h1>
        <p className="text-slate-500 text-sm">{internship?.title} · AI-evaluated results</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Evaluated', val: rankings.length, color: 'text-slate-900' },
          { label: 'Recommended: Hire', val: hires, color: 'text-green-600' },
          { label: 'Consider', val: considers, color: 'text-amber-400' },
          { label: 'Reject', val: rejects, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {rankings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-slate-900 font-semibold mb-2">No evaluated candidates yet</p>
          <p className="text-slate-500 text-sm">Rankings will appear here once candidates complete and submit their simulations.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <span className="col-span-1">Rank</span>
            <span className="col-span-3">Candidate</span>
            <span className="col-span-2 text-center">Score</span>
            <span className="col-span-2 text-center">Risk</span>
            <span className="col-span-2 text-center">AI Dep.</span>
            <span className="col-span-1 text-center">Rec.</span>
            <span className="col-span-1 text-center">Report</span>
          </div>
          <div className="divide-y divide-slate-100/30">
            {rankings.map((r: any) => (
              <div key={r.rank} className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-slate-50 transition ${r.rank <= 3 ? 'border-l-2 border-indigo-300' : ''}`}>
                <div className="col-span-1">
                  <span className={`text-sm font-bold ${r.rank === 1 ? 'text-yellow-600' : r.rank === 2 ? 'text-slate-600' : r.rank === 3 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                  </span>
                </div>
                <div className="col-span-3">
                  <p className="text-sm font-medium text-slate-900">{r.candidate_name}</p>
                  <p className="text-xs text-slate-400">{r.candidate_email}</p>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`text-base font-bold ${r.total_score >= 75 ? 'text-green-600' : r.total_score >= 55 ? 'text-amber-400' : 'text-red-600'}`}>
                    {r.total_score?.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <div className="col-span-2 text-center"><RiskBadge level={r.cheating_risk_level} /></div>
                <div className="col-span-2 text-center">
                  <span className={`text-sm font-semibold ${r.ai_dependency_score >= 60 ? 'text-red-600' : r.ai_dependency_score >= 30 ? 'text-amber-400' : 'text-green-600'}`}>
                    {r.ai_dependency_score?.toFixed(0)}%
                  </span>
                </div>
                <div className="col-span-1 text-center"><RecBadge rec={r.recommendation} /></div>
                <div className="col-span-1 text-center">
                  <button onClick={() => navigate(`/hr/internships/${id}/reports/${r.candidate_id}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-500 transition">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
