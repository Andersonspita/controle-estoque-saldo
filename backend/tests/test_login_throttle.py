from src.services.login_throttle import (
    login_bloqueado,
    registrar_falha_login,
    limpar_falhas_login,
)


def test_login_bloqueia_depois_de_varias_falhas():
    chave = "teste:rate-limit"
    limpar_falhas_login(chave)
    assert login_bloqueado(chave) is False
    for _ in range(5):
        registrar_falha_login(chave)
    assert login_bloqueado(chave) is True
    limpar_falhas_login(chave)
    assert login_bloqueado(chave) is False
