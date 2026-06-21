import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from capvia_platform.api.dependencies import get_db
from capvia_platform.schemas.schemas import WebhookConfigureRequest, WebhookConfigureResponse
from capvia_platform.utils.signatures import verify_webhook_signature
from capvia_platform.services.services import MappingService, RecruitmentProgressService
from capvia_platform.models.models import ApplicationStatus, StageName, RiskLevel, RecommendationType
from capvia_platform.core.logger import logger
from capvia_platform.core.exceptions import BaseAPIException, AuthorizationException

router = APIRouter()

# In-memory webhook configuration store for demonstration purposes
WEBHOOK_CONFIG = {
    "webhook_url": "http://localhost:8000/api/v1/gateway/webhooks",
    "signing_secret": "whsec_prod_default_secret_key_change_me",
    "events": ["ATS_PROCESSED", "SIMULATION_SUBMITTED", "INTERVIEW_EVALUATED"]
}

@router.post("/webhooks/configure", response_model=WebhookConfigureResponse, tags=["Webhooks"])
async def configure_webhooks(
    payload: WebhookConfigureRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Section 5.1: Dynamic Webhook configuration API for subsystems to set endpoints and secrets.
    """
    global WEBHOOK_CONFIG
    WEBHOOK_CONFIG["webhook_url"] = payload.webhook_url
    WEBHOOK_CONFIG["signing_secret"] = payload.signing_secret
    WEBHOOK_CONFIG["events"] = payload.events
    
    logger.info(f"Webhook reconfigured: endpoint={payload.webhook_url}, events={payload.events}")
    return WebhookConfigureResponse(success=True, message="Webhook endpoint configured successfully")

@router.post("/gateway/webhooks", tags=["Webhooks"])
async def receive_gateway_webhook(
    request: Request,
    x_capvia_signature: str = Header(None, alias="X-CAPVIA-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Gateway Webhook listener. Validates HMAC-SHA256 signature and coordinates 
    recruitment lifecycle stages based on payload event.
    """
    body_bytes = await request.body()
    
    # Verify signature
    signing_secret = WEBHOOK_CONFIG["signing_secret"]
    try:
        verify_webhook_signature(x_capvia_signature, signing_secret, body_bytes)
    except AuthorizationException as e:
        logger.warning(f"Webhook signature check rejected: {str(e)}")
        raise
        
    # Process payload
    try:
        payload = json.loads(body_bytes)
    except Exception:
        raise BaseAPIException("Invalid JSON body", status_code=400, code="BAD_REQUEST")
        
    event = payload.get("event")
    data = payload.get("data", {})
    app_id_str = data.get("application_id")
    
    if not event or not app_id_str:
        raise BaseAPIException("Missing event type or application_id", status_code=400, code="BAD_REQUEST")
        
    app_uuid = uuid.UUID(app_id_str)
    logger.info(f"Received webhook: Event={event} for Application={app_id_str}")
    
    # -------------------------------------------------------------
    # Event Orchestration
    # -------------------------------------------------------------
    if event == "ATS_PROCESSED":
        from capvia_platform.webhooks.ats_webhooks import handle_ats_processed_webhook
        return await handle_ats_processed_webhook(db, data)
            
    elif event == "SIMULATION_SUBMITTED":
        from capvia_platform.webhooks.simulation_webhooks import handle_simulation_submitted_webhook
        return await handle_simulation_submitted_webhook(db, data)
            
    elif event == "INTERVIEW_EVALUATED":
        from capvia_platform.webhooks.interview_webhooks import handle_interview_evaluated_webhook
        return await handle_interview_evaluated_webhook(db, data)
        
    else:
        logger.warning(f"Unrecognized webhook event received: {event}")
        return {"success": False, "message": "Unknown event type"}

    return {"success": True, "event": event, "processed_at": datetime.utcnow().isoformat()}

@router.post("/test/trigger-webhook", tags=["Test"])
async def trigger_mock_webhook(
    application_id: str,
    event: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Test endpoint to simulate webhook deliveries by computing signatures on the fly 
    and directly invoking the webhook listener.
    """
    app_uuid = uuid.UUID(application_id)
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    if event == "ATS_PROCESSED":
        payload = {
            "event": "ATS_PROCESSED",
            "timestamp": now_iso,
            "data": {
                "application_id": application_id,
                "resume_id": str(uuid.uuid4()),
                "jd_id": str(uuid.uuid4()),
                "status": "SUCCESS",
                "overall_ats_score": 82.5,
                "score_band": "GOOD",
                "is_suspicious": False,
                "matched_skills": ["Python", "SQL"],
                "missing_skills": []
            }
        }
    elif event == "SIMULATION_SUBMITTED":
        payload = {
            "event": "SIMULATION_SUBMITTED",
            "timestamp": now_iso,
            "data": {
                "application_id": application_id,
                "attempt_id": 42,
                "total_score": 85.5,
                "cheating_risk_level": "LOW",
                "ai_dependency_score": 0.12,
                "recommendation": "hire"
            }
        }
    elif event == "INTERVIEW_EVALUATED":
        payload = {
            "event": "INTERVIEW_EVALUATED",
            "timestamp": now_iso,
            "data": {
                "application_id": application_id,
                "session_id": str(uuid.uuid4()),
                "overall_answer_score_pct": 78,
                "overall_integrity_score": 88,
                "cheating_probability_pct": 12,
                "risk_level": "LOW",
                "recommendation": "Strong Hire",
                "video_url": "https://storage.googleapis.com/capvia-interview-videos/s8r7q6p5.webm"
            }
        }
    else:
        return {"success": False, "message": f"Unsupported test event: {event}"}
        
    # Generate signature using the configured secret key
    from capvia_platform.utils.signatures import calculate_signature
    import time
    timestamp_str = str(int(time.time()))
    payload_bytes = json.dumps(payload).encode('utf-8')
    sig_hash = calculate_signature(WEBHOOK_CONFIG["signing_secret"], timestamp_str, payload_bytes)
    sig_header = f"t={timestamp_str},v1={sig_hash}"
    
    # Internal trigger mock helper
    class DummyRequest:
        def __init__(self, body: bytes):
            self._body = body
        async def body(self):
            return self._body
            
    req = DummyRequest(payload_bytes)
    return await receive_gateway_webhook(request=req, x_capvia_signature=sig_header, db=db)

