#!/usr/bin/env python3
"""
Master Training Runner — IntellInterview AI System
Trains all 4 models sequentially with synthetic data.
Generates evaluation plots and saves trained weights.

Usage:
  python run_training.py                    # train all models
  python run_training.py --model confidence # train specific model
  python run_training.py --eval-only        # evaluate with demo data
  python run_training.py --quick            # fast run (5 epochs each)
"""

import sys
import subprocess
import argparse
import time
import json
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

MODELS = ['confidence', 'cheating', 'skill', 'phone']

TRAINING_SCRIPTS = {
    'confidence': ROOT / 'ai_models' / 'confidence' / 'train_confidence.py',
    'cheating':   ROOT / 'ai_models' / 'cheating'   / 'train_cheating.py',
    'skill':      ROOT / 'ai_models' / 'skill'       / 'train_skill.py',
    'phone':      ROOT / 'ai_models' / 'phone'       / 'train_phone_yolov8.py',
}

EVAL_SCRIPTS = {
    'confidence': ROOT / 'ai_models' / 'confidence' / 'evaluate_confidence.py',
    'cheating':   ROOT / 'ai_models' / 'cheating'   / 'evaluate_cheating.py',
    'skill':      ROOT / 'ai_models' / 'skill'       / 'evaluate_skill.py',
    'phone':      ROOT / 'ai_models' / 'phone'       / 'evaluate_phone.py',
}


def run_script(script: Path, extra_args: list = None, timeout: int = 3600) -> bool:
    """Run a Python script and return success status."""
    cmd = [sys.executable, str(script)] + (extra_args or [])
    print(f"\n{'─'*60}")
    print(f"  Running: {' '.join(str(c) for c in cmd)}")
    print(f"{'─'*60}")

    t0 = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=str(ROOT),
            timeout=timeout,
            check=False,
        )
        elapsed = time.time() - t0
        if result.returncode == 0:
            print(f"  ✅ Completed in {elapsed:.1f}s")
            return True
        else:
            print(f"  ❌ Failed (exit={result.returncode}) in {elapsed:.1f}s")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ⏰ Timed out after {timeout}s")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def train_all(args):
    """Train all specified models."""
    models_to_train = [args.model] if args.model else MODELS

    results = {}
    total_start = time.time()

    print(f"\n{'='*60}")
    print(f"  🚀 INTELLINTERVIEW AI TRAINING PIPELINE")
    print(f"  Models: {', '.join(models_to_train)}")
    print(f"  Mode:   {'Quick (5 epochs)' if args.quick else 'Full'}")
    print(f"{'='*60}")

    for model_name in models_to_train:
        if model_name not in TRAINING_SCRIPTS:
            print(f"⚠️  Unknown model: {model_name}")
            continue

        script = TRAINING_SCRIPTS[model_name]
        print(f"\n{'='*60}")
        print(f"  📦 Training Model: {model_name.upper()}")
        print(f"{'='*60}")

        # Build args for each model
        extra = []
        if args.quick:
            if model_name == 'confidence':
                extra = ['--epochs', '5', '--synthetic-samples', '500']
            elif model_name == 'cheating':
                extra = ['--epochs', '5', '--honest-count', '500', '--cheat-per-type', '125']
            elif model_name == 'skill':
                extra = ['--epochs', '3']
            elif model_name == 'phone':
                extra = []  # phone doesn't train without data

        if model_name == 'phone':
            # Phone requires explicit --train flag
            print(f"  ℹ️  Phone detection: pretrained yolov8n.pt will be used.")
            print(f"  ℹ️  For fine-tuning: python ai_models/phone/train_phone_yolov8.py --train")
            results[model_name] = 'skipped (pretrained)'
            continue

        success = run_script(script, extra_args=extra)
        results[model_name] = 'success' if success else 'failed'

    # ── Evaluation ─────────────────────────────────────────────────────────────
    if not args.train_only:
        print(f"\n{'='*60}")
        print(f"  📊 EVALUATION PHASE")
        print(f"{'='*60}")
        for model_name in models_to_train:
            if model_name not in EVAL_SCRIPTS:
                continue
            script = EVAL_SCRIPTS[model_name]
            run_script(script, extra_args=['--demo'])

    # ── Summary ────────────────────────────────────────────────────────────────
    total_elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"  🏁 TRAINING COMPLETE")
    print(f"  Total time: {total_elapsed/60:.1f} minutes")
    print(f"{'='*60}")
    for name, status in results.items():
        icon = '✅' if status == 'success' else ('⏩' if status == 'skipped' else '❌')
        print(f"  {icon} {name:15s} {status}")

    # Save summary
    summary_path = ROOT / 'ai_models' / 'training_summary.json'
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_path, 'w') as f:
        json.dump({'results': results, 'total_time_minutes': total_elapsed/60}, f, indent=2)
    print(f"\n💾 Summary saved → {summary_path}")

    print(f"\n🚀 To start the API server:")
    print(f"   python inference/api.py")
    print(f"   → http://localhost:5001/docs")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train all AI models for IntellInterview')
    parser.add_argument('--model',      type=str, default=None,
                        choices=MODELS, help='Train only this model')
    parser.add_argument('--quick',      action='store_true',
                        help='Quick mode: 5 epochs, 500 samples (for testing)')
    parser.add_argument('--eval-only',  action='store_true',
                        help='Run evaluation only (no training)')
    parser.add_argument('--train-only', action='store_true',
                        help='Skip evaluation after training')
    args = parser.parse_args()

    if args.eval_only:
        # Just run all eval scripts with demo mode
        for name, script in EVAL_SCRIPTS.items():
            run_script(script, extra_args=['--demo'])
    else:
        train_all(args)
