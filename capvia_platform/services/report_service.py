import os
import io
import uuid
import glob
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    Application, Internship, Company, Report, ActivityLog,
    ATSResult, SimulationResult, InterviewResult, IntegrityResult, DNAProfile, Ranking
)
from capvia_platform.core.exceptions import ResourceNotFoundException
from capvia_platform.repositories.repositories import ReportRepository

logger = logging.getLogger("report_service")

# ReportLab imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass ReportLab canvas to draw page numbers ('Page X of Y')
    and professional confidentiality running headers/footers on all pages.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        
        # Color palette
        slate = colors.HexColor("#475569")
        light_gray = colors.HexColor("#CBD5E1")
        
        # Header (drawn on all pages)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E293B"))
        self.drawString(54, 750, "CAPVIA RECRUITER INTELLIGENCE REPORT")
        self.setFont("Helvetica", 8)
        self.setFillColor(slate)
        self.drawRightString(558, 750, datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        self.setStrokeColor(light_gray)
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Footer (drawn on all pages)
        self.drawString(54, 40, "CONFIDENTIAL — FOR RECRUITER REVIEW ONLY")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, page_text)
        self.line(54, 52, 558, 52)
        
        self.restoreState()


def make_progress_bar(score: float, width: int = 150, height: int = 10) -> Drawing:
    """
    Generates a ReportLab horizontal progress bar Drawing.
    Colored dynamically depending on capability score bounds.
    """
    d = Drawing(width, height)
    # Background track
    d.add(Rect(0, 0, width, height, fillColor=colors.HexColor("#F1F5F9"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=0.5))
    
    # Dynamic styling colors
    if score >= 80:
        bar_color = colors.HexColor("#10B981") # Green
    elif score >= 60:
        bar_color = colors.HexColor("#3B82F6") # Blue
    elif score >= 40:
        bar_color = colors.HexColor("#F59E0B") # Amber
    else:
        bar_color = colors.HexColor("#EF4444") # Red
        
    fill_w = max(0.0, min(float(width), float(width) * (float(score) / 100.0)))
    if fill_w > 0:
        d.add(Rect(0, 0, fill_w, height, fillColor=bar_color, strokeColor=None))
    return d


class ReportService:
    @staticmethod
    def compile_default_metadata(context: dict) -> tuple[str, List[str], List[str], List[str]]:
        """
        Compiles high-fidelity recruiter-oriented default summaries, strengths,
        weaknesses, and recommendations from assessment sub-systems.
        """
        candidate_name = context.get("candidate_name", "The candidate")
        vacancy_title = context.get("vacancy_title", "the role")
        
        ranking = context.get("ranking")
        ats_result = context.get("ats_result")
        simulation_result = context.get("simulation_result")
        interview_result = context.get("interview_result")
        integrity_result = context.get("integrity_result")
        dna_profile = context.get("dna_profile")

        final_score = float(ranking.final_score) if (ranking and ranking.final_score is not None) else 0.0
        tier = ranking.recommendation_tier if (ranking and ranking.recommendation_tier) else "UNRANKED"

        # 1. Summary
        if final_score >= 85:
            summary = (
                f"{candidate_name} is an elite candidate demonstrating exceptional capabilities across all evaluation phases, "
                f"resulting in a {tier} recommendation tier. They exhibit outstanding technical and cognitive skills, "
                f"making them highly suited for the {vacancy_title} position."
            )
        elif final_score >= 70:
            summary = (
                f"{candidate_name} is a strong, competent candidate showing solid proficiency in coding simulations and "
                f"interview communication, qualifying for the {tier} tier. They represent a low-risk, high-readiness hire "
                f"for the {vacancy_title} role."
            )
        elif final_score >= 50:
            summary = (
                f"{candidate_name} meets the baseline requirements for the {vacancy_title} role, placing in the {tier} tier. "
                f"While they show potential in specific areas, further development is required to succeed in highly "
                f"technical aspects."
            )
        else:
            summary = (
                f"{candidate_name} performed below the expected standard for the {vacancy_title} role, falling into the "
                f"{tier} tier. Significant technical or behavioral gaps were observed across assessments."
            )

        # 2. Strengths
        strengths = []
        if ats_result and ats_result.overall_score >= 75:
            strengths.append(f"Strong resume alignment ({ats_result.overall_score:.0f}%) with matched skills: {', '.join(ats_result.matched_skills[:4])}.")
        if simulation_result and simulation_result.total_score >= 75:
            strengths.append(f"Excellent coding execution and logic with simulation score of {simulation_result.total_score:.0f}%.")
        if interview_result and interview_result.overall_answer_score_pct >= 75:
            strengths.append(f"Strong verbal communication and structured response style (Interview score: {interview_result.overall_answer_score_pct}%).")
        if integrity_result and (integrity_result.trust_index or 100) >= 80:
            strengths.append(f"High integrity trust index ({integrity_result.trust_index or 100}/100) with minimal proctoring anomalies.")
            
        # Fallback to DNA dimensions
        if dna_profile:
            dna_dims = [
                ("Problem Solving", "problem_solving"),
                ("Execution & Task Delivery", "execution"),
                ("Communication Skills", "communication"),
                ("Learning Potential", "learning_ability"),
            ]
            for label, field in dna_dims:
                score = getattr(dna_profile, field, None)
                if score and score >= 80:
                    strengths.append(f"Demonstrates high capability in {label} ({score}/100).")
        
        if not strengths:
            strengths.append("Exhibits baseline technical competency across entry requirements.")

        # 3. Weaknesses
        weaknesses = []
        if ats_result and ats_result.missing_skills:
            weaknesses.append(f"Lacks key vacancy skills: {', '.join(ats_result.missing_skills[:3])}.")
        if simulation_result and simulation_result.total_score < 60:
            weaknesses.append(f"Coding simulation score ({simulation_result.total_score:.0f}%) indicates performance gaps under timed logic benchmarks.")
        if interview_result and interview_result.overall_answer_score_pct < 60:
            weaknesses.append(f"Spoken interview score ({interview_result.overall_answer_score_pct}%) suggests difficulty in structuring complex thoughts clearly.")
        if integrity_result and integrity_result.tab_switches > 3:
            weaknesses.append(f"Assessed session registered focus deviations ({integrity_result.tab_switches} tab switches detected).")
        
        if dna_profile:
            dna_dims = [
                ("Performance Consistency", "consistency"),
                ("Role Alignment & Fit", "role_fit"),
                ("Leadership Potential", "leadership_potential")
            ]
            for label, field in dna_dims:
                score = getattr(dna_profile, field, None)
                if score and score < 60:
                    weaknesses.append(f"Shows lower score in {label} ({score}/100).")

        if not weaknesses:
            weaknesses.append("No critical weaknesses or proctoring risk indicators detected.")

        # 4. Recommendations
        recommendations = []
        if final_score >= 80:
            recommendations.append("Fast-track candidate directly to the final round interviews.")
            recommendations.append("Recommend immediate internship offer subject to standard background checks.")
        elif final_score >= 60:
            recommendations.append("Proceed to second-round interview with hiring manager to assess team and cultural fit.")
            if ats_result and ats_result.missing_skills:
                recommendations.append(f"Verify developer familiarity with {', '.join(ats_result.missing_skills[:2])} during technical screening.")
        else:
            recommendations.append("Reject candidate or keep on standby file for future lower-complexity vacancies.")

        if interview_result and interview_result.improvements:
            recommendations.extend(interview_result.improvements[:2])

        return summary, strengths, weaknesses, recommendations

    @staticmethod
    def _get_storage_dir() -> str:
        """
        Resolves the local reports storage subdirectory under the workspace project root.
        Creates it dynamically if absent.
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        reports_dir = os.path.join(project_root, "storage", "reports")
        os.makedirs(reports_dir, exist_ok=True)
        return reports_dir

    @staticmethod
    async def generate_report_data(db: AsyncSession, application_id: uuid.UUID) -> dict:
        """
        Fetches an Application and eagerly loads candidate details, internship details,
        and all related evaluation results to construct a complete context dictionary.
        """
        stmt = (
            select(Application)
            .where(
                Application.id == application_id,
                Application.deleted_at.is_(None)
            )
            .options(
                selectinload(Application.candidate),
                selectinload(Application.vacancy).selectinload(Internship.company),
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
                selectinload(Application.dna_profile),
                selectinload(Application.ranking)
            )
        )
        res = await db.execute(stmt)
        app = res.scalar_one_or_none()
        if not app:
            raise ResourceNotFoundException("Application", str(application_id))

        # Build context
        context = {
            "application_id": app.id,
            "candidate_name": app.candidate.full_name if app.candidate else "Unknown Candidate",
            "candidate_email": app.candidate.email if app.candidate else "N/A",
            "vacancy_title": app.vacancy.title if app.vacancy else "Unknown Internship",
            "company_name": app.vacancy.company.name if (app.vacancy and app.vacancy.company) else "Unknown Company",
            "status": app.status.value if app.status else "Applied",
            "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
            
            # Sub-results
            "ats_result": app.ats_result,
            "simulation_result": app.simulation_result,
            "interview_result": app.interview_result,
            "integrity_result": app.integrity_result,
            "dna_profile": app.dna_profile,
            "ranking": app.ranking
        }
        
        return context

    @staticmethod
    def build_pdf_report(context: dict, version: int = 1) -> bytes:
        """
        Uses ReportLab Flowables to construct a high-quality PDF report document from raw context.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=75,
            bottomMargin=75
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1E293B"),
            alignment=0,
            spaceAfter=8
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4F46E5"),
            textTransform="uppercase",
            spaceAfter=20
        )
        h1_style = ParagraphStyle(
            "ReportH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )
        bullet_style = ParagraphStyle(
            "ReportBullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=4
        )

        story = []

        # 1. Document Title
        story.append(Paragraph("CAPVIA Recruiter Intelligence Report", title_style))
        story.append(Paragraph(f"Candidate Comprehensive Assessment & Capabilities Profile • Version {version}", subtitle_style))
        story.append(Spacer(1, 10))

        # 2. Metadata Table
        ranking = context.get("ranking")
        ats_result = context.get("ats_result")
        simulation_result = context.get("simulation_result")
        interview_result = context.get("interview_result")
        integrity_result = context.get("integrity_result")
        dna_profile = context.get("dna_profile")

        final_score = float(ranking.final_score) if (ranking and ranking.final_score is not None) else 0.0
        tier = ranking.recommendation_tier if (ranking and ranking.recommendation_tier) else "UNRANKED"
        percentile = float(ranking.global_percentile) if (ranking and ranking.global_percentile is not None) else 0.0

        meta_data = [
            [
                Paragraph("<b>Candidate Name</b>", body_style),
                Paragraph("<b>Applied Vacancy</b>", body_style),
                Paragraph("<b>Overall Ranking</b>", body_style)
            ],
            [
                Paragraph(context.get("candidate_name"), body_style),
                Paragraph(context.get("vacancy_title"), body_style),
                Paragraph(f"Score: <b>{final_score:.1f}%</b>", body_style)
            ],
            [
                Paragraph(f"Email: {context.get("candidate_email")}", body_style),
                Paragraph(f"Company: {context.get("company_name")}", body_style),
                Paragraph(f"Tier: <b>{tier}</b>", body_style)
            ],
            [
                Paragraph(f"Date: {context.get("date")}", body_style),
                Paragraph(f"Status: {context.get("status")}", body_style),
                Paragraph(f"Percentile: <b>{percentile:.1f}%</b>", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[168, 168, 168])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # 3. Executive Summary
        summary_text = context.get("summary", "Assessment in progress. Detailed capability summary will be compiled upon assessment completion.")
        summary_p = Paragraph(f"<b>EXECUTIVE SUMMARY</b><br/><br/>{summary_text}", ParagraphStyle(
            "SummaryText", parent=body_style, fontSize=9.5, leading=14, textColor=colors.HexColor("#1E293B")
        ))
        summary_table = Table([[summary_p]], colWidths=[504])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4") if final_score >= 70 else colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#10B981") if final_score >= 70 else colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        # 4. Score Breakdown Table
        story.append(Paragraph("Weighted Assessment Breakdown", h1_style))
        breakdown_rows = [
            [
                Paragraph("<b>Assessment Phase</b>", body_style),
                Paragraph("<b>Weight</b>", body_style),
                Paragraph("<b>Raw Score</b>", body_style),
                Paragraph("<b>Weighted Contrib.</b>", body_style),
                Paragraph("<b>Status</b>", body_style)
            ]
        ]
        
        ats_raw = ranking.ats_raw_score if ranking else None
        sim_raw = ranking.simulation_raw_score if ranking else None
        iv_raw = ranking.interview_raw_score if ranking else None
        integ_raw = ranking.integrity_raw_score if ranking else None

        ats_contrib = ranking.ats_component if ranking else None
        sim_contrib = ranking.simulation_component if ranking else None
        iv_contrib = ranking.interview_component if ranking else None
        integ_contrib = ranking.integrity_component if ranking else None

        def fmt_score(val):
            return f"{float(val):.1f}%" if val is not None else "N/A"

        def fmt_contrib(val, max_val):
            return f"{float(val):.1f} / {max_val:.1f}" if val is not None else "N/A"

        breakdown_rows.append([
            Paragraph("Resume Analysis (ATS)", body_style),
            Paragraph("25.0%", body_style),
            Paragraph(fmt_score(ats_raw), body_style),
            Paragraph(fmt_contrib(ats_contrib, 25.0), body_style),
            Paragraph("Completed" if ats_raw is not None else "Not Completed", body_style)
        ])
        breakdown_rows.append([
            Paragraph("Coding Simulation", body_style),
            Paragraph("30.0%", body_style),
            Paragraph(fmt_score(sim_raw), body_style),
            Paragraph(fmt_contrib(sim_contrib, 30.0), body_style),
            Paragraph("Completed" if sim_raw is not None else "Not Completed", body_style)
        ])
        breakdown_rows.append([
            Paragraph("Behavioral & Speech Interview", body_style),
            Paragraph("25.0%", body_style),
            Paragraph(fmt_score(iv_raw), body_style),
            Paragraph(fmt_contrib(iv_contrib, 25.0), body_style),
            Paragraph("Completed" if iv_raw is not None else "Not Completed", body_style)
        ])
        breakdown_rows.append([
            Paragraph("Behavioral Integrity (Trust Index)", body_style),
            Paragraph("20.0%", body_style),
            Paragraph(fmt_score(integ_raw), body_style),
            Paragraph(fmt_contrib(integ_contrib, 20.0), body_style),
            Paragraph("Completed" if integ_raw is not None else "Not Completed", body_style)
        ])

        total_contrib = sum(x for x in [ats_contrib, sim_contrib, iv_contrib, integ_contrib] if x is not None)
        total_weight = sum(w for w, raw in [(25.0, ats_raw), (30.0, sim_raw), (25.0, iv_raw), (20.0, integ_raw)] if raw is not None)
        breakdown_rows.append([
            Paragraph("<b>Composite Total Score</b>", body_style),
            Paragraph(f"<b>{total_weight:.1f}%</b>", body_style),
            Paragraph("-", body_style),
            Paragraph(f"<b>{total_contrib:.1f} / {total_weight:.1f}</b>", body_style),
            Paragraph(f"<b>Tier: {tier}</b>", body_style)
        ])

        breakdown_table = Table(breakdown_rows, colWidths=[160, 60, 80, 110, 94])
        breakdown_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 15))

        # 5. DNA Profile Table
        story.append(Paragraph("Capability DNA Profile", h1_style))
        dna_dims = [
            ("Problem Solving", "problem_solving"),
            ("Execution & Delivery", "execution"),
            ("Communication Skills", "communication"),
            ("Learning Ability", "learning_ability"),
            ("Adaptability & Growth", "adaptability"),
            ("Performance Consistency", "consistency"),
            ("Candidate Confidence", "confidence"),
            ("Role Alignment & Fit", "role_fit"),
            ("Leadership Potential", "leadership_potential")
        ]
        
        dna_rows = [
            [
                Paragraph("<b>Capability Dimension</b>", body_style),
                Paragraph("<b>Visual Scorecard</b>", body_style),
                Paragraph("<b>Score</b>", body_style)
            ]
        ]
        for label, field in dna_dims:
            score = getattr(dna_profile, field, None) if dna_profile else None
            if score is not None:
                score_val = float(score)
                score_text = f"{int(score_val)}/100"
                bar = make_progress_bar(score_val)
            else:
                score_text = "N/A"
                bar = make_progress_bar(0)
                
            dna_rows.append([
                Paragraph(label, body_style),
                bar,
                Paragraph(score_text, body_style)
            ])

        dna_table = Table(dna_rows, colWidths=[180, 224, 100])
        dna_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(dna_table)
        story.append(Spacer(1, 15))

        # 6. Detailed Assessment Summaries
        details_story = []
        details_story.append(Paragraph("Phase Details & Risk Analysis", h1_style))

        # ATS
        ats_p = []
        if ats_result:
            role = ats_result.detected_role or "N/A"
            conf = f"{float(ats_result.role_confidence)*100:.0f}%" if ats_result.role_confidence is not None else "N/A"
            suspicious = "<b>YES (High Risk)</b>" if ats_result.is_suspicious else "No"
            ats_p.append(Paragraph(f"• <b>Resume Alignment Score:</b> {ats_result.overall_score:.1f}% ({ats_result.score_band})", body_style))
            ats_p.append(Paragraph(f"• <b>Detected Role / Conf.:</b> {role} (Confidence: {conf})", body_style))
            ats_p.append(Paragraph(f"• <b>Matched Skills:</b> {', '.join(ats_result.matched_skills) if ats_result.matched_skills else 'None'}", body_style))
            ats_p.append(Paragraph(f"• <b>Missing Skills:</b> {', '.join(ats_result.missing_skills) if ats_result.missing_skills else 'None'}", body_style))
            ats_p.append(Paragraph(f"• <b>ATS Anomaly Flagged:</b> {suspicious} (Fraud Prob: {float(ats_result.fraud_probability)*100:.1f}%)", body_style))
        else:
            ats_p.append(Paragraph("No Resume/ATS data available.", body_style))
        
        # Coding
        sim_p = []
        if simulation_result:
            risk = simulation_result.cheating_risk_level.value if hasattr(simulation_result.cheating_risk_level, "value") else str(simulation_result.cheating_risk_level)
            ai_dep = f"{float(simulation_result.ai_dependency_score)*100:.0f}%" if simulation_result.ai_dependency_score is not None else "N/A"
            sim_p.append(Paragraph(f"• <b>Simulation Score:</b> {simulation_result.total_score:.1f}% (Recommendation: {simulation_result.recommendation})", body_style))
            sim_p.append(Paragraph(f"• <b>AI Dependency Score:</b> {ai_dep}", body_style))
            sim_p.append(Paragraph(f"• <b>Cheating Risk Level:</b> <b>{risk.upper()}</b>", body_style))
            if simulation_result.round_scores:
                rounds = ", ".join(f"Round {k}: {v}%" for k, v in simulation_result.round_scores.items())
                sim_p.append(Paragraph(f"• <b>Round Scores:</b> {rounds}", body_style))
        else:
            sim_p.append(Paragraph("No Coding Simulation data available.", body_style))

        # Interview
        iv_p = []
        if interview_result:
            rec = interview_result.recommendation.value if hasattr(interview_result.recommendation, "value") else str(interview_result.recommendation)
            risk = interview_result.risk_level.value if hasattr(interview_result.risk_level, "value") else str(interview_result.risk_level)
            iv_p.append(Paragraph(f"• <b>Speech Answer Score:</b> {interview_result.overall_answer_score_pct}% (Rec: {rec})", body_style))
            iv_p.append(Paragraph(f"• <b>Proctoring Risk Level:</b> <b>{risk.upper()}</b> (Integrity Score: {interview_result.overall_integrity_score}%)", body_style))
            iv_p.append(Paragraph(f"• <b>Cheating Prob.:</b> {interview_result.cheating_probability_pct}%", body_style))
            iv_p.append(Paragraph(f"• <b>Video URL:</b> <font color='#4F46E5'>{interview_result.video_url}</font>", body_style))
        else:
            iv_p.append(Paragraph("No Speech/Interview data available.", body_style))

        # Integrity
        integ_p = []
        if integrity_result:
            risk = integrity_result.compiled_risk_level or "LOW"
            trust = integrity_result.trust_index or 100
            integ_p.append(Paragraph(f"• <b>Integrity Trust Index:</b> <b>{trust}/100</b> (Risk Level: <b>{risk}</b>)", body_style))
            integ_p.append(Paragraph(f"• <b>Proctoring Summary:</b> Focus: {integrity_result.focus_percentage}%, Look aways: {integrity_result.look_away_count}, Face visibility: {integrity_result.face_visibility_pct}%", body_style))
            integ_p.append(Paragraph(f"• <b>Violations Flags:</b> Phones: {integrity_result.phone_detections_count}, Tab switches: {integrity_result.tab_switches}, Copy/pastes: {integrity_result.copy_pastes}, Suspicious keys: {integrity_result.suspicious_keys}", body_style))
        else:
            integ_p.append(Paragraph("No Integrity proctoring data available.", body_style))

        analysis_data = [
            [Paragraph("<b>Resume (ATS) Analysis</b>", body_style), Paragraph("<b>Coding Simulation</b>", body_style)],
            [ats_p, sim_p],
            [Paragraph("<b>AI Speech Interview</b>", body_style), Paragraph("<b>Behavioral Integrity</b>", body_style)],
            [iv_p, integ_p]
        ]
        
        analysis_table = Table(analysis_data, colWidths=[252, 252])
        analysis_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F8FAFC")),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#F8FAFC")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        details_story.append(analysis_table)
        details_story.append(Spacer(1, 15))

        # Strengths / Weaknesses / Recommendations
        strengths_list = context.get("strengths", [])
        weaknesses_list = context.get("weaknesses", [])
        recs_list = context.get("recommendations", [])

        swr_story = []
        swr_story.append(Paragraph("S.W.O.T. & Actionable Recommendations", h1_style))
        
        s_block = [Paragraph("<b>Key Strengths</b>", body_style), Spacer(1, 4)]
        if strengths_list:
            for s in strengths_list:
                s_block.append(Paragraph(f"• {s}", bullet_style))
        else:
            s_block.append(Paragraph("• No major strengths recorded.", bullet_style))

        w_block = [Paragraph("<b>Areas for Development</b>", body_style), Spacer(1, 4)]
        if weaknesses_list:
            for w in weaknesses_list:
                w_block.append(Paragraph(f"• {w}", bullet_style))
        else:
            w_block.append(Paragraph("• No major weaknesses recorded.", bullet_style))

        r_block = [Paragraph("<b>Hiring Recommendations</b>", body_style), Spacer(1, 4)]
        if recs_list:
            for r in recs_list:
                r_block.append(Paragraph(f"• {r}", bullet_style))
        else:
            r_block.append(Paragraph("• No specific hiring recommendations available.", bullet_style))

        swr_data = [
            [s_block, w_block, r_block]
        ]
        swr_table = Table(swr_data, colWidths=[168, 168, 168])
        swr_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        swr_story.append(swr_table)

        # Assemble everything
        story.append(KeepTogether(details_story))
        story.append(Spacer(1, 10))
        story.append(KeepTogether(swr_story))

        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @staticmethod
    def resolve_next_version(application_id: uuid.UUID) -> int:
        """
        Scans the local reports directory to find the next version number for an application ID.
        """
        reports_dir = ReportService._get_storage_dir()
        pattern = os.path.join(reports_dir, f"{application_id}_v*.pdf")
        existing_files = glob.glob(pattern)
        
        next_version = 1
        if existing_files:
            versions = []
            for filepath in existing_files:
                filename = os.path.basename(filepath)
                try:
                    parts = filename.replace(".pdf", "").split("_v")
                    if len(parts) == 2:
                        versions.append(int(parts[1]))
                except Exception:
                    pass
            if versions:
                next_version = max(versions) + 1
        return next_version

    @staticmethod
    async def save_report(
        db: AsyncSession,
        application_id: uuid.UUID,
        summary: str,
        strengths: List[str],
        weaknesses: List[str],
        recommendations: List[str],
        pdf_bytes: bytes,
        version: int,
        actor_id: Optional[uuid.UUID] = None
    ) -> Report:
        """
        Saves the file to local storage, inserts/updates report metadata in the DB,
        and logs a custom audit event in activity_logs.
        """
        reports_dir = ReportService._get_storage_dir()
        
        # File path
        filename = f"{application_id}_v{version}.pdf"
        filepath = os.path.join(reports_dir, filename)
        
        # Save to disk
        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        # Save to database
        repo = ReportRepository()
        report = await repo.get_by_application_id(db, application_id)
        
        # We store the relative storage path in pdf_url
        pdf_url = f"storage/reports/{filename}"

        if not report:
            report = Report(
                application_id=application_id,
                summary=summary,
                strengths=strengths,
                weaknesses=weaknesses,
                recommendations=recommendations,
                pdf_url=pdf_url
            )
            await repo.create(db, report)
        else:
            report.summary = summary
            report.strengths = strengths
            report.weaknesses = weaknesses
            report.recommendations = recommendations
            report.pdf_url = pdf_url
            await repo.update(db, report)

        # Write activity log
        log_desc = f"Generated recruiter intelligence report v{version} for Application ID {application_id}."
        log = ActivityLog(
            user_id=actor_id,
            action="GENERATE_REPORT",
            description=log_desc
        )
        db.add(log)
        await db.flush()

        return report
