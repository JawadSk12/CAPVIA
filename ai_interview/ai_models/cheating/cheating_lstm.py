"""
Cheating Risk LSTM — Model Architecture
Input:  (batch, seq_len=30, features=6) temporal gaze/pose sequences
Output: cheating probability [0, 1]

Features per frame:
  [0] yaw_norm        [-1, 1]  (yaw / 90°)
  [1] pitch_norm      [-1, 1]  (pitch / 90°)
  [2] roll_norm       [-1, 1]  (roll / 45°)
  [3] gaze_x          [0, 1]   (horizontal gaze ratio)
  [4] gaze_y          [0, 1]   (vertical gaze ratio)
  [5] face_count_norm [0, 1]   (face_count / 3)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class TemporalAttention(nn.Module):
    """
    Single-head dot-product attention over temporal dimension.
    Learns to weight which frames are most informative for cheating detection.
    """

    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Linear(hidden_dim, 1)

    def forward(self, lstm_out: torch.Tensor) -> torch.Tensor:
        """
        Args:
            lstm_out: (B, seq_len, hidden_dim)
        Returns:
            context: (B, hidden_dim) — attention-weighted sum
        """
        scores  = self.attn(lstm_out)                   # (B, T, 1)
        weights = torch.softmax(scores, dim=1)          # (B, T, 1)
        context = (lstm_out * weights).sum(dim=1)       # (B, hidden_dim)
        return context


class CheatingLSTM(nn.Module):
    """
    Bidirectional LSTM + Temporal Attention for cheating risk detection.

    Architecture:
      Input(6) → BiLSTM(128, 2 layers) → Attention → FC(64, ReLU) → FC(1, Sigmoid)
    """

    def __init__(self,
                 input_dim:  int   = 6,
                 hidden_dim: int   = 128,
                 num_layers: int   = 2,
                 dropout:    float = 0.3):
        super().__init__()

        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Input projection with LayerNorm (helps with varied feature scales)
        self.input_proj = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.LayerNorm(32),
            nn.ReLU(),
        )

        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            input_size   = 32,
            hidden_size  = hidden_dim,
            num_layers   = num_layers,
            dropout      = dropout if num_layers > 1 else 0.0,
            bidirectional= True,
            batch_first  = True,
        )
        lstm_out_dim = hidden_dim * 2  # bidirectional → 2×

        # Temporal attention
        self.attention = TemporalAttention(lstm_out_dim)

        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(lstm_out_dim, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(64, 1),
        )

        self._init_weights()

    def _init_weights(self):
        for name, param in self.lstm.named_parameters():
            if 'weight' in name:
                nn.init.orthogonal_(param)
            elif 'bias' in name:
                nn.init.zeros_(param)
        for layer in self.classifier:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (B, seq_len, 6) — normalized temporal features
        Returns:
            logits: (B, 1) — cheating probability logit (pre-sigmoid)
        """
        # Project input features
        proj = self.input_proj(x)              # (B, T, 32)

        # BiLSTM
        lstm_out, _ = self.lstm(proj)          # (B, T, 256)

        # Attention pooling
        context = self.attention(lstm_out)     # (B, 256)

        # Classification
        logits = self.classifier(context)     # (B, 1)
        return logits

    def predict_probability(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns cheating probability in [0, 1].

        Args:
            x: (B, seq_len, 6)
        Returns:
            probs: (B,) cheating probability
        """
        with torch.no_grad():
            logits = self(x)
            probs  = torch.sigmoid(logits).squeeze(1)
        return probs


class SimpleCheatingMLPBaseline(nn.Module):
    """
    Simple MLP baseline for comparison — operates on mean/std of sequence.
    Used to verify LSTM adds value over static features.
    """

    def __init__(self, input_dim: int = 6, seq_len: int = 30):
        super().__init__()
        stat_dim = input_dim * 2  # mean + std per feature = 12

        self.net = nn.Sequential(
            nn.Linear(stat_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (B, seq_len, 6)
        Returns:
            logits: (B, 1)
        """
        mean = x.mean(dim=1)  # (B, 6)
        std  = x.std(dim=1)   # (B, 6)
        feat = torch.cat([mean, std], dim=1)  # (B, 12)
        return self.net(feat)


if __name__ == '__main__':
    # Sanity check
    model = CheatingLSTM()
    dummy = torch.randn(8, 30, 6)
    logits = model(dummy)
    probs  = model.predict_probability(dummy)

    print(f"✅ CheatingLSTM forward pass OK")
    print(f"   Input:   {tuple(dummy.shape)}")
    print(f"   Logits:  {tuple(logits.shape)}")
    print(f"   Probs:   {[f'{p:.4f}' for p in probs.tolist()]}")
    print(f"   Params:  {sum(p.numel() for p in model.parameters()):,}")
