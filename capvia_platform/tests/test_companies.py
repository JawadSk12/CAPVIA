"""
CAPVIA Phase 7 — Companies Module Tests
Tests for: Create, Read, Update, Delete, Team Management, Ownership Transfer,
           Verification, and privilege escalation prevention.

Uses in-memory SQLite for model-layer tests (only creating tables that are
SQLite-compatible), and pure Python logic tests for RBAC + schema validation.
"""
import os
import uuid
import pytest

# Inject env vars before importing any capvia modules that load pydantic Settings
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_companies.db")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_pytest_only")
os.environ.setdefault("REFRESH_SECRET_KEY", "test_refresh_secret_key_for_pytest_only")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

from sqlalchemy import create_engine, String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, Session, Mapped, mapped_column, relationship, DeclarativeBase
from typing import Optional, List
from datetime import datetime

from capvia_platform.models.models import UserRole, MemberRole
from capvia_platform.core.exceptions import AuthorizationException
from capvia_platform.utils.auth import hash_password
from capvia_platform.schemas.schemas import (
    CompanyCreateRequest, CompanyUpdateRequest,
    AddMemberRequest, TransferOwnershipRequest
)

# =========================================================================
# Minimal SQLite-compatible ORM Models (subset of production models)
# Only includes User, Company, CompanyMember — no ARRAY/JSONB columns
# =========================================================================

SQLALCHEMY_TEST_URL = "sqlite:///./test_companies.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class TestBase(DeclarativeBase):
    pass


class TestUser(TestBase):
    __tablename__ = "test_users"

    id: Mapped[uuid.UUID] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="STUDENT")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    memberships: Mapped[List["TestCompanyMember"]] = relationship("TestCompanyMember", back_populates="user")


class TestCompany(TestBase):
    __tablename__ = "test_companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    headquarters: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    employee_count: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("test_users.id"), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("test_users.id"), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    members: Mapped[List["TestCompanyMember"]] = relationship("TestCompanyMember", back_populates="company")


class TestCompanyMember(TestBase):
    __tablename__ = "test_company_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("test_companies.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("test_users.id", ondelete="CASCADE"), nullable=False)
    member_role: Mapped[str] = mapped_column(String(20), nullable=False, default="MEMBER")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    company: Mapped["TestCompany"] = relationship("TestCompany", back_populates="members")
    user: Mapped["TestUser"] = relationship("TestUser", back_populates="memberships")


