"use client";

import React, { useEffect, useState } from "react";
import { Terminal, Play } from "lucide-react";

export default function Simulation() {
  const codeSnippet = `// CAPVIA Simulation Workspace
// Candidate: John Doe (Attempt #1494)

function verifyMatrixIntegrity(matrix: number[][]): boolean {
  const size = matrix.length;
  for (let i = 0; i < size; i++) {
    const rowSum = matrix[i].reduce((a, b) => a + b, 0);
    if (rowSum <= 0) return false;
  }
  return true;
}

// Running test case #1: [Success]
// Running test case #2: [Success]`;

  const [typedOutput, setTypedOutput] = useState("");
  const outputText = "Running test case #1... Success (4ms)\nRunning test case #2... Success (8ms)\nAll local test cases passed.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedOutput((prev) => prev + outputText[index]);
      index++;
      if (index >= outputText.length - 1) {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-sim-thread" />
          
          {/* Branch to the IDE editor card */}
          <path d="M 600,320 L 720,320 L 800,320" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="800" cy="320" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Column: Copy Info */}
        <div className="lg:col-span-5 space-y-6 lg:order-first order-last text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 shadow-sm text-slate-600 text-[10px] font-black tracking-widest uppercase">
            <Terminal className="w-3.5 h-3.5 text-[#0D47A1]" />
            Phase 2: Assessments
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            Proctored Coding Workspaces
          </h2>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Verify raw technical capabilities in real time with secure browser IDEs and automated test case runner logs.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Live Execution", "Code Analysis", "Role Blueprints"].map((tag) => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-wider text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-3 py-1.5 rounded-lg shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: IDE Preview Visual */}
        <div className="lg:col-span-7 bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-900 text-slate-350 font-mono hover:shadow-[0_0_40px_rgba(13,71,161,0.15)] transition-all duration-300">
          
          {/* Editor Header */}
          <div className="bg-slate-950 px-5 py-4 flex items-center justify-between border-b border-slate-900">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/85" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/85" />
                <div className="w-3 h-3 rounded-full bg-green-500/85" />
              </div>
              <span className="text-[10px] text-slate-500 pl-4">verifyMatrix.ts</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[9px] bg-slate-900 text-slate-400 px-2.5 py-1 rounded font-bold uppercase tracking-wider">TypeScript</span>
              <button className="px-3.5 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black tracking-widest uppercase transition-all flex items-center space-x-1.5 shadow-sm">
                <Play className="w-3 h-3" />
                <span>Run Code</span>
              </button>
            </div>
          </div>

          {/* Split Screen Workspace */}
          <div className="grid grid-cols-1 md:grid-cols-12 h-[340px]">
            {/* Question description panel */}
            <div className="md:col-span-4 bg-slate-950 p-5 border-r border-slate-900 text-xs overflow-y-auto space-y-4 font-sans text-slate-500 select-none">
              <h4 className="font-outfit font-black text-slate-300">Matrix Integrity</h4>
              <p className="leading-relaxed text-[11px]">
                Write a function that validates if the sum of elements in every row of a square matrix is strictly greater than 0.
              </p>
              <div>
                <h5 className="font-black text-slate-650 text-[9px] uppercase tracking-wider">Constraints</h5>
                <code className="text-[9px] text-[#42A5F5] block mt-1">matrix.length == matrix[i].length</code>
              </div>
            </div>

            {/* Code pane */}
            <div className="md:col-span-8 bg-slate-900/40 p-5 text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
              <pre className="text-slate-450 font-mono">{codeSnippet}</pre>
            </div>
          </div>

          {/* Terminal area */}
          <div className="bg-slate-950 p-5 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 select-none">
            <div className="flex items-center space-x-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-emerald-450 h-4">{typedOutput}</span>
            </div>
            <span className="text-slate-650 font-mono">Avg execution: 12ms</span>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes sim-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-sim-thread {
          animation: sim-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
