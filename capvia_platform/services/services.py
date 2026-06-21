import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import select, update, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from capvia_platform.models.models import (
    User, Internship, Application, CandidateMapping, VacancyMapping, 
    ApplicationMapping, ATSResult, SimulationResult, InterviewResult,
    ApplicationStatus, StageName, RiskLevel, RecommendationType
)
from capvia_platform.core.exceptions import ResourceNotFoundException

class MappingService:
    """
    Handles resolving and registering Candidate, Vacancy, and Application mapping entries.
    """
    @staticmethod
    async def get_or_create_candidate_mapping(
        session: AsyncSession, 
        candidate_uuid: uuid.UUID,
        ats_user_uuid: Optional[uuid.UUID] = None,
        simulation_candidate_id: Optional[int] = None,
        interview_candidate_uuid: Optional[uuid.UUID] = None
    ) -> CandidateMapping:
        stmt = select(CandidateMapping).where(CandidateMapping.capvia_candidate_uuid == candidate_uuid)
        result = await session.execute(stmt)
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            mapping = CandidateMapping(
                capvia_candidate_uuid=candidate_uuid,
                ats_user_uuid=ats_user_uuid,
                simulation_candidate_id=simulation_candidate_id,
                interview_candidate_uuid=interview_candidate_uuid
            )
            session.add(mapping)
            await session.flush()
        else:
            if ats_user_uuid:
                mapping.ats_user_uuid = ats_user_uuid
            if simulation_candidate_id:
                mapping.simulation_candidate_id = simulation_candidate_id
            if interview_candidate_uuid:
                mapping.interview_candidate_uuid = interview_candidate_uuid
            await session.flush()
            
        return mapping

    @staticmethod
    async def get_or_create_vacancy_mapping(
        session: AsyncSession,
        vacancy_uuid: uuid.UUID,
        ats_jd_uuid: Optional[uuid.UUID] = None,
        simulation_internship_id: Optional[int] = None
    ) -> VacancyMapping:
        stmt = select(VacancyMapping).where(VacancyMapping.capvia_vacancy_uuid == vacancy_uuid)
        result = await session.execute(stmt)
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            mapping = VacancyMapping(
                capvia_vacancy_uuid=vacancy_uuid,
                ats_jd_uuid=ats_jd_uuid,
                simulation_internship_id=simulation_internship_id
            )
            session.add(mapping)
            await session.flush()
        else:
            if ats_jd_uuid:
                mapping.ats_jd_uuid = ats_jd_uuid
            if simulation_internship_id:
                mapping.simulation_internship_id = simulation_internship_id
            await session.flush()
            
        return mapping

    @staticmethod
    async def get_or_create_application_mapping(
        session: AsyncSession,
        application_id: uuid.UUID,
        ats_resume_uuid: Optional[uuid.UUID] = None,
        simulation_attempt_id: Optional[int] = None,
        simulation_application_id: Optional[int] = None,
        interview_session_uuid: Optional[uuid.UUID] = None
    ) -> ApplicationMapping:
        stmt = select(ApplicationMapping).where(ApplicationMapping.application_id == application_id)
        result = await session.execute(stmt)
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            mapping = ApplicationMapping(
                application_id=application_id,
                ats_resume_uuid=ats_resume_uuid,
                simulation_attempt_id=simulation_attempt_id,
                simulation_application_id=simulation_application_id,
                interview_session_uuid=interview_session_uuid
            )
            session.add(mapping)
            await session.flush()
        else:
            if ats_resume_uuid:
                mapping.ats_resume_uuid = ats_resume_uuid
            if simulation_attempt_id:
                mapping.simulation_attempt_id = simulation_attempt_id
            if simulation_application_id:
                mapping.simulation_application_id = simulation_application_id
            if interview_session_uuid:
                mapping.interview_session_uuid = interview_session_uuid
            await session.flush()
            
        return mapping


