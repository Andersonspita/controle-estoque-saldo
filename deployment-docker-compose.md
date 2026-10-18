# SaldoContratual — Deploy

O deploy de produção usa **`compose.prod.yml`** em uma VPS Ubuntu: Postgres e FastAPI na rede interna do Docker e Nginx publicando a porta `${HTTP_PORT}` (padrão **8080**). Não usa Traefik, Adminer nem o `compose.yml` do template FastAPI.

O passo a passo completo está em **[docs/GUIA_TECNICO.md §6](docs/GUIA_TECNICO.md#6-deploy-na-vps-banco-api-e-frontend-separados)**:

| Seção | Assunto |
|-------|---------|
| §6.1 | Primeira configuração da VPS (usuário `deploy`, firewall, Docker) |
| §6.2 | Código e segredos (`.env.production`) |
| §6.3 | Subir os serviços e criar o primeiro ADMIN |
| §6.4 | Quando houver domínio (HTTPS) |
| §6.5 | **Atualizar com backup** e como voltar |

## Atualização em resumo

1. Backup do banco e do `.env.production` **antes** de qualquer coisa (§6.5).
2. Comandos `git` como o usuário dono da pasta: `sudo -u deploy git ...` se você entrou como root.
3. `git pull` da branch `cursor/perfis-e2e-readme-pt` e conferir o commit com `git log --oneline -1`.
4. `docker compose -f compose.prod.yml --env-file .env.production up -d --build`.
5. Conferir nos logs do backend o `Running upgrade ...` das migrações novas e testar em `http://SEU_IP:8080`.
