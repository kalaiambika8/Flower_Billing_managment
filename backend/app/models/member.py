from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Member(BaseModel):
    __tablename__ = "members"

    name = Column(String(255), nullable=False)
    shop_id = Column(ForeignKey("shops.id"), nullable=False, index=True)

    shop = relationship("Shop", back_populates="customers")
    entries = relationship("Entry", back_populates="member")
    bills = relationship("Bill", back_populates="member")
    payments = relationship("Payment", back_populates="member")
