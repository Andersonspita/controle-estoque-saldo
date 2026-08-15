from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date

from ..database.session import get_db
from ..deps import get_current_active_user, require_admin
from ..database.models import Contrato, ItemContrato, Movimentacao
from ..schemas import (
    ContratoCreate,
    ContratoUpdate,
    ContratoOut,
    ContratoDetalhadoOut,
    PrevisaoConsumoOut,
    ContratoAditivoIn,
)
from ..services.aditivo import aplicar_aditivo_item, valor_total_inicial_itens, valor_total_itens

router = APIRouter(
    prefix="/api/v1/contratos",
    tags=["Contratos"],
    dependencies=[Depends(get_current_active_user)],
)

@router.post("/", response_model=ContratoOut, dependencies=[Depends(require_admin)])
async def create_contrato(contrato: ContratoCreate, db: AsyncSession = Depends(get_db)):
    dados_contrato = contrato.model_dump(exclude={"itens"})
    if not dados_contrato.get("licitacao_id"):
        dados_contrato.pop("licitacao_id", None)
    db_contrato = Contrato(
        **{
            k: v
            for k, v in dados_contrato.items()
            if k not in ("valor_total", "valor_total_inicial", "percentual_aditivo")
        },
        valor_total=0,
        valor_total_inicial=0,
        percentual_aditivo=0,
    )
    db.add(db_contrato)
    try:
        await db.flush()
        for indice, item in enumerate(contrato.itens, start=1):
            quantidade = item.quantidade_contratada
            db.add(ItemContrato(
                contrato_id=db_contrato.id,
                numero_item=item.numero_item or indice,
                codigo=item.codigo,
                descricao=item.descricao,
                unidade=item.unidade,
                quantidade_inicial=quantidade,
                valor_unitario_inicial=item.valor_unitario,
                quantidade_contratada=quantidade,
                valor_unitario=item.valor_unitario,
                saldo_atual=quantidade,
            ))
        await db.flush()
        itens_depois = (
            await db.execute(select(ItemContrato).where(ItemContrato.contrato_id == db_contrato.id))
        ).scalars().all()
        db_contrato.valor_total_inicial = valor_total_inicial_itens(itens_depois)
        db_contrato.valor_total = valor_total_itens(itens_depois)
        await db.commit()
        await db.refresh(db_contrato)
        return db_contrato
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[ContratoDetalhadoOut])
async def list_contratos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Contrato)
        .options(selectinload(Contrato.fornecedor), selectinload(Contrato.itens))
        .offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/previsao-consumo", response_model=List[PrevisaoConsumoOut])
