-- CAPVIA PostgreSQL Schema
-- Neon PostgreSQL Dialect

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE user_role AS ENUM ('STUDENT', 'HR', 'ADMIN');

CREATE TYPE stage_name AS ENUM ('ATS', 'SIMULATION', 'INTERVIEW');

CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE recommendation_type AS ENUM ('Strong Hire', 'Consider', 'Review Required', 'Not Recommended');

CREATE TYPE company_member_role AS ENUM ('OWNER', 'MEMBER');

CREATE TYPE application_status AS ENUM (
    'APPLIED', 
    'ATS_PENDING', 
    'ATS_COMPLETED', 
    'SIMULATION_INVITED', 
    'SIMULATION_IN_PROGRESS', 
    'SIMULATION_COMPLETED', 
    'INTERVIEW_INVITED', 
    'INTERVIEW_IN_PROGRESS', 
    'INTERVIEW_COMPLETED', 
    'EVALUATED', 
    'EVALUATED_LOCAL_BASELINE', 
    'SHORTLISTED', 
    'REJECTED'
);

-- =========================================================================
-- Tables
-- =========================================================================

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2. Companies Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(512) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    industry VARCHAR(100) DEFAULT NULL,
    website_url VARCHAR(512) DEFAULT NULL,
    headquarters VARCHAR(255) DEFAULT NULL,
    founded_year INTEGER DEFAULT NULL,
    employee_count VARCHAR(50) DEFAULT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 2a. Company Members Join Table
CREATE TABLE company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role company_member_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_member UNIQUE (company_id, user_id)
);

-- 3. Internships Table
CREATE TABLE internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    responsibilities TEXT[] NOT NULL DEFAULT '{}',
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    technologies TEXT[] NOT NULL DEFAULT '{}',
    experience_level VARCHAR(50) NOT NULL DEFAULT 'ENTRY',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 4. Applications Table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    status application_status NOT NULL DEFAULT 'APPLIED',
    current_stage stage_name NOT NULL DEFAULT 'ATS',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 5. Candidate Mappings Table (UUID to Subsystem IDs Mapping)
CREATE TABLE candidate_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capvia_candidate_uuid UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    ats_user_uuid UUID UNIQUE,
    simulation_candidate_id INTEGER UNIQUE,
    interview_candidate_uuid UUID UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vacancy Mappings Table
CREATE TABLE vacancy_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capvia_vacancy_uuid UUID NOT NULL UNIQUE REFERENCES internships(id) ON DELETE CASCADE,
    ats_jd_uuid UUID UNIQUE,
    simulation_internship_id INTEGER UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Application Mappings Table
CREATE TABLE application_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    ats_resume_uuid UUID UNIQUE,
    simulation_attempt_id INTEGER UNIQUE,
    simulation_application_id INTEGER UNIQUE,
    interview_session_uuid UUID UNIQUE,
    ats_score NUMERIC(5, 2) DEFAULT NULL,
    simulation_score NUMERIC(5, 2) DEFAULT NULL,
    interview_answer_score_pct INTEGER DEFAULT NULL,
    interview_integrity_score INTEGER DEFAULT NULL,
    combined_risk_level risk_level DEFAULT 'LOW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. ATS Results Table
CREATE TABLE ats_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL,
    score_band VARCHAR(20) NOT NULL,
    detected_role VARCHAR(100) DEFAULT NULL,
    role_confidence NUMERIC(3, 2) DEFAULT NULL,
    matched_skills TEXT[] NOT NULL DEFAULT '{}',
    missing_skills TEXT[] NOT NULL DEFAULT '{}',
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    fraud_probability NUMERIC(5, 4) DEFAULT 0.0,
    fraud_flags JSONB NOT NULL DEFAULT '[]',
    raw_analysis JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 9. Simulation Results Table
CREATE TABLE simulation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    attempt_id INTEGER NOT NULL UNIQUE,
    total_score NUMERIC(5, 2) NOT NULL,
    recommendation VARCHAR(50) NOT NULL,
    cheating_risk_level risk_level NOT NULL DEFAULT 'LOW',
    ai_dependency_score NUMERIC(3, 2) DEFAULT 0.0,
    round_scores JSONB NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 10. Interview Results Table (Naming conventions aligned with contract)
