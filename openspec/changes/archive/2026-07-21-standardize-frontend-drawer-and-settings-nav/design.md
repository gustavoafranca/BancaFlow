## Context

O Web (`apps/web`) tem hoje pelo menos quatro implementações de painel lateral de criação/edição/visualização, sem componente compartilhado:

- `src/modules/pessoas/pages/pessoas.page.tsx`: drawer 100% inline (`style={{}}` + tokens `c` do `ThemeProvider`), com resize por mouse, maximizar/restaurar, abas (Dados/Vínculos) e rodapé por modo. É a **referência visual** citada pelo usuário, mas a tela em si é mock (dados de `pessoas.sample.ts`), sem Radix, sem gestão de foco/Escape.
- `src/modules/configuracoes/components/user-account-drawer.tsx`: já usa `DialogContent variant="drawer"` (Radix Dialog), portanto já tem foco/Escape/portal corretos, mas sem resize nem maximizar. Este é o drawer com dados **reais** (contas de usuário via `accounts.client.ts`).
- `src/modules/acerto/components/{AcertoDrawer,DetailDrawer}.tsx`: mais duas variações próprias.

A change `refine-tenant-user-administration-experience` (tasks 100% concluídas, nunca sincronizada/arquivada) já declarou em sua spec-delta `web-interaction-primitives` que o padrão "linha abre drawer" é canônico, e sua task 6.2 já orientou construir o drawer de usuário sobre `DialogContent variant="drawer"` — ou seja, a decisão de base técnica (Radix Dialog, não um componente do zero) já estava em curso; só faltou generalizar a variante `drawer` para suportar resize/maximizar/abas/rodapé-por-modo e migrar as demais telas.

Descoberta relevante durante a investigação: o backend modela status de conta de usuário como enum autoritativo de 3 valores — `ACTIVE`/`INACTIVE`/`BLOCKED` — com check constraint no banco (`openspec/specs/user-account-management/spec.md`). Isso é deliberado e já implementado (`ToggleAccountStatusUseCase`, `account-status.presentation.ts`), distinto de bloqueio temporário por tentativas inválidas. Isso conflita com o pedido inicial de "status apenas Ativo/Inativo, bloqueio como ação separada" se aplicado sem exceção a Contas de Usuário.

## Goals / Non-Goals

**Goals:**
- Um único componente de Drawer compartilhado, usado por todo o sistema.
- Migrar as 4 implementações existentes para esse componente, preservando o comportamento de dados de cada domínio.
- Configurações navegando por rota com sidebar interna, substituindo `Tabs`.
- Status apresentado como Ativo/Inativo nos domínios sem estado de bloqueio autoritativo no backend.
- Consolidar testes de drawer, sem regredir o tempo total da suíte Web.

**Non-Goals:**
- Nenhuma mudança de backend, contrato de API, schema Prisma ou regra de permissão.
- Não redefinir `AccountStatus` do backend para 2 valores — Contas de Usuário mantém os 3 estados existentes (`ACTIVE`/`INACTIVE`/`BLOCKED`) como exceção documentada.
- Não é objetivo desta change implementar as capabilities ainda inexistentes de Turnos, Configuração do Jogo, Segurança ou Auditoria — apenas preparar a navegação/rota para elas, respeitando `settings-capability-visibility`.
- Migração de `AcertoDrawer`/`DetailDrawer` pode ficar como fase 2 explícita em `tasks.md` se o risco de regressão de dados for alto — não bloqueia a entrega do componente e da migração de Configurações/Pessoas.

## Decisions

### 1. Estender `DialogContent variant="drawer"` em vez de criar um primitive do zero
**Decisão**: evoluir `apps/web/src/shared/components/ui/dialog.tsx` (variante `drawer`) para suportar largura controlada/redimensionável, maximizar/restaurar e rodapé por modo, em vez de criar um arquivo `drawer.tsx` totalmente novo e paralelo.
**Alternativas consideradas**: (a) componente novo do zero — rejeitado por duplicar a infraestrutura de foco/portal/Escape que o Dialog Radix já resolve corretamente e que a task 6.2 do `refine-...` já vinha adotando; (b) extrair um `Drawer` que envolve `Dialog` internamente (composição, não herança de variant) — aceitável como refinamento de implementação; a escolha entre "variant" e "wrapper" fica a critério de quem implementar, desde que o resultado seja um único ponto de verdade em `shared/components/ui`.
**Por quê**: reaproveita foco/Escape/portal/tema já corretos no Dialog, reduz risco de regressão de acessibilidade, e continua a direção já validada pela change anterior.

### 2. Pessoas é referência visual, não fonte do código
**Decisão**: o markup inline de `pessoas.page.tsx` não é portado como está. Ele define o alvo visual (header, resize, maximizar, abas, rodapé) que o componente compartilhado deve reproduzir; a implementação técnica segue a decisão 1.
**Por quê**: o inline de Pessoas não tem gestão de foco/Escape/portal-tema e é uma tela mock; copiá-lo literalmente replicaria os mesmos problemas de acessibilidade que este componente deve resolver.

