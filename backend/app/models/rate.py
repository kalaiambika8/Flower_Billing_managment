from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from .base import BaseModel

class Rate(BaseModel):
    __tablename__ = "rates"

    shop_id = Column(ForeignKey("shops.id"), nullable=False, unique=True)
    default_rate = Column(Float, nullable=False, default=0.0)
    commission_pct = Column(Float, nullable=False, default=0.0)
    fixed_commission = Column(Float, nullable=False, default=0.0)
    luggage_rate_per_unit = Column(Float, nullable=False, default=0.0)
    commission_type = Column(String(50), nullable=False, default="percentage") # "percentage" or "fixed"

    shop = relationship("Shop", back_populates="rates")

class OverrideRate(BaseModel):
    __tablename__ = "override_rates"

    shop_id = Column(ForeignKey("shops.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    rate = Column(Float, nullable=False)

    shop = relationship("Shop", back_populates="override_rates")
