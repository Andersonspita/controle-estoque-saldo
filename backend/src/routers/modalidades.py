from fastapi import APIRouter, Depends
from typing import List

from ..deps import get_current_active_user
from ..services.modalidades_licitacao import MODALIDADES_LICITACAO

router = APIRouter(
    prefix="/api/v1/modalidades-licitacao",
    tags=["Modalidades de licitação"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/", response_model=List[str])
async def listar_modalidades_licitacao():
    return MODALIDADES_LICITACAO
