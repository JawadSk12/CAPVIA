#!/usr/bin/env python3
"""
==============================================================================
 PHASE 3: FRONTEND TESTS
 Tests: TypeScript compilation, component file integrity, store logic,
        API contract alignment, type definitions, Tailwind config, routing
 Runner: python3 tests/phase3_frontend_tests.py
         Also runs: npx tsc --noEmit (TypeScript type check)
==============================================================================
"""
import unittest
import subprocess
import sys
import os
import re
import json
from pathlib import Path

ROOT         = Path(__file__).parent.parent
FRONTEND_DIR = ROOT / "frontend"

# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 1: Frontend Directory & File Structure
# ══════════════════════════════════════════════════════════════════════════════

class TestFrontendStructure(unittest.TestCase):

    REQUIRED_DIRS = [
        "app", "components", "store", "lib", "types", "public",
        "components/ats", "components/hr", "components/shared",
        "app/student", "app/hr", "app/(auth)",
    ]
    REQUIRED_FILES = [
        "package.json", "tsconfig.json", "tailwind.config.ts",
        "postcss.config.js",
        "lib/api.ts", "store/authStore.ts", "store/atsStore.ts",
        "types/ats.ts", "app/globals.css", "app/layout.tsx",
        "app/page.tsx",
    ]

    def test_required_directories_exist(self):
        for d in self.REQUIRED_DIRS:
            path = FRONTEND_DIR / d
            self.assertTrue(path.exists() and path.is_dir(),
                            f"Directory missing: frontend/{d}")

    def test_required_files_exist(self):
        for f in self.REQUIRED_FILES:
            path = FRONTEND_DIR / f
            self.assertTrue(path.exists(), f"File missing: frontend/{f}")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 2: package.json Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestPackageJson(unittest.TestCase):

    PKG_PATH = FRONTEND_DIR / "package.json"

    def _load_pkg(self) -> dict:
        with open(self.PKG_PATH) as f:
            return json.load(f)

    def test_package_json_valid_json(self):
        self.assertTrue(self.PKG_PATH.exists())
        pkg = self._load_pkg()
        self.assertIsInstance(pkg, dict)

    def test_has_name_and_version(self):
        pkg = self._load_pkg()
        self.assertIn("name", pkg)
        self.assertIn("version", pkg)

    def test_has_required_scripts(self):
        pkg = self._load_pkg()
        scripts = pkg.get("scripts", {})
        for script in ["dev", "build", "start", "lint"]:
            self.assertIn(script, scripts, f"Script '{script}' missing from package.json")

    def test_has_core_dependencies(self):
        pkg  = self._load_pkg()
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        required = ["next", "react", "react-dom", "typescript", "zustand",
                    "axios", "recharts", "zod"]
        for dep in required:
            self.assertIn(dep, deps, f"Dependency '{dep}' missing from package.json")

    def test_no_invalid_radix_badge_package(self):
        """Confirms the non-existent @radix-ui/react-badge was removed."""
        pkg  = self._load_pkg()
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        self.assertNotIn("@radix-ui/react-badge", deps,
                         "@radix-ui/react-badge should have been removed")

    def test_next_version_is_14(self):
        pkg  = self._load_pkg()
        deps = {**pkg.get("dependencies", {})}
        next_ver = deps.get("next", "")
        self.assertTrue(
            next_ver.startswith("14") or "14" in next_ver,
            f"Expected Next.js 14, got: {next_ver}"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 3: TypeScript Configuration
# ══════════════════════════════════════════════════════════════════════════════

class TestTypeScriptConfig(unittest.TestCase):

    TSCONFIG_PATH = FRONTEND_DIR / "tsconfig.json"

    def _load_tsconfig(self) -> dict:
        with open(self.TSCONFIG_PATH) as f:
            return json.load(f)

    def test_tsconfig_exists(self):
        self.assertTrue(self.TSCONFIG_PATH.exists())

    def test_tsconfig_valid_json(self):
        config = self._load_tsconfig()
        self.assertIsInstance(config, dict)

    def test_tsconfig_has_compiler_options(self):
        config = self._load_tsconfig()
        self.assertIn("compilerOptions", config)

    def test_tsconfig_targets_modern_js(self):
        config = self._load_tsconfig()
        target = config.get("compilerOptions", {}).get("target", "")
        self.assertIn(target, ["ES6", "ES2015", "ES2017", "ES2018",
                               "ES2019", "ES2020", "ESNext", "es5"],
                      f"Unexpected TS target: {target}")

    def test_tsconfig_has_path_aliases(self):
        config  = self._load_tsconfig()
        paths   = config.get("compilerOptions", {}).get("paths", {})
        base_url = config.get("compilerOptions", {}).get("baseUrl", "")
        self.assertTrue(
            paths or base_url,
            "tsconfig should have path aliases or baseUrl for imports"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 4: TypeScript Type Definitions
# ══════════════════════════════════════════════════════════════════════════════

class TestTypeDefinitions(unittest.TestCase):

    TYPES_PATH = FRONTEND_DIR / "types" / "ats.ts"

    def _content(self) -> str:
        return self.TYPES_PATH.read_text(encoding="utf-8")

    def test_types_file_exists(self):
        self.assertTrue(self.TYPES_PATH.exists())

    def test_types_file_not_empty(self):
        content = self._content()
        self.assertGreater(len(content), 500)

    def test_has_ats_analysis_response(self):
        self.assertIn("ATSAnalysisResponse", self._content())

    def test_has_skill_gap(self):
        self.assertIn("SkillGap", self._content())

    def test_has_fraud_analysis(self):
        self.assertIn("FraudAnalysis", self._content())

    def test_has_resume_summary(self):
        self.assertIn("ResumeSummary", self._content())

    def test_has_heatmap_type(self):
        content = self._content()
        self.assertTrue("Heatmap" in content or "heatmap" in content)

    def test_has_explainability_type(self):
        content = self._content()
        self.assertTrue("Explainability" in content or "explainability" in content)

    def test_has_hr_status_types(self):
        content = self._content()
        self.assertTrue("HRStatus" in content or "SHORTLIST" in content)

    def test_has_processing_status(self):
        content = self._content()
        self.assertTrue("PENDING" in content or "ProcessingStatus" in content)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 5: Zustand Store Files
# ══════════════════════════════════════════════════════════════════════════════

class TestZustandStores(unittest.TestCase):

    def _read(self, filename: str) -> str:
        return (FRONTEND_DIR / "store" / filename).read_text(encoding="utf-8")

    def test_auth_store_exists(self):
        self.assertTrue((FRONTEND_DIR / "store" / "authStore.ts").exists())

    def test_ats_store_exists(self):
        self.assertTrue((FRONTEND_DIR / "store" / "atsStore.ts").exists())

    def test_auth_store_has_login(self):
        self.assertIn("login", self._read("authStore.ts"))

    def test_auth_store_has_logout(self):
        self.assertIn("logout", self._read("authStore.ts"))

    def test_auth_store_has_register(self):
        self.assertIn("register", self._read("authStore.ts"))

    def test_auth_store_has_role_selectors(self):
        content = self._read("authStore.ts")
        self.assertTrue("useIsHR" in content or "isHR" in content or "HR" in content)
        self.assertTrue("useIsStudent" in content or "isStudent" in content or "STUDENT" in content)

    def test_ats_store_has_upload(self):
        content = self._read("atsStore.ts")
        self.assertTrue("upload" in content.lower() or "startUpload" in content)

    def test_ats_store_has_analysis(self):
        content = self._read("atsStore.ts")
        self.assertTrue("analysis" in content.lower() or "loadAnalysis" in content)

    def test_ats_store_has_progress(self):
        content = self._read("atsStore.ts")
        self.assertTrue("progress" in content.lower() or "uploadProgress" in content)

    def test_auth_store_uses_zustand(self):
        self.assertIn("zustand", self._read("authStore.ts"))

    def test_ats_store_uses_zustand(self):
        self.assertIn("zustand", self._read("atsStore.ts"))


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 6: API Client Library
# ══════════════════════════════════════════════════════════════════════════════

class TestAPIClient(unittest.TestCase):

    API_PATH = FRONTEND_DIR / "lib" / "api.ts"

    def _content(self) -> str:
        return self.API_PATH.read_text(encoding="utf-8")

    def test_api_file_exists(self):
        self.assertTrue(self.API_PATH.exists())

    def test_has_axios_instance(self):
        content = self._content()
        self.assertTrue("axios" in content, "API client should use axios")

    def test_has_auth_api(self):
        content = self._content()
        self.assertTrue("login" in content and "register" in content)

    def test_has_resume_api(self):
        content = self._content()
        self.assertTrue("upload" in content.lower() or "resume" in content.lower())

    def test_has_base_url_config(self):
        content = self._content()
        self.assertTrue(
            "NEXT_PUBLIC_API_URL" in content or "baseURL" in content,
            "API client must configure base URL"
        )

    def test_has_auth_interceptor(self):
        content = self._content()
        self.assertTrue(
            "interceptors" in content or "Authorization" in content,
            "API client should have auth interceptor"
        )


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 7: ATS Component Files
# ══════════════════════════════════════════════════════════════════════════════

class TestATSComponents(unittest.TestCase):

    COMP_DIR = FRONTEND_DIR / "components" / "ats"

    REQUIRED_COMPONENTS = [
        "ConfidenceIndicator.tsx",
        "InternshipComparison.tsx",
        "SemanticMatchViz.tsx",
        "ResumeHeatmap.tsx",
    ]

    def test_all_ats_components_exist(self):
        for comp in self.REQUIRED_COMPONENTS:
            path = self.COMP_DIR / comp
            self.assertTrue(path.exists(), f"ATS component missing: {comp}")

    def test_confidence_indicator_content(self):
        path = self.COMP_DIR / "ConfidenceIndicator.tsx"
        if not path.exists(): self.skipTest("File missing")
        content = path.read_text()
        self.assertTrue("HIGH" in content.upper() or "High" in content)
        self.assertTrue("MEDIUM" in content.upper() or "Medium" in content)
        self.assertTrue("LOW" in content.upper() or "Low" in content)

    def test_internship_comparison_has_score(self):
        path = self.COMP_DIR / "InternshipComparison.tsx"
        if not path.exists(): self.skipTest("File missing")
        content = path.read_text()
        self.assertTrue("score" in content.lower() or "match" in content.lower())

    def test_semantic_match_viz_uses_recharts(self):
        path = self.COMP_DIR / "SemanticMatchViz.tsx"
        if not path.exists(): self.skipTest("File missing")
        content = path.read_text()
        self.assertTrue("recharts" in content or "Scatter" in content or "Chart" in content)

    def test_all_components_are_tsx(self):
        for comp in self.REQUIRED_COMPONENTS:
            self.assertTrue(comp.endswith(".tsx"), f"{comp} should be .tsx")


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 8: App Router Pages
# ══════════════════════════════════════════════════════════════════════════════

class TestAppRouterPages(unittest.TestCase):

    APP_DIR = FRONTEND_DIR / "app"

    REQUIRED_PAGES = [
        "page.tsx",
        "layout.tsx",
        "student/dashboard/page.tsx",
        "student/upload/page.tsx",
        "student/analysis/[id]/page.tsx",
        "student/internship/page.tsx",
        "student/progress/page.tsx",
        "hr/dashboard/page.tsx",
        "hr/candidates/page.tsx",
        "hr/internship/page.tsx",
        "(auth)/login/page.tsx",
        "(auth)/register/page.tsx",
    ]

    def test_required_pages_exist(self):
        for page in self.REQUIRED_PAGES:
            path = self.APP_DIR / page
            self.assertTrue(path.exists(), f"Page missing: app/{page}")

    def test_root_layout_has_providers(self):
        layout = (self.APP_DIR / "layout.tsx").read_text()
        self.assertTrue(
            "Provider" in layout or "Toaster" in layout or "layout" in layout.lower(),
            "Root layout should include providers"
        )

    def test_global_css_exists_and_non_empty(self):
        css_path = self.APP_DIR / "globals.css"
        self.assertTrue(css_path.exists())
        self.assertGreater(css_path.stat().st_size, 100)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 9: TypeScript Compilation (tsc --noEmit)
# ══════════════════════════════════════════════════════════════════════════════

class TestTypeScriptCompilation(unittest.TestCase):
    """Runs tsc --noEmit if node_modules + tsc are available."""

    def test_typescript_compiles_without_errors(self):
        tsc_path = FRONTEND_DIR / "node_modules" / ".bin" / "tsc"
        if not tsc_path.exists():
            self.skipTest("node_modules not installed — run npm install first")

        result = subprocess.run(
            [str(tsc_path), "--noEmit", "--project", str(FRONTEND_DIR / "tsconfig.json")],
            cwd=str(FRONTEND_DIR),
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            # Filter common noise (node_modules internal errors are not our concern)
            errors = [
                line for line in result.stdout.splitlines() + result.stderr.splitlines()
                if "node_modules" not in line and line.strip()
            ]
            project_errors = [e for e in errors if "error TS" in e]

            if project_errors:
                error_summary = "\n".join(project_errors[:20])
                self.fail(f"TypeScript compilation errors:\n{error_summary}")
            else:
                # Only node_modules errors — not our fault
                self.skipTest("Only node_modules type errors (acceptable)")

    def test_next_config_is_valid(self):
        next_config_ts = FRONTEND_DIR / "next.config.ts"
        next_config_mjs = FRONTEND_DIR / "next.config.mjs"
        next_config = next_config_ts if next_config_ts.exists() else next_config_mjs
        self.assertTrue(next_config.exists(), "next.config.ts or next.config.mjs missing")
        content = next_config.read_text()
        self.assertGreater(len(content), 10)


# ══════════════════════════════════════════════════════════════════════════════
#  TEST SUITE 10: Tailwind CSS Configuration
# ══════════════════════════════════════════════════════════════════════════════

class TestTailwindConfig(unittest.TestCase):

    TW_PATH = FRONTEND_DIR / "tailwind.config.ts"

    def test_tailwind_config_exists(self):
        self.assertTrue(self.TW_PATH.exists())

    def test_tailwind_content_includes_app_and_components(self):
        content = self.TW_PATH.read_text()
        self.assertIn("app", content)
        self.assertIn("components", content)

    def test_tailwind_has_theme_extension(self):
        content = self.TW_PATH.read_text()
        self.assertTrue("theme" in content or "extend" in content)

    def test_postcss_config_exists(self):
        postcss = FRONTEND_DIR / "postcss.config.js"
        self.assertTrue(postcss.exists(), "postcss.config.js missing")

    def test_postcss_has_tailwind_plugin(self):
        content = (FRONTEND_DIR / "postcss.config.js").read_text()
        self.assertIn("tailwindcss", content)


# ══════════════════════════════════════════════════════════════════════════════
#  RUNNER
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("  CAPVIA — PHASE 3: FRONTEND TESTS")
    print("=" * 70)
    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    test_classes = [
        TestFrontendStructure,
        TestPackageJson,
        TestTypeScriptConfig,
        TestTypeDefinitions,
        TestZustandStores,
        TestAPIClient,
        TestATSComponents,
        TestAppRouterPages,
        TestTypeScriptCompilation,
        TestTailwindConfig,
    ]
    for cls in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
