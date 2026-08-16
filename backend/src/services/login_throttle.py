from collections import defaultdict
from threading import Lock
from time import time

JANELA_SEGUNDOS = 15 * 60
MAX_FALHAS = 5

_lock = Lock()
_falhas: dict[str, list[float]] = defaultdict(list)


def _podar(tempos: list[float]) -> list[float]:
    limite = time() - JANELA_SEGUNDOS
    return [t for t in tempos if t > limite]


def login_bloqueado(chave: str) -> bool:
    with _lock:
        _falhas[chave] = _podar(_falhas[chave])
        return len(_falhas[chave]) >= MAX_FALHAS


def registrar_falha_login(chave: str) -> None:
    with _lock:
        _falhas[chave] = _podar(_falhas[chave])
        _falhas[chave].append(time())


def limpar_falhas_login(chave: str) -> None:
    with _lock:
        _falhas.pop(chave, None)
