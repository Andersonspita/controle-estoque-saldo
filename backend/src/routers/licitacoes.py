from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user
from ..database.models import Licitacao
from ..schemas import LicitacaoCreate, LicitacaoUpdate, LicitacaoOut

router = APIRouter(
    prefix="/api/v1/licitacoes",
    tags=["Licitações"],
    dependencies=[Depends(get_current_active_user)],
)

@router.post("/", response_model=LicitacaoOut)
async def create_licitacao(licitacao: LicitacaoCreate, db: AsyncSession = Depends(get_db)):
    db_lic = Licitacao(**licitacao.model_dump())
    db.add(db_lic)
    try:
        await db.commit()
        await db.refresh(db_lic)
        return db_lic
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[LicitacaoOut])
async def list_licitacoes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Licitacao).offset(skip).limit(limit))
    return result.scalars().all()