### 3. Status de Conta de Usuário é exceção documentada, não violação
**Decisão**: a regra "status apenas Ativo/Inativo" se aplica a Pessoas, Cambistas, Turnos e futuros cadastros que não têm estado de bloqueio autoritativo no backend. Contas de Usuário mantém os 3 estados (`ACTIVE`/`INACTIVE`/`BLOCKED`) inalterados, pois isso é modelo de backend já correto e testado, e mudar exigiria migration/enum change — fora do escopo desta change (Web-only).
**Alternativas consideradas**: reescrever o backend para separar `blocked` como flag independente do status — rejeitado por violar a restrição "backend não muda" e por não ser necessário: o problema relatado pelo usuário é de duplicação de drawer/nav, não de modelagem de status de conta.

### 4. Sidebar de Configurações respeita o estado "capability indisponível" já existente
**Decisão**: itens de sub-rota para áreas não implementadas (Turnos, Jogo, Auditoria) usam o mesmo componente de estado indisponível já presente em `configuracoes.page.tsx`, ou são omitidos da sidebar até existirem — nunca uma página placeholder que finge estar pronta.
**Por quê**: evita reabrir a violação que `settings-capability-visibility` foi criada para prevenir.

### 5. Testes de drawer migram para o componente, saem das páginas
**Decisão**: o novo `drawer.spec.tsx` cobre foco/Escape/resize/maximizar/rodapé-por-modo/tema uma única vez. Specs de página (`usuarios-section.spec.tsx`, etc.) removem essas asserções duplicadas e mantêm apenas integração de domínio.
**Por quê**: é a maior fonte de tempo de suíte hoje (`usuarios-section.spec.tsx` ~9,3s) e de duplicação de cobertura; consolidar reduz ambos.

## Risks / Trade-offs

- **[Risco]** Migrar `AcertoDrawer`/`DetailDrawer` pode quebrar regras específicas de Acerto se o invólucro visual não for trocado com cuidado → **[Mitigação]** migração incremental, tela a tela, com testes de integração de domínio intactos antes/depois da troca de invólucro.
- **[Risco]** Generalizar a variante `drawer` do Dialog para suportar resize/maximizar pode introduzir regressão visual nas telas que já usam `variant="drawer"` (ex.: `user-account-drawer.tsx`) → **[Mitigação]** validação visual manual em claro/escuro/desktop/mobile antes de migrar cada consumidor, conforme já exigido por `web-frontend-testing`.
- **[Risco]** Remover testes de drawer duplicados das páginas pode reduzir cobertura real se a extração não for feita com cuidado → **[Mitigação]** só remover uma asserção de página depois que o cenário equivalente existir e passar no `drawer.spec.tsx`.
- **[Trade-off]** Tratar Contas de Usuário como exceção ao padrão binário de status adiciona uma regra especial ao sistema, mas evita uma mudança de backend fora de escopo e mais arriscada que o problema original.

## Migration Plan

1. Generalizar a variante `drawer` do Dialog compartilhado (resize, maximizar, rodapé por modo, abas, loading) com testes próprios.
2. Migrar `user-account-drawer.tsx` (Configurações/Usuários) para o componente generalizado — maior valor, dado real, já usa a mesma base Radix.
3. Migrar `pessoas.page.tsx` para consumir o componente, usando seu próprio visual como referência de paridade.
4. Reestruturar `/configuracoes` para sidebar interna por rota, com `/configuracoes/usuarios` e `/configuracoes/perfis` como sub-rotas reais.
5. Migrar `AcertoDrawer`/`DetailDrawer` (pode ser adiado para uma fase 2 explícita em `tasks.md` conforme risco observado no passo 2/3).
6. Consolidar testes de drawer no componente compartilhado e remover duplicação nas páginas; medir tempo total da suíte contra o baseline.

Rollback: cada passo troca apenas invólucro de UI por módulo; reverter um commit específico não afeta os demais módulos já migrados, pois cada um consome o componente compartilhado de forma independente.

### 6. Change desacoplada do archive de `enable-`/`refine-`
**Decisão**: esta change é autossuficiente contra o main atual. Usa apenas capabilities novas (`canonical-drawer`, `settings-area-navigation`) e um `MODIFIED` de `web-frontend-testing` cujo requisito-base já existe no main e não conflita com o delta ADDED de `refine-`. A honestidade das sub-áreas de Configurações ainda não implementadas foi movida para dentro de `settings-area-navigation`, em vez de um delta de `settings-capability-visibility` que dependeria do arquivamento prévio.
**Por quê (o que motivou o desacoplamento)**: ao tentar arquivar `enable-` para atualizar o main, o OpenSpec abortou corretamente — os deltas `MODIFIED` de `enable-` estão defasados frente ao main (que já absorveu `establish-authoritative-role-permissions` e `enable-profile-security-management`). São 8 requisitos em 5 capabilities que dropariam/renomeariam cenários, vários legítimos e sensíveis a segurança (isolamento entre bancas, reset de lockout). Reconciliar isso é um esforço dedicado, por requisito, e não deve ser espremido nesta change de UI. Consequência: a contradição "abas vs. sidebar por rota" fica deferida — quem reconciliar `refine-` deve remover o requisito de abas em favor de `settings-area-navigation`.
**Alternativa considerada**: reconciliar e arquivar `enable-`+`refine-` primeiro (ordem obrigatória). Rejeitada por ora: escopo muito maior que o previsto, com risco de apagar cenários de segurança legítimos se feito às pressas.

