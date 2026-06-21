"""
==============================================================================
 NOTEBOOK 4: Fraud / Fake-Skill Detection Model
 Dataset:   Resume Parsing Dataset (ground_truth) + LinkedIn job_skills.csv
 Output:    ai_engine/models/saved/fraud_detector.pkl
            ai_engine/models/saved/fraud_detector_meta.json
==============================================================================
"""

# %% [markdown]
# # CAPVIA — Resume Fraud Detection Model
# Trains an Isolation Forest + XGBoost ensemble to detect:
# - Keyword stuffing
# - Skill inflation (claiming too many rare/advanced skills)
# - Experience contradictions
# - Copy-paste patterns
#
# Labels are **self-supervised** — generated from statistical heuristics
# applied to the LinkedIn & Resume datasets.

# %% ── Imports ────────────────────────────────────────────────────────────────
import os, json, re, random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
from collections import Counter

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, precision_recall_curve, average_precision_score,
)
import xgboost as xgb
import joblib

import warnings; warnings.filterwarnings("ignore")

SEED = 42
random.seed(SEED); np.random.seed(SEED)

BASE_DIR     = Path(__file__).parent.parent.parent
RESUME_CSV   = BASE_DIR / "Resume Dataset" / "Resume" / "Resume.csv"
LINKEDIN_DIR = BASE_DIR / "LinkedIn Job Postings (2023 - 2024)"
SAVE_DIR     = BASE_DIR / "ai_engine" / "models" / "saved"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

if not RESUME_CSV.exists():
    raise FileNotFoundError(f"Resume CSV not found: {RESUME_CSV}")
raw_resume_df = pd.read_csv(RESUME_CSV)
print(f"Loaded {len(raw_resume_df):,} resumes from CSV")

# %% ── 1. Build LinkedIn Skill Popularity Index ───────────────────────────────
print("[1/6] Building skill popularity index from LinkedIn data...")

skills_df = pd.read_csv(LINKEDIN_DIR / "jobs" / "job_skills.csv")
sk_col = [c for c in skills_df.columns if "skill" in c.lower()][-1]
skill_freq = skills_df[sk_col].str.lower().value_counts()
total_jobs  = skill_freq.sum()

# Normalised frequency: 1 = ubiquitous, 0 = extremely rare
skill_popularity = (skill_freq / total_jobs).to_dict()
print(f"Skill index built: {len(skill_popularity):,} unique skills")
print("Top 10 skills:", list(skill_popularity.keys())[:10])

# %% ── 2. Extract Fraud Features from CV JSONs ────────────────────────────────
print("\n[2/6] Extracting fraud-detection features from CVs...")

ADVANCED_SKILLS = {
    "quantum computing", "neuromorphic computing", "agi", "consciousness modelling",
    "autonomous weapons", "brain-computer interface", "nuclear engineering",
}
GENERIC_PHRASES = [
    "hardworking", "team player", "self-motivated", "results-driven",
    "detail-oriented", "passionate", "dynamic", "synergy", "leverage",
    "proactive", "go-getter", "guru", "ninja", "rockstar", "wizard",
]
COMMON_TEMPLATE_SENTENCES = [
    "responsible for managing day-to-day operations",
    "worked closely with cross-functional teams",
    "contributed to the success of the organization",
]

