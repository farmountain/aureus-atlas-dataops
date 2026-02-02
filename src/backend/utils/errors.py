"""
Custom error classes and error handling
"""

from fastapi import HTTPException


class AureusException(Exception):
    """Base exception for AUREUS"""
    pass


class AuthenticationError(AureusException):
    """Authentication failed"""
    pass


class AuthorizationError(AureusException):
    """Insufficient permissions"""
    pass


class ValidationError(AureusException):
    """Input validation failed"""
    pass


class PromptInjectionError(AureusException):
    """Prompt injection detected"""
    pass


class SQLValidationError(AureusException):
    """SQL validation failed"""
    pass


def create_error_response(code: str, message: str, details: list = None, request_id: str = None):
    """Create standardized error response"""
    error = {
        "code": code,
        "message": message
    }
    
    if details:
        error["details"] = details
    
    if request_id:
        error["request_id"] = request_id
    
    return {"error": error}
