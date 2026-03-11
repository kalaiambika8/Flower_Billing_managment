from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id = Column(ForeignKey("users.id"), nullable=True, index=True)
    shop_id = Column(ForeignKey("shops.id"), nullable=True, index=True)
    action = Column(String(255), nullable=False)
    target_type = Column(String(255), nullable=False)
    target_id = Column(String(255), nullable=True)
    details = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="audit_logs")
