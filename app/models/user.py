from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)

    shops_owned = relationship("Shop", back_populates="owner", foreign_keys="[Shop.owner_id]")
    shop_memberships = relationship("ShopMember", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
