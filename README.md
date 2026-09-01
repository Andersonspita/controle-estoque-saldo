# SaldoContratual

Sistema web de **gestão de saldos e itens de contratos de licitação**. Acompanhe o saldo contratual e registre baixas a partir de Notas Fiscais Eletrônicas (NF-e).

O estoque controlado **não é o órgão de destino**. Cada item do contrato entra com um saldo (a quantidade contratada e o valor correspondente). Cada baixa de NF abate esse saldo. O órgão é só o **destino físico** do material depois da baixa.

Exemplo: contrato de 12 meses com 1 item de 100 unidades → o item começa com 100 de saldo. Depois de baixar 10 na NF, restam 90 no contrato, mesmo que o material tenha ido para o órgão.

## O que o sistema faz

- Cadastro de fornecedores, contratos e itens (com saldo inicial igual à quantidade contratada)
- Importação de NF-e em **XML** ou **PDF (DANFE)** com OCR
- Vínculo de cada item da NF a um item do contrato (código, GTIN ou similaridade de descrição)
- Baixa transacional: desconta o saldo do contrato, registra a movimentação e destina o material ao órgão
- Previsão de consumo e alertas de esgotamento no dashboard (45 dias)
- **Relatório de Saldo de Contrato** pronto para impressão ou PDF, com os dados cadastrados no contrato no cabeçalho, o consumo por órgão de destino e cada item aberto em contratado, aditivado, utilizado e saldo
- Autenticação JWT com dois perfis:
  - **ADMIN** — consulta, importa NF, dá baixa e cadastra/edita usuário, fornecedor, contrato e órgão
  - **OPERADOR** — consulta, importa NF, vincula itens e dá baixa (não cadastra)

## Tecnologias

| Camada | Stack |
|--------|--------|
| Backend | [FastAPI](https://fastapi.tiangolo.com), SQLAlchemy assíncrono, PostgreSQL, `uv` |
| Frontend | [React](https://react.dev), [Vite](https://vitejs.dev), TanStack Router/Query, Tailwind CSS |
| NF-e | `xmltodict` (XML), PyMuPDF + RapidOCR (DANFE em PDF) |
| Testes | Pytest (API) e Playwright (interface) |

## Como executar localmente

Requisitos: [Docker](https://www.docker.com/) (Postgres), [uv](https://docs.astral.sh/uv/) e [Node.js](https://nodejs.org/) / npm.

### 1. Banco de dados

Na raiz do repositório:

```bash
docker compose up -d db
```

O backend local usa o banco `controle_estoque` (veja `DATABASE_URL` no `backend/.env`).

### 2. Backend (porta 8000)

No **Windows**, force UTF-8 por causa da biblioteca `rich` e de emojis:

```powershell
cd backend
$env:PYTHONUTF8="1"; $env:PYTHONIOENCODING="utf-8"; uv run fastapi dev
```

Em outros sistemas:

```bash
cd backend
uv sync
uv run fastapi dev
```

API: <http://localhost:8000>  
Documentação interativa (Swagger): <http://localhost:8000/docs>  
Health check: <http://localhost:8000/health>

### 3. Frontend (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Interface: <http://localhost:5173>

A origem da API vem de `VITE_API_URL` (por padrão `http://localhost:8000`). O frontend aceita a URL com ou sem o sufixo `/api/v1`.

O cabeçalho do Relatório de Saldo (nome do órgão, estado e setor) vem de `ORGAO_NOME`, `ORGAO_ESTADO` e `ORGAO_SETOR` no `.env`. Sem `ORGAO_NOME`, o relatório usa `PROJECT_NAME`.

O login de testes **não fica no repositório**. Use as credenciais no seu arquivo de acessos (fora do Git) e, para o Playwright, `frontend/.env.e2e` a partir de `frontend/.env.e2e.example`.

A primeira leitura de um PDF DANFE baixa os modelos do RapidOCR e pode levar cerca de 20 segundos.

## Testes

### Backend

```bash
cd backend
uv run pytest --ignore=tests/test_parse_pdf_endpoint.py
```

O teste `test_parse_pdf_endpoint.py` usa OCR no PDF real (~20 s) e pode ser executado à parte.

### Frontend (E2E)

O Postgres e o usuário de testes precisam estar disponíveis. Copie `frontend/.env.e2e.example` para `frontend/.env.e2e` e preencha `E2E_EMAIL` / `E2E_PASSWORD`. O Playwright sobe o backend e o Vite, ou reutiliza os processos se já estiverem no ar.

```bash
cd frontend
npx playwright install chromium
npx playwright test
```

Relatório HTML: `npx playwright show-report`.

## Deploy na VPS

Banco, API e frontend sobem em containers separados (`compose.prod.yml`). A porta pública padrão é **8080**. Passo a passo (firewall, Docker, `.env.production`, primeiro ADMIN): [docs/GUIA_TECNICO.md](docs/GUIA_TECNICO.md#6-deploy-na-vps-banco-api-e-frontend-separados).

Resumo, no servidor (usuário não-root):

```bash
cp .env.production.example .env.production
# gere POSTGRES_PASSWORD e SECRET_KEY; defina FRONTEND_HOST=http://SEU_IP e ADMIN_*
docker compose -f compose.prod.yml --env-file .env.production up -d --build
docker compose -f compose.prod.yml --env-file .env.production exec backend python create_user.py
```

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [docs/ESTADO_DO_PROJETO.md](docs/ESTADO_DO_PROJETO.md) | O que já está pronto, o que mudou e de onde retomar |
| [docs/GUIA_TECNICO.md](docs/GUIA_TECNICO.md) | Como rodar, testar, endpoints e perfis |

Rotas de domínio exigem `Authorization: Bearer <token>`, exceto `POST /login/access-token` e `GET /health`.

## Licença

Este repositório é distribuído sob os termos da licença [MIT](LICENSE).
