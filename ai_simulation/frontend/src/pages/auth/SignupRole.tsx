import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const SignupRole: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/8 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
              <span className="text-slate-900 font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">CAPVIA</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
          <p className="text-slate-500">Choose how you want to use CAPVIA</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* HR Card */}
          <button
            onClick={() => navigate('/auth/signup/hr')}
            className="group relative bg-white backdrop-blur-xl border border-slate-200 hover:border-violet-500/40 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-indigo-100 transition">
                🏢
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">I'm an HR / Recruiter</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Post internships, let AI automatically generate role-based simulations, and get ranked reports with cheating analysis.
                </p>
                <div className="flex gap-2 mt-3">
                  {['Post Internships', 'AI Simulations', 'Rankings'].map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-600 transition text-xl">→</div>
          </button>

          {/* Candidate Card */}
          <button
            onClick={() => navigate('/auth/signup/candidate')}
            className="group relative bg-white backdrop-blur-xl border border-slate-200 hover:border-cyan-500/40 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-cyan-500/20 transition">
                🎓
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">I'm a Candidate</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Browse internship opportunities, apply, and showcase your skills through AI-evaluated role simulations.
                </p>
                <div className="flex gap-2 mt-3">
                  {['Apply to Internships', 'AI Simulations', 'Get Evaluated'].map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-600 transition text-xl">→</div>
          </button>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-indigo-600 hover:text-indigo-500 font-medium transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
