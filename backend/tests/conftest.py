from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from src.deps import get_current_active_user, get_current_user
from src.main import app


@pytest.fixture(autouse=True)
def auth_override(request):
    if request.node.get_closest_marker("no_auth_override"):
        yield
        return

    fake_user = SimpleNamespace(
        id=1,
        email="teste@example.com",
        ativo=True,
        perfil="ADMIN",
        nome="Usuário de Teste",
    )
    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_current_active_user] = lambda: fake_user
    yield
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest_asyncio.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
