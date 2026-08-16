import asyncio
import os
import sys
from urllib.parse import quote_plus

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def create_db():
    senha = os.getenv("POSTGRES_PASSWORD")
    if not senha:
        print("Defina POSTGRES_PASSWORD.", file=sys.stderr)
        raise SystemExit(1)
    usuario = os.getenv("POSTGRES_USER", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    porta = os.getenv("POSTGRES_PORT", "5432")
    url = f"postgresql+asyncpg://{quote_plus(usuario)}:{quote_plus(senha)}@{host}:{porta}/postgres"
    engine = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        try:
            await conn.execute(text("CREATE DATABASE controle_estoque;"))
            print("Database controle_estoque criado com sucesso!")
        except Exception as e:
            print(f"Banco já existe ou erro: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_db())
