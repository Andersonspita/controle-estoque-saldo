import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.database.models import Fornecedor, Licitacao, Contrato, ItemContrato, Usuario
from src.database.session import DATABASE_URL
from src.schemas import BaixaRequest
from fastapi.testclient import TestClient
from src.main import app
from datetime import date
import json

client = TestClient(app)

async def setup_db_for_test():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        from sqlalchemy.future import select
        
        # Tenta buscar ou criar Fornecedor
        result = await session.execute(select(Fornecedor).where(Fornecedor.cnpj == "11.222.333/0001-44"))
        forn = result.scalar_one_or_none()
        if not forn:
            usu = Usuario(nome="Gestor", email="gestor@teste.com", senha_hash="xxx", perfil="Gestor")
            session.add(usu)
            forn = Fornecedor(razao_social="Super Tech", cnpj="11.222.333/0001-44", email="contato@supertech.com")
            session.add(forn)
            lic = Licitacao(numero="005/2026", ano=2026, modalidade="Pregão", objeto="Hardware", situacao="Ativa")
            session.add(lic)
            await session.flush()
            cont = Contrato(licitacao_id=lic.id, fornecedor_id=forn.id, numero="CT-999/2026", ano=2026, valor_total=10000.0, situacao="Ativo")
            session.add(cont)
            await session.flush()
            item_c = ItemContrato(contrato_id=cont.id, numero_item=1, codigo="MON-001", descricao="Monitor 24'", unidade="UN", quantidade_contratada=10, valor_unitario=1000.0, saldo_atual=10.0)
            session.add(item_c)
            await session.commit()
            return cont.id, forn.id, item_c.id, usu.id
        else:
            # Se já existir, recupera os IDs existentes
            result_cont = await session.execute(select(Contrato).where(Contrato.fornecedor_id == forn.id))
            cont = result_cont.scalar_one()
            result_item_c = await session.execute(select(ItemContrato).where(ItemContrato.contrato_id == cont.id))
            item_c = result_item_c.scalar_one()
            result_usu = await session.execute(select(Usuario).where(Usuario.email == "gestor@teste.com"))
            usu = result_usu.scalar_one()
            
            # Reseta o saldo para 10 para rodar o teste
            item_c.saldo_atual = 10.0
            await session.commit()
            return cont.id, forn.id, item_c.id, usu.id

def run_test(cont_id, forn_id, item_c_id, usu_id):
    print("--- Importando NF com 5 itens (sucesso esperado) ---")
    
    fake_pdf = b"%PDF Fake"
    files = {"arquivo_pdf": ("nota.pdf", fake_pdf, "application/pdf")}
    
    nf_data = {
        "contrato_id": cont_id,
        "fornecedor_id": forn_id,
        "numero": "111222",
        "itens": [
            {
                "codigo": "MON-001",
                "descricao": "Monitor 24'",
                "quantidade": 5.0,
                "unidade": "UN",
                "valor_unitario": 1000.0,
                "item_contrato_id": item_c_id
            }
        ]
    }
    
    data = {"nota_fiscal_data": json.dumps(nf_data)}
    resp_import = client.post("/api/v1/notas-fiscais/importar", files=files, data=data)
    nf_id = resp_import.json()["id"]
    print(f"NF Importada: {nf_id}")
    
    print("\n--- Baixando NF (deve deduzir 5 do saldo) ---")
    baixa_req = {"justificativa": "", "usuario_id": usu_id}
    resp_baixa = client.post(f"/api/v1/notas-fiscais/{nf_id}/baixar", json=baixa_req)
    print(f"Status: {resp_baixa.status_code}")
    print(f"Movimentacoes geradas: {len(resp_baixa.json())}")
    for mov in resp_baixa.json():
        print(f"Saldo Anterior: {mov['saldo_anterior']} -> Saldo Posterior: {mov['saldo_posterior']}")

    print("\n--- Tentando Baixar de novo (deve falhar) ---")
    resp_baixa2 = client.post(f"/api/v1/notas-fiscais/{nf_id}/baixar", json=baixa_req)
    print(f"Status: {resp_baixa2.status_code} - Msg: {resp_baixa2.json()}")

    print("\n--- Importando NF Estourando o Saldo (Tentando baixar 6, saldo restante é 5) ---")
    nf_data2 = nf_data.copy()
    nf_data2["numero"] = "222333"
    nf_data2["itens"][0]["quantidade"] = 6.0
    data2 = {"nota_fiscal_data": json.dumps(nf_data2)}
    resp_import2 = client.post("/api/v1/notas-fiscais/importar", files=files, data=data2)
    nf_id2 = resp_import2.json()["id"]
    
    resp_baixa_estouro = client.post(f"/api/v1/notas-fiscais/{nf_id2}/baixar", json=baixa_req)
    print(f"Status esperado (422): {resp_baixa_estouro.status_code}")
    print(f"Mensagem: {resp_baixa_estouro.json()}")

async def main():
    ids = await setup_db_for_test()
    run_test(*ids)

if __name__ == "__main__":
    asyncio.run(main())
