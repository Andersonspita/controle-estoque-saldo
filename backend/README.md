# SaldoContratual — Backend

API em **FastAPI** com SQLAlchemy assíncrono e PostgreSQL, gerenciada com [uv](https://docs.astral.sh/uv/).

Visão geral do produto: [README da raiz](../README.md). Endpoints, perfis e deploy: [docs/GUIA_TECNICO.md](../docs/GUIA_TECNICO.md).

## Requisitos

- [uv](https://docs.astral.sh/uv/) (instala o Python da versão em `.python-version`)
- [Docker](https://www.docker.com/) para o PostgreSQL local

## Rodar localmente

Na raiz do repositório, suba o banco:

```bash
docker compose up -d db
```

As configurações vêm do `.env` da **raiz** do repositório (`app/core/config.py` lê `../.env`). Variáveis obrigatórias: `SECRET_KEY`, `PROJECT_NAME`, `DATABASE_URL`, `FIRST_SUPERUSER` e `FIRST_SUPERUSER_PASSWORD`. Opcionais do cabeçalho do relatório: `ORGAO_NOME`, `ORGAO_ESTADO` e `ORGAO_SETOR`. Não commite o `.env`.

Depois, em `backend/`:

```bash
uv sync
uv run alembic upgrade head
uv run fastapi dev
```

No **Windows**, force UTF-8 antes do último comando:

```powershell
$env:PYTHONUTF8="1"; $env:PYTHONIOENCODING="utf-8"; uv run fastapi dev
```

- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

Para criar um usuário pelo terminal: `uv run python create_user.py`.

## Estrutura

O código do produto está em `src/`. A pasta `app/` ainda guarda a configuração (`app/core/config.py`), segurança e e-mail herdados do template FastAPI; as rotas e testes de `app/` e `tests/api`, `tests/crud` e `tests/scripts` são do template e não fazem parte do SaldoContratual.

| Caminho | Conteúdo |
|---------|----------|
| `src/main.py` | Aplicação FastAPI, CORS e registro das rotas |
| `src/routers/` | Rotas: `auth`, `users`, `fornecedores`, `contratos`, `notas_fiscais`, `movimentacoes`, `relatorios`, `auditoria`, `unidades`, `modalidades`, `licitacoes` |
| `src/services/` | Regras de negócio: baixa e estorno, aditivo, leitura de NF (`nfe_parser`, `nfe_pdf`, `danfe_parser`), vínculo NF × contrato (`item_matcher`), relatório de saldo, arquivos, CPF/CNPJ, unidades e modalidades |
| `src/database/models.py` | Modelos SQLAlchemy |
| `src/schemas.py` | Schemas Pydantic de entrada e saída |
| `src/deps.py` | Autenticação JWT e checagem de perfil/permissões |
| `src/core/audit.py` | Gravação do `log_auditoria` |
| `alembic/versions/` | Migrações do banco (as que valem para o produto) |

## Migrações

O Alembic usa `alembic/` (configurado em `alembic.ini`). Em produção, `scripts/prod-start.sh` roda `alembic upgrade head` a cada subida do container.

```bash
uv run alembic upgrade head                       # aplicar
uv run alembic revision -m "descricao_da_mudanca" # nova migração (edite o arquivo gerado)
uv run alembic heads                              # deve haver um único head
```

Cada migração nova precisa apontar `down_revision` para o head atual. Faça dump do banco antes de aplicar em produção (`docs/GUIA_TECNICO.md` §6.5).

## Testes

```bash
uv run pytest tests/test_*.py --ignore=tests/test_parse_pdf_endpoint.py
```

- `test_parse_pdf_endpoint.py` faz OCR em um PDF real (~20 s); rode à parte quando mexer na leitura de DANFE.
- Os testes de rota usam um usuário falso (`tests/conftest.py`); alguns poucos precisam do Postgres no ar.
- Sem `.env`, exporte as variáveis obrigatórias com valores de teste antes de rodar.

A lista dos testes por assunto está em `docs/GUIA_TECNICO.md` §5.
