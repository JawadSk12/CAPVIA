from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from capvia_platform.models.models import RiskLevel, RecommendationType, ApplicationStatus

# =========================================================================
# ATS Engine Schemas
# =========================================================================

class ResumeUploadResponse(BaseModel):
    resume_id: str
    status: str = "UPLOADED"

class ResumeComparisonResponse(BaseModel):
    resume_id: str
    jd_id: str
    status: str = "PENDING"

class SkillMatchItem(BaseModel):
    target: str
    match: str
    score: float

class RequiredSkillsAnalysis(BaseModel):
    matches: List[SkillMatchItem]

class ATSResultResponse(BaseModel):
    resume_id: str
    overall_score: float
    required_skills_analysis: RequiredSkillsAnalysis

# =========================================================================
# AssessAI Simulation Schemas
# =========================================================================

class CandidateRegisterRequest(BaseModel):
    external_application_uuid: str
    external_candidate_uuid: str
    email: EmailStr
    full_name: str
    skills_from_resume: List[str]

class CandidateRegisterResponse(BaseModel):
    simulation_candidate_id: int
    simulation_application_id: int

class StartSimulationResponse(BaseModel):
    application_id: str
    attempt_id: int
    simulation_token: str
    expires_at: datetime

class SyncAttemptRequest(BaseModel):
    simulation_attempt_id: int

class SyncAttemptResponse(BaseModel):
    success: bool
    message: str

class SaveAnswerRequest(BaseModel):
    task_id: int
    code_content: Optional[str] = None
    selected_option: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None

class SaveAnswerResponse(BaseModel):
    success: bool
    saved_at: datetime

class TelemetryEvent(BaseModel):
    event_type: str
    timestamp: datetime
    details: Dict[str, Any]

class SaveTelemetryEventsRequest(BaseModel):
    events: List[TelemetryEvent]

class SaveTelemetryEventsResponse(BaseModel):
    success: bool
    processed_count: int

class SimulationSubmitResponse(BaseModel):
    attempt_id: int
    status: str = "submitted"
    total_score: float
    role_name: str
    skills_assessed: List[str]
    cheating_risk_level: RiskLevel
    recommendation: str

# =========================================================================
# IntelliRecruit Interview Schemas
# =========================================================================

