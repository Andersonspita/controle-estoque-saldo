import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.database.models import Usuario
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/controle_estoque")
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))

async def main():
    async with AsyncSessionLocal() as session:
        email = "andersonspita87@gmail.com"
        senha = "0134679Ab@"
        hashed = password_hash.hash(senha)
        
        user = Usuario(
            nome="Anderson Spita",
            email=email,
            senha_hash=hashed,
            perfil="ADMIN",
            ativo=True
        )
        session.add(user)
        await session.commit()
        print(f"User {email} created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
