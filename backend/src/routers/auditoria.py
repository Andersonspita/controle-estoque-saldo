from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ..database.models import LogAuditoria, Usuario
from ..database.session import get_db
from ..deps import get_current_active_user, require_admin
from ..schemas import LogAuditoriaOut

router = APIRouter(
    prefix="/api/v1/auditoria",
    tags=["Auditoria"],
    dependencies=[Depends(get_current_active_user), Depends(require_admin)],
)


@router.get("/", response_model=List[LogAuditoriaOut])
async def listar_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tabela: Optional[str] = Query(None),
    operacao: Optional[str] = Query(None),
    usuario_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista o log de inclusão/alteração/exclusão. Somente ADMIN."""
    usuario = aliased(Usuario)
    stmt = (
        select(
            LogAuditoria,
            usuario.nome,
            usuario.email,
        )
        .outerjoin(usuario, usuario.id == LogAuditoria.usuario_id)
        .order_by(LogAuditoria.data_hora.desc(), LogAuditoria.id.desc())
        .offset(skip)
        .limit(limit)
    )
    if tabela:
        stmt = stmt.where(LogAuditoria.tabela == tabela)
    if operacao:
        stmt = stmt.where(LogAuditoria.operacao == operacao.upper())
    if usuario_id is not None:
        stmt = stmt.where(LogAuditoria.usuario_id == usuario_id)

    result = await db.execute(stmt)
    rows = result.all()
    return [
        LogAuditoriaOut(
            id=log.id,
            usuario_id=log.usuario_id,
            usuario_nome=nome,
            usuario_email=email,
            operacao=log.operacao,
            tabela=log.tabela,
            registro_id=log.registro_id,
            dados_anteriores=log.dados_anteriores,
            dados_novos=log.dados_novos,
            data_hora=log.data_hora,
            ip=log.ip,
        )
        for log, nome, email in rows
    ]
