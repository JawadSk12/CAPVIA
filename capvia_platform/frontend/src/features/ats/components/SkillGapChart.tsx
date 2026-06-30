"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

interface SkillGapChartProps {
  matched: string[];
  missing: string[];
  skillScores?: Record<string, number>;
}

export default function SkillGapChart({ matched, missing, skillScores }: SkillGapChartProps) {
  // Build radar data from top skills
  const allSkills = [...matched.slice(0, 6), ...missing.slice(0, 4)];
  const radarData = allSkills.map((skill) => ({
    skill: skill.length > 14 ? skill.slice(0, 14) + "…" : skill,
    candidate: skillScores?.[skill] != null ? Math.round(skillScores[skill] * 100) : (matched.includes(skill) ? 75 : 15),
    required:  85,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-700 mb-1">Skill Gap Radar</h2>
        <p className="text-xs text-slate-400">
          <span className="text-indigo-600 font-semibold">Your level</span> vs{" "}
          <span className="text-emerald-600 font-semibold">required level</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={110}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fontSize: 11, fill: "#475569" }}
          />
          <Tooltip
            contentStyle={{
              background: "#1E293B",
              border: "none",
              borderRadius: "12px",
              color: "#F8FAFC",
              fontSize: "12px",
            }}
          />
          <Radar
            name="Required"
            dataKey="required"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <Radar
            name="You"
            dataKey="candidate"
            stroke="#4F46E5"
            fill="#4F46E5"
            fillOpacity={0.25}
            strokeWidth={2.5}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Skill lists */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs font-bold text-emerald-700 mb-3">✓ Skills You Have</p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((sk) => (
              <span key={sk} className="badge badge-emerald text-xs">{sk}</span>
            ))}
            {matched.length === 0 && <p className="text-xs text-emerald-600">None detected</p>}
          </div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4">
          <p className="text-xs font-bold text-rose-700 mb-3">✗ Skills to Acquire</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((sk) => (
              <span key={sk} className="badge badge-rose text-xs">{sk}</span>
            ))}
            {missing.length === 0 && <p className="text-xs text-rose-600">No gaps detected 🎉</p>}
          </div>
        </div>
      </div>
    </div>
  );
}