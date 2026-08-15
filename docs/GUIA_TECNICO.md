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
| POST | `/contratos/` | Cria contrato **e** itens (`saldo_atual` = quantidade contratada). **ADMIN** |
| GET | `/contratos/previsao-consumo` | Dias restantes por item (taxa diária) |
| GET | `/notas-fiscais/` | Lista NFs |
| POST | `/notas-fiscais/parse-xml` | Extrai dados de XML NF-e |
| POST | `/notas-fiscais/parse-pdf` | Extrai dados de DANFE (OCR) |
| POST | `/notas-fiscais/vincular-itens/{contrato_id}` | Sugere vínculo item NF → item do contrato |
| POST | `/notas-fiscais/importar` | Grava NF + itens (vínculo obrigatório) |
| POST | `/notas-fiscais/{id}/baixar` | Baixa saldo do contrato (usuário vem do JWT) e destina ao almoxarifado |
| GET | `/almoxarifados/` | Lista almoxarifados |
| GET | `/almoxarifados/{id}` | Destinação física + saldo do contrato |
| POST | `/almoxarifados/` | Cria almoxarifado (**ADMIN**) |
| POST | `/fornecedores/` | Cria fornecedor (**ADMIN**) |
| POST | `/licitacoes/` | Cria licitação (**ADMIN**) |
| POST | `/login/access-token` | Login (público). Form `username` + `password` |
| GET | `/users/me` | Usuário logado (`perfil`, `is_superuser`) |
| GET | `/health` | Health check (público) |

Todas as rotas de `/api/v1/...` do domínio exigem `Authorization: Bearer <token>`, exceto login e health.

**Perfis:** `OPERADOR` lista, importa NF, vincula e dá baixa. `ADMIN` faz o mesmo e ainda cria fornecedor, contrato, licitação e almoxarifado (`require_admin` → 403 para os demais).

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
- `tests/test_auth.py` (401 sem token; `/health` público; OPERADOR recebe 403 em POST de cadastro)
- `tests/test_parse_pdf_endpoint.py` (PDF real; OCR ~20s)

Fixture DANFE: `backend/tests/fixtures/sample_danfe.pdf` (mesmo arquivo que `docs/NF 29260832183420000147550010000000691333202248.pdf`).

Para pular o teste lento de PDF:
```bash
uv run pytest --ignore=tests/test_parse_pdf_endpoint.py
```

### Frontend (E2E)
```bash
cd frontend
npx playwright install chromium
npx playwright test
```

O Playwright sobe o backend FastAPI (`http://127.0.0.1:8000/health`) e o Vite (`http://localhost:5173`). Se já estiverem no ar, reutiliza. No Docker Compose (`PLAYWRIGHT_BASE_URL` definido) ele **não** sobe esses processos.

O fluxo autenticado precisa do **Postgres** (banco `controle_estoque`) e do usuário de testes. Credenciais: `E2E_EMAIL` / `E2E_PASSWORD`, com padrão igual ao usuário de testes acima.

Specs:

- `tests/dashboard.spec.ts` — visitante redirecionado ao login
- `tests/login.spec.ts` — senha inválida permanece no login
- `tests/auth.setup.ts` — autentica o ADMIN e grava `playwright/.auth/admin.json`
- `tests/authenticated.spec.ts` — dashboard logado, menu Admin e “Novo Contrato”

Relatório HTML: `npx playwright show-report`.

## 6. Deploy na VPS (banco, API e frontend separados)

O Compose de produção é `compose.prod.yml`. Só o Nginx publica a **porta 80**. Postgres e FastAPI ficam na rede interna do Docker.

Acesse por `http://SEU_IP` enquanto não houver domínio (sem HTTPS). **Não** use `compose.yml` do template FastAPI neste deploy.

### 6.1. Primeira configuração da VPS (Ubuntu)

Como root, crie um usuário de deploy (não rode o app como root):

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
# cole a chave pública em /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Firewall: só SSH e HTTP.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw enable
```

Instale Docker Engine e o plugin Compose (não use Docker Desktop). Em seguida:

```bash
usermod -aG docker deploy
apt-get update && apt-get install -y fail2ban
```

Faça logout/login do usuário `deploy` para o grupo `docker` valer. Recomendado: login SSH só por chave; desligar `PasswordAuthentication` e `PermitRootLogin` em `/etc/ssh/sshd_config` depois de testar a chave.

### 6.2. Código e segredos

```bash
sudo apt-get install -y git
git clone https://github.com/Andersonspita/controle-estoque-saldo.git /home/deploy/controle-estoque-saldo
cd /home/deploy/controle-estoque-saldo
cp .env.production.example .env.production
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Edite `.env.production`:

- `POSTGRES_PASSWORD` e `SECRET_KEY`: use as strings geradas (SECRET_KEY com pelo menos 32 bytes)
- `FRONTEND_HOST=http://SEU_IP_PUBLICO` (sem barra no final)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NOME`: o primeiro administrador (não reutilize a senha de teste local)

Não commite `.env.production`.

### 6.3. Subir os serviços

```bash
cd /home/deploy/controle-estoque-saldo
docker compose -f compose.prod.yml --env-file .env.production up -d --build
docker compose -f compose.prod.yml --env-file .env.production exec backend python create_user.py
```

O backend já executa `alembic upgrade head` na subida. Conferir:

- `http://SEU_IP/health`
- interface em `http://SEU_IP`
- logs: `docker compose -f compose.prod.yml --env-file .env.production logs -f`

### 6.4. Quando houver domínio

1. DNS tipo A apontando para o IP da VPS
2. `ufw allow 443/tcp`
3. Trocar `FRONTEND_HOST` para `https://seu-dominio` e colocar HTTPS no proxy (Let's Encrypt)
4. Recriar o frontend: `docker compose -f compose.prod.yml --env-file .env.production up -d --build`

Não publique as portas `5432` nem `8000`. Não suba Adminer. Não use `fastapi dev` em produção.

## 7. Documentação a manter
Qualquer mudança de comportamento deve refletir em `docs/ESTADO_DO_PROJETO.md` (estado + próximos passos) e neste guia (como rodar / rotas / testes / deploy). O `README.md` da raiz (em português do Brasil) é a porta de entrada do repositório.
