"""
Celery Application
Asynchronous task processing
"""

from celery import Celery
from app.core.config import settings
from loguru import logger


# Create Celery app
celery_app = Celery(
    "ai_simulation",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Auto-discover tasks
celery_app.autodiscover_tasks([
    "app.tasks.evaluation_tasks",
    "app.tasks.cleanup_tasks",
    "app.tasks.report_tasks"
])


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery"""
    logger.info(f"Request: {self.request!r}")
    return "Celery is working!"