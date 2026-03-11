from sqlalchemy import Column, Date, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Entry(BaseModel):
    __tablename__ = "entries"

    member_id = Column(ForeignKey("members.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)

    member = relationship("Member", back_populates="entries")
