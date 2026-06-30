import uuid
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.models.models import ATSResult, DNAProfile

class ATSRepository:
    """
    Repository for handling persistence of ATS Results and SBERT DNA Profiles.
    """
    async def get_ats_result(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[ATSResult]:
        stmt = select(ATSResult).where(and_(ATSResult.application_id == application_id, ATSResult.deleted_at == None))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_ats_result(
        self,
        session: AsyncSession,
        application_id: uuid.UUID,
        overall_score: float,
        score_band: str,
        detected_role: Optional[str] = None,
        role_confidence: Optional[float] = None,
        matched_skills: list = None,
        missing_skills: list = None,
        is_suspicious: bool = False,
        fraud_probability: float = 0.0,
        fraud_flags: list = None,
        raw_analysis: dict = None
    ) -> ATSResult:
        """
        Atomically insert or update an ATSResult row using PostgreSQL ON CONFLICT DO UPDATE.
        This is race-condition safe — concurrent callers will never produce a UniqueViolationError.
        """
        import json as _json
        new_id = uuid.uuid4()
        values = {
            "id": new_id,
            "application_id": application_id,
            "overall_score": overall_score,
            "score_band": score_band,
            "detected_role": detected_role,
            "role_confidence": role_confidence,
            "matched_skills": matched_skills or [],
            "missing_skills": missing_skills or [],
            "is_suspicious": is_suspicious,
            "fraud_probability": fraud_probability,
            "fraud_flags": fraud_flags or [],
            "raw_analysis": raw_analysis or {},
            "deleted_at": None,
        }
        stmt = (
            pg_insert(ATSResult)
            .values(**values)
            .on_conflict_do_update(
                index_elements=["application_id"],
                set_={
                    "overall_score": overall_score,
                    "score_band": score_band,
                    "detected_role": detected_role,
                    "role_confidence": role_confidence,
                    "matched_skills": matched_skills or [],
                    "missing_skills": missing_skills or [],
                    "is_suspicious": is_suspicious,
                    "fraud_probability": fraud_probability,
                    "fraud_flags": fraud_flags or [],
                    "raw_analysis": raw_analysis or {},
                    "deleted_at": None,
                },
            )
            .returning(ATSResult)
        )
        result = await session.execute(stmt)
        await session.flush()
        # Fetch the upserted row via normal ORM to get a fully-mapped instance
        fetch_stmt = select(ATSResult).where(ATSResult.application_id == application_id)
        fetch_result = await session.execute(fetch_stmt)
        return fetch_result.scalar_one()


    async def get_dna_profile(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[DNAProfile]:
        stmt = select(DNAProfile).where(and_(DNAProfile.application_id == application_id, DNAProfile.deleted_at == None))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_dna_profile(
        self,
        session: AsyncSession,
        application_id: uuid.UUID,
        technical_alignment: float,
        project_alignment: float,
        experience_alignment: float,
        domain_alignment: float,
        semantic_match_strength: float,
        readability: float,
        clarity: float,
        ats_compatibility: float,
        technical_depth: float,
        practical_exposure: float,
        internship_readiness: float,
        hiring_readiness_score: float,
        capability_score: float,
        candidate_level: str
    ) -> DNAProfile:
        dna_profile = await self.get_dna_profile(session, application_id)
        if not dna_profile:
            dna_profile = DNAProfile(
                application_id=application_id,
                technical_alignment=technical_alignment,
                project_alignment=project_alignment,
                experience_alignment=experience_alignment,
                domain_alignment=domain_alignment,
                semantic_match_strength=semantic_match_strength,
                readability=readability,
                clarity=clarity,
                ats_compatibility=ats_compatibility,
                technical_depth=technical_depth,
                practical_exposure=practical_exposure,
                internship_readiness=internship_readiness,
                hiring_readiness_score=hiring_readiness_score,
                capability_score=capability_score,
                candidate_level=candidate_level
            )
            session.add(dna_profile)
        else:
            dna_profile.technical_alignment = technical_alignment
            dna_profile.project_alignment = project_alignment
            dna_profile.experience_alignment = experience_alignment
            dna_profile.domain_alignment = domain_alignment
            dna_profile.semantic_match_strength = semantic_match_strength
            dna_profile.readability = readability
            dna_profile.clarity = clarity
            dna_profile.ats_compatibility = ats_compatibility
            dna_profile.technical_depth = technical_depth
            dna_profile.practical_exposure = practical_exposure
            dna_profile.internship_readiness = internship_readiness
            dna_profile.hiring_readiness_score = hiring_readiness_score
            dna_profile.capability_score = capability_score
            dna_profile.candidate_level = candidate_level
            
        await session.flush()
        return dna_profile
