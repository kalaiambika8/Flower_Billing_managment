from sqlalchemy import Column, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Payment(BaseModel):
    __tablename__ = "payments"

    member_id = Column(ForeignKey("members.id"), nullable=False, index=True)
    bill_id = Column(ForeignKey("bills.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False, index=True)
    shop_id = Column(ForeignKey("shops.id"), nullable=False, index=True)

    member = relationship("Member", back_populates="payments")
    bill = relationship("Bill", back_populates="payments")
