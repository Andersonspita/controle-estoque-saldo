from fastapi.testclient import TestClient
import json
import os
import sys

# To run this from backend folder
sys.path.insert(0, os.path.dirname(__file__))

from src.main import app

client = TestClient(app)

def run_test():
    print("--- Testando Importação de Nota Fiscal ---")
    
    # Criar um PDF falso na memória para upload
    fake_pdf_content = b"%PDF-1.4\n%Fake PDF content for testing..."
    files = {
        "arquivo_pdf": ("nota_fiscal_teste.pdf", fake_pdf_content, "application/pdf")
    }

    # Dados da NF extraídos (Mock)
    nf_data = {
        "contrato_id": 1,
        "fornecedor_id": 1,
        "numero": "999888",
        "serie": "1",
        "chave_acesso": "35231012345678000199550010009998881001234567",
        "data_emissao": "2026-08-13",
        "valor_total": 5000.0,
        "itens": [
            {
                "codigo": "COMP-001",
                "descricao": "Computador Desktop I7",
                "quantidade": 2,
                "unidade": "UN",
                "valor_unitario": 2500.0
            }
        ]
    }

    data = {
        "nota_fiscal_data": json.dumps(nf_data)
    }

    response = client.post("/api/v1/notas-fiscais/importar", files=files, data=data)
    
    if response.status_code == 200:
        nf = response.json()
        print(f"Sucesso! Nota Fiscal criada com ID: {nf['id']} e status: {nf['status']}")
        print(f"Itens salvos: {len(nf['itens'])}")
        print(f"Arquivo PDF salvo em: {nf['arquivo_pdf_path']}")
    else:
        print(f"Falha ao criar nota fiscal: {response.status_code} - {response.text}")

if __name__ == "__main__":
    run_test()
