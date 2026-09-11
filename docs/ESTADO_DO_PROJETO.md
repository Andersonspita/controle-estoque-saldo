# Estado do Projeto — SaldoContratual

> **Última Atualização:** 11/09/2026 — log de auditoria completo (NF, contratos, fornecedores, usuários, baixa/estorno/vínculos) + tela **Log de usuários** só para ADMIN

Este documento guia quem assume ou retoma o projeto. Para rodar localmente e executar testes, consulte o `GUIA_TECNICO.md`.

**Usuário de testes / VPS:** senha e SSH **não** ficam neste repositório. Guarde-os fora do Git (arquivo de acessos local ou gerenciador de senhas). Playwright: `E2E_EMAIL` e `E2E_PASSWORD` em `frontend/.env.e2e` (modelo: `frontend/.env.e2e.example`). Perfil do usuário de testes: `ADMIN`.

## Regra de negócio do saldo

O produto chama-se **SaldoContratual**. O estoque controlado é o **saldo dos itens do contrato** (quantidade **e** valor em R$). O contrato **não é ligado a licitação** — cadastra-se o contrato e seus itens diretamente. Não há cadastro de órgão de destino físico.

Exemplo: contrato de 12 meses com 1 item de 100 unidades a R$ 10,00 → entram 100 unidades e R$ 1.000,00 de saldo nesse item. Cada baixa de NF abate quantidade e, proporcionalmente, o saldo monetário (`saldo_atual × valor_unitario`).

## 1. Fases 1–5 — Integração frontend ↔ backend

Mocks iniciais da interface foram removidos. O frontend consome a API real:

- **Dashboard:** `GET /api/v1/contratos/`, `GET /api/v1/movimentacoes/` e `GET /api/v1/contratos/previsao-consumo`. Cards de valor contratado, saldo atual (R$) e valor baixado. Dark Mode.
- **Notas Fiscais:** listagem em `GET /api/v1/notas-fiscais/` com download do arquivo em `GET /api/v1/notas-fiscais/{id}/arquivo`.
- **Contratos e fornecedores:** telas ligadas às rotas correspondentes.

## 2. Fase 6 — Infraestrutura de testes

- **Backend (Pytest):** `pytest`, `pytest-asyncio` e `httpx`. Cliente assíncrono em `backend/tests/conftest.py`.
- **Frontend (Playwright):** sobe o Vite na porta 5173. Specs do template FastAPI foram **apagados**. Restam `frontend/tests/dashboard.spec.ts` (redirecionamento para login e formulário visível).

## 3. Fase 7 — Leitura de NF (XML e PDF)

- **XML:** `nfe_parser.py` + `POST /api/v1/notas-fiscais/parse-xml`. Extrai número, série, chave, data, fornecedor, itens e total. Testes: `test_nfe_parser.py`, `test_parse_xml_endpoint.py`, fixture `sample_nfe.xml`.
- **PDF (DANFE):** vários DANFEs (ex. gerados em Ghostscript) não têm texto extraível. `nfe_pdf.py` rasteriza a página e `danfe_parser.py` interpreta o OCR (RapidOCR). Endpoint: `POST /api/v1/notas-fiscais/parse-pdf`.
- **Nota de validação:** `docs/NF 29260832183420000147550010000000691333202248.pdf` (cópia em `backend/tests/fixtures/sample_danfe.pdf`). NF **69**, série **1**, emissão **04/08/2026**, emitente Maria Eunice Jesus de Oliveira de Cipo, **13 itens**, total **R$ 26.001,00**. Testes: `test_danfe_parser.py` (OCR fixture) e `test_parse_pdf_endpoint.py` (PDF real, ~20s).
- **Frontend:** `ImportNFModal.tsx` envia `.xml` para parse-xml e `.pdf` para parse-pdf. Não há mais simulação de PDF. A tela também permite **incluir a nota manualmente** (`POST /api/v1/notas-fiscais/`), sem arquivo; o XML/PDF continua no fluxo de importação.

## 4. Vinculação NF → itens do contrato

Cada item da NF precisa ser ligado a um item **do contrato selecionado** (saldo contratual).

