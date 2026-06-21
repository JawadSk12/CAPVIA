"""
CAPVIA Phase 9 — Application Repository
Handles all DB queries for applications and application_events.
"""
from typing import List, Optional, Tuple, Dict
from sqlalchemy import select, and_, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    Application, ApplicationEvent, ApplicationStatus, Internship, User, Notification
)
from capvia_platform.repositories.base import BaseRepository


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self):
        super().__init__(Application)

    async def get_by_id_full(self, session: AsyncSession, application_id) -> Optional[Application]:
        """Full load: candidate, vacancy (with company), mapping, results, events."""
        stmt = (
            select(Application)
            .where(and_(Application.id == application_id, Application.deleted_at == None))
            .options(
                selectinload(Application.candidate),
                selectinload(Application.vacancy).selectinload(Internship.company),
                selectinload(Application.application_mapping),
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.dna_profile),
                selectinload(Application.ranking),
                selectinload(Application.report),
                selectinload(Application.events),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_candidate_applications(
        self,
        session: AsyncSession,
        candidate_id,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[Application], int]:
        """All applications for a given candidate, with optional status filter."""
        base = (
            select(Application)
            .where(and_(Application.candidate_id == candidate_id, Application.deleted_at == None))
            .options(
                selectinload(Application.vacancy).selectinload(Internship.company),
                selectinload(Application.application_mapping),
            )
        )
        if status:
            base = base.where(Application.status == status)

        count_result = await session.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        stmt = base.order_by(Application.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        rows = await session.execute(stmt)
        return list(rows.scalars().all()), total

    async def get_internship_applications(
        self,
        session: AsyncSession,
        internship_id,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> Tuple[List[Application], int]:
        """All applications for an internship (HR view)."""
        base = (
            select(Application)
            .where(and_(Application.vacancy_id == internship_id, Application.deleted_at == None))
            .options(
                selectinload(Application.candidate),
                selectinload(Application.application_mapping),
                selectinload(Application.ats_result),
                selectinload(Application.ranking),
            )
        )
        if status:
            base = base.where(Application.status == status)

        count_result = await session.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        allowed_sorts = {
            "created_at": Application.created_at,
            "status": Application.status,
        }
        col = allowed_sorts.get(sort_by, Application.created_at)
        order = col.asc() if sort_dir == "asc" else col.desc()

        stmt = base.order_by(order).offset((page - 1) * per_page).limit(per_page)
        rows = await session.execute(stmt)
        return list(rows.scalars().all()), total

    async def find_duplicate(
        self, session: AsyncSession, candidate_id, internship_id
    ) -> Optional[Application]:
        """Returns an existing non-withdrawn application for duplicate guard."""
        stmt = select(Application).where(
            and_(
                Application.candidate_id == candidate_id,
                Application.vacancy_id == internship_id,
                Application.deleted_at == None,
                Application.status.not_in([ApplicationStatus.WITHDRAWN]),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_candidate_status_counts(
        self, session: AsyncSession, candidate_id
    ) -> Dict[str, int]:
        """Status breakdown for the candidate dashboard."""
        stmt = (
            select(Application.status, func.count(Application.id).label("cnt"))
            .where(and_(Application.candidate_id == candidate_id, Application.deleted_at == None))
            .group_by(Application.status)
        )
        rows = await session.execute(stmt)
        return {row.status.value: row.cnt for row in rows.all()}


class ApplicationEventRepository:

    async def create_event(
        self,
        session: AsyncSession,
        application_id,
        event_type: str,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        actor_id=None,
        actor_role: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> ApplicationEvent:
        event = ApplicationEvent(
            application_id=application_id,
            event_type=event_type,
            from_status=from_status,
            to_status=to_status,
            actor_id=actor_id,
            actor_role=actor_role,
            event_metadata=metadata or {},
        )
        session.add(event)
        await session.flush()
        return event

    async def get_timeline(
        self, session: AsyncSession, application_id
    ) -> List[ApplicationEvent]:
        """All events for an application in chronological order."""
        stmt = (
            select(ApplicationEvent)
            .where(ApplicationEvent.application_id == application_id)
            .options(selectinload(ApplicationEvent.actor))
            .order_by(ApplicationEvent.created_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())
