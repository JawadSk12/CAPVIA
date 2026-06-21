"""
CAPVIA Phase 9 — Application Service
Core business logic: strict state machine, apply/withdraw/HR actions, analytics.
"""
import uuid
from datetime import datetime, date
from typing import List, Optional, Dict

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.models.models import (
    User, Internship, Application, ApplicationEvent,
    ApplicationStatus, Notification, UserRole, InternshipStatus
)
from capvia_platform.repositories.application_repository import (
    ApplicationRepository, ApplicationEventRepository
)
from capvia_platform.core.exceptions import (
    BaseAPIException, ResourceNotFoundException, AuthorizationException
)

app_repo = ApplicationRepository()
event_repo = ApplicationEventRepository()

# =========================================================================
# State Machine
# =========================================================================

# Terminal states — no further transitions allowed
TERMINAL_STATES = {
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
}

# Valid forward transitions (from → {allowed tos})
VALID_TRANSITIONS: Dict[ApplicationStatus, set] = {
    ApplicationStatus.APPLIED:                  {ApplicationStatus.ATS_PENDING,           ApplicationStatus.WITHDRAWN},
    ApplicationStatus.ATS_PENDING:              {ApplicationStatus.ATS_COMPLETED,          ApplicationStatus.WITHDRAWN},
    ApplicationStatus.ATS_COMPLETED:            {ApplicationStatus.SIMULATION_INVITED,     ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SIMULATION_INVITED:       {ApplicationStatus.SIMULATION_IN_PROGRESS, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SIMULATION_IN_PROGRESS:   {ApplicationStatus.SIMULATION_COMPLETED,   ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SIMULATION_COMPLETED:     {ApplicationStatus.INTERVIEW_INVITED,       ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.INTERVIEW_INVITED:        {ApplicationStatus.INTERVIEW_IN_PROGRESS,   ApplicationStatus.WITHDRAWN},
    ApplicationStatus.INTERVIEW_IN_PROGRESS:    {ApplicationStatus.INTERVIEW_COMPLETED,     ApplicationStatus.WITHDRAWN},
    ApplicationStatus.INTERVIEW_COMPLETED:      {ApplicationStatus.EVALUATED,               ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.EVALUATED:                {ApplicationStatus.SHORTLISTED,             ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.EVALUATED_LOCAL_BASELINE: {ApplicationStatus.SHORTLISTED,             ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SHORTLISTED:              {ApplicationStatus.HIRED,                   ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN},
    # Terminal states — empty sets
    ApplicationStatus.WITHDRAWN: set(),
    ApplicationStatus.REJECTED:  set(),
    ApplicationStatus.HIRED:     set(),
}

# Human-readable labels per status
STATUS_LABELS: Dict[str, str] = {
    "APPLIED":                  "Application Submitted",
    "ATS_PENDING":              "Resume Under Review",
    "ATS_COMPLETED":            "Resume Screened",
    "SIMULATION_INVITED":       "Simulation Invited",
    "SIMULATION_IN_PROGRESS":   "Simulation In Progress",
    "SIMULATION_COMPLETED":     "Simulation Completed",
    "INTERVIEW_INVITED":        "Interview Invited",
    "INTERVIEW_IN_PROGRESS":    "Interview In Progress",
    "INTERVIEW_COMPLETED":      "Interview Completed",
    "EVALUATED":                "Evaluation Complete",
    "EVALUATED_LOCAL_BASELINE": "Evaluated (Offline)",
    "SHORTLISTED":              "Shortlisted 🎉",
    "REJECTED":                 "Not Selected",
    "WITHDRAWN":                "Withdrawn",
    "HIRED":                    "Hired 🎊",
}

# Stage map for progress bar
STAGE_ORDER = [
    "APPLIED",
    "ATS_COMPLETED",
    "SIMULATION_COMPLETED",
    "INTERVIEW_COMPLETED",
    "EVALUATED",
    "SHORTLISTED",
    "HIRED",
]


class InvalidTransitionException(BaseAPIException):
    def __init__(self, from_s: str, to_s: str):
        super().__init__(
            message=f"Cannot transition from '{from_s}' to '{to_s}'. This transition is not allowed.",
            status_code=400,
            code="INVALID_TRANSITION",
            details={"from_status": from_s, "to_status": to_s},
        )


def assert_valid_transition(current: ApplicationStatus, target: ApplicationStatus) -> None:
    if current in TERMINAL_STATES:
        raise InvalidTransitionException(current.value, target.value)
    allowed = VALID_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidTransitionException(current.value, target.value)


# =========================================================================
# Serialisation helpers
# =========================================================================

def _serialize_event(e: ApplicationEvent) -> dict:
    return {
        "id": str(e.id),
        "event_type": e.event_type,
        "from_status": e.from_status,
        "to_status": e.to_status,
        "actor_name": e.actor.full_name if e.actor else None,
        "actor_role": e.actor_role,
        "metadata": e.event_metadata or {},
        "label": STATUS_LABELS.get(e.to_status or "", e.event_type),
        "created_at": e.created_at.isoformat(),
    }


def _serialize_application(
    app: Application, include_events: bool = False
) -> dict:
    vacancy = app.vacancy
    company = vacancy.company if vacancy else None
    mapping = app.application_mapping

    # Compute progress step index
    status_val = app.status.value if hasattr(app.status, "value") else str(app.status)
    progress_step = 0
    for idx, s in enumerate(STAGE_ORDER):
        if status_val in (s, s.replace("_COMPLETED", "_IN_PROGRESS"), s.replace("_COMPLETED", "_INVITED")):
            progress_step = idx
        if status_val == s:
            progress_step = idx

    data = {
        "id": str(app.id),
        "candidate_id": str(app.candidate_id),
        "vacancy_id": str(app.vacancy_id),
        "status": status_val,
        "status_label": STATUS_LABELS.get(status_val, status_val),
        "current_stage": app.current_stage.value if hasattr(app.current_stage, "value") else str(app.current_stage),
        "cover_letter": app.cover_letter,
        "resume_url": app.resume_url,
        "rejection_reason": app.rejection_reason,
        "withdrawn_at": app.withdrawn_at.isoformat() if app.withdrawn_at else None,
        "hired_at": app.hired_at.isoformat() if app.hired_at else None,
        "progress_step": progress_step,
        "progress_total": len(STAGE_ORDER),
        "is_terminal": app.status in TERMINAL_STATES,
        "created_at": app.created_at.isoformat(),
        "updated_at": app.updated_at.isoformat(),
        # Vacancy snapshot
        "vacancy_title": vacancy.title if vacancy else None,
        "company_name": company.name if company else None,
        "company_logo": company.logo_url if company else None,
        "vacancy_work_mode": vacancy.work_mode.value if vacancy and hasattr(vacancy.work_mode, "value") else None,
        "vacancy_location": vacancy.location if vacancy else None,
        # Scores
        "ats_score": float(mapping.ats_score) if mapping and mapping.ats_score is not None else None,
        "simulation_score": float(mapping.simulation_score) if mapping and mapping.simulation_score is not None else None,
        "interview_score": mapping.interview_answer_score_pct if mapping else None,
        "risk_level": mapping.combined_risk_level.value if mapping and hasattr(mapping.combined_risk_level, "value") else None,
    }
    if include_events:
        data["events"] = [_serialize_event(e) for e in (app.events or [])]
    return data


# =========================================================================
# ApplicationService
# =========================================================================

class ApplicationService:

    # ------------------------------------------------------------------
    # Notifications helper
    # ------------------------------------------------------------------
    @staticmethod
    async def _notify(session: AsyncSession, user_id, title: str, message: str) -> None:
        n = Notification(user_id=user_id, title=title, message=message)
        session.add(n)

    # ------------------------------------------------------------------
    # Apply
    # ------------------------------------------------------------------
    @staticmethod
    async def apply(
        session: AsyncSession,
        internship_id: uuid.UUID,
        current_user: User,
        cover_letter: Optional[str] = None,
        resume_url: Optional[str] = None,
    ) -> dict:
        """Candidate applies to a published internship."""
        if current_user.role not in (UserRole.STUDENT, UserRole.ADMIN):
            raise AuthorizationException("Only candidates can apply for internships.")

        from sqlalchemy.orm import selectinload
        stmt = (
            select(Internship)
            .where(Internship.id == internship_id)
            .options(selectinload(Internship.company))
        )
        res = await session.execute(stmt)
        internship = res.scalar_one_or_none()
        if not internship or internship.deleted_at:
            raise ResourceNotFoundException("Internship", str(internship_id))

        if internship.status != InternshipStatus.PUBLISHED:
            raise BaseAPIException("This internship is not accepting applications.", status_code=400)

        if internship.application_deadline and internship.application_deadline < date.today():
            raise BaseAPIException("The application deadline for this internship has passed.", status_code=400)

        # Duplicate guard
        dup = await app_repo.find_duplicate(session, current_user.id, internship_id)
        if dup:
            raise BaseAPIException(
                "You have already applied to this internship.",
                status_code=409, code="DUPLICATE_APPLICATION",
                details={"existing_application_id": str(dup.id)},
            )

        # Application limit guard
        if internship.application_limit:
            count_stmt = select(func.count()).select_from(
                select(Application)
                .where(and_(Application.vacancy_id == internship_id, Application.deleted_at == None))
                .subquery()
            )
            count_result = await session.execute(count_stmt)
            current_count = count_result.scalar_one()
            if current_count >= internship.application_limit:
                raise BaseAPIException("This internship has reached its maximum application limit.", status_code=400)

        # Create application
        application = Application(
            candidate_id=current_user.id,
            vacancy_id=internship_id,
            status=ApplicationStatus.APPLIED,
            cover_letter=cover_letter,
            resume_url=resume_url,
        )
        session.add(application)
        await session.flush()

        # Write opening event
        await event_repo.create_event(
            session,
            application_id=application.id,
            event_type="APPLICATION_SUBMITTED",
            from_status=None,
            to_status="APPLIED",
            actor_id=current_user.id,
            actor_role=current_user.role.value,
            metadata={"internship_title": internship.title, "company_id": str(internship.company_id)},
        )

        # Notify candidate
        await ApplicationService._notify(
            session, current_user.id,
            "Application Submitted ✅",
            f"Your application for '{internship.title}' has been submitted successfully.",
        )

        # Eagerly attach vacancy and set mapping in memory for serialisation
        application.vacancy = internship
        from sqlalchemy.orm.attributes import set_committed_value
        set_committed_value(application, "application_mapping", None)

        # Trigger background ATS processing task asynchronously
        import asyncio
        from capvia_platform.tasks.ats_tasks import process_ats_stage
        asyncio.create_task(process_ats_stage(application.id))

        return _serialize_application(application)

    # ------------------------------------------------------------------
    # Get Detail
    # ------------------------------------------------------------------
    @staticmethod
    async def get_detail(
        session: AsyncSession, application_id: uuid.UUID, current_user: User
    ) -> dict:
        app = await app_repo.get_by_id_full(session, application_id)
        if not app:
            raise ResourceNotFoundException("Application", str(application_id))

        # Candidates can only see own; HR/admin see all
        if current_user.role == UserRole.STUDENT and app.candidate_id != current_user.id:
            raise AuthorizationException("You can only view your own applications.")

        # Increment view counter not needed for applications; just return
        return _serialize_application(app, include_events=True)

    # ------------------------------------------------------------------
    # List — Candidate view
    # ------------------------------------------------------------------
    @staticmethod
    async def list_my_applications(
        session: AsyncSession,
        current_user: User,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
    ) -> dict:
        applications, total = await app_repo.get_candidate_applications(
            session, current_user.id, page=page, per_page=per_page, status=status
        )
        return {
            "applications": [_serialize_application(a) for a in applications],
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    # ------------------------------------------------------------------
    # List — HR/Admin view (for an internship)
    # ------------------------------------------------------------------
    @staticmethod
    async def list_for_internship(
        session: AsyncSession,
        internship_id: uuid.UUID,
        current_user: User,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
    ) -> dict:
        internship = await session.get(Internship, internship_id)
        if not internship or internship.deleted_at:
            raise ResourceNotFoundException("Internship", str(internship_id))

        if current_user.role not in (UserRole.HR, UserRole.ADMIN):
            raise AuthorizationException("Only HR or admin can view all applicants.")

        applications, total = await app_repo.get_internship_applications(
            session, internship_id, page=page, per_page=per_page,
            status=status, sort_by=sort_by, sort_dir=sort_dir,
        )
        return {
            "applications": [_serialize_application(a) for a in applications],
            "total": total,
            "page": page,
            "per_page": per_page,
            "internship_title": internship.title,
        }

    # ------------------------------------------------------------------
    # Withdraw
    # ------------------------------------------------------------------
    @staticmethod
    async def withdraw(
        session: AsyncSession, application_id: uuid.UUID, current_user: User
    ) -> dict:
        app = await app_repo.get_by_id_full(session, application_id)
        if not app:
            raise ResourceNotFoundException("Application", str(application_id))

        if current_user.role == UserRole.STUDENT and app.candidate_id != current_user.id:
            raise AuthorizationException("You can only withdraw your own applications.")

        assert_valid_transition(app.status, ApplicationStatus.WITHDRAWN)

        old_status = app.status.value
        app.status = ApplicationStatus.WITHDRAWN
        app.withdrawn_at = datetime.utcnow()
        await session.flush()

        await event_repo.create_event(
            session, application_id=app.id,
            event_type="APPLICATION_WITHDRAWN",
            from_status=old_status, to_status="WITHDRAWN",
            actor_id=current_user.id, actor_role=current_user.role.value,
        )

        await ApplicationService._notify(
            session, app.candidate_id,
            "Application Withdrawn",
            f"You have withdrawn your application for '{app.vacancy.title if app.vacancy else 'the role'}'.",
        )

        return _serialize_application(app, include_events=True)

    # ------------------------------------------------------------------
    # Internal: Generic status transition (system/HR)
    # ------------------------------------------------------------------
    @staticmethod
    async def _do_transition(
        session: AsyncSession,
        application_id: uuid.UUID,
        target: ApplicationStatus,
        event_type: str,
        actor: User,
        metadata: Optional[dict] = None,
        notify_candidate: bool = True,
        notify_title: Optional[str] = None,
        notify_msg: Optional[str] = None,
        extra_fields: Optional[dict] = None,
    ) -> dict:
        app = await app_repo.get_by_id_full(session, application_id)
        if not app:
            raise ResourceNotFoundException("Application", str(application_id))

        assert_valid_transition(app.status, target)

        old_status = app.status.value
        app.status = target

        if extra_fields:
            for k, v in extra_fields.items():
                setattr(app, k, v)

        await session.flush()

        await event_repo.create_event(
            session, application_id=app.id,
            event_type=event_type,
            from_status=old_status, to_status=target.value,
            actor_id=actor.id, actor_role=actor.role.value,
            metadata=metadata or {},
        )

        if notify_candidate and notify_title and notify_msg:
            await ApplicationService._notify(session, app.candidate_id, notify_title, notify_msg)

        return _serialize_application(app, include_events=True)

    # ------------------------------------------------------------------
    # HR Actions
    # ------------------------------------------------------------------
    @staticmethod
    async def shortlist(session, application_id, current_user) -> dict:
        if current_user.role not in (UserRole.HR, UserRole.ADMIN):
            raise AuthorizationException("Only HR or admin can shortlist candidates.")
        return await ApplicationService._do_transition(
            session, application_id, ApplicationStatus.SHORTLISTED,
            event_type="CANDIDATE_SHORTLISTED", actor=current_user,
            notify_title="You're Shortlisted! 🎉",
            notify_msg="Congratulations! You have been shortlisted for the next stage. We will contact you soon.",
        )

    @staticmethod
    async def reject(
        session, application_id, current_user, reason: Optional[str] = None
    ) -> dict:
        if current_user.role not in (UserRole.HR, UserRole.ADMIN):
            raise AuthorizationException("Only HR or admin can reject candidates.")
        return await ApplicationService._do_transition(
            session, application_id, ApplicationStatus.REJECTED,
            event_type="CANDIDATE_REJECTED", actor=current_user,
            extra_fields={"rejection_reason": reason} if reason else None,
            notify_title="Application Update",
            notify_msg="After careful review, we have decided not to move forward with your application at this time. Thank you for your interest.",
        )

    @staticmethod
    async def hire(session, application_id, current_user) -> dict:
        if current_user.role not in (UserRole.HR, UserRole.ADMIN):
            raise AuthorizationException("Only HR or admin can mark a candidate as hired.")
        return await ApplicationService._do_transition(
            session, application_id, ApplicationStatus.HIRED,
            event_type="CANDIDATE_HIRED", actor=current_user,
            extra_fields={"hired_at": datetime.utcnow()},
            notify_title="You're Hired! 🎊",
            notify_msg="Congratulations! You have been selected. Please check your email for the official offer letter.",
        )

    @staticmethod
    async def update_status(
        session, application_id, current_user, new_status: str, metadata: Optional[dict] = None
    ) -> dict:
        """Generic system/admin status update (used by ATS/Simulation/Interview webhooks)."""
        if current_user.role not in (UserRole.HR, UserRole.ADMIN):
            raise AuthorizationException("Only HR or admin can update application status directly.")

        try:
            target = ApplicationStatus(new_status)
        except ValueError:
            raise BaseAPIException(f"'{new_status}' is not a valid application status.", status_code=400)

        return await ApplicationService._do_transition(
            session, application_id, target,
            event_type=f"STATUS_UPDATED_{new_status}",
            actor=current_user, metadata=metadata,
        )

    # ------------------------------------------------------------------
    # Timeline
    # ------------------------------------------------------------------
    @staticmethod
    async def get_timeline(
        session: AsyncSession, application_id: uuid.UUID, current_user: User
    ) -> dict:
        app = await session.get(Application, application_id)
        if not app or app.deleted_at:
            raise ResourceNotFoundException("Application", str(application_id))

        if current_user.role == UserRole.STUDENT and app.candidate_id != current_user.id:
            raise AuthorizationException("You can only view your own application timeline.")

        events = await event_repo.get_timeline(session, application_id)
        return {
            "application_id": str(application_id),
            "events": [_serialize_event(e) for e in events],
        }

    # ------------------------------------------------------------------
    # Dashboard (candidate)
    # ------------------------------------------------------------------
    @staticmethod
    async def get_dashboard(session: AsyncSession, current_user: User) -> dict:
        counts = await app_repo.get_candidate_status_counts(session, current_user.id)

        # Latest 5 applications
        apps, total = await app_repo.get_candidate_applications(
            session, current_user.id, page=1, per_page=5
        )

        terminal = sum(
            counts.get(s, 0) for s in ("WITHDRAWN", "HIRED", "REJECTED")
        )
        active = total - terminal

        return {
            "total_applications": total,
            "active_applications": active,
            "status_breakdown": counts,
            "hired_count": counts.get("HIRED", 0),
            "shortlisted_count": counts.get("SHORTLISTED", 0),
            "rejected_count": counts.get("REJECTED", 0),
            "withdrawn_count": counts.get("WITHDRAWN", 0),
            "recent_applications": [_serialize_application(a) for a in apps],
        }

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------
    @staticmethod
    async def get_notifications(
        session: AsyncSession,
        current_user: User,
        page: int = 1,
        per_page: int = 30,
        unread_only: bool = False,
    ) -> dict:
        from sqlalchemy import desc
        base = (
            select(Notification)
            .where(Notification.user_id == current_user.id)
        )
        if unread_only:
            base = base.where(Notification.is_read == False)

        count_result = await session.execute(select(func.count()).select_from(base.subquery()))
        total = count_result.scalar_one()
        unread_count_result = await session.execute(
            select(func.count()).select_from(
                select(Notification)
                .where(and_(Notification.user_id == current_user.id, Notification.is_read == False))
                .subquery()
            )
        )
        unread_count = unread_count_result.scalar_one()

        stmt = base.order_by(desc(Notification.created_at)).offset((page - 1) * per_page).limit(per_page)
        rows = await session.execute(stmt)
        notifications = rows.scalars().all()

        return {
            "notifications": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "message": n.message,
                    "is_read": n.is_read,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notifications
            ],
            "total": total,
            "unread_count": unread_count,
            "page": page,
            "per_page": per_page,
        }

    @staticmethod
    async def mark_notification_read(
        session: AsyncSession, notification_id: uuid.UUID, current_user: User
    ) -> dict:
        n = await session.get(Notification, notification_id)
        if not n:
            raise ResourceNotFoundException("Notification", str(notification_id))
        if n.user_id != current_user.id:
            raise AuthorizationException("Cannot modify another user's notification.")

        n.is_read = True
        n.read_at = datetime.utcnow()
        await session.flush()
        return {"success": True, "notification_id": str(notification_id)}

    @staticmethod
    async def mark_all_notifications_read(
        session: AsyncSession, current_user: User
    ) -> dict:
        from sqlalchemy import update as sa_update
        stmt = (
            sa_update(Notification)
            .where(and_(Notification.user_id == current_user.id, Notification.is_read == False))
            .values(is_read=True, read_at=datetime.utcnow())
        )
        result = await session.execute(stmt)
        return {"success": True, "marked_count": result.rowcount}
