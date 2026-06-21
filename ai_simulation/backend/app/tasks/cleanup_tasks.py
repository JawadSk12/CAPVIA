"""
Cleanup Tasks
Periodic maintenance and cleanup tasks
"""

from celery import Task
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.repositories.session_repository import session_repository
from datetime import datetime, timedelta
from loguru import logger


class DatabaseTask(Task):
    """Base task with database session"""
    _db = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(base=DatabaseTask, bind=True)
def expire_old_sessions(self):
    """
    Mark expired sessions
    Runs periodically to clean up old sessions
    """
    logger.info("Running session expiration task")
    
    try:
        expired_sessions = session_repository.get_expired_sessions(self.db)
        
        count = 0
        for session in expired_sessions:
            session_repository.mark_as_expired(self.db, session=session)
            count += 1
        
        logger.info(f"Marked {count} sessions as expired")
        return {"expired_count": count}
        
    except Exception as e:
        logger.error(f"Session expiration task failed: {str(e)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True)
def cleanup_old_logs(self, days: int = 30):
    """
    Clean up old log files
    
    Args:
        days: Number of days to keep
    """
    logger.info(f"Running log cleanup task (keeping last {days} days)")
    
    try:
        # TODO: Implement log cleanup logic
        logger.info("Log cleanup completed")
        return {"status": "completed"}
        
    except Exception as e:
        logger.error(f"Log cleanup task failed: {str(e)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True)
def generate_daily_stats(self):
    """
    Generate daily statistics
    Runs at end of each day
    """
    logger.info("Generating daily statistics")
    
    try:
        # Get today's sessions
        today = datetime.utcnow().date()
        start = datetime.combine(today, datetime.min.time())
        end = datetime.combine(today, datetime.max.time())
        
        sessions = session_repository.get_sessions_by_date_range(
            self.db,
            start_date=start,
            end_date=end
        )
        
        stats = {
            "date": today.isoformat(),
            "total_sessions": len(sessions),
            "completed": len([s for s in sessions if s.status.value == "completed"]),
            "active": len([s for s in sessions if s.status.value == "in_progress"])
        }
        
        logger.info(f"Daily stats generated: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Daily stats generation failed: {str(e)}")
        raise


# Schedule periodic tasks
celery_app.conf.beat_schedule = {
    "expire-sessions-every-hour": {
        "task": "app.tasks.cleanup_tasks.expire_old_sessions",
        "schedule": 3600.0,  # Every hour
    },
    "generate-daily-stats": {
        "task": "app.tasks.cleanup_tasks.generate_daily_stats",
        "schedule": 86400.0,  # Daily
    }
}