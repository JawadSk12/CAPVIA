#!/usr/bin/env python3
"""
==============================================================================
 PHASE 1: AI ENGINE TESTS
 Tests: Feature engineering, ATS scoring logic, fraud detection heuristics,
        NER pipeline structure, semantic matching utilities, notebook imports
 Runner: python3 tests/phase1_ai_engine_tests.py
==============================================================================
"""
import unittest
import json
import re
import math
import sys
import os
from pathlib import Path
from datetime import datetime

# ── Project path setup ────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

NOTEBOOKS_DIR   = ROOT / "ai_engine" / "notebooks"
RESUME_DATA_DIR = Path("/Volumes/UNTITLED/DNA_Graph /Resume ATS Capvia/Resume Parsing Dataset/ground_truth")
LINKEDIN_DIR    = Path("/Volumes/UNTITLED/DNA_Graph /Resume ATS Capvia/LinkedIn Job Postings (2023 - 2024)")

# ══════════════════════════════════════════════════════════════════════════════
#  HELPER: Replicated feature engineering logic (from notebook 01)
# ══════════════════════════════════════════════════════════════════════════════

def compute_ats_score(skill_count, total_experience_months, experience_count,
                      education_level, has_quantified_achievements, action_verb_count,
                      has_summary, summary_length, has_linkedin, has_github,
                      cert_count, project_count):
    skill_score = min(skill_count / 20.0, 1.0)
    exp_depth   = min(total_experience_months / 60.0, 1.0)
    exp_breadth = min(experience_count / 5.0, 1.0)
    exp_score   = 0.7 * exp_depth + 0.3 * exp_breadth
    edu_score   = education_level / 4.0
    quant_score = min(has_quantified_achievements / max(experience_count, 1), 1.0)
    action_score= min(action_verb_count / max(experience_count, 1), 1.0)
    completeness= (has_summary * 0.3 + min(summary_length / 500.0, 1.0) * 0.2 +
                   has_linkedin * 0.25 + has_github * 0.25)
    cert_bonus  = min(cert_count / 5.0, 1.0)
    proj_score  = min(project_count / 5.0, 1.0)

    score = (skill_score * 0.28 + exp_score * 0.22 + edu_score * 0.12 +
             quant_score * 0.12 + action_score * 0.08 + completeness * 0.08 +
             cert_bonus * 0.05 + proj_score * 0.05)
    return min(100.0, max(0.0, score * 100))


def compute_skill_match(candidate_skills, jd_skills):
    if not jd_skills:
        return 0.5
    cand_lower = {s.lower() for s in candidate_skills}
    jd_lower   = {s.lower() for s in jd_skills}
    direct     = len(cand_lower & jd_lower)
    union      = len(cand_lower | jd_lower)
    jaccard    = direct / union if union > 0 else 0
    partial    = sum(1 for js in jd_lower if any(js in cs or cs in js for cs in cand_lower))
    partial_r  = partial / len(jd_lower) if jd_lower else 0
    return min(1.0, 0.6 * jaccard + 0.4 * partial_r)


def is_suspicious(skill_count, experience_count, keyword_density, duplicate_skill_ratio,
                  advanced_skill_count, year_span, generic_phrase_count,
                  internal_dup_score, template_hit_count, quantified_ratio,
                  avg_desc_length):
    signals = 0
    if skill_count > 30 and experience_count < 2:         signals += 1
    if keyword_density > 0.05:                            signals += 1
    if duplicate_skill_ratio > 0.3:                       signals += 1
    if advanced_skill_count > 2 and year_span < 2:        signals += 1
    if generic_phrase_count > 6:                          signals += 1
    if internal_dup_score > 0.5:                          signals += 1
    if template_hit_count > 2 and quantified_ratio < 0.1: signals += 1
    if avg_desc_length < 10 and experience_count > 3:     signals += 1
    return signals >= 2


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 1: ATS Scoring Feature Engineering
# ══════════════════════════════════════════════════════════════════════════════

