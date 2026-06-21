"""
Voice Confidence Model — MLP on MFCC Features
Input:  120-dim MFCC feature vector (40 MFCC + 40 delta + 40 delta²)
Output: 3-class (confident / nervous / neutral) → scalar confidence score
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path
import numpy as np


class VoiceConfidenceModel(nn.Module):
    """
    Multi-layer perceptron for audio-based confidence classification.
    Architecture: FC(256, BN, ReLU) → FC(128, BN, ReLU) → FC(64, ReLU) → FC(3)
    """

    CLASS_NAMES   = ['confident', 'nervous', 'neutral']
    CLASS_WEIGHTS = torch.tensor([1.0, 0.0, 0.5])

    def __init__(self, input_dim: int = 120, dropout: float = 0.3):
        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout / 2),

            nn.Linear(128, 64),
            nn.ReLU(inplace=True),

            nn.Linear(64, 3),
        )

        # Xavier init
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (B, 120) MFCC feature vectors
        Returns:
            logits: (B, 3)
        """
        return self.net(x)

    def predict_confidence_score(self, x: torch.Tensor) -> torch.Tensor:
        """Returns scalar confidence score 0–1."""
        with torch.no_grad():
            logits = self(x)
            probs  = F.softmax(logits, dim=1)
        weights = self.CLASS_WEIGHTS.to(probs.device)
        return (probs * weights).sum(dim=1)


class FusedConfidenceEstimator:
    """
    Fuses face-based and voice-based confidence scores.
    face_weight=0.6, voice_weight=0.4
    """

    def __init__(self,
                 face_model_path: str = None,
                 voice_model_path: str = None,
                 mfcc_stats_dir: str   = None,
                 face_weight: float    = 0.6,
                 voice_weight: float   = 0.4,
                 device: str           = 'cpu'):

        self.face_weight  = face_weight
        self.voice_weight = voice_weight
        self.device       = torch.device(device)

        # Load face model
        self.face_model = None
        if face_model_path and Path(face_model_path).exists():
            from .confidence_model import ConfidenceModel
            self.face_model = ConfidenceModel(pretrained=False)
            self.face_model.load_state_dict(torch.load(face_model_path, map_location=self.device))
            self.face_model.eval().to(self.device)
            print(f"✅ Face confidence model loaded: {face_model_path}")

        # Load voice model
        self.voice_model = None
        if voice_model_path and Path(voice_model_path).exists():
            self.voice_model = VoiceConfidenceModel()
            self.voice_model.load_state_dict(torch.load(voice_model_path, map_location=self.device))
            self.voice_model.eval().to(self.device)
            print(f"✅ Voice confidence model loaded: {voice_model_path}")

        # Load MFCC normalization stats
        self.mfcc_mean = None
        self.mfcc_std  = None
        if mfcc_stats_dir:
            mean_path = Path(mfcc_stats_dir) / 'mfcc_mean.npy'
            std_path  = Path(mfcc_stats_dir) / 'mfcc_std.npy'
            if mean_path.exists():
                self.mfcc_mean = torch.tensor(np.load(mean_path), dtype=torch.float32)
                self.mfcc_std  = torch.tensor(np.load(std_path),  dtype=torch.float32)

    def predict(self, face_image_tensor: torch.Tensor = None,
                mfcc_features: np.ndarray = None) -> dict:
        """
        Predict fused confidence score.

        Args:
            face_image_tensor: (1, 3, 224, 224) preprocessed face image
            mfcc_features: (120,) MFCC feature vector

        Returns:
            dict with face_score, voice_score, fused_score
        """
        face_score  = None
        voice_score = None

        if self.face_model is not None and face_image_tensor is not None:
            face_image_tensor = face_image_tensor.to(self.device)
            face_score = float(self.face_model.predict_confidence_score(face_image_tensor).item())

        if self.voice_model is not None and mfcc_features is not None:
            feat = torch.tensor(mfcc_features, dtype=torch.float32).unsqueeze(0)
            if self.mfcc_mean is not None:
                feat = (feat - self.mfcc_mean) / (self.mfcc_std + 1e-8)
            feat = feat.to(self.device)
            voice_score = float(self.voice_model.predict_confidence_score(feat).item())

        # Fusion
        if face_score is not None and voice_score is not None:
            fused = self.face_weight * face_score + self.voice_weight * voice_score
        elif face_score is not None:
            fused = face_score
        elif voice_score is not None:
            fused = voice_score
        else:
            fused = 0.5  # default

        return {
            'face_confidence_score':  round(face_score,  4) if face_score  is not None else None,
            'voice_confidence_score': round(voice_score, 4) if voice_score is not None else None,
            'confidence_score':       round(fused, 4),
        }


if __name__ == '__main__':
    model = VoiceConfidenceModel()
    dummy = torch.randn(4, 120)
    out   = model(dummy)
    scores = model.predict_confidence_score(dummy)
    print(f"✅ VoiceConfidenceModel OK")
    print(f"   Input shape:  {tuple(dummy.shape)}")
    print(f"   Output shape: {tuple(out.shape)}")
    print(f"   Scores:       {[round(s, 4) for s in scores.tolist()]}")
    print(f"   Params:       {sum(p.numel() for p in model.parameters()):,}")
