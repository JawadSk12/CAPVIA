"""
==============================================================================
 NOTEBOOK 3: NER Resume Parser Training (SpaCy)
 Dataset:   Resume Parsing Dataset / ground_truth / cv_*.json  (3533 CVs)
 Output:    ai_engine/models/saved/ner_resume_parser/
==============================================================================
"""

# %% [markdown]
# # CAPVIA — Named Entity Recognition for Resume Parsing
# Trains a SpaCy NER model to extract structured entities from raw resume text.
# Entity types: SKILL, EXPERIENCE, EDUCATION, COMPANY, DEGREE, DURATION, CERT

# %% ── Imports ────────────────────────────────────────────────────────────────
import os, json, re, glob, random
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
from spacy.tokens import DocBin
from sklearn.metrics import classification_report

import warnings; warnings.filterwarnings("ignore")

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

BASE_DIR    = Path(__file__).parent.parent.parent
RESUME_CSV  = BASE_DIR / "Resume Dataset" / "Resume" / "Resume.csv"
SAVE_DIR    = BASE_DIR / "ai_engine" / "models" / "saved" / "ner_resume_parser"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

if not RESUME_CSV.exists():
    raise FileNotFoundError(f"Resume CSV not found: {RESUME_CSV}")
raw_resume_df = pd.read_csv(RESUME_CSV)
print(f"Loaded {len(raw_resume_df):,} resumes from CSV")

# %% ── 1. Load CSV & Build NER Training Data from Plain Text ──────────────────
print("\n[1/5] Loading resumes and building NER training data...")

# Regex patterns to locate entity spans in raw resume text
SKILL_KEYWORDS = [
    "python", "java", "sql", "javascript", r"c\+\+", "react", "node", "django",
    "flask", "fastapi", "tensorflow", "pytorch", "scikit", "pandas", "numpy",
    "spark", "aws", "azure", "gcp", "docker", "kubernetes", "git", "linux",
    "machine learning", "deep learning", "nlp", "data analysis", "tableau",
    "power bi", "excel", "agile", "scrum", "devops", r"ci/cd", "mongodb",
    "postgresql", "redis", "elasticsearch", "typescript", "go", "rust",
]

DEGREE_PATTERNS = [
    r"ph\.?d\.?", r"doctor of", r"m\.?s\.?\b", r"m\.?sc\b", r"mba\b",
    r"m\.?eng\b", r"bachelor[']?s?", r"b\.?s\.?\b", r"b\.?sc\b",
    r"b\.?e\.?\b", r"b\.?tech\b", r"associate[']?s?", r"diploma",
]

CERT_PATTERNS = [
    r"aws certified[^,\n]{0,50}",
    r"google certified[^,\n]{0,50}",
    r"microsoft certified[^,\n]{0,50}",
    r"pmp\b", r"cpa\b", r"cfa\b", r"cissp\b", r"comptia[^,\n]{0,30}",
]

EDU_INST_PATTERNS = [
    r"university of [a-z ]{3,30}",
    r"[a-z ]{3,25} university",
    r"[a-z ]{3,25} college",
    r"[a-z ]{3,25} institute",
    r"iit [a-z]+",
    r"mit\b", r"stanford\b", r"harvard\b", r"oxford\b", r"cambridge\b",
]

EXP_TITLE_PATTERNS = [
    r"(?:senior |lead |principal |junior |staff )?(?:software|ml|data|devops|backend|frontend|full.stack|cloud|ai) engineer",
    r"(?:senior |lead )?(?:data scientist|data analyst|product manager|engineering manager)",
    r"(?:software|ml|data) developer",
    r"(?:director|vp|head) of (?:engineering|data|technology|product)",
    r"(?:machine learning|deep learning|nlp|ai) (?:engineer|researcher|scientist)",
]

COMPANY_PATTERNS = [
    r"(?:google|meta|amazon|microsoft|apple|netflix|uber|airbnb|facebook|linkedin|twitter|openai|deepmind)",
    r"(?:ibm|oracle|salesforce|adobe|intel|nvidia|qualcomm|tcs|infosys|wipro|accenture)",
]

DURATION_PATTERN = r"\b(20\d{2}|19\d{2})\s*[-–]\s*(20\d{2}|19\d{2}|present|current)\b"


