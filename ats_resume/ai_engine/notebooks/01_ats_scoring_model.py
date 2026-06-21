"""
==============================================================================
 NOTEBOOK 1: ATS Scoring Model Training
 Dataset: LinkedIn Job Postings (2023-2024) + Resume Parsing Dataset
 Output:  ai_engine/models/saved/ats_scorer.pkl
          ai_engine/models/saved/ats_feature_scaler.pkl
          ai_engine/models/saved/ats_label_encoder.pkl
==============================================================================
"""

# %% [markdown]
# # CAPVIA — ATS Score Prediction Model
# Trains an XGBoost model to predict ATS compatibility scores (0–100)
# using features extracted from resumes and job descriptions.

# %% ── Imports ────────────────────────────────────────────────────────────────
import os
import json
import re
import glob
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    classification_report, confusion_matrix
)
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
import xgboost as xgb
import lightgbm as lgb
import joblib

import warnings
warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent.parent.parent  # Resume ATS Capvia/
LINKEDIN_DIR = BASE_DIR / "LinkedIn Job Postings (2023 - 2024)"
RESUME_CSV   = BASE_DIR / "Resume Dataset" / "Resume" / "Resume.csv"
SAVE_DIR     = BASE_DIR / "ai_engine" / "models" / "saved"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

print(f"Base dir:      {BASE_DIR}")
print(f"LinkedIn data: {LINKEDIN_DIR}")
print(f"Resume data:   {RESUME_CSV}")
print(f"Save dir:      {SAVE_DIR}")

# %% ── 1. Load LinkedIn Job Postings ─────────────────────────────────────────
print("\n[1/7] Loading LinkedIn job postings...")

postings = pd.read_csv(
    LINKEDIN_DIR / "postings.csv",
    low_memory=False,
    nrows=200_000,  # limit for manageable training time
)
print(f"Postings loaded: {postings.shape}")
print(postings.dtypes)
print(postings.head(3))

# Load supplementary tables
skills_df     = pd.read_csv(LINKEDIN_DIR / "jobs" / "job_skills.csv")
industries_df = pd.read_csv(LINKEDIN_DIR / "jobs" / "job_industries.csv")

print(f"\nSkills rows:     {skills_df.shape[0]:,}")
print(f"Industries rows: {industries_df.shape[0]:,}")

# %% ── 2. Load Resume Dataset (CSV with raw resume text) ─────────────────────
print("\n[2/7] Loading resume dataset from CSV...")

if not RESUME_CSV.exists():
    raise FileNotFoundError(
        f"Resume CSV not found: {RESUME_CSV}\n"
        f"Expected: Resume Dataset/Resume/Resume.csv"
    )

raw_resume_df = pd.read_csv(RESUME_CSV)
print(f"Loaded {len(raw_resume_df):,} resumes | columns: {raw_resume_df.columns.tolist()}")

# ── Feature extraction from plain-text resume strings ────────────────────────
ACTION_VERBS = [
    "led", "built", "managed", "developed", "designed", "implemented",
    "improved", "created", "achieved", "drove", "launched", "deployed",
    "reduced", "increased", "analyzed", "architected", "optimized",
    "delivered", "coordinated", "spearheaded", "established", "streamlined",
]

DEGREE_PATTERNS = {
    4: [r"ph\.?d", r"doctorate", r"doctor of"],
    3: [r"master", r"m\.s\b", r"m\.sc", r"mba", r"m\.eng"],
    2: [r"bachelor", r"b\.s\b", r"b\.sc", r"b\.e\b", r"b\.tech", r"undergraduate"],
    1: [r"diploma", r"associate", r"a\.a\b", r"a\.s\b"],
}

TECH_SKILL_PATTERNS = [
    "python", "sql", "java", "javascript", "typescript", "c\+\+", "c#", "go",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit",
    "nlp", "computer vision", "data analysis", "pandas", "numpy", "spark",
    "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "devops",
    "react", "next\.js", "fastapi", "django", "flask", "node",
    "postgresql", "mongodb", "redis", "elasticsearch",
    "statistics", "a/b testing", "tableau", "power bi",
    "excel", "word", "powerpoint", "photoshop", "illustrator",
    "project management", "agile", "scrum", "leadership", "communication",
]