CREATE TABLE interview_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    overall_answer_score_pct INTEGER NOT NULL,
    overall_integrity_score INTEGER NOT NULL,
    cheating_probability_pct INTEGER NOT NULL,
    risk_level risk_level NOT NULL DEFAULT 'LOW',
    recommendation recommendation_type NOT NULL,
    video_url VARCHAR(512) NOT NULL,
    baselined_locally BOOLEAN NOT NULL DEFAULT FALSE,
    local_evaluation_report JSONB DEFAULT NULL,
    strengths TEXT[] NOT NULL DEFAULT '{}',
    improvements TEXT[] NOT NULL DEFAULT '{}',
    raw_report JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 11. Integrity Results Table (Detailed anti-cheat proctoring logs)
CREATE TABLE integrity_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    focus_percentage INTEGER NOT NULL,
    look_away_count INTEGER NOT NULL,
    head_stability_pct INTEGER NOT NULL,
    head_movements_count INTEGER NOT NULL,
    face_visibility_pct INTEGER NOT NULL,
    face_absences_count INTEGER NOT NULL,
    multi_face_events INTEGER NOT NULL,
    phone_detections_count INTEGER NOT NULL,
    tab_switches INTEGER NOT NULL,
    copy_pastes INTEGER NOT NULL,
    suspicious_keys INTEGER NOT NULL,
    violations JSONB NOT NULL DEFAULT '[]',
    -- Phase 13: Compiled Integrity Engine Results
    integrity_score INTEGER DEFAULT NULL,
    ai_dependency_score NUMERIC(5, 4) DEFAULT NULL,
    trust_index INTEGER DEFAULT NULL,
    compiled_risk_level VARCHAR(20) DEFAULT NULL,
    confidence_level NUMERIC(5, 4) DEFAULT NULL,
    explainability JSONB DEFAULT NULL,
    scoring_formula JSONB DEFAULT NULL,
    calibration_logic JSONB DEFAULT NULL,
    audit_trail JSONB DEFAULT NULL,
    historical_tracking JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 12. DNA Profiles Table
CREATE TABLE dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    technical_alignment NUMERIC(5, 2) NOT NULL,
    project_alignment NUMERIC(5, 2) NOT NULL,
    experience_alignment NUMERIC(5, 2) NOT NULL,
    domain_alignment NUMERIC(5, 2) NOT NULL,
    semantic_match_strength NUMERIC(5, 2) NOT NULL,
    readability NUMERIC(5, 2) NOT NULL,
    clarity NUMERIC(5, 2) NOT NULL,
    ats_compatibility NUMERIC(5, 2) NOT NULL,
    technical_depth NUMERIC(5, 2) NOT NULL,
    practical_exposure NUMERIC(5, 2) NOT NULL,
    internship_readiness NUMERIC(5, 2) NOT NULL,
    hiring_readiness_score NUMERIC(5, 2) NOT NULL,
    capability_score NUMERIC(5, 2) NOT NULL,
    candidate_level VARCHAR(50) NOT NULL,
    -- Phase 14: Capability Intelligence Dimensions (0-100)
    problem_solving INTEGER DEFAULT NULL,
    execution INTEGER DEFAULT NULL,
    communication INTEGER DEFAULT NULL,
    learning_ability INTEGER DEFAULT NULL,
    adaptability INTEGER DEFAULT NULL,
    consistency INTEGER DEFAULT NULL,
    confidence INTEGER DEFAULT NULL,
    role_fit INTEGER DEFAULT NULL,
    leadership_potential INTEGER DEFAULT NULL,
    -- Phase 14: Derived Structures
    radar_chart_data JSONB DEFAULT NULL,
    capability_vectors JSONB DEFAULT NULL,
    comparative_analysis JSONB DEFAULT NULL,
    historical_trends JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 13. Rankings Table (Phase 15: Full Ranking Engine)
