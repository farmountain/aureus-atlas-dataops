"""
Approval workflow endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from security.auth import get_current_user
from utils.logging import logger
from models.approval import ApprovalRequest, ApprovalStatus
from schemas.approval import ApprovalRequestCreate, ApprovalRequestResponse

router = APIRouter()


@router.post("/requests", response_model=ApprovalRequestResponse, status_code=201)
async def create_approval_request(payload: ApprovalRequestCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """Create an approval request"""
    # Create record
    approval = ApprovalRequest(
        dataset_id=payload.dataset_id,
        requested_by=payload.requested_by or str(current_user.id),
        comment=payload.comment,
        status=ApprovalStatus.pending
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    logger.info(f"Approval request created: {approval.id} by {approval.requested_by}")
    return approval


@router.get("/requests/{request_id}", response_model=ApprovalRequestResponse)
async def get_approval_request(request_id: str, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == request_id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")
    return approval


@router.post("/requests/{request_id}/action", response_model=ApprovalRequestResponse)
async def act_on_approval(request_id: str, action: str, comment: str = None, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """Approve or reject a request. action should be 'approve' or 'reject'"""
    result = await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == request_id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if action not in ("approve", "reject"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action")

    approval.approver_id = str(current_user.id)
    approval.comment = comment or approval.comment
    approval.status = ApprovalStatus.approved if action == "approve" else ApprovalStatus.rejected
    await db.commit()
    await db.refresh(approval)

    logger.info(f"Approval {action} performed by {approval.approver_id} on {approval.id}")
    return approval
