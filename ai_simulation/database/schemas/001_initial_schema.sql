-- ===================================================================
-- AI SIMULATION ENGINE - COMPLETE DATABASE SCHEMA
-- PostgreSQL 15+
-- Author: AI Simulation Team
-- Version: 1.0.0
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For similarity searches

-- ===================================================================
-- ENUMS (Custom Types)
-- ===================================================================

CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'candidate');
CREATE TYPE session_status AS ENUM ('created', 'active', 'paused', 'completed', 'expired', 'abandoned');
CREATE TYPE question_module AS ENUM ('understanding', 'execution', 'decision', 'explanation', 'debugging');
CREATE TYPE question_type AS ENUM ('text', 'code', 'multiple_choice', 'debugging', 'data_analysis');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'expert');
CREATE TYPE programming_language AS ENUM ('python', 'javascript', 'java', 'typescript', 'go', 'rust');
CREATE TYPE event_type AS ENUM (
    'keystroke', 'paste', 'copy', 'tab_switch', 'window_blur', 
    'window_focus', 'idle_start', 'idle_end', 'mouse_move', 
    'code_run', 'code_error', 'submit_attempt'
);
CREATE TYPE evaluator_type AS ENUM ('semantic', 'code_quality', 'llm_detection', 'similarity', 'behavior');
CREATE TYPE recommendation_type AS ENUM ('strong_hire', 'hire', 'maybe', 'no_hire', 'strong_reject');

-- ===================================================================
-- TABLE: users
-- Purpose: Store all user accounts (admins, recruiters, candidates)
-- ===================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'candidate',
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ===================================================================
-- TABLE: test_configs
-- Purpose: Reusable test configurations/templates
-- ===================================================================

CREATE TABLE test_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    role_target VARCHAR(100) NOT NULL,  -- e.g., 'software_engineer', 'data_scientist'
    difficulty difficulty_level DEFAULT 'medium',
    time_limit_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Module configuration (JSONB for flexibility)
    module_config JSONB NOT NULL DEFAULT '{
        "understanding": {"enabled": true, "time_limit": 12, "question_count": 3},
        "execution": {"enabled": true, "time_limit": 25, "question_count": 2},
        "decision": {"enabled": true, "time_limit": 10, "question_count": 2},
        "explanation": {"enabled": true, "time_limit": 10, "question_count": 2},
        "debugging": {"enabled": true, "time_limit": 12, "question_count": 1}
    }',
    
    -- Scoring weights
    scoring_weights JSONB NOT NULL DEFAULT '{
        "accuracy": 0.40,
        "logic": 0.25,
        "speed": 0.15,
        "explanation": 0.10,
        "behavior": 0.10
    }',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_configs_role ON test_configs(role_target);

-- ===================================================================
-- TABLE: test_sessions
-- Purpose: Individual test-taking sessions
-- ===================================================================

CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    candidate_id UUID NOT NULL REFERENCES users(id),
    test_config_id UUID NOT NULL REFERENCES test_configs(id),
    created_by UUID REFERENCES users(id),  -- Recruiter who created it
    
    -- Session details
    status session_status DEFAULT 'created',
    access_token VARCHAR(255) UNIQUE,  -- One-time access token
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    time_limit_minutes INTEGER NOT NULL DEFAULT 60,
    time_remaining_seconds INTEGER,
    
    -- Session data
    current_module question_module,
    current_question_index INTEGER DEFAULT 0,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    browser_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (
        (started_at IS NULL OR ended_at IS NULL) OR 
        (started_at < ended_at)
    )
);

CREATE INDEX idx_sessions_candidate ON test_sessions(candidate_id);
CREATE INDEX idx_sessions_status ON test_sessions(status);
CREATE INDEX idx_sessions_access_token ON test_sessions(access_token);
CREATE INDEX idx_sessions_created_at ON test_sessions(created_at);
CREATE INDEX idx_sessions_scheduled_at ON test_sessions(scheduled_at);

