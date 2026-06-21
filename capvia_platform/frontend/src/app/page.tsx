import Link from 'next/link';
import { ArrowRight, ShieldCheck, Terminal, Layers } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-2xl text-center space-y-8 z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
          <Terminal className="h-3.5 w-3.5" />
          <span>CAPVIA Phase 5 — Foundation Layer</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            CAPVIA Platform
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            A production-ready foundation integrating Resume Screening, Code Simulation, and Speech Evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto text-left">
          <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/30">
            <div className="flex items-center space-x-2.5 text-indigo-400 mb-1.5">
              <ShieldCheck className="h-4.5 w-4.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">FastAPI Backend</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">JWT Auth, HMAC Signatures, Rate Limiting, & PostgreSQL Mappings.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/30">
            <div className="flex items-center space-x-2.5 text-purple-400 mb-1.5">
              <Layers className="h-4.5 w-4.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Next.js Frontend</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">Zustand State, React Query Hooks, & Recharts Visualizations.</p>
          </div>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <span>Launch Recruiter Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