- Matching em `item_matcher.py`: código, GTIN e similaridade de descrição (`CONFIRMADO` / `PROVAVEL` / `SUGERIDO` / `NAO_IDENTIFICADO`).
- Endpoint: `POST /api/v1/notas-fiscais/vincular-itens/{contrato_id}`.
- O modal mostra a tabela NF → item do contrato (com saldo) e permite ajuste manual. A importação só segue se todos os itens estiverem vinculados.
- Notas já importadas (ainda não baixadas) podem ser conferidas de novo em **Conferir vínculos** (`PATCH /api/v1/notas-fiscais/{id}/vinculos`).
- `POST /api/v1/notas-fiscais/importar` rejeita item sem vínculo ou com `item_contrato_id` de outro contrato.
- Testes: `backend/tests/test_item_matcher.py`.

## 5. Etapa 2 — Previsão, contratos e destinação

- **Previsão de consumo:** `GET /api/v1/contratos/previsao-consumo`. Alertas de esgotamento (45 dias) no Dashboard.
- **Cadastro de contrato:** `POST /api/v1/contratos/` persiste cabeçalho e itens. **Objeto** é o objeto do contrato. Também há **número da licitação**, **modalidade** (lookup) e **observação** — o campo **objeto da licitação** permanece no banco/API por compatibilidade, mas **saiu da UI**. A tela pede **vigência inicial** e **vigência final** (obrigatórias); o `ano` no banco é o ano da vigência inicial. Itens seguem o modelo oficial `Modelo para importação de itens.xlsx`: **Item**, **Descrição**, **Unidade**, **Quantidade**, **Marca**, **Valor_unitário**, **Observação**. Em cada linha o formulário mostra o **valor total** (qtd × unitário). Digitação no modal ou importação **somente** `.xlsx` com esses cabeçalhos (`frontend/public/modelo-itens-contrato.xlsx` — **Baixar modelo**). CSV e planilhas com cabeçalho diferente são rejeitados. Campo `observacao` do item: migração `a1c2e3f4b506`. **PDF do contrato:** anexar em cadastro/edição (`POST /contratos/{id}/arquivo`); `tem_arquivo` na listagem; **Visualizar** / **Download** (`GET /contratos/{id}/arquivo`). Migração `c4d8e2a9f701`.
- **Edição de contrato (ADMIN):** `PATCH /api/v1/contratos/{id}` atualiza cabeçalho e itens. A quantidade contratada não pode ficar abaixo do já baixado. Item com movimentação não pode ser excluído. O `valor_total` é recalculado pelos itens. OPERADOR recebe **403**. A quantidade inicial do contrato (`quantidade_inicial`) não é alterada na edição. Create/update/aditivo/arquivo gravam `log_auditoria` com o usuário do JWT.
- **Aditivo (ADMIN):** botão **Aditivo** na linha do contrato abre um modal. O usuário marca quais itens entram no aditivo e informa a **quantidade extra** e o **valor unitário** (pré-preenchido com o atual). Endpoint: `POST /api/v1/contratos/{id}/aditivo`. Só os itens marcados mudam: `quantidade_contratada` e `saldo_atual` somam a extra; o valor unitário pode ser atualizado. A quantidade inicial permanece como snapshot da contratação original. Extra deve ser maior que zero; em unidade (`UN` e similares) a quantidade é inteira (não existe 21,5 UN). OPERADOR recebe **403**.
- **Tela Contratos:** a linha mostra valor total e **saldo atual do contrato** em R$. Se algum item já foi aditivado, aparece “Com aditivo” e o valor inicial. Botão **Visualizar** abre o painel de detalhe (PDF do contrato, se anexado). Expandir a linha (botão com `aria-expanded`, Tab + Enter) mostra os itens sem tabela aninhada. ADMIN edita pelo botão na linha ou aplica aditivo pelo botão **Aditivo**.
- **Interface (redesign):** tokens `success` / `warning` / `critical` em `index.css`. Status usa `<Badge>`. Ações usam `<Button>`. Notas fiscais, fornecedores e Admin usam `DataTable` com busca, filtro e paginação. Dashboard centra no consumo do valor contratado, gráfico mensal e alertas acionáveis. Em telas `< md` as listas viram cards. Login usa marca, tagline e painel de produto. A marca é o **selo em relevo** (`Logo.tsx` + favicon SVG/ICO); o ícone de GitHub saiu do rodapé.
- **Dark mode / contraste:** modais de NF (importar, manual, conferência), contrato, aditivo e fornecedor usam `bg-card` / `text-foreground` / `border-input` (mesmo padrão do `BaixaModal`). Status de vínculo (`CONFIRMADO`, `PROVAVEL`, etc.) usa `<Badge>` semântico via `vinculoStatus.tsx`. `MoneyInput` não força cores claras/escuras hardcoded. Seletor de tema na sidebar: **Aparência / Claro / Escuro / Sistema**. Relatórios mantêm folha branca de impressão, com rótulo “Pré-visualização da folha A4” no dark mode. No documento impresso, **Cidade/UF** foi removida; **Valor vigente** permanece. Filtros de vigência e objeto ficam em seção **Filtros avançados** retrátil.
- **Valores monetários:** campos de valor (unitário, totais, saldos) são exibidos e digitados em BRL (`R$ 1.234,56`). Quantidade permanece numérica. A API devolve `valor_contratado` e `saldo_monetario` em cada item e `saldo_atual` monetário no contrato detalhado.
- **Baixa:** `POST /api/v1/notas-fiscais/{nf_id}/baixar` abate o saldo do item do contrato e grava movimentação (justificativa opcional). Bloqueia a linha da NF (`FOR UPDATE`) para evitar baixa duplicada. O `usuario_id` vem do token JWT. Não há destino físico. O modal de baixa tem scroll (`max-h-[90vh]`) para chegar em **Confirmar baixa** com muitos itens.
- **Vínculo NF × contrato:** o rótulo do select usa `rotuloItemContrato` — descrição (+ marca) + **valor unitário** + **saldo**.
- **Auditoria de usuário:** inclusões/alterações/exclusões gravam `log_auditoria` (usuário, operação, tabela, registro, dados e IP) para NF (create/import/edit/vínculos/baixa/estorno/exclusão), contratos (create/update/aditivo/arquivo), fornecedores (create/update) e usuários (create/update/delete). Baixa/estorno também mantêm `Movimentacao.usuario_id`. Tela **Log de usuários** (`/auditoria`, `GET /api/v1/auditoria/`) é **somente ADMIN**.
- **Fornecedor:** o campo `cnpj` aceita **CPF (11) ou CNPJ (14)** com dígitos verificadores; a UI rotula **CPF/CNPJ**. UF em select; municípios vêm da API do IBGE (`/estados/{UF}/municipios`). Unicidade compara só os dígitos. Documentos já gravados não são revalidados na listagem. **ADMIN** cria e edita (`PATCH /api/v1/fornecedores/{id}`); create/update gravam auditoria.
- **Arquivo da NF:** a importação grava o PDF/XML em disco com nome sanitizado (sem path traversal); a listagem oferece **Baixar PDF** (`GET /api/v1/notas-fiscais/{id}/arquivo`), inclusive após a baixa. A API devolve `tem_arquivo`, não o caminho interno do disco.
- **Grids no mobile:** tabelas rolam na horizontal (`overflow-x-auto`, `min-w-0` no layout). Cabeçalhos e ações (editar, conferir, baixa) não ficam cortados.

