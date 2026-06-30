/**
 * frontend/types/ats.ts
 * ─────────────────────
 * Canonical TypeScript types for CAPVIA ATS platform.
 * These mirror backend Pydantic schemas and include compatibility
 * aliases used across UI components.
 */

// ─── Processing ───────────────────────────────────────────────────────────────

export type ProcessingStatus =
  | "PENDING"
  | "OCR"
  | "PARSING"
  | "EMBEDDING"
  | "SCORING"
  | "COMPLETED"  // alias used by backend ORM
  | "DONE"
  | "PROCESSING" // generic in-progress
  | "FAILED"
  | "ERROR";

export type AnalysisMode = "GLOBAL" | "INTERNSHIP";
export type ScoreBand    = "STRONG" | "GOOD" | "FAIR" | "WEAK";
export type ConfidenceLabel = "HIGH" | "MEDIUM" | "LOW";
export type HRStatus = "PENDING" | "SHORTLIST" | "SHORTLISTED" | "REJECT" | "REJECTED" | "INTERVIEW" | "UNDER_REVIEW" | "HOLD";

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface ResumeUploadResponse {
  resume_id: string;
  status: ProcessingStatus;
  message: string;
  estimated_seconds: number;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export interface ResumeStatusResponse {
  resume_id: string;
  status: ProcessingStatus;
  progress_percent: number;
  stage_label: string;
  error_message?: string;
  estimated_seconds_remaining?: number;
}

// ─── Skill Analysis ───────────────────────────────────────────────────────────

export type MatchType = "DIRECT" | "SEMANTIC" | "PARTIAL";

export interface SkillMatch {
  target_skill: string;
  matched_by: string;
  similarity_score: number;
  match_type: MatchType;
}

export interface SkillGap {
  skill: string;
  closest_match?: string;
  similarity: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  learning_resource?: string;
}

export interface SkillAnalysis {
  matches: SkillMatch[];
  gaps: SkillGap[];
  coverage: number;
  semantic_score: number;
  matched_count: number;
  gap_count: number;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface HeatmapToken {
  text: string;
  score: number;
}

export interface HeatmapSection {
  section: string;
  section_name?: string;   // alias
  score: number;
  relevance_score?: number; // alias
  tokens: HeatmapToken[];
  content_preview?: string;
  issues?: string[];
  missing_keywords?: string[];
  feedback?: string;
  word_count?: number;
}

// ─── Explainability ───────────────────────────────────────────────────────────

export interface ExplainabilityFactor {
  feature_name: string;
  display_name: string;
  impact: number;
  direction: "positive" | "negative";
  raw_value: number;
  explanation: string;
  fix_suggestion?: string;
}

export interface ShapValue {
  feature: string;
  name?: string;
  value: number;
  shap_value?: number;
}

export interface ExplainabilityReport {
  factors: ExplainabilityFactor[];
  summary: string;
  confidence: number;
  confidence_label: ConfidenceLabel;
}

// ─── Fraud ────────────────────────────────────────────────────────────────────

export type FraudFlagType =
  | "SKILL_INFLATION"
  | "KEYWORD_STUFFING"
  | "UNSUBSTANTIATED_SKILL"
  | "EXPERIENCE_CONTRADICTION"
  | "COPY_PASTE_PATTERN";

export type FraudSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface FraudFlag {
  flag_type?: FraudFlagType;
  type?: string;           // alias
  skill?: string;          // alias for affected_skill
  affected_skill?: string;
  severity?: FraudSeverity;
  detail?: string;
  reason?: string;         // alias for detail
  confidence?: number;
}

export interface FraudAnalysis {
  is_suspicious: boolean;
  fraud_probability: number;
  flags: FraudFlag[];
  proof_score: number;
  verdict: "CLEAN" | "SUSPICIOUS" | "LIKELY_FRAUD";
}

// ─── Dimension Scores ─────────────────────────────────────────────────────────

export interface DimensionScores {
  semantic_skill_match: number;
  project_relevance: number;
  experience_depth: number;
  education_alignment: number;
  ats_format: number;
  keyword_intelligence: number;
  certification_bonus?: number;
  skill_proof_score?: number;
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

export interface ATSAnalysisResponse {
  resume_id: string;
  user_id?: string;
  mode?: AnalysisMode;
  filename?: string;
  created_at?: string;

  // Core score — backend may return either field
  overall_score?: number;
  ats_score?: number;

  score_band?: ScoreBand;
  percentile?: number;

  // Role
  detected_role?: string;
  role_confidence?: number;
  role_alternatives?: { role: string; confidence: number }[];

  // Breakdown
  dimensions?: DimensionScores;
  dimension_scores?: DimensionScores;
  skill_analysis?: SkillAnalysis;

  // Flat arrays used directly by components
  matched_skills?: string[];
  missing_skills?: string[];
  skill_scores?: Record<string, number>;

  // Per-dimension flat scores (0–1) returned by backend
  skills_match_score?: number;
  experience_score?: number;
  education_score?: number;
  action_words_score?: number;
  formatting_score?: number;
  keyword_density_score?: number;
  quantification_score?: number;
  semantic_alignment_score?: number;

  // Heatmap
  heatmap?: HeatmapSection[];

  // Explainability
  explainability?: ExplainabilityReport;
  shap_values?: ShapValue[];

  // Fraud
  fraud_analysis?: FraudAnalysis;
  fraud_flags?: FraudFlag[];

  // Summary text
  summary?: string;

  // Meta
  ai_confidence?: number;
  confidence_score?: number;   // alias
  confidence_label?: ConfidenceLabel;
}

// ─── Resume History ───────────────────────────────────────────────────────────

export interface ResumeSummary {
  id: string;
  original_filename: string;
  status: ProcessingStatus;
  mode?: AnalysisMode;

  // Score — either field name may come from backend
  overall_score?: number;
  ats_score?: number;

  detected_role?: string;
  created_at: string;
  completed_at?: string;
}

// ─── Rewrite ──────────────────────────────────────────────────────────────────

export interface RewriteSuggestion {
  section: string;
  original_content: string;
  suggested_content: string;
  improvement_rationale: string;
  keywords_added: string[];
  expected_score_impact: number;
}

// ─── Internship ───────────────────────────────────────────────────────────────

export interface InternshipSummary {
  id: string;
  title: string;
  company_name?: string;  // used by components
  company?: string;       // alias from backend
  location?: string;
  is_remote?: boolean;
  experience_level?: string;
  is_active?: boolean;
  is_expired?: boolean;
  total_applicants?: number;
  candidate_count?: number;  // alias
  shortlisted_count?: number;
  short_description?: string;
  deadline?: string;                 // used by components
  application_deadline?: string;     // backend field
  required_skills?: string[];
  preferred_skills?: string[];
  created_at?: string;
}

export interface InternshipDetail extends InternshipSummary {
  jd_text?: string;
  full_jd_text?: string;
  responsibilities?: string[];
  tools_and_technologies?: string[];
  expected_projects?: string[];
  min_experience?: number;
  created_by_name?: string;
}

// ─── Internship ATS ───────────────────────────────────────────────────────────

export interface InternshipDimensionScore {
  dimension: string;
  display_name: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  explanation: string;
}

export interface InternshipATSResult {
  resume_id: string;
  jd_id: string;
  overall_score: number;
  score_band: ScoreBand;
  dimensions: InternshipDimensionScore[];
  required_skills_analysis: SkillAnalysis;
  preferred_skills_analysis: SkillAnalysis;
  tool_match_analysis: { matches: SkillMatch[]; gaps: SkillGap[]; score: number };
  critical_gaps: string[];
  nice_to_have_gaps: string[];
  action_items: string[];
  is_suspicious: boolean;
  fraud_flags: FraudFlag[];
  ai_confidence: number;
  created_at: string;
}

// ─── HR / Candidates ──────────────────────────────────────────────────────────

export interface CandidateRankEntry {
  rank?: number;
  resume_id: string;
  user_id?: string;
  candidate_name?: string;  // used by components
  user_name?: string;       // alias
  email?: string;
  user_email?: string;      // alias
  filename?: string;
  original_filename?: string;

  // Score
  ats_score?: number;
  overall_score?: number;

  score_band?: ScoreBand;
  detected_role?: string;
  required_skill_match?: number;
  project_relevance?: number;

  fraud_flags?: FraudFlag[];
  is_suspicious?: boolean;
  fraud_flag_count?: number;

  ai_confidence?: number;
  confidence_label?: ConfidenceLabel;

  hr_status?: string;
  applied_at?: string;
  analyzed_at?: string;

  // Backward compat
  matched_skills?: string[];
  missing_skills?: string[];
  summary?: string;
  resume_url?: string;
  jd_id?: string;
}

/** @deprecated Use CandidateRankEntry */
export type CandidateRankItem = CandidateRankEntry;

export interface CandidateRankingResponse {
  jd_id?: string;
  jd_title?: string;
  total_count?: number;
  total_applicants?: number;

  // Either field from backend
  candidates?: CandidateRankEntry[];
  ranked_candidates?: CandidateRankEntry[];

  score_distribution?: Record<string, number>;
}

// ─── HR Analytics ─────────────────────────────────────────────────────────────

export interface HRAnalytics {
  // Top-level flattened fields used by components
  total_candidates?: number;
  avg_ats_score?: number;
  active_roles?: number;
  flagged_count?: number;
  shortlisted_count?: number;
  under_review_count?: number;
  rejected_count?: number;
  pending_count?: number;
  shortlist_rate?: number;
  total_users?: number;
  total_resumes?: number;

  score_distribution?: { range: string; count: number }[];
  top_required_skills?: { skill: string; count: number }[];
  avg_score_by_role?: { role: string; avg_score: number }[];

  // Nested shape (original)
  summary?: {
    total_applicants: number;
    shortlisted: number;
    rejected: number;
    pending: number;
    flagged: number;
    active_internships: number;
    average_score: number;
    shortlist_rate: number;
  };
  top_roles?: { role: string; count: number }[];
  fraud_rate?: number;
}