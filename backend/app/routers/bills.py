from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.bill import Bill

router = APIRouter()

@router.get("/")
async def get_bills(shop_id: str, db: AsyncSession = Depends(get_db)):
    return []
