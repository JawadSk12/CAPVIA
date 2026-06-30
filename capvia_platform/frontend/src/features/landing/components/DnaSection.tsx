"use client";

import React from "react";
import { Award } from "lucide-react";

export default function DnaSection() {
  const dimensions = [
    { name: "Problem Solving", score: 90 },
    { name: "Execution", score: 85 },
    { name: "Communication", score: 80 },
    { name: "Learning Ability", score: 95 },
    { name: "Adaptability", score: 88 },
    { name: "Consistency", score: 92 },
    { name: "Confidence", score: 85 },
    { name: "Role Fit", score: 90 },
    { name: "Leadership", score: 78 },
  ];

  // SVG Radar Chart calculations
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 130;
  const totalAxes = dimensions.length;

  const getCoordinates = (index: number, score: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const radius = (score / 100) * maxRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  };

  // Generate web background polygons (grids)
  const gridLevels = [25, 50, 75, 100];
  const gridPolygons = gridLevels.map((level) => {
    return dimensions.map((_, idx) => {
      const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
      const r = (level / 100) * maxRadius;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    }).join(" ");
  });

  // Candidate score polygon points
  const candidatePoints = dimensions.map((d, idx) => {
    const coords = getCoordinates(idx, d.score);
    return `${coords.x},${coords.y}`;
  }).join(" ");

  return (
    <section className="relative py-24 bg-[#FAFCFF] overflow-hidden text-slate-900 z-10">
      
      {/* SVG Thread trace running vertically - thin blue blueprint-style */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" overflow="visible">
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.25" strokeWidth="2.5" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#1976D2" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="30 220" className="animate-dna-thread" />
          
          {/* Branch to the radar chart card */}
          <path d="M 600,280 L 720,280 L 800,280" fill="none" stroke="#1976D2" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="800" cy="280" r="3" fill="#1976D2" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Column: SVG Radar Chart Visual (Dark Glass Panel Readout) */}
        <div className="lg:col-span-6 flex items-center justify-center w-full">
          <div className="w-full max-w-[420px] bg-slate-950 rounded-tr-[36px] rounded-bl-[36px] rounded-tl-xl rounded-br-xl p-6 md:p-8 shadow-2xl shadow-slate-900/40 border border-slate-850 hover:shadow-[0_0_40px_rgba(13,71,161,0.15)] transition-all duration-300 relative group">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-6 font-mono text-[9px] text-slate-500 select-none">
              <span>MODULE: COGNITIVE_DNA_RADAR</span>
              <span className="text-[#FFC107] animate-pulse">PASSPORT_ACTIVE</span>
            </div>

            <div className="relative w-full aspect-square">
              <svg viewBox="0 0 400 400" className="w-full h-full select-none overflow-visible">
                {/* Grid circles / polygons */}
                {gridPolygons.map((points, idx) => (
                  <polygon
                    key={idx}
                    points={points}
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                ))}

                {/* Grid Axes Lines */}
                {dimensions.map((_, idx) => {
                  const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
                  const x = centerX + maxRadius * Math.cos(angle);
                  const y = centerY + maxRadius * Math.sin(angle);
                  return (
                    <line
                      key={idx}
                      x1={centerX}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke="#1E293B"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Score Area Polygon - pulsing breathing effect */}
                <polygon
                  points={candidatePoints}
                  fill="rgba(66, 165, 245, 0.08)"
                  stroke="#42A5F5"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />

                {/* Dots at vertices */}
                {dimensions.map((d, idx) => {
                  const coords = getCoordinates(idx, d.score);
                  return (
                    <circle
                      key={idx}
                      cx={coords.x}
                      cy={coords.y}
                      r="4"
                      className="fill-[#FFC107] stroke-slate-950 stroke-2 shadow-sm transition-transform duration-300 group-hover:scale-125"
                    />
                  );
                })}

                {/* Labels */}
                {dimensions.map((d, idx) => {
                  const angle = (Math.PI * 2 / totalAxes) * idx - Math.PI / 2;
                  const labelRadius = maxRadius + 22;
                  const x = centerX + labelRadius * Math.cos(angle);
                  const y = centerY + labelRadius * Math.sin(angle);
                  
                  let textAnchor: "start" | "middle" | "end" = "middle";
                  if (Math.cos(angle) > 0.1) textAnchor = "start";
                  else if (Math.cos(angle) < -0.1) textAnchor = "end";

                  return (
                    <text
                      key={idx}
                      x={x}
                      y={y + 3}
                      textAnchor={textAnchor}
                      className="font-mono text-[8px] font-black fill-slate-500 uppercase tracking-widest"
                    >
                      {d.name}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Copy Info */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1976D2]/5 border border-[#1976D2]/10 shadow-sm text-slate-650 text-[10px] font-black tracking-widest uppercase">
            <Award className="w-3.5 h-3.5 text-[#0D47A1]" />
            Phase 5: Capability Profiling
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black font-outfit text-slate-900 tracking-tighter leading-none">
            9-Dimensional Capability Profile
          </h2>
          
          <p className="text-base text-slate-500 leading-relaxed font-medium">
            Consolidate assessment data into a permanent, verifiable radar-mapped talent profile showing raw merit.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["Problem Solving", "Role Alignment", "Execution Consistency"].map((tag) => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-wider text-[#0D47A1] bg-[#0D47A1]/5 border border-[#0D47A1]/10 px-3 py-1.5 rounded-lg shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes dna-thread-movement {
          0% { stroke-dashoffset: 250; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-dna-thread {
          animation: dna-thread-movement 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