-- ===================================================================
-- TABLE: questions
-- Purpose: Question bank for all modules
-- ===================================================================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Classification
    module question_module NOT NULL,
    type question_type NOT NULL,
    difficulty difficulty_level DEFAULT 'medium',
    role_target VARCHAR(100),  -- NULL means applicable to all roles
    
    -- Question content (JSONB for flexibility)
    content JSONB NOT NULL,
    /*
    Example structure:
    {
        "title": "Find Longest Substring",
        "description": "Implement a function...",
        "instructions": "Write your code below...",
        "starter_code": "def function():\n    pass",
        "test_cases": [...],
        "hints": ["Consider using a sliding window"],
        "time_estimate_minutes": 15
    }
    */
    
    -- Expected answer/solution
    expected_answer JSONB,
    /*
    Example structure:
    {
        "keywords": ["sliding window", "hash map"],
        "solution_code": "def function()...",
        "explanation": "This problem can be solved using...",
        "time_complexity": "O(n)",
        "space_complexity": "O(min(n,m))"
    }
    */
    
    -- For code questions
    language programming_language,
    test_cases JSONB,  -- Array of input/output pairs
    
    -- Scoring criteria
    max_score INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 60,
    
    -- Metadata
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    average_time_seconds INTEGER,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_module ON questions(module);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_role ON questions(role_target);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = TRUE;

-- ===================================================================
-- TABLE: session_questions
-- Purpose: Junction table - which questions are in which session
-- ===================================================================

CREATE TABLE session_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    
    module question_module NOT NULL,
    sequence_order INTEGER NOT NULL,
    
    -- State
    is_answered BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(session_id, question_id),
    UNIQUE(session_id, sequence_order)
);

CREATE INDEX idx_session_questions_session ON session_questions(session_id);
CREATE INDEX idx_session_questions_question ON session_questions(question_id);
CREATE INDEX idx_session_questions_module ON session_questions(module);

-- ===================================================================
-- TABLE: submissions
-- Purpose: Store candidate answers
-- ===================================================================

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    session_question_id UUID REFERENCES session_questions(id),
    
    -- Answer content (JSONB for flexibility)
    answer JSONB NOT NULL,
    /*
    Example structures:
    
    Text answer:
    {
        "type": "text",
        "content": "The main problem is...",
        "word_count": 45
    }
    
    Code answer:
    {
        "type": "code",
        "language": "python",
        "code": "def solution()...",
        "line_count": 25,
        "character_count": 450
    }
    
    Multiple choice:
    {
        "type": "multiple_choice",
        "selected": ["A", "C"],
        "justification": "I chose these because..."
    }
    */
    
    -- Execution results (for code questions)
    execution_results JSONB,
    /*
    {
        "status": "success",
        "test_results": [
            {"test_id": 1, "passed": true, "output": "...", "expected": "..."},
            {"test_id": 2, "passed": false, "output": "...", "expected": "..."}
        ],
        "stdout": "...",
        "stderr": "...",
        "execution_time_ms": 245,
        "memory_used_mb": 12
    }
    */
    
    -- Version control
    version INTEGER DEFAULT 1,
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Timing
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_taken_seconds INTEGER NOT NULL,
    
    -- Metadata
    ip_address INET,
    
    CONSTRAINT unique_final_submission UNIQUE(session_id, question_id, is_final) 
        WHERE is_final = TRUE
);

