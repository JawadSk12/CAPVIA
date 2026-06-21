"""
FER2013 Preprocessing — Confidence Detection
Maps: happy/surprise → confident | fear/disgust → nervous | others → neutral
Generates synthetic face data when real dataset not available.
"""

import os
import sys
import numpy as np
from pathlib import Path
import argparse

# ── Label Mapping ────────────────────────────────────────────────────
# FER2013 classes: angry=0, disgust=1, fear=2, happy=3,
#                  neutral=4, sad=5, surprise=6
FER2013_TO_CONFIDENCE = {
    0: 'neutral',    # angry
    1: 'nervous',    # disgust
    2: 'nervous',    # fear
    3: 'confident',  # happy
    4: 'neutral',    # neutral
    5: 'nervous',    # sad
    6: 'confident',  # surprise
}
LABEL_MAP = {'confident': 0, 'nervous': 1, 'neutral': 2}


def preprocess_from_csv(csv_path: str, out_dir: str):
    """Parse FER2013 CSV and save split datasets as .npy files."""
    import pandas as pd

    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} samples from {csv_path}")

    out = Path(out_dir)
    for split in ['train', 'val', 'test']:
        (out / split).mkdir(parents=True, exist_ok=True)

    # Map FER emotions to confidence labels
    df['conf_label'] = df['emotion'].map(FER2013_TO_CONFIDENCE)
    df['conf_label_id'] = df['conf_label'].map(LABEL_MAP)

    # Split: usage column = Training / PublicTest / PrivateTest
    split_map = {
        'Training':    'train',
        'PublicTest':  'val',
        'PrivateTest': 'test',
    }

    for fer_split, our_split in split_map.items():
        sub = df[df['Usage'] == fer_split]
        images, labels = [], []
        for _, row in sub.iterrows():
            pixels = np.array(row['pixels'].split(), dtype=np.uint8).reshape(48, 48)
            images.append(pixels)
            labels.append(row['conf_label_id'])

        images = np.stack(images)          # (N, 48, 48)
        labels = np.array(labels)
        np.save(out / our_split / 'images.npy', images)
        np.save(out / our_split / 'labels.npy', labels)
        print(f"[{our_split:5s}] {len(images)} samples saved → {out / our_split}/")

    print("✅ FER2013 preprocessing complete.")


def generate_synthetic_data(out_dir: str, samples_per_class: int = 2000):
    """
    Generate synthetic face-like images for training when real data unavailable.
    Uses structured noise patterns to simulate facial gradients per emotion class.
    """
    import cv2

    rng = np.random.default_rng(42)
    out = Path(out_dir)

    splits = {'train': 0.8, 'val': 0.1, 'test': 0.1}
    class_names = list(LABEL_MAP.keys())  # confident, nervous, neutral

    print("🔧 Generating synthetic FER2013-style face data...")

    all_images, all_labels = [], []
    for label_id, class_name in enumerate(class_names):
        for _ in range(samples_per_class):
            # Base skin-tone gradient
            img = np.zeros((48, 48), dtype=np.float32)

            if class_name == 'confident':
                # Bright, open expression: high luminance center, upward arc (smile)
                for r in range(48):
                    for c in range(48):
                        dist = np.sqrt((r - 24)**2 + (c - 24)**2)
                        img[r, c] = max(0, 200 - dist * 3)
                # Add smile curve
                cv2.ellipse(img, (24, 28), (10, 5), 0, 0, 180, 220, 1)

            elif class_name == 'nervous':
                # Darker, tense: lower brow shadows, downward arcs
                for r in range(48):
                    for c in range(48):
                        dist = np.sqrt((r - 24)**2 + (c - 24)**2)
                        img[r, c] = max(0, 150 - dist * 2.5)
                # Add frown
                cv2.ellipse(img, (24, 32), (8, 4), 0, 180, 360, 100, 1)

            else:  # neutral
                for r in range(48):
                    for c in range(48):
                        dist = np.sqrt((r - 24)**2 + (c - 24)**2)
                        img[r, c] = max(0, 175 - dist * 2.8)

            # Add realistic noise
            noise = rng.normal(0, 20, (48, 48)).astype(np.float32)
            img = np.clip(img + noise, 0, 255).astype(np.uint8)

            all_images.append(img)
            all_labels.append(label_id)

    all_images = np.array(all_images)
    all_labels = np.array(all_labels)

    # Shuffle
    idx = rng.permutation(len(all_labels))
    all_images = all_images[idx]
    all_labels = all_labels[idx]

    n = len(all_labels)
    n_train = int(n * 0.8)
    n_val   = int(n * 0.1)

    split_data = {
        'train': (all_images[:n_train],          all_labels[:n_train]),
        'val':   (all_images[n_train:n_train+n_val], all_labels[n_train:n_train+n_val]),
        'test':  (all_images[n_train+n_val:],    all_labels[n_train+n_val:]),
    }

    for split, (imgs, lbls) in split_data.items():
        (out / split).mkdir(parents=True, exist_ok=True)
        np.save(out / split / 'images.npy', imgs)
        np.save(out / split / 'labels.npy', lbls)
        dist = {c: int(np.sum(lbls == i)) for i, c in enumerate(class_names)}
        print(f"[{split:5s}] {len(imgs)} samples | {dist}")

    print("✅ Synthetic face data generated.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Preprocess FER2013 or generate synthetic data')
    parser.add_argument('--csv',       type=str, default=None, help='Path to fer2013.csv (optional)')
    parser.add_argument('--out',       type=str, default='data/fer2013_processed')
    parser.add_argument('--synthetic', action='store_true', default=True)
    parser.add_argument('--samples',   type=int, default=2000, help='Samples per class (synthetic)')
    args = parser.parse_args()

    if args.csv and Path(args.csv).exists():
        preprocess_from_csv(args.csv, args.out)
    else:
        print("⚠️  No CSV provided — using synthetic mode")
        generate_synthetic_data(args.out, samples_per_class=args.samples)
