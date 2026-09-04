import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database.session import get_db
from ..deps import get_current_active_user, RequireEstorno
from ..database.models import NotaFiscal, ItemNotaFiscal, Contrato, Fornecedor, ItemContrato, Movimentacao, Usuario
from ..http_errors import http_erro_interno
from ..services.arquivos import caminho_upload_seguro
from ..services.nota_fiscal import persistir_nota_fiscal, atualizar_nota_fiscal
from ..schemas import (
    NotaFiscalCreate, ItemNotaFiscalCreate, NotaFiscalOut,
    NotaFiscalManualCreate,
    VincularItensRequest, VincularItensResponse, ItemVinculoSugerido,
    AtualizarVinculosRequest,
    EstornoRequest, ExclusaoRequest, NotaFiscalHistoricoOut,
)

logger = logging.getLogger(__name__)

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
    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.excluida_em.is_(None))
        .order_by(NotaFiscal.criado_em.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/historico", response_model=List[NotaFiscalHistoricoOut])
async def historico_notas_fiscais(db: AsyncSession = Depends(get_db)):
    """Notas estornadas ou excluídas, com quem fez a operação e por quê."""
    from sqlalchemy import or_
    from sqlalchemy.future import select

    stmt = (
        select(NotaFiscal)
        .where(
            or_(
                NotaFiscal.excluida_em.is_not(None),
                NotaFiscal.status == STATUS_ESTORNADA,
            )
        )
        .order_by(NotaFiscal.criado_em.desc())
    )
    notas = list((await db.execute(stmt)).scalars().all())
    if not notas:
        return []

    ids = [nf.id for nf in notas]
    stmt_mov = (
        select(Movimentacao)
        .where(
            Movimentacao.nota_fiscal_id.in_(ids),
            Movimentacao.tipo_movimento == "ESTORNO",
        )
        .order_by(Movimentacao.data_hora)
    )
    # Ordenado do mais antigo ao mais novo: sobra o último estorno de cada nota.
    ultimo_estorno = {
        mov.nota_fiscal_id: mov for mov in (await db.execute(stmt_mov)).scalars().all()
    }

    ids_usuarios = {nf.excluida_por for nf in notas if nf.excluida_por}
    ids_usuarios |= {mov.usuario_id for mov in ultimo_estorno.values()}
    nomes: dict[int, str] = {}
    if ids_usuarios:
        stmt_users = select(Usuario.id, Usuario.nome).where(Usuario.id.in_(ids_usuarios))
        nomes = {uid: nome for uid, nome in (await db.execute(stmt_users)).all()}

    historico = []
    for nf in notas:
        mov = ultimo_estorno.get(nf.id)
        historico.append(
            NotaFiscalHistoricoOut(
                id=nf.id,
                numero=nf.numero,
                serie=nf.serie,
                chave_acesso=nf.chave_acesso,
                data_emissao=nf.data_emissao,
                valor_total=nf.valor_total,
                contrato_id=nf.contrato_id,
                fornecedor_id=nf.fornecedor_id,
                status=nf.status,
                situacao="Excluída" if nf.excluida_em else "Estornada",
                excluida_em=nf.excluida_em,
                excluida_por_nome=nomes.get(nf.excluida_por),
                motivo_exclusao=nf.motivo_exclusao,
                estornada_em=mov.data_hora if mov else None,
                estornada_por_nome=nomes.get(mov.usuario_id) if mov else None,
                justificativa_estorno=mov.justificativa if mov else None,
            )
        )
    return historico

@router.post("/", response_model=NotaFiscalOut)
async def criar_nota_fiscal_manual(
    body: NotaFiscalManualCreate,
    db: AsyncSession = Depends(get_db),
):
    """Cadastra nota fiscal digitada. A importação por XML/PDF permanece em POST /importar."""
    nf_create = NotaFiscalCreate(**body.model_dump(exclude={"itens"}))
    return await persistir_nota_fiscal(db, nf_create, list(body.itens))

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

    file_path = caminho_upload_seguro(UPLOAD_DIR, arquivo_pdf.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await arquivo_pdf.read())

    try:
        return await persistir_nota_fiscal(
            db, nf_create, itens_create, arquivo_path=file_path
        )
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

from ..services.baixa_service import efetuar_baixa_nf
from ..services.estorno_service import estornar_baixa_nf, STATUS_ESTORNADA
from ..core.audit import registrar_auditoria
from ..database.models import utcnow
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


@router.put("/{nf_id}", response_model=NotaFiscalOut)
async def editar_nota_fiscal(
    nf_id: int,
    body: NotaFiscalManualCreate,
    db: AsyncSession = Depends(get_db),
):
    """Regrava cabeçalho e itens. Nota baixada precisa ser estornada antes."""
    nf_update = NotaFiscalCreate(**body.model_dump(exclude={"itens"}))
    return await atualizar_nota_fiscal(db, nf_id, nf_update, list(body.itens))


@router.post("/{nf_id}/estornar", response_model=List[MovimentacaoOut])
async def estornar_nota_fiscal(
    nf_id: int,
    body: EstornoRequest,
    current_user: RequireEstorno,
    db: AsyncSession = Depends(get_db),
):
    """
    Desfaz a baixa: devolve o saldo ao contrato, retira a quantidade do órgão
    de destino e registra a movimentação de ESTORNO. Depois disso a nota volta
    a poder ser editada, excluída ou baixada de novo.
    """
    return await estornar_baixa_nf(
        nf_id, body.justificativa, db, usuario_id=current_user.id
    )


@router.delete("/{nf_id}", response_model=NotaFiscalOut)
async def excluir_nota_fiscal(
    nf_id: int,
    body: ExclusaoRequest,
    current_user: RequireEstorno,
    db: AsyncSession = Depends(get_db),
):
    """
    Exclusão lógica: a nota sai das listas mas continua no histórico, com
    quem excluiu e por quê. Nota baixada precisa ser estornada antes, senão o
    saldo do contrato ficaria consumido por uma nota que não existe mais.
    """
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload

    stmt = (
        select(NotaFiscal)
        .options(selectinload(NotaFiscal.itens))
        .where(NotaFiscal.id == nf_id)
    )
    nf = (await db.execute(stmt)).scalar_one_or_none()
    if not nf or nf.excluida_em is not None:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    if nf.status == "Baixada":
        raise HTTPException(
            status_code=400,
            detail="Estorne a baixa antes de excluir esta nota fiscal.",
        )

    nf.excluida_em = utcnow()
    nf.excluida_por = current_user.id
    nf.motivo_exclusao = body.motivo

    await registrar_auditoria(
        db,
        usuario_id=current_user.id,
        operacao="DELETE",
        tabela="notas_fiscais",
        registro_id=str(nf.id),
        dados_anteriores={
            "numero": nf.numero,
            "serie": nf.serie,
            "chave_acesso": nf.chave_acesso,
            "valor_total": nf.valor_total,
            "status": nf.status,
        },
        dados_novos={"motivo_exclusao": body.motivo},
    )

    await db.commit()
    await db.refresh(nf)
    return nf

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
    except Exception as exc:
        logger.exception("Falha ao interpretar o XML da NF-e enviado")
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível ler o XML da NF-e: {exc}",
        )

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
    except Exception as exc:
        logger.exception(
            "Falha ao interpretar o PDF da DANFE enviado (%s)", arquivo_pdf.filename
        )
        raise HTTPException(
            status_code=400,
            detail=f"Não foi possível ler o PDF da DANFE: {exc}",
        )

