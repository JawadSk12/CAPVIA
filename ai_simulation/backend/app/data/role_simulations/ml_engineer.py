"""
ML Engineer Role Simulation
Complete 5-round simulation for ML Engineer hiring
"""

ML_ENGINEER_SIMULATION = {
    "role": "ML Engineer",
    "description": "End-to-end machine learning engineering simulation covering model development, deployment, and system design.",
    "difficulty_levels": ["junior", "mid", "senior"],
    "total_duration_minutes": 90,
    "rounds": [
        {
            "round_number": 1,
            "name": "Requirement Analysis",
            "duration_minutes": 15,
            "description": "Analyze an ML problem statement, identify edge cases, and extract requirements.",
            "questions": [
                {
                    "id": "ml_r1_q1",
                    "title": "Fraud Detection System Requirements",
                    "question_type": "problem_understanding",
                    "difficulty": "medium",
                    "problem_statement": """A fintech company wants to build a real-time fraud detection system.
The system must:
- Process 10,000 transactions per second
- Detect fraud with <100ms latency
- Handle class imbalance (0.1% fraud rate)
- Explain decisions for regulatory compliance
- Retrain incrementally as new fraud patterns emerge

Analyze this problem and answer the following:
1. What are the top 5 technical challenges you foresee?
2. What data would you need to build this system?
3. What are the critical edge cases to handle?
4. What success metrics would you define?
5. What constraints or assumptions would you clarify with stakeholders?""",
                    "evaluation_criteria": {
                        "keywords": ["class imbalance", "SMOTE", "latency", "explainability", "SHAP", "LIME", "concept drift", "feature engineering", "data pipeline", "monitoring"],
                        "must_include": ["class imbalance", "latency", "explainability"],
                        "depth_indicators": ["SMOTE", "SHAP", "LIME", "AUC-ROC", "precision-recall", "concept drift"],
                        "min_word_count": 200
                    },
                    "max_score": 100,
                    "time_limit_seconds": 900,
                    "key_points": [
                        "Identifies class imbalance as a core challenge",
                        "Mentions need for explainability (SHAP/LIME) for compliance",
                        "Addresses concept drift and model retraining",
                        "Defines proper evaluation metrics (Precision-Recall over Accuracy)",
                        "Identifies data requirements (historical transactions, labels)"
                    ]
                },
                {
                    "id": "ml_r1_q2",
                    "title": "Recommendation Engine Edge Cases",
                    "question_type": "problem_understanding",
                    "difficulty": "hard",
                    "problem_statement": """An e-commerce platform wants to build a product recommendation engine.
Context:
- 50M users, 5M products
- Cold start problem for new users and products
- Real-time personalization required
- A/B testing infrastructure needed
- Multi-objective: clicks, conversions, diversity

Identify and explain 8 critical edge cases this system must handle.""",
                    "evaluation_criteria": {
                        "keywords": ["cold start", "popularity bias", "filter bubble", "data sparsity", "scalability", "diversity", "serendipity", "real-time", "batch vs online"],
                        "must_include": ["cold start", "popularity bias"],
                        "min_word_count": 150
                    },
                    "max_score": 100,
                    "time_limit_seconds": 900,
                    "key_points": [
                        "Cold start for new users and items",
                        "Popularity bias / filter bubble",
                        "Data sparsity in the user-item matrix",
                        "Real-time vs batch trade-offs",
                        "Handling of out-of-stock or deprecated items"
                    ]
                }
            ]
        },
        {
            "round_number": 2,
            "name": "Technical Execution",
            "duration_minutes": 35,
            "description": "Write production-level ML code to solve a real problem.",
            "questions": [
                {
                    "id": "ml_r2_q1",
                    "title": "Implement Gradient Boosting from Scratch (Core Logic)",
                    "question_type": "coding",
                    "difficulty": "hard",
                    "language": "python",
                    "problem_statement": """Implement the core prediction step of a Gradient Boosting Classifier.

You are given:
- A list of `trees` (each tree is a dict representing a decision stump with 'feature', 'threshold', 'left_value', 'right_value')
- A learning rate `lr`
- An initial prediction `initial_pred` (the log-odds of the base rate)
- A 2D numpy array `X` of shape (n_samples, n_features)

Implement the function `gradient_boosting_predict(X, trees, lr, initial_pred)` that:
1. Starts with the initial prediction
2. Iteratively adds the contribution of each tree (scaled by learning rate)
3. Applies the sigmoid function to get final probabilities
4. Returns a numpy array of probabilities

Example:
```python
import numpy as np

trees = [
    {'feature': 0, 'threshold': 0.5, 'left_value': -0.5, 'right_value': 0.8},
    {'feature': 1, 'threshold': 1.2, 'left_value': -0.3, 'right_value': 0.6},
]
X = np.array([[0.2, 1.5], [0.8, 0.9]])
lr = 0.1
initial_pred = 0.0

result = gradient_boosting_predict(X, trees, lr, initial_pred)
# result should be array of probabilities between 0 and 1
```""",
                    "starter_code": """import numpy as np
from typing import List, Dict

def sigmoid(x: np.ndarray) -> np.ndarray:
    \"\"\"Apply sigmoid function element-wise.\"\"\"
    return 1 / (1 + np.exp(-x))

def predict_tree(tree: Dict, X: np.ndarray) -> np.ndarray:
    \"\"\"
    Get predictions from a single decision stump.
    
    Args:
        tree: dict with keys 'feature', 'threshold', 'left_value', 'right_value'
        X: numpy array of shape (n_samples, n_features)
    
    Returns:
        numpy array of shape (n_samples,)
    \"\"\"
    # TODO: Implement this
    pass

def gradient_boosting_predict(
    X: np.ndarray,
    trees: List[Dict],
    lr: float,
    initial_pred: float
) -> np.ndarray:
    \"\"\"
    Make predictions using a trained gradient boosting model.
    
    Args:
        X: Feature matrix of shape (n_samples, n_features)
        trees: List of decision stump dicts
        lr: Learning rate
        initial_pred: Initial log-odds prediction
    
    Returns:
        Probability predictions of shape (n_samples,)
    \"\"\"
    # TODO: Implement this
    pass
""",
                    "test_cases": [
                        {
                            "input": "import numpy as np\ntrees = [{'feature': 0, 'threshold': 0.5, 'left_value': -0.5, 'right_value': 0.8}]\nX = np.array([[0.2], [0.8]])\nlr = 0.1\ninitial_pred = 0.0\nresult = gradient_boosting_predict(X, trees, lr, initial_pred)\nprint(round(result[0], 4), round(result[1], 4))",
                            "expected_output": "0.4875 0.52",
                            "explanation": "Left branch: sigmoid(0 + 0.1*(-0.5)) = sigmoid(-0.05) ≈ 0.4875; Right: sigmoid(0 + 0.1*0.8) = sigmoid(0.08) ≈ 0.52"
                        },
                        {
                            "input": "import numpy as np\ntrees = []\nX = np.array([[1.0], [2.0]])\nlr = 0.1\ninitial_pred = 1.0\nresult = gradient_boosting_predict(X, trees, lr, initial_pred)\nprint(round(result[0], 4))",
                            "expected_output": "0.7311",
                            "explanation": "With no trees, result is sigmoid(initial_pred) = sigmoid(1.0) ≈ 0.7311"
                        }
                    ],
                    "solution": """import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def predict_tree(tree, X):
    feature = tree['feature']
    threshold = tree['threshold']
    left_val = tree['left_value']
    right_val = tree['right_value']
    predictions = np.where(X[:, feature] <= threshold, left_val, right_val)
    return predictions

def gradient_boosting_predict(X, trees, lr, initial_pred):
    n_samples = X.shape[0]
    raw_scores = np.full(n_samples, initial_pred, dtype=float)
    for tree in trees:
        raw_scores += lr * predict_tree(tree, X)
    return sigmoid(raw_scores)
""",
                    "evaluation_criteria": {
                        "correctness_weight": 0.6,
                        "code_quality_weight": 0.25,
                        "efficiency_weight": 0.15
                    },
                    "max_score": 100,
                    "time_limit_seconds": 1800
                },
                {
                    "id": "ml_r2_q2",
                    "title": "Custom Cross-Validation with Stratification",
                    "question_type": "coding",
                    "difficulty": "medium",
                    "language": "python",
                    "problem_statement": """Implement a stratified k-fold cross-validation function without using sklearn.

The function should:
1. Split data into k folds while preserving class distribution
2. Train a model on k-1 folds and evaluate on the remaining fold
3. Return per-fold metrics: accuracy, precision, recall, F1
4. Return the mean and std of each metric

The function signature:
`stratified_kfold_cv(X, y, model, k=5) -> dict`

Where model has `.fit(X, y)` and `.predict(X)` methods.""",
                    "starter_code": """import numpy as np
from collections import defaultdict
from typing import Any, Dict

def stratified_kfold_cv(
    X: np.ndarray,
    y: np.ndarray,
    model: Any,
    k: int = 5
) -> Dict:
    \"\"\"
    Perform stratified k-fold cross validation.
    
    Returns:
        {
            'fold_metrics': [...],
            'mean_accuracy': float,
            'std_accuracy': float,
            'mean_f1': float,
            'std_f1': float,
        }
    \"\"\"
    pass
""",
                    "test_cases": [
                        {
                            "input": "# Basic structure test\nresult = stratified_kfold_cv(X_dummy, y_dummy, model_dummy, k=3)\nassert 'mean_accuracy' in result\nassert 'std_accuracy' in result\nassert len(result['fold_metrics']) == 3\nprint('PASS')",
                            "expected_output": "PASS",
                            "explanation": "Output dictionary must contain required keys"
                        }
                    ],
                    "max_score": 100,
                    "time_limit_seconds": 1500
                }
            ]
        },
        {
            "round_number": 3,
            "name": "Architecture & Strategy",
            "duration_minutes": 20,
            "description": "Design ML system architecture and justify trade-off decisions.",
            "questions": [
                {
                    "id": "ml_r3_q1",
                    "title": "ML Platform Architecture Decision",
                    "question_type": "decision_making",
                    "difficulty": "hard",
                    "problem_statement": """Your team needs to build an ML serving infrastructure. You must choose between:

Option A: Real-time online serving (REST API with model loaded in memory)
Option B: Batch prediction pipeline (precompute predictions nightly, serve from DB)
Option C: Hybrid approach (batch for most users, real-time for high-priority requests)
Option D: Streaming predictions (Kafka + Flink, continuous model scoring)

Context:
- 100M users, but 80% are active weekly (not daily)
- Features require joining 3 data sources (max 200ms acceptable latency)
- Model retraining happens weekly
- Budget is limited
- Team has strong data engineering but limited MLOps experience""",
                    "options": [
                        {
                            "id": "A",
                            "title": "Real-time Online Serving",
                            "description": "REST API with model loaded in memory, predict on-demand",
                            "pros": ["Always fresh predictions", "Simple architecture"],
                            "cons": ["High infrastructure cost", "Feature latency risk", "Scaling complexity"]
                        },
                        {
                            "id": "B",
                            "title": "Batch Prediction Pipeline",
                            "description": "Precompute all user predictions nightly, serve from database",
                            "pros": ["Low cost", "Simple to scale reads", "Leverages data eng skills"],
                            "cons": ["Stale predictions", "Wasted compute for inactive users", "Cold start on new users"]
                        },
                        {
                            "id": "C",
                            "title": "Hybrid Approach",
                            "description": "Batch for most users, real-time fallback for priority cases",
                            "pros": ["Cost-efficient", "Fresh when needed", "Pragmatic"],
                            "cons": ["Higher complexity", "Two systems to maintain"]
                        },
                        {
                            "id": "D",
                            "title": "Streaming Predictions",
                            "description": "Kafka + Flink continuous scoring pipeline",
                            "pros": ["Near real-time", "Event-driven"],
                            "cons": ["High complexity", "Team unfamiliarity risk", "Expensive"]
                        }
                    ],
                    "correct_option": "C",
                    "evaluation_criteria": {
                        "correct_choice_weight": 0.4,
                        "justification_keywords": ["cost", "80% weekly", "batch", "real-time", "hybrid", "pragmatic", "team skills", "complexity"],
                        "justification_weight": 0.6
                    },
                    "max_score": 100,
                    "time_limit_seconds": 1200
                },
                {
                    "id": "ml_r3_q2",
                    "title": "Model Monitoring Strategy",
                    "question_type": "decision_making",
                    "difficulty": "medium",
                    "problem_statement": """Your fraud detection model's precision dropped from 94% to 76% over 3 months. You need to choose a monitoring and retraining strategy.

Option A: Schedule weekly full retrains on all historical data
Option B: Implement online learning — update model incrementally with daily new data
Option C: Deploy canary model alongside production, monitor KPIs, replace on threshold breach
Option D: Implement a drift detection system (KS test, PSI) + trigger retrain only when drift detected""",
                    "options": [
                        {"id": "A", "title": "Weekly Full Retrain", "description": "Retrain from scratch every week on all data", "pros": ["Simple"], "cons": ["Expensive, slow, may overfit to recent data"]},
                        {"id": "B", "title": "Online Learning", "description": "Incrementally update model with daily new fraud cases", "pros": ["Adapts quickly"], "cons": ["Risk of catastrophic forgetting, label delay"]},
                        {"id": "C", "title": "Canary Deployment", "description": "Shadow new models in production, promote on KPI improvement", "pros": ["Safe deployment"], "cons": ["Doesn't solve drift detection itself"]},
                        {"id": "D", "title": "Drift Detection + Triggered Retrain", "description": "Monitor feature/label drift, retrain automatically when detected", "pros": ["Efficient, proactive, automated"], "cons": ["More complex to set up initially"]}
                    ],
                    "correct_option": "D",
                    "max_score": 100,
                    "time_limit_seconds": 900
                }
            ]
        },
        {
            "round_number": 4,
            "name": "Technical Communication",
            "duration_minutes": 10,
            "description": "Explain complex ML concepts clearly and justify your technical approach.",
            "questions": [
                {
                    "id": "ml_r4_q1",
                    "title": "Explain Your Architecture to a Non-Technical Stakeholder",
                    "question_type": "explanation",
                    "difficulty": "medium",
                    "scenario": """You've built a churn prediction model for a SaaS company. The CEO (non-technical) asks:
"How does the AI know when a customer is about to leave? Can we trust it? And why did it flag Account #4521 as high-risk when they just renewed their contract?"

Write your explanation as if speaking directly to the CEO. It should:
1. Explain how the model works (in plain English)
2. Address the trust/reliability concern
3. Explain the specific case of Account #4521
4. Mention what actions the team can take""",
                    "key_points": [
                        "Uses an analogy to explain ML (patterns from historical data)",
                        "Mentions model confidence or probability scores",
                        "Explains that recent renewal might not override older behavioral signals",
                        "Addresses explainability without using technical jargon",
                        "Proposes actionable next steps (human review, model investigation)"
                    ],
                    "evaluation_criteria": {
                        "clarity_weight": 0.4,
                        "completeness_weight": 0.35,
                        "technical_accuracy_weight": 0.25,
                        "keywords": ["pattern", "historical", "confidence", "features", "risk factors", "actionable", "review"],
                        "min_word_count": 150,
                        "max_jargon_density": 0.1
                    },
                    "max_score": 100,
                    "time_limit_seconds": 600
                }
            ]
        },
        {
            "round_number": 5,
            "name": "Debugging",
            "duration_minutes": 20,
            "description": "Identify and fix bugs in ML code. Explain root cause.",
            "questions": [
                {
                    "id": "ml_r5_q1",
                    "title": "Debug the Training Pipeline",
                    "question_type": "debugging",
                    "difficulty": "hard",
                    "problem_statement": """The following ML training pipeline has 4 bugs that cause incorrect model behavior.
Identify all bugs, explain each one, and provide the corrected code.""",
                    "buggy_code": """import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

def train_churn_model(X, y):
    # Bug 1: Data leakage - scaler is fit on all data before split
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)
    
    # Bug 2: Evaluating on training data, not test data
    y_pred = model.predict(X_train)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Bug 3: Wrong metric for imbalanced churn data (should use F1/AUC)
    print(f"Model accuracy: {accuracy:.4f}")
    
    # Bug 4: Returning unscaled scaler - new data won't be transformed properly
    return model, StandardScaler()

# Usage
X = np.random.randn(1000, 10)
y = np.random.choice([0, 1], 1000, p=[0.85, 0.15])  # imbalanced
model, scaler = train_churn_model(X, y)
""",
                    "expected_output": """Fixed code with:
1. Scaler fit only on training data (no data leakage)
2. Predictions made on test set
3. F1-score or AUC reported alongside accuracy
4. Trained scaler returned""",
                    "bug_description": """Bug 1: Data leakage — StandardScaler is fit on ALL data (including test) before the split.
Bug 2: model.predict(X_train) should be model.predict(X_test). Accuracy is computed on wrong data.
Bug 3: accuracy_score is misleading for imbalanced datasets. Should use F1, ROC-AUC, or precision-recall.
Bug 4: Returns `StandardScaler()` (untrained) instead of the fitted `scaler` object.""",
                    "evaluation_criteria": {
                        "bugs_found_weight": 0.5,
                        "explanation_quality_weight": 0.3,
                        "fix_correctness_weight": 0.2
                    },
                    "max_score": 100,
                    "time_limit_seconds": 1200
                },
                {
                    "id": "ml_r5_q2",
                    "title": "Fix the Neural Network Training Loop",
                    "question_type": "debugging",
                    "difficulty": "medium",
                    "problem_statement": "The following PyTorch training loop has 3 bugs. Find and fix them.",
                    "buggy_code": """import torch
import torch.nn as nn

def train_epoch(model, dataloader, optimizer, criterion):
    model.train()
    total_loss = 0
    
    for batch_idx, (X, y) in enumerate(dataloader):
        # Bug 1: Missing optimizer.zero_grad() - gradients accumulate
        outputs = model(X)
        loss = criterion(outputs, y)
        
        # Bug 2: loss.item() called before backward - should compute graph first
        total_loss += loss.item()
        loss.backward()
        
        # Bug 3: Missing optimizer.step() - weights never updated
        
    avg_loss = total_loss / len(dataloader)
    return avg_loss
""",
                    "bug_description": """Bug 1: optimizer.zero_grad() not called before forward pass — gradients from previous batches accumulate.
Bug 2: loss.item() order is fine here actually, but optimizer.step() is missing.
Bug 3: optimizer.step() is missing — the model weights are never updated.""",
                    "max_score": 100,
                    "time_limit_seconds": 900
                }
            ]
        }
    ]
}
