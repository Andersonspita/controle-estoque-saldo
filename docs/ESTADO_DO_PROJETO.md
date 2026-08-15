# Estado do Projeto — SaldoContratual

> **Última Atualização:** 15/08/2026 — aditivo seletivo por item (quantidade extra e valor unitário)

Este documento guia quem assume ou retoma o projeto. Para rodar localmente e executar testes, consulte o `GUIA_TECNICO.md`.

**Usuário de Testes Padrão:**
- E-mail: `andersonspita87@gmail.com`
- Senha: `0134679Ab@`
- Perfil: `ADMIN`

## Regra de negócio do saldo

O produto chama-se **SaldoContratual**. O estoque controlado é o **saldo dos itens do contrato** (quantidade **e** valor em R$), não o órgão de destino. O contrato **não é ligado a licitação** — cadastra-se o contrato e seus itens diretamente.

Exemplo: contrato de 12 meses com 1 item de 100 unidades a R$ 10,00 → entram 100 unidades e R$ 1.000,00 de saldo nesse item. Cada baixa de NF abate quantidade e, proporcionalmente, o saldo monetário (`saldo_atual × valor_unitario`). O **órgão** é apenas o **destino físico** do material após a baixa.

## 1. Fases 1–5 — Integração frontend ↔ backend

Mocks iniciais da interface foram removidos. O frontend consome a API real:

- **Dashboard:** `GET /api/v1/contratos/`, `GET /api/v1/movimentacoes/` e `GET /api/v1/contratos/previsao-consumo`. Cards de valor contratado, saldo atual (R$) e valor baixado. Dark Mode.
- **Notas Fiscais:** listagem em `GET /api/v1/notas-fiscais/` com download do arquivo em `GET /api/v1/notas-fiscais/{id}/arquivo`.
- **Contratos, fornecedores e órgãos:** telas ligadas às rotas correspondentes (API de órgãos permanece em `/almoxarifados`).

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
- Notas já importadas (ainda não baixadas) podem ser conferidas de novo em **Conferir vínculos** (`PATCH /api/v1/notas-fiscais/{id}/vinculos`).
- `POST /api/v1/notas-fiscais/importar` rejeita item sem vínculo ou com `item_contrato_id` de outro contrato.
- Testes: `backend/tests/test_item_matcher.py`.

## 5. Etapa 2 — Previsão, contratos e destinação

- **Previsão de consumo:** `GET /api/v1/contratos/previsao-consumo`. Alertas de esgotamento (45 dias) no Dashboard.
- **Cadastro de contrato:** `POST /api/v1/contratos/` persiste os itens. `saldo_atual` inicia igual à quantidade contratada. `licitacao_id` é opcional (a interface não envia). No modal, os itens podem ser **digitados** ou **importados de planilha** (`.xlsx` / `.csv`); há um modelo CSV para baixar. Colunas esperadas: descrição (obrigatória), código, unidade, quantidade e valor unitário. Na edição, a importação **acrescenta** itens novos (não substitui os que já existem).
- **Edição de contrato (ADMIN):** `PATCH /api/v1/contratos/{id}` atualiza cabeçalho e itens. A quantidade contratada não pode ficar abaixo do já baixado. Item com movimentação não pode ser excluído. O `valor_total` é recalculado pelos itens. OPERADOR recebe **403**. A quantidade inicial do contrato (`quantidade_inicial`) não é alterada na edição.
- **Aditivo (ADMIN):** botão **Aditivo** na linha do contrato abre um modal. O usuário marca quais itens entram no aditivo e informa a **quantidade extra** e o **valor unitário** (pré-preenchido com o atual). Endpoint: `POST /api/v1/contratos/{id}/aditivo`. Só os itens marcados mudam: `quantidade_contratada` e `saldo_atual` somam a extra; o valor unitário pode ser atualizado. A quantidade inicial permanece como snapshot da contratação original. Extra deve ser maior que zero; em unidade (`UN` e similares) a quantidade é inteira (não existe 21,5 UN). OPERADOR recebe **403**.
- **Tela Contratos:** a linha mostra valor total e **saldo atual do contrato** em R$. Se algum item já foi aditivado, aparece “Com aditivo” e o valor inicial. Expandir a linha mostra, por item, quantidade contratada (e a inicial, se diferir), **saldo total** (R$ contratado), **saldo atual** (R$ e unidades), valor unitário e percentual restante. ADMIN edita pelo botão na linha ou aplica aditivo pelo botão **Aditivo**.
- **Valores monetários:** campos de valor (unitário, totais, saldos) são exibidos e digitados em BRL (`R$ 1.234,56`). Quantidade permanece numérica. A API devolve `valor_contratado` e `saldo_monetario` em cada item e `saldo_atual` monetário no contrato detalhado.
- **Órgãos:** interface usa o nome **Órgão** (API/tabelas continuam `almoxarifados`). CRUD em `/api/v1/almoxarifados/` com `POST` e `PATCH` (**ADMIN**). `GET /api/v1/almoxarifados/{id}` lista destinação física após baixas, lado a lado com o saldo do contrato.
- **Baixa:** `POST /api/v1/notas-fiscais/{nf_id}/baixar` exige órgão de destino, deduz o saldo do item do contrato, grava movimentação e atualiza `estoque_almoxarifados`. O `usuario_id` vem do token JWT, não do corpo da requisição.
- **Fornecedor:** o campo `cnpj` aceita **CPF (11) ou CNPJ (14)** com dígitos verificadores; a UI rotula **CPF/CNPJ**. UF em select; municípios vêm da API do IBGE (`/estados/{UF}/municipios`). Unicidade compara só os dígitos. Documentos já gravados não são revalidados na listagem. **ADMIN** cria e edita (`PATCH /api/v1/fornecedores/{id}`).
- **Arquivo da NF:** a importação grava o PDF/XML em disco; a listagem oferece **Baixar PDF** (`GET /api/v1/notas-fiscais/{id}/arquivo`), inclusive após a baixa.
- **Grids no mobile:** tabelas rolam na horizontal (`overflow-x-auto`, `min-w-0` no layout). Cabeçalhos e ações (editar, conferir, baixa) não ficam cortados.

