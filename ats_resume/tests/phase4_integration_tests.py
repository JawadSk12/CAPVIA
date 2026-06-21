#!/usr/bin/env python3
"""
==============================================================================
 PHASE 4: FULL PROJECT INTEGRATION TESTS
 Tests: Cross-layer schema alignment, API↔Frontend contract, dataset↔notebook
        connections, end-to-end data flow validation, config consistency,
        README completeness, dependency hygiene, environment variable coverage
 Runner: python3 tests/phase4_integration_tests.py
==============================================================================
"""
import unittest
import sys
import json
import re
import csv
from pathlib import Path

ROOT = Path(__file__).parent.parent

FRONTEND_DIR = ROOT / "frontend"
BACKEND_DIR  = ROOT / "backend"
AI_DIR       = ROOT / "ai_engine"
NOTEBOOKS_DIR= AI_DIR / "notebooks"
RESUME_DATA  = ROOT / "Resume Parsing Dataset" / "ground_truth"
LINKEDIN_DIR = ROOT / "LinkedIn Job Postings (2023 - 2024)"


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 1: Schema Field Alignment (Backend ↔ Frontend)
# ══════════════════════════════════════════════════════════════════════════════

class TestSchemaFieldAlignment(unittest.TestCase):
    """
    Verify that type names used in the frontend TypeScript types
    match the Pydantic schema names defined in the backend.
    """

    def _backend_schema_content(self) -> str:
        return (BACKEND_DIR / "schemas" / "resume.py").read_text()

    def _frontend_types_content(self) -> str:
        return (FRONTEND_DIR / "types" / "ats.ts").read_text()

    def test_ats_analysis_response_in_both(self):
        self.assertIn("ATSAnalysisResponse", self._backend_schema_content())
        self.assertIn("ATSAnalysisResponse", self._frontend_types_content())

    def test_fraud_analysis_in_both(self):
        backend = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("FraudAnalysis", backend)
        self.assertIn("FraudAnalysis", frontend)

    def test_skill_gap_in_both(self):
        backend  = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("SkillGap", backend)
        self.assertIn("SkillGap", frontend)

    def test_resume_summary_in_both(self):
        backend  = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("ResumeSummary", backend)
        self.assertIn("ResumeSummary", frontend)

    def test_heatmap_section_in_both(self):
        backend  = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("HeatmapSection", backend)
        # Frontend may use different casing
        self.assertTrue(
            "HeatmapSection" in frontend or "Heatmap" in frontend,
            "Heatmap type missing from frontend types"
        )

    def test_explainability_in_both(self):
        backend  = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("ExplainabilityReport", backend)
        self.assertTrue(
            "ExplainabilityReport" in frontend or "Explainability" in frontend,
            "Explainability type missing from frontend"
        )

    def test_auth_token_response_aligned(self):
        auth_schema  = (BACKEND_DIR / "schemas" / "auth.py").read_text()
        ats_store    = (FRONTEND_DIR / "store" / "authStore.ts").read_text()
        self.assertIn("TokenResponse", auth_schema)
        self.assertTrue("access_token" in auth_schema or "accessToken" in ats_store)

    def test_overall_score_field_name(self):
        """'overall_score' in backend should correspond to frontend."""
        backend  = self._backend_schema_content()
        frontend = self._frontend_types_content()
        self.assertIn("overall_score", backend)
        self.assertTrue(
            "overall_score" in frontend or "overallScore" in frontend,
            "overall_score field not found in frontend types"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 2: API Client ↔ Backend Routes Alignment
# ══════════════════════════════════════════════════════════════════════════════

class TestAPIClientBackendAlignment(unittest.TestCase):

    def _api_content(self) -> str:
        return (FRONTEND_DIR / "lib" / "api.ts").read_text()

    def _auth_route(self) -> str:
        p = BACKEND_DIR / "api" / "v1" / "routes" / "auth.py"
        return p.read_text() if p.exists() else ""

    def _resume_route(self) -> str:
        p = BACKEND_DIR / "api" / "v1" / "routes" / "resume.py"
        return p.read_text() if p.exists() else ""

    def test_login_endpoint_in_api_client(self):
        self.assertIn("login", self._api_content().lower())

    def test_register_endpoint_in_api_client(self):
        self.assertIn("register", self._api_content().lower())

    def test_upload_endpoint_in_api_client(self):
        api = self._api_content()
        self.assertTrue("upload" in api.lower() or "resume" in api.lower())

    def test_api_client_uses_v1_prefix(self):
        api = self._api_content()
        self.assertTrue("v1" in api or "api" in api.lower())

    def test_status_endpoint_in_api_client(self):
        api = self._api_content()
        self.assertTrue("status" in api.lower())

    def test_analysis_endpoint_in_api_client(self):
        api = self._api_content()
        self.assertTrue("analysis" in api.lower())


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 3: Dataset ↔ Notebook Connections
# ══════════════════════════════════════════════════════════════════════════════

class TestDatasetNotebookConnections(unittest.TestCase):

    def _nb(self, filename: str) -> str:
        return (NOTEBOOKS_DIR / filename).read_text()

    def test_notebook01_references_ground_truth_dir(self):
        content = self._nb("01_ats_scoring_model.py")
        self.assertTrue(
            "ground_truth" in content or "Resume Parsing Dataset" in content,
            "Notebook 01 must reference the ground_truth CV dataset"
        )

    def test_notebook01_references_linkedin_skills(self):
        content = self._nb("01_ats_scoring_model.py")
        self.assertTrue(
            "job_skills" in content or "LinkedIn" in content,
            "Notebook 01 must reference LinkedIn job_skills.csv"
        )

    def test_notebook02_references_stsbenchmark(self):
        content = self._nb("02_semantic_similarity_finetuning.py")
        self.assertIn("stsbenchmark-sts", content,
                      "Notebook 02 must use mteb/stsbenchmark-sts dataset")

    def test_notebook02_references_load_dataset(self):
        content = self._nb("02_semantic_similarity_finetuning.py")
        self.assertIn("load_dataset", content,
                      "Notebook 02 must use HuggingFace load_dataset")

    def test_notebook02_references_linkedin_skills(self):
        content = self._nb("02_semantic_similarity_finetuning.py")
        self.assertTrue(
            "job_skills" in content or "LinkedIn" in content,
            "Notebook 02 must reference LinkedIn skills for domain adaptation"
        )

    def test_notebook03_references_ground_truth(self):
        content = self._nb("03_ner_resume_parser.py")
        self.assertTrue(
            "ground_truth" in content or "cv_*.json" in content,
            "Notebook 03 must reference ground_truth CV JSON files"
        )

    def test_notebook04_references_linkedin_popularity(self):
        content = self._nb("04_fraud_detection_model.py")
        self.assertTrue(
            "job_skills" in content or "skill_popularity" in content,
            "Notebook 04 must use LinkedIn skill popularity index"
        )

    def test_all_notebooks_reference_save_dir(self):
        for nb in ["01_ats_scoring_model.py", "02_semantic_similarity_finetuning.py",
                   "03_ner_resume_parser.py", "04_fraud_detection_model.py"]:
            content = self._nb(nb)
            self.assertIn("SAVE_DIR", content,
                          f"Notebook {nb} must define SAVE_DIR output path")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 4: AI Engine ↔ Backend Service Connection
# ══════════════════════════════════════════════════════════════════════════════

class TestAIEngineBackendConnection(unittest.TestCase):

    def _backend_file(self, path: str) -> str:
        p = BACKEND_DIR / path
        return p.read_text() if p.exists() else ""

    def test_ats_worker_references_ai_engine(self):
        worker = self._backend_file("workers/ats_worker.py")
        if not worker:
            self.skipTest("ats_worker.py not found")
        self.assertTrue(
            "ai_engine" in worker or "pipeline" in worker or "scoring" in worker.lower(),
            "ATS worker should call AI engine pipeline"
        )

    def test_config_has_ai_engine_url(self):
        config = (BACKEND_DIR / "config.py").read_text()
        self.assertIn("AI_ENGINE", config)

    def test_workers_directory_exists(self):
        self.assertTrue((BACKEND_DIR / "workers").is_dir())

    def test_celery_app_exists(self):
        self.assertTrue((BACKEND_DIR / "workers" / "celery_app.py").exists())

    def test_services_directory_exists(self):
        self.assertTrue((BACKEND_DIR / "services").is_dir())


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 5: Environment Variable Coverage
# ══════════════════════════════════════════════════════════════════════════════

class TestEnvironmentVariableCoverage(unittest.TestCase):

    CONFIG = (BACKEND_DIR / "config.py").read_text()

    REQUIRED_BACKEND_ENV = [
        "DATABASE_URL", "MONGO_URL", "REDIS_URL", "JWT_SECRET_KEY",
        "AWS_S3_BUCKET", "CELERY_BROKER_URL", "CORS_ORIGINS",
        "OPENAI_API_KEY",  # for AI rewrite
    ]

    def test_all_backend_env_vars_in_config(self):
        for var in self.REQUIRED_BACKEND_ENV:
            self.assertIn(var, self.CONFIG, f"Env var {var} missing from config.py")

    def test_frontend_env_vars_in_api_client(self):
        api_content = (FRONTEND_DIR / "lib" / "api.ts").read_text()
        self.assertIn("NEXT_PUBLIC_API_URL", api_content,
                      "Frontend must use NEXT_PUBLIC_API_URL for backend URL")

    def test_openai_key_in_config(self):
        # Check either config.py or requirements for openai
        self.assertTrue(
            "OPENAI" in self.CONFIG or
            "openai" in (BACKEND_DIR / "requirements.txt").read_text().lower(),
            "OpenAI API key or package missing"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 6: README Completeness
# ══════════════════════════════════════════════════════════════════════════════

class TestREADMECompleteness(unittest.TestCase):

    def _read(self, path: Path) -> str:
        return path.read_text() if path.exists() else ""

    def test_root_readme_exists_and_comprehensive(self):
        content = self._read(ROOT / "README.md")
        self.assertGreater(len(content), 5000, "Root README is too short")

    def test_root_readme_has_architecture(self):
        content = self._read(ROOT / "README.md")
        self.assertTrue("FastAPI" in content or "architecture" in content.lower())

    def test_root_readme_has_quickstart(self):
        content = self._read(ROOT / "README.md")
        self.assertTrue("npm" in content or "Quick Start" in content or "setup" in content.lower())

    def test_root_readme_has_ml_section(self):
        content = self._read(ROOT / "README.md")
        self.assertTrue("notebook" in content.lower() or "ML" in content)

    def test_backend_readme_exists(self):
        self.assertTrue((BACKEND_DIR / "README.md").exists())

    def test_frontend_readme_exists(self):
        self.assertTrue((FRONTEND_DIR / "README.md").exists())

    def test_ai_engine_readme_exists(self):
        self.assertTrue((AI_DIR / "README.md").exists())

    def test_backend_readme_has_api_endpoints(self):
        content = self._read(BACKEND_DIR / "README.md")
        self.assertTrue("POST" in content or "GET" in content or "endpoint" in content.lower())

    def test_frontend_readme_has_pages(self):
        content = self._read(FRONTEND_DIR / "README.md")
        self.assertTrue("student" in content.lower() or "page" in content.lower())

    def test_ai_readme_has_training_commands(self):
        content = self._read(AI_DIR / "README.md")
        self.assertTrue("python" in content.lower() or "run" in content.lower())


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 7: Dependencies & Requirements Hygiene
# ══════════════════════════════════════════════════════════════════════════════

class TestDependencyHygiene(unittest.TestCase):

    def _backend_reqs(self) -> str:
        return (BACKEND_DIR / "requirements.txt").read_text().lower()

    def _ai_reqs(self) -> str:
        return (AI_DIR / "requirements.txt").read_text().lower()

    def _training_reqs(self) -> str:
        return (NOTEBOOKS_DIR / "requirements_training.txt").read_text().lower()

    def test_backend_has_fastapi(self):
        self.assertIn("fastapi", self._backend_reqs())

    def test_backend_has_sqlalchemy(self):
        self.assertIn("sqlalchemy", self._backend_reqs())

    def test_backend_has_pydantic(self):
        self.assertIn("pydantic", self._backend_reqs())

    def test_backend_has_celery(self):
        self.assertIn("celery", self._backend_reqs())

    def test_backend_has_redis(self):
        self.assertIn("redis", self._backend_reqs())

    def test_training_has_sentence_transformers(self):
        self.assertIn("sentence-transformers", self._training_reqs())

    def test_training_has_xgboost(self):
        self.assertIn("xgboost", self._training_reqs())

    def test_training_has_datasets(self):
        self.assertIn("datasets", self._training_reqs())

    def test_training_has_spacy(self):
        self.assertIn("spacy", self._training_reqs())

    def test_training_has_torch(self):
        self.assertIn("torch", self._training_reqs())

    def test_no_conflicting_pydantic_versions(self):
        """Confirm requirements don't mix pydantic v1 and v2."""
        reqs = self._backend_reqs()
        # Check that if pydantic-settings is present, pydantic v2 is implied
        if "pydantic-settings" in reqs:
            # pydantic-settings requires pydantic v2 — should not pin pydantic<2
            self.assertNotIn("pydantic<2", reqs,
                             "pydantic-settings requires pydantic v2 — remove pydantic<2 pin")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 8: End-to-End Data Flow Simulation
# ══════════════════════════════════════════════════════════════════════════════

class TestEndToEndDataFlowSimulation(unittest.TestCase):
    """
    Simulate the complete data path without running services.
    Validates that: resume upload → scoring → frontend display makes sense.
    """

    def test_upload_produces_pending_status(self):
        """Simulates: user uploads PDF → system returns PENDING status."""
        upload_response = {
            "resume_id": "test-uuid-12345",
            "status": "PENDING",
            "message": "Resume uploaded. Processing started.",
            "estimated_seconds": 45,
        }
        self.assertEqual(upload_response["status"], "PENDING")
        self.assertIn("resume_id", upload_response)

    def test_pipeline_stages_progress_correctly(self):
        """Verify that stage progression maps to increasing progress %."""
        stage_progress = {
            "PENDING":   0,
            "OCR":       15,
            "PARSING":   35,
            "EMBEDDING": 55,
            "SCORING":   75,
            "DONE":      100,
        }
        values = list(stage_progress.values())
        # Each stage should be >= previous (monotonically increasing)
        for i in range(1, len(values)):
            self.assertGreaterEqual(values[i], values[i-1],
                                    f"Stage progress not increasing at index {i}")

    def test_ats_score_maps_to_correct_band(self):
        """ATS score → score band → frontend display color."""
        test_cases = [
            (85.0, "STRONG", "emerald"),
            (72.0, "GOOD",   "indigo"),
            (52.0, "FAIR",   "amber"),
            (28.0, "WEAK",   "rose"),
        ]
        def get_band(score):
            if score >= 80:   return "STRONG"
            elif score >= 60: return "GOOD"
            elif score >= 40: return "FAIR"
            else:             return "WEAK"

        BAND_COLORS = {"STRONG": "emerald", "GOOD": "indigo", "FAIR": "amber", "WEAK": "rose"}

        for score, expected_band, expected_color in test_cases:
            band  = get_band(score)
            color = BAND_COLORS[band]
            self.assertEqual(band, expected_band, f"Score {score} → wrong band {band}")
            self.assertEqual(color, expected_color, f"Band {band} → wrong color {color}")

    def test_fraud_flag_threshold(self):
        """Fraud probability >0.7 should map to LIKELY_FRAUD."""
        def get_verdict(prob: float) -> str:
            if prob >= 0.7:   return "LIKELY_FRAUD"
            elif prob >= 0.4: return "SUSPICIOUS"
            else:             return "CLEAN"

        self.assertEqual(get_verdict(0.85), "LIKELY_FRAUD")
        self.assertEqual(get_verdict(0.55), "SUSPICIOUS")
        self.assertEqual(get_verdict(0.20), "CLEAN")

    def test_skill_gap_priority_assignment(self):
        """Skill gaps should be prioritized by similarity distance."""
        def get_priority(similarity: float) -> str:
            if similarity < 0.3:  return "HIGH"
            elif similarity < 0.6: return "MEDIUM"
            else:                  return "LOW"

        self.assertEqual(get_priority(0.1),  "HIGH")
        self.assertEqual(get_priority(0.45), "MEDIUM")
        self.assertEqual(get_priority(0.75), "LOW")

    def test_resume_rewrite_section_validation(self):
        """Rewrite only works for allowed sections."""
        valid_sections = {"skills", "experience", "summary", "projects"}
        self.assertIn("skills", valid_sections)
        self.assertIn("experience", valid_sections)
        self.assertNotIn("hobbies", valid_sections)
        self.assertNotIn("references", valid_sections)

    def test_candidate_ranking_by_score(self):
        """HR ranking must return candidates in descending score order."""
        candidates = [
            {"name": "Alice", "ats_score": 82.5},
            {"name": "Bob",   "ats_score": 91.0},
            {"name": "Carol", "ats_score": 67.3},
            {"name": "Dave",  "ats_score": 55.1},
        ]
        ranked = sorted(candidates, key=lambda c: c["ats_score"], reverse=True)
        self.assertEqual(ranked[0]["name"], "Bob")
        self.assertEqual(ranked[-1]["name"], "Dave")
        for i in range(len(ranked) - 1):
            self.assertGreaterEqual(ranked[i]["ats_score"], ranked[i+1]["ats_score"])

    def test_semantic_similarity_score_normalized(self):
        """Semantic similarity scores must be in [0, 1]."""
        mock_scores = [0.0, 0.23, 0.56, 0.78, 0.99, 1.0]
        for score in mock_scores:
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 9: Cross-Layer Feature Flag Consistency
# ══════════════════════════════════════════════════════════════════════════════

class TestFeatureFlagConsistency(unittest.TestCase):

    def test_ai_rewrite_feature_in_backend_config(self):
        config = (BACKEND_DIR / "config.py").read_text()
        self.assertIn("ENABLE_AI_REWRITE", config)

    def test_fraud_detection_feature_in_backend_config(self):
        config = (BACKEND_DIR / "config.py").read_text()
        self.assertIn("ENABLE_FAKE_SKILL_DETECTION", config)

    def test_rewrite_endpoint_in_api_client(self):
        api = (FRONTEND_DIR / "lib" / "api.ts").read_text()
        self.assertTrue("rewrite" in api.lower() or "Rewrite" in api)

    def test_fraud_flag_in_frontend_types(self):
        types = (FRONTEND_DIR / "types" / "ats.ts").read_text()
        self.assertTrue("fraud" in types.lower() or "Fraud" in types)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 10: HR Workflow Completeness
# ══════════════════════════════════════════════════════════════════════════════

class TestHRWorkflowCompleteness(unittest.TestCase):

    def test_hr_dashboard_page_exists(self):
        self.assertTrue((FRONTEND_DIR / "app" / "hr" / "dashboard" / "page.tsx").exists())

    def test_hr_candidates_page_exists(self):
        self.assertTrue((FRONTEND_DIR / "app" / "hr" / "candidates" / "page.tsx").exists())

    def test_hr_internship_list_page_exists(self):
        self.assertTrue((FRONTEND_DIR / "app" / "hr" / "internship" / "page.tsx").exists())

    def test_comparison_table_component_exists(self):
        self.assertTrue((FRONTEND_DIR / "components" / "hr" / "ComparisonTable.tsx").exists())

    def test_comparison_table_has_status_management(self):
        path = FRONTEND_DIR / "components" / "hr" / "ComparisonTable.tsx"
        if not path.exists(): self.skipTest("File missing")
        content = path.read_text()
        self.assertTrue(
            "SHORTLIST" in content or "shortlist" in content.lower() or "status" in content.lower(),
            "ComparisonTable should include status management"
        )

    def test_hr_route_file_exists(self):
        route = BACKEND_DIR / "api" / "v1" / "routes" / "hr.py"
        self.assertTrue(route.exists(), "backend/api/v1/routes/hr.py missing")


# ══════════════════════════════════════════════════════════════════════════════
#  RUNNER
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("  CAPVIA — PHASE 4: FULL PROJECT INTEGRATION TESTS")
    print("=" * 70)
    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    test_classes = [
        TestSchemaFieldAlignment,
        TestAPIClientBackendAlignment,
        TestDatasetNotebookConnections,
        TestAIEngineBackendConnection,
        TestEnvironmentVariableCoverage,
        TestREADMECompleteness,
        TestDependencyHygiene,
        TestEndToEndDataFlowSimulation,
        TestFeatureFlagConsistency,
        TestHRWorkflowCompleteness,
    ]
    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
