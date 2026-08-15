from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware

from .routers import fornecedores, licitacoes, contratos, notas_fiscais, movimentacoes, almoxarifados, auth, users

def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        # Pega a primeira tag e formata no estilo camelCase (ou como esperado)
        # O FastAPI + openapi-ts lida melhor quando é no formato Tag-OperationId
        return f"{route.tags[0]}-{route.name}"
    return route.name

app = FastAPI(
    title="Sistema Web de Controle de Estoque e Saldos de Contratos de Licitação",
    description="API para gestão de contratos, itens e baixas de saldo via NF-e",
    version="1.0.0",
    generate_unique_id_function=custom_generate_unique_id
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrando os routers
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
