#!/usr/bin/env bash
# ==============================================================================
#  CAPVIA — Run All ML Training Notebooks
#  Usage: bash run_all_training.sh
#  Run from: Resume ATS Capvia/ai_engine/notebooks/
# ==============================================================================
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "Project root: $ROOT"

# Create virtual env (first run only)
if [ ! -d "$ROOT/ai_engine/venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$ROOT/ai_engine/venv"
fi
source "$ROOT/ai_engine/venv/bin/activate"

# Install dependencies
pip install -q --upgrade pip
pip install -q -r "$ROOT/ai_engine/notebooks/requirements_training.txt"

# Download SpaCy model if missing
python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null || \
  python -m spacy download en_core_web_sm

echo ""
echo "======================================================================"
echo " [1/4] ATS Scoring Model"
echo "======================================================================"
python "$ROOT/ai_engine/notebooks/01_ats_scoring_model.py"

echo ""
echo "======================================================================"
echo " [2/4] Semantic Similarity Fine-Tuning"
echo "======================================================================"
python "$ROOT/ai_engine/notebooks/02_semantic_similarity_finetuning.py"

echo ""
echo "======================================================================"
echo " [3/4] NER Resume Parser"
echo "======================================================================"
python "$ROOT/ai_engine/notebooks/03_ner_resume_parser.py"

echo ""
echo "======================================================================"
echo " [4/4] Fraud Detection Model"
echo "======================================================================"
python "$ROOT/ai_engine/notebooks/04_fraud_detection_model.py"

echo ""
echo "✅ ALL TRAINING COMPLETE — Models saved to ai_engine/models/saved/"
