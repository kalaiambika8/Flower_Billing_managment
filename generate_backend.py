import os

BASE_DIR = os.path.join(os.getcwd(), 'backend', 'app')

def write_file(path, content):
    full_path = os.path.join(BASE_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

# Models: rate
write_file('models/rate.py', """
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
""")

# Models: bill
write_file('models/bill.py', """
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
""")

# Models: payment
write_file('models/payment.py', """
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
""")

# Models: audit_log
write_file('models/audit_log.py', """
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
""")

# Models: notification
write_file('models/notification.py', """
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
""")

# Models __init__
write_file('models/__init__.py', """
from .base import Base, BaseModel
from .user import User
from .shop import Shop
from .shop_member import ShopMember
from .member import Member
from .entry import Entry
from .rate import Rate, OverrideRate
from .bill import Bill
from .payment import Payment
from .audit_log import AuditLog
from .notification import Notification
""")

# Main API files
write_file('main.py', """
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, shops, members, entries, rates, bills, payments, dashboard, profile, export
from .config import settings

app = FastAPI(title="Flower Billing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(shops.router, prefix="/api/shops", tags=["shops"])
app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(entries.router, prefix="/api/entries", tags=["entries"])
app.include_router(rates.router, prefix="/api/rates", tags=["rates"])
app.include_router(bills.router, prefix="/api/bills", tags=["bills"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(export.router, prefix="/api/export", tags=["export"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
""")

write_file('config.py', """
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/flower_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "5"))
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "dev")

    class Config:
        env_file = ".env"

settings = Settings()
""")

write_file('database.py', """
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from .config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
""")

write_file('dependencies.py', """
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from typing import Optional

from .database import get_db
from .config import settings
from .models.user import User
from .models.shop_member import ShopMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

def role_checker(allowed_roles: list[str]):
    async def check_permissions(shop_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        if current_user.is_superuser:
            return current_user
        result = await db.execute(
            select(ShopMember)
            .where(ShopMember.shop_id == shop_id, ShopMember.user_id == current_user.id, ShopMember.is_deleted == False)
        )
        membership = result.scalar_one_or_none()
        if not membership or membership.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return current_user
    return check_permissions
""")

print("Backend base files and models generated.")