def parse_resume_text(row) -> dict:
    """Extract ATS-relevant features from a plain-text resume string."""
    text = str(row.get("Resume_str", "") or "")
    text_lower = text.lower()
    record = {"cv_id": str(row.get("ID", ""))}

    # --- Skills (keyword match against common tech/soft skills) ---------------
    matched_skills = [s for s in TECH_SKILL_PATTERNS if re.search(s, text_lower)]
    record["skill_count"] = len(matched_skills)
    record["skills"]      = matched_skills

    # --- Experience -----------------------------------------------------------
    # Heuristic: count year-ranges like "2018 - 2021" or "2019–2022"
    year_ranges = re.findall(r"(\d{4})\s*[-–]\s*(\d{4}|present|current)", text_lower)
    record["experience_count"] = len(year_ranges)

    total_months = 0
    for start_y, end_y in year_ranges:
        try:
            sy = int(start_y)
            ey = datetime.now().year if end_y in ("present", "current") else int(end_y)
            total_months += max(0, (ey - sy) * 12)
        except Exception:
            pass
    record["total_experience_months"] = min(total_months, 480)  # cap at 40 years

    # Quantified achievements: sentences with numbers
    sentences = re.split(r"[.\n]", text)
    has_quantified = sum(1 for s in sentences if re.search(r"\d+%?\s*(increase|decrease|reduction|improvement|growth)", s.lower()))
    record["has_quantified_achievements"] = has_quantified

    # Action verbs
    action_count = sum(1 for v in ACTION_VERBS if re.search(r"\b" + v + r"\b", text_lower))
    record["action_verb_count"] = action_count

    # --- Education ------------------------------------------------------------
    degree_score = 0
    edu_count = 0
    for level, patterns in DEGREE_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, text_lower):
                degree_score = max(degree_score, level)
                edu_count += 1
                break
    record["education_count"] = min(edu_count, 4)
    record["education_level"] = degree_score

    # --- Certifications -------------------------------------------------------
    cert_matches = re.findall(
        r"\b(certified|certification|certificate|pmp|cpa|cfa|aws certified|google certified|microsoft certified)\b",
        text_lower
    )
    record["cert_count"] = len(cert_matches)

    # --- Projects -------------------------------------------------------------
    project_headers = re.findall(r"\bproject[s]?\b", text_lower)
    record["project_count"] = min(len(project_headers), 10)

    # --- Languages ------------------------------------------------------------
    lang_list = ["english", "spanish", "french", "german", "chinese", "arabic",
                 "hindi", "portuguese", "russian", "japanese", "korean"]
    lang_count = sum(1 for l in lang_list if re.search(r"\b" + l + r"\b", text_lower))
    record["language_count"] = lang_count

    # --- Profile completeness -------------------------------------------------
    # Summary: first paragraph before any section header
    first_block = text[:600]
    record["has_summary"]    = 1 if len(first_block.strip()) > 80 else 0
    record["summary_length"] = len(first_block.strip())
    record["has_linkedin"]   = 1 if "linkedin" in text_lower else 0
    record["has_github"]     = 1 if "github" in text_lower else 0

    # --- Job category (useful metadata) --------------------------------------
    record["category"] = str(row.get("Category", ""))

    return record

print("Parsing resume texts...")
records = [parse_resume_text(row) for _, row in raw_resume_df.iterrows()]
cv_df   = pd.DataFrame(records)
print(f"CV DataFrame shape: {cv_df.shape}")
if cv_df.empty or len(cv_df.columns) == 0:
    raise ValueError("CV DataFrame is empty after parsing. Check RESUME_CSV path and content.")
print(cv_df.describe())

# %% ── 3. Build LinkedIn Skill Taxonomy ───────────────────────────────────────
print("\n[3/7] Building skill taxonomy from LinkedIn job_skills.csv...")

# Top skills by frequency across all postings
top_skills = (
    skills_df["skill_abr"].value_counts().head(200).index.tolist()
    if "skill_abr" in skills_df.columns
    else skills_df.iloc[:, -1].value_counts().head(200).index.tolist()
)
print(f"Top {len(top_skills)} skills extracted from LinkedIn data")

# Most demanded skills from postings
TECH_SKILLS = [
    "Python", "SQL", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
    "NLP", "Computer Vision", "Data Analysis", "Pandas", "NumPy", "Spark",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "DevOps",
    "React", "Next.js", "FastAPI", "Django", "Flask", "Node.js",
    "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
    "Statistics", "Probability", "A/B Testing", "Data Visualization",
]

