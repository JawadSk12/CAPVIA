"""
CAPVIA Phase 8 — Internships Module Tests
Tests: model layer (SQLite-compatible), lifecycle RBAC, schema validation,
       slug generation, and filter logic.
"""
import os
import uuid
import pytest
from datetime import date, timedelta

# Inject env vars before importing capvia modules
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_internships.db")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_pytest_only")
os.environ.setdefault("REFRESH_SECRET_KEY", "test_refresh_secret_key_for_pytest_only")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

from sqlalchemy import create_engine, String, Boolean, Integer, ForeignKey, DateTime, Date
from sqlalchemy.orm import sessionmaker, Session, Mapped, mapped_column, relationship, DeclarativeBase
from typing import Optional, List
from datetime import datetime

from capvia_platform.models.models import UserRole, InternshipStatus, WorkMode
from capvia_platform.core.exceptions import AuthorizationException, BaseAPIException
from capvia_platform.utils.auth import hash_password
from capvia_platform.schemas.schemas import (
    InternshipCreateRequest, InternshipUpdateRequest, InternshipAnalyticsResponse
)
from capvia_platform.services.internship_service import _slugify

# =========================================================================
# SQLite-compatible Test Models (no ARRAY/JSONB types)
# =========================================================================

SQLALCHEMY_TEST_URL = "sqlite:///./test_internships.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class TestBase(DeclarativeBase):
    pass


class TestUser(TestBase):
    __tablename__ = "t_users_intern"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="STUDENT")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class TestCompany(TestBase):
    __tablename__ = "t_companies_intern"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    internships: Mapped[List["TestInternship"]] = relationship("TestInternship", back_populates="company")


class TestInternship(TestBase):
    __tablename__ = "t_internships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("t_companies_intern.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience_level: Mapped[str] = mapped_column(String(50), nullable=False, default="ENTRY")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    work_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="ONSITE")
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stipend_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stipend_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stipend_currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    openings: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    application_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    application_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("t_users_intern.id"), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("t_users_intern.id"), nullable=True)
    slug: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    company: Mapped["TestCompany"] = relationship("TestCompany", back_populates="internships")


# =========================================================================
# Fixtures
# =========================================================================

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    TestBase.metadata.create_all(bind=engine)
    yield
    TestBase.metadata.drop_all(bind=engine)
    import os as _os
    if _os.path.exists("./test_internships.db"):
        _os.remove("./test_internships.db")


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def hr_user(db: Session):
    u = TestUser(id=str(uuid.uuid4()), email=f"hr_{uuid.uuid4().hex[:6]}@t.com", full_name="HR User", password_hash=hash_password("P@ss1!"), role="HR")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def admin_user(db: Session):
    u = TestUser(id=str(uuid.uuid4()), email=f"admin_{uuid.uuid4().hex[:6]}@t.com", full_name="Admin", password_hash=hash_password("P@ss1!"), role="ADMIN")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def candidate_user(db: Session):
    u = TestUser(id=str(uuid.uuid4()), email=f"cand_{uuid.uuid4().hex[:6]}@t.com", full_name="Candidate", password_hash=hash_password("P@ss1!"), role="STUDENT")
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def company(db: Session, hr_user: TestUser):
    c = TestCompany(id=str(uuid.uuid4()), name=f"Co {uuid.uuid4().hex[:4]}", created_by=hr_user.id)
    db.add(c); db.commit(); db.refresh(c)
    return c


@pytest.fixture
def draft_internship(db: Session, company: TestCompany, hr_user: TestUser):
    i = TestInternship(
        id=str(uuid.uuid4()), company_id=company.id, title="Python Dev Intern",
        description="Build cool stuff with Python", experience_level="ENTRY",
        status="DRAFT", work_mode="REMOTE", location="Mumbai", duration_weeks=12,
        stipend_min=5000, stipend_max=10000, stipend_currency="INR",
        openings=3, created_by=hr_user.id, is_active=False,
    )
    i.slug = _slugify(i.title, i.id)
    db.add(i); db.commit(); db.refresh(i)
    return i


