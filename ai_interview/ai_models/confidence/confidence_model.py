"""
Confidence Detection Model — EfficientNet-B0 Architecture
Input:  224×224 RGB face crop
Output: 3-class (confident / nervous / neutral) → scalar confidence score
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


class ConfidenceModel(nn.Module):
    """
    EfficientNet-B0 backbone fine-tuned for 3-class confidence prediction.
    Confidence score = P(confident) * 1.0 + P(neutral) * 0.5 + P(nervous) * 0.0
    """

    CLASS_NAMES = ['confident', 'nervous', 'neutral']
    CLASS_WEIGHTS = torch.tensor([1.0, 0.0, 0.5])  # confident=1, nervous=0, neutral=0.5

    def __init__(self, pretrained: bool = True, dropout: float = 0.4):
        super().__init__()

        # Load EfficientNet-B0 backbone
        weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        self.backbone = models.efficientnet_b0(weights=weights)

        # Replace classifier head
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(p=dropout, inplace=True),
            nn.Linear(in_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout / 2),
            nn.Linear(256, 3),  # 3 classes
        )

        # Initialize new layers
        for layer in self.backbone.classifier:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_uniform_(layer.weight)
                nn.init.zeros_(layer.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (B, 3, 224, 224) — normalized RGB face images
        Returns:
            logits: (B, 3)
        """
        return self.backbone(x)

    def predict_confidence_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Convert logits to a single confidence score in [0, 1].

        Args:
            x: (B, 3, 224, 224)
        Returns:
            scores: (B,) confidence scores
        """
        with torch.no_grad():
            logits = self(x)
            probs  = F.softmax(logits, dim=1)  # (B, 3)

        weights = self.CLASS_WEIGHTS.to(probs.device)  # [1.0, 0.0, 0.5]
        scores  = (probs * weights).sum(dim=1)          # weighted sum per sample
        return scores  # (B,)


class LightweightConfidenceModel(nn.Module):
    """
    Lightweight MobileNetV3-Small for CPU-friendly inference.
    Use when EfficientNet is too slow.
    """

    CLASS_NAMES  = ['confident', 'nervous', 'neutral']
    CLASS_WEIGHTS = torch.tensor([1.0, 0.0, 0.5])

    def __init__(self, pretrained: bool = True, dropout: float = 0.3):
        super().__init__()
        weights = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        self.backbone = models.mobilenet_v3_small(weights=weights)

        in_features = self.backbone.classifier[-1].in_features
        self.backbone.classifier[-1] = nn.Linear(in_features, 3)
        nn.init.xavier_uniform_(self.backbone.classifier[-1].weight)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def predict_confidence_score(self, x: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            logits = self(x)
            probs  = F.softmax(logits, dim=1)
        weights = self.CLASS_WEIGHTS.to(probs.device)
        return (probs * weights).sum(dim=1)


def get_model(variant: str = 'efficientnet', pretrained: bool = True) -> nn.Module:
    """Factory function to get the desired model variant."""
    if variant == 'mobilenet':
        return LightweightConfidenceModel(pretrained=pretrained)
    return ConfidenceModel(pretrained=pretrained)


if __name__ == '__main__':
    # Quick sanity check
    model = ConfidenceModel(pretrained=False)
    dummy_input = torch.randn(4, 3, 224, 224)
    logits = model(dummy_input)
    scores = model.predict_confidence_score(dummy_input)

    print(f"✅ ConfidenceModel forward pass OK")
    print(f"   Input:  {tuple(dummy_input.shape)}")
    print(f"   Logits: {tuple(logits.shape)}")
    print(f"   Scores: {scores.tolist()}")
    print(f"   Params: {sum(p.numel() for p in model.parameters()):,}")
