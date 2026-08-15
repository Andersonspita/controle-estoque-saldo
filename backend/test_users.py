import asyncio
from src.database.session import engine
from src.database.models import Usuario
from sqlalchemy.future import select

async def run():
    async with engine.begin() as conn:
        result = await conn.execute(select(Usuario.email))
        print("Usuários no BD:", result.fetchall())

asyncio.run(run())
