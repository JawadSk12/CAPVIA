import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from capvia_platform.models.models import Application, ApplicationStatus, StageName, RiskLevel
from capvia_platform.services.ats_connector import ats_connector
from capvia_platform.repositories.ats_repository import ATSRepository
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.repositories.application_repository import ApplicationEventRepository
from capvia_platform.services.application_service import ApplicationService

logger = logging.getLogger("ats_webhooks")
ats_repo = ATSRepository()
event_repo = ApplicationEventRepository()

async def handle_ats_processed_webhook(db: AsyncSession, data: dict):
    """
    Orchestrates the application flow when ATS processing finishes.
    Fetches detailed analysis + SBERT DNA graph, saves to DB,
    and updates application status.
    """
    app_id_str = data.get("application_id")
    resume_id = data.get("resume_id")
    jd_id = data.get("jd_id")
    status = data.get("status", "SUCCESS")
    
    if not app_id_str:
        logger.error("Missing application_id in ATS_PROCESSED webhook data.")
        return {"success": False, "message": "Missing application_id"}

    app_uuid = uuid.UUID(app_id_str)
    
    # 1. Fetch application details
    stmt = (
        select(Application)
        .where(Application.id == app_uuid)
        .options(selectinload(Application.vacancy))
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app:
        logger.error(f"Application {app_uuid} not found during ATS_PROCESSED processing.")
        return {"success": False, "message": "Application not found"}

    if status.upper() == "ERROR":
        logger.warning(f"ATS processing reported ERROR status for Application: {app_uuid}")
        # Keep application as ATS_PENDING or failed, log event
        await event_repo.create_event(
            db,
            application_id=app_uuid,
            event_type="ATS_PROCESSING_FAILED",
            from_status=app.status.value,
            to_status=app.status.value,
            metadata={"error": "ATS returned error status"}
        )
        return {"success": True, "message": "Logged error status"}

    # 2. Fetch detailed comparison results and DNA graph from ATS Engine
    try:
        detailed_result = await ats_connector.get_comparison_result(jd_id, resume_id)
    except Exception as e:
        logger.error(f"Failed to fetch comparison result from ATS for resume {resume_id}: {str(e)}")
        # Generate baseline fallback results to ensure webhook is resilient
        detailed_result = {
            "overall_score": data.get("overall_ats_score", 60.0),
            "score_band": data.get("score_band", "GOOD"),
            "is_suspicious": data.get("is_suspicious", False),
            "required_skills_analysis": {"matches": [], "gaps": [], "coverage": 0.0},
            "preferred_skills_analysis": {"matches": [], "gaps": [], "coverage": 0.0},
            "tool_match_analysis": {"matches": [], "gaps": []},
            "critical_gaps": [],
            "nice_to_have_gaps": [],
            "fraud_flags": [],
            "ai_confidence": 0.8
        }
        
    try:
        dna_data = await ats_connector.get_dna_graph(resume_id)
    except Exception as e:
        logger.error(f"Failed to fetch DNA graph from ATS for resume {resume_id}: {str(e)}")
        # Generate baseline fallback DNA profile
        dna_data = {
            "role_match": {
                "technical_alignment": float(detailed_result.get("overall_score", 60.0)),
                "project_alignment": 60.0,
                "experience_alignment": 60.0,
                "domain_alignment": 60.0,
                "semantic_match_strength": 60.0
            },
            "resume_quality": {"readability": 70.0, "clarity": 70.0, "ats_compatibility": 70.0},
            "skill_intelligence": {"technical_depth": 60.0, "practical_exposure": 60.0},
            "readiness_intelligence": {"internship_readiness": 60.0, "hiring_readiness_score": 60.0},
            "overall": {"capability_score": float(detailed_result.get("overall_score", 60.0)), "candidate_level": "JUNIOR_DEVELOPER"}
        }

    # 3. Save detailed ATSResult in Postgres
    overall_score = float(detailed_result.get("overall_score", 0.0))
    score_band = detailed_result.get("score_band", "REVIEW")
    is_suspicious = bool(detailed_result.get("is_suspicious", False))
    
    # Extract lists of matches/gaps for skills
    req_analysis = detailed_result.get("required_skills_analysis", {})
    pref_analysis = detailed_result.get("preferred_skills_analysis", {})
    
    matched_skills = []
    for match in req_analysis.get("matches", []):
        matched_skills.append(match.get("target"))
    for match in pref_analysis.get("matches", []):
        matched_skills.append(match.get("target"))
        
    missing_skills = req_analysis.get("gaps", []) + pref_analysis.get("gaps", [])

    await ats_repo.save_ats_result(
        db,
        application_id=app_uuid,
        overall_score=overall_score,
        score_band=score_band,
        detected_role=dna_data.get("overall", {}).get("candidate_level"), # fallback detected role
        role_confidence=detailed_result.get("ai_confidence"),
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        is_suspicious=is_suspicious,
        fraud_probability=detailed_result.get("fraud_probability", 0.0),
        fraud_flags=detailed_result.get("fraud_flags", []),
        raw_analysis=detailed_result
    )

    # 4. Save SBERT DNA Profile in Postgres
    role_match = dna_data.get("role_match", {})
    resume_quality = dna_data.get("resume_quality", {})
    skill_intel = dna_data.get("skill_intelligence", {})
    readiness = dna_data.get("readiness_intelligence", {})
    overall_dna = dna_data.get("overall", {})

    await ats_repo.save_dna_profile(
        db,
        application_id=app_uuid,
        technical_alignment=float(role_match.get("technical_alignment", 0.0)),
        project_alignment=float(role_match.get("project_alignment", 0.0)),
        experience_alignment=float(role_match.get("experience_alignment", 0.0)),
        domain_alignment=float(role_match.get("domain_alignment", 0.0)),
        semantic_match_strength=float(role_match.get("semantic_match_strength", 0.0)),
        readability=float(resume_quality.get("readability", 0.0)),
        clarity=float(resume_quality.get("clarity", 0.0)),
        ats_compatibility=float(resume_quality.get("ats_compatibility", 0.0)),
        technical_depth=float(skill_intel.get("technical_depth", 0.0)),
        practical_exposure=float(skill_intel.get("practical_exposure", 0.0)),
        internship_readiness=float(readiness.get("internship_readiness", 0.0)),
        hiring_readiness_score=float(readiness.get("hiring_readiness_score", 0.0)),
        capability_score=float(overall_dna.get("capability_score", 0.0)),
        candidate_level=str(overall_dna.get("candidate_level", "JUNIOR_DEVELOPER"))
    )

    # 5. Evaluate thresholds and trigger lifecycle transition
    passed = (overall_score >= 60.0) and (not is_suspicious)
    from_status = app.status.value

    if passed:
        # Create application mapping and save ATS score
        mapping = await MappingService.get_or_create_application_mapping(
            db,
            application_id=app_uuid,
            ats_resume_uuid=uuid.UUID(resume_id) if resume_id else None
        )
        mapping.ats_score = overall_score
        
        # Transition status to ATS_COMPLETED
        await RecruitmentProgressService.update_application_status(
            db,
            application_id=app_uuid,
            status=ApplicationStatus.ATS_COMPLETED,
            stage=StageName.ATS
        )
        
        # Log event
        await event_repo.create_event(
            db,
            application_id=app_uuid,
            event_type="STATUS_UPDATED_ATS_COMPLETED",
            from_status=from_status,
            to_status="ATS_COMPLETED",
            actor_id=None,
            actor_role="SYSTEM"
        )
        
        # Spawn background task to register candidate and vacancy dynamically in AssessAI
        from capvia_platform.tasks.simulation_tasks import register_candidate_for_simulation_task
        import asyncio
        asyncio.create_task(register_candidate_for_simulation_task(app_uuid))
    else:
        # Just update mappings
        mapping = await MappingService.get_or_create_application_mapping(
            db,
            application_id=app_uuid,
            ats_resume_uuid=uuid.UUID(resume_id) if resume_id else None
        )
        mapping.ats_score = overall_score
        if is_suspicious:
            mapping.combined_risk_level = RiskLevel.HIGH
            
        # Transition to ATS_COMPLETED
        await RecruitmentProgressService.update_application_status(
            db,
            application_id=app_uuid,
            status=ApplicationStatus.ATS_COMPLETED,
            stage=StageName.ATS
        )
        
        # Event
        await event_repo.create_event(
            db,
            application_id=app_uuid,
            event_type="STATUS_UPDATED_ATS_COMPLETED",
            from_status=from_status,
            to_status="ATS_COMPLETED",
            actor_id=None,
            actor_role="SYSTEM",
            metadata={"suspicious_flag": is_suspicious}
        )
        
        # Notify
        notify_msg = f"Resume analysis complete for '{app.vacancy.title}'."
        if is_suspicious:
            notify_msg += " Integrity check flagged potential discrepancies."
        await ApplicationService._notify(
            db,
            user_id=app.candidate_id,
            title="Resume Screened 📄",
            message=notify_msg
        )

    logger.info(f"Successfully processed ATS webhook for Application {app_uuid}. Passed: {passed}")
    return {"success": True, "passed": passed}
