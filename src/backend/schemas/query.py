"""
Query schemas (Pydantic models for validation)
"""

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class QueryRequest(BaseModel):
    """SQL query execution request"""
    question: Optional[str] = None  # Natural language query (optional)
    sql: str  # SQL query to execute
    dataset_id: str  # Dataset being queried


class QueryResponse(BaseModel):
    """Query execution response"""
    query_id: str
    status: str  # pending, running, completed, error
    sql: Optional[str] = None
    columns: Optional[List[str]] = None
    data: Optional[List[dict]] = None
    row_count: Optional[int] = None
    execution_time: Optional[float] = None
    evidence: Optional[dict] = None
    message: Optional[str] = None
    
    class Config:
        from_attributes = True
