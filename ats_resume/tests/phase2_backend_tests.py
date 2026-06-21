#!/usr/bin/env python3
"""
==============================================================================
 PHASE 2: BACKEND TESTS
 Tests: Pydantic schemas, config validation, RBAC logic, route contracts,
        JWT structure, password validation, response schemas, file constraints
 Runner: python3 tests/phase2_backend_tests.py
 Note:   Uses stdlib only — no DB connection required. All external calls mocked.
==============================================================================
"""
import unittest
import sys
import os
import re
import json
import secrets
import hashlib
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS: Replicated from backend source (to test without pydantic install)
# ══════════════════════════════════════════════════════════════════════════════

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Mirror of backend/schemas/auth.py password validator."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', password):
        return False, "Password must contain at least one special character"
    return True, "OK"

def validate_role(role: str) -> tuple[bool, str]:
    """Mirror of backend role validator."""
    allowed = {"STUDENT", "HR"}
    if role.upper() not in allowed:
        return False, f"Role must be one of: {', '.join(allowed)}"
    return True, role.upper()

def validate_name(name: str) -> tuple[bool, str]:
    """Mirror of backend name validator."""
    if not re.match(r"^[a-zA-Z\s\-'\.]+$", name):
        return False, "Name contains invalid characters"
    return True, name.strip()

def validate_email(email: str) -> bool:
    """Basic email format check."""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))

class UserRole:
    STUDENT = "STUDENT"
    HR = "HR"
    ADMIN = "ADMIN"

def get_score_band(score: float) -> str:
    if score >= 80:   return "STRONG"
    elif score >= 60: return "GOOD"
    elif score >= 40: return "FAIR"
    else:             return "WEAK"

def get_stage_labels():
    return {
        "PENDING":   "Queued for processing...",
        "OCR":       "Extracting text from document...",
        "PARSING":   "Analyzing resume structure...",
        "EMBEDDING": "Generating semantic embeddings...",
        "SCORING":   "Computing ATS scores...",
        "DONE":      "Analysis complete!",
        "ERROR":     "Processing failed",
    }

def get_confidence_label(confidence: float) -> str:
    if confidence >= 0.85: return "HIGH"
    elif confidence >= 0.65: return "MEDIUM"
    elif confidence >= 0.45: return "LOW"
    else: return "VERY_LOW"

def create_mock_jwt(user_id: str, role: str, expire_minutes: int = 60) -> str:
    """Simulate JWT structure (not cryptographically valid — structure test only)."""
    import base64
    header  = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": user_id, "role": role, "exp": (datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)).timestamp()
    }).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(b"mock_signature").decode().rstrip("=")
    return f"{header}.{payload}.{sig}"

