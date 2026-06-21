"""
ai_engine/vector_store/embedder.py
──────────────────────────────────
Handles generation of vector embeddings for resumes and skills.

Uses the Sentence-Transformers library with the 'all-mpnet-base-v2' model,
which provides a 768-dimensional vector optimized for semantic similarity.

Features:
  - Singleton-like model loading (loads once per worker)
  - Text truncation to model limits (384 tokens)
  - Multi-view embedding (full text, skills only, experience only)
"""

from __future__ import annotations
import logging
import numpy as np
from typing import Dict, List, Any

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    # Fallback for environment issues
    SentenceTransformer = None

logger = logging.getLogger(__name__)

class ResumeEmbedder:
    """
    Generates semantic embeddings for resumes using Sentence-BERT.
    """
    
    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        self.model_name = model_name
        self._model = None
        
    @property
    def model(self):
        """Lazy-load the transformer model."""
        if self._model is None:
            if SentenceTransformer is None:
                raise ImportError("sentence-transformers is not installed. Run pip install sentence-transformers.")
            
            logger.info(f"Loading SentenceTransformer model: {self.model_name}")
            try:
                self._model = SentenceTransformer(self.model_name, device="cpu")
            except Exception as e:
                logger.error(f"Failed to load model {self.model_name}: {e}")
                # Fallback to a smaller, faster model if mpnet fails
                logger.info("Falling back to all-MiniLM-L6-v2")
                self._model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
                
        return self._model

    def generate_resume_embeddings(
        self, 
        full_text: str, 
        skills_text: str = "", 
        experience_text: str = ""
    ) -> Dict[str, List[float]]:
        """
        Generate multiple embeddings for different resume 'views'.
        
        Returns:
            Dict mapping view name ('full', 'skills', 'experience') to 768-dim vector.
        """
        views = {
            "full": full_text or "",
            "skills": skills_text or "",
            "experience": experience_text or ""
        }
        
        results = {}
        for name, text in views.items():
            if not text:
                # Return zero vector if no text
                dim = 768 if "mpnet" in self.model_name else 384
                results[name] = [0.0] * dim
                continue
                
            # Generate embedding (numpy array -> list of floats)
            embedding = self.model.encode(text, show_progress_bar=False)
            results[name] = embedding.tolist()
            
        return results

    def embed_skills(self, skills: List[str]) -> List[np.ndarray]:
        """
        Batch embed a list of individual skills.
        Used for fine-grained semantic skill matching.
        """
        if not skills:
            return []
        
        embeddings = self.model.encode(skills, batch_size=32, show_progress_bar=False)
        return list(embeddings)

    def compute_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Compute cosine similarity between two vectors."""
        a = np.array(vec1)
        b = np.array(vec2)
        
        if np.all(a == 0) or np.all(b == 0):
            return 0.0
            
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
