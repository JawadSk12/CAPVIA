"""
Text Processing Utilities
Text normalization, tokenization, and analysis
"""

import re
from typing import List, Set, Dict
import string
from collections import Counter


class TextProcessor:
    """
    Processes and analyzes text
    Provides utilities for answer evaluation
    """
    
    def __init__(self):
        """Initialize text processor"""
        self.stop_words = self._load_stop_words()
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text for comparison
        
        Args:
            text: Input text
        
        Returns:
            Normalized text
        """
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove punctuation (keep some for code)
        # Be careful not to remove code-relevant characters
        return text
    
    def extract_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract keywords from text
        
        Args:
            text: Input text
            top_n: Number of keywords to extract
        
        Returns:
            List of keywords
        """
        # Normalize
        normalized = self.normalize_text(text)
        
        # Tokenize
        tokens = self.tokenize(normalized)
        
        # Remove stop words
        tokens = [t for t in tokens if t not in self.stop_words]
        
        # Count frequency
        word_freq = Counter(tokens)
        
        # Get top N
        keywords = [word for word, _ in word_freq.most_common(top_n)]
        
        return keywords
    
    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words
        
        Args:
            text: Input text
        
        Returns:
            List of tokens
        """
        # Split on whitespace and punctuation
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def calculate_word_overlap(self, text1: str, text2: str) -> float:
        """
        Calculate word overlap between two texts
        
        Args:
            text1: First text
            text2: Second text
        
        Returns:
            Overlap ratio (0-1)
        """
        tokens1 = set(self.tokenize(text1))
        tokens2 = set(self.tokenize(text2))
        
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = tokens1 & tokens2
        union = tokens1 | tokens2
        
        return len(intersection) / len(union)
    
    def contains_keywords(
        self,
        text: str,
        keywords: List[str],
        case_sensitive: bool = False
    ) -> Dict[str, bool]:
        """
        Check which keywords are present in text
        
        Args:
            text: Text to search
            keywords: Keywords to find
            case_sensitive: Whether search is case-sensitive
        
        Returns:
            Dictionary mapping keyword to presence
        """
        if not case_sensitive:
            text = text.lower()
            keywords = [k.lower() for k in keywords]
        
        results = {}
        for keyword in keywords:
            results[keyword] = keyword in text
        
        return results
    
    def extract_code_blocks(self, text: str) -> List[str]:
        """
        Extract code blocks from text
        
        Args:
            text: Text containing code blocks
        
        Returns:
            List of code blocks
        """
        # Match markdown code blocks
        pattern = r'```[\w]*\n(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL)
        
        return matches
    
    def calculate_readability_score(self, text: str) -> float:
        """
        Calculate simple readability score
        
        Args:
            text: Input text
        
        Returns:
            Readability score (0-100)
        """
        sentences = text.split('.')
        words = self.tokenize(text)
        
        if not sentences or not words:
            return 0.0
        
        avg_words_per_sentence = len(words) / len(sentences)
        avg_word_length = sum(len(w) for w in words) / len(words)
        
        # Simple formula (higher = easier to read)
        score = 100 - (avg_words_per_sentence * 2) - (avg_word_length * 5)
        
        return max(0.0, min(100.0, score))
    
    def detect_code_pattern(self, text: str, language: str) -> bool:
        """
        Detect if text contains code patterns
        
        Args:
            text: Text to analyze
            language: Programming language
        
        Returns:
            True if code patterns detected
        """
        if language.lower() == "python":
            patterns = [r'def\s+\w+', r'import\s+\w+', r'class\s+\w+', r'if\s+.*:']
        elif language.lower() == "javascript":
            patterns = [r'function\s+\w+', r'const\s+\w+', r'let\s+\w+', r'=>']
        elif language.lower() == "java":
            patterns = [r'public\s+class', r'private\s+\w+', r'void\s+\w+']
        else:
            return False
        
        for pattern in patterns:
            if re.search(pattern, text):
                return True
        
        return False
    
    def _load_stop_words(self) -> Set[str]:
        """Load common stop words"""
        return {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have'
        }


# Singleton instance
text_processor = TextProcessor()