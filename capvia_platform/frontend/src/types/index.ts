export type UserRole = 'STUDENT' | 'HR' | 'ADMIN';

export type StageName = 'ATS' | 'SIMULATION' | 'INTERVIEW';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendationType = 'Strong Hire' | 'Consider' | 'Review Required' | 'Not Recommended';

export type ApplicationStatus =
  | 'APPLIED'
  | 'ATS_PENDING'
  | 'ATS_COMPLETED'
  | 'SIMULATION_INVITED'
  | 'SIMULATION_IN_PROGRESS'
  | 'SIMULATION_COMPLETED'
  | 'INTERVIEW_INVITED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_COMPLETED'
  | 'EVALUATED'
  | 'EVALUATED_LOCAL_BASELINE'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED'
  | 'WITHDRAWN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  industry?: string;
  website_url?: string;
  headquarters?: string;
  founded_year?: number;
  employee_count?: string;
  is_verified: boolean;
  created_by?: string;
  member_count: number;
  internship_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  member_role: 'OWNER' | 'MEMBER';
  joined_at: string;
}

export interface CompanyAnalytics {
  company_id: string;
  company_name: string;
  total_internships: number;
  active_internships: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
  avg_ats_score?: number;
  avg_simulation_score?: number;
  avg_interview_score?: number;
  top_internship?: string;
  pipeline_breakdown: Record<string, number>;
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  per_page: number;
}

export type InternshipStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ONSITE';
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR';

export interface Internship {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  responsibilities: string[];
  required_skills: string[];
  technologies: string[];
  experience_level: ExperienceLevel;
  status: InternshipStatus;
  work_mode: WorkMode;
  location?: string;
  duration_weeks?: number;
  stipend_min?: number;
  stipend_max?: number;
  stipend_currency: string;
  openings: number;
  application_limit?: number;
  application_deadline?: string;
  view_count: number;
  created_by?: string;
  slug?: string;
  published_at?: string;
  application_count: number;
  company_name?: string;
  company_logo?: string;
  is_deadline_passed: boolean;
  created_at: string;
  updated_at: string;
}

export interface InternshipAnalytics {
  internship_id: string;
  title: string;
  status: InternshipStatus;
  view_count: number;
  application_count: number;
  shortlisted_count: number;
  rejected_count: number;
  conversion_rate: number;
  avg_ats_score?: number;
  avg_simulation_score?: number;
  avg_interview_score?: number;
  pipeline_breakdown: Record<string, number>;
  days_since_posted?: number;
  days_until_deadline?: number;
}

export interface InternshipListResponse {
  internships: Internship[];
  total: number;
  page: number;
  per_page: number;
}

export interface InternshipFilters {
  search?: string;
  company_id?: string;
  status?: string;
  work_mode?: string;
  experience_level?: string;
  location?: string;
  has_stipend?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export interface Application {
  id: string;
  candidate_id: string;
  vacancy_id: string;
  status: ApplicationStatus;
  current_stage: StageName;
  candidate?: User;
  vacancy?: Internship;
  application_mapping?: ApplicationMapping;
  ats_result?: ATSResult;
  simulation_result?: SimulationResult;
  interview_result?: InterviewResult;
  created_at: string;
  updated_at: string;
}

export interface ApplicationMapping {
  mapping_id: string;
  application_id: string;
  ats_resume_uuid?: string;
  simulation_attempt_id?: number;
  simulation_application_id?: number;
  interview_session_uuid?: string;
  ats_score?: number;
  simulation_score?: number;
  interview_answer_score_pct?: number;
  interview_integrity_score?: number;
  combined_risk_level: RiskLevel;
}

export interface ATSResult {
  id: string;
  application_id: string;
  overall_score: number;
  score_band: string;
  detected_role?: string;
  matched_skills: string[];
  missing_skills: string[];
  is_suspicious: boolean;
  fraud_probability: number;
}

export interface SimulationResult {
  id: string;
  application_id: string;
  attempt_id: number;
  total_score: number;
  recommendation: string;
  cheating_risk_level: RiskLevel;
  ai_dependency_score: number;
  submitted_at: string;
}

export interface InterviewResult {
  id: string;
  application_id: string;
  session_id: string;
  overall_answer_score_pct: number;
  overall_integrity_score: number;
  cheating_probability_pct: number;
  risk_level: RiskLevel;
  recommendation: RecommendationType;
  video_url: string;
  baselined_locally: boolean;
  strengths: string[];
  improvements: string[];
}