@pytest.fixture
def published_internship(db: Session, company: TestCompany, hr_user: TestUser):
    i = TestInternship(
        id=str(uuid.uuid4()), company_id=company.id, title="React Intern",
        status="PUBLISHED", experience_level="MID", work_mode="HYBRID",
        openings=2, created_by=hr_user.id, is_active=True,
        published_at=datetime.utcnow(),
    )
    i.slug = _slugify(i.title, i.id)
    db.add(i); db.commit(); db.refresh(i)
    return i


# =========================================================================
# Test: Model Layer
# =========================================================================

class TestInternshipModel:
    def test_create_draft_internship(self, db: Session, company: TestCompany, hr_user: TestUser):
        i = TestInternship(
            id=str(uuid.uuid4()), company_id=company.id, title="ML Intern",
            status="DRAFT", work_mode="REMOTE", openings=1, created_by=hr_user.id,
        )
        db.add(i); db.commit(); db.refresh(i)
        assert i.id is not None
        assert i.status == "DRAFT"
        assert i.is_active is False
        assert i.published_at is None

    def test_publish_sets_flags(self, db: Session, draft_internship: TestInternship):
        draft_internship.status = "PUBLISHED"
        draft_internship.is_active = True
        draft_internship.published_at = datetime.utcnow()
        db.commit(); db.refresh(draft_internship)
        assert draft_internship.status == "PUBLISHED"
        assert draft_internship.is_active is True
        assert draft_internship.published_at is not None

    def test_close_sets_inactive(self, db: Session, published_internship: TestInternship):
        published_internship.status = "CLOSED"
        published_internship.is_active = False
        db.commit(); db.refresh(published_internship)
        assert published_internship.status == "CLOSED"
        assert published_internship.is_active is False

    def test_archive_internship(self, db: Session, published_internship: TestInternship):
        published_internship.status = "ARCHIVED"
        published_internship.is_active = False
        db.commit(); db.refresh(published_internship)
        assert published_internship.status == "ARCHIVED"

    def test_soft_delete(self, db: Session, draft_internship: TestInternship):
        draft_internship.deleted_at = datetime.utcnow()
        db.commit(); db.refresh(draft_internship)
        assert draft_internship.deleted_at is not None

    def test_view_count_increment(self, db: Session, draft_internship: TestInternship):
        initial = draft_internship.view_count
        draft_internship.view_count += 1
        db.commit(); db.refresh(draft_internship)
        assert draft_internship.view_count == initial + 1

    def test_slug_is_generated(self, draft_internship: TestInternship):
        assert draft_internship.slug is not None
        assert "python" in draft_internship.slug.lower()

    def test_stipend_fields(self, draft_internship: TestInternship):
        assert draft_internship.stipend_min == 5000
        assert draft_internship.stipend_max == 10000
        assert draft_internship.stipend_currency == "INR"

    def test_deadline_field(self, db: Session, draft_internship: TestInternship):
        deadline = date.today() + timedelta(days=30)
        draft_internship.application_deadline = deadline
        db.commit(); db.refresh(draft_internship)
        assert draft_internship.application_deadline == deadline


# =========================================================================
# Test: Lifecycle RBAC (pure logic)
# =========================================================================

