import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def create_db():
    # Connects to the default 'postgres' database to issue the CREATE DATABASE command
    engine = create_async_engine("postgresql+asyncpg://postgres:0134679Ab%40@localhost:5432/postgres", isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        try:
            await conn.execute(text("CREATE DATABASE controle_estoque;"))
            print("Database controle_estoque criado com sucesso!")
        except Exception as e:
            print(f"Banco já existe ou erro: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_db())
