from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from src.deps import get_current_active_user, get_current_user
from src.main import app


def _fake_user(perfil: str = "ADMIN", user_id: int = 1):
    return SimpleNamespace(
        id=user_id,
        email="teste@example.com" if perfil == "ADMIN" else "operador@example.com",
        ativo=True,
        perfil=perfil,
        nome="Usuário de Teste",
    )


def _override_auth(user):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_active_user] = lambda: user


@pytest.fixture(autouse=True)
def auth_override(request):
    if request.node.get_closest_marker("no_auth_override"):
        yield
        return

    _override_auth(_fake_user("ADMIN"))
    yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.fixture
def as_operador():
    _override_auth(_fake_user("OPERADOR", user_id=2))
    yield


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
