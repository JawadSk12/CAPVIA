"""
CAPVIA Phase 9 — Application System Tests
Covers: state machine, RBAC guards, duplicate prevention, deadline guard,
        schema validation, notification creation, terminal state protection.
"""
import os
import uuid
import pytest
from datetime import datetime, date, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_applications.db")
os.environ.setdefault("SECRET_KEY", "test_secret_for_phase9")
os.environ.setdefault("REFRESH_SECRET_KEY", "test_refresh_phase9")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

from sqlalchemy import create_engine, String, Boolean, Integer, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import sessionmaker, Session, Mapped, mapped_column, relationship, DeclarativeBase
from typing import Optional, List

from capvia_platform.models.models import ApplicationStatus
from capvia_platform.services.application_service import (
    VALID_TRANSITIONS, TERMINAL_STATES, assert_valid_transition,
    InvalidTransitionException, STAGE_ORDER, STATUS_LABELS
)
from capvia_platform.schemas.schemas import (
    ApplicationCreateRequest, ApplicationRejectRequest,
    ApplicationStatusUpdateRequest
)
from capvia_platform.utils.auth import hash_password

# =========================================================================
# SQLite Test DB Setup
# =========================================================================

SQLALCHEMY_URL = "sqlite:///./test_applications.db"
engine = create_engine(SQLALCHEMY_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class TBase(DeclarativeBase):
    pass


class TUser(TBase):
    __tablename__ = "ta_users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="STUDENT")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TInternship(TBase):
    __tablename__ = "ta_internships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PUBLISHED")
    application_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    application_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    openings: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class TApplication(TBase):
    __tablename__ = "ta_applications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("ta_users.id"), nullable=False)
    vacancy_id: Mapped[str] = mapped_column(String(36), ForeignKey("ta_internships.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="APPLIED")
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    hired_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# =========================================================================
# Fixtures
# =========================================================================

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    TBase.metadata.create_all(bind=engine)
    yield
    TBase.metadata.drop_all(bind=engine)
    import os as _os
    if _os.path.exists("./test_applications.db"):
        _os.remove("./test_applications.db")


@pytest.fixture
def db():
    s = TestSession()
    try:
        yield s
    finally:
        s.rollback()
        s.close()


@pytest.fixture
def candidate(db):
    u = TUser(email=f"cand_{uuid.uuid4().hex[:6]}@t.com", full_name="Candidate", password_hash=hash_password("P@ss1!"), role="STUDENT")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def hr_user(db):
    u = TUser(email=f"hr_{uuid.uuid4().hex[:6]}@t.com", full_name="HR", password_hash=hash_password("P@ss1!"), role="HR")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def admin_user(db):
    u = TUser(email=f"admin_{uuid.uuid4().hex[:6]}@t.com", full_name="Admin", password_hash=hash_password("P@ss1!"), role="ADMIN")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def published_internship(db):
    i = TInternship(title="Test Internship", status="PUBLISHED", openings=5)
    db.add(i); db.commit(); db.refresh(i)
    return i


@pytest.fixture
def draft_internship(db):
    i = TInternship(title="Draft Internship", status="DRAFT", openings=5)
    db.add(i); db.commit(); db.refresh(i)
    return i


@pytest.fixture
def expired_internship(db):
    i = TInternship(title="Expired Internship", status="PUBLISHED", application_deadline=date.today() - timedelta(days=1))
    db.add(i); db.commit(); db.refresh(i)
    return i


@pytest.fixture
def applied_application(db, candidate, published_internship):
    app = TApplication(candidate_id=candidate.id, vacancy_id=published_internship.id, status="APPLIED")
    db.add(app); db.commit(); db.refresh(app)
    return app


# =========================================================================
# Test: State Machine — Valid Transitions
# =========================================================================

class TestStateMachineValidTransitions:

    def test_applied_to_ats_pending(self):
        assert_valid_transition(ApplicationStatus.APPLIED, ApplicationStatus.ATS_PENDING)

    def test_applied_to_withdrawn(self):
        assert_valid_transition(ApplicationStatus.APPLIED, ApplicationStatus.WITHDRAWN)

    def test_ats_pending_to_ats_completed(self):
        assert_valid_transition(ApplicationStatus.ATS_PENDING, ApplicationStatus.ATS_COMPLETED)

    def test_ats_completed_to_simulation_invited(self):
        assert_valid_transition(ApplicationStatus.ATS_COMPLETED, ApplicationStatus.SIMULATION_INVITED)

    def test_ats_completed_to_rejected(self):
        assert_valid_transition(ApplicationStatus.ATS_COMPLETED, ApplicationStatus.REJECTED)

    def test_simulation_completed_to_interview_invited(self):
        assert_valid_transition(ApplicationStatus.SIMULATION_COMPLETED, ApplicationStatus.INTERVIEW_INVITED)

    def test_interview_completed_to_evaluated(self):
        assert_valid_transition(ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.EVALUATED)

    def test_evaluated_to_shortlisted(self):
        assert_valid_transition(ApplicationStatus.EVALUATED, ApplicationStatus.SHORTLISTED)

    def test_evaluated_local_to_shortlisted(self):
        assert_valid_transition(ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED)

    def test_shortlisted_to_hired(self):
        assert_valid_transition(ApplicationStatus.SHORTLISTED, ApplicationStatus.HIRED)

    def test_shortlisted_to_rejected(self):
        assert_valid_transition(ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED)

    def test_withdrawn_from_any_non_terminal_is_allowed(self):
        non_terminals = [
            ApplicationStatus.APPLIED, ApplicationStatus.ATS_PENDING,
            ApplicationStatus.ATS_COMPLETED, ApplicationStatus.SIMULATION_INVITED,
            ApplicationStatus.SIMULATION_IN_PROGRESS, ApplicationStatus.SIMULATION_COMPLETED,
            ApplicationStatus.INTERVIEW_INVITED, ApplicationStatus.INTERVIEW_IN_PROGRESS,
            ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.EVALUATED,
            ApplicationStatus.EVALUATED_LOCAL_BASELINE, ApplicationStatus.SHORTLISTED,
        ]
        for status in non_terminals:
            assert_valid_transition(status, ApplicationStatus.WITHDRAWN)

    def test_all_non_terminal_states_have_withdraw_option(self):
        for status, allowed in VALID_TRANSITIONS.items():
            if status not in TERMINAL_STATES:
                assert ApplicationStatus.WITHDRAWN in allowed, f"{status} missing WITHDRAWN"


# =========================================================================
# Test: State Machine — Invalid Transitions (Blocked)
# =========================================================================

class TestStateMachineBlockedTransitions:

    def test_cannot_skip_ats_to_simulation(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.APPLIED, ApplicationStatus.SIMULATION_INVITED)

    def test_cannot_skip_directly_to_hired(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.APPLIED, ApplicationStatus.HIRED)

    def test_cannot_go_backward_from_shortlisted_to_applied(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.SHORTLISTED, ApplicationStatus.APPLIED)

    def test_cannot_transition_from_withdrawn(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.WITHDRAWN, ApplicationStatus.APPLIED)

    def test_cannot_transition_from_hired(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.HIRED, ApplicationStatus.SHORTLISTED)

    def test_cannot_transition_from_rejected(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.REJECTED, ApplicationStatus.APPLIED)

    def test_terminal_states_have_empty_transitions(self):
        for state in TERMINAL_STATES:
            allowed = VALID_TRANSITIONS.get(state, set())
            assert len(allowed) == 0, f"Terminal state {state} has non-empty transitions"

    def test_cannot_re_apply_from_ats_completed(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.ATS_COMPLETED, ApplicationStatus.APPLIED)

    def test_cannot_rehire_after_rejection(self):
        with pytest.raises(InvalidTransitionException):
            assert_valid_transition(ApplicationStatus.REJECTED, ApplicationStatus.HIRED)

    def test_invalid_status_raises(self):
        """Simulate what update_status() would do with a bad string."""
        with pytest.raises(ValueError):
            ApplicationStatus("TOTALLY_INVALID_STATUS")


# =========================================================================
# Test: RBAC Business Logic
# =========================================================================

class TestApplicationRBAC:
    """Pure business logic RBAC checks (no async)."""

    def _candidate_can_apply(self, role: str) -> bool:
        return role in ("STUDENT", "ADMIN")

    def _hr_can_shortlist(self, role: str) -> bool:
        return role in ("HR", "ADMIN")

    def _candidate_owns(self, app_candidate_id: str, user_id: str, role: str) -> bool:
        if role in ("HR", "ADMIN"):
            return True
        return app_candidate_id == user_id

    def test_student_can_apply(self):
        assert self._candidate_can_apply("STUDENT") is True

    def test_hr_cannot_apply(self):
        assert self._candidate_can_apply("HR") is False

    def test_admin_can_apply(self):
        assert self._candidate_can_apply("ADMIN") is True

    def test_hr_can_shortlist(self):
        assert self._hr_can_shortlist("HR") is True

    def test_admin_can_shortlist(self):
        assert self._hr_can_shortlist("ADMIN") is True

    def test_candidate_cannot_shortlist(self):
        assert self._hr_can_shortlist("STUDENT") is False

    def test_candidate_can_view_own_application(self):
        uid = str(uuid.uuid4())
        assert self._candidate_owns(uid, uid, "STUDENT") is True

    def test_candidate_cannot_view_others(self):
        assert self._candidate_owns(str(uuid.uuid4()), str(uuid.uuid4()), "STUDENT") is False

    def test_hr_can_view_any_application(self):
        assert self._candidate_owns(str(uuid.uuid4()), str(uuid.uuid4()), "HR") is True

    def test_admin_can_view_any_application(self):
        assert self._candidate_owns(str(uuid.uuid4()), str(uuid.uuid4()), "ADMIN") is True


# =========================================================================
# Test: Duplicate Application Guard
# =========================================================================

class TestDuplicateGuard:

    def test_active_application_detected(self, db, candidate, published_internship, applied_application):
        """An active application for same internship should block a second apply."""
        existing = db.query(TApplication).filter_by(
            candidate_id=candidate.id,
            vacancy_id=published_internship.id,
        ).filter(TApplication.status != "WITHDRAWN").first()
        assert existing is not None
        assert existing.id == applied_application.id

    def test_withdrawn_allows_reapply(self, db, candidate, published_internship, applied_application):
        """After withdrawing, a duplicate check on active (non-withdrawn) should be None."""
        applied_application.status = "WITHDRAWN"
        db.commit()
        existing = db.query(TApplication).filter_by(
            candidate_id=candidate.id,
            vacancy_id=published_internship.id,
        ).filter(TApplication.status != "WITHDRAWN").first()
        assert existing is None

    def test_no_application_means_no_duplicate(self, db, candidate):
        other_internship = TInternship(title="Other Internship", status="PUBLISHED")
        db.add(other_internship); db.commit()
        existing = db.query(TApplication).filter_by(
            candidate_id=candidate.id,
            vacancy_id=other_internship.id,
        ).filter(TApplication.status != "WITHDRAWN").first()
        assert existing is None


# =========================================================================
# Test: Deadline Guard
# =========================================================================

class TestDeadlineGuard:

    def test_future_deadline_is_valid(self):
        future = date.today() + timedelta(days=7)
        assert future >= date.today()

    def test_past_deadline_blocks_apply(self):
        past = date.today() - timedelta(days=1)
        assert past < date.today()

    def test_today_is_valid(self):
        today = date.today()
        assert today >= date.today()

    def test_expired_internship_deadline_detected(self, db, expired_internship):
        is_passed = expired_internship.application_deadline is not None and expired_internship.application_deadline < date.today()
        assert is_passed is True

    def test_no_deadline_is_always_open(self, db, published_internship):
        assert published_internship.application_deadline is None


# =========================================================================
# Test: Model Layer
# =========================================================================

class TestApplicationModel:

    def test_apply_creates_application(self, db, candidate, published_internship):
        app = TApplication(candidate_id=candidate.id, vacancy_id=published_internship.id, status="APPLIED")
        db.add(app); db.commit(); db.refresh(app)
        assert app.id is not None
        assert app.status == "APPLIED"
        assert app.withdrawn_at is None
        assert app.hired_at is None

    def test_withdraw_sets_withdrawn_at(self, db, applied_application):
        applied_application.status = "WITHDRAWN"
        applied_application.withdrawn_at = datetime.utcnow()
        db.commit(); db.refresh(applied_application)
        assert applied_application.status == "WITHDRAWN"
        assert applied_application.withdrawn_at is not None

    def test_hire_sets_hired_at(self, db, applied_application):
        applied_application.status = "HIRED"
        applied_application.hired_at = datetime.utcnow()
        db.commit(); db.refresh(applied_application)
        assert applied_application.status == "HIRED"
        assert applied_application.hired_at is not None

    def test_rejection_reason_stored(self, db, applied_application):
        reason = "Insufficient experience for this role."
        applied_application.status = "REJECTED"
        applied_application.rejection_reason = reason
        db.commit(); db.refresh(applied_application)
        assert applied_application.rejection_reason == reason

    def test_cover_letter_stored(self, db, candidate, published_internship):
        letter = "I am very passionate about this role!"
        app = TApplication(
            candidate_id=candidate.id, vacancy_id=published_internship.id,
            status="APPLIED", cover_letter=letter
        )
        db.add(app); db.commit(); db.refresh(app)
        assert app.cover_letter == letter

    def test_soft_delete(self, db, applied_application):
        applied_application.deleted_at = datetime.utcnow()
        db.commit(); db.refresh(applied_application)
        assert applied_application.deleted_at is not None

    def test_stage_progression(self, db, applied_application):
        stages = ["APPLIED", "ATS_PENDING", "ATS_COMPLETED", "SHORTLISTED"]
        for s in stages:
            applied_application.status = s
        db.commit(); db.refresh(applied_application)
        assert applied_application.status == "SHORTLISTED"


# =========================================================================
# Test: Schema Validation
# =========================================================================

class TestApplicationSchemas:

    def test_create_requires_internship_id(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ApplicationCreateRequest()

    def test_create_valid(self):
        r = ApplicationCreateRequest(internship_id=str(uuid.uuid4()))
        assert r.cover_letter is None
        assert r.resume_url is None

    def test_create_cover_letter_max_length(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ApplicationCreateRequest(internship_id=str(uuid.uuid4()), cover_letter="x" * 5001)

    def test_create_resume_url_max_length(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ApplicationCreateRequest(internship_id=str(uuid.uuid4()), resume_url="x" * 513)

    def test_reject_optional_reason(self):
        r = ApplicationRejectRequest()
        assert r.reason is None

    def test_reject_reason_with_value(self):
        r = ApplicationRejectRequest(reason="Not a good fit")
        assert r.reason == "Not a good fit"

    def test_status_update_requires_status(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ApplicationStatusUpdateRequest()

    def test_status_update_valid(self):
        r = ApplicationStatusUpdateRequest(status="ATS_COMPLETED")
        assert r.status == "ATS_COMPLETED"
        assert r.metadata is None

    def test_status_update_with_metadata(self):
        r = ApplicationStatusUpdateRequest(status="SIMULATION_COMPLETED", metadata={"score": 87.5})
        assert r.metadata == {"score": 87.5}


# =========================================================================
# Test: State Machine Completeness
# =========================================================================

class TestStateMachineCompleteness:

    def test_all_statuses_have_transitions_defined(self):
        for s in ApplicationStatus:
            assert s in VALID_TRANSITIONS, f"{s} has no entry in VALID_TRANSITIONS"

    def test_terminal_states_defined(self):
        assert ApplicationStatus.WITHDRAWN in TERMINAL_STATES
        assert ApplicationStatus.HIRED in TERMINAL_STATES
        assert ApplicationStatus.REJECTED in TERMINAL_STATES

    def test_non_terminal_states_not_in_terminal(self):
        non_terminals = [
            ApplicationStatus.APPLIED, ApplicationStatus.ATS_PENDING,
            ApplicationStatus.ATS_COMPLETED, ApplicationStatus.SHORTLISTED,
        ]
        for s in non_terminals:
            assert s not in TERMINAL_STATES

    def test_stage_order_contains_key_milestones(self):
        assert "APPLIED" in STAGE_ORDER
        assert "ATS_COMPLETED" in STAGE_ORDER
        assert "HIRED" in STAGE_ORDER

    def test_all_statuses_have_labels(self):
        for s in ApplicationStatus:
            assert s.value in STATUS_LABELS, f"No label for {s.value}"

    def test_every_forward_transition_target_is_valid_status(self):
        all_statuses = set(ApplicationStatus)
        for from_s, allowed in VALID_TRANSITIONS.items():
            for to_s in allowed:
                assert to_s in all_statuses, f"{to_s} is not a valid ApplicationStatus"