def compute_skill_match(candidate_skills: list, jd_skills: list) -> float:
    """Compute Jaccard + fuzzy skill match score (0–1)."""
    if not jd_skills:
        return 0.5
    cand_lower = {s.lower() for s in candidate_skills}
    jd_lower   = {s.lower() for s in jd_skills}
    direct_match = len(cand_lower & jd_lower)
    union        = len(cand_lower | jd_lower)
    jaccard = direct_match / union if union > 0 else 0

    # Partial matches (substring)
    partial = sum(
        1 for js in jd_lower
        if any(js in cs or cs in js for cs in cand_lower)
    )
    partial_rate = partial / len(jd_lower) if jd_lower else 0

    return min(1.0, 0.6 * jaccard + 0.4 * partial_rate)

# %% ── 4. Generate Synthetic ATS Score Labels ─────────────────────────────────
print("\n[4/7] Engineering features and generating ATS score labels...")

# We generate ground-truth ATS scores using a weighted formula
# (in production, human HR ratings would replace this)

def compute_ats_score(row: pd.Series) -> float:
    """
    Compute a weighted ATS compatibility score (0–100).

    Weights derived from analysis of LinkedIn hiring signals and
    academic literature on ATS systems.
    """
    # Skill density (0-1): more skills up to a saturation point
    skill_score = min(row["skill_count"] / 20.0, 1.0)

    # Experience depth (0-1)
    exp_depth = min(row["total_experience_months"] / 60.0, 1.0)  # 5 years = max
    exp_breadth = min(row["experience_count"] / 5.0, 1.0)
    exp_score = 0.7 * exp_depth + 0.3 * exp_breadth

    # Education alignment (0-1)
    edu_score = row["education_level"] / 4.0

    # Quantification of achievements (0-1)
    quant_score = min(row["has_quantified_achievements"] / max(row["experience_count"], 1), 1.0)

    # Action verbs usage (0-1)
    action_score = min(row["action_verb_count"] / max(row["experience_count"], 1), 1.0)

    # Profile completeness (0-1)
    completeness = (
        row["has_summary"] * 0.3 +
        min(row["summary_length"] / 500.0, 1.0) * 0.2 +
        row["has_linkedin"] * 0.25 +
        row["has_github"] * 0.25
    )

    # Certifications bonus
    cert_bonus = min(row["cert_count"] / 5.0, 1.0)

    # Projects
    project_score = min(row["project_count"] / 5.0, 1.0)

    # Weighted final score
    score = (
        skill_score     * 0.28 +
        exp_score       * 0.22 +
        edu_score       * 0.12 +
        quant_score     * 0.12 +
        action_score    * 0.08 +
        completeness    * 0.08 +
        cert_bonus      * 0.05 +
        project_score   * 0.05
    )

    # Realistic noise + scale to 0-100
    noise = np.random.normal(0, 0.02)
    return min(100.0, max(0.0, (score + noise) * 100))

np.random.seed(42)
cv_df["ats_score"] = cv_df.apply(compute_ats_score, axis=1)

print(f"ATS score distribution:")
print(cv_df["ats_score"].describe())
print(f"\nScore bands:")
print(pd.cut(cv_df["ats_score"], bins=[0,40,60,80,100], labels=["WEAK","FAIR","GOOD","STRONG"]).value_counts())

# %% ── 5. Feature Engineering ─────────────────────────────────────────────────
print("\n[5/7] Feature matrix construction...")

FEATURE_COLS = [
    "skill_count",
    "experience_count",
    "total_experience_months",
    "has_quantified_achievements",
    "action_verb_count",
    "education_count",
    "education_level",
    "cert_count",
    "project_count",
    "language_count",
    "has_summary",
    "summary_length",
    "has_linkedin",
    "has_github",
]

X = cv_df[FEATURE_COLS].fillna(0).astype(float)
y = cv_df["ats_score"]

print(f"Feature matrix: {X.shape}")
print(X.describe())

# Train/val/test split (70/15/15)
X_train, X_temp,  y_train, y_temp  = train_test_split(X, y, test_size=0.30, random_state=42)
X_val,   X_test,  y_val,   y_test  = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)

