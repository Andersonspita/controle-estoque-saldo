from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user
from ..database.models import Movimentacao
from ..schemas import MovimentacaoOut

router = APIRouter(
    prefix="/api/v1/movimentacoes",
    tags=["Movimentações"],
    dependencies=[Depends(get_current_active_user)],
)

@router.get("/", response_model=List[MovimentacaoOut])
async def list_movimentacoes(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    # Retornar as mais recentes
    stmt = select(Movimentacao).order_by(Movimentacao.data_hora.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
