from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
import enum
import datetime
from db.base import Base


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: __import__('uuid').uuid4())
    dataset_id = Column(String, nullable=False)
    requested_by = Column(String, nullable=False)
    approver_id = Column(String, nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.pending, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
