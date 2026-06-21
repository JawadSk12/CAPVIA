"""
CAPVIA Phase 7 — Company Service
Handles all business logic for the Companies Module.
Enforces RBAC: HR can create, Owner/Admin can edit/delete, Admin can verify.
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from capvia_platform.models.models import (
    User, Company, CompanyMember, Internship, Application,
    ApplicationMapping, ActivityLog, UserRole, MemberRole,
    ApplicationStatus
)
from capvia_platform.repositories.repositories import CompanyRepository
from capvia_platform.core.exceptions import (
    BaseAPIException, ResourceNotFoundException, AuthorizationException, ValidationException
)

company_repo = CompanyRepository()


class CompanyService:
    """
    Central service for all company operations.
    """

    # =========================================================================
    # Helpers
    # =========================================================================

    @staticmethod
    def _serialize_company(company: Company, member_count: int = 0, internship_count: int = 0) -> dict:
        return {
            "id": str(company.id),
            "name": company.name,
            "description": company.description,
            "logo_url": company.logo_url,
            "industry": company.industry,
            "website_url": company.website_url,
            "headquarters": company.headquarters,
            "founded_year": company.founded_year,
            "employee_count": company.employee_count,
            "is_verified": company.is_verified,
            "created_by": str(company.created_by) if company.created_by else None,
            "member_count": member_count,
            "internship_count": internship_count,
            "created_at": company.created_at,
            "updated_at": company.updated_at,
        }

    @staticmethod
    async def _assert_owner_or_admin(session: AsyncSession, company: Company, current_user: User):
        """Raises AuthorizationException if the user is not the owner or an admin."""
        if current_user.role == UserRole.ADMIN:
            return
        member = await company_repo.get_member(session, company.id, current_user.id)
        if not member or member.member_role != MemberRole.OWNER:
            raise AuthorizationException(
                "Access denied. Only company owners or administrators can perform this action."
            )

    @staticmethod
    async def _write_audit(
        session: AsyncSession, user_id: uuid.UUID, action: str, description: str
    ):
        log = ActivityLog(user_id=user_id, action=action, description=description)
        session.add(log)

    # =========================================================================
    # CRUD Operations
    # =========================================================================

    @staticmethod
    async def create_company(
        session: AsyncSession,
        payload,
        current_user: User
    ) -> dict:
        """
        Creates a new company. Only HR users can create.
        The creating HR user is automatically assigned as OWNER.
        """
        if current_user.role not in [UserRole.HR, UserRole.ADMIN]:
            raise AuthorizationException("Only HR users or Admins can create companies.")

        # Check name uniqueness
        existing = await company_repo.get_by_name(session, payload.name)
        if existing:
            raise BaseAPIException(
                f"A company named '{payload.name}' already exists.",
                status_code=409, code="CONFLICT"
            )

        company = Company(
            name=payload.name,
            description=payload.description,
            logo_url=payload.logo_url,
            industry=payload.industry,
            website_url=payload.website_url,
            headquarters=payload.headquarters,
            founded_year=payload.founded_year,
            employee_count=payload.employee_count,
            created_by=current_user.id,
            updated_by=current_user.id,
        )
        session.add(company)
        await session.flush()

        # Auto-assign creator as OWNER
        await company_repo.add_member(session, company.id, current_user.id, MemberRole.OWNER)

        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_CREATED",
            f"Company '{company.name}' created by {current_user.email}."
        )

        return CompanyService._serialize_company(company, member_count=1, internship_count=0)

    @staticmethod
    async def get_company(session: AsyncSession, company_id: uuid.UUID) -> dict:
        """
        Returns full company profile with member and internship counts.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        member_count = len(company.members)
        internship_count = len([i for i in company.internships if i.deleted_at is None])

        return CompanyService._serialize_company(company, member_count, internship_count)

    @staticmethod
    async def list_companies(
        session: AsyncSession, page: int = 1, per_page: int = 20, search: Optional[str] = None
    ) -> dict:
        """
        Paginates all active companies.
        """
        companies, total = await company_repo.list_all_paginated(session, page, per_page, search)
        serialized = [CompanyService._serialize_company(c) for c in companies]
        return {
            "companies": serialized,
            "total": total,
            "page": page,
            "per_page": per_page
        }

    @staticmethod
    async def list_my_companies(session: AsyncSession, current_user: User) -> list:
        """
        Returns companies where the current user is a member or owner.
        """
        companies = await company_repo.list_for_user(session, current_user.id)
        return [CompanyService._serialize_company(c) for c in companies]

    @staticmethod
    async def update_company(
        session: AsyncSession,
        company_id: uuid.UUID,
        payload,
        current_user: User
    ) -> dict:
        """
        Updates company details. Only the owner or admin can update.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)

        # Apply partial updates
        if payload.name is not None and payload.name != company.name:
            existing = await company_repo.get_by_name(session, payload.name)
            if existing and existing.id != company_id:
                raise BaseAPIException(
                    f"A company named '{payload.name}' already exists.",
                    status_code=409, code="CONFLICT"
                )
            company.name = payload.name

        update_fields = [
            "description", "logo_url", "industry", "website_url",
            "headquarters", "founded_year", "employee_count"
        ]
        for field in update_fields:
            val = getattr(payload, field, None)
            if val is not None:
                setattr(company, field, val)

        company.updated_by = current_user.id
        await session.flush()

        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_UPDATED",
            f"Company '{company.name}' updated by {current_user.email}."
        )

        member_count = len(company.members)
        internship_count = len([i for i in company.internships if i.deleted_at is None])
        return CompanyService._serialize_company(company, member_count, internship_count)

    @staticmethod
    async def delete_company(
        session: AsyncSession,
        company_id: uuid.UUID,
        current_user: User
    ) -> dict:
        """
        Soft-deletes a company. Only the owner or admin can delete.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)

        company.deleted_at = datetime.utcnow()
        company.updated_by = current_user.id
        await session.flush()

        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_DELETED",
            f"Company '{company.name}' soft-deleted by {current_user.email}."
        )

        return {"success": True, "message": f"Company '{company.name}' has been deleted."}

    # =========================================================================
    # Team Management
    # =========================================================================

    @staticmethod
    async def get_members(session: AsyncSession, company_id: uuid.UUID, current_user: User) -> list:
        """
        Returns the team member list for a company. Owner/Admin only.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)
        members = await company_repo.get_members(session, company_id)

        return [
            {
                "id": str(m.id),
                "user_id": str(m.user_id),
                "full_name": m.user.full_name if m.user else "Unknown",
                "email": m.user.email if m.user else "",
                "member_role": m.member_role.value,
                "joined_at": m.joined_at.isoformat(),
            }
            for m in members
        ]

    @staticmethod
    async def add_member(
        session: AsyncSession,
        company_id: uuid.UUID,
        user_id: uuid.UUID,
        role_str: str,
        current_user: User
    ) -> dict:
        """
        Adds a user as a team member. Owner/Admin only.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)

        # Validate target user exists
        target = await session.get(User, user_id)
        if not target or not target.is_active:
            raise ResourceNotFoundException("User", str(user_id))

        if target.role not in [UserRole.HR, UserRole.ADMIN]:
            raise BaseAPIException(
                "Only HR users or Admins can be added as company team members.",
                status_code=400, code="BAD_REQUEST"
            )

        role = MemberRole.OWNER if role_str.upper() == "OWNER" else MemberRole.MEMBER
        member = await company_repo.add_member(session, company_id, user_id, role)

        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_MEMBER_ADDED",
            f"User {target.email} added to company '{company.name}' as {role.value}."
        )

        return {
            "id": str(member.id),
            "user_id": str(member.user_id),
            "full_name": target.full_name,
            "email": target.email,
            "member_role": member.member_role.value,
            "joined_at": member.joined_at.isoformat(),
        }

    @staticmethod
    async def remove_member(
        session: AsyncSession,
        company_id: uuid.UUID,
        target_user_id: uuid.UUID,
        current_user: User
    ) -> dict:
        """
        Removes a member from the company team. Owner/Admin only.
        Cannot remove the last owner.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)

        target_member = await company_repo.get_member(session, company_id, target_user_id)
        if not target_member:
            raise ResourceNotFoundException("Company Member", str(target_user_id))

        # Prevent removing the last owner
        if target_member.member_role == MemberRole.OWNER:
            owners = [m for m in company.members if m.member_role == MemberRole.OWNER]
            if len(owners) <= 1:
                raise BaseAPIException(
                    "Cannot remove the last owner. Transfer ownership first.",
                    status_code=400, code="BAD_REQUEST"
                )

        removed = await company_repo.remove_member(session, company_id, target_user_id)
        if not removed:
            raise ResourceNotFoundException("Company Member", str(target_user_id))

        target = await session.get(User, target_user_id)
        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_MEMBER_REMOVED",
            f"User {getattr(target, 'email', str(target_user_id))} removed from company '{company.name}'."
        )

        return {"success": True, "message": "Team member removed successfully."}

    # =========================================================================
    # Ownership Transfer
    # =========================================================================

    @staticmethod
    async def transfer_ownership(
        session: AsyncSession,
        company_id: uuid.UUID,
        new_owner_id: uuid.UUID,
        current_user: User
    ) -> dict:
        """
        Transfers OWNER role to another member. Only the current OWNER can perform this.
        The previous owner is demoted to MEMBER.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        # Only current owner can transfer (not admin)
        current_membership = await company_repo.get_member(session, company_id, current_user.id)
        if not current_membership or current_membership.member_role != MemberRole.OWNER:
            raise AuthorizationException("Only the current company owner can transfer ownership.")

        new_owner_membership = await company_repo.get_member(session, company_id, new_owner_id)
        if not new_owner_membership:
            raise BaseAPIException(
                "The target user must be an existing company member before ownership can be transferred.",
                status_code=400, code="BAD_REQUEST"
            )

        # Atomic swap
        current_membership.member_role = MemberRole.MEMBER
        new_owner_membership.member_role = MemberRole.OWNER
        company.updated_by = current_user.id
        await session.flush()

        new_owner = await session.get(User, new_owner_id)
        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_OWNERSHIP_TRANSFERRED",
            f"Company '{company.name}' ownership transferred from {current_user.email} "
            f"to {getattr(new_owner, 'email', str(new_owner_id))}."
        )

        return {"success": True, "message": f"Ownership of '{company.name}' has been transferred."}

    # =========================================================================
    # Admin Operations
    # =========================================================================

    @staticmethod
    async def verify_company(
        session: AsyncSession,
        company_id: uuid.UUID,
        current_user: User
    ) -> dict:
        """
        Toggles the is_verified flag on a company. Admin only.
        """
        if current_user.role != UserRole.ADMIN:
            raise AuthorizationException("Only administrators can verify companies.")

        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        company.is_verified = not company.is_verified
        company.updated_by = current_user.id
        await session.flush()

        status = "verified" if company.is_verified else "unverified"
        await CompanyService._write_audit(
            session, current_user.id, "COMPANY_VERIFICATION_CHANGED",
            f"Company '{company.name}' {status} by admin {current_user.email}."
        )

        return {
            "success": True,
            "company_id": str(company.id),
            "is_verified": company.is_verified,
            "message": f"Company has been {status}."
        }

    # =========================================================================
    # Analytics
    # =========================================================================

    @staticmethod
    async def get_analytics(
        session: AsyncSession,
        company_id: uuid.UUID,
        current_user: User
    ) -> dict:
        """
        Generates comprehensive analytics for a company dashboard.
        Owner or Admin only.
        """
        company = await company_repo.get_by_id_with_details(session, company_id)
        if not company:
            raise ResourceNotFoundException("Company", str(company_id))

        await CompanyService._assert_owner_or_admin(session, company, current_user)

        active_internships = [i for i in company.internships if i.is_active and i.deleted_at is None]
        total_internships = len([i for i in company.internships if i.deleted_at is None])
        
        # Aggregate all application statuses across internships
        internship_ids = [i.id for i in company.internships if i.deleted_at is None]
        applications_by_status: Dict[str, int] = {}
        total_applications = 0
        avg_ats_score = None
        avg_simulation_score = None
        avg_interview_score = None
        top_internship = None

        if internship_ids:
            # Count total applications
            apps_stmt = select(Application).where(
                and_(
                    Application.vacancy_id.in_(internship_ids),
                    Application.deleted_at == None
                )
            )
            apps_result = await session.execute(apps_stmt)
            all_apps = list(apps_result.scalars().all())
            total_applications = len(all_apps)

            # Applications by status
            for app in all_apps:
                status_key = app.status.value
                applications_by_status[status_key] = applications_by_status.get(status_key, 0) + 1

            # Average scores from ApplicationMapping
            if all_apps:
                app_ids = [a.id for a in all_apps]
                mapping_stmt = select(ApplicationMapping).where(
                    ApplicationMapping.application_id.in_(app_ids)
                )
                mapping_result = await session.execute(mapping_stmt)
                mappings = list(mapping_result.scalars().all())

                ats_scores = [m.ats_score for m in mappings if m.ats_score is not None]
                sim_scores = [m.simulation_score for m in mappings if m.simulation_score is not None]
                interview_scores = [m.interview_answer_score_pct for m in mappings if m.interview_answer_score_pct is not None]

                avg_ats_score = round(sum(ats_scores) / len(ats_scores), 2) if ats_scores else None
                avg_simulation_score = round(sum(sim_scores) / len(sim_scores), 2) if sim_scores else None
                avg_interview_score = round(sum(interview_scores) / len(interview_scores), 2) if interview_scores else None

            # Top internship by application count
            counts = {}
            for app in all_apps:
                counts[app.vacancy_id] = counts.get(app.vacancy_id, 0) + 1
            if counts:
                top_id = max(counts, key=counts.get)
                top_internship_obj = next((i for i in company.internships if i.id == top_id), None)
                top_internship = top_internship_obj.title if top_internship_obj else None

        # Pipeline breakdown (simplified stages)
        pipeline_stages = ["APPLIED", "ATS_COMPLETED", "SIMULATION_COMPLETED", "INTERVIEW_COMPLETED", "SHORTLISTED"]
        pipeline_breakdown = {s: applications_by_status.get(s, 0) for s in pipeline_stages}

        return {
            "company_id": str(company.id),
            "company_name": company.name,
            "total_internships": total_internships,
            "active_internships": len(active_internships),
            "total_applications": total_applications,
            "applications_by_status": applications_by_status,
            "avg_ats_score": avg_ats_score,
            "avg_simulation_score": avg_simulation_score,
            "avg_interview_score": avg_interview_score,
            "top_internship": top_internship,
            "pipeline_breakdown": pipeline_breakdown,
        }