class StartInterviewRequest(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    job_role: str
    skills: List[str]
    company_name: str

class StartInterviewResponse(BaseModel):
    session_id: str
    signed_video_upload_url: str
    questions: List[str]
    expires_at: datetime

class SaveInterviewAnswerRequest(BaseModel):
    question_index: int
    audio_duration_sec: float
    transcript: str
    proctoring_violations_count: int
    proctoring_details: Optional[Dict[str, Any]] = None

class SaveInterviewAnswerResponse(BaseModel):
    success: bool
    saved_at: datetime

class InterviewCompleteRequest(BaseModel):
    session_id: str
    video_url: str
    local_violations_json: str
    baselined_locally: Optional[bool] = False
    local_evaluation_report_json: Optional[str] = None

class InterviewCompleteResponse(BaseModel):
    success: bool
    status: str
    evaluated_immediately: bool

class InterviewResultResponse(BaseModel):
    application_id: str
    session_id: str
    overall_answer_score_pct: int
    overall_integrity_score: int
    cheating_probability_pct: int
    risk_level: RiskLevel
    recommendation: RecommendationType
    video_url: str
    baselined_locally: bool
    strengths: List[str]
    improvements: List[str]

# =========================================================================
# Webhook Schemas
# =========================================================================

class WebhookConfigureRequest(BaseModel):
    webhook_url: str
    signing_secret: str
    events: List[str]

class WebhookConfigureResponse(BaseModel):
    success: bool
    message: str

# Webhook payload models (for webhook listeners)

class ATSProcessedData(BaseModel):
    application_id: str
    resume_id: str
    jd_id: str
    status: str
    overall_ats_score: float
    score_band: str
    is_suspicious: bool

class ATSProcessedWebhook(BaseModel):
    event: str = "ATS_PROCESSED"
    timestamp: datetime
    data: ATSProcessedData

class SimulationSubmittedData(BaseModel):
    application_id: str
    attempt_id: int
    total_score: float
    cheating_risk_level: RiskLevel
    ai_dependency_score: float
    recommendation: str

class SimulationSubmittedWebhook(BaseModel):
    event: str = "SIMULATION_SUBMITTED"
    timestamp: datetime
    data: SimulationSubmittedData

class InterviewEvaluatedData(BaseModel):
    application_id: str
    session_id: str
    overall_answer_score_pct: int
    overall_integrity_score: int
    cheating_probability_pct: int
    risk_level: RiskLevel
    recommendation: str
    video_url: str

class InterviewEvaluatedWebhook(BaseModel):
    event: str = "INTERVIEW_EVALUATED"
    timestamp: datetime
    data: InterviewEvaluatedData

# =========================================================================
# Authentication Schemas
# =========================================================================

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    role: Optional[str] = "candidate"
    company_name: Optional[str] = None
    phone: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    full_name: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class VerifyEmailRequest(BaseModel):
    token: str


# =========================================================================
# Companies Module Schemas
# =========================================================================

class CompanyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    website_url: Optional[str] = None
    headquarters: Optional[str] = None
    founded_year: Optional[int] = Field(None, ge=1800, le=2100)
    employee_count: Optional[str] = None  # e.g. "1-10", "50-200", "500+"


class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    website_url: Optional[str] = None
    headquarters: Optional[str] = None
    founded_year: Optional[int] = Field(None, ge=1800, le=2100)
    employee_count: Optional[str] = None


class CompanyMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    full_name: str
    email: str
    member_role: str
    joined_at: datetime


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    website_url: Optional[str] = None
    headquarters: Optional[str] = None
    founded_year: Optional[int] = None
    employee_count: Optional[str] = None
    is_verified: bool
    created_by: Optional[str] = None
    member_count: int = 0
    internship_count: int = 0
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    companies: List[CompanyResponse]
    total: int
    page: int
    per_page: int


class CompanyAnalyticsResponse(BaseModel):
    company_id: str
    company_name: str
    total_internships: int
    active_internships: int
    total_applications: int
    applications_by_status: Dict[str, int]
    avg_ats_score: Optional[float]
    avg_simulation_score: Optional[float]
    avg_interview_score: Optional[float]
    top_internship: Optional[str]
    pipeline_breakdown: Dict[str, int]


class AddMemberRequest(BaseModel):
    user_id: str
    member_role: str = "MEMBER"  # "OWNER" or "MEMBER"


class TransferOwnershipRequest(BaseModel):
    new_owner_id: str


# =========================================================================
# Phase 8: Internship Module Schemas
# =========================================================================

class InternshipCreateRequest(BaseModel):
    company_id: str
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    experience_level: str = Field("ENTRY", pattern="^(ENTRY|MID|SENIOR)$")
    # Lifecycle
    status: str = Field("DRAFT", pattern="^(DRAFT|PUBLISHED)$")
    # Logistics
    work_mode: str = Field("ONSITE", pattern="^(REMOTE|HYBRID|ONSITE)$")
    location: Optional[str] = None
    duration_weeks: Optional[int] = Field(None, ge=1, le=104)
    # Stipend
    stipend_min: Optional[int] = Field(None, ge=0)
    stipend_max: Optional[int] = Field(None, ge=0)
    stipend_currency: str = Field("INR", max_length=10)
    # Application controls
    openings: int = Field(1, ge=1, le=10000)
    application_limit: Optional[int] = Field(None, ge=1)
    application_deadline: Optional[str] = None  # ISO date string "YYYY-MM-DD"


class InternshipUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    experience_level: Optional[str] = Field(None, pattern="^(ENTRY|MID|SENIOR)$")
    work_mode: Optional[str] = Field(None, pattern="^(REMOTE|HYBRID|ONSITE)$")
    location: Optional[str] = None
    duration_weeks: Optional[int] = Field(None, ge=1, le=104)
    stipend_min: Optional[int] = Field(None, ge=0)
    stipend_max: Optional[int] = Field(None, ge=0)
    stipend_currency: Optional[str] = Field(None, max_length=10)
    openings: Optional[int] = Field(None, ge=1, le=10000)
    application_limit: Optional[int] = Field(None, ge=1)
    application_deadline: Optional[str] = None


class InternshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    title: str
    description: Optional[str] = None
    responsibilities: List[str]
    required_skills: List[str]
    technologies: List[str]
    experience_level: str
    status: str
    work_mode: str
    location: Optional[str] = None
    duration_weeks: Optional[int] = None
    stipend_min: Optional[int] = None
    stipend_max: Optional[int] = None
    stipend_currency: str
    openings: int
    application_limit: Optional[int] = None
    application_deadline: Optional[str] = None
    view_count: int
    created_by: Optional[str] = None
    slug: Optional[str] = None
    published_at: Optional[str] = None
    application_count: int = 0
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    is_deadline_passed: bool = False
    created_at: str
    updated_at: str


class InternshipListResponse(BaseModel):
    internships: List[InternshipResponse]
    total: int
    page: int
    per_page: int


class InternshipAnalyticsResponse(BaseModel):
    internship_id: str
    title: str
    status: str
    view_count: int
    application_count: int
    shortlisted_count: int
    rejected_count: int
    conversion_rate: float
    avg_ats_score: Optional[float]
    avg_simulation_score: Optional[float]
    avg_interview_score: Optional[float]
    pipeline_breakdown: Dict[str, int]
    days_since_posted: Optional[int]
    days_until_deadline: Optional[int]


# =========================================================================
# Phase 9: Application System Schemas
# =========================================================================

class ApplicationCreateRequest(BaseModel):
    internship_id: str
    cover_letter: Optional[str] = Field(None, max_length=5000)
    resume_url: Optional[str] = Field(None, max_length=512)


class ApplicationWithdrawRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class ApplicationRejectRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=1000)


