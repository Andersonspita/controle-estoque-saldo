from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, EmailStr

from ..database.models import Usuario
from ..deps import get_current_active_user, is_admin

router = APIRouter(prefix="/users", tags=["users"])


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = None
    perfil: str

    model_config = ConfigDict(from_attributes=True)


@router.get("/me", response_model=UserPublic)
async def read_user_me(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
) -> Any:
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.ativo,
        is_superuser=is_admin(current_user),
        full_name=current_user.nome,
        perfil=(current_user.perfil or "").upper(),
    )