CREATE INDEX idx_submissions_session ON submissions(session_id);
CREATE INDEX idx_submissions_question ON submissions(question_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX idx_submissions_final ON submissions(is_final) WHERE is_final = TRUE;

-- ===================================================================
-- TABLE: behavioral_events
-- Purpose: Log all candidate interactions
-- ===================================================================

CREATE TABLE behavioral_events (
    id BIGSERIAL PRIMARY KEY,
    
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    
    event_type event_type NOT NULL,
    
    -- Event data (JSONB for flexibility)
    event_data JSONB,
    /*
    Examples:
    
    Keystroke:
    {
        "key": "a",
        "shift": false,
        "ctrl": false,
        "timestamp_ms": 1234567890
    }
    
    Paste:
    {
        "content_length": 150,
        "source": "clipboard",
        "content_preview": "def function()..."
    }
    
    Tab switch:
    {
        "from_tab": "test",
        "to_tab": null,
        "duration_ms": 5000
    }
    
    Mouse move:
    {
        "x": 450,
        "y": 300,
        "element": "code-editor"
    }
    */
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Partitioning hint
    created_date DATE GENERATED ALWAYS AS (timestamp::DATE) STORED
);

-- Partition by month for better performance
CREATE INDEX idx_behavioral_events_session ON behavioral_events(session_id);
CREATE INDEX idx_behavioral_events_type ON behavioral_events(event_type);
CREATE INDEX idx_behavioral_events_timestamp ON behavioral_events(timestamp);
CREATE INDEX idx_behavioral_events_question ON behavioral_events(question_id);

-- ===================================================================
-- TABLE: evaluations
-- Purpose: Store evaluation results from different AI engines
-- ===================================================================

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    evaluator_type evaluator_type NOT NULL,
    
    -- Scores
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Detailed results (JSONB)
    details JSONB,
    /*
    Example (Semantic Evaluator):
    {
        "keyword_matches": ["cache", "database", "optimization"],
        "semantic_similarity": 0.87,
        "completeness_score": 0.92,
        "key_concepts_covered": ["caching", "query optimization"],
        "missing_concepts": ["connection pooling"]
    }
    
    Example (Code Analyzer):
    {
        "correctness": 0.90,
        "test_cases_passed": 8,
        "test_cases_total": 10,
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "code_quality": 0.85,
        "cyclomatic_complexity": 5,
        "maintainability_index": 78,
        "issues": ["Missing edge case handling for empty list"]
    }
    
    Example (LLM Detector):
    {
        "llm_probability": 0.23,
        "is_likely_ai": false,
        "indicators": {
            "formal_language": 0.15,
            "perfect_grammar": 0.30,
            "generic_phrases": 0.10,
            "hedging_language": 0.05
        },
        "patterns_detected": ["numbered_lists", "transitional_phrases"]
    }
    
    Example (Similarity Engine):
    {
        "similarity_score": 0.15,
        "is_plagiarized": false,
        "sources_checked": 1500,
        "closest_match": {
            "url": "stackoverflow.com/...",
            "similarity": 0.15
        }
    }
    
    Example (Behavior Scorer):
    {
        "typing_consistency": 0.88,
        "paste_frequency": 2,
        "tab_switches": 5,
        "idle_periods": 3,
        "suspicious_patterns": ["sudden_code_paste"],
        "risk_level": "low"
    }
    */
    
    -- Processing metadata
    processing_time_ms INTEGER,
    model_version VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evaluations_submission ON evaluations(submission_id);
CREATE INDEX idx_evaluations_type ON evaluations(evaluator_type);
CREATE INDEX idx_evaluations_created_at ON evaluations(created_at);

-- ===================================================================
-- TABLE: final_scores
-- Purpose: Aggregated final scores and recommendations
-- ===================================================================

CREATE TABLE final_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    session_id UUID NOT NULL UNIQUE REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Module-wise scores
    module_scores JSONB NOT NULL,
    /*
    {
        "understanding": {
            "score": 85,
            "max_score": 100,
            "questions_answered": 3,
            "questions_total": 3,
            "time_taken": 720
        },
        "execution": {...},
        "decision": {...},
        "explanation": {...},
        "debugging": {...}
    }
    */
    
    -- Component scores (before weighting)
    accuracy_score DECIMAL(5,2) NOT NULL,
    logic_score DECIMAL(5,2) NOT NULL,
    speed_score DECIMAL(5,2) NOT NULL,
    explanation_score DECIMAL(5,2) NOT NULL,
    behavior_score DECIMAL(5,2) NOT NULL,
    
    -- Final weighted score
    total_score DECIMAL(5,2) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    
    -- Cheating detection
    cheating_risk DECIMAL(3,2) CHECK (cheating_risk >= 0 AND cheating_risk <= 1),
    cheating_indicators JSONB,
    /*
    {
        "paste_events": 3,
        "tab_switches": 8,
        "llm_probability": 0.15,
        "code_similarity": 0.12,
        "typing_anomalies": 2,
        "red_flags": ["sudden_paste_50_lines"]
    }
    */
    
    -- Recommendation
    recommendation recommendation_type NOT NULL,
    recommendation_confidence DECIMAL(3,2),
    
    -- Comparative metrics
    percentile INTEGER CHECK (percentile >= 0 AND percentile <= 100),
    rank_in_cohort INTEGER,
    cohort_size INTEGER,
    
    -- Summary
    strengths TEXT[],
    weaknesses TEXT[],
    notes TEXT,
    
    -- Report
    report_url VARCHAR(500),
    report_generated_at TIMESTAMP WITH TIME ZONE,
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100) DEFAULT 'system'
);

