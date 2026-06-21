"""
Health Check Endpoints
System health and status checks
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from datetime import datetime
import psutil
import os


router = APIRouter()


@router.get("/")
def health_check():
    """
    Basic health check
    
    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@router.get("/detailed")
def detailed_health_check(db: Session = Depends(get_db)):
    """
    Detailed health check with system metrics
    
    Args:
        db: Database session
    
    Returns:
        Detailed health information
    """
    # Database check
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        
        "services": {
            "database": db_status,
            "redis": "healthy",  # TODO: Implement Redis check
            "celery": "healthy"  # TODO: Implement Celery check
        },
        
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / (1024 * 1024),
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / (1024 * 1024 * 1024)
        },
        
        "process": {
            "pid": os.getpid(),
            "threads": psutil.Process().num_threads()
        }
    }