from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from ..database import get_db
from ..models.member import Member
from ..dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_members(shop_id: str, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Member).where(Member.shop_id == shop_id, Member.is_deleted == False))
    return result.scalars().all()
