from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user
from ..database.models import Contrato, ItemContrato
from ..schemas import ContratoCreate, ContratoOut, ContratoDetalhadoOut, PrevisaoConsumoOut
from sqlalchemy import func
from datetime import date

router = APIRouter(
    prefix="/api/v1/contratos",
    tags=["Contratos"],
    dependencies=[Depends(get_current_active_user)],
)

@router.post("/", response_model=ContratoOut)
async def create_contrato(contrato: ContratoCreate, db: AsyncSession = Depends(get_db)):
    dados_contrato = contrato.model_dump(exclude={"itens"})
    db_contrato = Contrato(**dados_contrato)
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
                quantidade_contratada=quantidade,
                valor_unitario=item.valor_unitario,
                saldo_atual=quantidade,
            ))
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
            total_baixado=float(total_baixado),
            taxa_diaria=taxa_diaria,
            dias_restantes=dias_restantes
        ))
        
    # Ordenar pelos que acabam mais rápido (ignorando os sem previsão)
    previsoes_com_dias = [p for p in previsoes if p.dias_restantes is not None]
    previsoes_com_dias.sort(key=lambda x: x.dias_restantes)
    
    previsoes_sem_dias = [p for p in previsoes if p.dias_restantes is None]
    
    return previsoes_com_dias + previsoes_sem_dias

