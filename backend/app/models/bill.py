from sqlalchemy import Column, String, Date, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Bill(BaseModel):
    __tablename__ = "bills"

    member_id = Column(ForeignKey("members.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_qty = Column(Float, nullable=False, default=0.0)
    gross_amount = Column(Float, nullable=False, default=0.0)
    commission_amount = Column(Float, nullable=False, default=0.0)
    luggage_amount = Column(Float, nullable=False, default=0.0)
    net_payable = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default="unpaid") # unpaid/paid
    shop_id = Column(ForeignKey("shops.id"), nullable=False, index=True)
    
    member = relationship("Member", back_populates="bills")
    payments = relationship("Payment", back_populates="bill")
