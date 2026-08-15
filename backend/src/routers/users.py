from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, EmailStr

from ..database.models import Usuario
from ..deps import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/me", response_model=UserPublic)
async def read_user_me(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
) -> Any:
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.ativo,
        is_superuser=(current_user.perfil == "ADMIN"),
        full_name=current_user.nome,
    )
