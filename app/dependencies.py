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
