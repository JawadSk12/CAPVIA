"""
Cheating Risk LSTM Training Script
Trains BiLSTM + Attention on temporal gaze/head-pose sequences.
Auto-generates synthetic data if not found.

Usage:
  python train_cheating.py                          # synthetic data
  python train_cheating.py --data-dir data/cheating_processed
"""

import sys
import argparse
import time
import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import classification_report, roc_auc_score

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


# ── Dataset ───────────────────────────────────────────────────────────────────

class TemporalCheatingDataset(Dataset):
    """Loads (seq_len, 6) sequences + binary labels."""

    def __init__(self, data_dir: str, split: str):
        p = Path(data_dir) / split
        self.X = torch.tensor(np.load(p / 'sequences.npy'), dtype=torch.float32)
        self.y = torch.tensor(np.load(p / 'labels.npy'),    dtype=torch.float32)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


# ── Training ──────────────────────────────────────────────────────────────────

def train_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for X, y in loader:
        X = X.to(device)
        y = y.to(device).unsqueeze(1)

        optimizer.zero_grad()
        logits = model(X)
        loss   = criterion(logits, y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        total_loss += loss.item() * len(y)
        preds       = (torch.sigmoid(logits) > 0.5).float()
        correct    += (preds == y).sum().item()
        total      += len(y)

    return total_loss / total, correct / total


@torch.no_grad()
def validate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_probs, all_labels = [], []

    for X, y in loader:
        X = X.to(device)
        y = y.to(device).unsqueeze(1)

        logits = model(X)
        loss   = criterion(logits, y)
        probs  = torch.sigmoid(logits)
        preds  = (probs > 0.5).float()

        total_loss += loss.item() * len(y)
        correct    += (preds == y).sum().item()
        total      += len(y)
        all_probs.extend(probs.squeeze(1).cpu().tolist())
        all_labels.extend(y.squeeze(1).cpu().tolist())

    return total_loss / total, correct / total, all_probs, all_labels


def train(args):
    # ── Device ────────────────────────────────────────────────────────────────
    if torch.cuda.is_available():
        device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        device = torch.device('mps')
    else:
        device = torch.device('cpu')
    print(f"🖥️  Device: {device}")

    # ── Data ──────────────────────────────────────────────────────────────────
    data_dir = Path(args.data_dir)
    if not (data_dir / 'train' / 'sequences.npy').exists():
        print(f"⚙️  Generating synthetic cheating data → {data_dir}")
        import subprocess
        prep = ROOT / 'data' / 'preprocess_cheating.py'
        subprocess.run([sys.executable, str(prep),
                        '--out', str(data_dir),
                        '--honest-count', str(args.honest_count),
                        '--cheat-per-type', str(args.cheat_per_type)], check=True)

    train_ds = TemporalCheatingDataset(args.data_dir, 'train')
    val_ds   = TemporalCheatingDataset(args.data_dir, 'val')
    test_ds  = TemporalCheatingDataset(args.data_dir, 'test')

    train_loader = DataLoader(train_ds, batch_size=args.batch_size,
                              shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch_size,
                              shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_ds,  batch_size=args.batch_size,
                              shuffle=False, num_workers=0)

    print(f"📊 Dataset — Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")

    # ── Model ─────────────────────────────────────────────────────────────────
    from ai_models.cheating.cheating_lstm import CheatingLSTM
    model = CheatingLSTM(
        input_dim  = 6,
        hidden_dim = args.hidden_dim,
        num_layers = args.num_layers,
        dropout    = args.dropout,
    ).to(device)
    print(f"🧠 CheatingLSTM | Params: {sum(p.numel() for p in model.parameters()):,}")

    # ── Loss: Weighted BCE for class imbalance ─────────────────────────────
    pos_weight = torch.tensor([args.pos_weight]).to(device)
    criterion  = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    optimizer  = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler  = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', patience=3, factor=0.5, verbose=False)

    # ── Training Loop ─────────────────────────────────────────────────────────
    out_dir   = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    best_path = out_dir / 'cheating_lstm.pth'

    best_val_loss = float('inf')
    patience_cnt  = 0

    print(f"\n{'Epoch':>6} {'Train Loss':>12} {'Train Acc':>10} {'Val Loss':>10} {'Val Acc':>9} {'Val AUC':>9}")
    print("-" * 65)

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_acc, val_probs, val_labels = validate(model, val_loader, criterion, device)

        try:
            val_auc = roc_auc_score(val_labels, val_probs)
        except Exception:
            val_auc = float('nan')

        scheduler.step(val_loss)
        elapsed = time.time() - t0

        print(f"{epoch:>6} {train_loss:>12.4f} {train_acc:>10.4f} {val_loss:>10.4f} "
              f"{val_acc:>9.4f} {val_auc:>9.4f}  ({elapsed:.1f}s)")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_cnt  = 0
            torch.save(model.state_dict(), best_path)
            print(f"  ✅ Best model saved (val_loss={val_loss:.4f}, auc={val_auc:.4f})")
        else:
            patience_cnt += 1
            if patience_cnt >= args.patience:
                print(f"⏹️  Early stopping at epoch {epoch}")
                break

    # ── Final Evaluation ──────────────────────────────────────────────────────
    print(f"\n🔍 Final evaluation on test set...")
    model.load_state_dict(torch.load(best_path, map_location=device))
    test_loss, test_acc, test_probs, test_labels = validate(model, test_loader, criterion, device)

    test_preds = [1 if p > 0.5 else 0 for p in test_probs]
    try:
        test_auc = roc_auc_score(test_labels, test_probs)
    except Exception:
        test_auc = float('nan')

    print(f"\n{'='*60}")
    print(f"📊 TEST RESULTS")
    print(f"{'='*60}")
    print(f"Test Accuracy:  {test_acc:.4f}  ({test_acc*100:.2f}%)")
    print(f"Test ROC-AUC:   {test_auc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=['honest', 'cheating']))

    meta = {
        'test_accuracy':      round(test_acc, 4),
        'test_roc_auc':       round(test_auc, 4),
        'best_val_loss':      round(best_val_loss, 4),
        'epochs_trained':     epoch,
        'model_path':         str(best_path),
        'architecture':       'BiLSTM + Attention',
        'hidden_dim':         args.hidden_dim,
        'num_layers':         args.num_layers,
    }
    with open(out_dir / 'cheating_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n💾 Metadata saved → {out_dir / 'cheating_meta.json'}")
    print(f"✅ Cheating LSTM training complete! Model: {best_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Cheating Risk LSTM')
    parser.add_argument('--data-dir',       type=str,   default='data/cheating_processed')
    parser.add_argument('--out-dir',        type=str,   default='ai_models/cheating/weights')
    parser.add_argument('--epochs',         type=int,   default=50)
    parser.add_argument('--batch-size',     type=int,   default=64)
    parser.add_argument('--lr',             type=float, default=1e-3)
    parser.add_argument('--hidden-dim',     type=int,   default=128)
    parser.add_argument('--num-layers',     type=int,   default=2)
    parser.add_argument('--dropout',        type=float, default=0.3)
    parser.add_argument('--pos-weight',     type=float, default=3.0,
                        help='Positive class weight for BCE loss')
    parser.add_argument('--patience',       type=int,   default=7)
    parser.add_argument('--honest-count',   type=int,   default=3000)
    parser.add_argument('--cheat-per-type', type=int,   default=750)
    args = parser.parse_args()

    train(args)
