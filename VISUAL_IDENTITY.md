# HorizonQuest · Midnight Atlas

A identidade combina exploração e desenvolvimento: um horizonte dentro de um emblema hexagonal, superfícies azul-profundo, verde para navegação e dourado para evolução.

## Paleta

| Uso | Cor |
| --- | --- |
| Fundo | `#09131c` |
| Superfície | `#101f2a` |
| Superfície elevada | `#1a2d3a` |
| Borda | `#304957` |
| Texto secundário | `#aabcc5` |
| Texto principal | `#eaf1f5` |
| Marca e foco | `#53d8ba` |
| Ação primária | `#087564` |
| Destaque de progressão | `#edbf6b` |

Os tokens estão em `apps/web/src/index.css`, no bloco `@theme`. As famílias existentes de classes Tailwind usam esses tokens para manter todas as telas coerentes. Vermelho é reservado a erros e exclusões; conquistas usam dourado. Estados também recebem rótulos, não dependem apenas de cor.

## Marca e tipografia

- Marca, emblema e ícones vetoriais: `apps/web/src/components/brand.tsx`.
- Favicon independente: `apps/web/public/horizon-mark.svg`.
- Títulos: Trebuchet MS com fallbacks locais; corpo: Segoe UI, Helvetica Neue e Arial.
- Não há dependência de imagens remotas, fontes externas ou bibliotecas de ícones.
- Utilize títulos curtos e texto de apoio para explicar a próxima ação.

## Layout e responsividade

- A partir de 1100 px: menu lateral fixo de 252 px, com rolagem interna e perfil no rodapé.
- Abaixo de 1100 px: cabeçalho fixo e navegação em gaveta modal, com foco contido, Escape, fechamento pelo fundo e restauração da rolagem.
- Abaixo de 768 px: painel em uma coluna, indicadores em duas colunas e login/cadastro em uma coluna.
- Abaixo de 480 px: margens de 16 px, ações da apresentação empilhadas e cabeçalho compacto.
- Largura mínima de projeto: 320 px. Conteúdo limitado a 1536 px em monitores maiores.
- Formulários usam campos com fonte de 16 px e alvos de toque com pelo menos 44 px. Filtros de revisão empilham em telas estreitas.
- Nomes, descrições e links longos quebram linha; datas e ações podem se reorganizar sem esconder conteúdo.

## Componentes e acessibilidade

- `hq-button`, `hq-panel`, `stat-card` e `journey-hero` definem os componentes visuais do painel.
- `AuthScreen` compartilha estrutura, campos e identidade entre login e cadastro.
- Navegação usa links ativos e ícones decorativos; existe atalho para pular ao conteúdo.
- Foco visível, nomes acessíveis para botões de ícone, progresso de rank identificado e respeito a `prefers-reduced-motion`.
- O menu móvel usa `<dialog>` nativo para conter foco e impedir interação com o conteúdo atrás dele.

## Validação

Compilação e lint do frontend verificam os componentes. As regras responsivas foram revisadas no código; inspeção visual em navegador não fez parte desta etapa.
