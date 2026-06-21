"""
==============================================================================
 NOTEBOOK 2: Semantic Similarity Fine-Tuning (Sentence-BERT)
 Datasets:  mteb/stsbenchmark-sts  (HuggingFace)
            LinkedIn Job Postings / jobs / job_skills.csv  (domain pairs)
 Output:    ai_engine/models/saved/semantic_model/
            ↳ used by  ai_engine/nlp/semantic_matcher.py  at runtime
==============================================================================

HOW IT CONNECTS TO THE PROJECT
────────────────────────────────
  Training (here)  →  saves fine-tuned model to  ai_engine/models/saved/semantic_model/
  Runtime engine   →  ai_engine/nlp/semantic_matcher.py  loads the saved model
  API service      →  backend/services/ats_service.py   calls semantic_matcher
  Worker task      →  backend/workers/ats_worker.py      invokes ats_service
  Frontend         →  ExplainabilityPanel, SkillGapChart consume the scores
"""

# %% [markdown]
# # CAPVIA — Semantic Skill Matching Model (Fine-Tuned Sentence-BERT)
# Fine-tunes `all-MiniLM-L6-v2` on:
#   1. STS Benchmark (general sentence similarity)
#   2. LinkedIn job-skill co-occurrence pairs (domain adaptation)
#   3. Handcrafted resume↔JD phrase pairs (task-specific)
#
# The resulting embeddings power resume-to-JD similarity scoring,
# semantic skill gap analysis, and the heatmap token scores.

# %% ── Imports ────────────────────────────────────────────────────────────────
import os
import json
import random
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

import torch
from datasets import load_dataset, Dataset as HFDataset
from sentence_transformers import SentenceTransformer, InputExample, util
from sentence_transformers.sentence_transformer.losses import CosineSimilarityLoss
from sentence_transformers.sentence_transformer.evaluation import EmbeddingSimilarityEvaluator
from sentence_transformers import SentenceTransformerTrainer, SentenceTransformerTrainingArguments
from sentence_transformers.sentence_transformer.training_args import BatchSamplers

import warnings
warnings.filterwarnings("ignore")

# ── Reproducibility ───────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {DEVICE}")
if DEVICE == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")

# ── Paths (relative to project root) ─────────────────────────────────────────
BASE_DIR     = Path(__file__).resolve().parent.parent.parent   # Resume ATS Capvia/
LINKEDIN_DIR = BASE_DIR / "LinkedIn Job Postings (2023 - 2024)"
SAVE_DIR     = BASE_DIR / "ai_engine" / "models" / "saved" / "semantic_model"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

print(f"Project root : {BASE_DIR}")
print(f"LinkedIn data: {LINKEDIN_DIR}")
print(f"Model output : {SAVE_DIR}")

# %% ── 1. Load STS Benchmark from HuggingFace ─────────────────────────────────
print("\n[1/5] Loading mteb/stsbenchmark-sts from HuggingFace Hub...")

ds = load_dataset("mteb/stsbenchmark-sts")
print(f"Splits  : {list(ds.keys())}")
print(f"Train   : {len(ds['train']):,}")
print(f"Val     : {len(ds['validation']):,}")
print(f"Test    : {len(ds['test']):,}")
print(f"Columns : {ds['train'].column_names}")
print(f"Example : {dict(ds['train'][0])}")

# Convert to SentenceTransformers InputExample list
# STS scores are 0-5 → normalise to 0-1
def hf_to_examples(split, s1="sentence1", s2="sentence2", score="score") -> list:
    return [
        InputExample(texts=[row[s1], row[s2]], label=float(row[score]) / 5.0)
        for row in split
    ]

train_sts = hf_to_examples(ds["train"])
val_sts   = hf_to_examples(ds["validation"])
test_sts  = hf_to_examples(ds["test"])

print(f"\nSTS InputExamples — Train:{len(train_sts):,} | Val:{len(val_sts):,} | Test:{len(test_sts):,}")
print(f"Sample → '{train_sts[0].texts[0]}' ↔ '{train_sts[0].texts[1]}' = {train_sts[0].label:.3f}")

# %% ── 2. LinkedIn Domain Adaptation Pairs ───────────────────────────────────
print("\n[2/5] Building LinkedIn job-skill domain pairs...")

