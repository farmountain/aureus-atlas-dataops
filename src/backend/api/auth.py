"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from db.session import get_db
from schemas.auth import Token, UserResponse
from security.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user
)
from config import settings
from utils.logging import logger
from middleware import auth_rate_limit
from services import observability

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


@router.post("/login", response_model=Token)
@auth_rate_limit()
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    User login endpoint
    
    Returns JWT access token and refresh token
    """
    logger.info("Login attempt", email=form_data.username)
    
    user = await authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        logger.warning("Login failed", email=form_data.username)
        observability.track_authentication(form_data.username, False, "Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning("Inactive user login attempt", email=form_data.username)
        observability.track_authentication(form_data.username, False, "Account disabled")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)},
        expires_delta=refresh_token_expires
    )
    
    logger.info("Login successful", user_id=str(user.id), email=user.email)
    observability.track_authentication(user.email, True)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using refresh token
    """
    # TODO: Implement refresh token validation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh token not implemented yet"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user


@router.post("/logout")
async def logout(current_user = Depends(get_current_user)):
    """
    User logout (client should discard tokens)
    """
    logger.info("User logout", user_id=str(current_user.id))
    
    return {"message": "Successfully logged out"}
