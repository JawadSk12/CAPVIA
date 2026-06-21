"""
Skill Evaluation Model Evaluation Script
Metrics: MSE, RMSE, Pearson r, score distribution, scatter plot

Usage:
  python evaluate_skill.py --data-dir data/skill_processed
  python evaluate_skill.py --demo
"""

import sys
import json
import argparse
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


def evaluate(args):
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.demo:
        # Synthetic demo — simulated predicted vs actual scores
        rng      = np.random.default_rng(42)
        actual   = rng.uniform(0, 10, 300)
        noise    = rng.normal(0, 1.2, 300)
        predicted = np.clip(actual + noise, 0, 10)
    else:
        # Load test data and run inference
        from ai_models.skill.skill_model import SkillEvaluator, load_skill_dataset
        import json

        evaluator = SkillEvaluator()
        data_dir  = Path(args.data_dir)
        test_path = data_dir / 'test.json'
        if not test_path.exists():
            print(f"⚠️  No test data at {test_path}. Using demo mode.")
            args.demo = True
            return evaluate(args)

        with open(test_path) as f:
            test_samples = json.load(f)

        actual, predicted = [], []
        for s in test_samples:
            result = evaluator.evaluate(
                question  = s.get('question',  ''),
                candidate = s.get('candidate', ''),
                reference = s.get('reference', ''),
            )
            actual.append(float(s['score']))
            predicted.append(float(result['score']))

        actual    = np.array(actual)
        predicted = np.array(predicted)

    # ── Metrics ───────────────────────────────────────────────────────────────
    mse  = float(np.mean((actual - predicted)**2))
    rmse = float(np.sqrt(mse))
    mae  = float(np.mean(np.abs(actual - predicted)))

    try:
        from scipy import stats
        r, p_val = stats.pearsonr(actual, predicted)
    except ImportError:
        # Manual Pearson
        r = float(np.corrcoef(actual, predicted)[0, 1])
        p_val = float('nan')

    print(f"\n{'='*55}")
    print(f"  SKILL EVALUATOR — EVALUATION RESULTS")
    print(f"{'='*55}")
    print(f"  MSE:         {mse:.4f}")
    print(f"  RMSE:        {rmse:.4f}  (out of 10)")
    print(f"  MAE:         {mae:.4f}")
    print(f"  Pearson r:   {r:.4f}  (p={p_val:.4f})")
    print(f"  Samples:     {len(actual)}")
    print(f"{'='*55}")

    # ── Plots ─────────────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(16, 10), facecolor='#1a1a2e')
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.4, wspace=0.35)
    tc  = '#e0e0e0'

    # 1. Scatter: actual vs predicted
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.scatter(actual, predicted, alpha=0.5, color='#64B5F6', s=20, edgecolors='none')
    ax1.plot([0, 10], [0, 10], 'w--', lw=1.5, label='Perfect')
    ax1.set_xlabel('Actual Score',    color=tc)
    ax1.set_ylabel('Predicted Score', color=tc)
    ax1.set_title(f'Actual vs. Predicted\n(Pearson r = {r:.4f})',
                  color='#64B5F6', fontsize=13, fontweight='bold')
    ax1.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=tc)
    ax1.set_facecolor('#0d0d1a'); ax1.tick_params(colors=tc)
    ax1.set_xlim(0, 10); ax1.set_ylim(0, 10)

    # 2. Error distribution
    ax2  = fig.add_subplot(gs[0, 1])
    errs = predicted - actual
    ax2.hist(errs, bins=40, color='#FF8A65', edgecolor='white', alpha=0.8)
    ax2.axvline(x=0, color='white', linestyle='--', lw=1.5)
    ax2.set_xlabel('Prediction Error (predicted - actual)', color=tc)
    ax2.set_ylabel('Count',   color=tc)
    ax2.set_title(f'Error Distribution\n(RMSE = {rmse:.4f})',
                  color='#64B5F6', fontsize=13, fontweight='bold')
    ax2.set_facecolor('#0d0d1a'); ax2.tick_params(colors=tc)
    ax2.text(0.65, 0.85, f"σ = {errs.std():.3f}\nμ = {errs.mean():.3f}",
             transform=ax2.transAxes, color=tc, fontsize=10)

    # 3. Score distributions side-by-side
    ax3 = fig.add_subplot(gs[1, 0])
    bins = np.linspace(0, 10, 25)
    ax3.hist(actual,    bins=bins, color='#4CAF50', alpha=0.7, label='Actual',    density=True)
    ax3.hist(predicted, bins=bins, color='#64B5F6', alpha=0.7, label='Predicted', density=True)
    ax3.set_xlabel('Score (0-10)', color=tc)
    ax3.set_ylabel('Density',      color=tc)
    ax3.set_title('Score Distributions', color='#64B5F6', fontsize=13, fontweight='bold')
    ax3.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=tc)
    ax3.set_facecolor('#0d0d1a'); ax3.tick_params(colors=tc)

    # 4. Metrics summary
    ax4 = fig.add_subplot(gs[1, 1])
    ax4.axis('off')
    ax4.set_facecolor('#0d0d1a')
    summary_text = (
        f"  SKILL EVALUATOR METRICS\n\n"
        f"  MSE:           {mse:.4f}\n"
        f"  RMSE:          {rmse:.4f}\n"
        f"  MAE:           {mae:.4f}\n"
        f"  Pearson r:     {r:.4f}\n\n"
        f"  Samples:       {len(actual)}\n"
        f"  Actual mean:   {actual.mean():.2f}\n"
        f"  Pred mean:     {predicted.mean():.2f}\n\n"
        f"  Target: Pearson r ≥ 0.80"
    )
    ax4.text(0.1, 0.5, summary_text, transform=ax4.transAxes,
             fontsize=12, color=tc, verticalalignment='center',
             fontfamily='monospace',
             bbox=dict(boxstyle='round', facecolor='#0d0d1a', edgecolor='#64B5F6', alpha=0.8))

    fig.patch.set_facecolor('#1a1a2e')
    fig.suptitle('Skill Knowledge Evaluator — Evaluation Report',
                 color='#90CAF9', fontsize=15, fontweight='bold')
    out_path = out_dir / 'skill_evaluation.png'
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"📊 Evaluation plot saved → {out_path}")

    summary = {'mse': mse, 'rmse': rmse, 'mae': mae, 'pearson_r': float(r)}
    with open(out_dir / 'skill_eval_results.json', 'w') as f:
        json.dump(summary, f, indent=2)

    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=str, default='data/skill_processed')
    parser.add_argument('--out-dir',  type=str, default='ai_models/skill/weights')
    parser.add_argument('--demo',     action='store_true')
    args = parser.parse_args()

    evaluate(args)
