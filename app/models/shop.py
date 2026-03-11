from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Shop(BaseModel):
    __tablename__ = "shops"

    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    owner_id = Column(ForeignKey("users.id"), nullable=False, index=True)

    owner = relationship("User", back_populates="shops_owned", foreign_keys=[owner_id])
    memberships = relationship("ShopMember", back_populates="shop")
    customers = relationship("Member", back_populates="shop")
    rates = relationship("Rate", back_populates="shop", uselist=False)
    override_rates = relationship("OverrideRate", back_populates="shop")
