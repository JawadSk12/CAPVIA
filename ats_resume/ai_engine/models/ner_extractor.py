"""
ai_engine/models/ner_extractor.py
───────────────────────────────────
Named Entity Recognition (NER) for resume parsing.

Extracts structured data from resume sections using:
  1. spaCy PhraseMatcher  → Skills (10,000+ known skill patterns)
  2. spaCy NER            → Organizations (company names), Dates, GPE (locations)
  3. Regex patterns        → Years of experience, GPA, degree names
  4. Custom logic          → Project extraction, certification parsing

Output structure:
    {
      "skills": [{"skill": "Python", "category": "Programming", "seniority": "BASIC"}],
      "experience_years": 3.5,
      "companies": [{"name": "Google", "role": "SWE Intern", "duration": "2 years"}],
      "education": [{"degree": "B.Tech CSE", "institution": "IIT Delhi", "cgpa": 8.7}],
      "projects": [{"name": "...", "description": "...", "tech_stack": [...]}],
      "certifications": [{"name": "AWS SAA", "issuer": "Amazon", "year": 2023}],
      "tools": [{"skill": "Docker", "category": "Tool"}],
      "contact": {"email": "...", "phone": "...", "linkedin": "...", "github": "..."}
    }
"""

from __future__ import annotations

import re
from datetime import datetime

import spacy
from spacy.matcher import PhraseMatcher

from ai_engine.nlp.ontology import OntologyManager
from ai_engine.utils.text_cleaner import TextCleaner