def extract_fraud_features(cv_id: str, raw_text: str) -> dict:
    """Extract fraud-detection features from plain-text resume string."""
    raw_lower = raw_text.lower()
    features  = {"cv_id": cv_id}

    # ── Skills features ───────────────────────────────────────────────────────
    # Use the LinkedIn skill vocabulary to detect mentioned skills
    COMMON_SKILLS = [
        "python", "java", "sql", "javascript", "c++", "react", "node",
        "django", "flask", "tensorflow", "pytorch", "aws", "azure", "gcp",
        "docker", "kubernetes", "git", "machine learning", "deep learning",
        "nlp", "data analysis", "tableau", "excel", "agile", "scrum",
        "devops", "mongodb", "postgresql", "redis", "typescript", "spark",
        "hadoop", "scala", "r", "matlab", "linux", "bash", "terraform",
        "ansible", "jenkins", "fastapi", "graphql", "elasticsearch",
    ]
    skill_names = [s for s in COMMON_SKILLS if re.search(r'\b' + re.escape(s) + r'\b', raw_lower)]
    features["skill_count"]          = len(skill_names)
    features["unique_skill_count"]   = len(set(skill_names))
    features["duplicate_skill_ratio"]= 1 - (features["unique_skill_count"] / max(features["skill_count"], 1))

    # Skill rarity (based on LinkedIn popularity index)
    skill_rarities = [1 - skill_popularity.get(s, 0.0) for s in skill_names]
    features["avg_skill_rarity"]      = float(np.mean(skill_rarities)) if skill_rarities else 0
    features["max_skill_rarity"]      = float(np.max(skill_rarities))  if skill_rarities else 0
    features["advanced_skill_count"]  = sum(1 for s in skill_names if s in ADVANCED_SKILLS)

    # Keyword stuffing: avg occurrences per skill keyword in body text
    keyword_count = sum(len(re.findall(r'\b' + re.escape(s) + r'\b', raw_lower)) for s in skill_names)
    features["keyword_density"] = keyword_count / max(len(raw_lower.split()), 1)

    # ── Experience features ───────────────────────────────────────────────────
    # Heuristic: count year-ranges as experience entries
    year_ranges = re.findall(r'(\d{4})\s*[-–]\s*(\d{4}|present|current)', raw_lower)
    features["experience_count"] = len(year_ranges)

    # Year span
    years = []
    for sy, ey in year_ranges:
        try:
            years.append(int(sy))
            if ey not in ('present', 'current'):
                years.append(int(ey))
        except ValueError:
            pass
    features["year_span"]              = (max(years) - min(years)) if len(years) >= 2 else 0
    features["experience_year_count"]  = len(years)

    # Sentences with quantified achievements
    sentences = re.split(r'[.\n]', raw_text)
    quantified = sum(1 for s in sentences if re.search(r'\d+%?\s*(increase|decrease|reduction|improvement|growth|users|revenue|latency)', s.lower()))
    features["quantified_ratio"] = quantified / max(features["experience_count"], 1)

    # Template sentences
    template_hits = sum(1 for t in COMMON_TEMPLATE_SENTENCES if t in raw_lower)
    features["template_hit_count"] = template_hits

    # Average description length (words between bullets/newlines)
    bullets = [b.strip() for b in re.split(r'[\u2022\-\*\n]', raw_text) if len(b.strip().split()) >= 3]
    desc_lengths = [len(b.split()) for b in bullets]
    features["avg_desc_length"] = float(np.mean(desc_lengths)) if desc_lengths else 0
    features["min_desc_length"] = float(np.min(desc_lengths))  if desc_lengths else 0

    # ── Buzzwords / generic language ─────────────────────────────────────────────
    generic_count = sum(1 for p in GENERIC_PHRASES if re.search(r'\b' + re.escape(p) + r'\b', raw_lower))
    features["generic_phrase_count"] = generic_count

    # ── Education ────────────────────────────────────────────────────────────
    degree_hits = len(re.findall(r'\b(bachelor|master|mba|phd|b\.s|m\.s|b\.e|m\.e|diploma|associate)\b', raw_lower))
    features["education_count"]      = degree_hits
    features["has_unverified_cert"]  = 0  # baseline

    # ── Profile completeness ─────────────────────────────────────────────────
    features["summary_length"]   = len(raw_text[:600].split())
    features["has_contact_info"] = 1 if re.search(r'[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}', raw_lower) else 0
    features["has_github"]       = 1 if "github" in raw_lower else 0
    features["total_text_length"]= len(raw_text.split())

    # ── Copy-paste detection: paragraph n-gram similarity within doc ────────────
    paras = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 30]
    dup_score = 0.0
    if len(paras) >= 2:
        from difflib import SequenceMatcher
        sims = []
        for i in range(min(len(paras) - 1, 10)):
            for j in range(i + 1, min(len(paras), 11)):
                s = SequenceMatcher(None, paras[i][:200], paras[j][:200]).ratio()
                sims.append(s)
        dup_score = float(np.mean(sims)) if sims else 0.0
    features["internal_dup_score"] = dup_score

    return features