## 6. Autenticação JWT e perfis

- Login: `POST /login/access-token` (público). Token HS256 com `settings.SECRET_KEY`.
- Dependência: `src/deps.py` (`get_current_user` / `get_current_active_user` / `require_admin`). Token inválido ou ausente → **401**. Usuário inativo → **403**.
- Rotas de contratos, NFs, fornecedores, licitações, movimentações, almoxarifados e `GET /users/me` exigem Bearer token.
- Públicos: `GET /health` e `POST /login/access-token`. Não há cadastro público nem recuperação de senha (rotas `/signup` e `/recover-password` redirecionam ao login).
- Frontend (`frontend/src/services/api.ts`) envia `Authorization: Bearer` a partir de `localStorage.access_token`. A origem da API ignora um `/api/v1` extra no `.env`, para o login (`/login/access-token` e `/users/me`) e o axios (`/api/v1/...`) apontarem para o mesmo backend.
- Correção: `/users/me` deixou de usar uma SECRET_KEY dummy (que caía no primeiro usuário do banco).
- **`GET /users/me`** devolve `perfil` (`ADMIN` ou `OPERADOR`) e `is_superuser` (`true` só para ADMIN).
- **ADMIN:** cadastra usuários (tela Admin), fornecedores, contratos e órgãos; edita contratos, fornecedores e órgãos; aplica aditivo nos itens do contrato.
- **OPERADOR:** consulta cadastros, importa/parseia NF, vincula itens, baixa PDF da NF e dá baixa. POST/PATCH de cadastro (incluindo usuários, contratos, fornecedores, órgãos e aditivo) → **403**.
- **Usuários (ADMIN):** `GET/POST /users/`, `PATCH/DELETE /users/{id}`. Perfil `ADMIN` ou `OPERADOR`; não permite excluir a própria conta nem remover o último administrador. `PATCH /users/me` e `PATCH /users/me/password` atualizam dados da conta logada.

## 7. E2E autenticado (Playwright)

O `webServer` sobe o backend (`http://127.0.0.1:8000/health`) e o Vite (`http://localhost:5173`), reutilizando processos já em execução. Specs: visitante → login; ADMIN autentica, vê o dashboard, a tela Admin de usuários e o botão “Novo Contrato”. Requer Postgres e o usuário de testes.

## 8. Deploy de produção

`compose.prod.yml` sobe Postgres (rede interna), FastAPI (`src.main:app`, rede interna) e Nginx na porta **8080** (SPA + proxy de `/api/v1`, `/login`, `/users` e `/health`). Segredos em `.env.production` (modelo: `.env.production.example`). Roteiro da VPS: `docs/GUIA_TECNICO.md` §6.

## 9. De Onde Retomar (Próximos Passos)

Concluído neste ciclo: aditivo deixa de ser percentual único no contrato. O ADMIN escolhe os itens no modal e informa quantidade extra e valor unitário.

1. **HTTPS:** quando houver domínio, certificado Let's Encrypt e `FRONTEND_HOST=https://...`.
2. Preferir XML da NF-e ao OCR de PDF quando o XML existir.
