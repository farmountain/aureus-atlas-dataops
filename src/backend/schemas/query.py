"""
Query schemas (Pydantic models for validation)
"""

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class QueryRequest(BaseModel):
    """Natural language query request"""
    question: str
    dataset_id: Optional[str] = None


class QueryResponse(BaseModel):
    """Query execution response"""
    query_id: str
    status: str  # pending, running, success, error
    question: Optional[str] = None
    generated_sql: Optional[str] = None
    results: Optional[List[dict]] = None
    row_count: Optional[int] = None
    execution_time_ms: Optional[int] = None
    evidence_url: Optional[str] = None
    error_message: Optional[str] = None
    message: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