skills_df = pd.read_csv(LINKEDIN_DIR / "jobs" / "job_skills.csv")
print(f"LinkedIn skills CSV: {skills_df.shape}")
print(skills_df.head(3))

# Find the job-id and skill columns
id_col = next((c for c in skills_df.columns if "job" in c.lower()), skills_df.columns[0])
sk_col = next((c for c in skills_df.columns if "skill" in c.lower()), skills_df.columns[-1])
print(f"Using columns → job_id: '{id_col}', skill: '{sk_col}'")

# Co-occurring skills (same posting) → high similarity
linkedin_pairs = []
skill_groups = (
    skills_df.groupby(id_col)[sk_col]
    .apply(list)
    .sample(min(8000, skills_df[id_col].nunique()), random_state=42)
)
for skills_in_job in skill_groups:
    if len(skills_in_job) >= 2:
        s1, s2 = random.sample(skills_in_job, 2)
        linkedin_pairs.append(InputExample(texts=[str(s1), str(s2)], label=0.72))

print(f"LinkedIn co-occurrence pairs: {len(linkedin_pairs):,}")

# %% ── 3. Handcrafted Resume↔JD Phrase Pairs ──────────────────────────────────
print("\n[3/5] Building handcrafted resume↔JD task-specific pairs...")

# (sentence_1, sentence_2, similarity_0_to_1)
HANDCRAFTED = [
    # HIGH similarity — same skill, different phrasing
    ("Python programming",                       "Python development",                        0.95),
    ("Machine learning engineer",                "ML engineer",                               0.92),
    ("Natural language processing",              "NLP",                                       0.92),
    ("Deep learning with neural networks",       "Deep neural network models",                0.88),
    ("Large language model fine-tuning",         "Fine-tuning LLMs",                         0.90),
    ("AWS cloud infrastructure",                 "Amazon Web Services",                       0.94),
    ("Google Cloud Platform",                    "GCP cloud engineering",                     0.92),
    ("PostgreSQL database management",           "Postgres SQL expertise",                    0.88),
    ("Continuous integration / continuous delivery", "CI/CD pipelines",                       0.90),
    ("Docker containerisation",                  "Container-based deployment",                0.83),
    ("Kubernetes orchestration",                 "K8s cluster management",                    0.87),
    ("RESTful API design",                       "REST API development",                      0.89),
    ("Data visualisation with Tableau",          "Business intelligence dashboards",          0.72),
    ("Apache Spark distributed computing",       "Spark data processing at scale",            0.85),
    ("Statistical modelling and A/B testing",    "Experimentation and hypothesis testing",    0.78),
    # MEDIUM similarity — related but different roles
    ("Data scientist",                           "Machine learning engineer",                 0.65),
    ("Backend engineer",                         "API developer",                             0.68),
    ("DevOps engineer",                          "Site reliability engineer",                 0.70),
    ("Product manager",                          "Technical program manager",                 0.60),
    ("Data analyst",                             "Business intelligence analyst",             0.67),
    # Resume achievement phrases → JD requirement phrases
    ("Built recommendation system using collaborative filtering serving 10M users",
     "Experience with recommendation systems at scale",                                       0.75),
    ("Reduced API latency by 40% through Redis caching and query optimisation",
     "Performance optimisation and caching expertise",                                        0.77),
    ("Led a team of 6 engineers to deliver ML pipeline on time and under budget",
     "Engineering leadership and cross-functional collaboration",                             0.74),
    ("Deployed containerised microservices on AWS EKS with Terraform",
     "Cloud infrastructure and Kubernetes experience",                                        0.80),
    ("Fine-tuned BERT model on domain-specific NER task achieving 94% F1",
     "NLP model fine-tuning and evaluation",                                                  0.82),
    ("Designed FastAPI backend with async endpoints and OpenAPI documentation",
     "FastAPI or similar Python web framework experience",                                    0.86),
    ("Implemented RAG pipeline with LangChain and Pinecone vector store",
     "Retrieval-augmented generation (RAG) systems",                                          0.88),
    # LOW similarity — clearly unrelated
    ("Python developer with 5 years experience",    "Marketing and social media management", 0.05),
    ("Machine learning and AI research",             "Financial accounting and tax filing",  0.04),
    ("Cloud architecture AWS Azure",                 "Food and beverage management",         0.03),
    ("Full-stack React and Node.js developer",       "Civil engineering construction",       0.05),
    ("Data pipeline with Spark and Kafka",           "Human resources and recruitment",      0.06),
    ("NLP research and transformer models",          "Graphic design and illustration",      0.04),
    # Skill vs non-skill
    ("5 years Python",                           "Entry level position no experience needed", 0.10),
    ("PhD Computer Science Stanford",            "High school diploma required",              0.15),
]

