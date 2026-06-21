import uuid
from typing import List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from capvia_platform.repositories.base import BaseRepository
from capvia_platform.models.models import (
    User, Company, CompanyMember, MemberRole, Internship, Application,
    ApplicationMapping, Ranking, ActivityLog, Report
)

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, session: AsyncSession, email: str) -> Optional[User]:
        """
        Retrieves a user by email address, excluding soft-deleted profiles.
        """
        stmt = select(User).where(and_(User.email == email, User.deleted_at == None))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

class CompanyRepository(BaseRepository[Company]):
    def __init__(self):
        super().__init__(Company)

    async def get_by_id_with_details(self, session: AsyncSession, company_id) -> Optional[Company]:
        """
        Retrieves a company by ID with members and internships eagerly loaded.
        """
        stmt = (
            select(Company)
            .where(and_(Company.id == company_id, Company.deleted_at == None))
            .options(
                selectinload(Company.members).selectinload(CompanyMember.user),
                selectinload(Company.internships),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, session: AsyncSession, name: str) -> Optional[Company]:
        """
        Finds a company by exact name, excluding soft-deleted records.
        """
        stmt = select(Company).where(and_(Company.name == name, Company.deleted_at == None))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all_paginated(
        self, session: AsyncSession, page: int = 1, per_page: int = 20, search: Optional[str] = None
    ) -> tuple[List[Company], int]:
        """
        Paginates all active companies, optionally filtering by name search.
        """
        base_stmt = select(Company).where(Company.deleted_at == None)
        if search:
            base_stmt = base_stmt.where(Company.name.ilike(f"%{search}%"))

        # Count total
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        count_result = await session.execute(count_stmt)
        total = count_result.scalar_one()

        # Fetch paginated
        stmt = base_stmt.order_by(Company.name.asc()).offset((page - 1) * per_page).limit(per_page)
        result = await session.execute(stmt)
        companies = list(result.scalars().all())

        return companies, total

    async def list_for_user(self, session: AsyncSession, user_id) -> List[Company]:
        """
        Returns companies where the given user is a member or owner.
        """
        stmt = (
            select(Company)
            .join(CompanyMember, CompanyMember.company_id == Company.id)
            .where(and_(CompanyMember.user_id == user_id, Company.deleted_at == None))
            .order_by(Company.name.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_member(self, session: AsyncSession, company_id, user_id) -> Optional[CompanyMember]:
        """
        Retrieves a specific company membership record.
        """
        stmt = select(CompanyMember).where(
            and_(CompanyMember.company_id == company_id, CompanyMember.user_id == user_id)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_members(self, session: AsyncSession, company_id) -> List[CompanyMember]:
        """
        Retrieves all members of a company with their user profile eagerly loaded.
        """
        stmt = (
            select(CompanyMember)
            .where(CompanyMember.company_id == company_id)
            .options(selectinload(CompanyMember.user))
            .order_by(CompanyMember.member_role.asc(), CompanyMember.joined_at.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def add_member(
        self, session: AsyncSession, company_id, user_id, role: MemberRole = MemberRole.MEMBER
    ) -> CompanyMember:
        """
        Adds a user as a company member. No-ops if already a member.
        """
        existing = await self.get_member(session, company_id, user_id)
        if existing:
            existing.member_role = role
            await session.flush()
            return existing

        member = CompanyMember(company_id=company_id, user_id=user_id, member_role=role)
        session.add(member)
        await session.flush()
        return member

    async def remove_member(self, session: AsyncSession, company_id, user_id) -> bool:
        """
        Removes a user from a company's membership list.
        """
        member = await self.get_member(session, company_id, user_id)
        if not member:
            return False
        await session.delete(member)
        await session.flush()
        return True

    async def get_internship_count(self, session: AsyncSession, company_id) -> int:
        """
        Returns the count of active internships for a company.
        """
        stmt = select(func.count()).select_from(
            select(Internship).where(
                and_(Internship.company_id == company_id, Internship.deleted_at == None)
            ).subquery()
        )
        result = await session.execute(stmt)
        return result.scalar_one() or 0

    async def get_total_applications(self, session: AsyncSession, company_id) -> int:
        """
        Counts total applications across all company internships.
        """
        stmt = select(func.count()).select_from(
            select(Application)
            .join(Internship, Application.vacancy_id == Internship.id)
            .where(
                and_(
                    Internship.company_id == company_id,
                    Application.deleted_at == None,
                    Internship.deleted_at == None
                )
            ).subquery()
        )
        result = await session.execute(stmt)
        return result.scalar_one() or 0


class InternshipRepository(BaseRepository[Internship]):
    def __init__(self):
        super().__init__(Internship)

    async def list_active_by_company(self, session: AsyncSession, company_id) -> List[Internship]:
        """Retrieves all active internships posted by a specific company."""
        stmt = select(Internship).where(
            and_(
                Internship.company_id == company_id,
                Internship.is_active == True,
                Internship.deleted_at == None
            )
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def search_paginated(
        self,
        session: AsyncSession,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        company_id: Optional[str] = None,
        status: Optional[str] = None,
        work_mode: Optional[str] = None,
        experience_level: Optional[str] = None,
        location: Optional[str] = None,
        skills: Optional[List[str]] = None,
        has_stipend: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        created_by: Optional[str] = None,
    ) -> tuple[List[Internship], int]:
        """
        Flexible search with full filter/sort/pagination support.
        Used for both public marketplace (status=PUBLISHED) and HR management views.
        """
        from sqlalchemy import or_, cast
        from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY

        base = select(Internship).where(Internship.deleted_at == None)

        if search:
            base = base.where(
                or_(
                    Internship.title.ilike(f"%{search}%"),
                    Internship.description.ilike(f"%{search}%"),
                    Internship.location.ilike(f"%{search}%"),
                )
            )
        if company_id:
            base = base.where(Internship.company_id == company_id)
        if status:
            base = base.where(Internship.status == status)
        if work_mode:
            base = base.where(Internship.work_mode == work_mode)
        if experience_level:
            base = base.where(Internship.experience_level == experience_level)
        if location:
            base = base.where(Internship.location.ilike(f"%{location}%"))
        if has_stipend is True:
            base = base.where(Internship.stipend_min.isnot(None))
        elif has_stipend is False:
            base = base.where(Internship.stipend_min.is_(None))
        if created_by:
            base = base.where(Internship.created_by == created_by)

        # Count total
        count_result = await session.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()

        # Sorting
        allowed_sorts = {
            "created_at": Internship.created_at,
            "updated_at": Internship.updated_at,
            "title": Internship.title,
            "view_count": Internship.view_count,
            "openings": Internship.openings,
            "stipend_min": Internship.stipend_min,
            "application_deadline": Internship.application_deadline,
        }
        sort_col = allowed_sorts.get(sort_by, Internship.created_at)
        order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

        stmt = base.order_by(order).offset((page - 1) * per_page).limit(per_page)
        result = await session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_id_with_company(self, session: AsyncSession, internship_id) -> Optional[Internship]:
        """Fetches an internship with its company eagerly loaded."""
        stmt = (
            select(Internship)
            .where(and_(Internship.id == internship_id, Internship.deleted_at == None))
            .options(selectinload(Internship.company))
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_slug(self, session: AsyncSession, slug: str) -> Optional[Internship]:
        """Fetches an internship by its URL slug."""
        stmt = (
            select(Internship)
            .where(and_(Internship.slug == slug, Internship.deleted_at == None))
            .options(selectinload(Internship.company))
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def increment_view_count(self, session: AsyncSession, internship_id) -> None:
        """Atomically increments the view counter."""
        from sqlalchemy import update
        stmt = (
            update(Internship)
            .where(Internship.id == internship_id)
            .values(view_count=Internship.view_count + 1)
        )
        await session.execute(stmt)

    async def get_application_count(self, session: AsyncSession, internship_id) -> int:
        """Returns the total application count for an internship."""
        stmt = select(func.count()).select_from(
            select(Application)
            .where(and_(Application.vacancy_id == internship_id, Application.deleted_at == None))
            .subquery()
        )
        result = await session.execute(stmt)
        return result.scalar_one() or 0

    async def get_application_counts_bulk(
        self, session: AsyncSession, internship_ids: List
    ) -> dict:
        """Returns {internship_id: count} mapping for multiple internships at once."""
        if not internship_ids:
            return {}
        stmt = (
            select(Application.vacancy_id, func.count(Application.id).label("cnt"))
            .where(
                and_(Application.vacancy_id.in_(internship_ids), Application.deleted_at == None)
            )
            .group_by(Application.vacancy_id)
        )
        result = await session.execute(stmt)
        return {str(row.vacancy_id): row.cnt for row in result.all()}


class ApplicationRepository(BaseRepository[Application]):
    def __init__(self):
        super().__init__(Application)

    async def get_application_pipeline_details(self, session: AsyncSession, application_id) -> Optional[Application]:
        """
        Eagerly loads all aggregate screening results and mapping data for recruiter dashboards.
        """
        stmt = (
            select(Application)
            .where(and_(Application.id == application_id, Application.deleted_at == None))
            .options(
                selectinload(Application.candidate),
                selectinload(Application.vacancy),
                selectinload(Application.application_mapping),
                selectinload(Application.ats_result),
                selectinload(Application.simulation_result),
                selectinload(Application.interview_result),
                selectinload(Application.integrity_result),
                selectinload(Application.dna_profile),
                selectinload(Application.ranking),
                selectinload(Application.report)
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

class ApplicationMappingRepository(BaseRepository[ApplicationMapping]):
    def __init__(self):
        super().__init__(ApplicationMapping)

    async def get_by_attempt_id(self, session: AsyncSession, attempt_id: int) -> Optional[ApplicationMapping]:
        """
        Resolves application mapping coordinates by Simulation attempt ID.
        """
        stmt = select(ApplicationMapping).where(ApplicationMapping.simulation_attempt_id == attempt_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_session_id(self, session: AsyncSession, session_id) -> Optional[ApplicationMapping]:
        """
        Resolves application mapping coordinates by Interview session UUID.
        """
        stmt = select(ApplicationMapping).where(ApplicationMapping.interview_session_uuid == session_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

class RankingRepository(BaseRepository[Ranking]):
    def __init__(self):
        super().__init__(Ranking)

    async def get_leaderboard_for_internship(self, session: AsyncSession, internship_id) -> List[Ranking]:
        """
        Retrieves the sorted leaderboard rankings for a specific internship.
        """
        stmt = (
            select(Ranking)
            .where(and_(Ranking.internship_id == internship_id, Ranking.deleted_at == None))
            .order_by(Ranking.rank.asc())
            .options(selectinload(Ranking.application))
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

class ActivityLogRepository(BaseRepository[ActivityLog]):
    def __init__(self):
        super().__init__(ActivityLog)


class ReportRepository(BaseRepository[Report]):
    def __init__(self):
        super().__init__(Report)

    async def get_by_application_id(self, session: AsyncSession, application_id: uuid.UUID) -> Optional[Report]:
        """
        Retrieves a report record by its application ID, excluding soft-deleted reports.
        """
        stmt = select(Report).where(and_(Report.application_id == application_id, Report.deleted_at == None))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