async def previsao_consumo_contratos(db: AsyncSession = Depends(get_db)):
    from ..database.models import Contrato, ItemContrato, Movimentacao
    
    hoje = date.today()
    
    # Busca itens com seus contratos e as baixas
    stmt = (
        select(
            ItemContrato,
            Contrato,
            func.sum(Movimentacao.quantidade).label("total_baixado")
        )
        .join(Contrato, ItemContrato.contrato_id == Contrato.id)
        .outerjoin(
            Movimentacao, 
            (Movimentacao.item_contrato_id == ItemContrato.id) & 
            (Movimentacao.tipo_movimento == 'BAIXA')
        )
        .where(Contrato.situacao == "Ativo")
        .group_by(ItemContrato.id, Contrato.id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    previsoes = []
    for item, contrato, total_baixado in rows:
        total_baixado = total_baixado or 0
        
        # Calcular dias decorridos do contrato
        if not contrato.data_inicio:
            continue
            
        dias_decorridos = (hoje - contrato.data_inicio).days
        if dias_decorridos <= 0:
            dias_decorridos = 1 # Evitar divisão por zero
            
        taxa_diaria = float(total_baixado) / dias_decorridos
        
        dias_restantes = None
        if taxa_diaria > 0:
            dias_restantes = int(item.saldo_atual / taxa_diaria)
            
        previsoes.append(PrevisaoConsumoOut(
            contrato_id=contrato.id,
            contrato_numero=contrato.numero,
            fornecedor_id=contrato.fornecedor_id,
            item_id=item.id,
            item_descricao=item.descricao,
            saldo_atual=item.saldo_atual,
            valor_unitario=item.valor_unitario or 0,
            saldo_monetario=round((item.saldo_atual or 0) * (item.valor_unitario or 0), 2),
            total_baixado=float(total_baixado),
            taxa_diaria=taxa_diaria,
            dias_restantes=dias_restantes
        ))
        
    # Ordenar pelos que acabam mais rápido (ignorando os sem previsão)
    previsoes_com_dias = [p for p in previsoes if p.dias_restantes is not None]
    previsoes_com_dias.sort(key=lambda x: x.dias_restantes)
    
    previsoes_sem_dias = [p for p in previsoes if p.dias_restantes is None]
    
    return previsoes_com_dias + previsoes_sem_dias


@router.patch("/{contrato_id}", response_model=ContratoDetalhadoOut, dependencies=[Depends(require_admin)])
async def update_contrato(
    contrato_id: int,
    contrato_in: ContratoUpdate,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
        .where(Contrato.id == contrato_id)
    )
    result = await db.execute(stmt)
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    dados = contrato_in.model_dump(exclude_unset=True, exclude={"itens"})
    for campo, valor in dados.items():
        setattr(contrato, campo, valor)

    if contrato_in.itens is not None:
        itens_atuais = {item.id: item for item in contrato.itens}
        ids_enviados: set[int] = set()
        proximo_numero = max((it.numero_item or 0 for it in contrato.itens), default=0)

        for item_in in contrato_in.itens:
            if item_in.id:
                item = itens_atuais.get(item_in.id)
                if not item:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Item {item_in.id} não pertence a este contrato",
                    )
                consumido = (item.quantidade_contratada or 0) - (item.saldo_atual or 0)
                if item_in.quantidade_contratada < consumido:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"A quantidade do item '{item.descricao}' não pode ser menor "
                            f"do que o já baixado ({consumido})"
                        ),
                    )
                item.codigo = item_in.codigo
                item.descricao = item_in.descricao
                item.unidade = item_in.unidade
                item.quantidade_contratada = item_in.quantidade_contratada
                item.valor_unitario = item_in.valor_unitario
                item.saldo_atual = item_in.quantidade_contratada - consumido
                ids_enviados.add(item.id)
            else:
                proximo_numero += 1
                db.add(ItemContrato(
                    contrato_id=contrato.id,
                    numero_item=proximo_numero,
                    codigo=item_in.codigo,
                    descricao=item_in.descricao,
                    unidade=item_in.unidade,
                    quantidade_inicial=item_in.quantidade_contratada,
                    valor_unitario_inicial=item_in.valor_unitario,
                    quantidade_contratada=item_in.quantidade_contratada,
                    valor_unitario=item_in.valor_unitario,
                    saldo_atual=item_in.quantidade_contratada,
                ))

        for item_id, item in itens_atuais.items():
            if item_id in ids_enviados:
                continue
            mov = await db.execute(
                select(Movimentacao.id).where(Movimentacao.item_contrato_id == item_id).limit(1)
            )
            if mov.scalar_one_or_none() is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"O item '{item.descricao}' já teve baixa e não pode ser removido",
                )
            db.delete(item)

        await db.flush()

    itens_depois = (
        await db.execute(select(ItemContrato).where(ItemContrato.contrato_id == contrato.id))
    ).scalars().all()
    contrato.valor_total_inicial = valor_total_inicial_itens(itens_depois)
    contrato.valor_total = valor_total_itens(itens_depois)

    try:
        await db.commit()
        result = await db.execute(
            select(Contrato)
            .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
            .where(Contrato.id == contrato.id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{contrato_id}/aditivo", response_model=ContratoDetalhadoOut, dependencies=[Depends(require_admin)])
async def aditivar_contrato(
    contrato_id: int,
    body: ContratoAditivoIn,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
        .where(Contrato.id == contrato_id)
    )
    result = await db.execute(stmt)
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if not body.itens:
        raise HTTPException(status_code=400, detail="Selecione ao menos um item para aditivar")

    itens_por_id = {item.id: item for item in contrato.itens}
    ids_vistos: set[int] = set()
    for item_in in body.itens:
        if item_in.item_id in ids_vistos:
            raise HTTPException(status_code=400, detail="Há item repetido no aditivo")
        ids_vistos.add(item_in.item_id)
        item = itens_por_id.get(item_in.item_id)
        if not item:
            raise HTTPException(
                status_code=400,
                detail=f"Item {item_in.item_id} não pertence a este contrato",
            )
        try:
            aplicar_aditivo_item(item, item_in.quantidade_aditivada, item_in.valor_unitario)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"{item.descricao}: {e}",
            ) from e

    contrato.valor_total = valor_total_itens(contrato.itens)

    try:
        await db.commit()
        result = await db.execute(
            select(Contrato)
            .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
            .where(Contrato.id == contrato.id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