def find_spans(text: str, pattern: str, label: str) -> list:
    spans = []
    for m in re.finditer(pattern, text, re.IGNORECASE):
        start, end = m.start(), m.end()
        # Trim leading/trailing whitespace & punctuation from the span
        # (spaCy [E024] fires if a span starts/ends on whitespace)
        while start < end and (text[start].isspace() or text[start] in '.,;:!?()-"\"'):
            start += 1
        while end > start and (text[end - 1].isspace() or text[end - 1] in '.,;:!?()-"\"'):
            end -= 1
        if end > start:
            spans.append((start, end, label))
    return spans


def csv_row_to_ner(text: str) -> tuple:
    """Extract (text, {entities}) NER training pair from raw resume text."""
    entities = []

    # Skills
    for sk in SKILL_KEYWORDS:
        entities += find_spans(text, r"\b" + sk + r"\b", "SKILL")

    # Degrees
    for pat in DEGREE_PATTERNS:
        entities += find_spans(text, pat, "DEGREE")

    # Educational institutions
    for pat in EDU_INST_PATTERNS:
        entities += find_spans(text, pat, "EDUCATION")

    # Certifications
    for pat in CERT_PATTERNS:
        entities += find_spans(text, pat, "CERT")

    # Job titles (experience)
    for pat in EXP_TITLE_PATTERNS:
        entities += find_spans(text, pat, "EXPERIENCE")

    # Companies
    for pat in COMPANY_PATTERNS:
        entities += find_spans(text, pat, "COMPANY")

    # Durations
    entities += find_spans(text, DURATION_PATTERN, "DURATION")

    # Sort and remove overlapping spans (keep first occurrence)
    entities.sort(key=lambda e: e[0])
    clean = []
    prev_end = 0
    for start, end, label in entities:
        if start >= prev_end and end > start:
            clean.append((start, end, label))
            prev_end = end

    return text, {"entities": clean}


print(f"Processing {len(raw_resume_df):,} resumes...")

ner_data = []
skipped  = 0
for _, row in raw_resume_df.iterrows():
    try:
        text = str(row.get("Resume_str", "") or "").strip()
        if not text:
            skipped += 1
            continue
        _, annots = csv_row_to_ner(text)
        if annots["entities"]:
            ner_data.append((text, annots))
        else:
            skipped += 1
    except Exception:
        skipped += 1

print(f"Valid NER examples: {len(ner_data)} | Skipped: {skipped}")

# Label distribution
from collections import Counter
label_dist = Counter(label for _, a in ner_data for _, _, label in a["entities"])
print(f"\nEntity distribution:\n{dict(label_dist.most_common())}")

# Train/val/test split
random.shuffle(ner_data)
n = len(ner_data)
train_data = ner_data[:int(n * 0.75)]
val_data   = ner_data[int(n * 0.75):int(n * 0.875)]
test_data  = ner_data[int(n * 0.875):]
print(f"\nTrain: {len(train_data)} | Val: {len(val_data)} | Test: {len(test_data)}")

# %% ── 2. Build SpaCy Model ───────────────────────────────────────────────────
print("\n[2/5] Initialising SpaCy NER model...")

LABELS = ["SKILL", "EXPERIENCE", "COMPANY", "DEGREE", "EDUCATION", "DURATION", "CERT"]

# Use `exclude` (not `disable`) to completely remove parser + senter from the
# pipeline. `disable` still lets them participate in nlp.update(), which causes
# [E024] because our NER examples carry no dependency/sentence-boundary labels.
try:
    nlp = spacy.load(
        "en_core_web_sm",
        exclude=["parser", "senter", "lemmatizer", "attribute_ruler"],
    )
    print("Base model: en_core_web_sm (parser/senter excluded)")
except OSError:
    nlp = spacy.blank("en")
    print("Base model: blank English")

# Add NER pipe
if "ner" not in nlp.pipe_names:
    ner = nlp.add_pipe("ner", last=True)
else:
    ner = nlp.get_pipe("ner")

for label in LABELS:
    ner.add_label(label)

# %% ── 3. Train ───────────────────────────────────────────────────────────────
print("\n[3/5] Training NER model...")

EPOCHS     = 15
BATCH_SIZE = compounding(4.0, 32.0, 1.001)
DROP_RATE  = 0.3
EVAL_EVERY = 3

# spaCy ≥3 uses nlp.initialize() instead of the removed nlp.begin_training()
def get_examples():
    for text, annots in train_data[:50]:  # small sample for init
        doc = nlp.make_doc(text)
        yield Example.from_dict(doc, annots)

optimizer = nlp.initialize(get_examples)
train_losses = []
val_f1s      = []