class RecruitmentProgressService:
    """
    Manages workflow progression and updates aggregate scoring models.
    """
    @staticmethod
    async def update_application_status(
        session: AsyncSession, 
        application_id: uuid.UUID, 
        status: ApplicationStatus,
        stage: Optional[StageName] = None
    ) -> Application:
        stmt = select(Application).where(Application.id == application_id)
        res = await session.execute(stmt)
        app = res.scalar_one_or_none()
        if not app:
            raise ResourceNotFoundException("Application", str(application_id))
        
        app.status = status
        if stage:
            app.current_stage = stage
        
        await session.flush()
        return app

    @staticmethod
    async def save_ats_results(
        session: AsyncSession,
        application_id: uuid.UUID,
        overall_score: float,
        score_band: str,
        matched_skills: List[str],
        missing_skills: List[str],
        is_suspicious: bool = False,
        fraud_probability: float = 0.0,
        fraud_flags: List[Dict[str, Any]] = None,
        raw_analysis: Dict[str, Any] = None
    ) -> ATSResult:
        # Check application exists
        stmt = select(Application).where(Application.id == application_id)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            raise ResourceNotFoundException("Application", str(application_id))
        
        # Save result
        result_stmt = select(ATSResult).where(ATSResult.application_id == application_id)
        res_db = await session.execute(result_stmt)
        ats_result = res_db.scalar_one_or_none()
        
        if not ats_result:
            ats_result = ATSResult(
                application_id=application_id,
                overall_score=overall_score,
                score_band=score_band,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                is_suspicious=is_suspicious,
                fraud_probability=fraud_probability,
                fraud_flags=fraud_flags or [],
                raw_analysis=raw_analysis or {}
            )
            session.add(ats_result)
        else:
            ats_result.overall_score = overall_score
            ats_result.score_band = score_band
            ats_result.matched_skills = matched_skills
            ats_result.missing_skills = missing_skills
            ats_result.is_suspicious = is_suspicious
            ats_result.fraud_probability = fraud_probability
            ats_result.fraud_flags = fraud_flags or []
            ats_result.raw_analysis = raw_analysis or {}

        # Update cache in ApplicationMapping
        mapping = await MappingService.get_or_create_application_mapping(session, application_id)
        mapping.ats_score = overall_score
        
        # Calculate combined risk
        if is_suspicious:
            mapping.combined_risk_level = RiskLevel.HIGH
            
        await session.flush()
        return ats_result

    @staticmethod
    async def save_simulation_results(
        session: AsyncSession,
        application_id: uuid.UUID,
        attempt_id: int,
        total_score: float,
        recommendation: str,
        cheating_risk_level: RiskLevel,
        ai_dependency_score: float = 0.0,
        round_scores: Dict[str, Any] = None,
        submitted_at: datetime = None
    ) -> SimulationResult:
        # Check application
        stmt = select(Application).where(Application.id == application_id)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            raise ResourceNotFoundException("Application", str(application_id))

        result_stmt = select(SimulationResult).where(SimulationResult.application_id == application_id)
        res_db = await session.execute(result_stmt)
        sim_result = res_db.scalar_one_or_none()

        if not sim_result:
            sim_result = SimulationResult(
                application_id=application_id,
                attempt_id=attempt_id,
                total_score=total_score,
                recommendation=recommendation,
                cheating_risk_level=cheating_risk_level,
                ai_dependency_score=ai_dependency_score,
                round_scores=round_scores or {},
                submitted_at=submitted_at or datetime.utcnow()
            )
            session.add(sim_result)
        else:
            sim_result.attempt_id = attempt_id
            sim_result.total_score = total_score
            sim_result.recommendation = recommendation
            sim_result.cheating_risk_level = cheating_risk_level
            sim_result.ai_dependency_score = ai_dependency_score
            sim_result.round_scores = round_scores or {}
            sim_result.submitted_at = submitted_at or datetime.utcnow()

        # Update cache in ApplicationMapping
        mapping = await MappingService.get_or_create_application_mapping(session, application_id)
        mapping.simulation_score = total_score
        mapping.simulation_attempt_id = attempt_id
        
        # Sync risk level
        if cheating_risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            mapping.combined_risk_level = RiskLevel.HIGH

        await session.flush()
        return sim_result

    @staticmethod
    async def save_interview_results(
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
        # Check application
        stmt = select(Application).where(Application.id == application_id)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            raise ResourceNotFoundException("Application", str(application_id))

        result_stmt = select(InterviewResult).where(InterviewResult.application_id == application_id)
        res_db = await session.execute(result_stmt)
        int_result = res_db.scalar_one_or_none()

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