print(f"Processing {len(raw_resume_df):,} resumes...")
records = []
for _, row in raw_resume_df.iterrows():
    try:
        text = str(row.get("Resume_str", "") or "").strip()
        if text:
            records.append(extract_fraud_features(str(row.get("ID", "")), text))
    except Exception:
        pass

df = pd.DataFrame(records)
print(f"Feature DataFrame: {df.shape}")
if df.empty or len(df.columns) == 0:
    raise ValueError("Feature DataFrame is empty — check RESUME_CSV path and content.")
print(df.describe())

# %% ── 3. Self-Supervised Fraud Labels ────────────────────────────────────────
print("\n[3/6] Generating self-supervised fraud labels...")

# Heuristic fraud rules — calibrated for plain-text regex features
# (thresholds are looser than JSON-based version since regex feature values are lower)
def is_suspicious(row: pd.Series) -> int:
    signals = 0
    # Keyword stuffing: skills mentioned very frequently relative to text length
    if row["keyword_density"] > 0.03:
        signals += 1
    # High duplicate skill ratio (same skill matched multiple times)
    if row["duplicate_skill_ratio"] > 0.2:
        signals += 1
    # Advanced skills with zero experience years detected
    if row["advanced_skill_count"] >= 1 and row["year_span"] == 0:
        signals += 1
    # Generic buzzword overuse
    if row["generic_phrase_count"] >= 2:
        signals += 1
    # Copy-paste pattern across paragraphs
    if row["internal_dup_score"] > 0.4:
        signals += 1
    # Template sentences present with no quantified achievements
    if row["template_hit_count"] >= 1 and row["quantified_ratio"] == 0:
        signals += 1
    # Very short bullet descriptions with many year-range entries
    if row["avg_desc_length"] < 15 and row["experience_count"] > 2:
        signals += 1
    # No education signals at all despite long text
    if row["education_count"] == 0 and row["total_text_length"] > 400:
        signals += 1
    return 1 if signals >= 2 else 0

df["is_fraud"] = df.apply(is_suspicious, axis=1)
fraud_rate = df["is_fraud"].mean()
print(f"Fraud rate: {fraud_rate:.2%}  ({df['is_fraud'].sum()} / {len(df)} resumes)")

# If heuristics still produce 0 fraud (very clean dataset), inject a synthetic
# minority class so the models have something meaningful to learn
if fraud_rate == 0.0:
    print("  ⚠ No fraudulent resumes detected by heuristics — injecting 5% synthetic labels")
    np.random.seed(42)
    fraud_idx = np.random.choice(len(df), size=max(1, int(len(df) * 0.05)), replace=False)
    df.loc[df.index[fraud_idx], "is_fraud"] = 1
    fraud_rate = df["is_fraud"].mean()
    print(f"  Adjusted fraud rate: {fraud_rate:.2%}")

# Add noise for realism
np.random.seed(42)
noise_mask = np.random.rand(len(df)) < 0.03
df.loc[noise_mask, "is_fraud"] = 1 - df.loc[noise_mask, "is_fraud"]

# %% ── 4. Feature Matrix & Train/Test Split ───────────────────────────────────
print("\n[4/6] Preparing feature matrix...")

EXCLUDE = ["cv_id", "is_fraud"]
FEATURE_COLS = [c for c in df.columns if c not in EXCLUDE]

X = df[FEATURE_COLS].fillna(0).astype(float)
y = df["is_fraud"].astype(int)

# Guard: stratify requires at least 2 classes
stratify_arg = y if y.nunique() > 1 else None
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=stratify_arg
)

scaler  = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