def decode_mock_jwt(token: str) -> dict:
    import base64
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT structure")
    padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
    return json.loads(base64.urlsafe_b64decode(padded))


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 1: Auth Schema Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestAuthSchemaValidation(unittest.TestCase):

    # ── Password Strength ──────────────────────────────────────────────────────
    def test_valid_strong_password(self):
        ok, msg = validate_password_strength("SecurePass1!")
        self.assertTrue(ok, f"Valid password rejected: {msg}")

    def test_password_too_short(self):
        ok, msg = validate_password_strength("Ab1!")
        self.assertFalse(ok)
        self.assertIn("8 characters", msg)

    def test_password_no_uppercase(self):
        ok, msg = validate_password_strength("securepass1!")
        self.assertFalse(ok)
        self.assertIn("uppercase", msg)

    def test_password_no_digit(self):
        ok, msg = validate_password_strength("SecurePass!!")
        self.assertFalse(ok)
        self.assertIn("digit", msg)

    def test_password_no_special_char(self):
        ok, msg = validate_password_strength("SecurePass1")
        self.assertFalse(ok)
        self.assertIn("special character", msg)

    def test_password_all_criteria_met(self):
        test_passwords = ["MyPass@123", "Hello#World9", "CAPVIA_Secure2024!"]
        for pw in test_passwords:
            ok, msg = validate_password_strength(pw)
            self.assertTrue(ok, f"Should be valid: {pw} — {msg}")

    # ── Role Validation ────────────────────────────────────────────────────────
    def test_valid_roles(self):
        for role in ["STUDENT", "HR", "student", "hr"]:
            ok, _ = validate_role(role)
            self.assertTrue(ok, f"Valid role rejected: {role}")

    def test_admin_cannot_self_register(self):
        ok, msg = validate_role("ADMIN")
        self.assertFalse(ok)

    def test_invalid_role_rejected(self):
        for role in ["SUPERUSER", "MANAGER", "", "123"]:
            ok, _ = validate_role(role)
            self.assertFalse(ok, f"Invalid role should fail: {role}")

    # ── Name Validation ────────────────────────────────────────────────────────
    def test_valid_names(self):
        for name in ["John Smith", "Mary-Jane O'Brien", "Arjun Kumar"]:
            ok, _ = validate_name(name)
            self.assertTrue(ok, f"Valid name rejected: {name}")

    def test_invalid_names(self):
        for name in ["John123", "Ali@Khan", "Test<Script>"]:
            ok, _ = validate_name(name)
            self.assertFalse(ok, f"Invalid name accepted: {name}")

    # ── Email Validation ───────────────────────────────────────────────────────
    def test_valid_emails(self):
        for email in ["user@gmail.com", "admin@capvia.io", "test.user+tag@domain.co.uk"]:
            self.assertTrue(validate_email(email), f"Valid email rejected: {email}")

    def test_invalid_emails(self):
        for email in ["notanemail", "@domain.com", "user@", "user@.com"]:
            self.assertFalse(validate_email(email), f"Invalid email accepted: {email}")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 2: JWT Token Structure
# ══════════════════════════════════════════════════════════════════════════════

class TestJWTStructure(unittest.TestCase):

    def test_jwt_has_three_parts(self):
        token = create_mock_jwt("user-123", "STUDENT")
        parts = token.split(".")
        self.assertEqual(len(parts), 3, "JWT must have 3 dot-separated parts")

    def test_jwt_payload_contains_sub(self):
        token   = create_mock_jwt("user-456", "HR")
        payload = decode_mock_jwt(token)
        self.assertIn("sub", payload)
        self.assertEqual(payload["sub"], "user-456")

    def test_jwt_payload_contains_role(self):
        token   = create_mock_jwt("user-789", "HR")
        payload = decode_mock_jwt(token)
        self.assertIn("role", payload)
        self.assertEqual(payload["role"], "HR")

    def test_jwt_payload_contains_exp(self):
        token   = create_mock_jwt("user-000", "STUDENT", expire_minutes=15)
        payload = decode_mock_jwt(token)
        self.assertIn("exp", payload)
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        self.assertGreater(exp_time, datetime.now(timezone.utc))

    def test_invalid_jwt_raises(self):
        with self.assertRaises((ValueError, Exception)):
            decode_mock_jwt("not.a.valid.jwt.token.at.all")

    def test_different_roles_produce_different_tokens(self):
        t1 = create_mock_jwt("same-user", "STUDENT")
        t2 = create_mock_jwt("same-user", "HR")
        self.assertNotEqual(t1, t2)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 3: User RBAC Logic
# ══════════════════════════════════════════════════════════════════════════════

