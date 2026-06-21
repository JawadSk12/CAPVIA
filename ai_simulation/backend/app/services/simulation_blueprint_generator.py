"""
Dynamic Simulation Blueprint Generator
Orchestrates: Understanding → Capability Graph → Task Synthesis → Blueprint
Replaces static role-based question banks entirely.
"""
import random
from typing import Dict, Any, Optional
from loguru import logger

from app.services.capability_graph_builder import build_capability_graph
from app.services.task_synthesis_engine import synthesize_simulation


def generate(
    internship_id: int,
    internship_data: Dict[str, Any],
    role_key: Optional[str] = None,      # kept for API compat, ignored
    role_name: Optional[str] = None,     # kept for API compat, ignored
    specialization: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fully dynamic blueprint generation.

    Pipeline:
      internship_data → Capability Graph → Task Synthesis → Blueprint Dict

    Every internship produces a unique blueprint based on its
    actual title, skills, responsibilities, and technologies.
    """
    # ── 1. Build Capability Graph ─────────────────────────────────────────────
    graph = build_capability_graph(internship_data)
    spec_key   = graph["specialization_key"]
    spec_label = graph["specialization_label"]
    domain     = graph["domain"]
    difficulty = graph["difficulty"]
    seed       = graph["rng_seed"]

    logger.info(
        f"Blueprint [{internship_id}] spec={spec_key} "
        f"domain={domain} difficulty={difficulty} seed={seed}"
    )

    # ── 2. Synthesize Rounds ──────────────────────────────────────────────────
    rounds = synthesize_simulation(graph)

    total_minutes = sum(r["time_limit_minutes"] for r in rounds)
    total_tasks   = sum(len(r["tasks"]) for r in rounds)

    # ── 3. Assemble Blueprint ─────────────────────────────────────────────────
    return {
        # Identity
        "internship_id":       internship_id,
        "role_key":            spec_key,
        "role_name":           internship_data.get("title", spec_label),
        "specialization":      spec_label,
        "domain":              domain,
        "difficulty":          difficulty,

        # Metadata
        "randomization_seed":         seed,
        "total_duration_minutes":     total_minutes,
        "total_tasks":                total_tasks,
        "capability_graph_summary": {
            "primary_skills":        graph["primary_skills"],
            "concepts":              graph["concepts"],
            "tools":                 graph["all_tools"][:6],
            "dataset_used":          graph["dataset"],
            "top_specializations":   graph["top_specializations"],
        },

        # Simulation content
        "rounds": rounds,

        # Context passed to frontend
        "simulation_context": {
            "internship_title": graph["internship_title"],
            "specialization":   spec_label,
            "difficulty":       difficulty,
            "skills_tested":    graph["primary_skills"][:5],
            "tools_required":   graph["all_tools"][:4],
        },
    }


# ── Backwards-compatible wrapper used by existing endpoint ────────────────────

class DynamicBlueprintGenerator:
    """Singleton-style wrapper for the endpoint to call."""

    def generate(
        self,
        internship_id: int,
        role_key: str,
        role_name: str,
        specialization: Optional[str] = None,
        internship_data: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        data = internship_data or {}
        return generate(
            internship_id=internship_id,
            internship_data=data,
            role_key=role_key,
            role_name=role_name,
            specialization=specialization,
        )


simulation_blueprint_generator = DynamicBlueprintGenerator()
