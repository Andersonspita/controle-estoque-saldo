import pytest
from pydantic import ValidationError

from src.schemas import FornecedorCreate
from src.services.documento import cnpj_valido, cpf_valido, formatar_cpf_cnpj


def test_cnpj_valido_conhecido():
    assert cnpj_valido("11444777000161")
    assert formatar_cpf_cnpj("11444777000161") == "11.444.777/0001-61"


def test_cnpj_invalido_rejeitado():
    assert not cnpj_valido("00000000000000")
    assert not cnpj_valido("12345678000100")


def test_cpf_valido_conhecido():
    assert cpf_valido("39053344705")
    assert formatar_cpf_cnpj("39053344705") == "390.533.447-05"


def test_cpf_invalido_rejeitado():
    assert not cpf_valido("11111111111")
    assert not cpf_valido("12345678900")


def test_fornecedor_create_formata_cnpj():
    fornecedor = FornecedorCreate(razao_social="ACME", cnpj="11444777000161")
    assert fornecedor.cnpj == "11.444.777/0001-61"


def test_fornecedor_create_formata_cpf():
    fornecedor = FornecedorCreate(razao_social="Pessoa Física", cnpj="39053344705")
    assert fornecedor.cnpj == "390.533.447-05"


def test_fornecedor_create_rejeita_documento_invalido():
    with pytest.raises(ValidationError):
        FornecedorCreate(razao_social="Inválido", cnpj="00000000000000")
