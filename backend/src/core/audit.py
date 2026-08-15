from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.models import LogAuditoria
import json

async def registrar_auditoria(
    db: AsyncSession,
    usuario_id: int,
    operacao: str,
    tabela: str,
    registro_id: str,
    dados_anteriores: dict = None,
    dados_novos: dict = None,
    ip: str = None
):
    log = LogAuditoria(
        usuario_id=usuario_id,
        operacao=operacao,
        tabela=tabela,
        registro_id=registro_id,
        dados_anteriores=dados_anteriores,
        dados_novos=dados_novos,
        ip=ip
    )
    db.add(log)
    # The commit is expected to be handled by the caller transaction

def get_client_ip(request: Request):
    if request.client:
        return request.client.host
    return None
