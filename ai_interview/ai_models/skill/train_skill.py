"""
Skill Evaluation Model Training & Fine-Tuning
Fine-tunes Sentence-BERT on technical interview QA pairs from SQuAD or synthetic data.
Uses MultipleNegativesRankingLoss (contrastive) for better semantic similarity.

Usage:
  python train_skill.py                   # synthetic data
  python train_skill.py --data-dir data/skill_processed
"""

import sys
import json
import argparse
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))


def load_skill_dataset(data_dir: str, split: str):
    """Load skill QA samples from JSON file."""
    path = Path(data_dir) / f'{split}.json'
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


def train_sentence_bert(args):
    """Fine-tune Sentence-BERT with multiple negatives ranking loss."""
    try:
        from sentence_transformers import SentenceTransformer, InputExample, losses
        from torch.utils.data import DataLoader
    except ImportError:
        print("⚠️  sentence-transformers not installed.")
        print("    Run: pip install sentence-transformers")
        return

    # ── Prepare Data ──────────────────────────────────────────────────────────
    data_dir = Path(args.data_dir)
    if not (data_dir / 'train.json').exists():
        print(f"⚙️  Generating synthetic skill dataset → {data_dir}")
        import subprocess
        prep = ROOT / 'data' / 'preprocess_skill.py'
        subprocess.run([sys.executable, str(prep), '--out', str(data_dir)], check=True)

    train_samples = load_skill_dataset(args.data_dir, 'train')
    val_samples   = load_skill_dataset(args.data_dir, 'val')
    print(f"📊 Dataset — Train: {len(train_samples)}, Val: {len(val_samples)}")

    # Build InputExamples: (candidate, reference) pairs for contrastive learning
    train_examples = [
        InputExample(texts=[s['candidate'], s['reference']])
        for s in train_samples
        if s.get('candidate') and s.get('reference')
    ]

    # ── Model ─────────────────────────────────────────────────────────────────
    print(f"🧠 Loading base model: {args.model_name}")
    model = SentenceTransformer(args.model_name)

    # ── Loss: MultipleNegativesRankingLoss ────────────────────────────────────
    # Each pair (candidate, reference) is a positive; all others in batch are negatives
    train_loader = DataLoader(train_examples, shuffle=True, batch_size=args.batch_size)
    train_loss   = losses.MultipleNegativesRankingLoss(model)

    # ── Fine-Tune ─────────────────────────────────────────────────────────────
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🚀 Starting fine-tuning for {args.epochs} epochs...")
    model.fit(
        train_objectives = [(train_loader, train_loss)],
        epochs           = args.epochs,
        warmup_steps     = int(len(train_loader) * 0.1),
        output_path      = str(out_dir / 'skill_sbert'),
        show_progress_bar= True,
        optimizer_params = {'lr': args.lr},
    )

    print(f"✅ Sentence-BERT fine-tuned → {out_dir / 'skill_sbert'}")


