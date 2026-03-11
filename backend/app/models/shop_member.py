from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class ShopMember(BaseModel):
    __tablename__ = "shop_members"

    shop_id = Column(ForeignKey("shops.id"), nullable=False, index=True)
    user_id = Column(ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="viewer")  # owner or viewer

    shop = relationship("Shop", back_populates="memberships")
    user = relationship("User", back_populates="shop_memberships")
