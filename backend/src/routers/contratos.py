import os
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date

from ..database.session import get_db
from ..deps import get_current_active_user, require_gestao_contratos, CurrentUser
from ..database.models import Contrato, ItemContrato, Movimentacao, ContratoAditivo
from ..schemas import (
    ContratoCreate,
    ContratoUpdate,
    ContratoOut,
    ContratoDetalhadoOut,
    PrevisaoConsumoOut,
    ContratoAditivoIn,
)
from ..http_errors import http_erro_interno
from ..services.aditivo import aplicar_aditivo_item, valor_total_inicial_itens, valor_total_itens
from ..services.arquivos import caminho_upload_seguro
from ..core.audit import registrar_auditoria, get_client_ip

router = APIRouter(
    prefix="/api/v1/contratos",
    tags=["Contratos"],
    dependencies=[Depends(get_current_active_user)],
)

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "contratos"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _resumo_contrato(contrato: Contrato, qtd_itens: int | None = None) -> dict:
    return {
        "numero": contrato.numero,
        "ano": contrato.ano,
        "fornecedor_id": contrato.fornecedor_id,
        "objeto": contrato.objeto,
        "valor_total": contrato.valor_total,
        "situacao": contrato.situacao,
        **({"qtd_itens": qtd_itens} if qtd_itens is not None else {}),
    }


