"""
Confidence Model Evaluation Script
Generates: accuracy, F1-score, ROC-AUC, confusion matrix, calibration plot

Usage:
  python evaluate_confidence.py --model-path ai_models/confidence/weights/confidence_model.pth
  python evaluate_confidence.py --demo   # Quick synthetic demo without saved model
"""

import sys
import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, confusion_matrix, classification_report
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


CLASS_NAMES = ['confident', 'nervous', 'neutral']
COLORS = ['#4CAF50', '#F44336', '#2196F3']


def load_test_data(data_dir: str, batch_size: int = 64, image_size: int = 224):
    from ai_models.confidence.train_confidence import FaceDataset
    test_ds = FaceDataset(data_dir, 'test', augment=False, image_size=image_size)
    return DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)


@torch.no_grad()
def get_predictions(model, loader, device):
    model.eval()
    all_probs, all_preds, all_labels = [], [], []

    for images, labels in loader:
        images = images.to(device)
        logits = model(images)
        probs  = F.softmax(logits, dim=1)
        preds  = logits.argmax(dim=1)

        all_probs.extend(probs.cpu().numpy())
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.numpy())

    return np.array(all_probs), np.array(all_preds), np.array(all_labels)


def plot_results(probs, preds, labels, out_dir: Path):
    """Generate 4-panel evaluation figure."""
    fig = plt.figure(figsize=(16, 12), facecolor='#1a1a2e')
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.4, wspace=0.35)

    text_color = '#e0e0e0'
    plt.rcParams.update({'text.color': text_color, 'axes.labelcolor': text_color,
                         'xtick.color': text_color, 'ytick.color': text_color})

    # ── 1. Confusion Matrix ──────────────────────────────────────────────────
    ax1 = fig.add_subplot(gs[0, 0])
    cm  = confusion_matrix(labels, preds)
    im  = ax1.imshow(cm, cmap='Blues')
    ax1.set_xticks(range(len(CLASS_NAMES)))
    ax1.set_yticks(range(len(CLASS_NAMES)))
    ax1.set_xticklabels(CLASS_NAMES, color=text_color, fontsize=9)
    ax1.set_yticklabels(CLASS_NAMES, color=text_color, fontsize=9)
    ax1.set_xlabel('Predicted', color=text_color)
    ax1.set_ylabel('Actual',    color=text_color)
    ax1.set_title('Confusion Matrix', color='#64B5F6', fontsize=13, fontweight='bold')
    for i in range(len(CLASS_NAMES)):
        for j in range(len(CLASS_NAMES)):
            ax1.text(j, i, str(cm[i, j]), ha='center', va='center',
                     color='white' if cm[i, j] > cm.max() / 2 else 'black', fontsize=11)
    ax1.set_facecolor('#0d0d1a')
    plt.colorbar(im, ax=ax1)

    # ── 2. Per-Class F1 Scores ───────────────────────────────────────────────
    ax2   = fig.add_subplot(gs[0, 1])
    f1s   = f1_score(labels, preds, average=None)
    bars  = ax2.bar(CLASS_NAMES, f1s, color=COLORS, width=0.5, edgecolor='white')
    ax2.set_ylim(0, 1.0)
    ax2.set_ylabel('F1 Score', color=text_color)
    ax2.set_title('Per-Class F1 Score', color='#64B5F6', fontsize=13, fontweight='bold')
    ax2.set_facecolor('#0d0d1a')
    for bar, val in zip(bars, f1s):
        ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                 f'{val:.3f}', ha='center', va='bottom', color=text_color, fontsize=10)

    # ── 3. ROC-AUC Curves ───────────────────────────────────────────────────
    ax3 = fig.add_subplot(gs[1, 0])
    from sklearn.preprocessing import label_binarize
    from sklearn.metrics import roc_curve, auc
    labels_bin = label_binarize(labels, classes=range(len(CLASS_NAMES)))
    for i, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        if labels_bin.shape[1] > 1:
            fpr, tpr, _ = roc_curve(labels_bin[:, i], probs[:, i])
            roc_auc     = auc(fpr, tpr)
            ax3.plot(fpr, tpr, color=color, lw=2, label=f'{name} (AUC={roc_auc:.3f})')
    ax3.plot([0, 1], [0, 1], 'w--', lw=1)
    ax3.set_xlabel('False Positive Rate', color=text_color)
    ax3.set_ylabel('True Positive Rate',  color=text_color)
    ax3.set_title('ROC Curves', color='#64B5F6', fontsize=13, fontweight='bold')
    ax3.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=text_color, fontsize=8)
    ax3.set_facecolor('#0d0d1a')

    # ── 4. Confidence Score Distribution ────────────────────────────────────
    ax4 = fig.add_subplot(gs[1, 1])
    weights_vec = np.array([1.0, 0.0, 0.5])
    conf_scores = (probs * weights_vec).sum(axis=1)
    for lbl_id, (name, color) in enumerate(zip(CLASS_NAMES, COLORS)):
        mask = labels == lbl_id
        ax4.hist(conf_scores[mask], bins=30, color=color, alpha=0.7,
                 label=name, density=True)
    ax4.set_xlabel('Confidence Score', color=text_color)
    ax4.set_ylabel('Density',          color=text_color)
    ax4.set_title('Confidence Score Distribution by True Label',
                  color='#64B5F6', fontsize=11, fontweight='bold')
    ax4.legend(facecolor='#0d0d1a', edgecolor='#333', labelcolor=text_color, fontsize=9)
    ax4.set_facecolor('#0d0d1a')

    # ── Save ─────────────────────────────────────────────────────────────────
    fig.suptitle('Confidence Detection Model — Evaluation Report',
                 color='#90CAF9', fontsize=15, fontweight='bold', y=0.98)
    fig.patch.set_facecolor('#1a1a2e')
    out_path = out_dir / 'confidence_evaluation.png'
    plt.savefig(out_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"📊 Evaluation plot saved → {out_path}")


