from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
import os

from .routers import fornecedores, licitacoes, contratos, notas_fiscais, movimentacoes, almoxarifados, auth, users


def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name


def _cors_origins() -> list[str]:
    raw = os.getenv("FRONTEND_HOST", "http://localhost:5173")
    origins = []
    for item in raw.split(","):
        origin = item.strip().rstrip("/")
        if origin:
            origins.append(origin)
    if "http://localhost:5173" not in origins:
        origins.append("http://localhost:5173")
    return origins


app = FastAPI(
    title="SaldoContratual",
    description="API de gestão de saldos e itens de contratos de licitação",
    version="1.0.0",
    generate_unique_id_function=custom_generate_unique_id,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fornecedores.router)
app.include_router(licitacoes.router)
app.include_router(contratos.router)
app.include_router(notas_fiscais.router)
app.include_router(movimentacoes.router)
app.include_router(almoxarifados.router)
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API rodando perfeitamente"}
