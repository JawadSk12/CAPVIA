"""
CAPVIA Phase 7 — Companies Router
All 12 company management endpoints.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db, get_current_user, RoleChecker
from capvia_platform.schemas.schemas import (
    CompanyCreateRequest, CompanyUpdateRequest,
    CompanyResponse, CompanyListResponse,
    CompanyAnalyticsResponse, CompanyMemberResponse,
    AddMemberRequest, TransferOwnershipRequest
)
from capvia_platform.models.models import User
from capvia_platform.services.company_service import CompanyService

router = APIRouter(prefix="/companies", tags=["Companies"])

# =========================================================================
# Public / Authenticated Read Endpoints
# =========================================================================

@router.get("", summary="List all companies (paginated)")
async def list_companies(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Filter companies by name"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Returns a paginated list of all active companies. Authenticated users only.
    Supports optional name search filtering.
    """
    return await CompanyService.list_companies(db, page=page, per_page=per_page, search=search)


@router.get("/mine", summary="List my companies")
async def list_my_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns companies where the authenticated HR/Admin user is an owner or member.
    """
    return await CompanyService.list_my_companies(db, current_user)


@router.get("/{company_id}", summary="Get company profile")
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Returns the full public profile for a company including member count and internship count.
    """
    return await CompanyService.get_company(db, company_id)


# =========================================================================
# HR / Admin Write Endpoints
# =========================================================================

@router.post("", summary="Create a new company")
async def create_company(
    payload: CompanyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hr", "admin"]))
):
    """
    Creates a new company. Only HR or Admin users can create companies.
    The creator is automatically assigned as the company OWNER.
    """
    return await CompanyService.create_company(db, payload, current_user)


@router.put("/{company_id}", summary="Update company details")
async def update_company(
    company_id: uuid.UUID,
    payload: CompanyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates company details. Only the company OWNER or an ADMIN can update.
    Accepts partial payloads — only specified fields are updated.
    """
    return await CompanyService.update_company(db, company_id, payload, current_user)


@router.delete("/{company_id}", summary="Delete a company")
async def delete_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft-deletes a company and all its internships.
    Only the company OWNER or an ADMIN can delete.
    """
    return await CompanyService.delete_company(db, company_id, current_user)


# =========================================================================
# Analytics
# =========================================================================

@router.get("/{company_id}/analytics", summary="Company dashboard analytics")
async def get_analytics(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns comprehensive analytics for the company:
    internship counts, application pipeline breakdown, average scores.
    Owner or Admin only.
    """
    return await CompanyService.get_analytics(db, company_id, current_user)


# =========================================================================
# Team Management
# =========================================================================

@router.get("/{company_id}/members", summary="List company team members")
async def get_members(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all team members of the company with their roles.
    Owner or Admin only.
    """
    return await CompanyService.get_members(db, company_id, current_user)


@router.post("/{company_id}/members", summary="Add a team member")
async def add_member(
    company_id: uuid.UUID,
    payload: AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Adds an HR or Admin user as a company team member.
    Only OWNER or ADMIN can add members. Role must be 'OWNER' or 'MEMBER'.
    """
    return await CompanyService.add_member(
        db, company_id, uuid.UUID(payload.user_id), payload.member_role, current_user
    )


@router.delete("/{company_id}/members/{user_id}", summary="Remove a team member")
async def remove_member(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Removes a user from the company's team. OWNER or ADMIN only.
    Cannot remove the last owner — transfer ownership first.
    """
    return await CompanyService.remove_member(db, company_id, user_id, current_user)


# =========================================================================
# Ownership & Verification
# =========================================================================

@router.post("/{company_id}/transfer-ownership", summary="Transfer company ownership")
async def transfer_ownership(
    company_id: uuid.UUID,
    payload: TransferOwnershipRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Transfers ownership of the company to another existing team member.
    Only the current OWNER can perform this action.
    The previous owner is demoted to MEMBER.
    """
    return await CompanyService.transfer_ownership(
        db, company_id, uuid.UUID(payload.new_owner_id), current_user
    )


@router.post("/{company_id}/verify", summary="Toggle company verification (Admin only)")
async def verify_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"]))
):
    """
    Toggles the is_verified badge on the company profile.
    Admin only.
    """
    return await CompanyService.verify_company(db, company_id, current_user)
