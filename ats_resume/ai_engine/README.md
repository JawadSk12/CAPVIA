# CAPVIA AI Engine

> Production-grade AI pipeline powering ATS scoring, semantic resume–JD matching, NER entity extraction, and fraud detection.

---

## Directory Structure

```
ai_engine/
├── models/
│   ├── ats_scorer.py          # XGBoost/LightGBM ATS score predictor wrapper
│   ├── role_detector.py       # Job role classification (zero-shot + fine-tuned)
│   ├── ner_extractor.py       # SpaCy NER → SKILL, EXPERIENCE, EDUCATION entities
│   ├── fraud_detector.py      # IsolationForest + XGBoost fraud ensemble
│   └── saved/                 # ← trained model weights (git-ignored, ~2 GB)
│       ├── ats_scorer.xgb
│       ├── ats_feature_scaler.pkl
│       ├── ats_scorer_meta.json
│       ├── semantic_model/    # Fine-tuned Sentence-BERT
│       ├── ner_resume_parser/ # SpaCy NER pipeline
│       ├── fraud_xgboost.pkl
│       ├── fraud_meta_classifier.pkl
│       └── fraud_detector_meta.json
├── nlp/
│   ├── semantic_matcher.py    # Loads saved/semantic_model, exposes compute_similarity()
│   ├── ontology.py            # Skill synonym + alias mapping (10k+ skills)
│   └── keyword_extractor.py  # TF-IDF / YAKE keyword extraction from JD text
├── pipelines/
│   ├── resume_pipeline.py     # Orchestrates: OCR → parse → embed → score → fraud
│   └── jd_pipeline.py        # JD text → skill extraction → embedding
├── scoring/
│   ├── ats_scorer.py          # Feature engineering + score computation
│   ├── dimension_scorer.py    # Per-dimension scores (skills, exp, edu, …)
│   └── heatmap_builder.py     # Token-level relevance scores for heatmap UI
├── utils/
│   ├── text_cleaner.py        # PDF text cleaning, section segmentation
│   ├── pdf_extractor.py       # pdfplumber + pytesseract OCR fallback
│   └── embedder.py            # Embedding cache + batch utilities
├── vector_store/
│   └── pinecone_client.py     # Upsert/query resume embeddings in Pinecone
├── notebooks/
│   ├── 01_ats_scoring_model.py           ← TRAINING NOTEBOOK 1
│   ├── 02_semantic_similarity_finetuning.py  ← TRAINING NOTEBOOK 2
│   ├── 03_ner_resume_parser.py           ← TRAINING NOTEBOOK 3
│   ├── 04_fraud_detection_model.py       ← TRAINING NOTEBOOK 4
│   ├── requirements_training.txt
│   └── run_all_training.sh
└── requirements.txt
```

---

## ML Models & Training Datasets

### Notebook 01 — ATS Scoring Model
| Item | Detail |
|------|--------|
| **Training data** | `Resume Parsing Dataset/ground_truth/cv_*.json` (3,533 CVs) |
| **Extra signals** | `LinkedIn Job Postings/jobs/job_skills.csv` skill frequency |
| **Features** | skill_count, experience_months, education_level, quantification_rate, action_verb_count, cert_count, project_count, profile_completeness (+6 more) |
| **Models trained** | Ridge baseline → Random Forest → **XGBoost** → LightGBM |
| **Metric** | MAE, RMSE, R² on held-out 15% test split |
| **Output** | `models/saved/ats_scorer.xgb` + `ats_feature_scaler.pkl` |

**Run:**
```bash
python notebooks/01_ats_scoring_model.py
```

---

### Notebook 02 — Semantic Similarity Fine-Tuning
| Item | Detail |
|------|--------|
| **Training data (general)** | `mteb/stsbenchmark-sts` from HuggingFace (8,628 pairs) |
| **Training data (domain)** | LinkedIn `job_skills.csv` co-occurrence pairs (3,000) |
| **Training data (task)** | 34 handcrafted resume↔JD phrase pairs |
| **Base model** | `sentence-transformers/all-MiniLM-L6-v2` (22M params) |
| **Loss** | `CosineSimilarityLoss` |
| **Metric** | Pearson correlation on STS test set |
| **Output** | `models/saved/semantic_model/` (full SentenceTransformer) |

