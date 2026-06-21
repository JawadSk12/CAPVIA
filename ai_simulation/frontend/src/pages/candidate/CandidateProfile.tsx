import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api';

export const CandidateProfile: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ full_name: user?.full_name || '', bio: user?.bio || '', linkedin_url: user?.linkedin_url || '', portfolio_url: '', years_of_experience: user?.years_of_experience || '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.put('/auth/me', form);
      setUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Profile</h1>
      <p className="text-slate-500 text-sm mb-6">Keep your profile updated for better matches</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-slate-900">
            {(user?.full_name || user?.email || 'C')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 mt-1 inline-block">Candidate</span>
          </div>
        </div>

        {(user?.skills || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {user!.skills!.map(s => (
              <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500">{s}</span>
            ))}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {[{ label: 'Full Name', key: 'full_name', ph: 'Your name' }, { label: 'LinkedIn URL', key: 'linkedin_url', ph: 'https://linkedin.com/in/...' }, { label: 'Portfolio / GitHub', key: 'portfolio_url', ph: 'https://github.com/...' }].map(f => (
            <div key={f.key}>
              <label className="block text-sm text-slate-500 mb-1.5">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}
                className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-300/60 transition text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={3}
              className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 placeholder-gray-500 focus:outline-none focus:border-indigo-300/60 transition text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">Experience Level</label>
            <select value={form.years_of_experience} onChange={e => setForm(p => ({ ...p, years_of_experience: e.target.value }))}
              className="w-full bg-slate-100 border border-slate-300/60 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-300/60 transition text-sm">
              <option value="">Select</option>
              <option value="0-1">0–1 years</option>
              <option value="1-2">1–2 years</option>
              <option value="2-3">2–3 years</option>
              <option value="3+">3+ years</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-slate-900 font-semibold transition disabled:opacity-50 text-sm">
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