## 6. Autenticação JWT e perfis

- Login: `POST /login/access-token` (público). Token HS256 com `settings.SECRET_KEY`. Após 5 falhas no mesmo IP+e-mail em 15 minutos, responde **429**.
- Persistência (contratos, fornecedores, licitações, importação de NF): falhas internas devolvem mensagem genérica; o detalhe vai só ao log.
- CORS: em produção usa só `FRONTEND_HOST`. `http://localhost:5173` entra automaticamente apenas com `FASTAPI_ENV=development`.
- Nginx: cabeçalhos `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `X-Robots-Tag` (sem HSTS enquanto o site for HTTP).
- Dependência: `src/deps.py` (`get_current_user` / `get_current_active_user` / `require_admin`). Token inválido ou ausente → **401**. Usuário inativo → **403**.
- Rotas de contratos, NFs, fornecedores, licitações, movimentações e `GET /users/me` exigem Bearer token.
- Públicos: `GET /health` e `POST /login/access-token`. Não há cadastro público nem recuperação de senha (rotas `/signup` e `/recover-password` redirecionam ao login).
- Frontend (`frontend/src/services/api.ts`) envia `Authorization: Bearer` a partir de `localStorage.access_token`. A origem da API ignora um `/api/v1` extra no `.env`, para o login (`/login/access-token` e `/users/me`) e o axios (`/api/v1/...`) apontarem para o mesmo backend.
- Correção: `/users/me` deixou de usar uma SECRET_KEY dummy (que caía no primeiro usuário do banco).
- **`GET /users/me`** devolve `perfil` (`ADMIN` ou `OPERADOR`) e `is_superuser` (`true` só para ADMIN).
- **ADMIN:** cadastra usuários (tela Admin), fornecedores e contratos; edita contratos e fornecedores; aplica aditivo; consulta o **Log de usuários**.
- **OPERADOR:** consulta cadastros, importa/parseia NF, inclui NF digitada, vincula itens, baixa PDF da NF e dá baixa. POST/PATCH de cadastro (incluindo usuários, contratos, fornecedores e aditivo) e a tela/API de auditoria → **403**.
- **Usuários (ADMIN):** `GET/POST /users/`, `PATCH/DELETE /users/{id}` (com auditoria). Perfil `ADMIN` ou `OPERADOR`; não permite excluir a própria conta nem remover o último administrador. `PATCH /users/me` e `PATCH /users/me/password` atualizam dados da conta logada.

## 7. E2E autenticado (Playwright)

O `webServer` sobe o backend (`http://127.0.0.1:8000/health`) e o Vite (`http://localhost:5173`), reutilizando processos já em execução. Specs: visitante → login; ADMIN autentica, vê o dashboard, a tela Admin de usuários e o botão “Novo Contrato”. Requer Postgres, o usuário de testes e `frontend/.env.e2e`.

