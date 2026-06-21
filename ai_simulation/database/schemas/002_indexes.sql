-- ===================================================================
-- AI SIMULATION ENGINE - PERFORMANCE INDEXES
-- Purpose: Additional indexes for query optimization
-- Run after initial schema is created
-- ===================================================================

-- ===================================================================
-- COMPOSITE INDEXES (Multi-column for common query patterns)
-- ===================================================================

-- Sessions by candidate and status (for candidate dashboard)
CREATE INDEX idx_sessions_candidate_status 
ON test_sessions(candidate_id, status, created_at DESC);

-- Sessions by recruiter and date (for recruiter dashboard)
CREATE INDEX idx_sessions_recruiter_date 
ON test_sessions(created_by, created_at DESC) 
WHERE created_by IS NOT NULL;

-- Questions by module, difficulty, and active status
CREATE INDEX idx_questions_module_difficulty 
ON questions(module, difficulty, is_active) 
WHERE is_active = TRUE;

-- Submissions by session and timestamp (for timeline view)
CREATE INDEX idx_submissions_session_time 
ON submissions(session_id, submitted_at DESC);

-- Evaluations by submission and evaluator type
CREATE INDEX idx_evaluations_submission_type 
ON evaluations(submission_id, evaluator_type);

-- ===================================================================
-- PARTIAL INDEXES (For specific queries)
-- ===================================================================

-- Active sessions only (most frequent query)
CREATE INDEX idx_sessions_active 
ON test_sessions(started_at DESC) 
WHERE status = 'active';

-- Pending evaluations (submissions without final scores)
CREATE INDEX idx_submissions_pending_eval 
ON submissions(submitted_at DESC) 
WHERE is_final = TRUE 
AND id NOT IN (SELECT DISTINCT submission_id FROM evaluations);

-- High-risk sessions (for admin review)
CREATE INDEX idx_scores_high_risk 
ON final_scores(session_id) 
WHERE cheating_risk > 0.5;

-- Recent behavioral events (for real-time monitoring)
CREATE INDEX idx_events_recent 
ON behavioral_events(session_id, timestamp DESC) 
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour';

-- ===================================================================
-- JSONB INDEXES (For fast JSONB queries)
-- ===================================================================

-- Index on question content
CREATE INDEX idx_questions_content_gin 
ON questions USING GIN(content);

-- Index on submission answers
CREATE INDEX idx_submissions_answer_gin 
ON submissions USING GIN(answer);

-- Index on evaluation details
CREATE INDEX idx_evaluations_details_gin 
ON evaluations USING GIN(details);

-- Index on module scores in final_scores
CREATE INDEX idx_final_scores_modules_gin 
ON final_scores USING GIN(module_scores);

-- Index on behavioral event data
CREATE INDEX idx_behavioral_events_data_gin 
ON behavioral_events USING GIN(event_data);

-- ===================================================================
-- SPECIFIC JSONB PATH INDEXES (For exact field queries)
-- ===================================================================

-- Index on question difficulty in content
CREATE INDEX idx_questions_time_estimate 
ON questions((content->>'time_estimate_minutes'));

-- Index on test case count
CREATE INDEX idx_questions_test_count 
ON questions(((test_cases::jsonb) -> 'length'));

-- Index on code language in submissions
CREATE INDEX idx_submissions_language 
ON submissions((answer->>'language'));

-- Index on LLM probability in evaluations
CREATE INDEX idx_evaluations_llm_prob 
ON evaluations(((details->'llm_probability')::decimal)) 
WHERE evaluator_type = 'llm_detection';

-- ===================================================================
-- FULL-TEXT SEARCH INDEXES
-- ===================================================================

-- Full-text search on question content
CREATE INDEX idx_questions_content_fts 
ON questions USING GIN(
    to_tsvector('english', 
        COALESCE(content->>'title', '') || ' ' ||
        COALESCE(content->>'description', '')
    )
);

-- Full-text search on user names and emails
CREATE INDEX idx_users_fulltext 
ON users USING GIN(
    to_tsvector('english', full_name || ' ' || email)
);

-- ===================================================================
-- TRIGRAM INDEXES (For similarity/fuzzy search)
-- ===================================================================

-- Candidate name similarity search
CREATE INDEX idx_users_name_trgm 
ON users USING GIN(full_name gin_trgm_ops);

-- Question title similarity
CREATE INDEX idx_questions_title_trgm 
ON questions USING GIN((content->>'title') gin_trgm_ops);

-- ===================================================================
-- COVERING INDEXES (Include frequently accessed columns)
-- ===================================================================

-- Session lookup with candidate info
CREATE INDEX idx_sessions_lookup 
ON test_sessions(id) 
INCLUDE (candidate_id, status, started_at, ended_at);

-- Submission lookup with timing
CREATE INDEX idx_submissions_lookup 
ON submissions(id) 
INCLUDE (session_id, question_id, submitted_at, time_taken_seconds);

-- ===================================================================
-- STATISTICS TARGETS (Improve query planner estimates)
-- ===================================================================

-- Increase statistics for frequently filtered columns
ALTER TABLE test_sessions ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE questions ALTER COLUMN module SET STATISTICS 1000;
ALTER TABLE submissions ALTER COLUMN is_final SET STATISTICS 1000;
ALTER TABLE behavioral_events ALTER COLUMN event_type SET STATISTICS 1000;

-- ===================================================================
-- ANALYZE (Update table statistics)
-- ===================================================================

ANALYZE users;
ANALYZE test_sessions;
ANALYZE questions;
ANALYZE submissions;
ANALYZE behavioral_events;
ANALYZE evaluations;
ANALYZE final_scores;

-- ===================================================================
-- INDEX USAGE MONITORING QUERY (Run periodically)
-- ===================================================================

/*
-- Check for unused indexes:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_%'
ORDER BY schemaname, tablename;

-- Check for missing indexes (sequential scans on large tables):
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY seq_tup_read DESC
LIMIT 20;
*/

-- ===================================================================
-- PERFORMANCE TIPS
-- ===================================================================

/*
1. Regular VACUUM ANALYZE:
   - Run weekly: VACUUM ANALYZE;
   - Or enable autovacuum (should be on by default)

2. Monitor bloat:
   - Use pg_stat_user_tables to check for bloated tables
   - Run VACUUM FULL if bloat > 20%

3. Index maintenance:
   - REINDEX monthly for heavily updated tables
   - REINDEX CONCURRENTLY to avoid locking

4. Partitioning considerations:
   - Consider partitioning behavioral_events by month
   - Use declarative partitioning for PostgreSQL 10+

5. Connection pooling:
   - Use PgBouncer or connection pooling in application
   - Recommended pool size: (2 * CPU cores) + disk spindles
*/

-- ===================================================================
-- INDEXES COMPLETE
-- Total additional indexes: 30+
-- ===================================================================