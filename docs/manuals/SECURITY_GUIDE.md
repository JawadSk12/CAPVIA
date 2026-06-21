# Security Guide

This document outlines the authentication protocols, authorization controls, API gateway safety boundaries, and cryptographic configurations of CAPVIA.

---

## 1. Authentication & Session Management

CAPVIA employs a stateless, token-based authentication mechanism secured with asymmetric/symmetric signing.

### JWT Structure
- **Access Tokens**: Short-lived (15–30 minutes) bearer tokens containing the user identity, roles, and scope permissions.
- **Refresh Tokens**: Long-lived (7 days) tokens stored as encrypted cookies with `HTTPOnly`, `Secure`, and `SameSite=Strict` attributes.

### Refresh Token Rotation (RTR) & Replay Prevention
To prevent session hijacking:
1. When a user requests a new access token, the gateway rotates both the access token and the refresh token.
2. The old refresh token is marked as **revoked** in the `user_sessions` table.
3. If a revoked refresh token is presented again (indicating a replay attack), the system automatically revokes **all** active sessions associated with that user to protect their account.

---

## 2. Role-Based Access Control (RBAC)

Authorization is enforced at the router layer using FastAPI dependency injections.

| Role | Permissions & Access Scope |
| :--- | :--- |
| **STUDENT** | Submit applications, view progress steppers, and view own results. |
| **HR** | Create company profiles, manage team members, edit job listings, view leaderboards, and generate PDF report dossiers. |
| **ADMIN** | Override candidate scores, manage system configurations, view activity audit logs, and override system properties. |

*Example Role Check in Router:*
```python
from fastapi import Depends, HTTPException, status
from capvia_platform.utils.auth import get_current_user

def require_role(required_role: UserRole):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access this resource."
            )
        return current_user
    return dependency
```

---

## 3. Webhook Integrity (HMAC Signature Handshake)

Webhooks received at the API gateway from external systems must be signed using SHA-256 HMAC:
1. Subsystems generate the request payload.
2. Subsystems compute:
   $$Signature = HMAC\_SHA256(SecretKey, RequestPayload)$$
3. The signature is transmitted in the header:
   ```http
   X-CAPVIA-Signature: <computed_signature_hash>
   ```
4. CAPVIA Core Gateway computes the hash of the raw incoming request bytes and compares it in constant time using `hmac.compare_digest` to prevent timing attacks.

---

## 4. File Upload & Resume Security

To prevent Remote Code Execution (RCE) and local file inclusion vulnerabilities during resume submission:
- **File Type Validation**: Only file payloads with the magic numbers matching `application/pdf` are accepted. Extension checks alone are not trusted.
- **File Size Restrictions**: Upload size is capped at **5MB** to prevent Denial of Service (DoS) attacks.
- **Storage Isolation**: Uploaded files are assigned random UUID names, striping user metadata, and stored in private object containers.

---

## 5. Security Audit Log Trail

All high-impact administrator and recruiter actions (updating scores, publishing listings, downloading reports) generate structured logs in the `activity_logs` table:
- **Tracked Columns**: `user_id`, `action` (e.g. `DOWNLOAD_REPORT`), `description`, `ip_address`, `user_agent`, and `created_at`.
- Activity logs are append-only. No CRUD APIs expose edit or delete interfaces for the `activity_logs` table.
