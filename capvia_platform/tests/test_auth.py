import os
import uuid
import pytest
from datetime import datetime, timedelta

# Set DATABASE_URL BEFORE importing main app (required for pydantic Settings)
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://ats_user:Almas6060@localhost:5433/capvia_test_db")

from fastapi.testclient import TestClient
from capvia_platform.main import app
from capvia_platform.api.dependencies import get_db, get_redis
from capvia_platform.models.models import User, UserRole, UserSession
from capvia_platform.utils.auth import hash_password, verify_password

# =========================================================================
# Mocking Session & Database structures
# =========================================================================

class MockRedis:
    def __init__(self):
        self.store = {}
    async def get(self, key):
        val = self.store.get(key)
        return val
    async def set(self, key, value, ex=None):
        self.store[key] = value.encode('utf-8') if isinstance(value, str) else value
    async def delete(self, key):
        if key in self.store:
            del self.store[key]

class MockSession:
    def __init__(self):
        self.users = []
        self.sessions = []
        self.added = []
    
    async def get(self, entity_class, ident):
        if entity_class == User:
            for u in self.users:
                if u.id == ident:
                    return u
        elif entity_class == UserSession:
            for s in self.sessions:
                if s.id == ident:
                    return s
        return None
        
    async def execute(self, stmt):
        class MockResult:
            def __init__(self, value):
                self._value = value
            def scalar_one_or_none(self):
                return self._value
            def scalars(self):
                class MockScalars:
                    def all(self):
                        return []
                return MockScalars()
        
        stmt_str = str(stmt)
        compiled = stmt.compile()
        params = compiled.params
        
        # Select User
        if "FROM users" in stmt_str:
            email_val = None
            for k, v in params.items():
                if "email" in k:
                    email_val = v
                    break
            if email_val:
                for u in self.users:
                    if u.email == email_val:
                        return MockResult(u)
            return MockResult(None)
            
        # Select UserSession
        if "FROM user_sessions" in stmt_str:
            hash_val = None
            for k, v in params.items():
                if "refresh_token_hash" in k:
                    hash_val = v
                    break
            if hash_val:
                for s in self.sessions:
                    if s.refresh_token_hash == hash_val:
                        return MockResult(s)
            return MockResult(None)
            
        # Update UserSession (revoke)
        if "UPDATE user_sessions" in stmt_str:
            hash_val = None
            user_id_val = None
            for k, v in params.items():
                if "refresh_token_hash" in k:
                    hash_val = v
                elif "user_id" in k:
                    user_id_val = v
                    
            if hash_val:
                for s in self.sessions:
                    if s.refresh_token_hash == hash_val:
                        s.is_revoked = True
            elif user_id_val:
                for s in self.sessions:
                    if s.user_id == user_id_val:
                        s.is_revoked = True
            return MockResult(None)
            
        return MockResult(None)
        
    def add(self, entity):
        self.added.append(entity)
        if isinstance(entity, User):
            if getattr(entity, 'is_active', None) is None:
                entity.is_active = True
            self.users.append(entity)
        elif isinstance(entity, UserSession):
            if getattr(entity, 'is_revoked', None) is None:
                entity.is_revoked = False
            self.sessions.append(entity)
            
    async def flush(self):
        for u in self.users:
            if not getattr(u, 'id', None):
                u.id = uuid.uuid4()
        for s in self.sessions:
            if not getattr(s, 'id', None):
                s.id = uuid.uuid4()
            
    async def commit(self):
        pass
        
    async def rollback(self):
        pass
        
    async def close(self):
        pass

# =========================================================================
# Pytest Fixtures
# =========================================================================

@pytest.fixture
def mock_redis():
    return MockRedis()

@pytest.fixture
def mock_db():
    return MockSession()

@pytest.fixture
def client(mock_db, mock_redis):
    # Override FastAPI dependency injectors
    app.dependency_overrides[get_redis] = lambda: mock_redis
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()

# =========================================================================
# Test Cases
# =========================================================================