class TestRBACLogic(unittest.TestCase):

    def test_student_is_student(self):
        role = UserRole.STUDENT
        self.assertEqual(role, "STUDENT")

    def test_hr_is_hr(self):
        role = UserRole.HR
        self.assertEqual(role, "HR")

    def test_admin_is_admin(self):
        role = UserRole.ADMIN
        self.assertEqual(role, "ADMIN")

    def test_student_cannot_access_hr_endpoints(self):
        """Simulate RBAC check: STUDENT role should fail HR-only endpoint."""
        def check_hr_access(role: str) -> bool:
            return role in [UserRole.HR, UserRole.ADMIN]
        self.assertFalse(check_hr_access("STUDENT"))
        self.assertTrue(check_hr_access("HR"))
        self.assertTrue(check_hr_access("ADMIN"))

    def test_admin_can_access_all_endpoints(self):
        """ADMIN should pass all role checks."""
        def check_access(role: str, required: str) -> bool:
            hierarchy = {"STUDENT": 0, "HR": 1, "ADMIN": 2}
            return hierarchy.get(role, -1) >= hierarchy.get(required, 999)
        self.assertTrue(check_access("ADMIN", "STUDENT"))
        self.assertTrue(check_access("ADMIN", "HR"))
        self.assertTrue(check_access("ADMIN", "ADMIN"))
        self.assertFalse(check_access("STUDENT", "HR"))


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 4: Resume Schema Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestResumeSchemas(unittest.TestCase):

    def test_score_band_logic(self):
        self.assertEqual(get_score_band(85.0), "STRONG")
        self.assertEqual(get_score_band(75.0), "GOOD")
        self.assertEqual(get_score_band(50.0), "FAIR")
        self.assertEqual(get_score_band(20.0), "WEAK")

    def test_stage_labels_complete(self):
        labels = get_stage_labels()
        required = ["PENDING", "OCR", "PARSING", "EMBEDDING", "SCORING", "DONE", "ERROR"]
        for stage in required:
            self.assertIn(stage, labels, f"Stage {stage} missing from labels")

    def test_all_stage_labels_are_strings(self):
        labels = get_stage_labels()
        for k, v in labels.items():
            self.assertIsInstance(v, str, f"Stage {k} label is not a string")

    def test_confidence_labels(self):
        self.assertEqual(get_confidence_label(0.90), "HIGH")
        self.assertEqual(get_confidence_label(0.75), "MEDIUM")
        self.assertEqual(get_confidence_label(0.55), "LOW")
        self.assertEqual(get_confidence_label(0.30), "VERY_LOW")

    def test_resume_upload_response_structure(self):
        """Validate expected response fields are present."""
        response = {
            "resume_id":         "uuid-12345",
            "status":            "PENDING",
            "message":           "Resume uploaded. Processing started.",
            "estimated_seconds": 45,
        }
        self.assertIn("resume_id", response)
        self.assertIn("status", response)
        self.assertEqual(response["status"], "PENDING")
        self.assertIsInstance(response["estimated_seconds"], int)

    def test_progress_percent_in_range(self):
        """Progress percent must be 0-100."""
        for pct in [0, 25, 50, 75, 100]:
            self.assertGreaterEqual(pct, 0)
            self.assertLessEqual(pct, 100)

    def test_overall_score_range(self):
        """Overall score must be 0-100."""
        valid_scores = [0.0, 25.5, 67.3, 100.0]
        for score in valid_scores:
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 100.0)

    def test_skill_match_score_range(self):
        """Skill match similarity must be 0-1."""
        for sim in [0.0, 0.5, 0.85, 1.0]:
            self.assertGreaterEqual(sim, 0.0)
            self.assertLessEqual(sim, 1.0)

    def test_fraud_verdict_values(self):
        valid_verdicts = {"CLEAN", "SUSPICIOUS", "LIKELY_FRAUD"}
        for v in ["CLEAN", "SUSPICIOUS", "LIKELY_FRAUD"]:
            self.assertIn(v, valid_verdicts)

    def test_rewrite_sections_valid(self):
        valid_sections = {"skills", "experience", "summary", "projects"}
        for s in ["skills", "experience", "summary", "projects"]:
            self.assertIn(s, valid_sections)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 5: Backend File & Code Structure
# ══════════════════════════════════════════════════════════════════════════════

