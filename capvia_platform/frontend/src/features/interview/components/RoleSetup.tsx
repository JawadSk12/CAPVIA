import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveInterviewConfig } from '../data/questions';

// ─── Role presets ─────────────────────────────────────────────────────────────

interface RolePreset {
  icon: string;
  label: string;
  skills: string[];
  color: string;
  desc: string;
}

const ROLE_PRESETS: RolePreset[] = [
  { icon: '⚛️', label: 'Frontend Intern',      color: 'from-blue-600 to-cyan-500',      desc: 'React, JS, CSS, APIs',            skills: ['React', 'JavaScript', 'HTML/CSS', 'REST APIs', 'Responsive Design'] },
  { icon: '🛠️', label: 'Backend Intern',        color: 'from-green-605 to-emerald-500',  desc: 'Node.js, SQL, APIs, Auth',        skills: ['Node.js', 'REST APIs', 'SQL', 'Authentication', 'Server Architecture'] },
  { icon: '🔄', label: 'Full Stack Intern',     color: 'from-purple-600 to-violet-500',  desc: 'React, Node.js, DBs, Deploy',     skills: ['React', 'Node.js', 'Databases', 'REST APIs', 'Deployment'] },
  { icon: '🐍', label: 'Python Intern',         color: 'from-yellow-600 to-orange-500',  desc: 'Python, Pandas, EDA, Scripts',    skills: ['Python', 'Pandas', 'Data Cleaning', 'EDA', 'Visualization'] },
  { icon: '🤖', label: 'ML / AI Intern',        color: 'from-pink-600 to-rose-500',      desc: 'scikit-learn, models, NumPy',     skills: ['Python', 'scikit-learn', 'Feature Engineering', 'Model Evaluation', 'NumPy'] },
  { icon: '☁️', label: 'DevOps / Cloud Intern', color: 'from-sky-600 to-blue-500',       desc: 'Linux, Docker, CI/CD, Cloud',     skills: ['Linux', 'Docker', 'CI/CD', 'Bash Scripting', 'Cloud Basics'] },
  { icon: '📱', label: 'Android Intern',        color: 'from-green-600 to-lime-500',     desc: 'Kotlin, Android SDK, Room DB',    skills: ['Kotlin', 'Android SDK', 'Activities & Fragments', 'REST APIs', 'Room DB'] },
  { icon: '🎨', label: 'UI/UX Intern',          color: 'from-fuchsia-600 to-pink-500',   desc: 'Figma, Research, Prototyping',    skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping', 'Design Systems'] },
  { icon: '🔒', label: 'Cybersecurity Intern',  color: 'from-red-650 to-orange-500',     desc: 'Networking, OWASP, Encryption',  skills: ['Networking', 'OWASP', 'Authentication', 'Encryption', 'Vulnerability Scanning'] },
  { icon: '📊', label: 'Data Analyst Intern',   color: 'from-teal-650 to-cyan-500',      desc: 'SQL, Excel, Tableau, EDA',        skills: ['SQL', 'Excel', 'Data Visualization', 'EDA', 'Python Basics'] },
  { icon: '🧪', label: 'QA / Testing Intern',   color: 'from-amber-600 to-yellow-500',   desc: 'Manual testing, Selenium, bugs', skills: ['Manual Testing', 'Test Cases', 'Selenium Basics', 'Bug Reporting', 'SDLC'] },
  { icon: '⛓️', label: 'Blockchain Intern',     color: 'from-indigo-600 to-purple-500',  desc: 'Solidity, Web3, Ethereum',        skills: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Blockchain Basics'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

const RoleSetup: React.FC = () => {
  const router = useRouter();
  const [selected,   setSelected]   = useState<RolePreset | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const activeRole  = customRole.trim() || selected?.label || '';
  const activeColor = selected?.color ?? 'from-[#0D47A1] to-blue-500';

  const handleStart = () => {
    if (!activeRole) { setError('Please select a role to continue.'); return; }
    setLoading(true);
    const skills = selected?.skills ?? ['JavaScript', 'Algorithms', 'REST APIs', 'Data Structures', 'Debugging'];
    saveInterviewConfig({ role: activeRole, skills });
    router.push('/candidate/interview/validation');
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-2 bg-[#0D47A1]/10 border border-[#0D47A1]/20 rounded-full px-4 py-1.5 mb-5">
          <span className="w-2 h-2 rounded-full bg-[#0D47A1] animate-pulse" />
          <span className="text-[#0D47A1] text-xs font-bold tracking-widest uppercase">Step 1 of 3 — Role Selection</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3 font-outfit">
          What role are you<br />
          <span className={`bg-gradient-to-r ${activeColor} bg-clip-text text-transparent transition-all duration-500`}>
            interviewing for?
          </span>
        </h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Pick your intern role — CAPVIA AI will generate 5 tailored technical questions just for you.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl z-10">
        <div className="bg-white border border-slate-100 rounded-[24px] shadow-sm overflow-hidden">

          {/* Gradient top bar */}
          <div className={`h-1 bg-gradient-to-r ${activeColor} transition-all duration-500`} />

          <div className="p-7 space-y-6">

            {/* Role grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ROLE_PRESETS.map(preset => {
                const isActive = selected?.label === preset.label && !customRole;
                return (
                  <button
                    key={preset.label}
                    onClick={() => { setSelected(preset); setCustomRole(''); setError(''); }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 group ${
                      isActive
                        ? `border-transparent bg-gradient-to-br ${preset.color} shadow-md scale-[1.02] text-white`
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{preset.icon}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-[#0D47A1]'}`}>
                        {preset.label}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {preset.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom role divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-semibold">or type a custom role</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Custom input */}
            <input
              type="text"
              placeholder="e.g. iOS Intern, Embedded Systems Intern, Game Dev Intern…"
              value={customRole}
              onChange={e => { setCustomRole(e.target.value); setSelected(null); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 transition-all font-medium"
            />

            {/* Selected summary pill */}
            {activeRole && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/50 border border-blue-100`}>
                <span className="text-xl">{selected?.icon ?? '💼'}</span>
                <div>
                  <p className="text-slate-800 text-sm font-bold">{activeRole}</p>
                  <p className="text-slate-500 text-xs font-medium">5 AI-generated questions · Q1→Q5 difficulty progression</p>
                </div>
                <span className="ml-auto text-emerald-600 font-bold text-lg">✓</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-rose-600 text-sm flex items-center gap-2 font-medium">
                <span>⚠️</span>{error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={handleStart}
              disabled={!activeRole || loading}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                activeRole && !loading
                  ? `bg-gradient-to-r ${activeColor} text-white shadow-md hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]`
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up…
                </>
              ) : activeRole ? (
                <>Start Interview as {activeRole} →</>
              ) : (
                'Select a role to continue'
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-medium">
              🔒 On-device check only · 🤖 Questions generated dynamically each session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSetup;
