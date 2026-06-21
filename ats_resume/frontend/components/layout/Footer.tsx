"use client";

import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Zap size={12} className="text-indigo-500" />
          <span>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-slate-600">CAPVIA</span> — AI-Powered
            Resume ATS Analyzer
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <a href="/privacy" className="hover:text-indigo-600 transition-colors">
            Privacy
          </a>
          <a href="/terms" className="hover:text-indigo-600 transition-colors">
            Terms
          </a>
          <a href="/support" className="hover:text-indigo-600 transition-colors">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
