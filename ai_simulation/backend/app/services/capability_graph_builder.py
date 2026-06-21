"""
Capability Graph Builder
Builds a structured capability graph from internship data + detected specializations.
"""
from typing import Dict, List, Any
from app.services.specialization_detector import (
    get_primary_specialization, get_top_specializations, SPECIALIZATION_SIGNALS
)

# Capability profiles per specialization key
CAPABILITY_PROFILES: Dict[str, Dict] = {
    "nlp": {
        "concepts": ["tokenization","embeddings","attention mechanism","transformer architecture","fine-tuning","semantic similarity"],
        "workflows": ["text preprocessing","model fine-tuning","inference pipeline","evaluation","deployment"],
        "tools": ["HuggingFace Transformers","spaCy","NLTK","FastAPI","Docker"],
        "datasets": [
            "customer_reviews_50k.csv (review_text, rating, category, language)",
            "support_tickets_20k.json (ticket_id, description, priority, resolution_time)",
            "news_articles_100k.parquet (headline, body, tags, published_at)",
            "product_feedback.csv (user_id, text, score, verified_purchase)",
        ],
        "bugs": [
            {"desc": "Gradient explosion during BERT fine-tuning", "cause": "learning_rate=1e-2 (too high for transformers)", "fix": "Set learning_rate=2e-5"},
            {"desc": "Tokenizer truncating important context", "cause": "max_length=64 too small", "fix": "Increase to 512 or use sliding window"},
            {"desc": "Label leakage in text classification dataset", "cause": "Target column included in feature text", "fix": "Drop label column before preprocessing"},
        ],
        "arch_topics": ["BERT fine-tuning pipeline","RAG system architecture","Streaming NLP processor","Multi-language support layer"],
    },
    "computer_vision": {
        "concepts": ["convolutional layers","transfer learning","image augmentation","object detection","segmentation","anchor boxes"],
        "workflows": ["data annotation","augmentation pipeline","model training","mAP evaluation","TensorRT optimization"],
        "tools": ["OpenCV","PyTorch","torchvision","Albumentations","ONNX","Roboflow"],
        "datasets": [
            "defect_images_5k/ (annotated manufacturing defects, YOLO format)",
            "medical_xrays_8k.zip (PNG images + DICOM metadata, 4 classes)",
            "retail_shelves_10k/ (shelf images with bounding box labels)",
            "traffic_cams_3k/ (vehicle/pedestrian annotations, COCO format)",
        ],
        "bugs": [
            {"desc": "Model overfits — 98% train accuracy, 61% val accuracy", "cause": "No augmentation + small dataset", "fix": "Add RandomFlip, RandomCrop, Cutout augmentations"},
            {"desc": "CUDA OOM during batch training", "cause": "Batch size 128 too large for GPU", "fix": "Reduce to 32, use gradient checkpointing"},
            {"desc": "mAP stuck at 0.12 despite low loss", "cause": "Anchor boxes misconfigured for small objects", "fix": "Re-cluster anchors with k-means on dataset"},
        ],
        "arch_topics": ["Real-time object detection pipeline","Edge inference with TensorRT","Auto-labeling pipeline","Multi-camera video analytics"],
    },
    "mlops": {
        "concepts": ["feature drift","model versioning","shadow deployment","canary release","data lineage","experiment tracking"],
        "workflows": ["model training CI","A/B evaluation","blue-green deploy","drift monitoring","automated retraining"],
        "tools": ["MLflow","Kubeflow","Airflow","Prometheus","Grafana","DVC","Seldon","BentoML"],
        "datasets": [
            "model_metrics_log.parquet (model_id, timestamp, accuracy, latency, drift_score)",
            "feature_store_snapshot.csv (feature_name, value, computed_at, staleness_s)",
            "inference_logs_7d.json (request_id, input_hash, prediction, latency_ms, version)",
        ],
        "bugs": [
            {"desc": "Model in production returns wrong predictions silently", "cause": "Input schema mismatch — numeric field sent as string", "fix": "Add Pydantic schema validation at inference endpoint"},
            {"desc": "Drift detector raises false positives daily", "cause": "Reference window too small (100 samples)", "fix": "Use 10k+ reference samples, tune threshold"},
            {"desc": "Retraining pipeline overwrites production model", "cause": "No stage gating — CI deploys directly to prod", "fix": "Add staging environment + human approval gate"},
        ],
        "arch_topics": ["Zero-downtime model deployment","Feature store architecture","ML observability stack","Automated retraining pipeline"],
    },
    "forecasting": {
        "concepts": ["seasonality decomposition","autocorrelation","stationarity","ARIMA","cross-validation for time series","feature lag creation"],
        "workflows": ["EDA on temporal data","stationarity testing","model selection","walk-forward validation","forecast horizon planning"],
        "tools": ["Prophet","statsmodels","darts","Pandas","Plotly","Optuna"],
        "datasets": [
            "retail_sales_3yr.csv (date, store_id, product_id, units_sold, promotion)",
            "energy_consumption_hourly.parquet (timestamp, meter_id, kwh, temperature, holiday)",
            "web_traffic_90d.csv (date, page_id, sessions, bounce_rate, conversions)",
            "stock_prices_5yr.parquet (date, ticker, open, high, low, close, volume)",
        ],
        "bugs": [
            {"desc": "Forecast shows negative demand", "cause": "No lower bound constraint on ARIMA output", "fix": "Apply max(0, forecast) or use log transform"},
            {"desc": "Model ignores holiday spikes", "cause": "Holiday regressors not added to Prophet", "fix": "Add country holidays via model.add_country_holidays()"},
            {"desc": "Walk-forward validation leaks future data", "cause": "Scaler fitted on full dataset before split", "fix": "Fit scaler only on training window per fold"},
        ],
        "arch_topics": ["Scalable forecasting microservice","Ensemble forecast architecture","Real-time anomaly alerting system"],
    },
    "generative_ai": {
        "concepts": ["RAG pipeline","vector embeddings","prompt engineering","context window","fine-tuning with LoRA","semantic chunking"],
        "workflows": ["document ingestion","embedding generation","retrieval","generation","evaluation with RAGAS"],
        "tools": ["LangChain","LlamaIndex","Pinecone","Weaviate","OpenAI API","Ollama","vLLM"],
        "datasets": [
            "company_docs_500pages.pdf (technical manuals, policies, FAQs)",
            "customer_qa_pairs_10k.json (question, answer, context_chunk, relevance_score)",
            "code_repos_metadata.json (repo_name, language, description, readme_snippet)",
        ],
        "bugs": [
            {"desc": "RAG returns irrelevant chunks despite semantic search", "cause": "Chunk size 2000 tokens — too large, loses precision", "fix": "Reduce to 256-512 tokens with 50-token overlap"},
            {"desc": "LLM hallucinating facts not in retrieved context", "cause": "Prompt doesn't constrain to context only", "fix": "Add 'Answer ONLY from the provided context. Say I don\\'t know if unsure.'"},
            {"desc": "Embedding API costs explode in production", "cause": "Re-embedding unchanged documents daily", "fix": "Add hash-based cache, only embed changed docs"},
        ],
        "arch_topics": ["Production RAG pipeline","Multi-modal AI assistant","LLM gateway with rate limiting","Fine-tuning pipeline for domain adaptation"],
    },
    "frontend": {
        "concepts": ["component architecture","state management","virtual DOM","code splitting","accessibility","performance metrics"],
        "workflows": ["component design","state management","API integration","testing","performance audit","CI/CD"],
        "tools": ["React","TypeScript","Vite","Jest","Playwright","Storybook","Lighthouse"],
        "datasets": [
            "ecommerce_ui_spec.figma (screens: home, product, cart, checkout, profile)",
            "api_response_samples.json (200/400/500 response shapes for all endpoints)",
            "performance_audit.json (LCP:4.2s, FID:180ms, CLS:0.31 — all failing Core Web Vitals)",
            "user_session_recordings.json (click paths, rage clicks, drop-off points)",
        ],
        "bugs": [
            {"desc": "React app re-renders 40x on scroll", "cause": "Callback functions recreated every render — missing useCallback", "fix": "Wrap handlers in useCallback with proper deps array"},
            {"desc": "Form state resets on every keystroke", "cause": "Input component defined inside parent component", "fix": "Move InputField outside parent or use stable refs"},
            {"desc": "TypeScript build fails in CI but passes locally", "cause": "tsconfig.json uses paths aliases not configured in CI", "fix": "Add pathsToModuleNameMapper in jest.config.ts"},
        ],
        "arch_topics": ["Micro-frontend architecture","Design system with Storybook","Real-time collaboration UI","Server-side rendering strategy"],
    },
    "backend": {
        "concepts": ["REST design","database indexing","caching layers","rate limiting","auth patterns","async processing"],
        "workflows": ["API design","database modeling","auth implementation","caching","load testing","API versioning"],
        "tools": ["FastAPI","PostgreSQL","Redis","Celery","Docker","pytest","Locust"],
        "datasets": [
            "api_load_test_results.json (endpoint, p50_ms, p95_ms, p99_ms, error_rate)",
            "db_slow_queries.log (query, duration_ms, rows_scanned, missing_index)",
            "auth_audit_log.csv (user_id, action, ip, timestamp, success, failure_reason)",
            "rate_limit_violations.json (ip, endpoint, count, window_s, blocked)",
        ],
        "bugs": [
            {"desc": "API returns 200 but data silently missing from DB", "cause": "Missing db.commit() after db.add()", "fix": "Add explicit commit; use context manager for sessions"},
            {"desc": "N+1 query problem — 500 DB calls for 50 users", "cause": "Lazy loading relationships without joinedload", "fix": "Use joinedload() or selectinload() for related models"},
            {"desc": "JWT tokens work after user password reset", "cause": "Token blacklist not implemented", "fix": "Add token version/jti tracking, invalidate on password change"},
        ],
        "arch_topics": ["Async task queue with Celery","API gateway pattern","Multi-tenant database design","Event-driven microservice"],
    },
    "devops": {
        "concepts": ["container orchestration","infrastructure as code","blue-green deployment","observability","SLOs/SLAs","chaos engineering"],
        "workflows": ["CI/CD pipeline","container build","k8s deployment","monitoring setup","incident response","runbook creation"],
        "tools": ["Kubernetes","Terraform","GitHub Actions","Prometheus","Grafana","Helm","ArgoCD"],
        "datasets": [
            "k8s_cluster_metrics.json (node_name, cpu_pct, mem_pct, pod_count, restarts)",
            "ci_pipeline_history.csv (build_id, duration_s, stage, status, failure_step)",
            "infrastructure_cost.json (service, daily_cost_usd, resource_type, region)",
            "incident_log_90d.json (incident_id, severity, ttd_min, ttr_min, root_cause)",
        ],
        "bugs": [
            {"desc": "Pods crash-looping in production every 4 hours", "cause": "Memory limit 256Mi — app needs 512Mi under load", "fix": "Set resources.limits.memory: 512Mi + add HPA"},
            {"desc": "CI pipeline takes 45 minutes", "cause": "Docker layers not cached — COPY . done before pip install", "fix": "Reorder: COPY requirements.txt first, pip install, then COPY ."},
            {"desc": "Terraform apply destroys prod database on plan update", "cause": "Resource name changed triggering destroy+create", "fix": "Add lifecycle { prevent_destroy = true } to DB resource"},
        ],
        "arch_topics": ["Zero-downtime Kubernetes deployment","GitOps with ArgoCD","Multi-region failover architecture","Cost optimization strategy"],
    },
    "data_analytics": {
        "concepts": ["funnel analysis","cohort analysis","statistical significance","A/B testing","data storytelling","KPI design"],
        "workflows": ["data extraction","cleaning","EDA","dashboard design","stakeholder reporting","hypothesis testing"],
        "tools": ["SQL","Python","Tableau","Power BI","Google Analytics","Mixpanel","dbt"],
        "datasets": [
            "user_events_30d.parquet (user_id, event, timestamp, device, country, revenue)",
            "ab_test_results.csv (variant, conversions, visitors, revenue, session_duration)",
            "retention_cohorts.csv (cohort_month, day_1, day_7, day_14, day_30, day_90)",
            "sales_funnel.json (stage, users_entered, users_exited, avg_time_s, revenue)",
        ],
        "bugs": [
            {"desc": "A/B test shows 40% lift but results not reproducible", "cause": "Test ran for only 3 days — insufficient statistical power", "fix": "Run power analysis first; minimum sample per variant = 10k"},
            {"desc": "Dashboard SQL query times out after 90 seconds", "cause": "Full table scan — no index on event_type + timestamp", "fix": "CREATE INDEX idx_events_type_time ON events(event_type, timestamp)"},
            {"desc": "Cohort retention shows >100% for some weeks", "cause": "Users counted multiple times due to duplicate user_id records", "fix": "Add DISTINCT or deduplicate at ingestion using user hash"},
        ],
        "arch_topics": ["Self-serve analytics platform","Real-time event tracking pipeline","Multi-source data warehouse","Experimentation platform"],
    },
    "data_engineering": {
        "concepts": ["ETL vs ELT","data partitioning","schema evolution","exactly-once semantics","data lineage","SLA monitoring"],
        "workflows": ["pipeline design","schema definition","incremental loading","testing","orchestration","data quality checks"],
        "tools": ["Apache Spark","Kafka","dbt","Airflow","Snowflake","Great Expectations","DeltaLake"],
        "datasets": [
            "raw_clickstream_1B.parquet (user_id, session_id, url, ts, referrer)",
            "crm_export_daily.json (customer_id, actions, updated_at, segment)",
            "payment_events_kafka.json (event_type, amount, currency, user_id, timestamp)",
            "data_quality_report.json (table, null_pct, duplicate_pct, schema_drift, freshness_h)",
        ],
        "bugs": [
            {"desc": "Spark job OOM — 200GB dataset fails after 3 hours", "cause": "No partitioning — single shuffle stage processes all data", "fix": "Repartition by date column; increase executor memory to 16G"},
            {"desc": "dbt model produces wrong totals after schema change", "cause": "Upstream table renamed column — model silently uses NULL", "fix": "Add dbt source freshness + schema tests; use {{ ref() }} consistently"},
            {"desc": "Kafka consumer lag grows to 10M messages", "cause": "Single consumer — partition count is 12 but consumer group = 1", "fix": "Scale consumer group to 12 instances matching partition count"},
        ],
        "arch_topics": ["Lambda vs Kappa architecture","Real-time CDC pipeline","Multi-hop medallion architecture","Data mesh implementation"],
    },
    "cybersecurity": {
        "concepts": ["OWASP Top 10","threat modeling","zero trust","CVE scoring","attack surface","defense in depth"],
        "workflows": ["vulnerability scanning","penetration testing","incident response","forensics","security review","red team exercise"],
        "tools": ["Burp Suite","Nmap","Metasploit","Wireshark","SIEM","Splunk","HashiCorp Vault"],
        "datasets": [
            "web_app_vuln_scan.json (url, vuln_type, severity, cvss_score, remediation)",
            "network_traffic_pcap_metadata.json (src_ip, dst_ip, protocol, bytes, suspicious_flag)",
            "auth_failure_logs.csv (timestamp, ip, username, failure_type, geo_country)",
            "dependency_audit.json (package, version, cve_id, severity, patched_version)",
        ],
        "bugs": [
            {"desc": "SQL injection possible on search endpoint", "cause": "f-string used to build query: f'SELECT * WHERE name={user_input}'", "fix": "Use parameterized queries: cursor.execute('SELECT * WHERE name=?', (user_input,))"},
            {"desc": "JWT tokens can be forged", "cause": "Algorithm set to 'none' accepted by server", "fix": "Explicitly whitelist allowed algorithms; never accept 'none'"},
            {"desc": "Session fixation vulnerability in login flow", "cause": "Session ID not rotated after authentication", "fix": "Call session.regenerate() after successful login"},
        ],
        "arch_topics": ["Zero-trust network architecture","Secret management with Vault","Security monitoring pipeline","DevSecOps pipeline integration"],
    },
    "product_management": {
        "concepts": ["product-market fit","North Star metric","opportunity scoring","RICE framework","user journey mapping","OKR alignment"],
        "workflows": ["discovery","user interviews","requirements writing","roadmap planning","sprint review","launch planning"],
        "tools": ["Jira","Productboard","Amplitude","Figma","Notion","Intercom"],
        "datasets": [
            "user_research_interviews.json (participant_id, pain_points, workarounds, quotes)",
            "feature_requests_backlog.csv (request_id, votes, revenue_impact, effort_days, status)",
            "product_metrics_6mo.json (wau, dau, nps, churn_rate, ltv, cac, mau)",
            "competitor_analysis.json (competitor, feature, our_status, user_preference_pct)",
        ],
        "bugs": [
            {"desc": "Feature launched but 0% adoption after 3 weeks", "cause": "No discovery done — feature solves internal assumption, not real user pain", "fix": "Run 5 user interviews before next feature; validate with prototype"},
            {"desc": "Sprint velocity drops 40% after team grows", "cause": "No definition of ready — stories reach sprint without acceptance criteria", "fix": "Implement DoR checklist: AC, design, API contract, test cases"},
            {"desc": "Roadmap constantly reshuffled — team loses trust", "cause": "No scoring framework — HiPPO-driven prioritization", "fix": "Adopt RICE scoring; share scoring publicly with stakeholders"},
        ],
        "arch_topics": ["Product analytics stack design","Feature flag architecture","Self-serve onboarding flow","Multi-persona product strategy"],
    },
    "digital_marketing": {
        "concepts": ["SEO on-page/off-page","conversion funnel","attribution modeling","CAC/LTV ratio","email deliverability","growth loops"],
        "workflows": ["keyword research","content calendar","campaign setup","A/B testing","analytics review","retargeting"],
        "tools": ["Google Analytics 4","Search Console","Ahrefs","Mailchimp","Meta Ads","Hotjar"],
        "datasets": [
            "seo_audit.json (url, title, h1, meta_description, backlinks, page_speed, core_web_vitals)",
            "email_campaigns_6mo.csv (campaign_id, sent, opened, clicked, unsubscribed, revenue)",
            "google_ads_performance.json (campaign, impressions, clicks, ctr, cpc, conversions, roas)",
            "content_performance.csv (post_id, channel, views, engagement_rate, leads_generated)",
        ],
        "bugs": [
            {"desc": "Email open rate dropped from 28% to 11%", "cause": "Sending 3 emails/day — list fatigue + spam complaints", "fix": "Reduce to 2/week; segment list; add unsubscribe preferences"},
            {"desc": "Google Ads ROAS = 0.4x despite high CTR", "cause": "Targeting broad match — irrelevant clicks burning budget", "fix": "Switch to exact/phrase match; add 50 negative keywords"},
            {"desc": "SEO traffic dropped 60% after site redesign", "cause": "301 redirects missing for 200 old URLs", "fix": "Implement redirect map; submit new sitemap; monitor GSC crawl errors"},
        ],
        "arch_topics": ["Multi-touch attribution model","Growth loop design","Marketing data warehouse","Personalization engine"],
    },
    "finance": {
        "concepts": ["DCF valuation","WACC","comparable company analysis","LBO modeling","working capital","sensitivity analysis"],
        "workflows": ["financial modeling","due diligence","market research","scenario analysis","board reporting","investment memo"],
        "tools": ["Excel","Bloomberg Terminal","Python (pandas)","PowerPoint","Tableau","Capital IQ"],
        "datasets": [
            "company_financials_5yr.xlsx (revenue, cogs, ebitda, capex, fcf, debt, equity by quarter)",
            "industry_comparables.csv (company, revenue, ebitda_margin, p/e, ev/ebitda, growth_yoy)",
            "deal_pipeline.json (company, stage, valuation, revenue, margin, close_probability)",
            "macro_indicators.csv (gdp_growth, inflation, interest_rate, unemployment, date)",
        ],
        "bugs": [
            {"desc": "DCF model shows $0 terminal value despite profitable company", "cause": "Terminal growth rate > WACC — formula returns negative denominator", "fix": "Ensure g < WACC; typical g = 2-3% for mature companies"},
            {"desc": "Three financial statements don't reconcile", "cause": "Depreciation not flowing from IS to CF statement", "fix": "Add depreciation as add-back in CF from operations section"},
            {"desc": "Sensitivity table shows same value for all inputs", "cause": "Data table references hardcoded cell instead of formula", "fix": "Change input cell reference to the actual model assumption cell"},
        ],
        "arch_topics": ["Automated financial reporting pipeline","Real-time portfolio risk dashboard","M&A screening model","Scenario planning framework"],
    },
    "general_ml": {
        "concepts": ["bias-variance tradeoff","cross-validation","feature importance","regularization","ensemble methods","model interpretability"],
        "workflows": ["EDA","feature engineering","model selection","hyperparameter tuning","evaluation","deployment"],
        "tools": ["scikit-learn","XGBoost","LightGBM","Optuna","SHAP","MLflow","Pandas"],
        "datasets": [
            "customer_churn_dataset.csv (customer_id, tenure, usage, contract_type, churned)",
            "loan_default_prediction.parquet (applicant_id, income, debt_ratio, credit_score, default)",
            "employee_attrition.csv (emp_id, dept, salary, satisfaction_score, years, left_company)",
            "product_recommendations.json (user_id, viewed_items, purchased, ratings)",
        ],
        "bugs": [
            {"desc": "Model accuracy 99% on training, 55% on test", "cause": "Target leakage — highly correlated proxy feature included", "fix": "Remove features computed after target event; use temporal split"},
            {"desc": "XGBoost gives identical predictions for all samples", "cause": "max_depth=0 — model can't learn any splits", "fix": "Set max_depth=6 (default); check for constant target variable"},
            {"desc": "SHAP values show wrong feature importances", "cause": "Tree explainer used on non-tree model (logistic regression)", "fix": "Use shap.LinearExplainer for linear models"},
        ],
        "arch_topics": ["End-to-end ML training pipeline","Feature engineering service","Model A/B testing framework","Batch prediction system"],
    },
}

