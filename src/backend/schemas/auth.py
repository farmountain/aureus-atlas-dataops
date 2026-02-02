"""
Authentication schemas (Pydantic models for validation)
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: dict


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    """User information response"""
    id: str
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