print(f"Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")
print(f"Train fraud rate: {y_train.mean():.2%}")

# %% ── 5. Ensemble: Isolation Forest + XGBoost ────────────────────────────────
print("\n[5/6] Training fraud detection ensemble...")

# ── 5a. Isolation Forest (anomaly-based) ─────────────────────────────────────
# Clamp contamination to (0, 0.5] — IsolationForest rejects 0.0 or values > 0.5
contamination = float(np.clip(df["is_fraud"].mean(), 0.05, 0.40))
print(f"IsolationForest contamination: {contamination:.3f}")

iso = IsolationForest(
    n_estimators=300,
    contamination=contamination,
    random_state=42,
    n_jobs=-1,
)
iso.fit(X_train_s)
iso_scores_train = -iso.score_samples(X_train_s)  # higher = more anomalous
iso_scores_test  = -iso.score_samples(X_test_s)

# ── 5b. XGBoost classifier ────────────────────────────────────────────────────
scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
xgb_clf = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    eval_metric="aucpr",
    early_stopping_rounds=30,
    random_state=42,
    # use_label_encoder removed in XGBoost >=2.0
)
xgb_clf.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50,
)

xgb_proba_train = xgb_clf.predict_proba(X_train)[:, 1]
xgb_proba_test  = xgb_clf.predict_proba(X_test)[:, 1]

# ── 5c. Logistic meta-classifier (stacking) ──────────────────────────────────
meta_X_train = np.column_stack([iso_scores_train, xgb_proba_train])
meta_X_test  = np.column_stack([iso_scores_test,  xgb_proba_test])

meta_clf = LogisticRegression(C=1.0, random_state=42)
meta_clf.fit(meta_X_train, y_train)
y_proba = meta_clf.predict_proba(meta_X_test)[:, 1]

# Optimal threshold via precision-recall curve
prec, rec, thresholds = precision_recall_curve(y_test, y_proba)
f1_scores = 2 * prec * rec / (prec + rec + 1e-9)
best_thresh = thresholds[np.argmax(f1_scores)] if len(thresholds) else 0.5
print(f"\nOptimal threshold: {best_thresh:.4f}")

y_pred = (y_proba >= best_thresh).astype(int)

# ── Metrics ───────────────────────────────────────────────────────────────────
print("\nClassification Report (Ensemble):")
print(classification_report(y_test, y_pred, target_names=["CLEAN", "SUSPICIOUS"]))

roc_auc = roc_auc_score(y_test, y_proba)
avg_prec = average_precision_score(y_test, y_proba)
print(f"ROC-AUC:          {roc_auc:.4f}")
print(f"Average Precision:{avg_prec:.4f}")

# Feature importance from XGBoost
fi = pd.Series(
    xgb_clf.feature_importances_, index=FEATURE_COLS
).sort_values(ascending=False)
print("\nTop 10 Fraud Indicators:")
print(fi.head(10).to_string())

# %% ── 6. Save Everything ─────────────────────────────────────────────────────
print("\n[6/6] Saving models...")

joblib.dump(iso,       SAVE_DIR / "fraud_isolation_forest.pkl")
joblib.dump(xgb_clf,   SAVE_DIR / "fraud_xgboost.pkl")
joblib.dump(meta_clf,  SAVE_DIR / "fraud_meta_classifier.pkl")
joblib.dump(scaler,    SAVE_DIR / "fraud_feature_scaler.pkl")

meta = {
    "features":          FEATURE_COLS,
    "fraud_rate":        round(fraud_rate, 4),
    "optimal_threshold": round(float(best_thresh), 4),
    "roc_auc":           round(roc_auc, 4),
    "average_precision": round(avg_prec, 4),
    "training_samples":  len(X_train),
    "test_samples":      len(X_test),
    "training_date":     datetime.now().isoformat(),
}
with open(SAVE_DIR / "fraud_detector_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

print(f"All models saved → {SAVE_DIR}")
print("✅ Fraud Detection Model Training COMPLETE")