# Fallback for unknown specializations
_DEFAULT_PROFILE = CAPABILITY_PROFILES["general_ml"]


def build_capability_graph(internship_data: Dict) -> Dict[str, Any]:
    """
    Build a complete capability graph from internship data.
    Returns structured graph used by Task Synthesis Engine.
    """
    title = internship_data.get("title", "Software Engineering Internship")
    skills = list(internship_data.get("required_skills", []) or [])
    technologies = list(internship_data.get("technologies", []) or [])
    description = internship_data.get("description", "")
    responsibilities = internship_data.get("responsibilities", "")
    requirements = internship_data.get("requirements", "")

    # Detect specializations
    spec_key, spec_label, domain = get_primary_specialization(internship_data)
    top_specs = get_top_specializations(internship_data, top_n=3)
    profile = CAPABILITY_PROFILES.get(spec_key, _DEFAULT_PROFILE)

    # Extract actual skills/tools from internship (merge with profile)
    internship_tools = skills + technologies
    all_tools = list(dict.fromkeys(internship_tools + profile["tools"]))[:8]
    all_concepts = list(dict.fromkeys(profile["concepts"]))[:6]
    all_workflows = list(dict.fromkeys(profile["workflows"]))[:5]

    # Select dataset based on internship context
    import random
    seed_str = title + description + str(skills)
    seed_val = sum(ord(c) for c in seed_str)
    rng = random.Random(seed_val)
    selected_dataset = rng.choice(profile["datasets"])
    selected_bug = rng.choice(profile["bugs"])
    selected_arch = rng.choice(profile["arch_topics"])

    # Determine difficulty
    seniority_words = ["senior", "lead", "principal", "advanced", "experienced"]
    junior_words = ["junior", "intern", "fresher", "entry", "beginner", "trainee"]
    text_lower = (title + " " + requirements).lower()
    if any(w in text_lower for w in seniority_words):
        difficulty = "advanced"
    elif any(w in text_lower for w in junior_words):
        difficulty = "beginner"
    else:
        difficulty = "intermediate"

    return {
        "internship_title": title,
        "internship_id": internship_data.get("id"),
        "domain": domain,
        "specialization_key": spec_key,
        "specialization_label": spec_label,
        "top_specializations": top_specs,
        "difficulty": difficulty,
        "primary_skills": skills[:5] if skills else all_tools[:3],
        "all_tools": all_tools,
        "concepts": all_concepts,
        "workflows": all_workflows,
        "dataset": selected_dataset,
        "bug": selected_bug,
        "arch_topic": selected_arch,
        "all_bugs": profile["bugs"],
        "all_arch_topics": profile["arch_topics"],
        "all_datasets": profile["datasets"],
        "description": description[:500] if description else "",
        "responsibilities": responsibilities[:500] if responsibilities else "",
        "rng_seed": seed_val,
    }
