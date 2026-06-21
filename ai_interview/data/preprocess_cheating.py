"""
Cheating Temporal Data Preprocessing
Generates synthetic gaze + head-pose + face-count sequences for LSTM training.
Shape per sample: (seq_len=30, features=6)
Features: [yaw, pitch, roll, gaze_x, gaze_y, face_count_norm]
"""

import numpy as np
from pathlib import Path
import argparse


def _honest_sequence(rng, seq_len: int = 30) -> np.ndarray:
    """
    Simulate an honest candidate:
    - Gaze mostly centered (ratio ~0.5 ± 0.1)
    - Head mostly straight (yaw ~0° ± 10°, pitch ~5° ± 8°)
    - Single face always present
    """
    seq = np.zeros((seq_len, 6), dtype=np.float32)

    yaw   = rng.normal(0,  10, seq_len)
    pitch = rng.normal(5,   8, seq_len)
    roll  = rng.normal(0,   5, seq_len)
    gx    = rng.normal(0.5, 0.07, seq_len)
    gy    = rng.normal(0.5, 0.05, seq_len)
    fc    = np.ones(seq_len)  # single face

    seq[:, 0] = np.clip(yaw,   -90, 90) / 90.0
    seq[:, 1] = np.clip(pitch, -90, 90) / 90.0
    seq[:, 2] = np.clip(roll,  -45, 45) / 45.0
    seq[:, 3] = np.clip(gx,     0,  1)
    seq[:, 4] = np.clip(gy,     0,  1)
    seq[:, 5] = fc / 3.0  # normalized face count
    return seq


def _cheating_sequence(rng, cheat_type: str, seq_len: int = 30) -> np.ndarray:
    """
    Simulate cheating patterns:
    - 'gaze_away':   repeatedly looks left/right
    - 'head_turn':   head turns > 30° for sustained periods
    - 'phone':       eyes down (gy > 0.7), head pitched forward
    - 'multi_face':  face count spikes to 2
    """
    seq = np.zeros((seq_len, 6), dtype=np.float32)

    if cheat_type == 'gaze_away':
        yaw   = rng.normal(0, 8, seq_len)
        pitch = rng.normal(0, 6, seq_len)
        roll  = rng.normal(0, 4, seq_len)
        # Gaze alternates left/right
        gx    = []
        for i in range(seq_len):
            if i % 8 < 5:
                gx.append(rng.uniform(0.0, 0.3))   # looking left
            else:
                gx.append(rng.uniform(0.7, 1.0))   # looking right
        gx = np.array(gx)
        gy = rng.normal(0.5, 0.05, seq_len)
        fc = np.ones(seq_len)

    elif cheat_type == 'head_turn':
        # Head turns hard left or right
        turn_dir = rng.choice([-1, 1])
        yaw   = rng.normal(turn_dir * 50, 12, seq_len)
        pitch = rng.normal(0, 8, seq_len)
        roll  = rng.normal(0, 5, seq_len)
        gx    = rng.normal(0.5, 0.15, seq_len)
        gy    = rng.normal(0.5, 0.05, seq_len)
        fc    = np.ones(seq_len)

    elif cheat_type == 'phone':
        yaw   = rng.normal(0,    8,  seq_len)
        pitch = rng.normal(25,  10,  seq_len)   # pitched forward (looking down)
        roll  = rng.normal(0,    5,  seq_len)
        gx    = rng.normal(0.5, 0.1, seq_len)
        gy    = rng.normal(0.75, 0.1, seq_len)  # gaze down
        fc    = np.ones(seq_len)

    elif cheat_type == 'multi_face':
        yaw   = rng.normal(0, 10, seq_len)
        pitch = rng.normal(5,  8, seq_len)
        roll  = rng.normal(0,  5, seq_len)
        gx    = rng.normal(0.5, 0.1, seq_len)
        gy    = rng.normal(0.5, 0.1, seq_len)
        # Face count spikes to 2 for majority
        fc = np.where(rng.random(seq_len) > 0.3, 2, 1).astype(float)
    else:
        raise ValueError(f"Unknown cheat type: {cheat_type}")

    seq[:, 0] = np.clip(yaw,   -90, 90) / 90.0
    seq[:, 1] = np.clip(pitch, -90, 90) / 90.0
    seq[:, 2] = np.clip(roll,  -45, 45) / 45.0
    seq[:, 3] = np.clip(gx,     0,  1)
    seq[:, 4] = np.clip(gy,     0,  1)
    seq[:, 5] = np.clip(fc,     0,  3) / 3.0
    return seq


def generate_cheating_dataset(out_dir: str, 
                               honest_count: int = 3000, 
                               cheat_per_type: int = 750):
    """
    Generate balanced dataset of honest vs cheating temporal sequences.
    Total cheating = cheat_per_type * 4 types = 3000 (balanced with honest).
    """
    rng = np.random.default_rng(42)
    out = Path(out_dir)

    cheat_types = ['gaze_away', 'head_turn', 'phone', 'multi_face']

    sequences, labels = [], []

    # 0 = honest
    for _ in range(honest_count):
        sequences.append(_honest_sequence(rng))
        labels.append(0)

    # 1 = cheating
    for cheat_type in cheat_types:
        for _ in range(cheat_per_type):
            sequences.append(_cheating_sequence(rng, cheat_type))
            labels.append(1)

    sequences = np.array(sequences)  # (N, 30, 6)
    labels    = np.array(labels)     # (N,)

    # Shuffle
    idx = rng.permutation(len(labels))
    sequences = sequences[idx]
    labels    = labels[idx]

    # 80 / 10 / 10 split
    n = len(labels)
    n_train = int(n * 0.8)
    n_val   = int(n * 0.1)

    splits = {
        'train': (sequences[:n_train],              labels[:n_train]),
        'val':   (sequences[n_train:n_train+n_val], labels[n_train:n_train+n_val]),
        'test':  (sequences[n_train+n_val:],        labels[n_train+n_val:]),
    }

    print(f"🔧 Generating cheating LSTM dataset ({len(sequences)} samples, seq_len=30, features=6)")
    for split, (X, y) in splits.items():
        (out / split).mkdir(parents=True, exist_ok=True)
        np.save(out / split / 'sequences.npy', X)
        np.save(out / split / 'labels.npy',    y)
        honest_n = int(np.sum(y == 0))
        cheat_n  = int(np.sum(y == 1))
        print(f"  [{split:5s}] {len(X)} samples — honest: {honest_n}, cheating: {cheat_n}")

    print("✅ Cheating LSTM dataset generated.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out',           type=str, default='data/cheating_processed')
    parser.add_argument('--honest-count',  type=int, default=3000)
    parser.add_argument('--cheat-per-type',type=int, default=750)
    args = parser.parse_args()

    generate_cheating_dataset(args.out, args.honest_count, args.cheat_per_type)
