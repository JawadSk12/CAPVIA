from __future__ import annotations

import os
import sys

# Ensure project root is in PYTHONPATH for background workers
# We go up 2 levels from backend/workers/celery_app.py to reach the root containing 'ai_engine' and 'backend'
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

from config import settings


# ─── App Factory ──────────────────────────────────────────────────────────────

def create_celery_app() -> Celery:
    """
    Create and configure the Celery application.
    Called once at module level.
    """
    app = Celery(
        "capvia",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=[
            "workers.tasks.parse_resume",
            "workers.tasks.embed_resume",
            "workers.tasks.score_global",
            "workers.tasks.score_internship",
            "workers.tasks.generate_rewrite",
        ],
    )

    # ── Core Config ───────────────────────────────────────────────────────────
    app.conf.update(
        # Serialization
        task_serializer=settings.CELERY_TASK_SERIALIZER,
        result_serializer=settings.CELERY_RESULT_SERIALIZER,
        accept_content=["json"],

        # Timezone
        timezone=settings.CELERY_TIMEZONE,
        enable_utc=True,

        # Task execution
        task_track_started=settings.CELERY_TASK_TRACK_STARTED,
        task_time_limit=settings.CELERY_TASK_TIME_LIMIT,        # 10 min hard kill
        task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,  # 9 min SoftTimeLimitExceeded

        # Result backend
        result_expires=86400,    # Results expire after 24 hours
        result_compression="gzip",

        # Reliability
        task_acks_late=True,     # Acknowledge AFTER task completes (not before)
        task_reject_on_worker_lost=True,  # Re-queue if worker crashes mid-task
        worker_prefetch_multiplier=1,  # Process one task at a time per worker
                                       # Critical for GPU workers — don't prefetch

        # Retry defaults
        task_max_retries=3,
        task_default_retry_delay=30,  # 30 seconds between retries

        # Monitoring
        worker_send_task_events=True,
        task_send_sent_event=True,
    )

    # ── Queue Configuration ───────────────────────────────────────────────────
    # Named queues with priorities
    # OCR tasks run first (they unblock all downstream tasks)
    app.conf.task_queues = (
        Queue(
            "ocr_queue",
            Exchange("capvia", type="direct"),
            routing_key="ocr",
            queue_arguments={"x-max-priority": 10},
        ),
        Queue(
            "score_queue",
            Exchange("capvia", type="direct"),
            routing_key="score",
            queue_arguments={"x-max-priority": 5},
        ),
        Queue(
            "rewrite_queue",
            Exchange("capvia", type="direct"),
            routing_key="rewrite",
            queue_arguments={"x-max-priority": 3},
        ),
    )

    # Default queue for tasks without explicit routing
    app.conf.task_default_queue = "score_queue"
    app.conf.task_default_exchange = "capvia"
    app.conf.task_default_routing_key = "score"

    # ── Task Routing ──────────────────────────────────────────────────────────
    app.conf.task_routes = {
        "workers.tasks.parse_resume.parse_resume_task":     {"queue": "ocr_queue"},
        "workers.tasks.embed_resume.embed_resume_task":     {"queue": "score_queue"},
        "workers.tasks.score_global.score_global_task":     {"queue": "score_queue"},
        "workers.tasks.score_internship.score_internship_task": {"queue": "score_queue"},
        "workers.tasks.generate_rewrite.generate_rewrite_task": {"queue": "rewrite_queue"},
    }

    # ── Periodic Tasks (Beat) ─────────────────────────────────────────────────
    app.conf.beat_schedule = {
        # Clean up stale PENDING resumes (stuck for >1 hour)
        "cleanup-stale-resumes": {
            "task": "workers.tasks.parse_resume.cleanup_stale_resumes",
            "schedule": crontab(minute="*/30"),  # Every 30 minutes
        },
        # Update percentile rankings for all roles (nightly)
        "update-percentiles": {
            "task": "workers.tasks.score_global.update_percentiles",
            "schedule": crontab(hour="2", minute="0"),  # 2 AM UTC
        },
    }

    return app


# ─── Singleton ────────────────────────────────────────────────────────────────

celery_app = create_celery_app()