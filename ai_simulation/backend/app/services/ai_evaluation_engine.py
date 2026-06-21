"""
AI Evaluation Engine
Evaluates simulation attempts across 5 rounds and computes scores.
"""

import re
from typing import Dict, Any, List, Optional
from loguru import logger


class AIEvaluationEngine:

    ROUND_WEIGHTS = {1: 0.15, 2: 0.35, 3: 0.20, 4: 0.15, 5: 0.15}

    def evaluate_attempt(self, attempt_data: Dict, blueprint: Dict) -> Dict[str, Any]:
        """Full evaluation of a simulation attempt."""
        answers = attempt_data.get("answers", {})
        code_submissions = attempt_data.get("code_submissions", {})
        behavior_events = attempt_data.get("behavior_events", [])

        round_scores = {}
        round_details = {}

        for round_num in range(1, 6):
            rkey = f"round_{round_num}"
            round_answers = answers.get(rkey, {})
            round_code = code_submissions.get(rkey, {})
            round_data = next((r for r in blueprint.get("rounds", []) if r["round_number"] == round_num), None)

            score, detail = self._evaluate_round(round_num, round_answers, round_code, round_data)
            round_scores[rkey] = round(score, 1)
            round_details[rkey] = detail

        # Weighted total
        total = sum(
            round_scores.get(f"round_{n}", 0) * w
            for n, w in self.ROUND_WEIGHTS.items()
        )
        total = round(min(total, 100), 1)

        # Anti-cheat + AI dependency analysis (includes text-pattern detection)
        cheating = self._analyze_behavior(behavior_events, answers=answers, code_submissions=code_submissions)

        # Recommendation
        recommendation = self._recommend(total, cheating["risk_level"])

        return {
            "total_score": total,
            "round_scores": round_scores,
            "round_details": round_details,
            "cheating_risk_score": cheating["risk_score"],
            "ai_dependency_score": cheating["ai_dependency_score"],
            "cheating_risk_level": cheating["risk_level"],
            "recommendation": recommendation,
            "strengths": self._extract_strengths(round_scores, round_details),
            "areas_for_improvement": self._extract_improvements(round_scores, round_details),
            "summary": self._generate_summary(total, round_scores, cheating)
        }

    def _evaluate_round(self, round_num: int, answers: Dict, code: Dict, round_data: Optional[Dict]) -> tuple:
        if not answers and not code:
            return 0.0, {"status": "unattempted", "feedback": "Round not attempted."}

        if round_num == 1:
            return self._eval_written(answers, expected_concepts=["requirement", "feature", "edge case", "assumption"])
        elif round_num == 2:
            return self._eval_code(code or answers)
        elif round_num == 3:
            return self._eval_multiple_choice(answers)
        elif round_num == 4:
            return self._eval_communication(answers)
        elif round_num == 5:
            return self._eval_debugging(code or answers)
        return 50.0, {"status": "evaluated", "feedback": "Generic evaluation applied."}

    def _eval_written(self, answers: Dict, expected_concepts: List[str]) -> tuple:
        text = " ".join(str(v) for v in answers.values()).lower()
        if len(text) < 30:
            return 20.0, {"feedback": "Answer too brief — insufficient detail.", "concepts_hit": []}

        hits = [c for c in expected_concepts if c in text]
        word_count = len(text.split())
        structure_score = min(word_count / 5, 40)  # Up to 40 pts for length/depth
        concept_score = (len(hits) / max(len(expected_concepts), 1)) * 60
        score = min(structure_score + concept_score, 100)

        return round(score, 1), {
            "feedback": f"Covered {len(hits)}/{len(expected_concepts)} key concepts.",
            "concepts_hit": hits,
            "word_count": word_count
        }

    def _eval_code(self, submissions: Dict) -> tuple:
        total_code = " ".join(str(v) for v in submissions.values())
        if len(total_code) < 20:
            return 10.0, {"feedback": "No code submitted.", "lines": 0}

        lines = len([l for l in total_code.split("\n") if l.strip()])
        has_error_handling = any(kw in total_code for kw in ["try", "except", "catch", "error", "Error"])
        has_comments = "#" in total_code or "//" in total_code
        has_functions = any(kw in total_code for kw in ["def ", "function ", "const ", "class "])
        has_imports = any(kw in total_code for kw in ["import ", "require(", "from "])

        score = 30  # base for submitting
        if lines > 5: score += 15
        if lines > 20: score += 10
        if has_error_handling: score += 15
        if has_comments: score += 10
        if has_functions: score += 10
        if has_imports: score += 10
        score = min(score, 100)

        return round(float(score), 1), {
            "feedback": f"Code submitted: {lines} lines.",
            "has_error_handling": has_error_handling,
            "has_comments": has_comments,
            "lines": lines
        }

    def _eval_multiple_choice(self, answers: Dict) -> tuple:
        if not answers:
            return 0.0, {"feedback": "No option selected."}
        # Any selection = attempting; we score based on justification length if provided
        text = " ".join(str(v) for v in answers.values())
        base = 60.0
        if len(text) > 100:
            base += 20  # justification provided
        if len(text) > 300:
            base += 20  # detailed justification
        return min(base, 100.0), {"feedback": "Option selected with justification."}

    def _eval_communication(self, answers: Dict) -> tuple:
        text = " ".join(str(v) for v in answers.values()).lower()
        word_count = len(text.split())
        if word_count < 20:
            return 15.0, {"feedback": "Answer too brief for communication round."}

        # Check for clarity markers
        has_analogy = any(w in text for w in ["like", "similar to", "imagine", "think of", "example"])
        has_structure = any(w in text for w in ["first", "second", "finally", "because", "therefore"])
        avoids_jargon = word_count > 0 and len([w for w in text.split() if len(w) > 12]) / word_count < 0.15

        score = 40 + (20 if has_analogy else 0) + (20 if has_structure else 0) + (20 if avoids_jargon else 0)
        return min(float(score), 100.0), {
            "feedback": "Communication evaluated on clarity, structure, and accessibility.",
            "has_analogy": has_analogy,
            "has_structure": has_structure
        }

    def _eval_debugging(self, submissions: Dict) -> tuple:
        text = " ".join(str(v) for v in submissions.values()).lower()
        if len(text) < 10:
            return 0.0, {"feedback": "No debugging response."}

        has_fix = any(kw in text for kw in ["fix", "bug", "issue", "problem", "error", "corrected", "replaced", "added"])
        has_explanation = len(text.split()) > 50
        has_root_cause = any(kw in text for kw in ["because", "reason", "cause", "due to", "results in"])

        score = 20 + (30 if has_fix else 0) + (25 if has_explanation else 0) + (25 if has_root_cause else 0)
        return min(float(score), 100.0), {
            "feedback": "Debugging evaluated on fix quality and root cause analysis.",
            "has_root_cause": has_root_cause
        }

    def _analyze_behavior(self, events: List[Dict], answers: Optional[Dict] = None, code_submissions: Optional[Dict] = None) -> Dict:
        tab_switches = sum(1 for e in events if e.get("event_type") == "tab_switch")
        paste_events = sum(1 for e in events if e.get("event_type") == "copy_paste")
        focus_lost   = sum(1 for e in events if e.get("event_type") == "focus_lost")
        idle_events  = sum(1 for e in events if e.get("event_type") == "idle")
        burst_typing = sum(1 for e in events if e.get("event_type") == "burst_typing")

        # --- Behavioral risk score ---
        risk_score = 0.0
        risk_score += min(tab_switches * 8, 30)
        risk_score += min(paste_events * 12, 40)
        risk_score += min(burst_typing * 5, 20)
        risk_score += min(idle_events * 3, 10)
        risk_score = min(risk_score, 100)

        # --- AI Dependency: text-pattern analysis ---
        ai_text_score = 0.0
        all_text = ""

        if answers:
            for rdict in answers.values():
                if isinstance(rdict, dict):
                    all_text += " ".join(str(v) for v in rdict.values()) + " "
        if code_submissions:
            for rdict in code_submissions.values():
                if isinstance(rdict, dict):
                    all_text += " ".join(str(v) for v in rdict.values()) + " "

        if all_text.strip():
            ai_text_score = self._detect_ai_text(all_text)

        # Combine: text analysis is primary, behavior is secondary
        behavioral_ai = min(burst_typing * 10 + paste_events * 15, 60)
        ai_dependency = round(min(ai_text_score * 0.75 + behavioral_ai * 0.25, 100), 1)

        if risk_score >= 70:
            level = "CRITICAL"
        elif risk_score >= 45:
            level = "HIGH"
        elif risk_score >= 20:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "risk_score": round(risk_score, 1),
            "ai_dependency_score": ai_dependency,
            "risk_level": level,
            "tab_switches": tab_switches,
            "paste_events": paste_events,
            "burst_typing": burst_typing,
        }

    def _detect_ai_text(self, text: str) -> float:
        """
        Heuristic AI-text detector. Returns 0–100 score.
        Higher = more likely AI-generated.
        """
        score = 0.0
        t = text.strip()
        words = t.split()
        word_count = len(words)
        if word_count < 10:
            return 0.0

        # 1. Signature AI transition phrases
        ai_phrases = [
            "certainly", "of course", "absolutely", "in conclusion",
            "it is important to note", "it is worth noting",
            "furthermore", "additionally", "moreover", "in summary",
            "to summarize", "in essence", "at its core",
            "this approach ensures", "this ensures that",
            "a key consideration", "key considerations",
            "one of the main", "plays a crucial role",
            "let me explain", "great question", "let's dive into",
            "as an ai", "i cannot", "i'm unable to", "as a language model",
            "step 1", "step 2", "step 3",   # structured AI outputs
            "**", "##",                       # markdown headers
            "here are", "here is a", "below is",
            "hope this helps", "feel free to",
        ]
        hits = sum(1 for p in ai_phrases if p.lower() in t.lower())
        score += min(hits * 12, 45)

        # 2. Abnormally long average word length (AI uses formal vocabulary)
        avg_word_len = sum(len(w.strip(".,!?;:\"'")) for w in words) / max(word_count, 1)
        if avg_word_len > 7.5:
            score += 15
        elif avg_word_len > 6.5:
            score += 8

        # 3. Very high word count with perfect structure (unlikely human under time pressure)
        if word_count > 400:
            score += 15
        elif word_count > 200:
            score += 8

        # 4. Numbered / bulleted lists (ChatGPT loves these)
        list_patterns = len(re.findall(r'(\d+[\.\)]\s|\•\s|\-\s[A-Z])', t))
        if list_patterns >= 4:
            score += 20
        elif list_patterns >= 2:
            score += 10

        # 5. Lacks personal voice / first-person informal markers
        personal_markers = ["i think", "i believe", "in my experience", "i've", "i'd", "tbh", "imo", "personally"]
        personal_hits = sum(1 for m in personal_markers if m in t.lower())
        if personal_hits == 0 and word_count > 80:
            score += 10  # no personal voice is suspicious for longer answers

        # 6. Suspiciously uniform sentence length
        sentences = re.split(r'[.!?]+', t)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
        if len(sentences) > 3:
            lengths = [len(s.split()) for s in sentences]
            avg_len = sum(lengths) / len(lengths)
            variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
            if variance < 15 and avg_len > 12:  # very uniform = AI
                score += 12

        return min(score, 100.0)

    def _recommend(self, score: float, risk_level: str) -> str:
        if risk_level == "CRITICAL":
            return "reject"
        if score >= 75 and risk_level in ["LOW", "MEDIUM"]:
            return "hire"
        if score >= 55:
            return "consider"
        return "reject"

    def _extract_strengths(self, round_scores: Dict, details: Dict) -> List[str]:
        strengths = []
        labels = {
            "round_1": "Requirement Analysis", "round_2": "Technical Execution",
            "round_3": "Architectural Thinking", "round_4": "Communication",
            "round_5": "Debugging"
        }
        for rkey, score in round_scores.items():
            if score >= 70:
                strengths.append(f"Strong {labels.get(rkey, rkey)} skills ({score:.0f}/100)")
        return strengths or ["Shows promise in attempted areas"]

    def _extract_improvements(self, round_scores: Dict, details: Dict) -> List[str]:
        areas = []
        labels = {
            "round_1": "Requirement Analysis", "round_2": "Technical Execution",
            "round_3": "Architectural Thinking", "round_4": "Communication",
            "round_5": "Debugging"
        }
        for rkey, score in round_scores.items():
            if score < 50:
                areas.append(f"Needs improvement in {labels.get(rkey, rkey)} ({score:.0f}/100)")
        return areas or ["Continue developing across all areas"]

    def _generate_summary(self, total: float, round_scores: Dict, cheating: Dict) -> str:
        risk = cheating["risk_level"]
        if total >= 80:
            perf = "exceptional"
        elif total >= 65:
            perf = "strong"
        elif total >= 50:
            perf = "average"
        else:
            perf = "below average"

        return (
            f"Candidate demonstrated {perf} performance with a total score of {total:.1f}/100. "
            f"Behavioral integrity: {risk} risk (score: {cheating['risk_score']:.0f}/100). "
            f"AI dependency score: {cheating['ai_dependency_score']:.0f}/100."
        )


ai_evaluation_engine = AIEvaluationEngine()
