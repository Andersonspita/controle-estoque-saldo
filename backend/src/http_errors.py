import logging

from fastapi import HTTPException

logger = logging.getLogger("saldocontratual")

MENSAGEM_GENERICA = "Não foi possível concluir a operação. Tente novamente."


def http_erro_interno(exc: Exception) -> HTTPException:
    logger.exception("Erro interno ao persistir dados")
    return HTTPException(status_code=400, detail=MENSAGEM_GENERICA)