domain_examples = []
for s1, s2, score in HANDCRAFTED:
    domain_examples.append(InputExample(texts=[s1, s2], label=score))
    domain_examples.append(InputExample(texts=[s2, s1], label=score))   # symmetric

print(f"Handcrafted pairs (with augmentation): {len(domain_examples):,}")

# ── Combined training set ─────────────────────────────────────────────────────
combined_train = train_sts + linkedin_pairs[:3000] + domain_examples
random.shuffle(combined_train)
print(f"\nTotal combined training examples: {len(combined_train):,}")
print(f"  STS train:              {len(train_sts):,}")
print(f"  LinkedIn domain pairs:  {min(3000, len(linkedin_pairs)):,}")
print(f"  Handcrafted task pairs: {len(domain_examples):,}")

# %% ── 4. Load Base Model & Baseline Evaluation ───────────────────────────────
print("\n[4/5] Loading Sentence-BERT base model and measuring baseline...")

MODEL_NAME = "all-MiniLM-L6-v2"   # 22M params — fast, strong, well-calibrated
model = SentenceTransformer(MODEL_NAME, device=DEVICE)
print(f"Loaded  : {MODEL_NAME}")
print(f"Emb dim : {model.get_sentence_embedding_dimension()}")

# Baseline Pearson on STS test (before any fine-tuning)
baseline_evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
    test_sts, name="sts-test-BEFORE"
)
_baseline_raw = model.evaluate(baseline_evaluator)
# sentence-transformers ≥3.x returns a dict; extract the Pearson float
if isinstance(_baseline_raw, dict):
    baseline_score = float(
        _baseline_raw.get("pearson_cosine") or
        _baseline_raw.get("cosine_pearson") or
        next(iter(_baseline_raw.values()))
    )
else:
    baseline_score = float(_baseline_raw)
print(f"\nBaseline Pearson on STS test: {baseline_score:.4f}")

# %% ── 5. Fine-Tune (sentence-transformers ≥3 Trainer API) ──────────────────
print("\n[5/5] Fine-tuning...")

BATCH_SIZE  = 32
EPOCHS      = 4          # 4 epochs sufficient for MiniLM
WARMUP_RATE = 0.1

# Build HuggingFace Dataset from InputExamples (new API expects this format)
def examples_to_hf_dataset(examples: list) -> HFDataset:
    return HFDataset.from_dict({
        "sentence1": [e.texts[0] for e in examples],
        "sentence2": [e.texts[1] for e in examples],
        "score":     [float(e.label) for e in examples],
    })

train_dataset = examples_to_hf_dataset(combined_train)
val_dataset   = examples_to_hf_dataset(val_sts)

train_loss = CosineSimilarityLoss(model)

val_evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
    val_sts, name="sts-val"
)

# Estimate steps for logging
steps_per_epoch = len(combined_train) // BATCH_SIZE
total_steps     = steps_per_epoch * EPOCHS
warmup_steps    = int(total_steps * WARMUP_RATE)
eval_steps      = max(100, total_steps // 20)
print(f"Steps: {total_steps:,}  |  Warmup: {warmup_steps}  |  Batch: {BATCH_SIZE}  |  Epochs: {EPOCHS}")

training_args = SentenceTransformerTrainingArguments(
    output_dir=str(SAVE_DIR),
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    warmup_steps=warmup_steps,
    eval_strategy="steps",       # still log val metrics every eval_steps
    eval_steps=eval_steps,
    save_strategy="no",          # ← disable mid-training checkpoints (saves disk space)
    logging_steps=50,
    report_to="none",
    batch_sampler=BatchSamplers.NO_DUPLICATES,
)

trainer = SentenceTransformerTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    loss=train_loss,
    evaluator=val_evaluator,
)
trainer.train()

# ── Save final model once (no intermediate checkpoints written) ───────────────
print(f"\nSaving fine-tuned model → {SAVE_DIR}")
model.save_pretrained(str(SAVE_DIR))

