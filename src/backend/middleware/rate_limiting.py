"""
Rate Limiting Middleware
Uses SlowAPI for rate limiting with Redis backend
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from typing import Callable
import redis.asyncio as redis

from config import settings
from utils.logging import logger


# Initialize Redis connection for rate limiting
redis_client = None

def get_redis_client():
    """Get or create Redis client"""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


def get_user_id(request: Request) -> str:
    """
    Extract user ID from request for rate limiting
    Falls back to IP address if no user is authenticated
    """
    # Try to get user from request state (set by auth middleware)
    user = getattr(request.state, 'user', None)
    if user:
        return f"user:{user.id}"
    
    # Fall back to IP address
    return f"ip:{get_remote_address(request)}"


# Initialize rate limiter
limiter = Limiter(
    key_func=get_user_id,
    storage_uri=settings.REDIS_URL,
    strategy="fixed-window",
    enabled=True
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors
    """
    user_id = get_user_id(request)
    
    logger.warning(
        f"Rate limit exceeded: {request.url.path} - User: {user_id} - "
        f"Limit: {exc.detail}"
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "details": {
                    "limit": exc.detail,
                    "retry_after": getattr(exc, 'retry_after', 60)
                }
            }
        },
        headers={
            "Retry-After": str(getattr(exc, 'retry_after', 60)),
            "X-RateLimit-Limit": str(exc.detail.split('/')[0] if '/' in exc.detail else exc.detail),
            "X-RateLimit-Remaining": "0",
        }
    )


def add_rate_limit_headers(response: Response, request: Request):
    """
    Add rate limit information to response headers
    """
    # These headers would be populated by SlowAPI automatically
    # This is just a placeholder for custom header logic if needed
    pass


# Rate limit decorators for different endpoint types

def query_rate_limit() -> Callable:
    """Rate limit for query endpoints"""
    return limiter.limit(f"{settings.RATE_LIMIT_QUERIES_PER_MINUTE}/minute")


def auth_rate_limit() -> Callable:
    """Rate limit for authentication endpoints"""
    return limiter.limit(f"{settings.RATE_LIMIT_AUTH_PER_MINUTE}/minute")


def general_rate_limit() -> Callable:
    """General rate limit for other endpoints"""
    return limiter.limit("100/minute")


def strict_rate_limit() -> Callable:
    """Strict rate limit for sensitive operations"""
    return limiter.limit("10/minute")
