import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.models.models import (
    InterviewResult, IntegrityResult, RiskLevel, RecommendationType, ApplicationMapping
)
from capvia_platform.services.services import MappingService

class InterviewRepository:
    """
    Repository for handling persistence of Interview Results and Integrity Results.
    """
    async def get_interview_result(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[InterviewResult]:
        stmt = select(InterviewResult).where(
            and_(InterviewResult.application_id == application_id, InterviewResult.deleted_at == None)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_interview_result(
        self,
        session: AsyncSession,
        application_id: uuid.UUID,
        session_id: uuid.UUID,
        overall_answer_score_pct: int,
        overall_integrity_score: int,
        cheating_probability_pct: int,
        risk_level: RiskLevel,
        recommendation: RecommendationType,
        video_url: str,
        baselined_locally: bool = False,
        local_evaluation_report: Dict[str, Any] = None,
        strengths: List[str] = None,
        improvements: List[str] = None,
        raw_report: Dict[str, Any] = None
    ) -> InterviewResult:
        int_result = await self.get_interview_result(session, application_id)
        if not int_result:
            int_result = InterviewResult(
                application_id=application_id,
                session_id=session_id,
                overall_answer_score_pct=overall_answer_score_pct,
                overall_integrity_score=overall_integrity_score,
                cheating_probability_pct=cheating_probability_pct,
                risk_level=risk_level,
                recommendation=recommendation,
                video_url=video_url,
                baselined_locally=baselined_locally,
                local_evaluation_report=local_evaluation_report,
                strengths=strengths or [],
                improvements=improvements or [],
                raw_report=raw_report or {}
            )
            session.add(int_result)
        else:
            int_result.session_id = session_id
            int_result.overall_answer_score_pct = overall_answer_score_pct
            int_result.overall_integrity_score = overall_integrity_score
            int_result.cheating_probability_pct = cheating_probability_pct
            int_result.risk_level = risk_level
            int_result.recommendation = recommendation
            int_result.video_url = video_url
            int_result.baselined_locally = baselined_locally
            int_result.local_evaluation_report = local_evaluation_report
            int_result.strengths = strengths or []
            int_result.improvements = improvements or []
            int_result.raw_report = raw_report or {}

        # Update cache in ApplicationMapping
        mapping = await MappingService.get_or_create_application_mapping(session, application_id)
        mapping.interview_answer_score_pct = overall_answer_score_pct
        mapping.interview_integrity_score = overall_integrity_score
        mapping.interview_session_uuid = session_id
        
        # Sync risk level
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] or cheating_probability_pct > 50:
            mapping.combined_risk_level = RiskLevel.HIGH

        await session.flush()
        return int_result

    async def get_integrity_result(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[IntegrityResult]:
        stmt = select(IntegrityResult).where(
            and_(IntegrityResult.application_id == application_id, IntegrityResult.deleted_at == None)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_integrity_result(
        self,
        session: AsyncSession,
        application_id: uuid.UUID,
        focus_percentage: int,
        look_away_count: int,
        head_stability_pct: int,
        head_movements_count: int,
        face_visibility_pct: int,
        face_absences_count: int,
        multi_face_events: int,
        phone_detections_count: int,
        tab_switches: int,
        copy_pastes: int,
        suspicious_keys: int,
        violations: Dict[str, Any] = None
    ) -> IntegrityResult:
        integrity_result = await self.get_integrity_result(session, application_id)
        if not integrity_result:
            integrity_result = IntegrityResult(
                application_id=application_id,
                focus_percentage=focus_percentage,
                look_away_count=look_away_count,
                head_stability_pct=head_stability_pct,
                head_movements_count=head_movements_count,
                face_visibility_pct=face_visibility_pct,
                face_absences_count=face_absences_count,
                multi_face_events=multi_face_events,
                phone_detections_count=phone_detections_count,
                tab_switches=tab_switches,
                copy_pastes=copy_pastes,
                suspicious_keys=suspicious_keys,
                violations=violations or []
            )
            session.add(integrity_result)
        else:
            integrity_result.focus_percentage = focus_percentage
            integrity_result.look_away_count = look_away_count
            integrity_result.head_stability_pct = head_stability_pct
            integrity_result.head_movements_count = head_movements_count
            integrity_result.face_visibility_pct = face_visibility_pct
            integrity_result.face_absences_count = face_absences_count
            integrity_result.multi_face_events = multi_face_events
            integrity_result.phone_detections_count = phone_detections_count
            integrity_result.tab_switches = tab_switches
            integrity_result.copy_pastes = copy_pastes
            integrity_result.suspicious_keys = suspicious_keys
            integrity_result.violations = violations or []

        await session.flush()
        return integrity_result
