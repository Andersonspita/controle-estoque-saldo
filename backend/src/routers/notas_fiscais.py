import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user
from ..database.models import NotaFiscal, ItemNotaFiscal, Contrato, Fornecedor, ItemContrato
from ..http_errors import http_erro_interno
from ..services.arquivos import caminho_upload_seguro
from ..schemas import (
    NotaFiscalCreate, ItemNotaFiscalCreate, NotaFiscalOut,
    VincularItensRequest, VincularItensResponse, ItemVinculoSugerido,
    AtualizarVinculosRequest,
)

router = APIRouter(
    prefix="/api/v1/notas-fiscais",
    tags=["Notas Fiscais"],
    dependencies=[Depends(get_current_active_user)],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "notas_fiscais")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[NotaFiscalOut])
async def list_notas_fiscais(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    stmt = select(NotaFiscal).options(selectinload(NotaFiscal.itens)).order_by(NotaFiscal.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{nf_id}/arquivo")
async def baixar_arquivo_nf(nf_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select

    result = await db.execute(select(NotaFiscal).where(NotaFiscal.id == nf_id))
    nf = result.scalar_one_or_none()
    if not nf:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    if not nf.arquivo_pdf_path:
        raise HTTPException(status_code=404, detail="Arquivo da nota fiscal não disponível")

    caminho = os.path.abspath(nf.arquivo_pdf_path)
    pasta_uploads = os.path.abspath(UPLOAD_DIR)
    try:
        comum = os.path.commonpath([caminho, pasta_uploads])
    except ValueError:
        comum = ""
    if comum != pasta_uploads or not os.path.isfile(caminho):
        raise HTTPException(status_code=404, detail="Arquivo da nota fiscal não encontrado")

    nome = os.path.basename(caminho)
    prefixo, _, resto = nome.partition("_")
    if resto and prefixo.isdigit():
        nome = resto
    media = "application/pdf" if nome.lower().endswith(".pdf") else None
    if nome.lower().endswith(".xml"):
        media = "application/xml"
    return FileResponse(caminho, filename=nome, media_type=media)

@router.patch("/{nf_id}/vinculos", response_model=NotaFiscalOut)
async def atualizar_vinculos_nf(
    nf_id: int,
    body: AtualizarVinculosRequest,
    db: AsyncSession = Depends(get_db),
):
    """Atualiza os vínculos NF × item do contrato em uma nota ainda não baixada."""
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload

    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.id == nf_id)
    )
    result = await db.execute(stmt)
    nf = result.scalar_one_or_none()
    if not nf:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    if nf.status == "Baixada":
        raise HTTPException(
            status_code=400,
            detail="Não é possível alterar vínculos de uma nota já baixada",
        )
    if not body.itens:
        raise HTTPException(status_code=400, detail="Informe ao menos um item para vincular")

    stmt_contrato = (
        select(Contrato)
        .options(selectinload(Contrato.itens))
        .where(Contrato.id == nf.contrato_id)
    )
    result_contrato = await db.execute(stmt_contrato)
    contrato = result_contrato.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato da nota não encontrado")

    ids_contrato = {item.id for item in contrato.itens}
    itens_por_id = {item.id: item for item in nf.itens}

    for vinculo in body.itens:
        item_nf = itens_por_id.get(vinculo.id)
        if not item_nf:
            raise HTTPException(
                status_code=400,
                detail=f"Item {vinculo.id} não pertence a esta nota fiscal",
            )
        if vinculo.item_contrato_id not in ids_contrato:
            raise HTTPException(
                status_code=400,
                detail=f"Item de contrato {vinculo.item_contrato_id} não pertence ao contrato da nota",
            )
        item_nf.item_contrato_id = vinculo.item_contrato_id
        item_nf.status_identificacao = "MANUAL"

    nf.status = "Aguardando conferência"
    await db.commit()

    stmt = select(NotaFiscal).options(selectinload(NotaFiscal.itens)).where(NotaFiscal.id == nf.id)
    result = await db.execute(stmt)
    return result.scalar_one()

@router.post("/importar", response_model=NotaFiscalOut)
async def importar_nota_fiscal(
    arquivo_pdf: UploadFile = File(...),
    nota_fiscal_data: str = Form(..., description="JSON contendo os dados da NotaFiscalCreate e um array 'itens' com ItemNotaFiscalCreate"),
    db: AsyncSession = Depends(get_db)
):
    # Parse JSON
    try:
        dados_json = json.loads(nota_fiscal_data)
        nf_create = NotaFiscalCreate(**dados_json)
        itens_create = [ItemNotaFiscalCreate(**item) for item in dados_json.get("itens", [])]
    except Exception:
        raise HTTPException(status_code=400, detail="Dados da nota fiscal inválidos.")

    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload

    stmt_contrato = (
        select(Contrato)
        .options(selectinload(Contrato.itens))
        .where(Contrato.id == nf_create.contrato_id)
    )
    result_contrato = await db.execute(stmt_contrato)
    contrato = result_contrato.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    ids_itens_contrato = {item.id for item in contrato.itens}
    for item in itens_create:
        if not item.item_contrato_id:
            raise HTTPException(
                status_code=400,
                detail=f"Item '{item.descricao}' não possui vínculo com item do contrato.",
            )
        if item.item_contrato_id not in ids_itens_contrato:
            raise HTTPException(
                status_code=400,
                detail=f"Item de contrato ID {item.item_contrato_id} não pertence ao contrato selecionado.",
            )
    
    # Salvar PDF/XML localmente, sem aceitar caminhos no nome enviado
    file_path = caminho_upload_seguro(UPLOAD_DIR, arquivo_pdf.filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await arquivo_pdf.read())

    # Inserir no Banco
    db_nf = NotaFiscal(
        **nf_create.model_dump(),
        arquivo_pdf_path=file_path,
        status="Aguardando conferência"
    )
    
    db.add(db_nf)
    try:
        await db.commit()
        await db.refresh(db_nf)
        
        # Inserir Itens
        for item in itens_create:
            db_item = ItemNotaFiscal(
                **item.model_dump(),
                nota_fiscal_id=db_nf.id
            )
            db.add(db_item)
            
        await db.commit()
        
        # Faz um select explícito com selectinload para evitar o MissingGreenlet do SQLAlchemy Async
        from sqlalchemy.future import select
        from sqlalchemy.orm import selectinload
        
        stmt = select(NotaFiscal).options(selectinload(NotaFiscal.itens)).where(NotaFiscal.id == db_nf.id)
        result = await db.execute(stmt)
        nf_loaded = result.scalar_one()
        
        return nf_loaded
    except Exception as e:
        await db.rollback()
        # Se falhou, remove o arquivo salvo
        if os.path.exists(file_path):
            os.remove(file_path)
        raise http_erro_interno(e)

from ..services.baixa_service import efetuar_baixa_nf
from ..schemas import BaixaRequest, MovimentacaoOut
from ..deps import CurrentUser

@router.post("/{nf_id}/baixar", response_model=List[MovimentacaoOut])
async def baixar_nota_fiscal(
    nf_id: int,
    baixa_req: BaixaRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    """
    Efetua a baixa da nota fiscal, deduzindo os itens do contrato e gerando as movimentações.
    Operação 100% transacional ACID (Tudo ou Nada).
    """
    movimentacoes = await efetuar_baixa_nf(nf_id, baixa_req, db, usuario_id=current_user.id)
    return movimentacoes

from ..services.nfe_parser import parse_nfe_xml
from ..services.nfe_pdf import parse_nfe_pdf
from ..services.item_matcher import vincular_itens_nf_contrato

@router.post("/vincular-itens/{contrato_id}", response_model=VincularItensResponse)
async def vincular_itens_nf(
    contrato_id: int,
    body: VincularItensRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Sugere vínculo entre itens da NF e itens do contrato selecionado,
    com base em código, GTIN e similaridade de descrição.
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Contrato)
        .options(selectinload(Contrato.itens))
        .where(Contrato.id == contrato_id)
    )
    result = await db.execute(stmt)
    contrato = result.scalar_one_or_none()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if not contrato.itens:
        raise HTTPException(status_code=400, detail="Contrato não possui itens cadastrados")

    itens_nf = [item.model_dump() for item in body.itens]
    vinculos_raw = vincular_itens_nf_contrato(itens_nf, contrato.itens)
    vinculos = [ItemVinculoSugerido(**v) for v in vinculos_raw]
    todos_vinculados = all(v.item_contrato_id is not None for v in vinculos)

    return VincularItensResponse(vinculos=vinculos, todos_vinculados=todos_vinculados)

@router.post("/parse-xml")
async def parse_xml_endpoint(arquivo_xml: UploadFile = File(...)):
    """
    Recebe um arquivo XML de Nota Fiscal Eletrônica e retorna
    os dados extraídos estruturados para preenchimento no frontend.
    """
    try:
        conteudo = await arquivo_xml.read()
        texto_xml = conteudo.decode("utf-8", errors="ignore")
        dados_extraidos = parse_nfe_xml(texto_xml)
        return dados_extraidos
    except Exception:
        raise HTTPException(status_code=400, detail="Não foi possível ler o XML da NF-e.")

@router.post("/parse-pdf")
async def parse_pdf_endpoint(arquivo_pdf: UploadFile = File(...)):
    """
    Recebe o PDF do DANFE, rasteriza a página e extrai os dados
    via OCR (mesmo formato do parse de XML).
    """
    try:
        conteudo = await arquivo_pdf.read()
        if not conteudo:
            raise ValueError("Arquivo PDF vazio")
        return parse_nfe_pdf(conteudo)
    except Exception:
        raise HTTPException(status_code=400, detail="Não foi possível ler o PDF da DANFE.")

