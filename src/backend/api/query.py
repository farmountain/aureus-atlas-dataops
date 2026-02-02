"""
Query execution API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from schemas.query import QueryRequest, QueryResponse
from security.auth import get_current_user
from services.query_execution import QueryExecutionService
from utils.logging import logger
from utils.errors import QueryExecutionError

router = APIRouter()


@router.post("/execute", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute SQL query with evidence generation
    
    Returns query results and evidence pack
    """
    logger.info(
        f"Query execution requested by user {current_user.id}"
    )
    
    try:
        # Initialize query execution service
        service = QueryExecutionService(db)
        
        # Execute query
        result = await service.execute_query(
            sql=request.sql,
            dataset_id=request.dataset_id,
            user_id=str(current_user.id),
            metadata={
                "nl_query": request.question,
                "user_email": current_user.email,
                "user_role": current_user.role
            }
        )
        
        return {
            "query_id": result["execution_id"],
            "status": "completed",
            "sql": result["sql"],
            "columns": result["columns"],
            "data": result["data"],
            "row_count": result["row_count"],
            "execution_time": result["execution_time"],
            "evidence": result["evidence"],
            "message": "Query executed successfully"
        }
        
    except QueryExecutionError as e:
        logger.error(f"Query execution error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "QUERY_EXECUTION_FAILED",
                "message": str(e),
                "execution_id": getattr(e, 'execution_id', None)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error during query execution: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred during query execution"
            }
        )


@router.get("/{query_id}", response_model=QueryResponse)
async def get_query_status(
    query_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get query execution status and results
    """
    logger.info(
        "Query status check",
        user_id=str(current_user.id),
        query_id=query_id
    )
    
    # TODO: Implement query retrieval
    # 1. Fetch query from database
    # 2. Check authorization
    # 3. Return status and results
    
    return {
        "query_id": query_id,
        "status": "pending",
        "message": "Query execution in progress (mock response)"
    }


@router.get("/", response_model=dict)
async def get_query_history(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """
    Get user's query history
    """
    logger.info(
        "Query history requested",
        user_id=str(current_user.id),
        limit=limit,
        offset=offset
    )
    
    # TODO: Implement query history
    
    return {
        "queries": [],
        "total": 0,
        "limit": limit,
        "offset": offset
    }