CREATE INDEX idx_final_scores_session ON final_scores(session_id);
CREATE INDEX idx_final_scores_total_score ON final_scores(total_score DESC);
CREATE INDEX idx_final_scores_recommendation ON final_scores(recommendation);
CREATE INDEX idx_final_scores_generated_at ON final_scores(generated_at);

-- ===================================================================
-- TABLE: audit_logs
-- Purpose: System-wide audit trail
-- ===================================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ===================================================================
-- TABLE: system_config
-- Purpose: System-wide configuration
-- ===================================================================

CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- ===================================================================
-- VIEWS
-- ===================================================================

-- Active sessions view
CREATE VIEW v_active_sessions AS
SELECT 
    s.id,
    s.candidate_id,
    u.full_name AS candidate_name,
    u.email AS candidate_email,
    s.status,
    s.started_at,
    s.time_limit_minutes,
    s.time_remaining_seconds,
    tc.name AS test_name,
    tc.role_target
FROM test_sessions s
JOIN users u ON s.candidate_id = u.id
JOIN test_configs tc ON s.test_config_id = tc.id
WHERE s.status IN ('active', 'paused');

-- Session summary view
CREATE VIEW v_session_summary AS
SELECT 
    s.id AS session_id,
    s.candidate_id,
    u.full_name AS candidate_name,
    s.status,
    COUNT(sq.id) AS total_questions,
    COUNT(sq.id) FILTER (WHERE sq.is_answered) AS answered_questions,
    COUNT(DISTINCT sq.module) AS modules_attempted,
    fs.total_score,
    fs.recommendation,
    s.created_at,
    s.started_at,
    s.ended_at
FROM test_sessions s
JOIN users u ON s.candidate_id = u.id
LEFT JOIN session_questions sq ON s.id = sq.session_id
LEFT JOIN final_scores fs ON s.id = fs.session_id
GROUP BY s.id, u.full_name, s.status, fs.total_score, fs.recommendation, 
         s.created_at, s.started_at, s.ended_at;

-- ===================================================================
-- FUNCTIONS
-- ===================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS
-- ===================================================================

-- Auto-update updated_at for users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for test_configs
CREATE TRIGGER update_test_configs_updated_at
    BEFORE UPDATE ON test_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for test_sessions
CREATE TRIGGER update_test_sessions_updated_at
    BEFORE UPDATE ON test_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for questions
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- INITIAL DATA
-- ===================================================================

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (email, password_hash, full_name, role, is_email_verified)
VALUES (
    'admin@aisimulation.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaOb9O6',  -- hashed 'admin123'
    'System Administrator',
    'admin',
    TRUE
);

-- Insert default system config
INSERT INTO system_config (key, value, description) VALUES
('max_concurrent_sessions_per_user', '1', 'Maximum concurrent test sessions per candidate'),
('session_timeout_minutes', '120', 'Auto-expire sessions after this duration'),
('max_code_execution_time_seconds', '5', 'Maximum time for code execution'),
('enable_proctoring', 'true', 'Enable behavioral tracking'),
('min_passing_score', '60', 'Minimum score to pass');

-- ===================================================================
-- SCHEMA COMPLETE
-- Total tables: 13
-- Total views: 2
-- Total functions: 1
-- Total triggers: 4
-- ===================================================================