def evaluate(args):
    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')

    if args.demo:
        # Quick synthetic demo
        probs  = np.random.dirichlet([5, 1, 2], size=500)
        preds  = probs.argmax(axis=1)
        labels = np.random.choice(3, size=500, p=[0.4, 0.3, 0.3])
    else:
        from ai_models.confidence.confidence_model import get_model
        model  = get_model(variant=args.variant, pretrained=False).to(device)
        model.load_state_dict(torch.load(args.model_path, map_location=device))

        loader = load_test_data(args.data_dir, batch_size=args.batch_size)
        probs, preds, labels = get_predictions(model, loader, device)

    # ── Metrics ──────────────────────────────────────────────────────────────
    acc         = accuracy_score(labels, preds)
    macro_f1    = f1_score(labels, preds, average='macro')
    weighted_f1 = f1_score(labels, preds, average='weighted')
    precision   = precision_score(labels, preds, average='macro', zero_division=0)
    recall      = recall_score(labels, preds, average='macro', zero_division=0)
    try:
        roc_auc = roc_auc_score(labels, probs, multi_class='ovr', average='macro')
    except Exception:
        roc_auc = float('nan')

    print(f"\n{'='*60}")
    print(f"  CONFIDENCE MODEL EVALUATION RESULTS")
    print(f"{'='*60}")
    print(f"  Accuracy:          {acc:.4f}  ({acc*100:.2f}%)")
    print(f"  Macro F1:          {macro_f1:.4f}")
    print(f"  Weighted F1:       {weighted_f1:.4f}")
    print(f"  Macro Precision:   {precision:.4f}")
    print(f"  Macro Recall:      {recall:.4f}")
    print(f"  ROC-AUC (OvR):     {roc_auc:.4f}")
    print(f"{'='*60}")
    print(f"\nDetailed Report:")
    print(classification_report(labels, preds, target_names=CLASS_NAMES))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    plot_results(probs, preds, labels, out_dir)

    return {'accuracy': acc, 'macro_f1': macro_f1, 'roc_auc': roc_auc}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', type=str, default='ai_models/confidence/weights/confidence_model.pth')
    parser.add_argument('--data-dir',   type=str, default='data/fer2013_processed')
    parser.add_argument('--out-dir',    type=str, default='ai_models/confidence/weights')
    parser.add_argument('--variant',    type=str, default='efficientnet')
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--demo',       action='store_true', help='Run with synthetic data (no model needed)')
    args = parser.parse_args()

    results = evaluate(args)