print(f"Train: {X_train.shape[0]} | Val: {X_val.shape[0]} | Test: {X_test.shape[0]}")

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_val_s   = scaler.transform(X_val)
X_test_s  = scaler.transform(X_test)

# %% ── 6. Model Training & Comparison ────────────────────────────────────────
print("\n[6/7] Training models...")

results = {}

# ── 6a. Ridge Regression (baseline) ──────────────────────────────────────────
ridge = Ridge(alpha=10.0)
ridge.fit(X_train_s, y_train)
y_pred_ridge = ridge.predict(X_val_s)
results["Ridge"] = {
    "MAE":  mean_absolute_error(y_val, y_pred_ridge),
    "RMSE": mean_squared_error(y_val, y_pred_ridge) ** 0.5,
    "R2":   r2_score(y_val, y_pred_ridge),
    "model": ridge,
}
print(f"Ridge      → MAE={results['Ridge']['MAE']:.3f}  RMSE={results['Ridge']['RMSE']:.3f}  R2={results['Ridge']['R2']:.3f}")

# ── 6b. Random Forest ─────────────────────────────────────────────────────────
rf = RandomForestRegressor(n_estimators=200, max_depth=8, n_jobs=-1, random_state=42)
rf.fit(X_train, y_train)
y_pred_rf = rf.predict(X_val)
results["RandomForest"] = {
    "MAE":  mean_absolute_error(y_val, y_pred_rf),
    "RMSE": mean_squared_error(y_val, y_pred_rf) ** 0.5,
    "R2":   r2_score(y_val, y_pred_rf),
    "model": rf,
}
print(f"RandomForest → MAE={results['RandomForest']['MAE']:.3f}  RMSE={results['RandomForest']['RMSE']:.3f}  R2={results['RandomForest']['R2']:.3f}")

# ── 6c. XGBoost (primary model) ───────────────────────────────────────────────
dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_COLS)
dval   = xgb.DMatrix(X_val,   label=y_val,   feature_names=FEATURE_COLS)
dtest  = xgb.DMatrix(X_test,  label=y_test,  feature_names=FEATURE_COLS)

xgb_params = {
    "objective":        "reg:squarederror",
    "eval_metric":      "rmse",
    "max_depth":        6,
    "eta":              0.05,
    "subsample":        0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma":            0.1,
    "lambda":           2.0,
    "alpha":            0.5,
    "seed":             42,
}

evals = [(dtrain, "train"), (dval, "val")]
xgb_model = xgb.train(
    xgb_params,
    dtrain,
    num_boost_round=500,
    evals=evals,
    early_stopping_rounds=30,
    verbose_eval=50,
)

y_pred_xgb = xgb_model.predict(dval)
results["XGBoost"] = {
    "MAE":  mean_absolute_error(y_val, y_pred_xgb),
    "RMSE": mean_squared_error(y_val, y_pred_xgb) ** 0.5,
    "R2":   r2_score(y_val, y_pred_xgb),
    "model": xgb_model,
}
print(f"XGBoost    → MAE={results['XGBoost']['MAE']:.3f}  RMSE={results['XGBoost']['RMSE']:.3f}  R2={results['XGBoost']['R2']:.3f}")

# ── 6d. LightGBM ──────────────────────────────────────────────────────────────
lgb_train = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_COLS)
lgb_val   = lgb.Dataset(X_val,   label=y_val,   reference=lgb_train)

lgb_params = {
    "objective":     "regression",
    "metric":        "rmse",
    "learning_rate": 0.05,
    "num_leaves":    63,
    "max_depth":     -1,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq":  5,
    "reg_alpha":     0.5,
    "reg_lambda":    1.0,
    "min_child_samples": 20,
    "verbose":       -1,
}

callbacks = [lgb.early_stopping(30), lgb.log_evaluation(50)]
lgb_model = lgb.train(
    lgb_params,
    lgb_train,
    num_boost_round=500,
    valid_sets=[lgb_val],
    callbacks=callbacks,
)

y_pred_lgb = lgb_model.predict(X_val)
results["LightGBM"] = {
    "MAE":  mean_absolute_error(y_val, y_pred_lgb),
    "RMSE": mean_squared_error(y_val, y_pred_lgb) ** 0.5,
    "R2":   r2_score(y_val, y_pred_lgb),
    "model": lgb_model,
}
print(f"LightGBM   → MAE={results['LightGBM']['MAE']:.3f}  RMSE={results['LightGBM']['RMSE']:.3f}  R2={results['LightGBM']['R2']:.3f}")

