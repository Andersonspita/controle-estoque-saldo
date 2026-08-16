from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from ..database.session import get_db
from ..database.models import Usuario
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from ..services.login_throttle import (
    login_bloqueado,
    registrar_falha_login,
    limpar_falhas_login,
)

router = APIRouter(prefix="/login", tags=["login"])

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/access-token", response_model=Token)
async def login_access_token(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    ip = request.client.host if request.client else "desconhecido"
    chave = f"{ip}:{form_data.username.strip().lower()}"
    if login_bloqueado(chave):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde alguns minutos.",
        )

    result = await session.execute(select(Usuario).where(Usuario.email == form_data.username))
    user = result.scalars().first()

    senha_ok = False
    if user:
        verificacao = verify_password(form_data.password, user.senha_hash)
        senha_ok = verificacao[0] if isinstance(verificacao, tuple) else bool(verificacao)

    if not user or not senha_ok:
        registrar_falha_login(chave)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.ativo:
        raise HTTPException(status_code=400, detail="Inactive user")

    limpar_falhas_login(chave)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return Token(access_token=access_token)
