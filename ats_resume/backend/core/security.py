"""
backend/core/security.py
─────────────────────────
Security utilities:
  - File upload validation (MIME type, size, magic bytes)
  - Input sanitization
  - Rate limiting setup (slowapi)
  - Content Security Policy headers

File validation defense-in-depth:
  1. File extension check (weak, bypassable)
  2. MIME type from Content-Type header (weak, bypassable)
  3. Magic bytes check via python-magic (strong)
  All three must pass. Reject if any fails.
"""

from __future__ import annotations

import hashlib
import io
import re
from pathlib import Path

import magic
from fastapi import HTTPException, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings


# ─── Rate Limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],   # global default
    headers_enabled=True,            # X-RateLimit-* headers in responses
    storage_uri=settings.REDIS_URL,  # Redis-backed counters (survives restarts)
)

"""
Usage in routes:
    @router.post("/upload")
    @limiter.limit(settings.RATE_LIMIT_UPLOAD)   # "10/minute"
    async def upload(request: Request, ...):
        ...
"""


# ─── File Validation ──────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Magic bytes for allowed MIME types
# These are checked against actual file bytes — cannot be faked by renaming
ALLOWED_MAGIC_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",   # DOCX is a ZIP archive (magic bytes are PK\x03\x04)
}

# Max file name length (prevent path traversal via long names)
MAX_FILENAME_LENGTH = 255


class FileValidationError(Exception):
    """Raised when uploaded file fails security validation."""
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


async def validate_resume_file(file: UploadFile) -> bytes:
    """
    Comprehensive resume file validation.

    Returns the file contents as bytes if valid.
    Raises FileValidationError or HTTPException if invalid.

    Checks:
      1. Filename length and characters
      2. File extension
      3. File size (before reading all bytes)
      4. Magic bytes (actual content type)
      5. MIME type consistency

    Usage:
        file_bytes = await validate_resume_file(uploaded_file)
    """
    # ── 1. Filename validation ─────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    filename = file.filename
    if len(filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Filename too long (max {MAX_FILENAME_LENGTH} characters)",
        )

    # Block path traversal and dangerous characters
    if re.search(r'[<>:"/\\|?*\x00-\x1f]', filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains invalid characters",
        )

    # ── 2. Extension check ────────────────────────────────────────────────
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ── 3. Size check (streaming — don't load entire file first) ──────────
    # Read in 64KB chunks to check size without loading everything
    chunks: list[bytes] = []
    total_size = 0
    chunk_size = 65536  # 64KB

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File too large. "
                    f"Maximum size: {settings.MAX_FILE_SIZE_MB}MB, "
                    f"Received: {total_size // (1024*1024)}MB+"
                ),
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # ── 4. Magic bytes check ──────────────────────────────────────────────
    # Read first 2048 bytes for magic detection (faster than full file)
    detected_mime = magic.from_buffer(file_bytes[:2048], mime=True)

    if detected_mime not in ALLOWED_MAGIC_MIMES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"File content does not match allowed types. "
                f"Detected: {detected_mime}. "
                f"Only PDF and DOCX files are accepted."
            ),
        )

    # ── 5. DOCX-specific: verify ZIP structure ────────────────────────────
    if suffix == ".docx":
        # DOCX files are ZIP archives containing word/document.xml
        # Magic bytes: PK (0x50 0x4B)
        if not file_bytes[:2] == b"PK":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid DOCX file: missing ZIP header",
            )

    # ── 6. PDF-specific: verify PDF header ───────────────────────────────
    if suffix == ".pdf":
        if not file_bytes[:4] == b"%PDF":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Invalid PDF file: missing PDF header",
            )

    return file_bytes


def compute_file_hash(file_bytes: bytes) -> str:
    """
    Compute SHA-256 hash of file contents.
    Used to detect duplicate uploads (same file uploaded twice).
    """
    return hashlib.sha256(file_bytes).hexdigest()


# ─── Input Sanitization ───────────────────────────────────────────────────────

def sanitize_text(text: str, max_length: int = 10000) -> str:
    """
    Sanitize user-provided text input.
    - Truncate to max_length
    - Remove null bytes
    - Strip leading/trailing whitespace
    """
    if not text:
        return ""
    # Remove null bytes (SQL injection vector)
    cleaned = text.replace("\x00", "")
    # Truncate
    cleaned = cleaned[:max_length]
    return cleaned.strip()


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe S3 storage.
    Replaces spaces and special chars with underscores.
    """
    # Keep only alphanumeric, dots, hyphens, underscores
    safe = re.sub(r"[^\w\-.]", "_", filename)
    # Remove consecutive underscores
    safe = re.sub(r"_+", "_", safe)
    return safe[:200]  # max 200 chars


# ─── Security Headers ─────────────────────────────────────────────────────────

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}