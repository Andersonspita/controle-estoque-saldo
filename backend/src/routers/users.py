from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_password_hash, verify_password

from ..database.models import Usuario
from ..database.session import get_db
from ..deps import CurrentUser, RequireAdmin, get_current_active_user, is_admin, require_admin

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_active_user)],
)


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = None
    perfil: str
    pode_estornar: bool = False

    model_config = ConfigDict(from_attributes=True)


class UsersPublic(BaseModel):
    data: list[UserPublic]
    count: int


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    perfil: Literal["ADMIN", "OPERADOR"] | None = None
    pode_estornar: bool = False


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    full_name: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    perfil: Literal["ADMIN", "OPERADOR"] | None = None
    pode_estornar: bool | None = None


class UserUpdateMe(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None


class UpdatePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class Message(BaseModel):
    message: str


def _to_public(user: Usuario) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        is_active=bool(user.ativo),
        is_superuser=is_admin(user),
        full_name=user.nome,
        perfil=(user.perfil or "").upper(),
        pode_estornar=is_admin(user) or bool(user.pode_estornar),
    )


def _resolve_perfil(
    *,
    perfil: str | None,
    is_superuser: bool | None,
    atual: str | None = None,
) -> str:
    if perfil:
        return perfil.upper()
    if is_superuser is True:
        return "ADMIN"
    if is_superuser is False:
        return "OPERADOR"
    if atual:
        return atual.upper()
    return "OPERADOR"


async def _email_em_uso(
    db: AsyncSession, email: str, *, exclude_id: int | None = None
) -> bool:
    stmt = select(Usuario).where(Usuario.email == email)
    if exclude_id is not None:
        stmt = stmt.where(Usuario.id != exclude_id)
    result = await db.execute(stmt)
    return result.scalars().first() is not None


async def _contar_admins(db: AsyncSession, *, exclude_id: int | None = None) -> int:
    stmt = select(func.count()).select_from(Usuario).where(
        func.upper(Usuario.perfil) == "ADMIN"
    )
    if exclude_id is not None:
        stmt = stmt.where(Usuario.id != exclude_id)
    return int((await db.execute(stmt)).scalar_one())


async def _get_usuario(db: AsyncSession, user_id: int) -> Usuario:
    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.get("/me", response_model=UserPublic)
async def read_user_me(current_user: CurrentUser) -> Any:
    return _to_public(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_user_me(
    user_in: UserUpdateMe,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    if user_in.email and await _email_em_uso(
        db, user_in.email, exclude_id=current_user.id
    ):
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail")
    if user_in.email:
        current_user.email = user_in.email
    if user_in.full_name is not None:
        current_user.nome = user_in.full_name.strip() or current_user.nome
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return _to_public(current_user)


@router.patch("/me/password", response_model=Message)
async def update_password_me(
    body: UpdatePassword,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    verificacao = verify_password(body.current_password, current_user.senha_hash)
    senha_ok = verificacao[0] if isinstance(verificacao, tuple) else bool(verificacao)
    if not senha_ok:
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="A nova senha não pode ser igual à atual"
        )
    current_user.senha_hash = get_password_hash(body.new_password)
    db.add(current_user)
    await db.commit()
    return Message(message="Senha atualizada")


@router.get("/", response_model=UsersPublic, dependencies=[Depends(require_admin)])
async def read_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    total = int((await db.execute(select(func.count()).select_from(Usuario))).scalar_one())
    result = await db.execute(
        select(Usuario).order_by(Usuario.id.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return UsersPublic(data=[_to_public(user) for user in users], count=total)


@router.post("/", response_model=UserPublic, dependencies=[Depends(require_admin)])
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    if await _email_em_uso(db, user_in.email):
        raise HTTPException(
            status_code=400, detail="Já existe um usuário com este e-mail"
        )
    perfil = _resolve_perfil(perfil=user_in.perfil, is_superuser=user_in.is_superuser)
    user = Usuario(
        nome=(user_in.full_name or "").strip() or user_in.email.split("@")[0],
        email=user_in.email,
        senha_hash=get_password_hash(user_in.password),
        perfil=perfil,
        ativo=user_in.is_active,
        pode_estornar=user_in.pode_estornar,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _to_public(user)


@router.patch("/{user_id}", response_model=UserPublic, dependencies=[Depends(require_admin)])
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    user = await _get_usuario(db, user_id)
    if user_in.email and await _email_em_uso(db, user_in.email, exclude_id=user.id):
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail")

    novo_perfil = _resolve_perfil(
        perfil=user_in.perfil,
        is_superuser=user_in.is_superuser,
        atual=user.perfil,
    )
    novo_ativo = user.ativo if user_in.is_active is None else user_in.is_active
    era_admin = is_admin(user)
    deixa_de_ser_admin = era_admin and (novo_perfil != "ADMIN" or not novo_ativo)
    if deixa_de_ser_admin and await _contar_admins(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Não é possível remover o último administrador",
        )

    if user_in.email:
        user.email = user_in.email
    if user_in.full_name is not None:
        user.nome = user_in.full_name.strip() or user.nome
    if user_in.password:
        if len(user_in.password) < 8:
            raise HTTPException(
                status_code=400, detail="A senha deve ter pelo menos 8 caracteres"
            )
        user.senha_hash = get_password_hash(user_in.password)
    if user_in.is_active is not None:
        user.ativo = user_in.is_active
    if user_in.pode_estornar is not None:
        user.pode_estornar = user_in.pode_estornar
    user.perfil = novo_perfil

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _to_public(user)


@router.delete("/{user_id}", response_model=Message, dependencies=[Depends(require_admin)])
async def delete_user(
    user_id: int,
    current_user: RequireAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    if user_id == current_user.id:
        raise HTTPException(status_code=403, detail="Você não pode excluir a própria conta")
    user = await _get_usuario(db, user_id)
    if is_admin(user) and await _contar_admins(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir o último administrador",
        )
    db.delete(user)
    await db.commit()
    return Message(message="Usuário excluído")
