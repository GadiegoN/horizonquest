# Publicar gratuitamente: Render + Neon

Use um **Static Site** para o frontend e um **Web Service Free** para a API no Render. Mantenha o PostgreSQL no Neon Free. Ambos os serviços usam o mesmo repositório, mas builds separados.

Os planos gratuitos têm limites de uso. A API do Render dorme após 15 minutos sem tráfego; o primeiro acesso seguinte pode levar cerca de um minuto. O frontend estático continua disponível. Não use o banco gratuito temporário do Render para substituir o Neon existente.

## 1. Repositório e banco

Publique este repositório no GitHub ou outro provedor aceito pelo Render. O commit local não publica o código automaticamente.

Mantenha `.env` somente na máquina local. No painel de hospedagem, configure as variáveis descritas abaixo. Os arquivos `.env.example`, migrations e `pnpm-lock.yaml` devem permanecer no Git.

Use a connection string fornecida pelo painel Neon, incluindo suas opções de SSL. Se quiser separar os dados de demonstração dos dados locais, crie outro projeto/banco no Neon.

## 2. Backend — Render Web Service

Crie um Web Service com runtime Node e instância **Free**.

- **Root Directory:** deixe vazio, usando a raiz do repositório. O backend depende de `packages/shared`, que fica fora de `apps/backend`.
- **Health Check Path:** `/health`.
- **Build Command:**

```sh
pnpm install --frozen-lockfile --prod=false && pnpm --filter @horizon/backend exec prisma generate && pnpm --filter @horizon/shared build && pnpm --filter @horizon/backend build
```

- **Start Command:**

```sh
pnpm --filter @horizon/backend exec prisma migrate deploy && pnpm --filter @horizon/backend start
```

Variáveis do serviço:

| Variável | Valor |
| --- | --- |
| `NODE_VERSION` | `24.14.0` (versão usada na validação local) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Connection string do Neon |
| `JWT_SECRET` | Um segredo aleatório longo, exclusivo desse ambiente |
| `JWT_EXPIRES_IN` | `7d` |

Não fixe `PORT`: use a porta fornecida pelo Render. Configure os segredos apenas no painel, nunca no repositório.

O comando de inicialização aplica migrations pendentes antes de servir a API. Depois do primeiro deploy, anote a URL pública HTTPS da API.

Para popular um banco novo com classes e conquistas, execute uma vez `pnpm --filter @horizon/backend seed` na sua máquina, com o ambiente do backend apontado para esse banco. Para promover uma conta cadastrada, use `ADMIN_EMAIL` ou `REVIEWER_EMAIL` no mesmo ambiente e execute o seed novamente. O seed é idempotente.

## 3. Frontend — Render Static Site

Crie um Static Site ligado ao mesmo repositório.

- **Root Directory:** vazio (raiz do repositório).
- **Publish Directory:** `apps/web/dist`.
- **Build Command:**

```sh
pnpm install --frozen-lockfile --prod=false && pnpm --filter @horizon/shared build && pnpm --filter @horizon/web build
```

Variáveis do frontend:

| Variável | Valor |
| --- | --- |
| `NODE_VERSION` | `24.14.0` |
| `SKIP_INSTALL_DEPS` | `true` (a instalação já está no comando acima) |
| `VITE_API_URL` | URL HTTPS pública da API, sem barra final |

Não coloque `DATABASE_URL` nem `JWT_SECRET` no frontend. Variáveis `VITE_*` entram no JavaScript público. Sempre faça novo deploy do frontend depois de mudar `VITE_API_URL`.

Em **Redirects/Rewrites**, adicione:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Essa regra permite atualizar diretamente páginas como `/dashboard/projects` sem receber 404.

## 4. Conferência depois de publicar

1. Acesse `https://SUA-API.onrender.com/health` e espere `{"status":"ok"}`.
2. Cadastre uma conta pelo frontend para validar também o acesso ao banco.
3. Entre na conta e atualize uma rota interna para verificar a regra de rewrite.
4. Para dados iniciais e operações administrativas, siga o seed acima.

Este documento prepara a publicação; nenhum serviço online foi criado automaticamente.

## Fontes

- [Render: serviços gratuitos e limites](https://render.com/docs/free)
- [Render: Static Sites](https://render.com/docs/static-sites)
- [Render: monorepos](https://render.com/docs/monorepo-support)
- [Render: redirects e rewrites](https://render.com/docs/redirects-rewrites)
- [Render: versão do Node](https://render.com/docs/node-version)
- [Neon: planos](https://neon.com/docs/introduction/plans)
