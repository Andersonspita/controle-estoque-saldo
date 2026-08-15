# Guia Técnico

## 1. Tecnologias Utilizadas
- **Backend:** `FastAPI` (Python 3.14+). ORM assíncrono com SQLAlchemy e SQLModel. Banco **PostgreSQL**. Gerenciado via `uv`.
- **Frontend:** `React` com `Vite`, `TanStack Router/Query` e `TailwindCSS`. Gerenciado via `npm`.
- **Testes:** `Pytest` (backend) e `Playwright` (frontend).
- **NF-e:** `xmltodict` (XML), `pymupdf` + `rapidocr` + `onnxruntime` (DANFE em PDF).

## 2. Regra de saldo
O saldo controlado é o do **item do contrato** (`itens_contrato.saldo_atual`). Almoxarifado (`estoque_almoxarifados`) registra apenas para onde o material foi destinado após a baixa.

## 3. Como Rodar o Projeto Localmente

### Banco de Dados (Postgres)
```bash
docker compose up -d db
```

### Backend (FastAPI) — porta `8000`
> **Windows:** force UTF-8 por causa da biblioteca `rich` e de emojis.
```powershell
cd backend
$env:PYTHONUTF8="1"; $env:PYTHONIOENCODING="utf-8"; uv run fastapi dev
```

### Frontend (Vite) — porta `5173`
```bash
cd frontend
npm run dev
```

**Usuário de testes:** `andersonspita87@gmail.com` / `0134679Ab@` (ADMIN).

A primeira extração de PDF baixa modelos do RapidOCR e pode levar ~20 segundos.

## 4. Endpoints principais (API v1)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/contratos/` | Lista contratos com itens e saldos |
| POST | `/contratos/` | Cria contrato **e** itens (`saldo_atual` = quantidade contratada) |
| GET | `/contratos/previsao-consumo` | Dias restantes por item (taxa diária) |
| GET | `/notas-fiscais/` | Lista NFs |
| POST | `/notas-fiscais/parse-xml` | Extrai dados de XML NF-e |
| POST | `/notas-fiscais/parse-pdf` | Extrai dados de DANFE (OCR) |
| POST | `/notas-fiscais/vincular-itens/{contrato_id}` | Sugere vínculo item NF → item do contrato |
| POST | `/notas-fiscais/importar` | Grava NF + itens (vínculo obrigatório) |
| POST | `/notas-fiscais/{id}/baixar` | Baixa saldo do contrato (usuário vem do JWT) e destina ao almoxarifado |
| GET | `/almoxarifados/` | Lista almoxarifados |
| GET | `/almoxarifados/{id}` | Destinação física + saldo do contrato |
| POST | `/almoxarifados/` | Cria almoxarifado |
| POST | `/login/access-token` | Login (público). Form `username` + `password` |
| GET | `/users/me` | Usuário logado |
| GET | `/health` | Health check (público) |

Todas as rotas de `/api/v1/...` do domínio exigem `Authorization: Bearer <token>`, exceto login e health.

## 5. Como Executar os Testes

### Backend
```bash
cd backend
uv run pytest
```

Testes relevantes do domínio:

- `tests/test_nfe_parser.py` / `test_parse_xml_endpoint.py`
- `tests/test_item_matcher.py`
- `tests/test_danfe_parser.py` (rápido; usa fixture OCR)
- `tests/test_auth.py` (401 sem token; `/health` público)
- `tests/test_parse_pdf_endpoint.py` (PDF real; OCR ~20s)

Fixture DANFE: `backend/tests/fixtures/sample_danfe.pdf` (mesmo arquivo que `docs/NF 29260832183420000147550010000000691333202248.pdf`).

Para pular o teste lento de PDF:
```bash
uv run pytest --ignore=tests/test_parse_pdf_endpoint.py
```

### Frontend (E2E)
```bash
cd frontend
npx playwright test
```
O Playwright sobe só o frontend. Specs atuais cobrem o redirecionamento para login (visitante sem token). Relatório HTML: `npx playwright show-report`.

## 6. Documentação a manter
Qualquer mudança de comportamento deve refletir em `docs/ESTADO_DO_PROJETO.md` (estado + próximos passos) e neste guia (como rodar / rotas / testes).
