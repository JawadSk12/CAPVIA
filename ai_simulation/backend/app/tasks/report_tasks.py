from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def generate_report(session_id: str):
    logger.info(f"Generating report for session: {session_id}")
    return {"session_id": session_id, "status": "report_generated"}

@celery_app.task
def export_results(test_id: str, format: str = "pdf"):
    logger.info(f"Exporting results for test {test_id} as {format}")
    return {"test_id": test_id, "format": format, "status": "exported"}
