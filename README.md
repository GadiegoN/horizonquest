# HorizonQuest

Sistema de quests gamificado para desafios, submissões, revisão, XP e progressão de jogadores. Monorepo pnpm/Turborepo com React, Vite, React Router e Tailwind no frontend, Express, Prisma e PostgreSQL/Neon no backend.

Histórico e checklist: [CHANGELOG.md](./CHANGELOG.md).

## Executar localmente

Use Node.js 22.12+ e pnpm 9.3.0. Copie `apps/backend/.env.example` para `apps/backend/.env` e configure:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="segredo-aleatorio-longo"
JWT_EXPIRES_IN="7d"
PORT=3333
```

O frontend usa `http://localhost:3333` por padrão. Para mudar, configure `VITE_API_URL` em `apps/web/.env`, seguindo o arquivo de exemplo.

```bash
pnpm install
pnpm --filter @horizon/backend exec prisma migrate deploy
pnpm --filter @horizon/backend exec prisma generate
pnpm --filter @horizon/backend seed
pnpm build
pnpm dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:3333`

Saúde da API: `/health`

Para executar o backend compilado após `pnpm build`:

```bash
pnpm --filter @horizon/backend start
```

## Fluxo de uso

1. Cadastre uma conta e complete o perfil com classe, avatar HTTP/HTTPS e biografia para receber 30 XP uma única vez.
2. Um administrador cadastra e ativa templates de quests.
3. Inicie uma quest e envie repositório, demo ou observações. Cada jogador pode manter uma quest em andamento ou submetida por vez.
4. Um revisor ou administrador diferente do dono aprova ou rejeita a entrega. Rejeições exigem comentário.
5. Uma aprovação concede o XP do template, atualiza o rank e desbloqueia conquistas. O modal aparece quando a atualização de XP chega ao navegador.
6. Quests rejeitadas podem ser reenviadas ou canceladas. Antes de reenviar, conclua ou cancele outra quest ativa.

O perfil e Minhas Missões atualizam a cada 20 segundos; o perfil também atualiza ao retornar à janela. O saldo já visto é guardado por jogador neste navegador, permitindo notificar ganhos recebidos entre visitas sem reapresentar todo o XP antigo no primeiro acesso.

## Papéis e permissões

| Operação | user | reviewer | admin |
| --- | --- | --- | --- |
| Perfil, quests próprias, conquistas, histórico e ranking | Sim | Sim | Sim |
| Ver fila e revisar submissões de outro jogador | Não | Sim | Sim |
| Criar, editar, ativar/desativar e excluir templates/classes | Não | Não | Sim |
| Consultar auditoria da guilda | Não | Não | Sim |
| Modificar quest de outro jogador ou revisar a própria entrega | Não | Não | Não |
| Adicionar XP arbitrariamente | Não | Não | Não |

Detalhes são acessíveis ao dono, aos revisores de uma submissão pendente e ao responsável por uma revisão anterior. A API verifica o papel atual no banco, além da proteção de rotas e menus no frontend.

Novos usuários recebem `user`. Para promover contas já cadastradas, configure no ambiente do backend e execute o seed:

```env
ADMIN_EMAIL="admin@example.com"
REVIEWER_EMAIL="revisor@example.com"
```

```bash
pnpm --filter @horizon/backend seed
```

O seed é idempotente e cria 5 classes e 8 conquistas.

## Rotas principais

- `/dashboard`: resumo e atividades recentes.
- `/dashboard/quests`: quests disponíveis.
- `/dashboard/quests/my`: quests do jogador.
- `/dashboard/quests/instance/:id`: detalhes, submissão e comentário da revisão.
- `/dashboard/quests/review`: fila com filtros por classe, dificuldade e tipo.
- `/dashboard/quest-templates`: templates, para administradores.
- `/dashboard/classes`: classes, para administradores.
- `/dashboard/profile`: perfil e progressão.
- `/dashboard/achievements`: conquistas e datas de desbloqueio.
- `/dashboard/ranking`: até 100 aventureiros ordenados por XP, nome e ID para desempate estável.
- `/dashboard/activity`: últimos 100 eventos do jogador.
- `/dashboard/audit`: últimos 100 eventos da guilda, para administradores.

A API aceita filtros combinados em `/quests/review/pending?classId=...&difficulty=...&type=...`; a auditoria aceita `type` em `/profile/audit`.

Templates com instâncias preservam título, descrição e recompensa: podem ser ativados/desativados, mas não editados. Sua exclusão é lógica. Templates sem instâncias podem ser excluídos permanentemente. O XP por template deve ser um inteiro entre 1 e 100.000.

## Validação

```bash
pnpm build
pnpm lint
pnpm test
```

`pnpm test` usa o banco configurado no backend, já migrado e com o seed aplicado. Cria contas e dados temporários com identificadores únicos, inicia uma API numa porta local livre e remove apenas os registros criados pela execução. Não precisa de `pnpm dev` aberto.

