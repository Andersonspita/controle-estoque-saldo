# SaldoContratual — Frontend

Interface em **React + Vite + TypeScript**, com TanStack Router/Query, Tailwind CSS e componentes no padrão shadcn/ui.

Visão geral do produto: [README da raiz](../README.md). Uso das telas: [Manual do Usuário](../docs/Manual_do_Usuario_SaldoContratual.pdf).

## Rodar localmente

Requisitos: [Node.js](https://nodejs.org/) com npm e o backend no ar (veja [../backend/README.md](../backend/README.md)).

```bash
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. A origem da API vem de `VITE_API_URL` (padrão `http://localhost:8000`); o sufixo `/api/v1` é opcional (`src/lib/apiUrl.ts`).

Outros comandos:

| Comando | Uso |
|---------|-----|
| `npm run build` | Checa os tipos (`tsc`) e gera o build de produção |
| `npm run lint` | Biome (formatação e lint) |
| `npm run generate-client` | Regera `src/client/` a partir do OpenAPI do backend |

Em produção, o `Dockerfile` compila o build e o serve com Nginx (`nginx.conf`), que também faz o proxy para a API.

## Estrutura

| Caminho | Conteúdo |
|---------|----------|
| `src/routes/_layout/` | Telas: `index` (Dashboard), `fornecedores`, `contratos`, `notas-fiscais`, `estornos`, `relatorios`, `auditoria` (Log de usuários), `admin`, `settings` |
| `src/components/Contratos/` | Cadastro/edição de contrato e itens, aditivo, painel de detalhe |
| `src/components/NotasFiscais/` | Importação XML/PDF, inclusão manual, conferência de vínculos, baixa, estorno/exclusão |
| `src/components/Relatorios/` | Documento do Relatório de Saldo (pré-visualização e impressão A4) |
| `src/components/Admin/` | Usuários, perfis e permissões |
| `src/components/ui/` | Componentes base (Button, Badge, Dialog, Table...) |
| `src/services/api.ts` | Cliente Axios das rotas `/api/v1` com o token Bearer |
| `src/lib/` | Utilitários de domínio: moeda BRL, CPF/CNPJ, IBGE, unidades, planilha de itens (`planilhaItensContrato.ts`), rótulos |
| `public/modelo-itens-contrato.xlsx` | Planilha modelo oficial dos itens do contrato (botão **Baixar modelo**) |

Padrões de interface (obrigatórios): só tokens de cor de `src/index.css` (`bg-primary`, `text-foreground`, `text-success`, `text-warning`, `text-critical`...), sem cores literais do Tailwind; ações com `components/ui/button.tsx`; status com `components/ui/badge.tsx`; listas com `components/Common/DataTable.tsx`; preserve os `data-testid`.

## Testes E2E (Playwright)

Precisam do Postgres, do backend e de um usuário ADMIN de testes.

```bash
cp .env.e2e.example .env.e2e   # preencha E2E_EMAIL e E2E_PASSWORD; não commite
npx playwright install chromium
npx playwright test
npx playwright show-report
```

O Playwright sobe o backend e o Vite, ou reutiliza os que já estiverem no ar. Specs e detalhes: `docs/GUIA_TECNICO.md` §5.