def evaluate_ner(nlp, data, labels) -> dict:
    """Compute per-label precision/recall/F1 on validation data."""
    pred_ents, true_ents = [], []
    for text, annots in data[:200]:  # sample for speed
        doc     = nlp(text)
        pred    = {(e.start_char, e.end_char, e.label_) for e in doc.ents}
        gt      = set(map(tuple, annots["entities"]))
        for lbl in labels:
            pred_ents.append(1 if any(p[2]==lbl for p in pred) else 0)
            true_ents.append(1 if any(g[2]==lbl for g in gt)  else 0)
    tp = sum(p==1 and t==1 for p,t in zip(pred_ents,true_ents))
    fp = sum(p==1 and t==0 for p,t in zip(pred_ents,true_ents))
    fn = sum(p==0 and t==1 for p,t in zip(pred_ents,true_ents))
    prec = tp/(tp+fp+1e-9)
    rec  = tp/(tp+fn+1e-9)
    f1   = 2*prec*rec/(prec+rec+1e-9)
    return {"precision": prec, "recall": rec, "f1": f1}

best_f1 = 0
for epoch in range(EPOCHS):
    random.shuffle(train_data)
    losses_ep = {}
    batches = minibatch(train_data, size=BATCH_SIZE)
    for batch in batches:
        examples = []
        for text, annots in batch:
            doc = nlp.make_doc(text)
            try:
                ex = Example.from_dict(doc, annots)
                examples.append(ex)
            except Exception:
                pass
        if examples:
            nlp.update(examples, sgd=optimizer, drop=DROP_RATE, losses=losses_ep)

    loss = losses_ep.get("ner", 0)
    train_losses.append(loss)

    if (epoch + 1) % EVAL_EVERY == 0 or epoch == 0:
        metrics = evaluate_ner(nlp, val_data, LABELS)
        val_f1s.append(metrics["f1"])
        print(f"Epoch {epoch+1:2d}/{EPOCHS}  NER loss={loss:.1f}  "
              f"Val P={metrics['precision']:.3f}  R={metrics['recall']:.3f}  F1={metrics['f1']:.3f}")

        if metrics["f1"] > best_f1:
            best_f1 = metrics["f1"]
            nlp.to_disk(str(SAVE_DIR))
            print(f"  → Best model saved (F1={best_f1:.3f})")

# %% ── 4. Evaluate on Test Set ────────────────────────────────────────────────
print("\n[4/5] Final evaluation on test set...")

best_nlp = spacy.load(str(SAVE_DIR))
test_metrics = evaluate_ner(best_nlp, test_data, LABELS)
print(f"\nTest Precision: {test_metrics['precision']:.4f}")
print(f"Test Recall:    {test_metrics['recall']:.4f}")
print(f"Test F1:        {test_metrics['f1']:.4f}")

# %% ── 5. Demo Inference ──────────────────────────────────────────────────────
print("\n[5/5] Demo inference on sample resume text:")

SAMPLE = """
John Smith | john@email.com | linkedin.com/in/johnsmith

EXPERIENCE
Senior ML Engineer — Google DeepMind (2021 – Present)
  • Led development of production NLP pipelines using PyTorch and HuggingFace Transformers
  • Reduced model inference latency by 35% through ONNX quantization

Software Engineer — Meta (2019 – 2021)
  • Built real-time recommendation systems serving 1B+ users

EDUCATION
M.S. Computer Science — Stanford University (2019)
B.E. Information Technology — IIT Bombay (2017)

SKILLS
Python, PyTorch, TensorFlow, SQL, Kubernetes, Docker, AWS, Spark, NLP, MLOps

CERTIFICATIONS
AWS Certified Solutions Architect — Professional
"""

doc = best_nlp(SAMPLE)
for ent in doc.ents:
    print(f"  [{ent.label_:<12}] {ent.text!r}")

# Save metadata
meta = {
    "labels":        LABELS,
    "train_samples": len(train_data),
    "val_samples":   len(val_data),
    "test_samples":  len(test_data),
    "test_f1":       round(test_metrics["f1"], 4),
    "test_precision":round(test_metrics["precision"], 4),
    "test_recall":   round(test_metrics["recall"], 4),
    "best_val_f1":   round(best_f1, 4),
    "epochs":        EPOCHS,
    "training_date": datetime.now().isoformat(),
}
with open(SAVE_DIR / "ner_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

print(f"\nNER model saved → {SAVE_DIR}")
print("✅ NER Resume Parser Training COMPLETE")
