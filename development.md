# SaldoContratual — Desenvolvimento

Guia rápido para quem vai mexer no código. O roteiro completo (rotas, testes, deploy) está em [docs/GUIA_TECNICO.md](docs/GUIA_TECNICO.md).

## Ambiente local

1. Banco: `docker compose up -d db` (na raiz).
2. Backend: veja [backend/README.md](backend/README.md) — `uv sync`, `uv run alembic upgrade head`, `uv run fastapi dev` (porta 8000).
3. Frontend: veja [frontend/README.md](frontend/README.md) — `npm install`, `npm run dev` (porta 5173).

O `.env` fica na raiz do repositório e **não** vai para o Git. Em produção as variáveis ficam em `.env.production` na VPS (modelo: `.env.production.example`).

## Antes de alterar qualquer coisa

Regra do projeto desde 24/08/2026: toda alteração de código ou regra de negócio começa com uma **tag de backup** no commit atual.

```bash
git rev-parse --short HEAD
git tag -a backup-pre-<resumo>-AAAAMMDD -m "Backup antes de <mudança>"
git push origin backup-pre-<resumo>-AAAAMMDD
```

Para voltar o código: `git checkout <tag>`. Não apague tags de backup.

## Branch de trabalho

A VPS usa a branch `cursor/perfis-e2e-readme-pt`. O `master` recebe essa branch por pull request. Faça o trabalho a partir dela, não do `master`, para não reaplicar mudanças sobre código desatualizado.

## Ao concluir

- Atualize `docs/ESTADO_DO_PROJETO.md` (data, o que mudou, de onde retomar) e `docs/GUIA_TECNICO.md` (rotas, testes, deploy).
- Se a mudança afetar o que o usuário vê, atualize `docs/manual/gerar_manual_usuario.py` e gere o PDF de novo:

  ```bash
  uv run --no-project --with reportlab python docs/manual/gerar_manual_usuario.py
  ```

- Frontend: use apenas os tokens de cor de `frontend/src/index.css` e os componentes de `components/ui/`.

## Lint e formatação

O projeto usa [prek](https://prek.j178.dev/) (alternativa ao pre-commit) com a configuração em `.pre-commit-config.yaml`.

```bash
uv run prek install -f        # instala o hook para rodar a cada commit
uv run prek run --all-files   # roda manualmente em todo o projeto
```
