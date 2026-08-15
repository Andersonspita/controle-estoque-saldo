# Estado do Projeto - Controle de Estoque e Saldos

> **Última Atualização:** 15/08/2026 — Compose de produção (Postgres, API e Nginx separados) para VPS

Este documento guia quem assume ou retoma o projeto. Para rodar localmente e executar testes, consulte o `GUIA_TECNICO.md`.

**Usuário de Testes Padrão:**
- E-mail: `andersonspita87@gmail.com`
- Senha: `0134679Ab@`
- Perfil: `ADMIN`

## Regra de negócio do saldo

O estoque controlado pelo sistema é o **saldo dos itens do contrato**, não o almoxarifado.

Exemplo: contrato de 12 meses com 1 item de 100 unidades → entram 100 unidades de saldo nesse item. Cada baixa de NF abate esse saldo. O almoxarifado é apenas o **destino físico** do material após a baixa.

## 1. Fases 1–5 — Integração frontend ↔ backend

Mocks iniciais da interface foram removidos. O frontend consome a API real:

- **Dashboard:** `GET /api/v1/contratos/`, `GET /api/v1/movimentacoes/` e `GET /api/v1/contratos/previsao-consumo`. Dark Mode.
- **Notas Fiscais:** listagem em `GET /api/v1/notas-fiscais/`.
- **Contratos, fornecedores e almoxarifados:** telas ligadas às rotas correspondentes.

## 2. Fase 6 — Infraestrutura de testes

- **Backend (Pytest):** `pytest`, `pytest-asyncio` e `httpx`. Cliente assíncrono em `backend/tests/conftest.py`.
- **Frontend (Playwright):** sobe o Vite na porta 5173. Specs do template FastAPI foram **apagados**. Restam `frontend/tests/dashboard.spec.ts` (redirecionamento para login e formulário visível).

## 3. Fase 7 — Leitura de NF (XML e PDF)

- **XML:** `nfe_parser.py` + `POST /api/v1/notas-fiscais/parse-xml`. Extrai número, série, chave, data, fornecedor, itens e total. Testes: `test_nfe_parser.py`, `test_parse_xml_endpoint.py`, fixture `sample_nfe.xml`.
- **PDF (DANFE):** vários DANFEs (ex. gerados em Ghostscript) não têm texto extraível. `nfe_pdf.py` rasteriza a página e `danfe_parser.py` interpreta o OCR (RapidOCR). Endpoint: `POST /api/v1/notas-fiscais/parse-pdf`.
- **Nota de validação:** `docs/NF 29260832183420000147550010000000691333202248.pdf` (cópia em `backend/tests/fixtures/sample_danfe.pdf`). NF **69**, série **1**, emissão **04/08/2026**, emitente Maria Eunice Jesus de Oliveira de Cipo, **13 itens**, total **R$ 26.001,00**. Testes: `test_danfe_parser.py` (OCR fixture) e `test_parse_pdf_endpoint.py` (PDF real, ~20s).
- **Frontend:** `ImportNFModal.tsx` envia `.xml` para parse-xml e `.pdf` para parse-pdf. Não há mais simulação de PDF.

## 4. Vinculação NF → itens do contrato

Cada item da NF precisa ser ligado a um item **do contrato selecionado** (saldo contratual).

- Matching em `item_matcher.py`: código, GTIN e similaridade de descrição (`CONFIRMADO` / `PROVAVEL` / `SUGERIDO` / `NAO_IDENTIFICADO`).
- Endpoint: `POST /api/v1/notas-fiscais/vincular-itens/{contrato_id}`.
- O modal mostra a tabela NF → item do contrato (com saldo) e permite ajuste manual. A importação só segue se todos os itens estiverem vinculados.
- `POST /api/v1/notas-fiscais/importar` rejeita item sem vínculo ou com `item_contrato_id` de outro contrato.
- Testes: `backend/tests/test_item_matcher.py`.

## 5. Etapa 2 — Previsão, contratos e destinação

- **Previsão de consumo:** `GET /api/v1/contratos/previsao-consumo`. Alertas de esgotamento (45 dias) no Dashboard.
- **Cadastro de contrato:** `POST /api/v1/contratos/` persiste os itens. `saldo_atual` inicia igual à quantidade contratada.
- **Tela Contratos:** expandir a linha mostra, por item, quantidade contratada, saldo atual e percentual restante.
- **Almoxarifados:** CRUD em `/api/v1/almoxarifados/`. `GET /api/v1/almoxarifados/{id}` lista destinação física após baixas, lado a lado com o saldo do contrato.
- **Baixa:** `POST /api/v1/notas-fiscais/{nf_id}/baixar` exige almoxarifado, deduz o saldo do item do contrato, grava movimentação e atualiza `estoque_almoxarifados`. O `usuario_id` vem do token JWT, não do corpo da requisição.

## 6. Autenticação JWT e perfis

- Login: `POST /login/access-token` (público). Token HS256 com `settings.SECRET_KEY`.
- Dependência: `src/deps.py` (`get_current_user` / `get_current_active_user` / `require_admin`). Token inválido ou ausente → **401**. Usuário inativo → **403**.
- Rotas de contratos, NFs, fornecedores, licitações, movimentações, almoxarifados e `GET /users/me` exigem Bearer token.
- Públicos: `GET /health` e `POST /login/access-token`.
- Frontend (`frontend/src/services/api.ts`) envia `Authorization: Bearer` a partir de `localStorage.access_token`. A origem da API ignora um `/api/v1` extra no `.env`, para o login (`/login/access-token` e `/users/me`) e o axios (`/api/v1/...`) apontarem para o mesmo backend.
- Correção: `/users/me` deixou de usar uma SECRET_KEY dummy (que caía no primeiro usuário do banco).
- **`GET /users/me`** devolve `perfil` (`ADMIN` ou `OPERADOR`) e `is_superuser` (`true` só para ADMIN).
- **ADMIN:** cadastra fornecedores, contratos, licitações e almoxarifados; vê o menu Admin.
- **OPERADOR:** consulta cadastros, importa/parseia NF, vincula itens e dá baixa. POST de cadastro → **403**.
- Na interface, os botões “Novo Fornecedor / Contrato / Almoxarifado” só aparecem para ADMIN.

## 7. E2E autenticado (Playwright)

O `webServer` sobe o backend (`http://127.0.0.1:8000/health`) e o Vite (`http://localhost:5173`), reutilizando processos já em execução. Specs: visitante → login; ADMIN autentica, vê o dashboard e o botão “Novo Contrato”. Requer Postgres e o usuário de testes.

## 8. Deploy de produção

`compose.prod.yml` sobe Postgres (rede interna), FastAPI (`src.main:app`, rede interna) e Nginx na porta **8080** (SPA + proxy de `/api/v1`, `/login`, `/users` e `/health`). Segredos em `.env.production` (modelo: `.env.production.example`). Roteiro da VPS: `docs/GUIA_TECNICO.md` §6.

## 9. De Onde Retomar (Próximos Passos)

1. **Melhorias de NF:** OCR de PDF é mais lento que XML; quando existir o XML da NF-e, preferi-lo. Conferência visual dos vínculos NF × contrato em notas já importadas.
2. **HTTPS:** quando houver domínio, certificado Let's Encrypt e `FRONTEND_HOST=https://...`.
