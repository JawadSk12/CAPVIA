"""
CAPVIA Phase 8 — Internship Service
Full lifecycle management for the Internships Marketplace.
Enforces: HR company-member ownership, status transitions, audit logging.
"""
import re
import uuid
from datetime import datetime, date
from typing import List, Optional, Dict

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    User, Company, CompanyMember, Internship, Application,
    ApplicationMapping, ActivityLog, UserRole, MemberRole,
    InternshipStatus, WorkMode, ApplicationStatus
)
from capvia_platform.repositories.repositories import InternshipRepository, CompanyRepository
from capvia_platform.core.exceptions import (
    BaseAPIException, ResourceNotFoundException, AuthorizationException
)

internship_repo = InternshipRepository()
company_repo = CompanyRepository()


def _slugify(title: str, internship_id: str) -> str:
    """Generates a URL-safe slug from title + short UUID."""
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    suffix = str(internship_id)[:8]
    return f"{base}-{suffix}"


class InternshipService:

    # =========================================================================
    # Serialization
    # =========================================================================

    @staticmethod
    def _serialize(
        internship: Internship,
        application_count: int = 0,
    ) -> dict:
        today = date.today()
        deadline = internship.application_deadline
        is_deadline_passed = bool(deadline and deadline < today)

        return {
            "id": str(internship.id),
            "company_id": str(internship.company_id),
            "title": internship.title,
            "description": internship.description,
            "responsibilities": internship.responsibilities or [],
            "required_skills": internship.required_skills or [],
            "technologies": internship.technologies or [],
            "experience_level": internship.experience_level,
            "status": internship.status.value if hasattr(internship.status, "value") else str(internship.status),
            "work_mode": internship.work_mode.value if hasattr(internship.work_mode, "value") else str(internship.work_mode),
            "location": internship.location,
            "duration_weeks": internship.duration_weeks,
            "stipend_min": internship.stipend_min,
            "stipend_max": internship.stipend_max,
            "stipend_currency": internship.stipend_currency,
            "openings": internship.openings,
            "application_limit": internship.application_limit,
            "application_deadline": deadline.isoformat() if deadline else None,
            "view_count": internship.view_count,
            "created_by": str(internship.created_by) if internship.created_by else None,
            "slug": internship.slug,
            "published_at": internship.published_at.isoformat() if internship.published_at else None,
            "application_count": application_count,
            "company_name": internship.company.name if internship.company else None,
            "company_logo": internship.company.logo_url if internship.company else None,
            "is_deadline_passed": is_deadline_passed,
            "created_at": internship.created_at.isoformat(),
            "updated_at": internship.updated_at.isoformat(),
        }

    # =========================================================================
    # Ownership Guards
    # =========================================================================

    @staticmethod
    async def _assert_can_manage(
        session: AsyncSession, internship: Internship, current_user: User
    ) -> None:
        """Creator HR, company owner, or admin can manage this internship."""
        if current_user.role == UserRole.ADMIN:
            return
        # Must be creator or a company owner
        if internship.created_by == current_user.id:
            return
        member = await company_repo.get_member(session, internship.company_id, current_user.id)
        if member and member.member_role == MemberRole.OWNER:
            return
        raise AuthorizationException(
            "Access denied. Only the creator HR, company owner, or admin can manage this internship."
        )

    @staticmethod
    async def _assert_is_company_hr(
        session: AsyncSession, company_id: uuid.UUID, current_user: User
    ) -> None:
        """User must be HR/Admin AND a member of the company to post internships."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role != UserRole.HR:
            raise AuthorizationException("Only HR users can post internships.")
        member = await company_repo.get_member(session, company_id, current_user.id)
        if not member:
            raise AuthorizationException(
                "You must be a member of this company to post internships for it."
            )

    @staticmethod
    async def _write_audit(session: AsyncSession, user_id, action: str, description: str):
        log = ActivityLog(user_id=user_id, action=action, description=description)
        session.add(log)

    # =========================================================================
    # CRUD
    # =========================================================================

    @staticmethod
    async def create(
        session: AsyncSession,
        payload,
        current_user: User
    ) -> dict:
        """Creates a new internship. HR must be a company member."""
        company_id = uuid.UUID(payload.company_id)

        company = await session.get(Company, company_id)
        if not company or company.deleted_at:
            raise ResourceNotFoundException("Company", payload.company_id)

        await InternshipService._assert_is_company_hr(session, company_id, current_user)

        # Parse deadline
        deadline = None
        if payload.application_deadline:
            try:
                deadline = date.fromisoformat(payload.application_deadline)
            except ValueError:
                raise BaseAPIException("Invalid application_deadline format. Use YYYY-MM-DD.", status_code=400)

        # Determine initial status
        status = InternshipStatus.PUBLISHED if payload.status == "PUBLISHED" else InternshipStatus.DRAFT
        published_at = datetime.utcnow() if status == InternshipStatus.PUBLISHED else None

        internship = Internship(
            company_id=company_id,
            title=payload.title,
            description=payload.description,
            responsibilities=payload.responsibilities or [],
            required_skills=payload.required_skills or [],
            technologies=payload.technologies or [],
            experience_level=payload.experience_level,
            status=status,
            is_active=(status == InternshipStatus.PUBLISHED),
            published_at=published_at,
            work_mode=WorkMode(payload.work_mode),
            location=payload.location,
            duration_weeks=payload.duration_weeks,
            stipend_min=payload.stipend_min,
            stipend_max=payload.stipend_max,
            stipend_currency=payload.stipend_currency or "INR",
            openings=payload.openings,
            application_limit=payload.application_limit,
            application_deadline=deadline,
            created_by=current_user.id,
            updated_by=current_user.id,
            view_count=0,
        )
        session.add(internship)
        await session.flush()

        # Generate slug
        internship.slug = _slugify(internship.title, str(internship.id))
        internship.company = company
        await session.flush()

        await InternshipService._write_audit(
            session, current_user.id, "INTERNSHIP_CREATED",
            f"Internship '{internship.title}' created for company '{company.name}'."
        )

        return InternshipService._serialize(internship, 0)

    @staticmethod
    async def get(session: AsyncSession, internship_id: uuid.UUID, increment_view: bool = False) -> dict:
        """Fetches a single internship by ID. Optionally increments view count."""
        internship = await internship_repo.get_by_id_with_company(session, internship_id)
        if not internship:
            raise ResourceNotFoundException("Internship", str(internship_id))

        if increment_view:
            await internship_repo.increment_view_count(session, internship_id)
            internship.view_count += 1

        count = await internship_repo.get_application_count(session, internship_id)
        return InternshipService._serialize(internship, count)

    @staticmethod
    async def list_internships(
        session: AsyncSession,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        company_id: Optional[str] = None,
        status: Optional[str] = None,
        work_mode: Optional[str] = None,
        experience_level: Optional[str] = None,
        location: Optional[str] = None,
        has_stipend: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        current_user: Optional[User] = None,
        created_by: Optional[str] = None,
    ) -> dict:
        """
        Paginated internship listing with filters.
        Public callers: forced to PUBLISHED only.
        HR callers: can filter by any status for their companies.
        """
        # Non-HR, non-admin see only PUBLISHED
        if current_user is None or current_user.role == UserRole.STUDENT:
            status = "PUBLISHED"

        internships, total = await internship_repo.search_paginated(
            session,
            page=page,
            per_page=per_page,
            search=search,
            company_id=company_id,
            status=status,
            work_mode=work_mode,
            experience_level=experience_level,
            location=location,
            has_stipend=has_stipend,
            sort_by=sort_by,
            sort_dir=sort_dir,
            created_by=created_by,
        )

        # Bulk-load companies and application counts
        ids = [i.id for i in internships]
        app_counts = await internship_repo.get_application_counts_bulk(session, ids)

        # Eagerly load companies for serialization
        company_ids = list({i.company_id for i in internships})
        companies = {}
        for cid in company_ids:
            c = await session.get(Company, cid)
            if c:
                companies[str(cid)] = c

        serialized = []
        for i in internships:
            if not i.company:
                i.company = companies.get(str(i.company_id))
            count = app_counts.get(str(i.id), 0)
            serialized.append(InternshipService._serialize(i, count))

        return {"internships": serialized, "total": total, "page": page, "per_page": per_page}

    @staticmethod
    async def update(
        session: AsyncSession,
        internship_id: uuid.UUID,
        payload,
        current_user: User
    ) -> dict:
        """Updates internship fields. Owner/creator/admin only."""
        internship = await internship_repo.get_by_id_with_company(session, internship_id)
        if not internship:
            raise ResourceNotFoundException("Internship", str(internship_id))

        await InternshipService._assert_can_manage(session, internship, current_user)

        # Reject updates to CLOSED/ARCHIVED internships unless admin
        if internship.status in [InternshipStatus.CLOSED, InternshipStatus.ARCHIVED]:
            if current_user.role != UserRole.ADMIN:
                raise BaseAPIException(
                    "Cannot edit a closed or archived internship.", status_code=400, code="BAD_REQUEST"
                )

        update_fields = [
            "title", "description", "responsibilities", "required_skills",
            "technologies", "experience_level", "work_mode", "location",
            "duration_weeks", "stipend_min", "stipend_max", "stipend_currency",
            "openings", "application_limit",
        ]
        for field in update_fields:
            val = getattr(payload, field, None)
            if val is not None:
                if field == "work_mode":
                    setattr(internship, field, WorkMode(val))
                else:
                    setattr(internship, field, val)

        if payload.application_deadline is not None:
            try:
                internship.application_deadline = date.fromisoformat(payload.application_deadline)
            except ValueError:
                raise BaseAPIException("Invalid date format. Use YYYY-MM-DD.", status_code=400)

        # Regenerate slug if title changed
        if payload.title:
            internship.slug = _slugify(internship.title, str(internship.id))

        internship.updated_by = current_user.id
        await session.flush()

        await InternshipService._write_audit(
            session, current_user.id, "INTERNSHIP_UPDATED",
            f"Internship '{internship.title}' updated."
        )

        count = await internship_repo.get_application_count(session, internship_id)
        return InternshipService._serialize(internship, count)

    @staticmethod
    async def delete(
        session: AsyncSession, internship_id: uuid.UUID, current_user: User
    ) -> dict:
        """Soft-deletes an internship."""
        internship = await internship_repo.get_by_id_with_company(session, internship_id)
        if not internship:
            raise ResourceNotFoundException("Internship", str(internship_id))

        await InternshipService._assert_can_manage(session, internship, current_user)

        internship.deleted_at = datetime.utcnow()
        internship.is_active = False
        internship.updated_by = current_user.id
        await session.flush()

        await InternshipService._write_audit(
            session, current_user.id, "INTERNSHIP_DELETED",
            f"Internship '{internship.title}' soft-deleted."
        )

        return {"success": True, "message": f"Internship '{internship.title}' deleted."}

    # =========================================================================
    # Lifecycle Transitions
    # =========================================================================

    @staticmethod
    async def _transition(
        session: AsyncSession,
        internship_id: uuid.UUID,
        current_user: User,
        new_status: InternshipStatus,
        action_name: str,
        guard_fn=None,
    ) -> dict:
        internship = await internship_repo.get_by_id_with_company(session, internship_id)
        if not internship:
            raise ResourceNotFoundException("Internship", str(internship_id))
        await InternshipService._assert_can_manage(session, internship, current_user)
        if guard_fn:
            guard_fn(internship)

        internship.status = new_status
        internship.is_active = (new_status == InternshipStatus.PUBLISHED)
        if new_status == InternshipStatus.PUBLISHED and not internship.published_at:
            internship.published_at = datetime.utcnow()
        internship.updated_by = current_user.id
        await session.flush()

        await InternshipService._write_audit(
            session, current_user.id, action_name,
            f"Internship '{internship.title}' transitioned to {new_status.value}."
        )

        count = await internship_repo.get_application_count(session, internship_id)
        return InternshipService._serialize(internship, count)

    @staticmethod
    async def publish(session, internship_id, current_user):
        """Transitions DRAFT → PUBLISHED."""
        def guard(i):
            if i.status == InternshipStatus.PUBLISHED:
                raise BaseAPIException("Internship is already published.", status_code=400)
            if i.status == InternshipStatus.ARCHIVED:
                raise BaseAPIException("Cannot publish an archived internship. Restore it first.", status_code=400)
        return await InternshipService._transition(
            session, internship_id, current_user, InternshipStatus.PUBLISHED, "INTERNSHIP_PUBLISHED", guard
        )

    @staticmethod
    async def close(session, internship_id, current_user):
        """Transitions PUBLISHED → CLOSED."""
        def guard(i):
            if i.status != InternshipStatus.PUBLISHED:
                raise BaseAPIException("Only published internships can be closed.", status_code=400)
        return await InternshipService._transition(
            session, internship_id, current_user, InternshipStatus.CLOSED, "INTERNSHIP_CLOSED", guard
        )

    @staticmethod
    async def archive(session, internship_id, current_user):
        """Transitions any status → ARCHIVED."""
        return await InternshipService._transition(
            session, internship_id, current_user, InternshipStatus.ARCHIVED, "INTERNSHIP_ARCHIVED"
        )

    @staticmethod
    async def restore(session, internship_id, current_user):
        """Restores CLOSED/ARCHIVED → DRAFT."""
        def guard(i):
            if i.status not in [InternshipStatus.CLOSED, InternshipStatus.ARCHIVED]:
                raise BaseAPIException("Only closed or archived internships can be restored.", status_code=400)
        return await InternshipService._transition(
            session, internship_id, current_user, InternshipStatus.DRAFT, "INTERNSHIP_RESTORED", guard
        )

    # =========================================================================
    # Duplicate
    # =========================================================================

    @staticmethod
    async def duplicate(
        session: AsyncSession, internship_id: uuid.UUID, current_user: User
    ) -> dict:
        """Creates a DRAFT copy of an existing internship."""
        original = await internship_repo.get_by_id_with_company(session, internship_id)
        if not original:
            raise ResourceNotFoundException("Internship", str(internship_id))

        await InternshipService._assert_can_manage(session, original, current_user)

        copy = Internship(
            company_id=original.company_id,
            title=f"[Copy] {original.title}",
            description=original.description,
            responsibilities=list(original.responsibilities or []),
            required_skills=list(original.required_skills or []),
            technologies=list(original.technologies or []),
            experience_level=original.experience_level,
            status=InternshipStatus.DRAFT,
            is_active=False,
            work_mode=original.work_mode,
            location=original.location,
            duration_weeks=original.duration_weeks,
            stipend_min=original.stipend_min,
            stipend_max=original.stipend_max,
            stipend_currency=original.stipend_currency,
            openings=original.openings,
            application_limit=original.application_limit,
            created_by=current_user.id,
            updated_by=current_user.id,
            view_count=0,
        )
        session.add(copy)
        await session.flush()
        copy.slug = _slugify(copy.title, str(copy.id))
        copy.company = original.company
        await session.flush()

        await InternshipService._write_audit(
            session, current_user.id, "INTERNSHIP_DUPLICATED",
            f"Internship '{original.title}' duplicated as '{copy.title}'."
        )

        return InternshipService._serialize(copy, 0)

    # =========================================================================
    # Analytics
    # =========================================================================

    @staticmethod
    async def get_analytics(
        session: AsyncSession, internship_id: uuid.UUID, current_user: User
    ) -> dict:
        """Comprehensive analytics for a single internship."""
        internship = await internship_repo.get_by_id_with_company(session, internship_id)
        if not internship:
            raise ResourceNotFoundException("Internship", str(internship_id))

        await InternshipService._assert_can_manage(session, internship, current_user)

        # All applications
        apps_stmt = select(Application).where(
            and_(Application.vacancy_id == internship_id, Application.deleted_at == None)
        )
        apps_result = await session.execute(apps_stmt)
        all_apps = list(apps_result.scalars().all())

        total_apps = len(all_apps)
        by_status: Dict[str, int] = {}
        for app in all_apps:
            key = app.status.value
            by_status[key] = by_status.get(key, 0) + 1

        shortlisted = by_status.get("SHORTLISTED", 0)
        rejected = by_status.get("REJECTED", 0)
        conversion_rate = round((shortlisted / total_apps * 100), 2) if total_apps > 0 else 0.0

        # Score averages from ApplicationMapping
        avg_ats = avg_sim = avg_interview = None
        if total_apps:
            app_ids = [a.id for a in all_apps]
            mapping_stmt = select(ApplicationMapping).where(
                ApplicationMapping.application_id.in_(app_ids)
            )
            mappings_result = await session.execute(mapping_stmt)
            mappings = list(mappings_result.scalars().all())

            ats_scores = [m.ats_score for m in mappings if m.ats_score is not None]
            sim_scores = [m.simulation_score for m in mappings if m.simulation_score is not None]
            iv_scores = [m.interview_answer_score_pct for m in mappings if m.interview_answer_score_pct is not None]

            if ats_scores:
                avg_ats = round(sum(ats_scores) / len(ats_scores), 2)
            if sim_scores:
                avg_sim = round(sum(sim_scores) / len(sim_scores), 2)
            if iv_scores:
                avg_interview = round(sum(iv_scores) / len(iv_scores), 2)

        # Days calculations
        today = date.today()
        days_posted = (today - internship.created_at.date()).days if internship.created_at else None
        days_to_deadline = None
        if internship.application_deadline:
            days_to_deadline = (internship.application_deadline - today).days

        pipeline_stages = ["APPLIED", "ATS_COMPLETED", "SIMULATION_COMPLETED", "INTERVIEW_COMPLETED", "SHORTLISTED"]

        return {
            "internship_id": str(internship.id),
            "title": internship.title,
            "status": internship.status.value,
            "view_count": internship.view_count,
            "application_count": total_apps,
            "shortlisted_count": shortlisted,
            "rejected_count": rejected,
            "conversion_rate": conversion_rate,
            "avg_ats_score": avg_ats,
            "avg_simulation_score": avg_sim,
            "avg_interview_score": avg_interview,
            "pipeline_breakdown": {s: by_status.get(s, 0) for s in pipeline_stages},
            "days_since_posted": days_posted,
            "days_until_deadline": days_to_deadline,
        }