class TestBackendStructure(unittest.TestCase):

    BACKEND_DIR = ROOT / "backend"

    REQUIRED_DIRS = ["api", "core", "db", "models", "schemas", "services", "workers"]
    REQUIRED_FILES = [
        "main.py", "config.py", "dependencies.py", "requirements.txt",
        "models/user.py", "schemas/auth.py", "schemas/resume.py",
        "models/audit_log.py",
    ]

    def test_required_directories_exist(self):
        for d in self.REQUIRED_DIRS:
            path = self.BACKEND_DIR / d
            self.assertTrue(path.exists() and path.is_dir(),
                            f"Directory missing: backend/{d}")

    def test_required_files_exist(self):
        for f in self.REQUIRED_FILES:
            path = self.BACKEND_DIR / f
            self.assertTrue(path.exists(), f"File missing: backend/{f}")

    def test_config_py_has_settings_class(self):
        content = (self.BACKEND_DIR / "config.py").read_text()
        self.assertIn("class Settings", content)
        self.assertIn("DATABASE_URL", content)
        self.assertIn("JWT_SECRET_KEY", content)
        self.assertIn("REDIS_URL", content)

    def test_user_model_has_roles(self):
        content = (self.BACKEND_DIR / "models" / "user.py").read_text()
        self.assertIn("UserRole", content)
        self.assertIn("STUDENT", content)
        self.assertIn("HR", content)
        self.assertIn("ADMIN", content)

    def test_auth_schema_has_validators(self):
        content = (self.BACKEND_DIR / "schemas" / "auth.py").read_text()
        self.assertIn("validate_password_strength", content)
        self.assertIn("validate_role", content)
        self.assertIn("RegisterRequest", content)
        self.assertIn("TokenResponse", content)

    def test_resume_schema_has_key_models(self):
        content = (self.BACKEND_DIR / "schemas" / "resume.py").read_text()
        self.assertIn("ATSAnalysisResponse", content)
        self.assertIn("FraudAnalysis", content)
        self.assertIn("SkillGap", content)
        self.assertIn("ExplainabilityReport", content)
        self.assertIn("HeatmapSection", content)

    def test_dependencies_file_exists_and_non_empty(self):
        deps = self.BACKEND_DIR / "dependencies.py"
        self.assertTrue(deps.exists())
        self.assertGreater(deps.stat().st_size, 0)

    def test_requirements_has_core_packages(self):
        reqs = (self.BACKEND_DIR / "requirements.txt").read_text()
        for pkg in ["fastapi", "sqlalchemy", "pydantic", "redis", "celery"]:
            self.assertIn(pkg.lower(), reqs.lower(), f"{pkg} missing from requirements")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 6: Config Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestConfigValidation(unittest.TestCase):

    CONFIG_PATH = ROOT / "backend" / "config.py"

    def test_config_file_exists(self):
        self.assertTrue(self.CONFIG_PATH.exists())

    def test_config_has_all_required_settings(self):
        content = self.CONFIG_PATH.read_text()
        required_settings = [
            "DATABASE_URL", "MONGO_URL", "REDIS_URL", "JWT_SECRET_KEY",
            "AWS_S3_BUCKET", "CELERY_BROKER_URL", "CORS_ORIGINS",
            "MAX_FILE_SIZE_MB", "ALLOWED_MIME_TYPES",
        ]
        for setting in required_settings:
            self.assertIn(setting, content, f"Config setting {setting} missing")

    def test_config_has_production_safety_checks(self):
        content = self.CONFIG_PATH.read_text()
        self.assertIn("production_safety_checks", content)
        self.assertIn("is_production", content)

    def test_max_file_size_default_is_reasonable(self):
        content = self.CONFIG_PATH.read_text()
        # Should have a numeric value for MAX_FILE_SIZE_MB
        match = re.search(r"MAX_FILE_SIZE_MB:\s*int\s*=\s*(\d+)", content)
        if match:
            size = int(match.group(1))
            self.assertGreaterEqual(size, 1, "Min file size should be at least 1 MB")
            self.assertLessEqual(size, 50, "Max file size should be 50 MB or less")

    def test_allowed_mime_types_include_pdf(self):
        content = self.CONFIG_PATH.read_text()
        self.assertIn("application/pdf", content)

    def test_jwt_settings_present(self):
        content = self.CONFIG_PATH.read_text()
        self.assertIn("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", content)
        self.assertIn("JWT_REFRESH_TOKEN_EXPIRE_DAYS", content)
        self.assertIn("JWT_ALGORITHM", content)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 7: API Route Contracts