class ApplicationStatusUpdateRequest(BaseModel):
    status: str
    metadata: Optional[Dict[str, Any]] = None


class ApplicationEventResponse(BaseModel):
    id: str
    event_type: str
    from_status: Optional[str]
    to_status: Optional[str]
    actor_name: Optional[str]
    actor_role: Optional[str]
    metadata: Dict[str, Any]
    label: str
    created_at: str


class ApplicationResponse(BaseModel):
    id: str
    candidate_id: str
    vacancy_id: str
    status: str
    status_label: str
    current_stage: str
    cover_letter: Optional[str]
    resume_url: Optional[str]
    rejection_reason: Optional[str]
    withdrawn_at: Optional[str]
    hired_at: Optional[str]
    progress_step: int
    progress_total: int
    is_terminal: bool
    created_at: str
    updated_at: str
    # Vacancy snapshot
    vacancy_title: Optional[str]
    company_name: Optional[str]
    company_logo: Optional[str]
    vacancy_work_mode: Optional[str]
    vacancy_location: Optional[str]
    # Scores
    ats_score: Optional[float]
    simulation_score: Optional[float]
    interview_score: Optional[int]
    risk_level: Optional[str]
    # Optional events (included in detail view)
    events: Optional[List[ApplicationEventResponse]] = None


class ApplicationListResponse(BaseModel):
    applications: List[ApplicationResponse]
    total: int
    page: int
    per_page: int


class ApplicationTimelineResponse(BaseModel):
    application_id: str
    events: List[ApplicationEventResponse]


class ApplicationDashboardResponse(BaseModel):
    total_applications: int
    active_applications: int
    status_breakdown: Dict[str, int]
    hired_count: int
    shortlisted_count: int
    rejected_count: int
    withdrawn_count: int
    recent_applications: List[ApplicationResponse]


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    is_read: bool
    read_at: Optional[str]
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int


# =========================================================================
# Phase 18: Report Engine Schemas
# =========================================================================

class ReportGenerateRequest(BaseModel):
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    pdf_url: Optional[str]
    created_at: datetime
    updated_at: datetime
