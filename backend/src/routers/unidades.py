from fastapi import APIRouter, Depends
from typing import List

from ..deps import get_current_active_user
from ..schemas import UnidadeMedidaOut
from ..services.unidades_medida import UNIDADES_MEDIDA

router = APIRouter(
    prefix="/api/v1/unidades-medida",
    tags=["Unidades de medida"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get("/", response_model=List[UnidadeMedidaOut])
async def listar_unidades_medida():
    return UNIDADES_MEDIDA