# ── Final evaluation on held-out test set ────────────────────────────────────
best_model = SentenceTransformer(str(SAVE_DIR), device=DEVICE)
test_evaluator = EmbeddingSimilarityEvaluator.from_input_examples(
    test_sts, name="sts-test-AFTER"
)
_finetuned_raw = best_model.evaluate(test_evaluator)
if isinstance(_finetuned_raw, dict):
    finetuned_score = float(
        _finetuned_raw.get("pearson_cosine") or
        _finetuned_raw.get("cosine_pearson") or
        next(iter(_finetuned_raw.values()))
    )
else:
    finetuned_score = float(_finetuned_raw)

print(f"\n{'─'*60}")
print(f"  Baseline Pearson (before): {baseline_score:.4f}")
print(f"  Fine-tuned Pearson (after):{finetuned_score:.4f}")
print(f"  Improvement:               {finetuned_score - baseline_score:+.4f}")
print(f"{'─'*60}")

# ── Qualitative tests ─────────────────────────────────────────────────────────
print("\nQualitative similarity checks:")
TEST_PAIRS = [
    ("Python developer 5 years",      "Python programming required"),
    ("Machine learning engineer",      "Data scientist"),
    ("Led engineering team of 6",      "Team leadership experience"),
    ("AWS cloud architect",            "Marketing manager"),
    ("Deep learning TensorFlow",       "Neural networks PyTorch"),
    ("SQL expert PostgreSQL",          "Microsoft Excel proficient"),
    ("LLM fine-tuning with PEFT",      "Large language model experience"),
    ("Deployed Kubernetes on GCP",     "Cloud infrastructure Kubernetes"),
]
for s1, s2 in TEST_PAIRS:
    e1 = best_model.encode(s1, convert_to_tensor=True)
    e2 = best_model.encode(s2, convert_to_tensor=True)
    sim = util.cos_sim(e1, e2).item()
    bar = "█" * int(sim * 20) + "░" * (20 - int(sim * 20))
    print(f"  {sim:.3f} |{bar}| '{s1[:40]}' ↔ '{s2[:40]}'")

# ── Save metadata for the runtime loader ─────────────────────────────────────
meta = {
    "base_model":          MODEL_NAME,
    "embedding_dim":       best_model.get_sentence_embedding_dimension(),
    "baseline_pearson":    round(baseline_score, 4),
    "finetuned_pearson":   round(finetuned_score, 4),
    "improvement":         round(finetuned_score - baseline_score, 4),
    "sts_train_examples":  len(train_sts),
    "linkedin_pairs":      min(3000, len(linkedin_pairs)),
    "handcrafted_pairs":   len(domain_examples),
    "total_train":         len(combined_train),
    "batch_size":          BATCH_SIZE,
    "epochs":              EPOCHS,
    "device":              DEVICE,
    "training_date":       datetime.now().isoformat(),
    # Path the runtime loader should use:
    "model_path":          "ai_engine/models/saved/semantic_model",
}
with open(SAVE_DIR / "model_meta.json", "w") as f:
    json.dump(meta, f, indent=2)
print(f"\nMetadata written → {SAVE_DIR / 'model_meta.json'}")

# ── Plot training curve if logs available ─────────────────────────────────────
log_path = SAVE_DIR / "eval" / "sts-val_results.csv"
if log_path.exists():
    log_df = pd.read_csv(log_path)
    plt.figure(figsize=(8, 4))
    plt.plot(log_df.index, log_df.iloc[:, -1], color="#4F46E5", linewidth=2)
    plt.axhline(baseline_score, color="#F43F5E", linestyle="--", label=f"Baseline ({baseline_score:.4f})")
    plt.xlabel("Evaluation Step")
    plt.ylabel("Pearson Correlation")
    plt.title("STS Validation Score During Fine-Tuning")
    plt.legend()
    plt.tight_layout()
    plot_path = SAVE_DIR / "training_curve.png"
    plt.savefig(plot_path, dpi=150)
    print(f"Training curve → {plot_path}")

print(f"\nFine-tuned model saved → {SAVE_DIR}")
print("✅  Semantic Similarity Fine-Tuning COMPLETE")
print("\nRuntime integration:")
print("  ai_engine/nlp/semantic_matcher.py  → loads this model at startup")
print("  backend/services/ats_service.py    → calls semantic_matcher.compute_similarity()")
print("  backend/workers/ats_worker.py      → invoked per resume upload")