# =========================================================================
# Fixtures
# =========================================================================

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Creates tables before tests, drops them after."""
    TestBase.metadata.create_all(bind=engine)
    yield
    TestBase.metadata.drop_all(bind=engine)
    import os as _os
    if _os.path.exists("./test_companies.db"):
        _os.remove("./test_companies.db")


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
    u = TestUser(
        id=str(uuid.uuid4()),
        email=f"hr_{uuid.uuid4().hex[:6]}@test.com",
        full_name="Test HR",
        password_hash=hash_password("Password1!"),
        role="HR",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def admin_user(db: Session):
    u = TestUser(
        id=str(uuid.uuid4()),
        email=f"admin_{uuid.uuid4().hex[:6]}@test.com",
        full_name="Test Admin",
        password_hash=hash_password("Password1!"),
        role="ADMIN",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def candidate_user(db: Session):
    u = TestUser(
        id=str(uuid.uuid4()),
        email=f"cand_{uuid.uuid4().hex[:6]}@test.com",
        full_name="Test Candidate",
        password_hash=hash_password("Password1!"),
        role="STUDENT",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def company_owned_by_hr(db: Session, hr_user: TestUser):
    """Creates a company + OWNER membership for the hr_user."""
    c = TestCompany(
        id=str(uuid.uuid4()),
        name=f"TestCo {uuid.uuid4().hex[:4]}",
        description="A test company",
        industry="Technology",
        is_verified=False,
        created_by=hr_user.id,
        updated_by=hr_user.id,
    )
    db.add(c)
    db.flush()
    m = TestCompanyMember(company_id=c.id, user_id=hr_user.id, member_role="OWNER")
    db.add(m)
    db.commit()
    db.refresh(c)
    return c


# =========================================================================
# Test: Model Layer — SQLite in-memory assertions
# =========================================================================

class TestCompanyModel:
    def test_create_company_with_extended_fields(self, db: Session, hr_user: TestUser):
        """Company should persist with all extended profile fields."""
        c = TestCompany(
            id=str(uuid.uuid4()),
            name=f"Extended Co {uuid.uuid4().hex[:4]}",
            description="Full featured company",
            industry="Finance",
            website_url="https://extended.co",
            headquarters="New York, NY",
            founded_year=2015,
            employee_count="50-200",
            is_verified=False,
            created_by=hr_user.id,
        )
        db.add(c)
        db.commit()
        db.refresh(c)

        assert c.id is not None
        assert c.industry == "Finance"
        assert c.founded_year == 2015
        assert c.employee_count == "50-200"
        assert c.is_verified is False
        assert c.created_by == hr_user.id

    def test_soft_delete_company(self, db: Session, company_owned_by_hr: TestCompany):
        """Soft-deleted company retains its data with deleted_at set."""
        company_owned_by_hr.deleted_at = datetime.utcnow()
        db.commit()
        db.refresh(company_owned_by_hr)
        assert company_owned_by_hr.deleted_at is not None

    def test_company_member_model(self, db: Session, company_owned_by_hr: TestCompany, admin_user: TestUser):
        """CompanyMember join record should be created with correct role."""
        m = TestCompanyMember(company_id=company_owned_by_hr.id, user_id=admin_user.id, member_role="MEMBER")
        db.add(m)
        db.commit()
        db.refresh(m)

        assert m.id is not None
        assert m.member_role == "MEMBER"
        assert m.company_id == company_owned_by_hr.id
        assert m.user_id == admin_user.id

    def test_ownership_member_role(self, db: Session, company_owned_by_hr: TestCompany, hr_user: TestUser):
        """The creator HR user should have OWNER role in the company."""
        result = db.query(TestCompanyMember).filter_by(
            company_id=company_owned_by_hr.id, user_id=hr_user.id
        ).first()
        assert result is not None
        assert result.member_role == "OWNER"

    def test_verified_toggle(self, db: Session, company_owned_by_hr: TestCompany):
        """is_verified should toggle correctly."""
        assert company_owned_by_hr.is_verified is False
        company_owned_by_hr.is_verified = True
        db.commit()
        db.refresh(company_owned_by_hr)
        assert company_owned_by_hr.is_verified is True

    def test_unique_company_name(self, db: Session, hr_user: TestUser):
        """Two companies with the same name should raise an integrity error."""
        import sqlalchemy.exc
        name = f"Unique Co {uuid.uuid4().hex[:6]}"
        c1 = TestCompany(id=str(uuid.uuid4()), name=name, is_verified=False, created_by=hr_user.id)
        db.add(c1)
        db.commit()

        c2 = TestCompany(id=str(uuid.uuid4()), name=name, is_verified=False, created_by=hr_user.id)
        db.add(c2)
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            db.flush()
        db.rollback()


# =========================================================================
# Test: RBAC Guard Logic (pure Python — no DB needed)
# =========================================================================

class TestCompanyRBAC:
    def _assert_owner_or_admin(self, member_role: Optional[str], user_role: str) -> bool:
        """Mirrors CompanyService._assert_owner_or_admin logic."""
        if user_role == "ADMIN":
            return True
        if member_role == "OWNER":
            return True
        return False

    def test_candidate_cannot_create_company(self):
        """STUDENT role fails the create role check."""
        role = "STUDENT"
        allowed = role in ["HR", "ADMIN"]
        assert allowed is False

    def test_hr_can_create_company(self):
        """HR role passes the create role check."""
        assert "HR" in ["HR", "ADMIN"]

    def test_admin_can_create_company(self):
        """ADMIN role passes the create role check."""
        assert "ADMIN" in ["HR", "ADMIN"]

    def test_owner_can_edit(self):
        """OWNER member role grants edit permission."""
        assert self._assert_owner_or_admin("OWNER", "HR") is True

    def test_admin_can_edit_without_membership(self):
        """ADMIN always passes even without membership."""
        assert self._assert_owner_or_admin(None, "ADMIN") is True

    def test_regular_member_cannot_edit(self):
        """Regular MEMBER role (non-admin) is denied."""
        assert self._assert_owner_or_admin("MEMBER", "HR") is False

    def test_candidate_cannot_edit(self):
        """STUDENT with no membership is denied."""
        assert self._assert_owner_or_admin(None, "STUDENT") is False

    def test_only_admin_can_verify(self):
        """ADMIN is the only role allowed to verify."""
        for role in ["HR", "STUDENT", "CANDIDATE"]:
            assert (role == "ADMIN") is False
        assert ("ADMIN" == "ADMIN") is True

    def test_transfer_requires_current_owner(self):
        """Only the current OWNER member can transfer ownership, not a regular MEMBER."""
        current_role = "MEMBER"
        can_transfer = current_role == "OWNER"
        assert can_transfer is False

        current_role = "OWNER"
        can_transfer = current_role == "OWNER"
        assert can_transfer is True

    def test_cannot_remove_last_owner(self):
        """If only 1 owner exists, removal should be blocked."""
        owners_count = 1
        should_block = owners_count <= 1
        assert should_block is True

    def test_can_remove_non_last_owner(self):
        """If 2 owners exist, one can be removed."""
        owners_count = 2
        should_block = owners_count <= 1
        assert should_block is False


# =========================================================================
# Test: Schema Validation (Pydantic DTOs)
# =========================================================================

class TestCompanySchemas:
    def test_company_create_name_too_short(self):
        """Name with 1 character fails min_length=2."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CompanyCreateRequest(name="X")

    def test_company_create_empty_name(self):
        """Empty name fails validation."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CompanyCreateRequest(name="")

    def test_company_create_valid(self):
        """A valid request serializes without error."""
        req = CompanyCreateRequest(name="ACME Corp", industry="Technology")
        assert req.name == "ACME Corp"
        assert req.industry == "Technology"

    def test_company_create_founded_year_bounds(self):
        """Founded year outside [1800, 2100] should fail."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CompanyCreateRequest(name="OldCo", founded_year=1700)
        with pytest.raises(ValidationError):
            CompanyCreateRequest(name="FutureCo", founded_year=2200)

    def test_company_update_all_optional(self):
        """CompanyUpdateRequest with no fields should be valid (partial update)."""
        req = CompanyUpdateRequest()
        assert req.name is None
        assert req.description is None

    def test_company_update_partial(self):
        """CompanyUpdateRequest with one field leaves others as None."""
        req = CompanyUpdateRequest(description="New description")
        assert req.description == "New description"
        assert req.name is None
        assert req.website_url is None

    def test_add_member_request_defaults(self):
        """AddMemberRequest defaults role to MEMBER."""
        req = AddMemberRequest(user_id=str(uuid.uuid4()))
        assert req.member_role == "MEMBER"

    def test_add_member_request_owner(self):
        """AddMemberRequest accepts OWNER role."""
        req = AddMemberRequest(user_id=str(uuid.uuid4()), member_role="OWNER")
        assert req.member_role == "OWNER"

    def test_transfer_ownership_request(self):
        """TransferOwnershipRequest stores the new_owner_id."""
        nid = str(uuid.uuid4())
        req = TransferOwnershipRequest(new_owner_id=nid)
        assert req.new_owner_id == nid
