"""
Structured logging setup
"""

import logging
import sys
from pythonjsonlogger import jsonlogger

from config import settings


def setup_logging():
    """Setup structured JSON logging"""
    
    logger = logging.getLogger()
    logger.setLevel(settings.LOG_LEVEL)
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    
    # JSON formatter
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s',
        rename_fields={'levelname': 'level', 'asctime': 'timestamp'}
    )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger


# Global logger instance
logger = logging.getLogger("aureus")