class NERExtractor:
    """
    Extracts structured entities from resume sections.

    Lazy-loads spaCy models on first use to avoid startup overhead.
    Uses the transformer model (en_core_web_trf) for highest accuracy.
    Falls back to small model (en_core_web_sm) if transformer unavailable.
    """

    def __init__(self) -> None:
        self.ontology = OntologyManager()
        self.text_cleaner = TextCleaner()
        self._nlp = None
        self._skill_matcher = None

    @property
    def nlp(self):
        """Lazy-load spaCy model."""
        if self._nlp is None:
            try:
                self._nlp = spacy.load("en_core_web_trf")
            except OSError:
                # Fallback to small model if transformer not installed
                self._nlp = spacy.load("en_core_web_sm")
        return self._nlp

    @property
    def skill_matcher(self):
        """Lazy-build PhraseMatcher for skill entity detection."""
        if self._skill_matcher is None:
            matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
            patterns = [
                self.nlp.make_doc(skill.lower())
                for skill in self.ontology.all_skills
            ]
            # Add in batches to avoid memory issues
            batch_size = 500
            for i in range(0, len(patterns), batch_size):
                matcher.add("SKILL", patterns[i:i + batch_size])
            self._skill_matcher = matcher
        return self._skill_matcher

    def extract(self, sections: dict[str, str]) -> dict:
        """
        Main extraction method. Processes all sections.

        Args:
            sections: Dict from SectionDetector
                      {"skills": "...", "experience": "...", ...}

        Returns:
            Structured entities dict
        """
        return {
            "skills":           self._extract_skills(sections.get("skills", "")),
            "experience_years": self._extract_experience_years(sections),
            "companies":        self._extract_companies(sections.get("experience", "")),
            "education":        self._extract_education(sections.get("education", "")),
            "projects":         self._extract_projects(sections.get("projects", "")),
            "certifications":   self._extract_certifications(
                                    sections.get("certifications", "")
                                ),
            "contact":          self._extract_contact(sections),
        }

    # ─── Skill Extraction ─────────────────────────────────────────────────────

    def _extract_skills(self, skills_text: str) -> list[dict]:
        """
        Extract skills using PhraseMatcher against the ontology.

        Also scans experience and projects for implicit skill mentions.
        Returns deduplicated list with metadata.
        """
        if not skills_text:
            return []

        doc = self.nlp(skills_text[:5000])  # Cap for performance
        matches = self.skill_matcher(doc)

        seen: set[str] = set()
        skills: list[dict] = []

        for _, start, end in matches:
            raw_skill = doc[start:end].text
            normalized = self.text_cleaner.normalize_skill_name(raw_skill)
            normalized_lower = normalized.lower()

            if normalized_lower in seen:
                continue

            seen.add(normalized_lower)
            ontology_info = self.ontology.get_skill_info(normalized)

            skills.append({
                "skill": normalized,
                "raw": raw_skill,
                "category": ontology_info.get("category", "Other"),
                "seniority": ontology_info.get("seniority_threshold", "BASIC"),
                "domain": ontology_info.get("domains", []),
            })

        return skills

    # ─── Experience Years Extraction ──────────────────────────────────────────

    def _extract_experience_years(self, sections: dict[str, str]) -> float:
        """
        Estimate total years of professional experience from date ranges.

        Strategy:
        1. Find date ranges in experience section (2020 - 2023, Jan 2021 - Present)
        2. Parse each range and sum durations
        3. Fallback: find explicit mentions ("3 years experience")
        """
        exp_text = sections.get("experience", "")
        all_text = exp_text

        total_months = self._sum_date_ranges(all_text)

        if total_months > 0:
            return round(total_months / 12, 1)

        # Fallback: explicit mention
        explicit = self._extract_explicit_years(all_text)
        return explicit if explicit > 0 else 0.0

    def _sum_date_ranges(self, text: str) -> int:
        """
        Parse date ranges and sum their durations in months.

        Patterns:
          "Jan 2020 – Present"
          "2019 - 2021"
          "June 2022 to December 2023"
        """
        current_year = datetime.now().year
        current_month = datetime.now().month
        total_months = 0

        # Pattern: Month Year – Month Year or Present
        date_range_pattern = re.compile(
            r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
            r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
            r"Dec(?:ember)?|[\d]{4})"
            r"\s*(?:,\s*)?(\d{4})?"
            r"\s*[-–—to]+\s*"
            r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
            r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
            r"Dec(?:ember)?|Present|Current|Now|[\d]{4})"
            r"\s*(?:,\s*)?(\d{4})?",
            re.IGNORECASE,
        )

        MONTH_MAP = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }

        for match in date_range_pattern.finditer(text):
            try:
                start_token = match.group(1).lower()[:3]
                start_year_raw = match.group(2)
                end_token = match.group(3)
                end_year_raw = match.group(4)

                # Parse start
                if start_token.isdigit():
                    start_year, start_month = int(start_token), 1
                else:
                    start_month = MONTH_MAP.get(start_token, 1)
                    start_year = int(start_year_raw) if start_year_raw else current_year

                # Parse end
                end_lower = end_token.lower()
                if end_lower in ("present", "current", "now"):
                    end_year, end_month = current_year, current_month
                elif end_lower[:3].isdigit():
                    end_year, end_month = int(end_token[:4]), 12
                elif end_lower[:3] in MONTH_MAP:
                    end_month = MONTH_MAP[end_lower[:3]]
                    end_year = int(end_year_raw) if end_year_raw else current_year
                else:
                    continue

                months = (end_year - start_year) * 12 + (end_month - start_month)
                if 0 < months < 600:  # sanity check
                    total_months += months

            except (ValueError, AttributeError):
                continue

        return total_months

    def _extract_explicit_years(self, text: str) -> float:
        """Extract explicit mentions like '3 years of experience'."""
        patterns = [
            r"(\d+(?:\.\d+)?)\+?\s*years?\s+(?:of\s+)?experience",
            r"(\d+(?:\.\d+)?)\s*\+\s*years?\s+(?:of\s+)?experience",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return float(match.group(1))
        return 0.0

    # ─── Company Extraction ───────────────────────────────────────────────────

    def _extract_companies(self, exp_text: str) -> list[dict]:
        """
        Extract company names, roles, and durations from experience section.
        Uses spaCy ORG entity recognition.
        """
        if not exp_text:
            return []

        doc = self.nlp(exp_text[:5000])
        companies = []

        seen_orgs: set[str] = set()
        for ent in doc.ents:
            if ent.label_ == "ORG" and ent.text not in seen_orgs:
                seen_orgs.add(ent.text)
                companies.append({
                    "name": ent.text,
                    "role": self._extract_role_near_org(exp_text, ent.text),
                    "duration": None,  # TODO: correlate with date ranges
                })

        return companies[:10]  # cap at 10

    def _extract_role_near_org(self, text: str, org_name: str) -> str | None:
        """Extract job title near a company name."""
        # Look for role patterns in vicinity of company name
        role_patterns = [
            r"(Software Engineer|Developer|Intern|Analyst|Designer|Manager|"
            r"Lead|Architect|Consultant|Researcher|Scientist|Engineer|"
            r"Product Manager|Data Scientist|ML Engineer)",
        ]
        for pattern in role_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    # ─── Education Extraction ─────────────────────────────────────────────────

    def _extract_education(self, edu_text: str) -> list[dict]:
        """
        Extract degree, institution, year, and GPA from education section.
        """
        if not edu_text:
            return []

        education = []

        # Degree patterns
        degree_pattern = re.compile(
            r"(B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|PhD|Ph\.D|"
            r"Bachelor|Master|Associate|Diploma|MBA|BCA|MCA|B\.?C\.?A|M\.?C\.?A)"
            r"(?:\s+(?:in|of)\s+([A-Za-z\s&]+?))?",
            re.IGNORECASE,
        )

        # GPA/CGPA patterns
        gpa_pattern = re.compile(
            r"(?:GPA|CGPA|Score|Percentage|Grade)[:\s]+(\d+(?:\.\d+)?)\s*(?:/\s*(\d+))?",
            re.IGNORECASE,
        )

        # Year pattern
        year_pattern = re.compile(r"\b(20\d{2}|19\d{2})\b")

        doc = self.nlp(edu_text[:3000])

        for match in degree_pattern.finditer(edu_text):
            entry: dict = {
                "degree": match.group(0).strip(),
                "field": (match.group(2) or "").strip() or None,
                "institution": None,
                "year": None,
                "cgpa": None,
            }

            # Find institution (ORG entity near this match)
            for ent in doc.ents:
                if ent.label_ == "ORG":
                    entry["institution"] = ent.text
                    break

            # Find year
            years = year_pattern.findall(edu_text)
            if years:
                entry["year"] = max(int(y) for y in years)

            # Find GPA
            gpa_match = gpa_pattern.search(edu_text)
            if gpa_match:
                raw_gpa = float(gpa_match.group(1))
                max_gpa = float(gpa_match.group(2)) if gpa_match.group(2) else None
                # Normalize to 10-point scale if on 4-point scale
                if max_gpa and max_gpa <= 4.5:
                    raw_gpa = (raw_gpa / max_gpa) * 10
                entry["cgpa"] = round(raw_gpa, 2)

            education.append(entry)

        return education[:5]  # Cap

    # ─── Project Extraction ───────────────────────────────────────────────────

    def _extract_projects(self, proj_text: str) -> list[dict]:
        """
        Extract project entries from the projects section.

        Each project has:
          - name: project title
          - description: summary text
          - tech_stack: list of technologies mentioned
          - links: GitHub/demo URLs
        """
        if not proj_text:
            return []

        projects = []

        # Split on blank lines or numbered entries
        raw_entries = re.split(r"\n(?=\n|\d+\.|[A-Z])", proj_text)

        for entry in raw_entries:
            entry = entry.strip()
            if len(entry) < 20:
                continue

            # First line is usually the project name
            lines = entry.split("\n")
            name = lines[0].strip()[:100]

            description = " ".join(lines[1:]).strip()[:500]

            # Extract tech stack from this entry
            doc = self.nlp(entry[:2000])
            matches = self.skill_matcher(doc)
            tech_stack = list({
                self.text_cleaner.normalize_skill_name(doc[s:e].text)
                for _, s, e in matches
            })

            # Extract links
            links = self.text_cleaner.extract_urls(entry)

            projects.append({
                "name": name,
                "description": description,
                "tech_stack": tech_stack[:15],
                "links": links[:2],
            })

        return projects[:10]

    # ─── Certification Extraction ─────────────────────────────────────────────

    def _extract_certifications(self, cert_text: str) -> list[dict]:
        """Extract certification names, issuers, and years."""
        if not cert_text:
            return []

        known_issuers = {
            "aws": "Amazon Web Services",
            "amazon": "Amazon Web Services",
            "google": "Google",
            "microsoft": "Microsoft",
            "oracle": "Oracle",
            "coursera": "Coursera",
            "udemy": "Udemy",
            "cisco": "Cisco",
            "meta": "Meta",
        }

        certifications = []
        year_pattern = re.compile(r"\b(20\d{2}|19\d{2})\b")

        for line in cert_text.split("\n"):
            line = line.strip()
            if len(line) < 5:
                continue

            cert: dict = {"name": line[:200], "issuer": None, "year": None}

            # Find issuer
            line_lower = line.lower()
            for key, issuer in known_issuers.items():
                if key in line_lower:
                    cert["issuer"] = issuer
                    break

            # Find year
            year_match = year_pattern.search(line)
            if year_match:
                cert["year"] = int(year_match.group(1))

            certifications.append(cert)

        return certifications[:10]

    # ─── Contact Extraction ───────────────────────────────────────────────────

    def _extract_contact(self, sections: dict[str, str]) -> dict:
        """Extract contact information from the full document."""
        full_text = "\n".join(sections.values())[:3000]

        emails = self.text_cleaner.extract_emails(full_text)
        phones = self.text_cleaner.extract_phone_numbers(full_text)
        urls = self.text_cleaner.extract_urls(full_text)

        linkedin = next((u for u in urls if "linkedin.com" in u), None)
        github = next((u for u in urls if "github.com" in u), None)
        portfolio = next((
            u for u in urls
            if "linkedin.com" not in u and "github.com" not in u
        ), None)

        return {
            "email": emails[0] if emails else None,
            "phone": phones[0] if phones else None,
            "linkedin": linkedin,
            "github": github,
            "portfolio": portfolio,
        }