def test_password_hashing():
    """
    Verifies that password hashing generates valid bcrypt hashes and successfully verifies.
    """
    raw_pwd = "mysecurepassword"
    hashed = hash_password(raw_pwd)
    
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_user_registration_success(client, mock_redis):
    """
    Verifies public registration defaults to candidate and prints verification token.
    """
    payload = {
        "email": "test_candidate@example.com",
        "password": "strongpassword123",
        "full_name": "Test Candidate",
        "role": "candidate"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "simulated_token" in data
    
    token = data["simulated_token"]
    assert f"email_verify:{token}" in mock_redis.store

def test_user_registration_escalation_denied(client):
    """
    Verifies that standard users cannot register with a privileged role (HR/Admin).
    """
    payload = {
        "email": "test_hr_escalate@example.com",
        "password": "strongpassword123",
        "full_name": "Hack HR",
        "role": "hr" # Attempting privilege escalation
    }
    response = client.post("/api/v1/auth/register", json=payload)
    
    assert response.status_code == 401
    assert "Only administrators can provision" in response.json()["error"]["message"]

def test_email_verification_success(client, mock_redis, mock_db):
    """
    Verifies that verifying the email token successfully activates the user.
    """
    # 1. Register
    reg_payload = {
        "email": "verify_me@example.com",
        "password": "strongpassword123",
        "full_name": "Verify Me"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    
    # Check that user is in DB but not active yet
    assert len(mock_db.users) == 1
    assert mock_db.users[0].is_active is False
    
    # 2. Verify Email
    verify_resp = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True
    
    # Check that user is now active in mock DB
    assert mock_db.users[0].is_active is True

def test_login_fails_if_not_verified(client, mock_db):
    """
    Verifies that logging in fails if the user's email has not been verified.
    """
    # Register candidate
    reg_payload = {
        "email": "unverified@example.com",
        "password": "strongpassword123",
        "full_name": "Unverified User"
    }
    client.post("/api/v1/auth/register", json=reg_payload)
    
    # Login attempt
    login_payload = {
        "email": "unverified@example.com",
        "password": "strongpassword123"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    
    assert response.status_code == 401
    assert "verify your email first" in response.json()["error"]["message"]

def test_login_success_if_verified(client, mock_redis, mock_db):
    """
    Verifies successful login returning token response, session record creation, and audits.
    """
    # 1. Register & verify
    reg_payload = {
        "email": "verified@example.com",
        "password": "strongpassword123",
        "full_name": "Verified User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    # 2. Login
    login_payload = {
        "email": "verified@example.com",
        "password": "strongpassword123"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "candidate"
    assert data["full_name"] == "Verified User"
    
    # Verify that a session is added
    assert len(mock_db.sessions) == 1
    assert mock_db.sessions[0].is_revoked is False

def test_login_failed_password(client, mock_redis, mock_db):
    """
    Verifies login fails on incorrect password.
    """
    # 1. Register & verify
    reg_payload = {
        "email": "wrongpwd@example.com",
        "password": "strongpassword123",
        "full_name": "Wrong Password User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    # 2. Login with wrong password
    login_payload = {
        "email": "wrongpwd@example.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["error"]["message"]

def test_logout_success(client, mock_redis, mock_db):
    """
    Verifies that logging out revokes the session refresh token.
    """
    # Register, verify, login
    reg_payload = {
        "email": "logout@example.com",
        "password": "strongpassword123",
        "full_name": "Logout User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "logout@example.com",
        "password": "strongpassword123"
    })
    refresh_token = login_resp.json()["refresh_token"]
    
    # Logout
    logout_resp = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
    assert logout_resp.status_code == 200
    assert logout_resp.json()["success"] is True
    
    # Check that session is revoked
    assert len(mock_db.sessions) == 1
    assert mock_db.sessions[0].is_revoked is True

def test_refresh_token_rotation_success(client, mock_redis, mock_db):
    """
    Verifies that Refresh Token Rotation works correctly: old token is revoked, new tokens issued.
    """
    # Register, verify, login
    reg_payload = {
        "email": "refresh@example.com",
        "password": "strongpassword123",
        "full_name": "Refresh User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "refresh@example.com",
        "password": "strongpassword123"
    })
    old_rt = login_resp.json()["refresh_token"]
    
    # Refresh
    refresh_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": old_rt})
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    
    # Old session should be marked revoked, new session should be created (total sessions = 2)
    assert len(mock_db.sessions) == 2
    # The old session is marked revoked
    revoked_sessions = [s for s in mock_db.sessions if s.is_revoked]
    assert len(revoked_sessions) == 1

def test_refresh_token_rotation_replay_attack(client, mock_redis, mock_db):
    """
    Verifies that replaying a previously rotated refresh token revokes all family sessions.
    """
    # Register, verify, login
    reg_payload = {
        "email": "replay@example.com",
        "password": "strongpassword123",
        "full_name": "Replay User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "replay@example.com",
        "password": "strongpassword123"
    })
    rt = login_resp.json()["refresh_token"]
    
    # 1. First refresh -> success
    refresh_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
    assert refresh_resp.status_code == 200
    
    # 2. Second refresh with SAME token -> Replay attack detected
    replay_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
    assert replay_resp.status_code == 401
    assert "Replay attack detected" in replay_resp.json()["error"]["message"]
    
    # Verify that all user's sessions are now marked revoked
    for s in mock_db.sessions:
        assert s.is_revoked is True

def test_forgot_password_and_reset(client, mock_redis, mock_db):
    """
    Verifies forgot password generates token, reset updates password and revokes all active sessions.
    """
    # Register, verify
    reg_payload = {
        "email": "resetpwd@example.com",
        "password": "oldpassword123",
        "full_name": "Reset Pwd User"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["simulated_token"]
    client.post("/api/v1/auth/verify-email", json={"token": token})
    
    # Login to create an active session
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "resetpwd@example.com",
        "password": "oldpassword123"
    })
    assert login_resp.status_code == 200
    assert len(mock_db.sessions) == 1
    assert mock_db.sessions[0].is_revoked is False
    
    # Forgot password
    forgot_resp = client.post("/api/v1/auth/forgot-password", json={"email": "resetpwd@example.com"})
    assert forgot_resp.status_code == 200
    reset_token = forgot_resp.json()["simulated_token"]
    
    # Reset password
    reset_payload = {
        "token": reset_token,
        "new_password": "newpassword123"
    }
    reset_resp = client.post("/api/v1/auth/reset-password", json=reset_payload)
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True
    
    # Active sessions must be revoked
    assert mock_db.sessions[0].is_revoked is True
    
    # Login with old password must fail
    login_old_resp = client.post("/api/v1/auth/login", json={
        "email": "resetpwd@example.com",
        "password": "oldpassword123"
    })
    assert login_old_resp.status_code == 401
    
    # Login with new password must succeed
    login_new_resp = client.post("/api/v1/auth/login", json={
        "email": "resetpwd@example.com",
        "password": "newpassword123"
    })
    assert login_new_resp.status_code == 200