## 8. Deploy de produção

`compose.prod.yml` sobe Postgres (rede interna), FastAPI (`src.main:app`, rede interna) e Nginx na porta **`${HTTP_PORT}`** (padrão do exemplo: **8080**; SPA + proxy de `/api/v1`, `/login`, `/users` e `/health`). Segredos em `.env.production` na VPS (modelo: `.env.production.example`). Roteiro: `docs/GUIA_TECNICO.md` §6.

## 9. De Onde Retomar (Próximos Passos)

Concluído neste ciclo (11/09/2026): **log de auditoria ampliado** (baixa/estorno/vínculos NF, fornecedores e usuários) + tela **Log de usuários** (`/auditoria`, só ADMIN). Backup: tag `backup-pre-auditoria-tela-admin-20260911`.

Ciclo anterior: **auditoria de usuário** (NF create/import/edit + contratos create/update/aditivo/arquivo); **rótulo de vínculo** com valor unitário; **scroll no modal de baixa**; **remoção do Objeto da Licitação na UI**; **PDF do contrato** (upload/visualizar/download); **valor total por item** no formulário; relatório **sem Cidade/UF** e com **filtros avançados retráteis**. Backup: tag `backup-pre-ajustes-nf-contrato-relatorio-20260911`. Migração `c4d8e2a9f701`.

Ciclo anterior: **modelo oficial de planilha de itens** (colunas Item / Descrição / Unidade / Quantidade / Marca / Valor_unitário / Observação; importação só `.xlsx` do modelo; formulários e API com `marca` e `observacao` no item). Backup: tag `backup-pre-modelo-itens-planilha-20260910`. Migração `a1c2e3f4b506`.

Também no ciclo anterior: **remoção do órgão de destino** (tabelas `almoxarifados` / `estoque_almoxarifados`, API, tela, campo na baixa e seção do relatório). Backup: tag `backup-pre-remover-orgao-20260910` (commit `d63831a`). Migração Alembic `f3a7c2e9b401`.

Ciclo anterior: contraste dark mode nos modais; badges de vínculo; tema em PT-BR. Tag `backup-pre-ui-contraste-20260910`.

Regra permanente: **toda alteração** exige backup Git (tag `backup-pre-<resumo>-YYYYMMDD`) **antes** de editar. No deploy, dump do Postgres conforme `docs/GUIA_TECNICO.md` §6.5.

1. **HTTPS:** quando houver domínio, certificado Let's Encrypt e `FRONTEND_HOST=https://...`.
2. Preferir XML da NF-e ao OCR de PDF quando o XML existir.
3. Trocar a senha do ADMIN em produção depois que o histórico do Git já tiver sido publicado com ela (o commit atual só remove a senha dos arquivos).
4. Aplicar as migrações `f3a7c2e9b401`, `a1c2e3f4b506` e `c4d8e2a9f701` no banco local/VPS (`alembic upgrade head`) após dump.
5. Pendências da lista de requisitos ainda abertas: códigos antes das descrições no relatório; vigência dos aditivos no relatório; liberação granular de permissões de contrato em Configurações.
