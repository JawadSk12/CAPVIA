"""
Embeddings Utility
Generate text embeddings for semantic analysis
"""

from typing import List
import openai
from loguru import logger
from app.core.config import settings
import numpy as np


class EmbeddingsGenerator:
    """
    Generates embeddings for text using OpenAI
    Used for semantic similarity and AI detection
    """
    
    def __init__(self):
        """Initialize OpenAI client"""
        openai.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_EMBEDDING_MODEL
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text
        
        Args:
            text: Input text
        
        Returns:
            List of floats representing the embedding
        """
        try:
            response = openai.embeddings.create(
                model=self.model,
                input=text
            )
            
            embedding = response.data[0].embedding
            logger.debug(f"Generated embedding of size {len(embedding)}")
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            # Return zero vector as fallback
            return [0.0] * 1536  # Default embedding size
    
    def generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of input texts
        
        Returns:
            List of embeddings
        """
        try:
            response = openai.embeddings.create(
                model=self.model,
                input=texts
            )
            
            embeddings = [item.embedding for item in response.data]
            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {str(e)}")
            return [[0.0] * 1536 for _ in texts]
    
    def cosine_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding
            embedding2: Second embedding
        
        Returns:
            Similarity score (0-1)
        """
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Ensure result is between 0 and 1
            similarity = max(0.0, min(1.0, similarity))
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {str(e)}")
            return 0.0
    
    def find_most_similar(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[tuple]:
        """
        Find most similar embeddings to query
        
        Args:
            query_embedding: Query embedding
            candidate_embeddings: List of candidate embeddings
            top_k: Number of top results to return
        
        Returns:
            List of (index, similarity_score) tuples
        """
        similarities = []
        
        for i, candidate in enumerate(candidate_embeddings):
            similarity = self.cosine_similarity(query_embedding, candidate)
            similarities.append((i, similarity))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]


# Singleton instance
embeddings_generator = EmbeddingsGenerator()