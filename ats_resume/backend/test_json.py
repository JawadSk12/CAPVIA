from fastapi.responses import JSONResponse
from enum import Enum
import asyncio
from models.resume import ResumeStatus

async def main():
    try:
        JSONResponse(content={"status": ResumeStatus.DONE})
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
