"""
Role Simulations Registry
Maps role names to their simulation data
"""

from app.data.role_simulations.ml_engineer import ML_ENGINEER_SIMULATION
from app.data.role_simulations.backend_developer import BACKEND_DEVELOPER_SIMULATION

# Registry of all available role simulations
ROLE_SIMULATIONS = {
    "ml_engineer": ML_ENGINEER_SIMULATION,
    "backend_developer": BACKEND_DEVELOPER_SIMULATION,
    "data_scientist": {
        "role": "Data Scientist",
        "description": "Statistical analysis, hypothesis testing, EDA, and predictive modeling simulation.",
        "difficulty_levels": ["junior", "mid", "senior"],
        "total_duration_minutes": 90,
        "rounds": [
            {
                "round_number": 1,
                "name": "Requirement Analysis",
                "duration_minutes": 15,
                "questions": [
                    {
                        "id": "ds_r1_q1",
                        "title": "A/B Test Design Analysis",
                        "question_type": "problem_understanding",
                        "difficulty": "medium",
                        "problem_statement": """A product manager wants to run an A/B test to determine if a new checkout button color increases conversion.
Context: 50K daily visitors, current conversion rate 3.5%, want to detect 0.5% lift.
Analyze: sample size requirements, test duration, metrics to track, statistical pitfalls.""",
                        "evaluation_criteria": {
                            "keywords": ["statistical power", "p-value", "sample size", "significance", "multiple testing", "novelty effect", "Simpson's paradox"],
                            "must_include": ["sample size", "statistical power"],
                            "min_word_count": 150
                        },
                        "key_points": ["Calculates correct sample size", "Mentions Type I and Type II errors", "Addresses novelty effect duration", "Suggests segmentation by user type"],
                        "max_score": 100,
                        "time_limit_seconds": 900
                    }
                ]
            },
            {
                "round_number": 2,
                "name": "Technical Execution",
                "duration_minutes": 35,
                "questions": [
                    {
                        "id": "ds_r2_q1",
                        "title": "Implement Chi-Squared Test from Scratch",
                        "question_type": "coding",
                        "difficulty": "medium",
                        "language": "python",
                        "problem_statement": "Implement a chi-squared test of independence without scipy. Function: `chi_squared_test(observed: np.ndarray) -> dict` returning statistic, p_value, degrees_of_freedom.",
                        "starter_code": "import numpy as np\nfrom scipy.stats import chi2\n\ndef chi_squared_test(observed: np.ndarray) -> dict:\n    \"\"\"Chi-squared test of independence.\"\"\"\n    pass\n",
                        "test_cases": [{"input": "obs = np.array([[10,20],[30,40]])\nresult = chi_squared_test(obs)\nprint(round(result['statistic'], 4))", "expected_output": "0.5051", "explanation": "Chi-squared statistic for 2x2 table"}],
                        "max_score": 100,
                        "time_limit_seconds": 1200
                    }
                ]
            },
            {
                "round_number": 3,
                "name": "Architecture & Strategy",
                "duration_minutes": 20,
                "questions": [
                    {
                        "id": "ds_r3_q1",
                        "title": "Feature Engineering Strategy",
                        "question_type": "decision_making",
                        "difficulty": "hard",
                        "problem_statement": "For a time-series sales forecasting model, which feature engineering strategy gives the best balance of predictive power and maintainability?",
                        "options": [
                            {"id": "A", "title": "Manual domain features", "description": "Hand-craft lag features, rolling stats, seasonal decomposition", "pros": ["Interpretable"], "cons": ["Time-consuming", "Domain expertise required"]},
                            {"id": "B", "title": "Automated feature tools (Featuretools)", "description": "Deep feature synthesis", "pros": ["Explores large feature space"], "cons": ["Black box", "Maintenance hard"]},
                            {"id": "C", "title": "Hybrid: domain features + automated selection", "description": "Start with domain knowledge, use SHAP + RFE to select", "pros": ["Best of both"], "cons": ["Two-step pipeline"]},
                            {"id": "D", "title": "Raw data with deep learning (LSTM)", "description": "Let model learn features", "pros": ["No manual work"], "cons": ["Data hungry", "Interpretability"]}
                        ],
                        "correct_option": "C",
                        "max_score": 100,
                        "time_limit_seconds": 900
                    }
                ]
            },
            {
                "round_number": 4,
                "name": "Technical Communication",
                "duration_minutes": 10,
                "questions": [
                    {
                        "id": "ds_r4_q1",
                        "title": "Explain p-values to a Marketing Manager",
                        "question_type": "explanation",
                        "difficulty": "easy",
                        "scenario": "Your marketing manager insists: 'Our A/B test p-value is 0.04, so we're 96% sure the new design works!' Correct this misinterpretation and explain what p-value actually means.",
                        "key_points": ["Corrects 'probability result is due to chance'", "Explains p-value is NOT probability hypothesis is true", "Mentions practical vs statistical significance", "Explains confidence interval as complement"],
                        "max_score": 100,
                        "time_limit_seconds": 600
                    }
                ]
            },
            {
                "round_number": 5,
                "name": "Debugging",
                "duration_minutes": 20,
                "questions": [
                    {
                        "id": "ds_r5_q1",
                        "title": "Find the Data Leakage Bug",
                        "question_type": "debugging",
                        "difficulty": "hard",
                        "problem_statement": "This model achieves 99.8% accuracy in dev but 62% in production. Find the data leakage bugs.",
                        "buggy_code": "from sklearn.preprocessing import StandardScaler\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.ensemble import RandomForestClassifier\nimport pandas as pd\n\ndf = pd.read_csv('data.csv')\n\n# Bug 1: Target leakage - 'days_since_churn' is derived from target\nfeatures = ['age', 'usage', 'days_since_churn', 'subscription_type']\nX = df[features]\ny = df['churned']\n\n# Bug 2: Filling missing values with global stats (data leakage)\nX = X.fillna(X.mean())\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\n\n# Bug 3: StandardScaler fit on all data\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X)\nX_train_s = X_scaled[:len(X_train)]\nX_test_s = X_scaled[len(X_train):]\n\nmodel = RandomForestClassifier()\nmodel.fit(X_train_s, y_train)\nprint(model.score(X_test_s, y_test))\n",
                        "bug_description": "Bug 1: 'days_since_churn' is derived from the churn event — pure target leakage. Bug 2: fillna(X.mean()) uses test data statistics — fit imputer on train only. Bug 3: StandardScaler.fit_transform(X) on entire dataset — must fit only on train.",
                        "max_score": 100,
                        "time_limit_seconds": 1200
                    }
                ]
            }
        ]
    },
    "frontend_developer": {
        "role": "Frontend Developer",
        "description": "React, TypeScript, performance optimization, and UI/UX engineering simulation.",
        "difficulty_levels": ["junior", "mid", "senior"],
        "total_duration_minutes": 90,
        "rounds": [
            {"round_number": 1, "name": "Requirement Analysis", "duration_minutes": 15, "questions": [{"id": "fe_r1_q1", "title": "Infinite Scroll Requirements Analysis", "question_type": "problem_understanding", "difficulty": "medium", "problem_statement": "Analyze requirements for building an infinite-scroll social feed with 10M posts. Identify: virtualization needs, accessibility concerns, performance budget, state management challenges, and edge cases.", "evaluation_criteria": {"keywords": ["virtualization", "intersection observer", "ARIA", "memory", "skeleton", "error boundary", "debounce"], "must_include": ["virtualization", "accessibility"], "min_word_count": 150}, "key_points": ["Mentions virtual DOM / windowing (react-window/virtuoso)", "Accessibility: ARIA live regions for screen readers", "Memory management for large lists", "Error states and retry logic"], "max_score": 100, "time_limit_seconds": 900}]},
            {"round_number": 2, "name": "Technical Execution", "duration_minutes": 35, "questions": [{"id": "fe_r2_q1", "title": "Implement useDebounce and useThrottle Hooks", "question_type": "coding", "difficulty": "medium", "language": "javascript", "problem_statement": "Implement React hooks: `useDebounce(value, delay)` and `useThrottle(callback, limit)` from scratch. Do not use lodash.", "starter_code": "import { useState, useEffect, useRef, useCallback } from 'react';\n\nexport function useDebounce(value, delay) {\n  // TODO: Return debounced value\n}\n\nexport function useThrottle(callback, limit) {\n  // TODO: Return throttled callback\n}", "test_cases": [{"input": "// Debounce test: value should only update after delay\nconst [val, setVal] = useState('');\nconst debounced = useDebounce(val, 500);\n// Typing fast should not trigger until 500ms of silence", "expected_output": "Debounced value lags 500ms behind input", "explanation": "Classic debounce behavior"}], "max_score": 100, "time_limit_seconds": 1500}]},
            {"round_number": 3, "name": "Architecture & Strategy", "duration_minutes": 20, "questions": [{"id": "fe_r3_q1", "title": "State Management Strategy", "question_type": "decision_making", "difficulty": "hard", "problem_statement": "For a large enterprise dashboard with: real-time data, complex filtering, role-based views, offline support — which state management approach?", "options": [{"id": "A", "title": "Redux Toolkit + RTK Query", "description": "Centralized store, generated API hooks", "pros": ["DevTools", "Predictable"], "cons": ["Boilerplate", "Learning curve"]}, {"id": "B", "title": "Zustand + React Query", "description": "Lightweight stores + server state management", "pros": ["Simple", "Separation of concerns"], "cons": ["Less structured"]}, {"id": "C", "title": "Context API + useReducer", "description": "Built-in React primitives", "pros": ["No dependencies"], "cons": ["Re-render performance", "No DevTools"]}, {"id": "D", "title": "Jotai (atomic state)", "description": "Atom-based granular state", "pros": ["Minimal re-renders"], "cons": ["Less ecosystem"]}], "correct_option": "B", "max_score": 100, "time_limit_seconds": 900}]},
            {"round_number": 4, "name": "Technical Communication", "duration_minutes": 10, "questions": [{"id": "fe_r4_q1", "title": "Explain Browser Rendering Pipeline", "question_type": "explanation", "difficulty": "medium", "scenario": "A junior developer's animation causes jank (choppy scrolling). Explain the browser rendering pipeline and why their CSS animation choice causes jank, then recommend a fix.", "key_points": ["Explains DOM → CSSOM → Render Tree → Layout → Paint → Composite", "Identifies layout thrashing as root cause", "Recommends transform/opacity for compositor-only animations", "Mentions requestAnimationFrame"], "max_score": 100, "time_limit_seconds": 600}]},
            {"round_number": 5, "name": "Debugging", "duration_minutes": 20, "questions": [{"id": "fe_r5_q1", "title": "Fix the React Memory Leak", "question_type": "debugging", "difficulty": "hard", "problem_statement": "This React component causes a memory leak. Find and fix all issues.", "buggy_code": "import { useState, useEffect } from 'react';\n\nfunction DataFetcher({ userId }) {\n  const [data, setData] = useState(null);\n  \n  useEffect(() => {\n    // Bug 1: No cleanup - fetch continues even if component unmounts\n    fetch(`/api/user/${userId}`)\n      .then(r => r.json())\n      // Bug 2: Sets state after unmount if async resolves late\n      .then(d => setData(d));\n    \n    // Bug 3: Event listener never removed\n    window.addEventListener('resize', () => setData(prev => ({...prev})));\n  }, [userId]); // Bug 4: Missing cleanup return\n  \n  return <div>{data?.name}</div>;\n}", "bug_description": "Bug 1&2: AbortController needed for fetch cleanup. Bug 3: addEventListener must be removed in cleanup. Bug 4: useEffect must return cleanup function.", "max_score": 100, "time_limit_seconds": 1200}]}
        ]
    },
    "devops_engineer": {
        "role": "DevOps Engineer",
        "description": "CI/CD, infrastructure as code, Kubernetes, and observability simulation.",
        "difficulty_levels": ["junior", "mid", "senior"],
        "total_duration_minutes": 90,
        "rounds": [
            {"round_number": 1, "name": "Requirement Analysis", "duration_minutes": 15, "questions": [{"id": "devops_r1_q1", "title": "Zero-Downtime Deployment Requirements", "question_type": "problem_understanding", "difficulty": "hard", "problem_statement": "Analyze requirements for zero-downtime deployments of a microservices app (20 services, PostgreSQL, Redis, 99.99% SLA). Identify: deployment strategies, rollback procedures, health check requirements, database migration approach, and monitoring needs.", "evaluation_criteria": {"keywords": ["blue-green", "canary", "rolling", "health check", "readiness probe", "rollback", "migration", "observability", "SLA"], "must_include": ["canary", "rollback", "health check"], "min_word_count": 200}, "key_points": ["Blue-green vs canary trade-offs", "Database migration compatibility (backward compatible)", "Kubernetes readiness/liveness probes", "Automated rollback triggers"], "max_score": 100, "time_limit_seconds": 900}]},
            {"round_number": 2, "name": "Technical Execution", "duration_minutes": 35, "questions": [{"id": "devops_r2_q1", "title": "Write a Kubernetes Deployment Manifest", "question_type": "coding", "difficulty": "hard", "language": "python", "problem_statement": "Write a Python script that generates a production-ready Kubernetes Deployment YAML for a web app with: 3 replicas, resource limits, liveness/readiness probes, rolling update strategy, and pod anti-affinity to spread across nodes.", "starter_code": "import yaml\n\ndef generate_k8s_deployment(\n    app_name: str,\n    image: str,\n    port: int,\n    replicas: int = 3\n) -> dict:\n    \"\"\"\n    Generate a production-ready K8s Deployment manifest.\n    Returns a dict that can be yaml.dump()'d\n    \"\"\"\n    pass\n\nif __name__ == '__main__':\n    manifest = generate_k8s_deployment('web-app', 'nginx:latest', 8080)\n    print(yaml.dump(manifest, default_flow_style=False))\n", "test_cases": [{"input": "m = generate_k8s_deployment('api', 'myapp:v1', 8080, 3)\nprint(m['kind'])\nprint(m['spec']['replicas'])\nprint('resources' in m['spec']['template']['spec']['containers'][0])", "expected_output": "Deployment\n3\nTrue", "explanation": "Must be valid K8s Deployment with resource limits"}], "max_score": 100, "time_limit_seconds": 1800}]},
            {"round_number": 3, "name": "Architecture & Strategy", "duration_minutes": 20, "questions": [{"id": "devops_r3_q1", "title": "Observability Stack Decision", "question_type": "decision_making", "difficulty": "hard", "problem_statement": "Choose the observability stack for a 50-service microservices platform. Budget: $5K/month. Team: 3 DevOps engineers.", "options": [{"id": "A", "title": "Full Datadog", "description": "APM, logs, metrics, tracing all-in-one", "pros": ["Best-in-class UX", "Single pane"], "cons": ["Very expensive at scale", "$15K+/month easily"]}, {"id": "B", "title": "Prometheus + Grafana + Jaeger + ELK", "description": "Open source full stack", "pros": ["Free", "Highly customizable"], "cons": ["High ops burden", "3 separate systems"]}, {"id": "C", "title": "Grafana Cloud (Loki + Tempo + Prometheus)", "description": "Managed Grafana stack", "pros": ["Low cost", "Unified UI", "Low ops"], "cons": ["Vendor lock-in"]}, {"id": "D", "title": "AWS CloudWatch + X-Ray", "description": "Native AWS observability", "pros": ["AWS native"], "cons": ["Poor UX", "Expensive at volume", "AWS lock-in"]}], "correct_option": "C", "max_score": 100, "time_limit_seconds": 900}]},
            {"round_number": 4, "name": "Technical Communication", "duration_minutes": 10, "questions": [{"id": "devops_r4_q1", "title": "Explain Kubernetes to a Dev Team", "question_type": "explanation", "difficulty": "medium", "scenario": "Your development team is frustrated: 'Why do we need Kubernetes? Docker Compose works fine locally!' Explain the value proposition of Kubernetes over Docker Compose for production without using K8s jargon.", "key_points": ["Self-healing (restarts crashed containers)", "Auto-scaling based on load", "Zero-downtime deployments", "Load balancing built-in", "Analogy works well"], "max_score": 100, "time_limit_seconds": 600}]},
            {"round_number": 5, "name": "Debugging", "duration_minutes": 20, "questions": [{"id": "devops_r5_q1", "title": "Debug the CI/CD Pipeline", "question_type": "debugging", "difficulty": "hard", "problem_statement": "This GitHub Actions workflow deploys to production on every push to main — find and fix all issues.", "buggy_code": "name: Deploy\non:\n  push:\n    branches: [main]  # Bug 1: Deploys on every push, no manual approval\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      \n      # Bug 2: No test step before deployment\n      \n      - name: Deploy to prod\n        env:\n          # Bug 3: Secret exposed as plain text\n          API_KEY: sk-prod-abc123xyz\n        run: |\n          # Bug 4: No health check after deploy\n          kubectl apply -f k8s/\n          echo 'Done'\n          \n      # Bug 5: No rollback on failure\n", "bug_description": "Bug 1: Auto-deploy on push needs environment protection/manual approval gate. Bug 2: Run tests before deploying. Bug 3: API_KEY must use ${{ secrets.API_KEY }}. Bug 4: kubectl rollout status to verify. Bug 5: Add rollback step on failure.", "max_score": 100, "time_limit_seconds": 1200}]}
        ]
    }
}

# Available role keys
AVAILABLE_ROLES = list(ROLE_SIMULATIONS.keys())

def get_simulation(role_key: str) -> dict:
    """Get simulation data for a specific role."""
    return ROLE_SIMULATIONS.get(role_key)

def get_all_roles() -> list:
    """Get list of all available role simulations."""
    return [
        {
            "key": key,
            "role": sim["role"],
            "description": sim["description"],
            "difficulty_levels": sim["difficulty_levels"],
            "total_duration_minutes": sim["total_duration_minutes"],
            "total_rounds": len(sim["rounds"])
        }
        for key, sim in ROLE_SIMULATIONS.items()
    ]
