import hmac
import hashlib
import time
from capvia_platform.core.exceptions import AuthorizationException

def calculate_signature(signing_secret: str, timestamp: str, payload_bytes: bytes) -> str:
    """
    Computes the HMAC-SHA256 signature for a webhook payload.
    """
    # Concatenate timestamp and raw body bytes: t || PayloadBody
    # In python, we can encode timestamp to bytes and concatenate it with payload
    msg = timestamp.encode('utf-8') + payload_bytes
    key = signing_secret.encode('utf-8')
    sig = hmac.new(key, msg, hashlib.sha256).hexdigest()
    return sig

def verify_webhook_signature(signature_header: str, signing_secret: str, payload_bytes: bytes) -> bool:
    """
    Validates the X-CAPVIA-Signature header against the payload bytes.
    Raises AuthorizationException if signature is invalid or expired.
    """
    if not signature_header:
        raise AuthorizationException("Missing X-CAPVIA-Signature header")

    # Parse header: e.g. "t=177112090,v1=5d41402abc..."
    parts = {}
    try:
        for item in signature_header.split(','):
            key, val = item.split('=', 1)
            parts[key.strip()] = val.strip()
    except Exception:
        raise AuthorizationException("Invalid X-CAPVIA-Signature header format")

    t_str = parts.get('t')
    v1_sig = parts.get('v1')

    if not t_str or not v1_sig:
        raise AuthorizationException("Signature header missing timestamp or signature value")

    try:
        timestamp = float(t_str)
    except ValueError:
        raise AuthorizationException("Invalid timestamp in signature header")

    # Prevent replay attacks: Tolerance window of 300 seconds
    current_time = time.time()
    if abs(current_time - timestamp) > 300:
        raise AuthorizationException("Webhook signature timestamp expired (outside 300s tolerance window)")

    # Calculate expected signature
    expected_sig = calculate_signature(signing_secret, t_str, payload_bytes)

    # Secure constant-time comparison
    if not hmac.compare_digest(v1_sig, expected_sig):
        raise AuthorizationException("Webhook signature verification failed")

    return True
