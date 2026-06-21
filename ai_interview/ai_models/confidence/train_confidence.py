"""
Confidence Detection Training Script
Trains EfficientNet-B0 on FER2013-style face images.
Supports: synthetic data (default) or real FER2013 CSV.

Usage:
  python train_confidence.py                        # synthetic
  python train_confidence.py --data-dir data/fer2013_processed  # real
"""

import sys
import argparse
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.metrics import classification_report, confusion_matrix

# Add project root to path
ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


# ── Dataset ─────────────────────────────────────────────────────────────────

class FaceDataset(Dataset):
    """Loads preprocessed face images from .npy arrays."""

    MEAN = [0.485, 0.456, 0.406]
    STD  = [0.229, 0.224, 0.225]

    def __init__(self, data_dir: str, split: str, augment: bool = False, image_size: int = 224):
        p = Path(data_dir) / split
        self.images = np.load(p / 'images.npy')   # (N, 48, 48) uint8
        self.labels = np.load(p / 'labels.npy')   # (N,) int

        if augment:
            self.transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((image_size, image_size)),
                transforms.RandomHorizontalFlip(p=0.5),
                transforms.RandomRotation(degrees=15),
                transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
                transforms.ToTensor(),
                transforms.Normalize(self.MEAN, self.STD),
            ])
        else:
            self.transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((image_size, image_size)),
                transforms.ToTensor(),
                transforms.Normalize(self.MEAN, self.STD),
            ])

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        img   = self.images[idx]                     # (48, 48) grayscale uint8
        label = int(self.labels[idx])
        # Convert grayscale to RGB by repeating channels
        img_rgb = np.stack([img, img, img], axis=2)  # (48, 48, 3)
        img_t   = self.transform(img_rgb)            # (3, 224, 224)
        return img_t, label


# ── Training ─────────────────────────────────────────────────────────────────

