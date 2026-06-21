"""
Cheating Risk Model Evaluation Script
Metrics: Binary accuracy, Precision, Recall, F1, ROC-AUC, Calibration

Usage:
  python evaluate_cheating.py --model-path ai_models/cheating/weights/cheating_lstm.pth
  python evaluate_cheating.py --demo
"""

import sys
import argparse
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

CLASS_NAMES = ['Honest', 'Cheating']
COLORS      = ['#4CAF50', '#F44336']


def plot_evaluation(probs, preds, labels, out_dir: Path):
    """4-panel evaluation figure for binary cheating classification."""
    fig = plt.figure(figsize=(16, 12), facecolor='#1a1a2e')
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.4, wspace=0.35)
    tc  = '#e0e0e0'

    # ── 1. ROC Curve ──────────────────────────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    fpr, tpr, thresholds = roc_curve(labels, probs)
    auc_score = roc_auc_score(labels, probs)
    ax1.plot(fpr, tpr, color='#64B5F6', lw=2, label=f'ROC (AUC = {auc_score:.4f})')
    ax1.fill_between(fpr, tpr, alpha=0.15, color='#64B5F6')
    ax1.plot([0, 1], [0, 1], 'w--', lw=1)
    ax1.set_xlabel('False Positive Rate', color=tc)
    ax1.set_ylabel('True Positive Rate',  color=tc)
    ax1.set_title('ROC Curve', color='#64B5F6', fontweight='bold', fontsize=13)
    ax1.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=tc)
    ax1.set_facecolor('#0d0d1a')
    ax1.tick_params(colors=tc)

    # ── 2. Confusion Matrix ───────────────────────────────────────────────────
    ax2 = fig.add_subplot(gs[0, 1])
    cm  = confusion_matrix(labels, preds)
    im  = ax2.imshow(cm, cmap='RdYlGn', vmin=0)
    ax2.set_xticks([0, 1]); ax2.set_yticks([0, 1])
    ax2.set_xticklabels(CLASS_NAMES, color=tc)
    ax2.set_yticklabels(CLASS_NAMES, color=tc)
    ax2.set_xlabel('Predicted', color=tc); ax2.set_ylabel('Actual', color=tc)
    ax2.set_title('Confusion Matrix', color='#64B5F6', fontweight='bold', fontsize=13)
    for i in range(2):
        for j in range(2):
            ax2.text(j, i, str(cm[i, j]), ha='center', va='center',
                     color='black', fontsize=16, fontweight='bold')
    plt.colorbar(im, ax=ax2)
    ax2.set_facecolor('#0d0d1a')

    # ── 3. Precision-Recall vs Threshold ─────────────────────────────────────
    ax3 = fig.add_subplot(gs[1, 0])
    from sklearn.metrics import precision_recall_curve
    prec, rec, thresh = precision_recall_curve(labels, probs)
    ax3.plot(thresh, prec[:-1], color='#4CAF50', lw=2, label='Precision')
    ax3.plot(thresh, rec[:-1],  color='#F44336', lw=2, label='Recall')
    ax3.axvline(x=0.5, color='white', linestyle='--', lw=1, alpha=0.5, label='Default threshold')
    ax3.set_xlabel('Threshold', color=tc)
    ax3.set_ylabel('Score',     color=tc)
    ax3.set_title('Precision & Recall vs Threshold', color='#64B5F6', fontweight='bold', fontsize=12)
    ax3.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=tc)
    ax3.set_facecolor('#0d0d1a')
    ax3.set_xlim(0, 1); ax3.set_ylim(0, 1)

    # ── 4. Score Distribution ─────────────────────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 1])
    for lbl, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        mask = np.array(labels) == lbl
        ax4.hist(np.array(probs)[mask], bins=40, color=color,
                 alpha=0.7, label=name, density=True)
    ax4.axvline(x=0.5, color='white', linestyle='--', lw=1, alpha=0.7)
    ax4.set_xlabel('Cheating Probability', color=tc)
    ax4.set_ylabel('Density',   color=tc)
    ax4.set_title('Score Distribution by True Class', color='#64B5F6', fontweight='bold', fontsize=12)
    ax4.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=tc)
    ax4.set_facecolor('#0d0d1a')

    fig.patch.set_facecolor('#1a1a2e')
    fig.suptitle('Cheating Risk LSTM — Evaluation Report',
                 color='#90CAF9', fontsize=15, fontweight='bold')
    out_path = out_dir / 'cheating_evaluation.png'
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"📊 Evaluation plot saved → {out_path}")


def evaluate(args):
    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')

    if args.demo:
        # Synthetic demo predictions
        rng    = np.random.default_rng(42)
        labels = rng.integers(0, 2, size=1000)
        probs  = np.clip(labels + rng.normal(0, 0.2, size=1000), 0, 1)
        preds  = (probs > 0.5).astype(int)
    else:
        from ai_models.cheating.cheating_lstm import CheatingLSTM
        from ai_models.cheating.train_cheating import TemporalCheatingDataset

        model = CheatingLSTM().to(device)
        model.load_state_dict(torch.load(args.model_path, map_location=device))
        model.eval()

        test_ds     = TemporalCheatingDataset(args.data_dir, 'test')
        test_loader = torch.utils.data.DataLoader(test_ds, batch_size=128, shuffle=False)

        all_probs, all_labels = [], []
        with torch.no_grad():
            for X, y in test_loader:
                X = X.to(device)
                logits = model(X)
                p      = torch.sigmoid(logits).squeeze(1).cpu().tolist()
                all_probs.extend(p)
                all_labels.extend(y.tolist())

        probs  = np.array(all_probs)
        labels = np.array(all_labels)
        preds  = (probs > 0.5).astype(int)

    # ── Metrics ───────────────────────────────────────────────────────────────
    acc       = accuracy_score(labels, preds)
    precision = precision_score(labels, preds, zero_division=0)
    recall    = recall_score(labels, preds, zero_division=0)
    f1        = f1_score(labels, preds, zero_division=0)
    try:
        auc = roc_auc_score(labels, probs)
    except Exception:
        auc = float('nan')

    print(f"\n{'='*60}")
    print(f"  CHEATING RISK LSTM EVALUATION RESULTS")
    print(f"{'='*60}")
    print(f"  Accuracy:    {acc:.4f}  ({acc*100:.2f}%)")
    print(f"  Precision:   {precision:.4f}")
    print(f"  Recall:      {recall:.4f}")
    print(f"  F1-Score:    {f1:.4f}")
    print(f"  ROC-AUC:     {auc:.4f}")
    print(f"{'='*60}")
    print(f"\nClassification Report:")
    print(classification_report(labels, preds, target_names=CLASS_NAMES))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    plot_evaluation(probs.tolist(), preds.tolist(), labels.tolist(), out_dir)

    return {'accuracy': acc, 'f1': f1, 'roc_auc': auc}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', type=str, default='ai_models/cheating/weights/cheating_lstm.pth')
    parser.add_argument('--data-dir',   type=str, default='data/cheating_processed')
    parser.add_argument('--out-dir',    type=str, default='ai_models/cheating/weights')
    parser.add_argument('--demo',       action='store_true')
    args = parser.parse_args()

    evaluate(args)