A suíte cobre os três papéis, revogação de permissões, isolamento entre jogadores, perfil/XP único, concorrência de início e revisão, administração de templates, filtros, rejeição/reenvio, conquistas, ranking e auditoria. Build, lint e testes de integração passaram. A inspeção visual no navegador ficou indisponível nesta sessão; não foi considerada validada.

Upgrades de majors não são necessários para este escopo funcional e permanecem como manutenção separada.


## Projetos, diário e taverna

As três áreas estão disponíveis no menu para todas as contas autenticadas e reutilizam as tabelas existentes, sem novas migrations.

- `/dashboard/projects`: projetos públicos da guilda, busca por nome/descrição, filtro de status e filtro de participação. Qualquer jogador cria um projeto e entra como proprietário. O criador edita, muda o status, remove colaboradores e exclui o projeto. Outros jogadores podem entrar em projetos em ideia/desenvolvimento e sair da equipe. Projetos concluídos ou arquivados não aceitam novas participações. Excluir um projeto remove a equipe, preservando registros de correções existentes sem vínculo com o projeto.
- `/dashboard/projects/:id`: descrição, repositório, status e equipe. A entrada repetida não duplica membros, inclusive com requisições simultâneas.
- `/dashboard/journal`: diário privado com título, conteúdo, data de referência opcional, busca, criação, edição e exclusão. Administradores e revisores não podem ler ou alterar registros de outros jogadores. O conteúdo do diário não é incluído na auditoria.
- `/dashboard/tavern`: mensagens públicas para a guilda, busca, respostas com citação, edição pelo autor e exclusão pelo autor ou administrador. Excluir uma mensagem preserva suas respostas, removendo a citação. A exclusão administrativa é auditada. Atualização automática a cada 15 segundos com a aba visível.

As listas têm paginação de 20 itens. Projetos e mensagens não concedem XP automaticamente. Limites: descrição de projeto com até 5.000 caracteres, diário com até 20.000 e mensagem com até 2.000.

APIs autenticadas: `/projects`, `/journal` e `/tavern`, com `GET`, `POST`, `PUT /:id` e `DELETE /:id` para as operações correspondentes. Detalhes de projeto: `GET /projects/:id`; participação: `POST /projects/:id/join`; saída/remoção: `DELETE /projects/:id/members/:profileId`. Listas aceitam `page` e `q`; projetos também aceitam `status` e `mine=true`.

`pnpm test` executa também `community.test.ts`: CRUD, participação concorrente, permissões de equipe, privacidade do diário, busca/paginação, respostas e moderação da taverna. Os dados temporários dos testes são removidos ao terminar.


## HQCoins e Loja da Guilda de Cosméticos

A moeda **HQCoin** recompensa os aventureiros e permite personalizar sua presença na guilda com distinções cosméticas visíveis no perfil, na taverna e no ranking:

- **Saldo Inicial**: Novos aventureiros recebem **100 HQCoins** ao criar a conta.
- **Ganhos**: Conclusão do perfil (+30 HQCoins) e aprovação de quests (+50% do XP base em HQCoins, mínimo de 10 HQCoins).
- **Auditabilidade**: Todas as movimentações geram registros imutáveis na tabela `CoinTransaction`.
- **Rota no painel**: `/dashboard/shop` com:
  - **Espelho da Guilda**: Pré-visualização ao vivo do cartão do aventureiro com tema, moldura de avatar, badge de cor e título antes de comprar ou equipar.
  - **Categorias e Filtros**: Títulos de Honra, Molduras de Avatar, Cores/Badges de Nome, Temas do Cartão e Meus Itens Adquiridos.
  - **Raridades**: Comum, Raro, Épico e Lendário ★.
- **APIs autenticadas**:
  - `GET /shop/items`: catálogo com status de aquisição e item equipado.
  - `POST /shop/buy/:id`: compra com validação de saldo e prevenção de duplicatas.
  - `POST /shop/equip`: equipar ou desequipar cosméticos por tipo.
  - `GET /shop/inventory`: inventário pessoal de cosméticos.
- **Cobertura de testes**: `shop.test.ts` valida concessão inicial, compras, bloqueio de saldo insuficiente, equipamentos de cosméticos e reflexo no ranking.


## Identidade visual

A interface usa a identidade Midnight Atlas, com emblema próprio, tema azul-profundo/verde/dourado e layout adaptável a celulares, tablets e desktop. Regras de marca, componentes e breakpoints estão em [VISUAL_IDENTITY.md](./VISUAL_IDENTITY.md).


## Publicação gratuita

Veja [DEPLOY.md](./DEPLOY.md) para publicar o frontend e a API no Render e usar PostgreSQL no Neon. O guia inclui comandos do monorepo, variáveis de ambiente e configuração das rotas da SPA.

