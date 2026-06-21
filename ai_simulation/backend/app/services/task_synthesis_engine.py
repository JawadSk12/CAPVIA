"""
Task Synthesis Engine
Dynamically synthesizes unique simulation tasks from a capability graph.
Each round produces context-specific, specialization-aware tasks.
"""
import random
from typing import Dict, List, Any

# ──────────────────────────────────────────────────────────────────────────────
# ROUND TASK TEMPLATES per specialization
# Variables: {title}, {spec}, {skill}, {dataset}, {tool}, {concept}, {workflow}, {bug_desc}, {bug_cause}, {bug_fix}, {arch_topic}
# ──────────────────────────────────────────────────────────────────────────────

ROUND_TEMPLATES: Dict[str, Dict[str, List[Dict]]] = {

    # ── ROUND 1: REQUIREMENT ANALYSIS ────────────────────────────────────────
    "round_1": {

        "nlp": [{"scenario": "Your team at a mid-size e-commerce company has been given a dataset of {dataset}. The CTO wants an automated {concept} system to reduce manual review time by 80%.", "task": "Write a technical requirements document for this NLP system. Define: (1) functional requirements covering data ingestion, preprocessing, and inference, (2) non-functional requirements including latency (<200ms P95), accuracy (>90% F1), and scalability, (3) edge cases such as multilingual input, empty strings, adversarial text. (4) acceptance criteria for the MVP.", "type": "written", "scoring_hints": ["functional_requirements", "non_functional", "edge_cases", "acceptance_criteria"]}],

        "computer_vision": [{"scenario": "A manufacturing client needs an automated visual defect detection system. You've been handed {dataset}. Current manual inspection catches 72% of defects — they need ≥97%.", "task": "Define the complete system requirements: (1) data requirements — labeling standards, class balance, augmentation strategy, (2) model requirements — architecture choice and justification, inference speed (≥30 FPS), (3) integration requirements — camera hardware, API contract, alert thresholds, (4) failure mode analysis — what happens when confidence < threshold.", "type": "written", "scoring_hints": ["data_requirements", "model_requirements", "integration", "failure_modes"]}],

        "mlops": [{"scenario": "Your company's ML model is deployed but the team has no visibility into performance drift, retraining triggers, or deployment health. You have access to {dataset}.", "task": "Design the requirements for a complete ML observability platform: (1) metrics to monitor — data drift, concept drift, latency, error rate, (2) alerting thresholds and escalation rules, (3) automated retraining triggers and approval gates, (4) rollback conditions and procedures.", "type": "written", "scoring_hints": ["drift_metrics", "alerting", "retraining_triggers", "rollback"]}],

        "forecasting": [{"scenario": "A retail chain needs demand forecasting for 500 SKUs across 50 stores. You've been given {dataset}. Inventory planners need 4-week-ahead forecasts every Monday morning.", "task": "Write requirements for the forecasting system: (1) forecast horizon, granularity, and update frequency, (2) handling of seasonality, promotions, and stockouts in historical data, (3) accuracy thresholds per product category (MAPE, WMAPE), (4) how the system handles cold-start (new SKUs with <4 weeks of history).", "type": "written", "scoring_hints": ["horizon_granularity", "data_handling", "accuracy_metrics", "cold_start"]}],

        "generative_ai": [{"scenario": "A law firm wants an internal AI assistant that answers questions from {dataset} of company legal documents. It must never hallucinate case citations.", "task": "Define requirements for the RAG-based legal AI assistant: (1) document ingestion pipeline — file types, chunking strategy, metadata extraction, (2) retrieval requirements — similarity threshold, top-k, hybrid search, (3) generation constraints — citation format, refusal behavior, confidence scoring, (4) security — PII handling, access control, audit logging.", "type": "written", "scoring_hints": ["ingestion_pipeline", "retrieval_config", "generation_constraints", "security"]}],

        "frontend": [{"scenario": "You're joining a team rebuilding a slow e-commerce frontend. Performance audit shows {dataset}. Users complain of cart abandonment due to slow checkout.", "task": "Define frontend requirements: (1) Core Web Vitals targets (LCP, FID, CLS) and how to measure them, (2) component architecture strategy — which components need code-splitting, (3) state management requirements — what lives in global vs local state, (4) accessibility requirements (WCAG 2.1 AA minimum).", "type": "written", "scoring_hints": ["performance_targets", "architecture", "state_strategy", "accessibility"]}],

        "backend": [{"scenario": "A startup API is failing under load — {dataset} shows critical bottlenecks. The system needs to handle 10x current traffic for an upcoming product launch.", "task": "Define backend scalability requirements: (1) performance targets — RPS, P99 latency, error rate SLA, (2) database scaling strategy — read replicas, connection pooling, query optimization, (3) caching architecture — what to cache, TTL strategy, invalidation, (4) rate limiting rules and queue-based async processing requirements.", "type": "written", "scoring_hints": ["performance_targets", "db_strategy", "caching", "rate_limiting"]}],

        "devops": [{"scenario": "Your company has a manual deployment process taking 4 hours. {dataset} shows incidents from failed manual deployments. Leadership wants zero-downtime releases.", "task": "Define CI/CD pipeline requirements: (1) pipeline stages and quality gates — lint, test, scan, build, deploy, (2) deployment strategy — blue-green vs canary vs rolling, justification, (3) rollback procedure and maximum allowed downtime, (4) monitoring and alerting requirements post-deployment.", "type": "written", "scoring_hints": ["pipeline_stages", "deployment_strategy", "rollback", "monitoring"]}],

        "data_analytics": [{"scenario": "A SaaS product's user retention is declining. You have {dataset}. Leadership wants to understand why and get a dashboard by Friday.", "task": "Define the analytics requirements: (1) key metrics to track — define retention, activation, and engagement precisely, (2) cohort analysis design — what cohorts, what time windows, (3) dashboard requirements — audience, update frequency, drill-down capabilities, (4) statistical requirements for any A/B test findings.", "type": "written", "scoring_hints": ["metric_definitions", "cohort_design", "dashboard_spec", "statistical_requirements"]}],

        "data_engineering": [{"scenario": "Your company's analysts complain data in the warehouse is always 2 days stale. You have {dataset} showing pipeline bottlenecks.", "task": "Define requirements for a near-real-time data pipeline: (1) latency SLA per data source — clickstream (< 5min), CRM (< 1hr), payments (< 30s), (2) data quality requirements — completeness, uniqueness, freshness checks, (3) schema evolution strategy — how to handle upstream field additions/removals, (4) failure recovery — what happens when a source goes down.", "type": "written", "scoring_hints": ["latency_sla", "data_quality", "schema_evolution", "failure_recovery"]}],

        "cybersecurity": [{"scenario": "A fintech startup is preparing for SOC 2 audit. A preliminary scan shows {dataset}. They have 90 days to remediate.", "task": "Define a security remediation plan: (1) prioritize vulnerabilities by CVSS score and exploitability, (2) define patching SLAs — Critical (<24h), High (<7d), Medium (<30d), (3) network segmentation requirements, (4) access control and least-privilege requirements for each system.", "type": "written", "scoring_hints": ["prioritization", "sla_definition", "segmentation", "access_control"]}],

        "digital_marketing": [{"scenario": "An e-commerce brand's CAC has risen 3x in 6 months. You've been given {dataset} of campaign performance.", "task": "Define a growth strategy requirements document: (1) channel audit — which channels to scale, pause, or test, (2) attribution model selection and justification, (3) A/B testing requirements — sample size, duration, success metrics, (4) budget reallocation criteria — ROAS thresholds per channel.", "type": "written", "scoring_hints": ["channel_audit", "attribution", "ab_test_design", "budget_criteria"]}],

        "finance": [{"scenario": "You're preparing a financial model for a Series B SaaS company raising $20M. You have {dataset}.", "task": "Define the financial model requirements: (1) revenue model — ARR, MRR, expansion, churn components, (2) key assumptions to model — growth rate, gross margin, sales efficiency, (3) scenario analysis requirements — base, bull, bear cases with triggers, (4) investor-ready outputs — waterfall, cap table impact, runway.", "type": "written", "scoring_hints": ["revenue_model", "assumptions", "scenarios", "investor_outputs"]}],

        "product_management": [{"scenario": "User research shows {dataset} of unmet needs. You have 1 engineering team (5 devs) and 1 quarter to ship.", "task": "Write a product requirements document (PRD): (1) problem statement with user evidence, (2) success metrics — primary (North Star), secondary, guardrail, (3) feature scope with acceptance criteria for each, (4) out-of-scope items and rationale.", "type": "written", "scoring_hints": ["problem_statement", "success_metrics", "feature_scope", "out_of_scope"]}],

        "general_ml": [{"scenario": "A business team wants to reduce customer churn. You have {dataset} with 18 months of historical data.", "task": "Define the ML project requirements: (1) problem formulation — classification vs regression, prediction horizon, (2) success metrics — F1, precision/recall tradeoff based on business cost of false positives vs negatives, (3) data requirements — minimum history, required features, labeling strategy, (4) deployment requirements — batch vs real-time, update frequency.", "type": "written", "scoring_hints": ["problem_formulation", "metrics_with_rationale", "data_requirements", "deployment_plan"]}],
    },

    # ── ROUND 2: TECHNICAL EXECUTION ─────────────────────────────────────────
    "round_2": {

        "nlp": [{"scenario": "Implement a text classification pipeline for the sentiment analysis task.", "task": "Write a Python function `classify_sentiment(texts: List[str]) -> List[dict]` that:\n1. Preprocesses text (lowercase, remove URLs/special chars)\n2. Uses a transformer model (HuggingFace pipeline or sklearn as fallback)\n3. Returns list of {text, label, confidence} dicts\n4. Handles empty strings and very long texts gracefully\n5. Include error handling and basic unit tests", "type": "code", "language": "python", "scoring_hints": ["preprocessing", "model_usage", "output_format", "error_handling", "tests"]}],

        "computer_vision": [{"scenario": "Build an image classification training loop.", "task": "Write a Python class `ImageClassifierTrainer` using PyTorch that:\n1. Loads images from a folder structure (class_name/image.jpg)\n2. Applies augmentation: RandomHorizontalFlip, RandomRotation(15), Normalize\n3. Uses ResNet-18 with pretrained weights, replaces final FC layer\n4. Implements train_epoch() and validate_epoch() methods\n5. Saves best checkpoint based on validation accuracy", "type": "code", "language": "python", "scoring_hints": ["data_loading", "augmentation", "transfer_learning", "training_loop", "checkpointing"]}],

        "mlops": [{"scenario": "Build a model serving endpoint with monitoring.", "task": "Write a FastAPI application that:\n1. Loads an ML model from disk (joblib/pickle)\n2. Exposes POST /predict endpoint with input validation (Pydantic)\n3. Logs each prediction: input_hash, prediction, latency_ms, model_version\n4. Exposes GET /health and GET /metrics endpoints\n5. Implements circuit breaker — returns 503 if model error rate > 10% in last 60s", "type": "code", "language": "python", "scoring_hints": ["model_loading", "input_validation", "logging", "health_metrics", "circuit_breaker"]}],

        "forecasting": [{"scenario": "Build a time series forecasting pipeline.", "task": "Write Python code that:\n1. Loads the sales dataset (date, store_id, sales)\n2. Detects and handles missing dates by forward-filling\n3. Trains a Prophet model per store with yearly/weekly seasonality\n4. Generates 4-week-ahead forecasts with 80% and 95% confidence intervals\n5. Computes MAPE per store and flags stores where MAPE > 15%", "type": "code", "language": "python", "scoring_hints": ["data_prep", "missing_handling", "model_training", "forecast_output", "evaluation"]}],

        "generative_ai": [{"scenario": "Build a basic RAG pipeline.", "task": "Write Python code for a document Q&A system that:\n1. Chunks documents into 512-token segments with 50-token overlap\n2. Creates embeddings using sentence-transformers (or openai embeddings)\n3. Stores in a simple in-memory vector store with cosine similarity search\n4. Given a question, retrieves top-3 relevant chunks\n5. Formats a prompt with retrieved context and returns answer + source chunks", "type": "code", "language": "python", "scoring_hints": ["chunking", "embedding", "retrieval", "prompt_construction", "source_attribution"]}],

        "frontend": [{"scenario": "Build a reusable data table component.", "task": "Write a React TypeScript component `<DataTable<T> />` that:\n1. Accepts columns: {key, label, sortable?, render?}[] and data: T[]\n2. Implements client-side sorting (ascending/descending toggle)\n3. Adds pagination — configurable page size (10/25/50)\n4. Shows loading skeleton rows when isLoading=true\n5. Supports row selection with onSelect callback", "type": "code", "language": "typescript", "scoring_hints": ["generics", "sorting", "pagination", "loading_state", "selection"]}],

        "backend": [{"scenario": "Build a rate-limited REST API endpoint.", "task": "Write a FastAPI endpoint for user registration that:\n1. Validates input (email format, password ≥8 chars, no disposable emails)\n2. Rate limits to 5 requests/minute per IP using Redis\n3. Hashes password with bcrypt before storing\n4. Sends welcome email via background task (no blocking)\n5. Returns structured error responses with field-level validation messages", "type": "code", "language": "python", "scoring_hints": ["validation", "rate_limiting", "password_hashing", "background_task", "error_format"]}],

        "devops": [{"scenario": "Write a production-ready Kubernetes deployment.", "task": "Write YAML manifests for deploying a Python web app that:\n1. Deployment with 3 replicas, rolling update strategy (maxSurge=1, maxUnavailable=0)\n2. Resource requests (CPU: 100m, Memory: 128Mi) and limits (CPU: 500m, Memory: 512Mi)\n3. Liveness probe (/health, 30s initialDelay) and readiness probe (/ready, 10s)\n4. HorizontalPodAutoscaler scaling 3-10 replicas at 70% CPU\n5. ConfigMap for non-secret config, Secret for DB credentials", "type": "code", "language": "yaml", "scoring_hints": ["deployment_config", "resources", "probes", "hpa", "config_secrets"]}],

        "data_analytics": [{"scenario": "Write SQL analysis for user retention.", "task": "Write SQL queries against tables: events(user_id, event_name, ts), users(user_id, signup_date, plan) to:\n1. Calculate Day-1, Day-7, Day-30 retention by signup week cohort\n2. Find top 5 events correlated with Day-30 retention (users who performed event vs not)\n3. Calculate MRR by plan type for last 6 months\n4. Identify power users (top 10% by event count) and their churn rate vs average\nUse CTEs, not subqueries. Add comments explaining each step.", "type": "code", "language": "sql", "scoring_hints": ["cohort_logic", "correlation_query", "mrr_calculation", "cte_usage", "comments"]}],

        "data_engineering": [{"scenario": "Build an incremental ETL pipeline.", "task": "Write a PySpark pipeline that:\n1. Reads new records from source (filter by updated_at > last_watermark)\n2. Applies transformations: cast types, fill nulls, add partition columns\n3. Deduplicates using MERGE INTO (upsert) on primary key\n4. Runs data quality checks: null rate < 5%, no negative amounts\n5. Updates watermark only if pipeline succeeds (atomic commit)", "type": "code", "language": "python", "scoring_hints": ["incremental_load", "transformations", "upsert", "data_quality", "watermark"]}],

        "cybersecurity": [{"scenario": "Implement secure API authentication.", "task": "Write Python code for a secure authentication system:\n1. JWT token generation with RS256 (not HS256), 15-min expiry\n2. Refresh token rotation — invalidate old refresh token on use\n3. Failed login rate limiting: lock account for 15 min after 5 failures\n4. Password validation: min 12 chars, 1 uppercase, 1 number, 1 special, no common passwords\n5. Audit log every auth event with IP, user agent, success/failure", "type": "code", "language": "python", "scoring_hints": ["rs256_jwt", "token_rotation", "rate_limiting", "password_validation", "audit_log"]}],

        "digital_marketing": [{"scenario": "Analyze campaign performance with Python.", "task": "Write Python code using pandas that:\n1. Loads {dataset} and calculates ROAS, CPA, CTR per campaign\n2. Identifies underperforming campaigns (ROAS < 1.5x) and reasons\n3. Runs statistical significance test on A/B variant performance\n4. Generates weekly trend analysis (7-day rolling avg for key metrics)\n5. Outputs a summary DataFrame sorted by revenue contribution", "type": "code", "language": "python", "scoring_hints": ["metric_calculation", "underperformance_logic", "significance_test", "trend_analysis", "output_format"]}],

        "finance": [{"scenario": "Build a DCF valuation model.", "task": "Write Python code using pandas/numpy that:\n1. Projects 5-year FCF from inputs (revenue_growth, ebitda_margin, capex_pct)\n2. Calculates WACC from: risk_free_rate, equity_risk_premium, beta, debt_cost, tax_rate\n3. Computes terminal value using Gordon Growth Model (g=2.5%)\n4. Discounts all cash flows to present value and sums enterprise value\n5. Builds sensitivity table: EV across WACC (8-12%) × Terminal Growth Rate (1-4%)", "type": "code", "language": "python", "scoring_hints": ["fcf_projection", "wacc_calculation", "terminal_value", "pv_calculation", "sensitivity_table"]}],

        "product_management": [{"scenario": "Prioritize a feature backlog using data.", "task": "You have {dataset}. Write a structured analysis:\n1. Apply RICE scoring to top 10 feature requests (Reach, Impact, Confidence, Effort)\n2. Identify which 3 features maximize impact within a 2-sprint constraint\n3. Write acceptance criteria for the #1 priority feature (Given/When/Then format)\n4. Define the rollout plan: internal beta → 10% users → 100% with rollback triggers", "type": "written", "scoring_hints": ["rice_scoring", "constraint_optimization", "acceptance_criteria", "rollout_plan"]}],

        "general_ml": [{"scenario": "Build a churn prediction model.", "task": "Write Python code using scikit-learn that:\n1. Loads {dataset}, handles missing values (median for numeric, mode for categorical)\n2. Engineers 3 new features (e.g., usage_trend, days_since_last_login, contract_value)\n3. Trains LightGBM with cross-validation (5-fold, stratified)\n4. Tunes threshold for 80% recall (business requires catching most churners)\n5. Outputs SHAP feature importance plot and confusion matrix", "type": "code", "language": "python", "scoring_hints": ["preprocessing", "feature_engineering", "cv_training", "threshold_tuning", "interpretability"]}],
    },

    # ── ROUND 3: ARCHITECTURE & STRATEGY ─────────────────────────────────────
    "round_3": {
        "_default": [{"scenario": "You need to design the system architecture for the {title} role's core platform.", "task": "Design the architecture for: {arch_topic}\n\nCover:\n1. High-level component diagram (describe in text if no drawing tool)\n2. Technology choices with justifications and trade-offs considered\n3. Scalability strategy — how does it handle 10x traffic/data growth?\n4. Failure modes and resilience patterns (circuit breaker, retry, fallback)\n5. Monitoring and observability design\n\nChoose from these options and justify: Option A or B (describe two viable approaches).", "type": "written", "scoring_hints": ["component_design", "tech_justification", "scalability", "resilience", "observability"]}],
    },

    # ── ROUND 4: COMMUNICATION & EXPLANATION ─────────────────────────────────
    "round_4": {
        "_default": [{"scenario": "Your non-technical manager asks you to explain a core concept from your work.", "task": "Explain **{concept}** to a non-technical business stakeholder:\n\n1. Use a real-world analogy (no jargon)\n2. Explain why it matters for the business (in terms of cost, speed, or risk)\n3. Describe one common misconception about it and correct it\n4. Explain what happens when it goes wrong with a concrete example\n\nAim for clarity a 12-year-old could follow, with enough depth a CEO would find valuable.", "type": "written", "scoring_hints": ["analogy_quality", "business_relevance", "misconception_correction", "failure_example"]}],
    },

    # ── ROUND 5: DEBUGGING & MAINTENANCE ─────────────────────────────────────
    "round_5": {
        "_default": [{"scenario": "A critical bug has been escalated from production.", "task": "**Bug Report:**\n`{bug_desc}`\n\n**Reported Symptoms:**\nThe system is behaving unexpectedly in production. On-call engineer has escalated to you.\n\nYour task:\n1. Diagnose the root cause — explain your reasoning step by step\n2. Write the exact fix (code snippet or config change)\n3. Explain why this fix works and doesn't introduce new issues\n4. Add a test case that would have caught this bug\n5. Suggest a process change to prevent this class of bug in future", "type": "code", "scoring_hints": ["root_cause", "correct_fix", "fix_explanation", "test_case", "prevention"]}],
    },
}


