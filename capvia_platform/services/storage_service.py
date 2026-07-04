import abc
import os
import uuid
import logging
from typing import Optional
from capvia_platform.core.config import settings

logger = logging.getLogger("storage_service")

class StorageProvider(abc.ABC):
    @abc.abstractmethod
    async def upload_file(self, file_bytes: bytes, filename: str) -> str:
        """Uploads a file and returns its URL."""
        pass

    @abc.abstractmethod
    async def delete_file(self, file_url: str) -> bool:
        """Deletes a file given its URL."""
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, upload_dir: str = "public/resumes", base_url: str = "http://localhost:3000"):
        self.upload_dir = upload_dir
        self.base_url = base_url.rstrip("/")
        
        # Ensure upload directory exists
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir, exist_ok=True)

    async def upload_file(self, file_bytes: bytes, filename: str) -> str:
        unique_name = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(self.upload_dir, unique_name)
        
        # Async I/O simulation or simple file write
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        return f"{self.base_url}/resumes/{unique_name}"

    async def delete_file(self, file_url: str) -> bool:
        filename = file_url.split("/")[-1]
        file_path = os.path.join(self.upload_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False


class S3StorageProvider(StorageProvider):
    """
    AWS S3 / Cloudflare R2 storage provider.
    """
    def __init__(self):
        self.bucket = os.getenv("STORAGE_BUCKET_NAME", "capvia-resumes")
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.endpoint_url = os.getenv("AWS_ENDPOINT_URL") # Used for Cloudflare R2/LocalStack

    async def upload_file(self, file_bytes: bytes, filename: str) -> str:
        # Fallback to LocalStorage if credentials are missing
        if not self.aws_access_key or not self.aws_secret_key:
            logger.warning("AWS credentials missing. Falling back to local storage provider.")
            local = LocalStorageProvider()
            return await local.upload_file(file_bytes, filename)
            
        try:
            import boto3
            from botocore.exceptions import BotoCoreError
            
            s3 = boto3.client(
                "s3",
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                endpoint_url=self.endpoint_url
            )
            unique_name = f"{uuid.uuid4()}_{filename}"
            s3.put_object(Bucket=self.bucket, Key=unique_name, Body=file_bytes)
            
            if self.endpoint_url:
                return f"{self.endpoint_url.rstrip('/')}/{self.bucket}/{unique_name}"
            return f"https://{self.bucket}.s3.amazonaws.com/{unique_name}"
        except Exception as e:
            logger.error(f"S3 Upload failed: {str(e)}. Falling back to local storage.")
            local = LocalStorageProvider()
            return await local.upload_file(file_bytes, filename)

    async def delete_file(self, file_url: str) -> bool:
        if not self.aws_access_key or not self.aws_secret_key:
            return False
        try:
            import boto3
            unique_name = file_url.split("/")[-1]
            s3 = boto3.client(
                "s3",
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                endpoint_url=self.endpoint_url
            )
            s3.delete_object(Bucket=self.bucket, Key=unique_name)
            return True
        except Exception:
            return False


class GCSStorageProvider(StorageProvider):
    """
    Google Cloud Storage provider.
    """
    def __init__(self):
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "capvia-resumes")

    async def upload_file(self, file_bytes: bytes, filename: str) -> str:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            unique_name = f"{uuid.uuid4()}_{filename}"
            blob = bucket.blob(unique_name)
            blob.upload_from_string(file_bytes, content_type="application/pdf")
            return blob.public_url
        except Exception as e:
            logger.error(f"GCS Upload failed: {str(e)}. Falling back to local storage.")
            local = LocalStorageProvider()
            return await local.upload_file(file_bytes, filename)

    async def delete_file(self, file_url: str) -> bool:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            unique_name = file_url.split("/")[-1]
            blob = bucket.blob(unique_name)
            blob.delete()
            return True
        except Exception:
            return False


def get_storage_provider() -> StorageProvider:
    """
    Factory function to retrieve the configured storage provider.
    """
    provider_type = os.getenv("STORAGE_PROVIDER", "local").lower()
    if provider_type == "s3" or provider_type == "r2":
        return S3StorageProvider()
    elif provider_type == "gcs":
        return GCSStorageProvider()
    else:
        # Default local storage
        # If in next project layout, the public directory is in frontend
        cwd = os.getcwd()
        upload_path = os.path.join(cwd, "capvia_platform", "frontend", "public", "resumes")
        if not os.path.exists(upload_path):
            upload_path = os.path.join(cwd, "frontend", "public", "resumes")
        if not os.path.exists(upload_path):
            upload_path = "public/resumes"
            
        return LocalStorageProvider(upload_dir=upload_path)
