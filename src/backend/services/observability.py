"""
Enhanced Observability Service
Comprehensive logging, metrics, and monitoring
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime
from functools import wraps
import json

from utils.logging import logger


class ObservabilityService:
    """Service for tracking metrics and events"""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {
            "requests": {},
            "queries": {},
            "errors": {},
            "performance": {}
        }
    
    def track_request(self, method: str, path: str, status_code: int, duration: float, user_id: Optional[str] = None):
        """Track API request"""
        logger.info(
            f"API Request: {method} {path} - Status: {status_code} - Duration: {duration:.3f}s - User: {user_id or 'anonymous'}"
        )
        
        # Update metrics
        key = f"{method}:{path}"
        if key not in self.metrics["requests"]:
            self.metrics["requests"][key] = {
                "count": 0,
                "success": 0,
                "errors": 0,
                "total_duration": 0,
                "avg_duration": 0
            }
        
        self.metrics["requests"][key]["count"] += 1
        self.metrics["requests"][key]["total_duration"] += duration
        self.metrics["requests"][key]["avg_duration"] = (
            self.metrics["requests"][key]["total_duration"] / 
            self.metrics["requests"][key]["count"]
        )
        
        if 200 <= status_code < 300:
            self.metrics["requests"][key]["success"] += 1
        else:
            self.metrics["requests"][key]["errors"] += 1
    
    def track_query_execution(
        self,
        query_id: str,
        dataset_id: str,
        user_id: str,
        execution_time: float,
        row_count: int,
        success: bool,
        error: Optional[str] = None
    ):
        """Track query execution"""
        logger.info(
            f"Query Execution: {query_id} - Dataset: {dataset_id} - "
            f"User: {user_id} - Time: {execution_time:.3f}s - Rows: {row_count} - "
            f"Success: {success}"
        )
        
        if not success and error:
            logger.error(f"Query execution failed: {query_id} - Error: {error}")
        
        # Update query metrics
        if dataset_id not in self.metrics["queries"]:
            self.metrics["queries"][dataset_id] = {
                "total_queries": 0,
                "successful_queries": 0,
                "failed_queries": 0,
                "total_rows_returned": 0,
                "avg_execution_time": 0,
                "total_execution_time": 0
            }
        
        self.metrics["queries"][dataset_id]["total_queries"] += 1
        self.metrics["queries"][dataset_id]["total_execution_time"] += execution_time
        self.metrics["queries"][dataset_id]["total_rows_returned"] += row_count
        
        if success:
            self.metrics["queries"][dataset_id]["successful_queries"] += 1
        else:
            self.metrics["queries"][dataset_id]["failed_queries"] += 1
        
        self.metrics["queries"][dataset_id]["avg_execution_time"] = (
            self.metrics["queries"][dataset_id]["total_execution_time"] /
            self.metrics["queries"][dataset_id]["total_queries"]
        )
    
    def track_error(self, error_type: str, error_message: str, context: Dict[str, Any]):
        """Track error occurrence"""
        logger.error(
            f"Error occurred: Type={error_type} - Message={error_message} - Context={json.dumps(context)}"
        )
        
        if error_type not in self.metrics["errors"]:
            self.metrics["errors"][error_type] = {
                "count": 0,
                "last_occurrence": None
            }
        
        self.metrics["errors"][error_type]["count"] += 1
        self.metrics["errors"][error_type]["last_occurrence"] = datetime.utcnow().isoformat()
    
    def track_authentication(self, email: str, success: bool, reason: Optional[str] = None):
        """Track authentication attempt"""
        if success:
            logger.info(f"Authentication successful: {email}")
        else:
            logger.warning(f"Authentication failed: {email} - Reason: {reason}")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": self.metrics
        }
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics = {
            "requests": {},
            "queries": {},
            "errors": {},
            "performance": {}
        }
        logger.info("Metrics reset")


# Global observability service instance
observability = ObservabilityService()


def track_performance(metric_name: str):
    """Decorator to track function performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"Performance: {metric_name} completed in {duration:.3f}s")
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Performance: {metric_name} failed after {duration:.3f}s - Error: {str(e)}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"Performance: {metric_name} completed in {duration:.3f}s")
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Performance: {metric_name} failed after {duration:.3f}s - Error: {str(e)}")
                raise
        
        # Return appropriate wrapper based on whether function is async
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