def _get_template(round_key: str, spec_key: str, rng: random.Random) -> Dict:
    """Get a template for a round+spec combo, falling back gracefully."""
    round_data = ROUND_TEMPLATES.get(round_key, {})
    templates = round_data.get(spec_key) or round_data.get("_default") or list(round_data.values())[0] if round_data else []
    if not templates:
        return {"scenario": "Complete the technical task.", "task": "Demonstrate your skills for this role.", "type": "written", "scoring_hints": []}
    return rng.choice(templates)


def _fill(template_str: str, graph: Dict, rng: random.Random) -> str:
    """Fill template variables from capability graph."""
    skills = graph.get("primary_skills", ["Python"])
    replacements = {
        "{title}": graph.get("internship_title", "this role"),
        "{spec}": graph.get("specialization_label", "this domain"),
        "{skill}": rng.choice(skills) if skills else "Python",
        "{dataset}": graph.get("dataset", "provided dataset"),
        "{tool}": rng.choice(graph.get("all_tools", ["Python"])),
        "{concept}": rng.choice(graph.get("concepts", ["core concepts"])),
        "{workflow}": rng.choice(graph.get("workflows", ["development workflow"])),
        "{bug_desc}": graph["bug"]["desc"],
        "{bug_cause}": graph["bug"]["cause"],
        "{bug_fix}": graph["bug"]["fix"],
        "{arch_topic}": graph.get("arch_topic", "system architecture"),
    }
    result = template_str
    for k, v in replacements.items():
        result = result.replace(k, str(v))
    return result