**Runtime hook:** `nlp/semantic_matcher.py` loads this model at process startup and caches embeddings in Redis.

**Run:**
```bash
python notebooks/02_semantic_similarity_finetuning.py
```

---

### Notebook 03 — NER Resume Parser
| Item | Detail |
|------|--------|
| **Training data** | `Resume Parsing Dataset/ground_truth/cv_*.json` (3,000 CVs) |
| **Entity types** | `SKILL`, `EXPERIENCE`, `COMPANY`, `DEGREE`, `EDUCATION`, `DURATION`, `CERT` |
| **Base model** | SpaCy `en_core_web_sm` |
| **Training** | 15 epochs, batch compounding, dropout=0.3 |
| **Metric** | Entity-level Precision / Recall / F1 |
| **Output** | `models/saved/ner_resume_parser/` (SpaCy pipeline) |

**Runtime hook:** `models/ner_extractor.py` wraps the saved SpaCy pipeline.

**Run:**
```bash
python -m spacy download en_core_web_sm   # first time only
python notebooks/03_ner_resume_parser.py
```

---

### Notebook 04 — Fraud Detection
| Item | Detail |
|------|--------|
| **Training data** | 3,533 CV JSONs + LinkedIn skill popularity index |
| **Labels** | Self-supervised heuristics (keyword stuffing, skill inflation, copy-paste, template abuse) |
| **Models** | `IsolationForest` (anomaly) + `XGBoostClassifier` + `LogisticRegression` meta |
| **Class imbalance** | `scale_pos_weight` + optimal threshold via P-R curve |
| **Metric** | ROC-AUC, Average Precision |
| **Output** | `fraud_isolation_forest.pkl`, `fraud_xgboost.pkl`, `fraud_meta_classifier.pkl` |

**Runtime hook:** `models/fraud_detector.py` loads all three and exposes `predict_fraud(features) → FraudAnalysis`.

**Run:**
```bash
python notebooks/04_fraud_detection_model.py
```

---

## How Notebooks Connect to the Live Backend

```
Training Pipeline                 Runtime Pipeline
─────────────────                 ────────────────
notebooks/01_*.py  ──saves──▶  models/saved/ats_scorer.xgb
                                      │
notebooks/02_*.py  ──saves──▶  models/saved/semantic_model/
                                      │
notebooks/03_*.py  ──saves──▶  models/saved/ner_resume_parser/
                                      │
notebooks/04_*.py  ──saves──▶  models/saved/fraud_*.pkl
                                      │
                              ai_engine/pipelines/resume_pipeline.py
                                      │ (loaded once at worker start)
                              backend/workers/ats_worker.py  (Celery)
                                      │
                              backend/services/ats_service.py
                                      │
                              backend/api/v1/routes/resume.py  (FastAPI)
                                      │
                              frontend ExplainabilityPanel, SkillGapChart, ResumeHeatmap
```

---

## Run All Training at Once

```bash
cd ai_engine/notebooks
bash run_all_training.sh
# Automatically creates venv, installs requirements, runs all 4 notebooks
# Total time: ~20-40 minutes (CPU) or ~5-10 minutes (GPU)
```

---

## Requirements

```bash
pip install -r notebooks/requirements_training.txt  # training only
pip install -r requirements.txt                     # runtime
```

Key runtime packages: `sentence-transformers`, `spacy`, `xgboost`, `lightgbm`, `pdfplumber`, `pytesseract`, `pinecone-client`, `redis`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PINECONE_API_KEY` | Pinecone vector DB key (for `vector_store/`) |
| `PINECONE_ENV` | Pinecone environment |
| `OPENAI_API_KEY` | For AI Rewrite SSE endpoint |
| `AI_MODEL_PATH` | Override default `models/saved/` path |
