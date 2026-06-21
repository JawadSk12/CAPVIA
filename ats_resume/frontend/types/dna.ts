/**
 * frontend/types/dna.ts
 * ──────────────────────
 * DNA-compatible capability graph schemas for ATS output.
 * This represents the intelligence layer output structured for the CAPVIA Engine.
 */

export interface RoleMatch {
  technical_alignment: number;
  project_alignment: number;
  experience_alignment: number;
  domain_alignment: number;
  semantic_match_strength: number;
}

export interface ResumeQuality {
  readability: number;
  clarity: number;
  structure_quality: number;
  ats_compatibility: number;
  achievement_quality: number;
}

export interface SkillIntelligence {
  technical_depth: number;
  practical_exposure: number;
  tool_relevance: number;
  framework_alignment: number;
  proof_of_skill_strength: number;
}

export interface GapAnalysisDNA {
  missing_skill_severity: number;
  project_gap_severity: number;
  learning_gap_score: number;
  readiness_gap_score: number;
  missing_skills: string[];
  weak_areas: string[];
  recommended_skills: string[];
}

export interface ReadinessIntelligence {
  internship_readiness: number;
  role_fit_score: number;
  recruiter_interest_probability: number;
  hiring_readiness_score: number;
}

export interface FraudFlagDNA {
  type: string;
  detail: string;
  severity: string;
}

export interface FraudAnalysisDNA {
  risk_level: string;
  is_flagged: boolean;
  flags: FraudFlagDNA[];
}

export interface ExplainabilityDNA {
  top_strengths: string[];
  top_weaknesses: string[];
  matching_reasons: string[];
  risk_reasons: string[];
  reason_for_scores: string[];
}

export interface HeatmapDNA {
  section_name: string;
  relevance_score: number;
  issues: string[];
  word_count: number;
}

export interface OverallDNA {
  capability_score: number;
  candidate_level: string;
  recommendation: string;
}

export interface DNACapabilityGraph {
  candidate_id: string;
  job_id: string;
  ats_analysis_id: string;
  
  role_match: RoleMatch;
  resume_quality: ResumeQuality;
  skill_intelligence: SkillIntelligence;
  gap_analysis: GapAnalysisDNA;
  readiness_intelligence: ReadinessIntelligence;
  fraud_analysis: FraudAnalysisDNA;
  explainability: ExplainabilityDNA;
  heatmap: HeatmapDNA[];
  overall: OverallDNA;
}
