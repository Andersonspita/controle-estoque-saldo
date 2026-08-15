from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user, require_admin
from ..database.models import Fornecedor
from ..schemas import FornecedorCreate, FornecedorUpdate, FornecedorOut
from ..services.documento import apenas_digitos

router = APIRouter(
    prefix="/api/v1/fornecedores",
    tags=["Fornecedores"],
    dependencies=[Depends(get_current_active_user)],
)


async def _cnpj_em_uso(
    db: AsyncSession, documento: str, *, exclude_id: int | None = None
) -> bool:
    digits = apenas_digitos(documento)
    result = await db.execute(select(Fornecedor))
    for existente in result.scalars():
        if exclude_id is not None and existente.id == exclude_id:
            continue
        if apenas_digitos(existente.cnpj) == digits:
            return True
    return False


@router.post("/", response_model=FornecedorOut, dependencies=[Depends(require_admin)])
async def create_fornecedor(fornecedor: FornecedorCreate, db: AsyncSession = Depends(get_db)):
    if await _cnpj_em_uso(db, fornecedor.cnpj):
        raise HTTPException(status_code=400, detail="Já existe um fornecedor com este CPF/CNPJ")
    db_forn = Fornecedor(**fornecedor.model_dump())
    db.add(db_forn)
    try:
        await db.commit()
        await db.refresh(db_forn)
        return db_forn
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[FornecedorOut])
async def list_fornecedores(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Fornecedor).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{fornecedor_id}", response_model=FornecedorOut)
async def get_fornecedor(fornecedor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Fornecedor).where(Fornecedor.id == fornecedor_id))
    forn = result.scalars().first()
    if not forn:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return forn


@router.patch("/{fornecedor_id}", response_model=FornecedorOut, dependencies=[Depends(require_admin)])
async def update_fornecedor(
    fornecedor_id: int,
    fornecedor_in: FornecedorUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fornecedor).where(Fornecedor.id == fornecedor_id))
    forn = result.scalars().first()
    if not forn:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    dados = fornecedor_in.model_dump(exclude_unset=True)
    if "cnpj" in dados and dados["cnpj"]:
        if await _cnpj_em_uso(db, dados["cnpj"], exclude_id=fornecedor_id):
            raise HTTPException(status_code=400, detail="Já existe um fornecedor com este CPF/CNPJ")

    for campo, valor in dados.items():
        setattr(forn, campo, valor)

    try:
        await db.commit()
        await db.refresh(forn)
        return forn
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
