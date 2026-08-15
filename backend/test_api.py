from fastapi.testclient import TestClient
from src.main import app
import sys

client = TestClient(app)

def run_tests():
    print("--- Testando Criação de Fornecedor ---")
    fornecedor_data = {
        "razao_social": "Tech LTDA",
        "nome_fantasia": "Tech Solutions",
        "cnpj": "12.345.678/0001-99",
        "email": "contato@tech.com"
    }
    response = client.post("/api/v1/fornecedores/", json=fornecedor_data)
    if response.status_code == 200:
        forn = response.json()
        print(f"Sucesso! Fornecedor criado com ID: {forn['id']}")
    else:
        print(f"Falha ao criar fornecedor: {response.text}")
        sys.exit(1)

    print("\n--- Testando Criação de Licitação ---")
    licitacao_data = {
        "numero": "001/2026",
        "ano": 2026,
        "modalidade": "Pregão Eletrônico",
        "objeto": "Aquisição de computadores",
        "situacao": "Ativa"
    }
    response = client.post("/api/v1/licitacoes/", json=licitacao_data)
    if response.status_code == 200:
        lic = response.json()
        print(f"Sucesso! Licitação criada com ID: {lic['id']}")
    else:
        print(f"Falha ao criar licitação: {response.text}")
        sys.exit(1)

    print("\n--- Testando Criação de Contrato ---")
    contrato_data = {
        "licitacao_id": lic['id'],
        "fornecedor_id": forn['id'],
        "numero": "CT-015/2026",
        "ano": 2026,
        "valor_total": 150000.00,
        "situacao": "Ativo"
    }
    response = client.post("/api/v1/contratos/", json=contrato_data)
    if response.status_code == 200:
        cont = response.json()
        print(f"Sucesso! Contrato criado com ID: {cont['id']}")
    else:
        print(f"Falha ao criar contrato: {response.text}")

    print("\n--- Listando Fornecedores ---")
    response = client.get("/api/v1/fornecedores/")
    print(response.json())

if __name__ == "__main__":
    # TestClient in FastAPI with async SQLAlchemy can sometimes be tricky
    # if we don't configure event loops properly. Let's see if it works out of the box.
    run_tests()