def train_regression_head(args):
    """
    Train a lightweight regression head on top of frozen SBERT embeddings.
    Maps cosine_sim(cand_emb, ref_emb) → score (0-10).
    """
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import TensorDataset, DataLoader

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("⚠️  sentence-transformers required.")
        return

    data_dir = Path(args.data_dir)
    out_dir  = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load samples
    train_samples = load_skill_dataset(args.data_dir, 'train')
    val_samples   = load_skill_dataset(args.data_dir, 'val')

    if not train_samples:
        print(f"⚠️  No training data found at {data_dir}")
        return

    # Load SBERT (fine-tuned if available, else base)
    sbert_path = out_dir / 'skill_sbert'
    model_id   = str(sbert_path) if sbert_path.exists() else args.model_name
    sbert      = SentenceTransformer(model_id)
    sbert.eval()

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f"🖥️  Device: {device}")

    def encode_pairs(samples):
        candidates = [s['candidate'] for s in samples]
        references = [s['reference'] for s in samples]
        scores     = np.array([s['score'] for s in samples], dtype=np.float32)

        print(f"  Encoding {len(candidates)} candidate-reference pairs...")
        cand_emb = sbert.encode(candidates, batch_size=64, show_progress_bar=False)
        ref_emb  = sbert.encode(references, batch_size=64, show_progress_bar=False)

        # Features: [cosine_sim, ||diff||, element-wise product mean]
        cos_sim = np.einsum('ij,ij->i', cand_emb, ref_emb) / (
            np.linalg.norm(cand_emb, axis=1) * np.linalg.norm(ref_emb, axis=1) + 1e-8
        )
        diff_norm = np.linalg.norm(cand_emb - ref_emb, axis=1)
        features  = np.stack([cos_sim, diff_norm / 10.0], axis=1).astype(np.float32)
        return features, scores

    print("📐 Computing embeddings...")
    X_train, y_train = encode_pairs(train_samples)
    X_val,   y_val   = encode_pairs(val_samples)

    X_train_t = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).to(device)
    X_val_t   = torch.tensor(X_val,   dtype=torch.float32).to(device)
    y_val_t   = torch.tensor(y_val,   dtype=torch.float32).to(device)

    train_ds     = TensorDataset(X_train_t, y_train_t)
    train_loader = DataLoader(train_ds, batch_size=128, shuffle=True)

    # Regression head
    reg_head = nn.Sequential(
        nn.Linear(2, 32),
        nn.ReLU(),
        nn.Linear(32, 16),
        nn.ReLU(),
        nn.Linear(16, 1),
    ).to(device)

    optimizer = optim.Adam(reg_head.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    print(f"\n{'Epoch':>6} {'Train MSE':>12} {'Val MSE':>10} {'Val RMSE':>10}")
    print("-" * 45)

    best_val_mse  = float('inf')
    best_path     = out_dir / 'skill_regression_head.pth'

    for epoch in range(1, args.epochs + 1):
        reg_head.train()
        total_loss = 0.0
        for Xb, yb in train_loader:
            optimizer.zero_grad()
            pred = reg_head(Xb).squeeze()
            loss = criterion(pred, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(yb)
        train_mse = total_loss / len(X_train)

        reg_head.eval()
        with torch.no_grad():
            val_pred = reg_head(X_val_t).squeeze()
            val_mse  = criterion(val_pred, y_val_t).item()
            val_rmse = val_mse ** 0.5

        print(f"{epoch:>6} {train_mse:>12.4f} {val_mse:>10.4f} {val_rmse:>10.4f}")

        if val_mse < best_val_mse:
            best_val_mse = val_mse
            torch.save(reg_head.state_dict(), best_path)

    print(f"\n✅ Regression head saved → {best_path}")

    # Pearson correlation on val set
    reg_head.load_state_dict(torch.load(best_path, map_location=device))
    reg_head.eval()
    with torch.no_grad():
        val_pred_np = reg_head(X_val_t).squeeze().cpu().numpy()

    from scipy import stats
    r, p_val = stats.pearsonr(y_val, val_pred_np)
    print(f"📊 Val Pearson r = {r:.4f}  (p={p_val:.4f})")

    # Save metadata
    meta = {
        'pearson_r':    round(float(r), 4),
        'best_val_mse': round(float(best_val_mse), 4),
        'val_rmse':     round(float(best_val_mse**0.5), 4),
        'sbert_model':  model_id,
        'reg_head':     str(best_path),
    }
    with open(out_dir / 'skill_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"💾 Metadata → {out_dir / 'skill_meta.json'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Skill Evaluation Model')
    parser.add_argument('--data-dir',   type=str,   default='data/skill_processed')
    parser.add_argument('--out-dir',    type=str,   default='ai_models/skill/weights')
    parser.add_argument('--model-name', type=str,   default='all-MiniLM-L6-v2')
    parser.add_argument('--epochs',     type=int,   default=10)
    parser.add_argument('--batch-size', type=int,   default=32)
    parser.add_argument('--lr',         type=float, default=2e-5)
    parser.add_argument('--skip-sbert', action='store_true',
                        help='Skip SBERT fine-tuning, train regression head only')
    args = parser.parse_args()

    if not args.skip_sbert:
        print("=" * 55)
        print("Phase 1: Fine-tuning Sentence-BERT")
        print("=" * 55)
        train_sentence_bert(args)

    print("\n" + "=" * 55)
    print("Phase 2: Training Regression Head")
    print("=" * 55)
    train_regression_head(args)