# ── Summary ───────────────────────────────────────────────────────────────────
results_df = pd.DataFrame({k: {m: v for m, v in r.items() if m != "model"} for k, r in results.items()}).T
print("\n─── MODEL COMPARISON ─────────────────────────────────────")
print(results_df.to_string())

# %% ── 7. Evaluate Best Model on Test Set ────────────────────────────────────
print("\n[7/7] Evaluating best model on held-out test set...")

best_name  = results_df["R2"].astype(float).idxmax()
best_model = results[best_name]["model"]
print(f"\nBest model: {best_name}")

if best_name == "XGBoost":
    y_pred_test = best_model.predict(dtest)
elif best_name == "LightGBM":
    y_pred_test = best_model.predict(X_test)
else:
    y_pred_test = best_model.predict(X_test_s)

test_mae  = mean_absolute_error(y_test, y_pred_test)
test_rmse = mean_squared_error(y_test, y_pred_test) ** 0.5
test_r2   = r2_score(y_test, y_pred_test)

print(f"\nTest MAE:  {test_mae:.3f}")
print(f"Test RMSE: {test_rmse:.3f}")
print(f"Test R²:   {test_r2:.4f}")

# ── Feature Importance ────────────────────────────────────────────────────────
if best_name == "XGBoost":
    fi = pd.Series(best_model.get_score(importance_type="gain")).sort_values(ascending=False)
elif best_name == "LightGBM":
    fi = pd.Series(best_model.feature_importance(importance_type="gain"), index=FEATURE_COLS).sort_values(ascending=False)
else:
    fi = pd.Series(best_model.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)

print(f"\nFeature Importances ({best_name}):")
print(fi.to_string())

# ── Plot ──────────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

fi.plot(kind="barh", ax=axes[0], color="#4F46E5")
axes[0].set_title(f"{best_name} Feature Importances")
axes[0].set_xlabel("Gain")

axes[1].scatter(y_test, y_pred_test, alpha=0.4, c="#10B981", edgecolors="none", s=20)
axes[1].plot([0, 100], [0, 100], "r--", lw=1.5)
axes[1].set_xlabel("Actual ATS Score")
axes[1].set_ylabel("Predicted ATS Score")
axes[1].set_title(f"{best_name} — Predicted vs Actual (Test R²={test_r2:.3f})")
axes[1].set_xlim(0, 100)
axes[1].set_ylim(0, 100)

plt.tight_layout()
plt.savefig(SAVE_DIR / "ats_scoring_model_analysis.png", dpi=150, bbox_inches="tight")
print(f"\nPlot saved → {SAVE_DIR / 'ats_scoring_model_analysis.png'}")

# %% ── Save Models ─────────────────────────────────────────────────────────────
print("\nSaving models...")

joblib.dump(scaler, SAVE_DIR / "ats_feature_scaler.pkl")
print(f"Scaler saved → {SAVE_DIR / 'ats_feature_scaler.pkl'}")

if best_name == "XGBoost":
    best_model.save_model(str(SAVE_DIR / "ats_scorer.xgb"))
    print(f"XGBoost model saved → {SAVE_DIR / 'ats_scorer.xgb'}")
elif best_name == "LightGBM":
    best_model.save_model(str(SAVE_DIR / "ats_scorer.lgb"))
    print(f"LightGBM model saved → {SAVE_DIR / 'ats_scorer.lgb'}")
else:
    joblib.dump(best_model, SAVE_DIR / "ats_scorer.pkl")
    print(f"Model saved → {SAVE_DIR / 'ats_scorer.pkl'}")

# Save feature config
import json
meta = {
    "best_model":    best_name,
    "features":      FEATURE_COLS,
    "test_mae":      round(test_mae, 4),
    "test_rmse":     round(test_rmse, 4),
    "test_r2":       round(test_r2, 4),
    "trained_on":    len(cv_df),
    "training_date": datetime.now().isoformat(),
}
with open(SAVE_DIR / "ats_scorer_meta.json", "w") as f:
    json.dump(meta, f, indent=2)
print(f"Metadata saved → {SAVE_DIR / 'ats_scorer_meta.json'}")
print("\n✅ ATS Scoring Model Training COMPLETE")