CREATE TABLE rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,

    -- Phase 15: Weighted composite final score (0–100)
    final_score NUMERIC(5, 2) DEFAULT NULL,

    -- Phase 15: Per-component weighted contributions
    ats_component NUMERIC(5, 2) DEFAULT NULL,        -- raw_score * 0.25
    simulation_component NUMERIC(5, 2) DEFAULT NULL, -- raw_score * 0.30
    interview_component NUMERIC(5, 2) DEFAULT NULL,  -- raw_score * 0.25
    integrity_component NUMERIC(5, 2) DEFAULT NULL,  -- raw_score * 0.20

    -- Phase 15: Raw source scores (pre-weighting)
    ats_raw_score NUMERIC(5, 2) DEFAULT NULL,
    simulation_raw_score NUMERIC(5, 2) DEFAULT NULL,
    interview_raw_score NUMERIC(5, 2) DEFAULT NULL,
    integrity_raw_score NUMERIC(5, 2) DEFAULT NULL,

    -- Phase 15: Computed rankings
    internship_rank INTEGER DEFAULT NULL,       -- Position within this internship cohort
    company_rank INTEGER DEFAULT NULL,          -- Position across entire company
    global_percentile NUMERIC(5, 2) DEFAULT NULL,  -- 0.00–100.00

    -- Phase 15: Derived signals
    is_top_candidate BOOLEAN NOT NULL DEFAULT FALSE,  -- True when top 10% of internship cohort
    recommendation_tier VARCHAR(50) DEFAULT NULL,     -- PLATINUM / GOLD / SILVER / BRONZE / UNRANKED
    data_completeness NUMERIC(5, 4) DEFAULT NULL,     -- Fraction of phases with data (0.0–1.0)

    -- Phase 15: Explainability, breakdown, and analytics JSONB
    explainability JSONB DEFAULT NULL,
    score_breakdown JSONB DEFAULT NULL,
    ranking_analytics JSONB DEFAULT NULL,
    audit_trail JSONB DEFAULT NULL,

    -- Legacy columns (kept for backward compatibility)
    score NUMERIC(5, 2) DEFAULT NULL,
    rank INTEGER DEFAULT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 14. Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    pdf_url VARCHAR(512) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 15. Activity Logs Table (Auditability)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(512) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 17. User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(512) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================================
-- Trigger Architecture for PostgreSQL Auto-Timestamp updates
-- =========================================================================

-- Trigger Function definition
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger Bindings
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_internships_updated_at BEFORE UPDATE ON internships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_candidate_mappings_updated_at BEFORE UPDATE ON candidate_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_vacancy_mappings_updated_at BEFORE UPDATE ON vacancy_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_application_mappings_updated_at BEFORE UPDATE ON application_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_ats_results_updated_at BEFORE UPDATE ON ats_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_simulation_results_updated_at BEFORE UPDATE ON simulation_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_interview_results_updated_at BEFORE UPDATE ON interview_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_integrity_results_updated_at BEFORE UPDATE ON integrity_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_dna_profiles_updated_at BEFORE UPDATE ON dna_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_rankings_updated_at BEFORE UPDATE ON rankings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Company Members indexes
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_companies_created_by ON companies(created_by);

-- =========================================================================
-- Indexes (Scalable query indexing strategy with Partial Indexes)
-- =========================================================================

-- Unique indexes on active entries (Soft delete exclusion)
CREATE UNIQUE INDEX uq_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_companies_name_active ON companies(name) WHERE deleted_at IS NULL;

-- Foreign key lookup indexes
CREATE INDEX idx_internships_company ON internships(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_candidate ON applications(candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_vacancy ON applications(vacancy_id) WHERE deleted_at IS NULL;

-- Composite indexes for application unique checking
CREATE UNIQUE INDEX uq_candidate_vacancy_active ON applications(candidate_id, vacancy_id) WHERE deleted_at IS NULL;

-- Dynamic query lookup indexes
CREATE INDEX idx_applications_status ON applications(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_rankings_internship_score ON rankings(internship_id, final_score DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_rankings_internship_rank ON rankings(internship_id, internship_rank ASC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_rankings_top_candidates ON rankings(internship_id) WHERE is_top_candidate = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Mapping lookups (UUID -> Integer / Integer -> UUID mappings resolution)
CREATE INDEX idx_candidate_mappings_simulation ON candidate_mappings(simulation_candidate_id);
CREATE INDEX idx_vacancy_mappings_simulation ON vacancy_mappings(simulation_internship_id);
CREATE INDEX idx_application_mappings_attempt ON application_mappings(simulation_attempt_id);

-- User Sessions indexes
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);

