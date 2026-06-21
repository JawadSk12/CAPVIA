# Integration Guide

This guide details how the CAPVIA platform integrates with the ATS, AssessAI Coding Simulation, and IntelliRecruit Video Interview subsystems.

---

## 1. Security & Handshake Protocols

All programmatic communication between CAPVIA Core and the subsystems is secured via one of two mechanisms:

### System-to-System JWT Handshake
Requests made by CAPVIA Core to trigger actions in subsystems contain a JWT signed with a shared system secret key.
```http
Authorization: Bearer <system_jwt_token>
```
The payload contains:
```json
{
  "iss": "capvia_core",
  "sub": "system_integration",
  "exp": 1782000000
}
```

### Webhook HMAC Signature Verification
Webhook callbacks sent from subsystems to CAPVIA Gateway are verified using an HMAC signature generated with a shared secret key. The header `X-CAPVIA-Signature` contains the hex-encoded HMAC digest:
```http
X-CAPVIA-Signature: 669a8b13697e...
```

#### HMAC Verification Logic in FastAPI Middleware:
```python
import hmac
import hashlib

def verify_webhook_signature(payload_bytes: bytes, signature_header: str, secret_key: str) -> bool:
    expected_signature = hmac.new(
        secret_key.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature_header)
```

---

## 2. Webhook Callback Processing & State Sync

When callbacks arrive at the webhook gateway, the system maps entities and pushes states.

### Entity Mapping Architecture
The database maintains bridge mappings to link local records with external subsystems:
- **`candidate_mappings`**: Connects `users.id` with `ats_user_uuid`, `simulation_candidate_id`, and `interview_candidate_uuid`.
- **`vacancy_mappings`**: Connects `internships.id` with `ats_jd_uuid` and `simulation_internship_id`.
- **`application_mappings`**: Connects `applications.id` with `ats_resume_uuid`, `simulation_attempt_id`, and `interview_session_uuid`.

---

## 3. Resilience & Failure Recovery

To handle external system downtime, CAPVIA implements the following patterns:

### 1. HTTP Client Timeouts & Retries
Every microservice client uses standard exponential backoff retries when encountering standard network issues (502, 503, 504 status codes):
- **Base Backoff**: 1 second.
- **Max Retries**: 3 attempts.
- **Backoff multiplier**: $2^x$ (1s, 2s, 4s).

### 2. Circuit Breaker Configuration
If any microservice request failure rate exceeds **50% within a rolling window of 10 requests**, the client enters the `OPEN` state, blocking outbound requests and falling back to offline queues. The breaker transitions to `HALF-OPEN` after a cooldown period of **60 seconds**.

### 3. Fallback Evaluation Baseline
If the video interview evaluation service is down when a candidate submits their final video answers, CAPVIA triggers a **Local Baseline Fallback**:
- A background worker falls back to local processing.
- The state transitions to `EVALUATED_LOCAL_BASELINE` instead of `EVALUATED`.
- Recruiter analytics flag the record with a **Review Required** warning tag, noting that the AI evaluation was conducted via the local baseline fallback engine rather than the remote microservice.
