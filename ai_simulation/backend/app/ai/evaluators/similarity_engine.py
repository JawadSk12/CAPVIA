"""
Similarity Engine
Detects code and text similarity for plagiarism detection
"""

from typing import Dict, Any, List, Tuple
from loguru import logger
from app.ai.utils.embeddings import embeddings_generator
from app.ai.utils.text_processing import text_processor
import difflib
import re


class SimilarityEngine:
    """
    Detects similarity between submissions
    Identifies plagiarism and copied solutions
    """
    
    def __init__(self):
        """Initialize similarity engine"""
        self.embeddings = embeddings_generator
        self.text_proc = text_processor
    
    def calculate_code_similarity(
        self,
        code1: str,
        code2: str,
        language: str
    ) -> Dict[str, Any]:
        """
        Calculate similarity between two code submissions
        
        Args:
            code1: First code snippet
            code2: Second code snippet
            language: Programming language
        
        Returns:
            Similarity result dictionary
        """
        logger.info("Calculating code similarity")
        
        result = {
            "similarity_score": 0.0,
            "is_plagiarized": False,
            "method_scores": {},
            "matching_blocks": []
        }
        
        # 1. Exact match (after normalization)
        exact_score = self._exact_similarity(code1, code2)
        result["method_scores"]["exact_match"] = exact_score
        
        # 2. Structure similarity (AST-based for supported languages)
        struct_score = self._structural_similarity(code1, code2, language)
        result["method_scores"]["structural"] = struct_score
        
        # 3. Token-based similarity
        token_score = self._token_similarity(code1, code2)
        result["method_scores"]["token_based"] = token_score
        
        # 4. Semantic similarity (using embeddings)
        semantic_score = self._semantic_code_similarity(code1, code2)
        result["method_scores"]["semantic"] = semantic_score
        
        # 5. Sequence matching
        seq_match = self._sequence_matching(code1, code2)
        result["method_scores"]["sequence_match"] = seq_match["score"]
        result["matching_blocks"] = seq_match["blocks"]
        
        # Combine scores
        combined_score = self._combine_similarity_scores(result["method_scores"])
        result["similarity_score"] = combined_score
        
        # Determine if plagiarized
        if combined_score >= 0.85:  # 85% threshold
            result["is_plagiarized"] = True
        
        logger.info(f"Similarity score: {combined_score:.2f}")
        
        return result
    
    def calculate_text_similarity(
        self,
        text1: str,
        text2: str
    ) -> Dict[str, Any]:
        """
        Calculate similarity between two text answers
        
        Args:
            text1: First text
            text2: Second text
        
        Returns:
            Similarity result dictionary
        """
        result = {
            "similarity_score": 0.0,
            "is_duplicate": False,
            "method_scores": {}
        }
        
        # 1. Word overlap
        overlap = self.text_proc.calculate_word_overlap(text1, text2)
        result["method_scores"]["word_overlap"] = overlap * 100
        
        # 2. Sequence similarity
        seq_sim = difflib.SequenceMatcher(None, text1, text2).ratio()
        result["method_scores"]["sequence_similarity"] = seq_sim * 100
        
        # 3. Semantic similarity
        semantic = self._semantic_text_similarity(text1, text2)
        result["method_scores"]["semantic"] = semantic * 100
        
        # Combine
        combined = (overlap * 0.3 + seq_sim * 0.3 + semantic * 0.4) * 100
        result["similarity_score"] = combined
        
        if combined >= 80:
            result["is_duplicate"] = True
        
        return result
    
    def compare_against_database(
        self,
        code: str,
        known_solutions: List[str],
        language: str
    ) -> Dict[str, Any]:
        """
        Compare code against database of known solutions
        
        Args:
            code: Code to check
            known_solutions: List of known solutions
            language: Programming language
        
        Returns:
            Comparison result
        """
        result = {
            "max_similarity": 0.0,
            "similar_solutions": [],
            "is_copied": False
        }
        
        for i, solution in enumerate(known_solutions):
            similarity = self.calculate_code_similarity(code, solution, language)
            
            if similarity["similarity_score"] > 0.7:
                result["similar_solutions"].append({
                    "solution_index": i,
                    "similarity_score": similarity["similarity_score"]
                })
            
            result["max_similarity"] = max(
                result["max_similarity"],
                similarity["similarity_score"]
            )
        
        if result["max_similarity"] >= 0.85:
            result["is_copied"] = True
        
        return result
    
    def _exact_similarity(self, code1: str, code2: str) -> float:
        """Calculate exact match similarity"""
        # Normalize code
        norm1 = self._normalize_code(code1)
        norm2 = self._normalize_code(code2)
        
        if norm1 == norm2:
            return 100.0
        
        # Character-level similarity
        matcher = difflib.SequenceMatcher(None, norm1, norm2)
        return matcher.ratio() * 100
    
    def _structural_similarity(
        self,
        code1: str,
        code2: str,
        language: str
    ) -> float:
        """
        Calculate structural similarity using AST
        
        Args:
            code1: First code
            code2: Second code
            language: Programming language
        
        Returns:
            Structural similarity score (0-100)
        """
        if language.lower() == "python":
            return self._python_ast_similarity(code1, code2)
        else:
            # Fallback to token-based for other languages
            return self._token_similarity(code1, code2)
    
    def _python_ast_similarity(self, code1: str, code2: str) -> float:
        """Calculate Python AST similarity"""
        import ast
        
        try:
            tree1 = ast.parse(code1)
            tree2 = ast.parse(code2)
            
            # Compare AST structures
            dump1 = ast.dump(tree1)
            dump2 = ast.dump(tree2)
            
            matcher = difflib.SequenceMatcher(None, dump1, dump2)
            return matcher.ratio() * 100
            
        except SyntaxError:
            logger.warning("Syntax error in code, falling back to text comparison")
            return self._exact_similarity(code1, code2)
    
    def _token_similarity(self, code1: str, code2: str) -> float:
        """Calculate token-based similarity"""
        # Tokenize code
        tokens1 = self._tokenize_code(code1)
        tokens2 = self._tokenize_code(code2)
        
        # Calculate Jaccard similarity
        set1 = set(tokens1)
        set2 = set(tokens2)
        
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        return (intersection / union) * 100
    
    def _semantic_code_similarity(self, code1: str, code2: str) -> float:
        """Calculate semantic similarity using embeddings"""
        try:
            emb1 = self.embeddings.generate_embedding(code1)
            emb2 = self.embeddings.generate_embedding(code2)
            
            similarity = self.embeddings.cosine_similarity(emb1, emb2)
            return similarity * 100
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {str(e)}")
            return 50.0
    
    def _semantic_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic text similarity"""
        try:
            emb1 = self.embeddings.generate_embedding(text1)
            emb2 = self.embeddings.generate_embedding(text2)
            
            return self.embeddings.cosine_similarity(emb1, emb2)
            
        except Exception as e:
            logger.error(f"Error in semantic text similarity: {str(e)}")
            return 0.5
    
    def _sequence_matching(self, code1: str, code2: str) -> Dict[str, Any]:
        """Find matching code blocks"""
        matcher = difflib.SequenceMatcher(None, code1, code2)
        
        blocks = []
        for match in matcher.get_matching_blocks():
            if match.size > 10:  # Only significant blocks
                blocks.append({
                    "start1": match.a,
                    "start2": match.b,
                    "length": match.size,
                    "text": code1[match.a:match.a + match.size]
                })
        
        return {
            "score": matcher.ratio() * 100,
            "blocks": blocks
        }
    
    def _normalize_code(self, code: str) -> str:
        """Normalize code for comparison"""
        # Remove comments
        code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)  # Python comments
        code = re.sub(r'//.*$', '', code, flags=re.MULTILINE)  # JS/Java comments
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)  # Block comments
        
        # Remove extra whitespace
        code = ' '.join(code.split())
        
        # Lowercase (for case-insensitive comparison)
        code = code.lower()
        
        return code
    
    def _tokenize_code(self, code: str) -> List[str]:
        """Tokenize code into meaningful tokens"""
        # Remove strings and comments
        code = re.sub(r'"[^"]*"', '', code)
        code = re.sub(r"'[^']*'", '', code)
        code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
        
        # Extract identifiers and keywords
        tokens = re.findall(r'\b\w+\b', code)
        
        return tokens
    
    def _combine_similarity_scores(self, scores: Dict[str, float]) -> float:
        """Combine different similarity scores"""
        weights = {
            "exact_match": 0.2,
            "structural": 0.3,
            "token_based": 0.2,
            "semantic": 0.2,
            "sequence_match": 0.1
        }
        
        combined = 0.0
        for method, score in scores.items():
            weight = weights.get(method, 0.1)
            combined += score * weight
        
        return combined


# Singleton instance
similarity_engine = SimilarityEngine()