def synthesize_simulation(graph: Dict) -> List[Dict]:
    """
    Synthesize all 5 rounds from the capability graph.
    Returns list of round dicts matching blueprint schema.
    """
    rng = random.Random(graph.get("rng_seed", 42))
    spec_key = graph["specialization_key"]
    difficulty = graph.get("difficulty", "intermediate")

    time_limits = {"beginner": [20, 30, 25, 15, 20], "intermediate": [25, 40, 30, 20, 25], "advanced": [30, 50, 35, 25, 30]}
    times = time_limits.get(difficulty, time_limits["intermediate"])

    round_configs = [
        ("round_1", 1, "Requirement Analysis", "requirement_analysis", times[0]),
        ("round_2", 2, "Technical Execution",  "technical_execution",  times[1]),
        ("round_3", 3, "Architecture & Strategy", "architecture",      times[2]),
        ("round_4", 4, "Communication & Explanation", "communication", times[3]),
        ("round_5", 5, "Debugging & Maintenance",  "debugging",        times[4]),
    ]

    rounds = []
    for round_key, round_num, name, round_type, time_limit in round_configs:
        tmpl = _get_template(round_key, spec_key, rng)

        scenario = _fill(tmpl.get("scenario", ""), graph, rng)
        task_text = _fill(tmpl.get("task", ""), graph, rng)
        task_type = tmpl.get("type", "written")
        scoring_hints = tmpl.get("scoring_hints", [])

        # Build tasks list (one primary task per round)
        tasks = [{
            "task_id": f"r{round_num}_t1",
            "type": task_type,
            "language": tmpl.get("language", "python") if task_type == "code" else None,
            "description": task_text,
            "scoring_criteria": scoring_hints,
            "time_limit_minutes": time_limit,
        }]

        rounds.append({
            "round_number": round_num,
            "name": name,
            "type": round_type,
            "scenario": scenario,
            "context": f"Specialization: {graph['specialization_label']} | Tools: {', '.join(graph['all_tools'][:4])}",
            "tasks": tasks,
            "time_limit_minutes": time_limit,
            "scoring_weight": [0.15, 0.35, 0.20, 0.15, 0.15][round_num - 1],
            "difficulty": difficulty,
        })

    return rounds