### 7. Drawer top offset é decisão de layout a unificar
**Decisão de implementação a tomar no grupo 3**: hoje `user-account-drawer` (via `DialogContent variant="drawer"`) cola no topo `top-0` sobre a navbar, enquanto Pessoas/Acerto abrem abaixo da navbar (`top: 54`). O componente canônico precisa escolher um comportamento único e aplicá-lo a todos os consumidores.

### 8. Selection Button Group (ajuste solicitado antes do archive)
**Decisão**: criar `apps/web/src/shared/components/ui/selection-button-group.tsx` sobre `@radix-ui/react-radio-group` (mesma família Radix já usada por `Dialog`/`Select`/`Tabs`), reaproveitando exatamente os valores de cor de `badgeVariants` (`badge.tsx`) por variante — sem paleta nova. "Papel" e "Status" em Usuários eram botões de AÇÃO ("Tornar ADMIN", "Desativar", "Bloquear") representando na verdade uma SELEÇÃO de estado; viram Selection Button Groups, como Pessoas (Tipo/Status) já fazia de forma bespoke — migrado para o mesmo componente compartilhado, não apenas visualmente parecido.
**Status de conta com 3 opções (resolvido com o usuário)**: como `BLOCKED` é um status real e persistido no backend (não uma flag independente — ver decisão 3), o seletor de Status de Contas de Usuário mostra as 3 opções reais (Ativo/Inativo/Bloqueado) em vez de 2 opções + botão "Bloquear" separado. Selecionar qualquer opção diferente da atual abre o mesmo modal de confirmação já existente; nenhuma transição é bloqueada pelo Backend (`toggle-account-status.dto.ts` aceita as 4 ações independente do status atual), então as 3 opções ficam sempre habilitadas. `activate`/`unblock` produzem o mesmo estado final (`ACTIVE`, sem revogar sessão) — usa-se `unblock` especificamente na transição Bloqueado→Ativo (rótulo de confirmação mais claro), `activate` nas demais.
**Ações que permanecem `Button` tradicional**: Salvar, Editar, Excluir, Redefinir senha, Fechar, Cancelar — nunca usam o Selection Button Group, mesmo quando abrem um modal de confirmação (a distinção é "isto seleciona um valor" vs. "isto executa uma operação").
**Alternativa considerada**: manter 2 opções (Ativo/Inativo) + ação "Bloquear" separada, como no exemplo original do usuário. Rejeitada após a própria resolução do usuário, por deixar o seletor sem opção correta marcada quando a conta está de fato bloqueada — uma representação visual incorreta do estado real.

## Risks / Trade-offs (adendo)

- **[Risco]** Contradição futura no main: quando `refine-` for reconciliado/arquivado, seu requisito "Settings is organized into high-level tabs for OWNER" entraria no main conflitando com `settings-area-navigation` (sidebar por rota) desta change → **[Mitigação]** documentado no proposal (Impact) e na task 9.x: a reconciliação de `refine-` deve remover/ajustar o requisito de abas.
- **[Risco]** O E2E `logout-and-user-administration.e2e.spec.ts` assume URL `/configuracoes$` e `role: 'tab'` "Usuários"; a troca para rota+sidebar quebra ambos → **[Mitigação]** task 7.7 atualiza essas asserções junto com a mudança de navegação.

## Open Questions (resolvidas)

1. **Turnos / Configuração do Jogo / Segurança / Auditoria**: omitidos da sidebar nesta change — só aparecem quando a capability correspondente existir no backend. Sidebar lista apenas Geral (se aplicável), Usuários e Perfis de acesso.
2. **Largura do Drawer**: só em memória, por sessão/instância. Sem `localStorage`, sem preferência persistida entre reloads.
3. **`Excluir` em Pessoa/Usuário**: confirmado por código — não existe endpoint de exclusão em `accounts.controller.ts` (só `DELETE :accountId/sessions/:sessionId`, que é revogação de sessão) nem para Pessoa (tela mock, sem backend). O botão `Excluir` do Drawer canônico fica **oculto** em ambos os domínios até existir contrato real; o rodapé de edição usa apenas `Fechar` + `Salvar Alterações`.
4. **`AcertoDrawer`/`DetailDrawer`**: **fase 2, fora desta change**. Migração fica registrada na task 7.1/7.2 como avaliação, não execução.
5. **Offset de topo do Drawer**: abaixo da navbar (`top: 54px` / `h-[calc(100vh-54px)]`), consistente com Pessoas — a navbar principal permanece sempre visível e clicável com o drawer aberto. `user-account-drawer` (hoje `top-0`) migra para esse offset.
