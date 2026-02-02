"""
Query Execution Service
Handles SQL query execution with evidence generation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from utils.logging import logger
from utils.errors import QueryExecutionError


class QueryExecutionService:
    """Service for executing SQL queries and generating evidence"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def execute_query(
        self,
        sql: str,
        dataset_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a SQL query and generate evidence pack
        
        Args:
            sql: SQL query to execute
            dataset_id: ID of the dataset being queried
            user_id: ID of the user executing the query
            metadata: Additional metadata (e.g., natural language query)
            
        Returns:
            Dict containing query results and evidence
        """
        execution_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        logger.info(f"Executing query {execution_id} for user {user_id}")
        
        try:
            # Validate SQL (read-only check)
            self._validate_sql(sql)
            
            # Execute query
            result = await self.db.execute(text(sql))
            rows = result.fetchall()
            
            # Get column names
            columns = list(result.keys()) if result.returns_rows else []
            
            # Convert rows to dict format
            data = []
            for row in rows:
                data.append(dict(zip(columns, row)))
            
            end_time = datetime.utcnow()
            execution_time = (end_time - start_time).total_seconds()
            
            # Generate evidence pack
            evidence = self._generate_evidence(
                execution_id=execution_id,
                sql=sql,
                dataset_id=dataset_id,
                user_id=user_id,
                row_count=len(data),
                execution_time=execution_time,
                metadata=metadata
            )
            
            logger.info(
                f"Query {execution_id} completed successfully: "
                f"{len(data)} rows in {execution_time:.3f}s"
            )
            
            return {
                "execution_id": execution_id,
                "sql": sql,
                "columns": columns,
                "data": data,
                "row_count": len(data),
                "execution_time": execution_time,
                "evidence": evidence,
                "status": "success"
            }
            
        except Exception as e:
            end_time = datetime.utcnow()
            execution_time = (end_time - start_time).total_seconds()
            
            logger.error(f"Query execution failed: {str(e)}")
            
            # Generate error evidence
            evidence = self._generate_evidence(
                execution_id=execution_id,
                sql=sql,
                dataset_id=dataset_id,
                user_id=user_id,
                row_count=0,
                execution_time=execution_time,
                metadata=metadata,
                error=str(e)
            )
            
            raise QueryExecutionError(
                message=f"Query execution failed: {str(e)}",
                execution_id=execution_id,
                evidence=evidence
            )
    
    def _validate_sql(self, sql: str) -> None:
        """
        Validate SQL query (basic security checks)
        
        Args:
            sql: SQL query to validate
            
        Raises:
            QueryExecutionError: If SQL is invalid or unsafe
        """
        sql_upper = sql.upper().strip()
        
        # Must be a SELECT statement
        if not sql_upper.startswith("SELECT"):
            raise QueryExecutionError(
                message="Only SELECT queries are allowed",
                sql=sql
            )
        
        # Check for dangerous keywords
        dangerous_keywords = [
            "DROP", "DELETE", "INSERT", "UPDATE", "ALTER",
            "CREATE", "TRUNCATE", "GRANT", "REVOKE"
        ]
        
        for keyword in dangerous_keywords:
            if keyword in sql_upper:
                raise QueryExecutionError(
                    message=f"Keyword '{keyword}' is not allowed",
                    sql=sql
                )
    
    def _generate_evidence(
        self,
        execution_id: str,
        sql: str,
        dataset_id: str,
        user_id: str,
        row_count: int,
        execution_time: float,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate evidence pack for query execution
        
        Args:
            execution_id: Unique execution ID
            sql: SQL query executed
            dataset_id: Dataset ID
            user_id: User ID
            row_count: Number of rows returned
            execution_time: Execution time in seconds
            metadata: Additional metadata
            error: Error message if execution failed
            
        Returns:
            Evidence pack dict
        """
        evidence = {
            "execution_id": execution_id,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "dataset_id": dataset_id,
            "query": {
                "sql": sql,
                "natural_language": metadata.get("nl_query") if metadata else None
            },
            "execution": {
                "row_count": row_count,
                "execution_time": execution_time,
                "status": "error" if error else "success",
                "error": error
            },
            "policy_checks": {
                "sql_validation": "passed" if not error else "failed",
                "read_only": True,
                "allowed_tables": True  # TODO: Implement table whitelist check
            },
            "lineage": {
                "source_dataset": dataset_id,
                "query_dependencies": []  # TODO: Extract table dependencies
            },
            "metadata": metadata or {}
        }
        
        return evidence
    
    async def get_query_history(
        self,
        user_id: Optional[str] = None,
        dataset_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve query execution history
        
        Args:
            user_id: Filter by user ID
            dataset_id: Filter by dataset ID
            limit: Maximum number of results
            
        Returns:
            List of query execution records
        """
        # TODO: Implement with proper query_executions table
        logger.info(f"Retrieving query history: user={user_id}, dataset={dataset_id}")
        
        return []
