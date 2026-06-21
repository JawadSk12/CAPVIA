import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  { icon: '⚛️', label: 'Frontend Intern',      color: 'from-blue-500 to-cyan-400',      desc: 'React, JS, CSS, APIs',            skills: ['React', 'JavaScript', 'HTML/CSS', 'REST APIs', 'Responsive Design'] },
  { icon: '🛠️', label: 'Backend Intern',        color: 'from-green-500 to-emerald-400',  desc: 'Node.js, SQL, APIs, Auth',        skills: ['Node.js', 'REST APIs', 'SQL', 'Authentication', 'Server Architecture'] },
  { icon: '🔄', label: 'Full Stack Intern',     color: 'from-purple-500 to-violet-400',  desc: 'React, Node.js, DBs, Deploy',     skills: ['React', 'Node.js', 'Databases', 'REST APIs', 'Deployment'] },
  { icon: '🐍', label: 'Python Intern',         color: 'from-yellow-500 to-orange-400',  desc: 'Python, Pandas, EDA, Scripts',    skills: ['Python', 'Pandas', 'Data Cleaning', 'EDA', 'Visualization'] },
  { icon: '🤖', label: 'ML / AI Intern',        color: 'from-pink-500 to-rose-400',      desc: 'scikit-learn, models, NumPy',     skills: ['Python', 'scikit-learn', 'Feature Engineering', 'Model Evaluation', 'NumPy'] },
  { icon: '☁️', label: 'DevOps / Cloud Intern', color: 'from-sky-500 to-blue-400',       desc: 'Linux, Docker, CI/CD, Cloud',     skills: ['Linux', 'Docker', 'CI/CD', 'Bash Scripting', 'Cloud Basics'] },
  { icon: '📱', label: 'Android Intern',        color: 'from-green-600 to-lime-400',     desc: 'Kotlin, Android SDK, Room DB',    skills: ['Kotlin', 'Android SDK', 'Activities & Fragments', 'REST APIs', 'Room DB'] },
  { icon: '🎨', label: 'UI/UX Intern',          color: 'from-fuchsia-500 to-pink-400',   desc: 'Figma, Research, Prototyping',    skills: ['Figma', 'Wireframing', 'User Research', 'Prototyping', 'Design Systems'] },
  { icon: '🔒', label: 'Cybersecurity Intern',  color: 'from-red-600 to-orange-500',     desc: 'Networking, OWASP, Encryption',  skills: ['Networking', 'OWASP', 'Authentication', 'Encryption', 'Vulnerability Scanning'] },
  { icon: '📊', label: 'Data Analyst Intern',   color: 'from-teal-500 to-cyan-400',      desc: 'SQL, Excel, Tableau, EDA',        skills: ['SQL', 'Excel', 'Data Visualization', 'EDA', 'Python Basics'] },
  { icon: '🧪', label: 'QA / Testing Intern',   color: 'from-amber-500 to-yellow-400',   desc: 'Manual testing, Selenium, bugs', skills: ['Manual Testing', 'Test Cases', 'Selenium Basics', 'Bug Reporting', 'SDLC'] },
  { icon: '⛓️', label: 'Blockchain Intern',     color: 'from-indigo-500 to-purple-400',  desc: 'Solidity, Web3, Ethereum',        skills: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts', 'Blockchain Basics'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

const RoleSetup: React.FC = () => {
  const navigate   = useNavigate();
  const [selected,   setSelected]   = useState<RolePreset | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const activeRole  = customRole.trim() || selected?.label || '';
  const activeColor = selected?.color ?? 'from-blue-500 to-purple-500';

  const handleStart = () => {
    if (!activeRole) { setError('Please select a role to continue.'); return; }
    setLoading(true);
    const skills = selected?.skills ?? ['JavaScript', 'Algorithms', 'REST APIs', 'Data Structures', 'Debugging'];
    saveInterviewConfig({ role: activeRole, skills });
    navigate('/validation');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-blue-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-700/40 rounded-full px-4 py-1.5 mb-5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Step 1 of 3 — Role Selection</span>
        </div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
          What role are you<br />
          <span className={`bg-gradient-to-r ${activeColor} bg-clip-text text-transparent transition-all duration-500`}>
            interviewing for?
          </span>
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Pick your intern role — OpenAI will generate 5 tailored technical questions just for you.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl z-10">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">

          {/* Gradient bar */}
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
                        ? `border-transparent bg-gradient-to-br ${preset.color} shadow-lg scale-[1.02]`
                        : 'border-gray-700/60 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800/80 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{preset.icon}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                        {preset.label}
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                        {preset.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom role divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 font-medium">or type a custom role</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Custom input */}
            <input
              type="text"
              placeholder="e.g. iOS Intern, Embedded Systems Intern, Game Dev Intern…"
              value={customRole}
              onChange={e => { setCustomRole(e.target.value); setSelected(null); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="w-full bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />

            {/* Selected summary pill */}
            {activeRole && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${activeColor} bg-opacity-10 border border-white/10`}>
                <span className="text-xl">{selected?.icon ?? '💼'}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{activeRole}</p>
                  <p className="text-white/50 text-xs">5 AI-generated questions · Q1→Q5 difficulty progression</p>
                </div>
                <span className="ml-auto text-green-400 text-xl">✓</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span>{error}
              </p>
            )}

            {/* CTA */}
            <button
              onClick={handleStart}
              disabled={!activeRole || loading}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                activeRole && !loading
                  ? `bg-gradient-to-r ${activeColor} text-white shadow-lg hover:scale-[1.01] hover:shadow-xl active:scale-[0.99]`
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
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

            <p className="text-center text-xs text-gray-600">
              🔒 On-device only · 🤖 Questions generated fresh by OpenAI each session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSetup;
