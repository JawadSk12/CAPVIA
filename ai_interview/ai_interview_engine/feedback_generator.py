"""
feedback_generator.py
======================
Generates overall evaluation report, synthesizing strengths, weaknesses, and suggestions.
"""

from typing import List, Dict

def generate_final_report(evaluations: List[Dict], final_score: float, role: str, topic: str) -> Dict:
    """
    Combines individual evaluations and calculates overall report details.
    """
    total_q = len(evaluations)
    pct = round(final_score * 100, 1)

    # Map score to overall recommendation tier and color
    if pct >= 78.0:
        tier = "Strong Hire"
        color = "#10B981"  # Emerald Green
    elif pct >= 60.0:
        tier = "Consider"
        color = "#3B82F6"  # Blue
    elif pct >= 42.0:
        tier = "Review Required"
        color = "#F59E0B"  # Amber
    else:
        tier = "Not Recommended"
        color = "#EF4444"  # Red

    # Analyze individual evaluations to extract insights
    correct_count = sum(1 for e in evaluations if e["tier"] in ["Excellent", "Good"])
    poor_count = sum(1 for e in evaluations if e["tier"] == "Poor")
    
    # Extract missing keywords for synthesis
    all_missing = []
    for e in evaluations:
        # Check missing feedback or extract from question words if present
        missing_text = e.get("missing", "")
        if "Could elaborate more on:" in missing_text:
            kws = missing_text.replace("Could elaborate more on:", "").strip().split(",")
            all_missing.extend([k.strip() for k in kws if k.strip() and k.strip() != "further details"])
        elif "Missed essential concepts:" in missing_text:
            kws = missing_text.replace("Missed essential concepts:", "").strip().split(",")
            all_missing.extend([k.strip() for k in kws if k.strip() and k.strip() != "fundamental topics"])

    # Clean and deduplicate missing keywords
    unique_missing = []
    for m in all_missing:
        m_clean = m.rstrip('.').strip()
        if m_clean and m_clean not in unique_missing:
            unique_missing.append(m_clean)

    # ── Strengths Synthesis ───────────────────────────────────────────────────
    strengths_list = []
    if correct_count == total_q:
        strengths_list.append(f"Exceptional performance: Answered all {total_q} questions correctly.")
    elif correct_count > 0:
        strengths_list.append(f"Demonstrated solid understanding of core concepts in {correct_count} out of {total_q} responses.")
    else:
        strengths_list.append("Captured basic responses to questions, displaying familiarity with the domain.")

    # Check for good semantic scores
    high_sem_count = sum(1 for e in evaluations if e["sem_score"] >= 0.7)
    if high_sem_count >= 3:
        strengths_list.append(f"Showed high technical alignment and relevance on {high_sem_count} answers.")

    strengths = " ".join(strengths_list)

    # ── Weaknesses Synthesis ──────────────────────────────────────────────────
    weaknesses_list = []
    if poor_count > 0:
        weaknesses_list.append(f"Had difficulty with {poor_count} response(s), which were brief or lacked technical terms.")
    
    if unique_missing:
        weaknesses_list.append(f"Missed or omitted key conceptual details regarding: {', '.join(unique_missing[:3])}.")
    else:
        weaknesses_list.append("No major technical gaps identified.")

    weaknesses = " ".join(weaknesses_list)

    # ── Suggestions Synthesis ─────────────────────────────────────────────────
    suggestions_list = []
    if poor_count > 0 or pct < 60.0:
        suggestions_list.append("Provide more detailed answers. Aim to explain the underlying mechanics rather than just definitions.")
    
    if unique_missing:
        suggestions_list.append(f"Revise and practice explaining the following concepts: {', '.join(unique_missing[:4])}.")
    
    suggestions_list.append("Use structured reasoning (e.g., giving concrete examples, explaining trade-offs) to make answers more coherent.")
    
    suggestions = " ".join(suggestions_list)

    return {
        "final_score_pct": f"{pct}%",
        "tier": tier,
        "color": color,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "per_question": evaluations
    }