def train_one_epoch(model, loader, optimizer, criterion, device, scaler=None):
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad()

        if scaler is not None:
            with torch.cuda.amp.autocast():
                logits = model(images)
                loss   = criterion(logits, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            logits = model(images)
            loss   = criterion(logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        total_loss += loss.item() * len(labels)
        preds       = logits.argmax(dim=1)
        correct    += (preds == labels).sum().item()
        total      += len(labels)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)
        logits = model(images)
        loss   = criterion(logits, labels)
        preds  = logits.argmax(dim=1)

        total_loss += loss.item() * len(labels)
        correct    += (preds == labels).sum().item()
        total      += len(labels)
        all_preds.extend(preds.cpu().tolist())
        all_labels.extend(labels.cpu().tolist())

    return total_loss / total, correct / total, all_preds, all_labels


def train(args):
    # ── Device ──────────────────────────────────────────────────────────────
    if torch.cuda.is_available():
        device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        device = torch.device('mps')
    else:
        device = torch.device('cpu')
    print(f"🖥️  Device: {device}")

    # ── Data ─────────────────────────────────────────────────────────────────
    # Auto-generate synthetic data if directory doesn't exist
    data_dir = Path(args.data_dir)
    if not (data_dir / 'train' / 'images.npy').exists():
        print(f"⚙️  Generating synthetic FER2013 data → {data_dir}")
        import subprocess, sys
        prep = ROOT / 'data' / 'preprocess_fer2013.py'
        subprocess.run([sys.executable, str(prep),
                        '--out', str(data_dir),
                        '--samples', str(args.synthetic_samples)], check=True)

    train_ds = FaceDataset(args.data_dir, 'train', augment=True)
    val_ds   = FaceDataset(args.data_dir, 'val',   augment=False)
    test_ds  = FaceDataset(args.data_dir, 'test',  augment=False)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size,
                              shuffle=True,  num_workers=args.workers, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch_size,
                              shuffle=False, num_workers=args.workers, pin_memory=True)
    test_loader  = DataLoader(test_ds,  batch_size=args.batch_size,
                              shuffle=False, num_workers=args.workers, pin_memory=True)

    print(f"📊 Dataset — Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")

    # ── Model ────────────────────────────────────────────────────────────────
    from ai_models.confidence.confidence_model import get_model
    model = get_model(variant=args.variant, pretrained=args.pretrained).to(device)
    print(f"🧠 Model: {args.variant} | Params: {sum(p.numel() for p in model.parameters()):,}")

    # ── Loss & Optimizer ─────────────────────────────────────────────────────
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler    = torch.cuda.amp.GradScaler() if device.type == 'cuda' else None

    # ── Early Stopping ───────────────────────────────────────────────────────
    best_val_acc  = 0.0
    patience_cnt  = 0
    out_dir       = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    best_path     = out_dir / 'confidence_model.pth'

    print(f"\n{'Epoch':>6} {'Train Loss':>12} {'Train Acc':>10} {'Val Loss':>10} {'Val Acc':>9} {'LR':>10}")
    print("-" * 65)

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device, scaler)
        val_loss,   val_acc, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        lr = optimizer.param_groups[0]['lr']
        elapsed = time.time() - t0
        print(f"{epoch:>6} {train_loss:>12.4f} {train_acc:>10.4f} {val_loss:>10.4f} "
              f"{val_acc:>9.4f} {lr:>10.2e}  ({elapsed:.1f}s)")

        # Save best
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_cnt = 0
            torch.save(model.state_dict(), best_path)
            print(f"  ✅ Best model saved (val_acc={val_acc:.4f})")
        else:
            patience_cnt += 1
            if patience_cnt >= args.patience:
                print(f"⏹️  Early stopping at epoch {epoch}")
                break

    # ── Final Evaluation ─────────────────────────────────────────────────────
    print(f"\n🔍 Loading best model from {best_path}")
    model.load_state_dict(torch.load(best_path, map_location=device))

    _, test_acc, preds, labels = evaluate(model, test_loader, criterion, device)
    class_names = ['confident', 'nervous', 'neutral']

    print(f"\n{'='*65}")
    print(f"📊 TEST RESULTS")
    print(f"{'='*65}")
    print(f"Test Accuracy: {test_acc:.4f} ({test_acc*100:.2f}%)")
    print(f"\nClassification Report:")
    print(classification_report(labels, preds, target_names=class_names))

    cm = confusion_matrix(labels, preds)
    print("Confusion Matrix:")
    print(f"{'':15}", '  '.join(f'{n:>10}' for n in class_names))
    for i, row in enumerate(cm):
        print(f"{class_names[i]:15}  {'  '.join(f'{v:>10}' for v in row)}")

    # Save metadata
    import json
    meta = {
        'variant': args.variant,
        'test_accuracy': round(test_acc, 4),
        'best_val_accuracy': round(best_val_acc, 4),
        'epochs_trained': epoch,
        'model_path': str(best_path),
    }
    with open(out_dir / 'confidence_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\n💾 Metadata saved → {out_dir / 'confidence_meta.json'}")
    print(f"✅ Training complete! Best model: {best_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Confidence Detection Model')
    parser.add_argument('--data-dir',          type=str,   default='data/fer2013_processed')
    parser.add_argument('--out-dir',           type=str,   default='ai_models/confidence/weights')
    parser.add_argument('--variant',           type=str,   default='efficientnet',
                        choices=['efficientnet', 'mobilenet'])
    parser.add_argument('--pretrained',        action='store_true', default=True)
    parser.add_argument('--epochs',            type=int,   default=30)
    parser.add_argument('--batch-size',        type=int,   default=32)
    parser.add_argument('--lr',                type=float, default=1e-4)
    parser.add_argument('--weight-decay',      type=float, default=1e-2)
    parser.add_argument('--patience',          type=int,   default=5)
    parser.add_argument('--workers',           type=int,   default=0)
    parser.add_argument('--synthetic-samples', type=int,   default=2000)
    args = parser.parse_args()

    train(args)
