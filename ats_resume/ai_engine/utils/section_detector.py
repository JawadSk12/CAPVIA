"""
ai_engine/utils/section_detector.py
──────────────────────────────────────
Detects and segments resume sections from raw text.

Approach:
  1. Pattern-based: Match common section header patterns
     (ALL CAPS, bold markers, line-break boundaries)
  2. Fuzzy matching: Handle misspellings like "Experince", "Educaton"
  3. Semantic classification: For ambiguous headers, classify by content

Detected sections:
  - contact       → name, email, phone, location
  - summary       → professional summary / objective
  - education     → degrees, institutions, years
  - experience    → work history
  - skills        → technical and soft skills
  - projects      → personal/academic projects
  - certifications → AWS, Google certs, etc.
  - awards        → honors, scholarships
  - publications  → research papers
  - languages     → spoken languages
"""

from __future__ import annotations

import re
from typing import NamedTuple

# rapidfuzz is optional — fall back to stdlib difflib if not installed
try:
    from rapidfuzz import fuzz as _fuzz, process as _process
    _RAPIDFUZZ_AVAILABLE = True
except ImportError:
    import difflib as _difflib
    _RAPIDFUZZ_AVAILABLE = False

    class _fuzz:  # type: ignore[no-redef]
        """Minimal difflib-based shim for rapidfuzz.fuzz."""
        @staticmethod
        def ratio(s1: str, s2: str) -> float:
            return _difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio() * 100

        @staticmethod
        def token_sort_ratio(s1: str, s2: str) -> float:
            t1 = " ".join(sorted(s1.lower().split()))
            t2 = " ".join(sorted(s2.lower().split()))
            return _difflib.SequenceMatcher(None, t1, t2).ratio() * 100

    class _process:  # type: ignore[no-redef]
        """Minimal difflib-based shim for rapidfuzz.process."""
        @staticmethod
        def extractOne(query: str, choices, scorer=None, score_cutoff: float = 0):
            if not choices:
                return None
            scorer = scorer or _fuzz.ratio
            best = max(choices, key=lambda c: scorer(query, c))
            best_score = scorer(query, best)
            if best_score >= score_cutoff:
                return (best, best_score, choices.index(best) if isinstance(choices, list) else 0)
            return None

# Expose as module-level names matching rapidfuzz API
fuzz = _fuzz
process = _process



# ─── Section Header Patterns ─────────────────────────────────────────────────

# Maps canonical section name → list of header variations to match
SECTION_HEADERS: dict[str, list[str]] = {
    "contact": [
        "contact", "contact information", "personal information",
        "personal details", "profile",
    ],
    "summary": [
        "summary", "professional summary", "about me", "objective",
        "career objective", "professional profile", "overview",
        "profile summary", "executive summary",
    ],
    "education": [
        "education", "academic background", "educational background",
        "qualifications", "academic qualifications", "degrees",
        "academic history",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment", "employment history", "work history",
        "career history", "internships", "internship experience",
        "relevant experience",
    ],
    "skills": [
        "skills", "technical skills", "core skills", "key skills",
        "competencies", "technical competencies", "expertise",
        "technologies", "tech stack", "programming skills",
        "tools and technologies",
    ],
    "projects": [
        "projects", "personal projects", "academic projects",
        "key projects", "notable projects", "portfolio",
        "open source", "side projects",
    ],
    "certifications": [
        "certifications", "certificates", "professional certifications",
        "licenses", "accreditations", "credentials",
    ],
    "awards": [
        "awards", "honors", "achievements", "recognition",
        "accomplishments", "scholarships",
    ],
    "publications": [
        "publications", "research", "papers", "research papers",
        "conference papers", "journal articles",
    ],
    "languages": [
        "languages", "language proficiency", "spoken languages",
    ],
    "interests": [
        "interests", "hobbies", "extracurriculars", "activities",
        "volunteer", "volunteering",
    ],
}

# All known headers in a flat list (for fuzzy matching)
ALL_HEADERS = [h for headers in SECTION_HEADERS.values() for h in headers]

# Reverse map: header string → canonical section name
HEADER_TO_SECTION: dict[str, str] = {
    h: section
    for section, headers in SECTION_HEADERS.items()
    for h in headers
}