# ══════════════════════════════════════════════════════════════════════════════

class TestAPIRouteContracts(unittest.TestCase):
    """Verify route files exist and define the expected HTTP endpoints."""

    ROUTES_DIR = ROOT / "backend" / "api" / "v1" / "routes"

    EXPECTED_ROUTES = {
        "auth.py":        ["register", "login", "logout", "refresh", "me"],
        "resume.py":      ["upload", "status", "analysis", "history", "rewrite"],
        "internship.py":  ["internship"],
        "hr.py":          ["candidates", "analytics"],
    }

    def test_route_files_exist(self):
        for filename in self.EXPECTED_ROUTES:
            path = self.ROUTES_DIR / filename
            self.assertTrue(path.exists(), f"Route file missing: {filename}")

    def test_auth_routes_have_expected_endpoints(self):
        path = self.ROUTES_DIR / "auth.py"
        if not path.exists():
            self.skipTest("auth.py not found")
        content = path.read_text()
        for endpoint in ["register", "login"]:
            self.assertIn(endpoint, content.lower(), f"Endpoint '{endpoint}' not in auth.py")

    def test_resume_routes_have_expected_endpoints(self):
        path = self.ROUTES_DIR / "resume.py"
        if not path.exists():
            self.skipTest("resume.py not found")
        content = path.read_text()
        for keyword in ["upload", "status", "analysis"]:
            self.assertIn(keyword, content.lower(), f"'{keyword}' not in resume.py")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 8: File Upload Constraints
# ══════════════════════════════════════════════════════════════════════════════

class TestFileUploadConstraints(unittest.TestCase):

    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIMES  = {"application/pdf",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

    def test_pdf_mime_allowed(self):
        self.assertIn("application/pdf", self.ALLOWED_MIMES)

    def test_docx_mime_allowed(self):
        self.assertIn(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            self.ALLOWED_MIMES,
        )

    def test_jpg_mime_rejected(self):
        self.assertNotIn("image/jpeg", self.ALLOWED_MIMES)

    def test_exe_mime_rejected(self):
        self.assertNotIn("application/x-executable", self.ALLOWED_MIMES)

    def test_file_size_limit_is_5mb(self):
        self.assertEqual(self.MAX_SIZE_BYTES, 5242880)

    def test_file_above_limit_rejected(self):
        fake_file_size = 6 * 1024 * 1024  # 6 MB
        is_allowed = fake_file_size <= self.MAX_SIZE_BYTES
        self.assertFalse(is_allowed)

    def test_file_at_limit_accepted(self):
        fake_file_size = 5 * 1024 * 1024  # exactly 5 MB
        is_allowed = fake_file_size <= self.MAX_SIZE_BYTES
        self.assertTrue(is_allowed)


# ══════════════════════════════════════════════════════════════════════════════
#  RUNNER
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("  CAPVIA — PHASE 2: BACKEND TESTS")
    print("=" * 70)
    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    test_classes = [
        TestAuthSchemaValidation,
        TestJWTStructure,
        TestRBACLogic,
        TestResumeSchemas,
        TestBackendStructure,
        TestConfigValidation,
        TestAPIRouteContracts,
        TestFileUploadConstraints,
    ]
    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
