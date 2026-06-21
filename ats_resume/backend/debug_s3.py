import asyncio
from services.storage_service import storage_service
from config import settings

async def test_s3():
    print(f"AWS Region: {settings.AWS_REGION}")
    print(f"AWS Bucket: {settings.AWS_S3_BUCKET}")
    print(f"AWS Access Key: {'Present' if settings.AWS_ACCESS_KEY_ID else 'Missing'}")
    
    try:
        print("Testing S3 health check...")
        health = await storage_service.health_check()
        print(f"S3 Health: {'OK' if health else 'Failed'}")
        
        print("Attempting a small test upload...")
        key = await storage_service.upload_resume(
            file_bytes=b"test content",
            user_id="test_user",
            resume_id="test_resume",
            filename="test.pdf"
        )
        print(f"Upload successful! Key: {key}")
    except Exception as e:
        print(f"S3 Operation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_s3())