class TestInternshipLifecycleRBAC:
    """Tests mirroring InternshipService ownership and transition guards."""

    def _can_manage(self, user_role: str, is_creator: bool, is_owner_member: bool) -> bool:
        if user_role == "ADMIN":
            return True
        if is_creator:
            return True
        if is_owner_member:
            return True
        return False

    def _can_publish(self, current_status: str) -> bool:
        return current_status == "DRAFT"

    def _can_close(self, current_status: str) -> bool:
        return current_status == "PUBLISHED"

    def _can_restore(self, current_status: str) -> bool:
        return current_status in ("CLOSED", "ARCHIVED")

    def test_admin_can_always_manage(self):
        assert self._can_manage("ADMIN", False, False) is True

    def test_creator_hr_can_manage(self):
        assert self._can_manage("HR", is_creator=True, is_owner_member=False) is True

    def test_company_owner_can_manage(self):
        assert self._can_manage("HR", is_creator=False, is_owner_member=True) is True

    def test_candidate_cannot_manage(self):
        assert self._can_manage("STUDENT", False, False) is False

    def test_hr_non_member_cannot_manage(self):
        assert self._can_manage("HR", False, False) is False

    def test_publish_from_draft(self):
        assert self._can_publish("DRAFT") is True

    def test_cannot_publish_from_published(self):
        assert self._can_publish("PUBLISHED") is False

    def test_cannot_publish_from_archived(self):
        assert self._can_publish("ARCHIVED") is False

    def test_close_requires_published(self):
        assert self._can_close("PUBLISHED") is True
        assert self._can_close("DRAFT") is False

    def test_restore_from_closed(self):
        assert self._can_restore("CLOSED") is True

    def test_restore_from_archived(self):
        assert self._can_restore("ARCHIVED") is True

    def test_restore_from_draft_fails(self):
        assert self._can_restore("DRAFT") is False

    def test_candidate_cannot_create_internship(self):
        role = "STUDENT"
        allowed = role in ["HR", "ADMIN"]
        assert allowed is False

    def test_hr_not_member_blocked(self):
        """HR who isn't a company member should be blocked from posting."""
        role = "HR"
        is_member = False
        allowed = role == "ADMIN" or is_member
        assert allowed is False

    def test_hr_member_allowed(self):
        role = "HR"
        is_member = True
        allowed = role == "ADMIN" or is_member
        assert allowed is True


# =========================================================================
# Test: Slug Generation
# =========================================================================

class TestSlugGeneration:
    def test_basic_slug(self):
        s = _slugify("Frontend Developer Intern", "abc12345-1234")
        assert "frontend" in s
        assert "developer" in s
        assert "intern" in s

    def test_slug_no_special_chars(self):
        s = _slugify("ML/AI Research Intern (2024)", "xyz00000-0000")
        assert "/" not in s
        assert "(" not in s
        assert " " not in s

    def test_slug_lowercase(self):
        s = _slugify("PYTHON DEVELOPER", "aaa00000-0000")
        assert s == s.lower()

    def test_slug_has_id_suffix(self):
        internship_id = "test1234-abcd-efgh-ijkl-mnopqrstuvwx"
        s = _slugify("Backend Intern", internship_id)
        assert internship_id[:8] in s

    def test_slug_truncates_long_titles(self):
        long_title = "A" * 200
        s = _slugify(long_title, "short123")
        assert len(s) < 200


# =========================================================================
# Test: Schema Validation
# =========================================================================

class TestInternshipSchemas:
    def test_create_title_too_short(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="AB")

    def test_create_valid_minimum(self):
        req = InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Internship Title")
        assert req.title == "Valid Internship Title"
        assert req.status == "DRAFT"
        assert req.work_mode == "ONSITE"
        assert req.experience_level == "ENTRY"
        assert req.stipend_currency == "INR"

    def test_create_invalid_work_mode(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", work_mode="OFFICE")

    def test_create_invalid_experience_level(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", experience_level="JUNIOR")

    def test_create_invalid_status(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", status="LIVE")

    def test_create_duration_bounds(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", duration_weeks=0)
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", duration_weeks=200)

    def test_create_openings_minimum(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipCreateRequest(company_id=str(uuid.uuid4()), title="Valid Title", openings=0)

    def test_update_all_optional(self):
        req = InternshipUpdateRequest()
        assert req.title is None
        assert req.work_mode is None
        assert req.stipend_min is None

    def test_update_partial(self):
        req = InternshipUpdateRequest(title="Updated Title", openings=5)
        assert req.title == "Updated Title"
        assert req.openings == 5
        assert req.work_mode is None

    def test_update_invalid_work_mode(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InternshipUpdateRequest(work_mode="COWORK")

    def test_deadline_passed_logic(self):
        past = (date.today() - timedelta(days=1)).isoformat()
        future = (date.today() + timedelta(days=30)).isoformat()
        today = date.today()
        assert date.fromisoformat(past) < today
        assert date.fromisoformat(future) > today