class SectionDetector:
    """
    Splits raw resume text into named sections.

    Usage:
        detector = SectionDetector()
        sections = detector.detect(raw_text)
        # → {"summary": "...", "skills": "...", "experience": "..."}
    """

    # Minimum content length for a section to be kept
    MIN_SECTION_LENGTH = 10

    # Fuzzy match threshold (0–100)
    FUZZY_THRESHOLD = 75

    def detect(self, raw_text: str) -> dict[str, str]:
        """
        Split raw resume text into named sections.

        Returns:
            dict mapping canonical section name → section content string
            Unknown sections are stored under "other"
        """
        # Split into lines for processing
        lines = raw_text.split("\n")

        # Pass 1: Find all section boundary lines
        boundaries = self._find_boundaries(lines)

        if not boundaries:
            # No sections detected — return whole text as skills+experience
            return {
                "raw": raw_text,
                "skills": self._extract_skills_fallback(raw_text),
                "experience": raw_text,
            }

        # Pass 2: Extract content between boundaries
        sections = self._extract_sections(lines, boundaries)

        # Pass 3: Post-process (clean, deduplicate)
        sections = self._post_process(sections)

        return sections

    def _find_boundaries(self, lines: list[str]) -> list[tuple[int, str]]:
        """
        Find lines that are section headers.

        Returns list of (line_index, canonical_section_name) tuples,
        sorted by line index.

        Detection heuristics (in order of priority):
        1. Line is ALL CAPS and ≤5 words and matches a known header
        2. Line matches a known header pattern (case-insensitive, stripped)
        3. Line fuzzy-matches a known header with score >= FUZZY_THRESHOLD
        """
        boundaries: list[tuple[int, str]] = []

        for i, line in enumerate(lines):
            line_stripped = line.strip()

            if not line_stripped or len(line_stripped) < 3:
                continue

            # Skip lines that look like content (too long, contain dates, etc.)
            if len(line_stripped) > 60:
                continue

            # Remove common decorators: dashes, underscores, colons
            cleaned = re.sub(r"[_\-=•·:]+", "", line_stripped).strip()

            # Collapse spaced-out letters like "P R O J E C T S" -> "PROJECTS"
            spaced_pattern = re.compile(r'(?:^|\s)([a-zA-Z])(?:\s+([a-zA-Z]))+(?=\s|$)')
            def squash(m):
                return m.group(0).replace(" ", "")
            cleaned = spaced_pattern.sub(squash, cleaned)

            section = self._classify_header(cleaned)

            # Fallback: if not found, try removing ALL spaces (handles "PROFILE EDUCATION" -> "PROFILEEDUCATION")
            # Only do this if the original line looks like a header (all caps or short)
            if not section and " " in cleaned and (line_stripped.isupper() or len(line_stripped) < 30):
                section = self._classify_header(cleaned.replace(" ", ""))

            if section:
                boundaries.append((i, section))

        return boundaries

    def _classify_header(self, text: str) -> str | None:
        """
        Classify a candidate header line as a known section name.
        Returns the canonical section name or None if not a header.
        """
        text_lower = text.lower().strip()

        if not text_lower:
            return None

        # Exact match first (fastest)
        if text_lower in HEADER_TO_SECTION:
            return HEADER_TO_SECTION[text_lower]

        # Fuzzy match against all known headers
        result = process.extractOne(
            text_lower,
            ALL_HEADERS,
            scorer=fuzz.ratio,
        )

        if result and result[1] >= self.FUZZY_THRESHOLD:
            matched_header = result[0]
            return HEADER_TO_SECTION.get(matched_header)

        # ALL CAPS heuristic: "WORK EXPERIENCE" → match against known
        if text.isupper() and len(text.split()) <= 5:
            result = process.extractOne(
                text_lower,
                ALL_HEADERS,
                scorer=fuzz.token_sort_ratio,
            )
            if result and result[1] >= 70:
                return HEADER_TO_SECTION.get(result[0])

        # Substring heuristic for merged words (e.g. "profileeducation", "datascienceskills")
        if len(text_lower) >= 6 and " " not in text_lower:
            # Check in priority order
            for major_header in ["experience", "education", "skills", "projects", "certifications", "publications", "summary", "profile"]:
                if major_header in text_lower:
                    return HEADER_TO_SECTION.get(major_header)

        return None

    def _extract_sections(
        self,
        lines: list[str],
        boundaries: list[tuple[int, str]],
    ) -> dict[str, str]:
        """
        Extract section content between detected boundaries.

        For each boundary pair (start, end), collect all lines
        between them as the section content.
        """
        sections: dict[str, list[str]] = {}

        for idx, (line_idx, section_name) in enumerate(boundaries):
            # Content starts after the header line
            start = line_idx + 1

            # Content ends at the next boundary (or end of document)
            if idx + 1 < len(boundaries):
                end = boundaries[idx + 1][0]
            else:
                end = len(lines)

            content_lines = lines[start:end]
            content = "\n".join(
                line for line in content_lines
                if line.strip()  # skip blank lines
            )

            if len(content) >= self.MIN_SECTION_LENGTH:
                # Multiple sections with same name: concatenate
                if section_name in sections:
                    sections[section_name].append(content)
                else:
                    sections[section_name] = [content]

        return {k: "\n\n".join(v) for k, v in sections.items()}

    def _post_process(self, sections: dict[str, str]) -> dict[str, str]:
        """
        Clean up extracted sections:
        - Normalize whitespace
        - Remove excessive blank lines
        - Ensure key sections exist (even if empty)
        """
        result: dict[str, str] = {}

        for name, content in sections.items():
            # Normalize line endings
            cleaned = re.sub(r"\n{3,}", "\n\n", content)
            cleaned = re.sub(r" {2,}", " ", cleaned)
            cleaned = cleaned.strip()

            if cleaned:
                result[name] = cleaned

        # Ensure critical sections exist
        for section in ("summary", "skills", "experience", "education", "projects"):
            if section not in result:
                result[section] = ""

        return result

    def _extract_skills_fallback(self, text: str) -> str:
        """
        When no section headers detected, try to find skill-like content.
        Looks for lines with multiple comma-separated items.
        """
        lines = text.split("\n")
        skill_lines = [
            line for line in lines
            if len(line.split(",")) >= 3 or ("|" in line and len(line.split("|")) >= 3)
        ]
        return "\n".join(skill_lines) if skill_lines else text[:500]