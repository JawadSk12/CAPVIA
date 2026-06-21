"""
RAVDESS Audio Preprocessing — Voice Confidence Detection
Extracts MFCC + delta + delta-delta features (120-dim) from speech audio.
Maps RAVDESS emotion codes → confident / nervous / neutral.
Generates synthetic MFCC data when real dataset unavailable.
"""

import numpy as np
from pathlib import Path
import argparse

# RAVDESS emotion codes (3rd number in filename)
# 01=neutral, 02=calm, 03=happy, 04=sad, 05=angry, 06=fearful, 07=disgust, 08=surprised
RAVDESS_EMOTION_MAP = {
    '01': 'neutral',    # neutral
    '02': 'neutral',    # calm
    '03': 'confident',  # happy
    '04': 'nervous',    # sad
    '05': 'nervous',    # angry (tense)
    '06': 'nervous',    # fearful
    '07': 'nervous',    # disgust
    '08': 'confident',  # surprised
}
LABEL_MAP = {'confident': 0, 'nervous': 1, 'neutral': 2}
N_MFCC = 40  # 40 MFCCs + 40 delta + 40 delta-delta = 120 total


def extract_features(audio_path: str, sr: int = 22050, duration: float = 3.0) -> np.ndarray:
    """Extract 120-dim MFCC features from audio file."""
    import librosa

    y, sr = librosa.load(audio_path, sr=sr, duration=duration)

    # Pad/trim to fixed length
    target_length = int(sr * duration)
    if len(y) < target_length:
        y = np.pad(y, (0, target_length - len(y)))
    else:
        y = y[:target_length]

    # MFCC + deltas
    mfcc       = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)       # (40, T)
    mfcc_delta = librosa.feature.delta(mfcc)                            # (40, T)
    mfcc_d2    = librosa.feature.delta(mfcc, order=2)                   # (40, T)

    # Mean over time → (120,)
    features = np.concatenate([
        np.mean(mfcc, axis=1),
        np.mean(mfcc_delta, axis=1),
        np.mean(mfcc_d2, axis=1),
    ])
    return features.astype(np.float32)


def preprocess_from_ravdess(ravdess_dir: str, out_dir: str):
    """Process real RAVDESS dataset directory structure."""
    out = Path(out_dir)
    ravdess_path = Path(ravdess_dir)

    features_all, labels_all = [], []

    audio_files = list(ravdess_path.glob('**/*.wav'))
    print(f"Found {len(audio_files)} .wav files in {ravdess_dir}")

    for audio_file in audio_files:
        try:
            # RAVDESS filename: 03-01-06-01-02-01-12.wav
            parts = audio_file.stem.split('-')
            emotion_code = parts[2]  # 3rd identifier
            emotion = RAVDESS_EMOTION_MAP.get(emotion_code, 'neutral')
            label = LABEL_MAP[emotion]

            feat = extract_features(str(audio_file))
            features_all.append(feat)
            labels_all.append(label)
        except Exception as e:
            print(f"  ⚠️  Skipping {audio_file.name}: {e}")

    _save_splits(np.array(features_all), np.array(labels_all), out)


def generate_synthetic_audio_features(out_dir: str, samples_per_class: int = 1500):
    """
    Generate synthetic MFCC feature vectors per emotion class.
    Each class has a distinct distributional signature.
    """
    rng = np.random.default_rng(42)
    out = Path(out_dir)

    print("🔧 Generating synthetic RAVDESS-style audio features...")

    class_params = {
        'confident': {'mean_shift': 2.5,  'std': 8.0,  'energy': 15.0},
        'nervous':   {'mean_shift': -1.5, 'std': 12.0, 'energy': 5.0},
        'neutral':   {'mean_shift': 0.0,  'std': 6.0,  'energy': 8.0},
    }

    all_features, all_labels = [], []
    for label_id, (class_name, params) in enumerate(class_params.items()):
        for _ in range(samples_per_class):
            # Base MFCC distribution (120-dim)
            base = rng.normal(params['mean_shift'], params['std'], 120).astype(np.float32)
            # Energy component (first MFCC = log energy)
            base[0]  += params['energy']
            base[40] += params['energy'] * 0.3  # delta
            base[80] += params['energy'] * 0.1  # delta-delta
            all_features.append(base)
            all_labels.append(label_id)

    features = np.array(all_features)
    labels   = np.array(all_labels)

    # Z-score normalize
    mean = features.mean(axis=0)
    std  = features.std(axis=0) + 1e-8
    features = (features - mean) / std

    # Save normalization stats for inference
    out.mkdir(parents=True, exist_ok=True)
    np.save(out / 'mfcc_mean.npy', mean)
    np.save(out / 'mfcc_std.npy',  std)

    _save_splits(features, labels, out)
    print("✅ Synthetic audio features generated.")


def _save_splits(features: np.ndarray, labels: np.ndarray, out: Path):
    """Shuffle and save 80/10/10 splits."""
    rng = np.random.default_rng(42)
    idx = rng.permutation(len(labels))
    features = features[idx]
    labels   = labels[idx]

    n = len(labels)
    n_train = int(n * 0.8)
    n_val   = int(n * 0.1)

    splits = {
        'train': (features[:n_train],           labels[:n_train]),
        'val':   (features[n_train:n_train+n_val], labels[n_train:n_train+n_val]),
        'test':  (features[n_train+n_val:],     labels[n_train+n_val:]),
    }
    class_names = ['confident', 'nervous', 'neutral']
    for split, (X, y) in splits.items():
        (out / split).mkdir(parents=True, exist_ok=True)
        np.save(out / split / 'features.npy', X)
        np.save(out / split / 'labels.npy',   y)
        dist = {c: int(np.sum(y == i)) for i, c in enumerate(class_names)}
        print(f"[{split:5s}] {len(X)} samples | {dist}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ravdess-dir', type=str, default=None)
    parser.add_argument('--out',         type=str, default='data/ravdess_processed')
    parser.add_argument('--samples',     type=int, default=1500)
    args = parser.parse_args()

    if args.ravdess_dir and Path(args.ravdess_dir).exists():
        preprocess_from_ravdess(args.ravdess_dir, args.out)
    else:
        print("⚠️  No RAVDESS dir provided — using synthetic mode")
        generate_synthetic_audio_features(args.out, samples_per_class=args.samples)
