from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from ..database import get_db
from ..models.entry import Entry
from ..dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_entries(shop_id: str, start_date: str, end_date: str, db: AsyncSession = Depends(get_db)):
    # Assuming filtering by date ranges
    return []
