# Controle de Estoque e Saldos

Sistema web para acompanhar o **saldo dos itens de contratos de licitação** e registrar baixas a partir de Notas Fiscais Eletrônicas (NF-e).

O estoque controlado **não é o almoxarifado**. Cada item do contrato entra com um saldo (a quantidade contratada). Cada baixa de NF abate esse saldo. O almoxarifado é só o **destino físico** do material depois da baixa.

Exemplo: contrato de 12 meses com 1 item de 100 unidades → o item começa com 100 de saldo. Depois de baixar 10 na NF, restam 90 no contrato, mesmo que o material tenha ido para o almoxarifado central.

## O que o sistema faz

- Cadastro de fornecedores, licitações, contratos e itens (com saldo inicial igual à quantidade contratada)
- Importação de NF-e em **XML** ou **PDF (DANFE)** com OCR
- Vínculo de cada item da NF a um item do contrato (código, GTIN ou similaridade de descrição)
- Baixa transacional: desconta o saldo do contrato, registra a movimentação e destina o material ao almoxarifado
- Previsão de consumo e alertas de esgotamento no dashboard (45 dias)
- Autenticação JWT com dois perfis:
  - **ADMIN** — consulta, importa NF, dá baixa e cadastra fornecedor, contrato, licitação e almoxarifado
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

**Usuário de testes:** `andersonspita87@gmail.com` / `0134679Ab@` (perfil **ADMIN**).

A primeira leitura de um PDF DANFE baixa os modelos do RapidOCR e pode levar cerca de 20 segundos.

## Testes

### Backend

```bash
cd backend
uv run pytest --ignore=tests/test_parse_pdf_endpoint.py
```

O teste `test_parse_pdf_endpoint.py` usa OCR no PDF real (~20 s) e pode ser executado à parte.

### Frontend (E2E)

O Postgres e o usuário de testes precisam estar disponíveis. O Playwright sobe o backend e o Vite, ou reutiliza os processos se já estiverem no ar.

```bash
cd frontend
npx playwright install chromium
npx playwright test
```

Relatório HTML: `npx playwright show-report`.

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [docs/ESTADO_DO_PROJETO.md](docs/ESTADO_DO_PROJETO.md) | O que já está pronto, o que mudou e de onde retomar |
| [docs/GUIA_TECNICO.md](docs/GUIA_TECNICO.md) | Como rodar, testar, endpoints e perfis |

Rotas de domínio exigem `Authorization: Bearer <token>`, exceto `POST /login/access-token` e `GET /health`.

## Licença

Este repositório é distribuído sob os termos da licença [MIT](LICENSE).
