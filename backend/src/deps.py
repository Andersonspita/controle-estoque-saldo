from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import ALGORITHM

from .database.session import get_db
from .database.models import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login/access-token")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Não foi possível validar as credenciais",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Usuario:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if subject is None:
            raise CREDENTIALS_EXCEPTION
        user_id = int(subject)
    except (InvalidTokenError, ValueError, TypeError):
        raise CREDENTIALS_EXCEPTION

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalars().first()
    if not user:
        raise CREDENTIALS_EXCEPTION
    if not user.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    return user


async def get_current_active_user(
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> Usuario:
    return current_user


CurrentUser = Annotated[Usuario, Depends(get_current_active_user)]
