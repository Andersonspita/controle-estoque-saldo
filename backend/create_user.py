import asyncio
import os
import sys

from dotenv import load_dotenv
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.future import select

from src.database.models import Usuario

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/controle_estoque",
)
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


async def main() -> None:
    email = (os.getenv("ADMIN_EMAIL") or "").strip()
    senha = os.getenv("ADMIN_PASSWORD") or ""
    nome = (os.getenv("ADMIN_NOME") or "Administrador").strip() or "Administrador"

    if not email or not senha:
        print("Defina ADMIN_EMAIL e ADMIN_PASSWORD.", file=sys.stderr)
        raise SystemExit(1)
    if len(senha) < 8:
        print("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.", file=sys.stderr)
        raise SystemExit(1)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Usuario).where(Usuario.email == email))
        if result.scalars().first():
            print(f"Usuário {email} já existe; nada a fazer.")
            return

        session.add(
            Usuario(
                nome=nome,
                email=email,
                senha_hash=password_hash.hash(senha),
                perfil="ADMIN",
                ativo=True,
            )
        )
        await session.commit()
        print(f"Administrador {email} criado.")


if __name__ == "__main__":
    asyncio.run(main())