@router.post("/", response_model=ContratoOut, dependencies=[Depends(require_gestao_contratos)])
async def create_contrato(
    contrato: ContratoCreate,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
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
                marca=item.marca,
                observacao=item.observacao,
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
        await db.flush()
        await registrar_auditoria(
            db,
            usuario_id=current_user.id,
            operacao="INSERT",
            tabela="contratos",
            registro_id=str(db_contrato.id),
            dados_novos=_resumo_contrato(db_contrato, qtd_itens=len(itens_depois)),
            ip=get_client_ip(request),
        )
        await db.commit()
        await db.refresh(db_contrato)
        return db_contrato
    except Exception as e:
        await db.rollback()
        raise http_erro_interno(e)

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


@router.patch("/{contrato_id}", response_model=ContratoDetalhadoOut, dependencies=[Depends(require_gestao_contratos)])
async def update_contrato(
    contrato_id: int,
    contrato_in: ContratoUpdate,
    request: Request,
    current_user: CurrentUser,
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

    anteriores = _resumo_contrato(contrato, qtd_itens=len(contrato.itens or []))

    dados = contrato_in.model_dump(exclude_unset=True, exclude={"itens"})
    for campo, valor in dados.items():
        setattr(contrato, campo, valor)
    if contrato.data_inicio and "ano" not in contrato_in.model_fields_set:
        if "data_inicio" in contrato_in.model_fields_set:
            contrato.ano = contrato.data_inicio.year
    if contrato.data_inicio and contrato.data_fim and contrato.data_fim < contrato.data_inicio:
        raise HTTPException(
            status_code=400,
            detail="A data de vigência final deve ser igual ou posterior à inicial",
        )

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
                if "codigo" in item_in.model_fields_set:
                    item.codigo = item_in.codigo
                if "marca" in item_in.model_fields_set:
                    item.marca = item_in.marca
                if "observacao" in item_in.model_fields_set:
                    item.observacao = item_in.observacao
                if item_in.numero_item is not None:
                    item.numero_item = item_in.numero_item
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
                    numero_item=item_in.numero_item or proximo_numero,
                    codigo=item_in.codigo,
                    descricao=item_in.descricao,
                    unidade=item_in.unidade,
                    marca=item_in.marca,
                    observacao=item_in.observacao,
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
        await registrar_auditoria(
            db,
            usuario_id=current_user.id,
            operacao="UPDATE",
            tabela="contratos",
            registro_id=str(contrato.id),
            dados_anteriores=anteriores,
            dados_novos=_resumo_contrato(contrato, qtd_itens=len(itens_depois)),
            ip=get_client_ip(request),
        )
        await db.commit()
        result = await db.execute(
            select(Contrato)
            .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
            .where(Contrato.id == contrato.id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise http_erro_interno(e)


@router.post("/{contrato_id}/aditivo", response_model=ContratoDetalhadoOut, dependencies=[Depends(require_gestao_contratos)])
async def aditivar_contrato(
    contrato_id: int,
    body: ContratoAditivoIn,
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contrato)
        .options(
            selectinload(Contrato.itens),
            selectinload(Contrato.fornecedor),
            selectinload(Contrato.aditivos),
        )
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
    aditivos = []
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
        aditivos.append({
            "item_id": item.id,
            "quantidade_aditivada": item_in.quantidade_aditivada,
            "valor_unitario": item_in.valor_unitario,
        })

    registro_aditivo = ContratoAditivo(
        contrato_id=contrato.id,
        data_inicio=body.data_inicio,
        data_fim=body.data_fim,
        usuario_id=current_user.id,
    )
    db.add(registro_aditivo)

    # Prorroga a vigência do contrato quando o aditivo termina depois.
    if contrato.data_fim is None or body.data_fim > contrato.data_fim:
        contrato.data_fim = body.data_fim
    if contrato.data_inicio is None:
        contrato.data_inicio = body.data_inicio

    contrato.valor_total = valor_total_itens(contrato.itens)

    try:
        await registrar_auditoria(
            db,
            usuario_id=current_user.id,
            operacao="UPDATE",
            tabela="contratos",
            registro_id=str(contrato.id),
            dados_novos={
                "operacao": "aditivo",
                "itens": aditivos,
                "valor_total": contrato.valor_total,
                "data_inicio": str(body.data_inicio),
                "data_fim": str(body.data_fim),
            },
            ip=get_client_ip(request),
        )
        await db.commit()
        result = await db.execute(
            select(Contrato)
            .options(
                selectinload(Contrato.itens),
                selectinload(Contrato.fornecedor),
                selectinload(Contrato.aditivos),
            )
            .where(Contrato.id == contrato.id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        raise http_erro_interno(e)


@router.post(
    "/{contrato_id}/arquivo",
    response_model=ContratoDetalhadoOut,
    dependencies=[Depends(require_gestao_contratos)],
)
async def enviar_arquivo_contrato(
    contrato_id: int,
    request: Request,
    current_user: CurrentUser,
    arquivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Anexa ou substitui o PDF do contrato."""
    nome = (arquivo.filename or "").lower()
    if not nome.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Envie um arquivo PDF do contrato.")

    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
        .where(Contrato.id == contrato_id)
    )
    contrato = (await db.execute(stmt)).scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    caminho_antigo = contrato.arquivo_pdf_path
    file_path = caminho_upload_seguro(UPLOAD_DIR, arquivo.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await arquivo.read())

    contrato.arquivo_pdf_path = file_path
    try:
        await registrar_auditoria(
            db,
            usuario_id=current_user.id,
            operacao="UPDATE",
            tabela="contratos",
            registro_id=str(contrato.id),
            dados_novos={"arquivo_pdf": os.path.basename(file_path)},
            ip=get_client_ip(request),
        )
        await db.commit()
        if caminho_antigo and os.path.isfile(caminho_antigo) and caminho_antigo != file_path:
            try:
                os.remove(caminho_antigo)
            except OSError:
                pass
        result = await db.execute(
            select(Contrato)
            .options(selectinload(Contrato.itens), selectinload(Contrato.fornecedor))
            .where(Contrato.id == contrato.id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise http_erro_interno(e)


@router.get("/{contrato_id}/arquivo")
async def baixar_arquivo_contrato(contrato_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contrato).where(Contrato.id == contrato_id))
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if not contrato.arquivo_pdf_path:
        raise HTTPException(status_code=404, detail="Arquivo do contrato não disponível")

    caminho = os.path.abspath(contrato.arquivo_pdf_path)
    pasta_uploads = os.path.abspath(UPLOAD_DIR)
    try:
        comum = os.path.commonpath([caminho, pasta_uploads])
    except ValueError:
        comum = ""
    if comum != pasta_uploads or not os.path.isfile(caminho):
        raise HTTPException(status_code=404, detail="Arquivo do contrato não encontrado")

    nome = os.path.basename(caminho)
    prefixo, _, resto = nome.partition("_")
    if resto and prefixo.isdigit():
        nome = resto
    if not nome.lower().endswith(".pdf"):
        nome = f"contrato-{contrato.numero}-{contrato.ano}.pdf"
    return FileResponse(caminho, filename=nome, media_type="application/pdf")
