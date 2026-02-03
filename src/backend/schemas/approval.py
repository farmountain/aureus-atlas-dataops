from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ApprovalRequestCreate(BaseModel):
    dataset_id: str
    requested_by: str
    comment: Optional[str] = None

class ApprovalRequestResponse(BaseModel):
    id: UUID
    dataset_id: str
    requested_by: str
    approver_id: Optional[str]
    status: str
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
