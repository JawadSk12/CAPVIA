"""
Evaluation Tasks
Background tasks for evaluation processing
"""

from celery import Task
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.evaluation_orchestrator import evaluation_orchestrator
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
def evaluate_session_task(self, session_id: int):
    """
    Evaluate session in background
    
    Args:
        session_id: Session ID to evaluate
    
    Returns:
        Evaluation result
    """
    logger.info(f"Starting background evaluation for session {session_id}")
    
    try:
        result = evaluation_orchestrator.evaluate_session(
            self.db,
            session_id=session_id,
            generate_report=True
        )
        
        logger.info(f"Background evaluation completed for session {session_id}")
        return result
        
    except Exception as e:
        logger.error(f"Background evaluation failed for session {session_id}: {str(e)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True)
def evaluate_submission_task(self, submission_id: int):
    """
    Evaluate single submission in background
    
    Args:
        submission_id: Submission ID to evaluate
    
    Returns:
        Evaluation result
    """
    logger.info(f"Starting background evaluation for submission {submission_id}")
    
    try:
        result = evaluation_orchestrator.evaluate_submission(
            self.db,
            submission_id=submission_id
        )
        
        logger.info(f"Background evaluation completed for submission {submission_id}")
        return result
        
    except Exception as e:
        logger.error(f"Background evaluation failed for submission {submission_id}: {str(e)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True)
def batch_evaluate_sessions(self, session_ids: list):
    """
    Evaluate multiple sessions in batch
    
    Args:
        session_ids: List of session IDs
    
    Returns:
        List of evaluation results
    """
    logger.info(f"Starting batch evaluation for {len(session_ids)} sessions")
    
    results = []
    for session_id in session_ids:
        try:
            result = evaluation_orchestrator.evaluate_session(
                self.db,
                session_id=session_id,
                generate_report=True
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to evaluate session {session_id}: {str(e)}")
            results.append({"session_id": session_id, "error": str(e)})
    
    logger.info(f"Batch evaluation completed: {len(results)} sessions processed")
    return results