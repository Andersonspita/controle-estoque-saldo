from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user, require_admin
from ..database.models import Almoxarifado, EstoqueAlmoxarifado, ItemContrato
from ..schemas import (
    AlmoxarifadoCreate,
    AlmoxarifadoUpdate,
    AlmoxarifadoOut,
    AlmoxarifadoDetalhadoOut,
    DestinacaoItemOut,
)

router = APIRouter(
    prefix="/api/v1/almoxarifados",
    tags=["Almoxarifados"],
    dependencies=[Depends(get_current_active_user)],
)

@router.get("/", response_model=List[AlmoxarifadoOut])
async def list_almoxarifados(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select
    stmt = select(Almoxarifado).order_by(Almoxarifado.nome).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{almoxarifado_id}", response_model=AlmoxarifadoDetalhadoOut)
async def get_almoxarifado(almoxarifado_id: int, db: AsyncSession = Depends(get_db)):
    """Lista a destinação física dos itens já baixados neste almoxarifado.
    O saldo controlado pelo sistema continua sendo o do contrato.
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload

    stmt_alm = select(Almoxarifado).where(Almoxarifado.id == almoxarifado_id)
    result_alm = await db.execute(stmt_alm)
    almoxarifado = result_alm.scalar_one_or_none()
    if not almoxarifado:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    stmt = (
        select(EstoqueAlmoxarifado)
        .options(
            selectinload(EstoqueAlmoxarifado.item_contrato).selectinload(ItemContrato.contrato)
        )
        .where(EstoqueAlmoxarifado.almoxarifado_id == almoxarifado_id)
        .where(EstoqueAlmoxarifado.quantidade > 0)
    )
    result = await db.execute(stmt)
    estoques = result.scalars().all()

    destinos = []
    for estoque in estoques:
        item = estoque.item_contrato
        contrato = item.contrato if item else None
        destinos.append(DestinacaoItemOut(
            item_contrato_id=item.id,
            codigo=item.codigo,
            descricao=item.descricao,
            unidade=item.unidade,
            contrato_id=contrato.id if contrato else item.contrato_id,
            contrato_numero=contrato.numero if contrato else "",
            contrato_ano=contrato.ano if contrato else 0,
            quantidade_destinada=estoque.quantidade,
            saldo_contrato=item.saldo_atual,
        ))

    return AlmoxarifadoDetalhadoOut(
        id=almoxarifado.id,
        nome=almoxarifado.nome,
        localizacao=almoxarifado.localizacao,
        ativo=almoxarifado.ativo,
        destinos=destinos,
    )

@router.post("/", response_model=AlmoxarifadoOut, dependencies=[Depends(require_admin)])
async def create_almoxarifado(almoxarifado: AlmoxarifadoCreate, db: AsyncSession = Depends(get_db)):
    db_almoxarifado = Almoxarifado(**almoxarifado.model_dump())
    db.add(db_almoxarifado)
    await db.commit()
    await db.refresh(db_almoxarifado)
    return db_almoxarifado


@router.patch("/{almoxarifado_id}", response_model=AlmoxarifadoOut, dependencies=[Depends(require_admin)])
async def update_almoxarifado(
    almoxarifado_id: int,
    almoxarifado_in: AlmoxarifadoUpdate,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.future import select

    result = await db.execute(select(Almoxarifado).where(Almoxarifado.id == almoxarifado_id))
    almoxarifado = result.scalar_one_or_none()
    if not almoxarifado:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    dados = almoxarifado_in.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(almoxarifado, campo, valor)

    await db.commit()
    await db.refresh(almoxarifado)
    return almoxarifado
