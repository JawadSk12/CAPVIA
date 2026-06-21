import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-600/12 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-cyan-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/6 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
            <span className="text-slate-900 font-bold">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight">CAPVIA</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/auth/login')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition">Sign In</button>
          <button onClick={() => navigate('/auth/signup')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-violet-400 text-slate-900 text-sm font-semibold transition shadow-lg shadow-indigo-200">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500 text-xs font-medium mb-6">
          🚀 AI-Powered Internship Simulation Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Hire the Best.<br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Without the Guesswork.</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          CAPVIA auto-generates unique role-based simulations from your job description. Candidates complete a 5-round AI-evaluated assessment — no questions to write, zero bias.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={() => navigate('/auth/signup/hr')}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-violet-400 text-slate-900 font-semibold transition shadow-xl shadow-violet-500/25 text-sm">
            Post an Internship →
          </button>
          <button onClick={() => navigate('/auth/signup/candidate')}
            className="px-6 py-3.5 rounded-2xl border border-slate-300/60 text-gray-200 hover:border-gray-500 hover:text-slate-900 transition text-sm font-medium">
            Find Internships
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 pb-16">
        <h2 className="text-center text-2xl font-bold mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', icon: '📝', title: 'Post Internship', desc: 'Fill in title, skills, and role details. No need to write any assessment questions.' },
            { step: '02', icon: '🤖', title: 'AI Generates Simulation', desc: 'Platform detects the role and auto-generates a unique 5-round simulation tailored to the specific role.' },
            { step: '03', icon: '📊', title: 'Get Ranked Reports', desc: 'Candidates complete the simulation. You get AI-evaluated rankings with cheating and AI-dependency analysis.' },
          ].map(s => (
            <div key={s.step} className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-indigo-600">{s.step}</span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Rounds */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 pb-16">
        <h2 className="text-center text-2xl font-bold mb-3">5-Round AI Simulation</h2>
        <p className="text-center text-slate-500 text-sm mb-10">Every simulation is uniquely generated from internship context — seeded for each role</p>
        <div className="grid grid-cols-5 gap-3">
          {[
            { r: 1, name: 'Requirement\nAnalysis', icon: '📋', weight: '15%' },
            { r: 2, name: 'Technical\nExecution', icon: '💻', weight: '35%' },
            { r: 3, name: 'Architecture\nDesign', icon: '🏗️', weight: '20%' },
            { r: 4, name: 'Communication', icon: '💬', weight: '15%' },
            { r: 5, name: 'Debugging', icon: '🐛', weight: '15%' },
          ].map(r => (
            <div key={r.r} className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-200 transition">
              <div className="text-2xl mb-2">{r.icon}</div>
              <div className="text-xs font-bold text-indigo-600 mb-1">R{r.r}</div>
              <p className="text-xs font-medium text-slate-900 leading-tight whitespace-pre-line">{r.name}</p>
              <p className="text-xs text-slate-400 mt-2">{r.weight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 bg-white border-t border-b border-slate-200 py-12 mb-16">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-4 gap-8 text-center">
          {[{ val: '50+', label: 'Role Types' }, { val: '5', label: 'Simulation Rounds' }, { val: '100%', label: 'AI Evaluated' }, { val: '0', label: 'Questions to Write' }].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-1">{s.val}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 text-center pb-20 px-8">
        <h2 className="text-3xl font-bold mb-4">Ready to hire smarter?</h2>
        <p className="text-slate-500 mb-8">Join HR teams using CAPVIA to eliminate bias and find top talent.</p>
        <button onClick={() => navigate('/auth/signup')}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-blue-500 text-slate-900 font-bold transition shadow-2xl shadow-indigo-200 text-sm">
          Get Started Free →
        </button>
      </div>

      <div className="relative z-10 border-t border-slate-200 py-6 text-center">
        <p className="text-xs text-slate-500">© 2024 CAPVIA / IntelliRecruit AI · Built with ❤️ for smarter hiring</p>
      </div>
    </div>
  );
};
