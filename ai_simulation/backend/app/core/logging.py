"""
Logging Configuration Module
Sets up structured logging for the entire application
"""

import logging
import sys
from pathlib import Path
from loguru import logger
from app.core.config import settings


class InterceptHandler(logging.Handler):
    """
    Intercept standard logging and redirect to loguru
    """
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging():
    """
    Configure application logging
    Uses loguru for better structured logging
    """
    # Remove default loguru handler
    logger.remove()
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Console handler - colorized and formatted
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
        colorize=True,
    )
    
    # File handler - JSON format for production parsing
    logger.add(
        settings.LOG_FILE,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level=settings.LOG_LEVEL,
        rotation=settings.LOG_ROTATION,
        retention=settings.LOG_RETENTION,
        compression="zip",
        serialize=False,  # Set to True for JSON logging
    )
    
    # Error file handler - separate file for errors
    logger.add(
        "logs/errors.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="ERROR",
        rotation="100 MB",
        retention="60 days",
        compression="zip",
        backtrace=True,
        diagnose=True,
    )
    
    # Intercept standard library logging
    logging.basicConfig(handlers=[InterceptHandler()], level=0)
    
    # Intercept uvicorn logs
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
    
    logger.info(f"Logging configured - Level: {settings.LOG_LEVEL}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")


def get_logger(name: str):
    """
    Get logger instance for a specific module
    
    Args:
        name: Module name (usually __name__)
    
    Returns:
        Logger instance
    """
    return logger.bind(module=name)