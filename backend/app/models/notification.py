from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    shop_id = Column(ForeignKey("shops.id"), nullable=True, index=True)

    user = relationship("User", back_populates="notifications")
