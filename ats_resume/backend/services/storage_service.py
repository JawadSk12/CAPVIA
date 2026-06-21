"""
backend/services/storage_service.py
────────────────────────────────────
AWS S3 file storage service.

Responsibilities:
  - Upload resume files to S3
  - Generate pre-signed download URLs (time-limited, secure)
  - Download file bytes for AI processing
  - Delete files on resume deletion (GDPR)
  - Health check

S3 Key structure:
  raw/       → original uploads (immutable)
  processed/ → cleaned/OCR'd text versions

Example S3 key:
  raw/resumes/{user_id}/{resume_id}/resume_arjun_kumar.pdf

Security:
  - Files never served directly from S3 (all access via pre-signed URLs)
  - Pre-signed URLs expire in 15 minutes
  - S3 bucket is NOT public
  - Server-side encryption (AES-256) enabled on bucket
"""

from __future__ import annotations

import logging
from io import BytesIO

from pathlib import Path
import shutil
import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from config import settings
from core.security import sanitize_filename

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Raised when S3 operation fails."""
    pass


class StorageService:
    """
    S3 storage service.

    Usage:
        storage = StorageService()
        key = await storage.upload_resume(file_bytes, user_id, resume_id, filename)
    """

    def __init__(self) -> None:
        self._client = None
        self._use_local = not (settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
        if self._use_local:
            self._base_dir = Path(settings.BASE_DIR) / "uploads"
            self._base_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Using local storage for resumes: {self._base_dir}")

    def _get_client(self):
        if self._use_local:
            return None
        if self._client is None:
            self._client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                config=Config(
                    retries={"max_attempts": 3, "mode": "adaptive"},
                    connect_timeout=5,
                    read_timeout=30,
                ),
            )
        return self._client

    def _build_s3_key(
        self,
        user_id: str,
        resume_id: str,
        filename: str,
        prefix: str = "raw",
    ) -> str:
        safe_name = sanitize_filename(filename)
        return f"{prefix}/resumes/{user_id}/{resume_id}/{safe_name}"

    async def upload_resume(
        self,
        file_bytes: bytes,
        user_id: str,
        resume_id: str,
        filename: str,
        content_type: str = "application/pdf",
    ) -> str:
        import asyncio
        s3_key = self._build_s3_key(user_id, resume_id, filename)

        if self._use_local:
            file_path = self._base_dir / s3_key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            def _write():
                with open(file_path, "wb") as f:
                    f.write(file_bytes)
            
            await asyncio.to_thread(_write)
            logger.info(f"Local upload: {s3_key}")
            return s3_key

        def _upload() -> None:
            client = self._get_client()
            client.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=s3_key,
                Body=file_bytes,
                ContentType=content_type,
                ServerSideEncryption="AES256",
                Metadata={
                    "user_id": user_id,
                    "resume_id": resume_id,
                    "original_filename": filename,
                },
            )

        try:
            await asyncio.to_thread(_upload)
            logger.info(
                "resume_uploaded_to_s3",
                extra={"resume_id": resume_id, "s3_key": s3_key, "size": len(file_bytes)},
            )
            return s3_key
        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 upload failed: {e}", extra={"resume_id": resume_id})
            raise StorageError(f"Failed to upload file: {e}") from e

    async def download_file(self, s3_key: str) -> bytes:
        import asyncio

        if self._use_local:
            file_path = self._base_dir / s3_key
            def _read():
                with open(file_path, "rb") as f:
                    return f.read()
            try:
                return await asyncio.to_thread(_read)
            except FileNotFoundError:
                raise StorageError(f"Local file not found: {s3_key}")

        def _download() -> bytes:
            client = self._get_client()
            response = client.get_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=s3_key,
            )
            return response["Body"].read()

        try:
            return await asyncio.to_thread(_download)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                raise StorageError(f"File not found in S3: {s3_key}") from e
            raise StorageError(f"S3 download failed: {e}") from e

    async def get_presigned_url(
        self,
        s3_key: str,
        expiry_seconds: int | None = None,
    ) -> str:
        import asyncio
        if self._use_local:
            # Return a local relative URL that our API will serve
            return f"/api/v1/resume/download/{s3_key}"

        expiry = expiry_seconds or settings.AWS_S3_PRESIGNED_URL_EXPIRY
        def _generate() -> str:
            client = self._get_client()
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.AWS_S3_BUCKET, "Key": s3_key},
                ExpiresIn=expiry,
            )

        try:
            return await asyncio.to_thread(_generate)
        except (ClientError, BotoCoreError) as e:
            raise StorageError(f"Failed to generate pre-signed URL: {e}") from e

    async def delete_file(self, s3_key: str) -> None:
        import asyncio
        if self._use_local:
            file_path = self._base_dir / s3_key
            def _delete():
                if file_path.exists():
                    file_path.unlink()
            await asyncio.to_thread(_delete)
            return

        def _delete() -> None:
            client = self._get_client()
            client.delete_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=s3_key,
            )

        try:
            await asyncio.to_thread(_delete)
            logger.info("s3_file_deleted", extra={"s3_key": s3_key})
        except (ClientError, BotoCoreError) as e:
            logger.error(f"S3 delete failed: {e}")
            raise StorageError(f"Failed to delete file: {e}") from e

    async def delete_user_files(self, user_id: str) -> int:
        import asyncio
        if self._use_local:
            import shutil
            prefix = f"raw/resumes/{user_id}/"
            user_dir = self._base_dir / prefix
            def _delete_all():
                if user_dir.exists():
                    shutil.rmtree(user_dir)
                    return 1 # Simplified count
                return 0
            return await asyncio.to_thread(_delete_all)

        prefix = f"raw/resumes/{user_id}/"
        def _delete_all() -> int:
            client = self._get_client()
            count = 0
            paginator = client.get_paginator("list_objects_v2")
            for page in paginator.paginate(
                Bucket=settings.AWS_S3_BUCKET, Prefix=prefix
            ):
                objects = page.get("Contents", [])
                if not objects:
                    continue
                client.delete_objects(
                    Bucket=settings.AWS_S3_BUCKET,
                    Delete={"Objects": [{"Key": obj["Key"]} for obj in objects]},
                )
                count += len(objects)
            return count

        try:
            deleted = await asyncio.to_thread(_delete_all)
            logger.info(
                "user_files_deleted",
                extra={"user_id": user_id, "count": deleted},
            )
            return deleted
        except (ClientError, BotoCoreError) as e:
            raise StorageError(f"Failed to delete user files: {e}") from e

    async def health_check(self) -> bool:
        if self._use_local:
            return True
        import asyncio
        def _check() -> bool:
            try:
                client = self._get_client()
                client.head_bucket(Bucket=settings.AWS_S3_BUCKET)
                return True
            except Exception:
                return False
        return await asyncio.to_thread(_check)


# ─── Singleton ────────────────────────────────────────────────────────────────

storage_service = StorageService()