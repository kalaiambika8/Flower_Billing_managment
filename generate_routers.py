import os

BASE_DIR = os.path.join(os.getcwd(), 'backend', 'app')
def write_file(path, content):
    full_path = os.path.join(BASE_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

write_file('routers/members.py', """
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
""")

write_file('routers/entries.py', """
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
""")

write_file('routers/bills.py', """
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.bill import Bill

router = APIRouter()

@router.get("/")
async def get_bills(shop_id: str, db: AsyncSession = Depends(get_db)):
    return []
""")

write_file('routers/shops.py', "from fastapi import APIRouter\nrouter = APIRouter()")
write_file('routers/rates.py', "from fastapi import APIRouter\nrouter = APIRouter()")
write_file('routers/payments.py', "from fastapi import APIRouter\nrouter = APIRouter()")
write_file('routers/dashboard.py', "from fastapi import APIRouter\nrouter = APIRouter()")
write_file('routers/profile.py', "from fastapi import APIRouter\nrouter = APIRouter()")
write_file('routers/export.py', "from fastapi import APIRouter\nrouter = APIRouter()")
