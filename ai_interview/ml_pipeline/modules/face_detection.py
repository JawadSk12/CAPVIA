"""
Face Detection Module
Uses MediaPipe Face Detection (works on macOS ARM)
and InsightFace ArcFace for identity verification
"""

import cv2
import numpy as np
import mediapipe as mp
from insightface.app import FaceAnalysis
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class FaceDetection:
    """Face detection result"""
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    confidence: float


class FaceDetector:
    """MediaPipe-based face detector (compatible with macOS)"""
    
    def __init__(self, min_confidence: float = 0.7):
        self.min_confidence = min_confidence
        mp_face_detection = mp.solutions.face_detection
        self.face_detection = mp_face_detection.FaceDetection(
            model_selection=1,  # 1 = full range
            min_detection_confidence=min_confidence
        )
    
    def detect(self, image: np.ndarray) -> List[FaceDetection]:
        """Detect all faces in image"""
        h, w = image.shape[:2]
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb)
        
        detections = []
        if results.detections:
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                
                # Convert relative to absolute coordinates
                x1 = int(bbox.xmin * w)
                y1 = int(bbox.ymin * h)
                x2 = int((bbox.xmin + bbox.width) * w)
                y2 = int((bbox.ymin + bbox.height) * h)
                
                detections.append(FaceDetection(
                    bbox=(x1, y1, x2, y2),
                    confidence=detection.score[0]
                ))
        
        return detections


class IdentityVerifier:
    """ArcFace-based identity verification"""
    
    def __init__(self, use_gpu: bool = False):
        # Force CPU on macOS for compatibility
        self.use_gpu = False
        
        providers = ['CPUExecutionProvider']
        self.app = FaceAnalysis(name='buffalo_l', providers=providers)
        self.app.prepare(ctx_id=-1, det_size=(640, 640))
        
        self.reference_embedding = None
    
    def set_reference(self, image: np.ndarray) -> bool:
        """Set reference face from first frame"""
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        faces = self.app.get(rgb)
        
        if len(faces) == 1:
            self.reference_embedding = faces[0].embedding
            return True
        return False
    
    def verify(self, image: np.ndarray, threshold: float = 0.6) -> Tuple[int, List[bool]]:
        """
        Verify faces in image against reference
        
        Returns:
            (face_count, [is_same_person for each face])
        """
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        faces = self.app.get(rgb)
        
        if self.reference_embedding is None:
            return len(faces), []
        
        verifications = []
        for face in faces:
            # Calculate cosine similarity
            similarity = np.dot(face.embedding, self.reference_embedding) / (
                np.linalg.norm(face.embedding) * np.linalg.norm(self.reference_embedding)
            )
            verifications.append(similarity >= threshold)
        
        return len(faces), verifications