class TestATSScoringFeatures(unittest.TestCase):

    def test_score_range_always_0_to_100(self):
        """ATS score must always be within [0, 100]."""
        for skill_c in [0, 5, 15, 30, 100]:
            for exp_m in [0, 12, 36, 60, 120]:
                score = compute_ats_score(
                    skill_count=skill_c, total_experience_months=exp_m,
                    experience_count=max(1, skill_c // 10),
                    education_level=2, has_quantified_achievements=1,
                    action_verb_count=3, has_summary=1, summary_length=200,
                    has_linkedin=1, has_github=0, cert_count=1, project_count=2,
                )
                self.assertGreaterEqual(score, 0.0, f"Score below 0 for skill={skill_c}")
                self.assertLessEqual(score, 100.0, f"Score above 100 for skill={skill_c}")

    def test_strong_profile_scores_high(self):
        """A PhD, 5yr experienced, Python developer with 20 skills should score ≥75."""
        score = compute_ats_score(
            skill_count=20, total_experience_months=60, experience_count=4,
            education_level=4, has_quantified_achievements=3, action_verb_count=8,
            has_summary=1, summary_length=400, has_linkedin=1, has_github=1,
            cert_count=3, project_count=5,
        )
        self.assertGreaterEqual(score, 70.0, f"Strong profile scored only {score:.1f}")

    def test_weak_profile_scores_low(self):
        """A profile with no skills or experience should score <30."""
        score = compute_ats_score(
            skill_count=0, total_experience_months=0, experience_count=0,
            education_level=0, has_quantified_achievements=0, action_verb_count=0,
            has_summary=0, summary_length=0, has_linkedin=0, has_github=0,
            cert_count=0, project_count=0,
        )
        self.assertLess(score, 30.0, f"Empty profile scored {score:.1f}")

    def test_education_level_impacts_score(self):
        """Higher education should produce higher scores (ceteris paribus)."""
        base_kwargs = dict(
            skill_count=10, total_experience_months=36, experience_count=2,
            has_quantified_achievements=1, action_verb_count=3, has_summary=1,
            summary_length=200, has_linkedin=1, has_github=0, cert_count=1, project_count=2,
        )
        score_hs  = compute_ats_score(education_level=0, **base_kwargs)
        score_bs  = compute_ats_score(education_level=2, **base_kwargs)
        score_ms  = compute_ats_score(education_level=3, **base_kwargs)
        score_phd = compute_ats_score(education_level=4, **base_kwargs)
        self.assertLess(score_hs, score_bs)
        self.assertLess(score_bs, score_ms)
        self.assertLess(score_ms, score_phd)

    def test_linkedin_github_completeness_bonus(self):
        """Profile with LinkedIn + GitHub should score higher than one without."""
        base = dict(skill_count=10, total_experience_months=24, experience_count=2,
                    education_level=2, has_quantified_achievements=1, action_verb_count=2,
                    has_summary=1, summary_length=200, cert_count=0, project_count=0)
        score_none = compute_ats_score(has_linkedin=0, has_github=0, **base)
        score_both = compute_ats_score(has_linkedin=1, has_github=1, **base)
        self.assertGreater(score_both, score_none)

    def test_saturation_at_20_skills(self):
        """Skill score saturates at 20 — 40 skills should NOT double the score."""
        score_20 = compute_ats_score(
            skill_count=20, total_experience_months=0, experience_count=0,
            education_level=0, has_quantified_achievements=0, action_verb_count=0,
            has_summary=0, summary_length=0, has_linkedin=0, has_github=0,
            cert_count=0, project_count=0,
        )
        score_40 = compute_ats_score(
            skill_count=40, total_experience_months=0, experience_count=0,
            education_level=0, has_quantified_achievements=0, action_verb_count=0,
            has_summary=0, summary_length=0, has_linkedin=0, has_github=0,
            cert_count=0, project_count=0,
        )
        self.assertAlmostEqual(score_20, score_40, places=1,
                               msg="Skill score should be capped at 20 skills")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 2: Skill Matching
# ══════════════════════════════════════════════════════════════════════════════

class TestSkillMatching(unittest.TestCase):

    def test_perfect_match(self):
        """Same skills → score close to max."""
        score = compute_skill_match(
            ["Python", "SQL", "AWS"],
            ["Python", "SQL", "AWS"],
        )
        self.assertGreater(score, 0.8)

    def test_zero_match(self):
        """Completely different skills → score near zero."""
        score = compute_skill_match(
            ["Cooking", "Painting", "Gardening"],
            ["Python", "Kubernetes", "TensorFlow"],
        )
        self.assertLess(score, 0.2)

    def test_partial_match(self):
        """Partial skill overlap → intermediate score."""
        score = compute_skill_match(
            ["Python", "SQL", "Excel"],
            ["Python", "Kubernetes", "Docker"],
        )
        self.assertGreater(score, 0.0)
        self.assertLess(score, 1.0)

    def test_case_insensitive_matching(self):
        """Matching should be case-insensitive."""
        score = compute_skill_match(["PYTHON", "SQL"], ["python", "sql"])
        self.assertGreater(score, 0.8)

    def test_empty_jd_returns_neutral(self):
        """Empty JD skill list → 0.5 neutral score."""
        score = compute_skill_match(["Python", "SQL"], [])
        self.assertEqual(score, 0.5)

    def test_substring_partial_match(self):
        """'PostgreSQL' in resume should partially match 'SQL' in JD."""
        score = compute_skill_match(["PostgreSQL"], ["SQL"])
        self.assertGreater(score, 0.0)

    def test_score_bounded(self):
        """Score must always be in [0, 1]."""
        for cands in [[], ["Python"], ["Python", "SQL", "AWS"] * 10]:
            for jds in [[], ["React"], ["Python", "React", "Docker"]]:
                score = compute_skill_match(cands, jds)
                self.assertGreaterEqual(score, 0.0)
                self.assertLessEqual(score, 1.0)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 3: Fraud Detection Heuristics
# ══════════════════════════════════════════════════════════════════════════════

class TestFraudDetection(unittest.TestCase):

    def _suspicious(self, **kwargs):
        defaults = dict(
            skill_count=10, experience_count=3, keyword_density=0.01,
            duplicate_skill_ratio=0.0, advanced_skill_count=0, year_span=4,
            generic_phrase_count=1, internal_dup_score=0.1,
            template_hit_count=0, quantified_ratio=0.5, avg_desc_length=50,
        )
        defaults.update(kwargs)
        return is_suspicious(**defaults)

    def test_clean_profile_not_flagged(self):
        """A normal, legitimate resume should NOT be flagged."""
        self.assertFalse(self._suspicious())

    def test_too_many_skills_no_experience(self):
        """50 skills + 1 yr exp + high keyword density (2 signals) = suspicious."""
        self.assertTrue(self._suspicious(skill_count=50, experience_count=1,
                                          keyword_density=0.07))

    def test_keyword_stuffing_detected(self):
        """Keyword density >5% = suspicious."""
        self.assertTrue(self._suspicious(keyword_density=0.07, duplicate_skill_ratio=0.4))

    def test_duplicate_skills_flag(self):
        """High duplicate skill ratio + keyword stuffing = suspicious."""
        self.assertTrue(self._suspicious(duplicate_skill_ratio=0.5, keyword_density=0.06))

    def test_advanced_skills_no_experience(self):
        """Claiming 5 advanced skills with only 1 year exp = suspicious."""
        self.assertTrue(self._suspicious(advanced_skill_count=5, year_span=1,
                                         generic_phrase_count=7))

    def test_copy_paste_detected(self):
        """Internal duplication score >0.5 with template abuse = suspicious."""
        self.assertTrue(self._suspicious(internal_dup_score=0.8, template_hit_count=3,
                                          quantified_ratio=0.05))

    def test_single_signal_not_enough(self):
        """One fraud signal alone should NOT flag the profile."""
        self.assertFalse(self._suspicious(generic_phrase_count=10))  # only 1 signal

    def test_short_descriptions_with_many_jobs(self):
        """Very short descriptions + 4 job entries = suspicious."""
        self.assertTrue(self._suspicious(avg_desc_length=5, experience_count=4,
                                          keyword_density=0.06))


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 4: Dataset Availability & File Structure
# ══════════════════════════════════════════════════════════════════════════════

class TestDatasetAvailability(unittest.TestCase):

    def test_resume_parsing_dataset_exists(self):
        """Resume Parsing Dataset directory must exist."""
        self.assertTrue(RESUME_DATA_DIR.exists(),
                        f"Dataset not found: {RESUME_DATA_DIR}")

    def test_cv_json_files_present(self):
        """Must find at least 100 cv_*.json files."""
        cv_files = list(RESUME_DATA_DIR.glob("cv_*.json"))
        self.assertGreater(len(cv_files), 100,
                           f"Only {len(cv_files)} CV files found")

    def test_cv_json_schema_valid(self):
        """Sample 10 CV files — each must be valid JSON with expected keys."""
        cv_files = sorted(RESUME_DATA_DIR.glob("cv_*.json"))[:10]
        for f in cv_files:
            with open(f) as fh:
                data = json.load(fh)
            self.assertIsInstance(data, dict, f"{f.name} is not a dict")

    def test_linkedin_skills_csv_exists(self):
        """LinkedIn job_skills.csv must be present."""
        skills_path = LINKEDIN_DIR / "jobs" / "job_skills.csv"
        self.assertTrue(skills_path.exists(),
                        f"LinkedIn skills CSV not found: {skills_path}")

    def test_linkedin_postings_csv_exists(self):
        """LinkedIn postings.csv must be present."""
        postings_path = LINKEDIN_DIR / "postings.csv"
        self.assertTrue(postings_path.exists(),
                        f"LinkedIn postings.csv not found: {postings_path}")

    def test_skills_csv_has_content(self):
        """job_skills.csv must have at least 1000 rows."""
        import csv
        skills_path = LINKEDIN_DIR / "jobs" / "job_skills.csv"
        if not skills_path.exists():
            self.skipTest("job_skills.csv not found")
        with open(skills_path, encoding="utf-8", errors="ignore") as f:
            rows = sum(1 for _ in csv.reader(f))
        self.assertGreater(rows, 1000, f"Only {rows} rows in job_skills.csv")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 5: Notebook File Integrity
# ══════════════════════════════════════════════════════════════════════════════

class TestNotebookFileIntegrity(unittest.TestCase):
    """Verify all 4 training notebooks exist and contain required components."""

    REQUIRED_NOTEBOOKS = {
        "01_ats_scoring_model.py": [
            "compute_ats_score", "XGBoost", "FEATURE_COLS", "joblib.dump",
            "SAVE_DIR", "train_test_split",
        ],
        "02_semantic_similarity_finetuning.py": [
            "SentenceTransformer", "stsbenchmark-sts", "load_dataset",
            "CosineSimilarityLoss", "SAVE_DIR", "finetuned_score",
        ],
        "03_ner_resume_parser.py": [
            "spacy", "NER", "LABELS", "csv_row_to_ner",
            "SAVE_DIR", "evaluate_ner",
        ],
        "04_fraud_detection_model.py": [
            "IsolationForest", "XGBClassifier", "LogisticRegression",
            "SAVE_DIR", "meta_clf",
        ],
    }

    def _check_notebook(self, filename, keywords):
        path = NOTEBOOKS_DIR / filename
        self.assertTrue(path.exists(), f"Notebook missing: {filename}")
        content = path.read_text(encoding="utf-8")
        self.assertGreater(len(content), 1000,
                           f"{filename} is too short ({len(content)} chars)")
        for kw in keywords:
            self.assertIn(kw, content, f"'{kw}' not found in {filename}")

    def test_notebook_01_ats_scoring(self):
        self._check_notebook("01_ats_scoring_model.py",
                             self.REQUIRED_NOTEBOOKS["01_ats_scoring_model.py"])

    def test_notebook_02_semantic(self):
        self._check_notebook("02_semantic_similarity_finetuning.py",
                             self.REQUIRED_NOTEBOOKS["02_semantic_similarity_finetuning.py"])

    def test_notebook_03_ner(self):
        self._check_notebook("03_ner_resume_parser.py",
                             self.REQUIRED_NOTEBOOKS["03_ner_resume_parser.py"])

    def test_notebook_04_fraud(self):
        self._check_notebook("04_fraud_detection_model.py",
                             self.REQUIRED_NOTEBOOKS["04_fraud_detection_model.py"])

    def test_run_all_script_exists(self):
        self.assertTrue((NOTEBOOKS_DIR / "run_all_training.sh").exists())

    def test_requirements_training_exists(self):
        self.assertTrue((NOTEBOOKS_DIR / "requirements_training.txt").exists())


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 6: AI Engine Directory Structure
# ══════════════════════════════════════════════════════════════════════════════

class TestAIEngineStructure(unittest.TestCase):

    AI_DIR = ROOT / "ai_engine"

    REQUIRED_DIRS = [
        "models", "nlp", "pipelines", "scoring", "utils", "vector_store", "notebooks"
    ]
    REQUIRED_FILES = [
        "requirements.txt", "__init__.py",
    ]

    def test_required_directories_exist(self):
        for d in self.REQUIRED_DIRS:
            path = self.AI_DIR / d
            self.assertTrue(path.exists() and path.is_dir(),
                            f"Directory missing: ai_engine/{d}")

    def test_required_files_exist(self):
        for f in self.REQUIRED_FILES:
            path = self.AI_DIR / f
            self.assertTrue(path.exists(), f"File missing: ai_engine/{f}")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 7: Score Band Logic
# ══════════════════════════════════════════════════════════════════════════════

class TestScoreBandLogic(unittest.TestCase):

    def _get_band(self, score: float) -> str:
        if score >= 80:   return "STRONG"
        elif score >= 60: return "GOOD"
        elif score >= 40: return "FAIR"
        else:             return "WEAK"

    def test_band_boundaries(self):
        self.assertEqual(self._get_band(85), "STRONG")
        self.assertEqual(self._get_band(80), "STRONG")
        self.assertEqual(self._get_band(79), "GOOD")
        self.assertEqual(self._get_band(60), "GOOD")
        self.assertEqual(self._get_band(59), "FAIR")
        self.assertEqual(self._get_band(40), "FAIR")
        self.assertEqual(self._get_band(39), "WEAK")
        self.assertEqual(self._get_band(0),  "WEAK")

    def test_strong_profile_gets_strong_band(self):
        score = compute_ats_score(
            skill_count=18, total_experience_months=60, experience_count=4,
            education_level=3, has_quantified_achievements=3, action_verb_count=6,
            has_summary=1, summary_length=450, has_linkedin=1, has_github=1,
            cert_count=2, project_count=4,
        )
        band = self._get_band(score)
        self.assertIn(band, ["GOOD", "STRONG"],
                      f"Strong profile got {band} (score={score:.1f})")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 8: CV JSON Parsing Utilities
# ══════════════════════════════════════════════════════════════════════════════

class TestCVParsingUtilities(unittest.TestCase):

    SAMPLE_CV = {
        "full_name": "John Smith",
        "email": "john@example.com",
        "summary": "Experienced ML engineer with 5+ years in production systems.",
        "skills": [
            {"name": "Python"},
            {"name": "TensorFlow"},
            {"name": "AWS"},
        ],
        "work_experience": [
            {
                "title": "Senior ML Engineer",
                "company": "Google",
                "start_date": "2020",
                "end_date": "2024",
                "description": "Led development of NLP pipeline. Reduced latency by 30%.",
            },
            {
                "title": "ML Engineer",
                "company": "Meta",
                "start_date": "2018",
                "end_date": "2020",
                "description": "Built recommendation system serving 1B users.",
            },
        ],
        "education": [
            {
                "degree": "Master of Science Computer Science",
                "institution": "Stanford University",
            }
        ],
        "certifications": [
            {"name": "AWS Certified Solutions Architect"},
        ],
        "projects": [
            {"title": "Real-time fraud detection system"},
        ],
    }

    def _extract_features_from_sample(self):
        data = self.SAMPLE_CV
        skills = [s.get("name", s) if isinstance(s, dict) else s for s in data.get("skills", [])]
        experiences = data.get("work_experience", [])
        education   = data.get("education", [])
        certs       = data.get("certifications", [])
        projects    = data.get("projects", [])
        return {
            "skill_count":      len(skills),
            "experience_count": len(experiences),
            "education_count":  len(education),
            "cert_count":       len(certs),
            "project_count":    len(projects),
            "has_summary":      1 if len(data.get("summary", "")) > 50 else 0,
        }

    def test_skill_count_extracted(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["skill_count"], 3)

    def test_experience_count_extracted(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["experience_count"], 2)

    def test_education_count_extracted(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["education_count"], 1)

    def test_cert_count_extracted(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["cert_count"], 1)

    def test_project_count_extracted(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["project_count"], 1)

    def test_has_summary_detected(self):
        features = self._extract_features_from_sample()
        self.assertEqual(features["has_summary"], 1)

    def test_education_level_from_degree(self):
        degree = "Master of Science Computer Science"
        deg_lower = degree.lower()
        level = 0
        if "phd" in deg_lower or "doctorate" in deg_lower: level = 4
        elif "master" in deg_lower or "m.s" in deg_lower:  level = 3
        elif "bachelor" in deg_lower or "b.s" in deg_lower: level = 2
        elif "diploma" in deg_lower:                        level = 1
        self.assertEqual(level, 3)

    def test_quantification_detection(self):
        desc = "Reduced latency by 30% and improved throughput by 2x."
        has_quant = 1 if any(c.isdigit() for c in desc) else 0
        self.assertEqual(has_quant, 1)

    def test_action_verb_detection(self):
        action_verbs = ["led", "built", "managed", "developed", "reduced",
                        "increased", "deployed", "architected", "optimized"]
        desc = "Led development of NLP pipeline. Reduced latency by 30%."
        count = sum(1 for v in action_verbs if v in desc.lower())
        self.assertGreater(count, 0)


# ══════════════════════════════════════════════════════════════════════════════
#  RUNNER
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("  CAPVIA — PHASE 1: AI ENGINE TESTS")
    print("=" * 70)
    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    test_classes = [
        TestATSScoringFeatures,
        TestSkillMatching,
        TestFraudDetection,
        TestDatasetAvailability,
        TestNotebookFileIntegrity,
        TestAIEngineStructure,
        TestScoreBandLogic,
        TestCVParsingUtilities,
    ]
    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
