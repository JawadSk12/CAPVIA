"""
ai_engine/utils/text_cleaner.py
─────────────────────────────────
Text cleaning and normalization utilities.

Handles common issues in OCR-extracted and copy-pasted resume text:
  - Unicode ligatures (ﬁ → fi, ﬀ → ff)
  - Encoding artifacts (â€" → —, Ã© → é)
  - PDF extraction artifacts (hyphenation at line breaks)
  - Excessive whitespace and blank lines
  - Control characters and null bytes
"""

from __future__ import annotations

import re
import unicodedata


class TextCleaner:
    """
    Clean and normalize extracted resume text.

    Usage:
        cleaner = TextCleaner()
        clean_text = cleaner.clean(raw_text)
    """

    # Unicode ligature replacements
    LIGATURE_MAP = {
        "\ufb00": "ff",   # ﬀ
        "\ufb01": "fi",   # ﬁ
        "\ufb02": "fl",   # ﬂ
        "\ufb03": "ffi",  # ﬃ
        "\ufb04": "ffl",  # ﬄ
        "\u2019": "'",    # right single quotation mark
        "\u2018": "'",    # left single quotation mark
        "\u201c": '"',    # left double quotation mark
        "\u201d": '"',    # right double quotation mark
        "\u2013": "-",    # en dash
        "\u2014": "-",    # em dash
        "\u2022": "•",    # bullet
        "\u00a0": " ",    # non-breaking space
        "\u200b": "",     # zero-width space
        "\u200c": "",     # zero-width non-joiner
        "\u200d": "",     # zero-width joiner
        "\ufeff": "",     # BOM
    }

    def clean(self, text: str) -> str:
        """
        Apply the full cleaning pipeline.

        Pipeline:
          1. Remove null bytes and control chars
          2. Replace ligatures and special unicode
          3. NFKC normalization (canonical + compatibility)
          4. Fix PDF line-break hyphenation
          5. Normalize whitespace
          6. Remove very long tokens (likely OCR garbage)

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text string
        """
        if not text:
            return ""

        # Step 1: Remove null bytes and non-printable control chars
        # Keep: \n (10), \t (9), \r (13), and printable chars
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Step 2: Replace known Unicode artifacts
        for char, replacement in self.LIGATURE_MAP.items():
            text = text.replace(char, replacement)

        # Step 3: Unicode NFKC normalization
        # Converts ＡＢＣ (fullwidth) → ABC, ℌ → H, etc.
        text = unicodedata.normalize("NFKC", text)

        # Step 4: Fix PDF hyphenation at line breaks
        # "Devel-\nopment" → "Development"
        text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

        # Step 5: Normalize whitespace
        # Multiple spaces → single space
        text = re.sub(r" +", " ", text)
        # More than 2 consecutive newlines → 2 newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Tabs → spaces
        text = text.replace("\t", " ")

        # Step 6: Remove very long "tokens" (likely OCR garbage)
        # Real words are rarely >40 chars
        text = re.sub(r"\b\S{50,}\b", "", text)

        # Step 7: Strip
        text = text.strip()

        return text

    def normalize_skill_name(self, skill: str) -> str:
        """
        Normalize a skill name for consistent matching.

        Examples:
          "react.js" → "React.js"
          "PYTHON" → "Python"
          "node js" → "Node.js"
          "machine learning" → "Machine Learning"
        """
        if not skill:
            return ""

        skill = skill.strip()

        # Known normalizations
        known = {
            "react": "React",
            "reactjs": "React",
            "react.js": "React",
            "nodejs": "Node.js",
            "node js": "Node.js",
            "node.js": "Node.js",
            "vuejs": "Vue.js",
            "vue": "Vue.js",
            "vue.js": "Vue.js",
            "angularjs": "Angular",
            "angular": "Angular",
            "postgresql": "PostgreSQL",
            "postgres": "PostgreSQL",
            "mongodb": "MongoDB",
            "mysql": "MySQL",
            "javascript": "JavaScript",
            "js": "JavaScript",
            "typescript": "TypeScript",
            "ts": "TypeScript",
            "python": "Python",
            "tensorflow": "TensorFlow",
            "tf": "TensorFlow",
            "pytorch": "PyTorch",
            "scikit learn": "Scikit-learn",
            "scikit-learn": "Scikit-learn",
            "sklearn": "Scikit-learn",
            "kubernetes": "Kubernetes",
            "k8s": "Kubernetes",
            "docker": "Docker",
            "aws": "AWS",
            "gcp": "GCP",
            "azure": "Azure",
            "ci/cd": "CI/CD",
            "cicd": "CI/CD",
            "github actions": "GitHub Actions",
            "github": "GitHub",
            "git": "Git",
            "html5": "HTML",
            "html": "HTML",
            "css3": "CSS",
            "css": "CSS",
            "sql": "SQL",
            "nosql": "NoSQL",
            "rest api": "REST API",
            "restful": "REST API",
            "graphql": "GraphQL",
        }

        lower = skill.lower()
        if lower in known:
            return known[lower]

        # Title case for multi-word skills
        # But preserve known acronyms
        acronyms = {"API", "SQL", "NoSQL", "REST", "AWS", "GCP", "HTML", "CSS",
                    "CI/CD", "UI/UX", "OOP", "MVC", "MVP", "SDK", "CLI"}

        words = skill.split()
        normalized_words = []
        for word in words:
            if word.upper() in acronyms:
                normalized_words.append(word.upper())
            else:
                normalized_words.append(word.capitalize())

        return " ".join(normalized_words)

    def extract_emails(self, text: str) -> list[str]:
        """Extract email addresses from text."""
        pattern = r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"
        return re.findall(pattern, text)

    def extract_phone_numbers(self, text: str) -> list[str]:
        """Extract phone numbers from text (various formats)."""
        pattern = r"(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}"
        return re.findall(pattern, text)

    def extract_urls(self, text: str) -> list[str]:
        """Extract URLs (GitHub, LinkedIn, portfolio)."""
        pattern = r"https?://[^\s<>\"{}|\\^`\[\]]+"
        return re.findall(pattern, text)