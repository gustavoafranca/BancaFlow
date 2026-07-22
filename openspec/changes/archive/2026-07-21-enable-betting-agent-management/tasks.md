## 1. Negócio (domínio `modules/participants`)

- [x] 1.1 Definir/ajustar DTOs de entrada do domínio para edição: `UpdateBettingAgentProfileInput` (`name?`, `nickname?`, `phones?: { phone: string; label?: string }[]`, `address?: { street?, number?, neighborhood, city } | null`) e `SetBettingAgentStatusInput` (`status: 'ACTIVE' | 'INACTIVE'`), usando `module-dto`.
- [x] 1.2 Ajustar `PartyContact`/reconciliação de contatos no agregado `Party` para aceitar `label` opcional e suportar substituição total da lista (add/remove/atualizar rótulo por telefone normalizado existente), usando `module-entity`/`module-value-object` apenas se a entidade/VO precisar de ajuste real.
- [x] 1.3 Ajustar `PartyAddress` para suportar substituição (encerrar vigência ativa e abrir novo endereço) e remoção (apenas encerrar vigência ativa) via o agregado `Party`.
- [x] 1.4 Implementar caso de uso `UpdateBettingAgentProfile`: carrega `BettingAgent`+`Party` por `bancaId`+`id`, aplica edição de nome/apelido/contatos/endereço via `PartyRepository`, ignora `code`/política se presentes no payload, tudo em transação (`module-use-case`).
- [x] 1.5 Implementar caso de uso `SetBettingAgentStatus`: carrega `BettingAgent` por `bancaId`+`id`, aplica transição `ACTIVE`⇄`INACTIVE` via VO `BettingAgentStatus`, idempotente, em transação (`module-use-case`).
- [x] 1.6 Estender `BettingAgentRepository`/`PartyRepository` (contratos) com os métodos necessários para carregar e persistir a edição/transição, sem expor delete (`module-repository`).
- [x] 1.7 Testes unitários dos VOs/entidades e casos de uso: edição de nome/apelido; reconciliação de contatos (add/remove/atualizar rótulo); reconciliação de endereço (substituir/remover); rejeição de telefone inválido; imutabilidade de `code`; transição de status idempotente; rollback em falha.

## 2. Backend (`apps/backend/src/modules/participants` e `access-control`)

- [x] 2.1 Adicionar `participants.betting-agents.update` ao catálogo autoritativo (`PermissionKey`, metadados de apresentação em português, decisão por papel: `OWNER` concede, `ADMIN` concede, `USER` nega) em `apps/backend/src/modules/access-control`, seguindo a regra de evolução do catálogo (`backend-controller`/ajuste direto no módulo access-control).
- [x] 2.2 Atualizar teste de integridade do catálogo para cobrir a nova chave (papel sem decisão explícita deve falhar o teste).
- [x] 2.3 Criar `UpdateBettingAgentDto` (`name?`, `nickname?`, `phones?: { phone: string; label?: string }[]`, `address?: BettingAgentAddressBodyDto | null`) e `SetBettingAgentStatusDto` (`status`), sem aceitar `code` nem `policy` (`module-dto`/`backend-controller`).
- [x] 2.4 Alterar `CreateBettingAgentDto.phones` de `string[]` para `{ phone: string; label?: string }[]` (BREAKING no `POST`), ajustando validação `class-validator` aninhada.
- [x] 2.5 Adicionar `PATCH /participants/betting-agents/:id` e `PATCH /participants/betting-agents/:id/status` ao `betting-agent.controller.ts`, autorizados via `hasPermission(actorRole, 'participants.betting-agents.update')`, com `bancaId`/autor sempre do contexto autenticado (`backend-controller`).
- [x] 2.6 Implementar/ajustar adapters Prisma (`backend-prisma-data`) para reconciliação de `PartyContact`/`PartyAddress` (comparação por telefone normalizado, encerramento de vigência de endereço) com mapeamento explícito banco↔domínio↔DTO.
- [x] 2.7 Confirmar que nenhuma migration de schema é necessária (`PartyContact.label`, `PartyAddress`, `BettingAgent.status` já existem); documentar essa constatação no PR/README do módulo.
- [x] 2.8 Mapear falhas de domínio para os erros estáveis existentes (`BETTING_AGENT_NOT_FOUND`, `FORBIDDEN`, `INVALID_PHONE`, `INVALID_ADDRESS`) nos dois novos endpoints; garantir que recurso de outra Banca responde como não encontrado.
- [x] 2.9 Garantir que telefones/endereços completos não são registrados em log nos novos fluxos.
- [x] 2.10 Testes de integração real (Postgres) para: edição de perfil completa; reconciliação de contatos/endereço; imutabilidade de `code`/política; transição de status idempotente e tenant-scoped; autorização OWNER/ADMIN autorizados e USER bloqueado em ambos os endpoints novos; isolamento de tenant (Banca A não edita/altera status de recurso da Banca B).
- [x] 2.11 Atualizar `apps/backend/src/modules/participants/README.md` com os dois novos endpoints, o novo formato de `phones` e a nova permissão.

## 3. Web (`apps/web/src/modules/cambistas`)

- [x] 3.1 Criar `PhoneInput` reutilizável em `apps/web/src/shared/components/ui/` com máscara BR (`(XX) XXXX-XXXX` / `(XX) XXXXX-XXXX`), armazenando somente dígitos, `inputMode="tel"`, integrável a React Hook Form (`frontend-module-workflow` para decidir ownership em shared).
- [x] 3.2 Atualizar `data/betting-agent.schema.ts`: ajustar schema de criação para `phones: { phone, label? }[]`; criar `updateBettingAgentSchema` (code somente leitura/omitido) reaproveitando os VOs locais existentes; validar telefone via VO local espelhando 10/11 dígitos (`frontend-form-schema`).
- [x] 3.3 Atualizar `data/betting-agent.client.ts`: ajustar `create()` para o novo formato de `phones`; adicionar `update()` e `setStatus()`, mapeando os códigos de erro de domínio no mesmo padrão discriminado existente.
- [x] 3.4 Unificar `CreateBettingAgentDrawer` + `BettingAgentDetailDrawer` em `components/betting-agent-drawer.tsx` num único drawer com modos **add/view/edit**, usando o primitive `Tabs` (`apps/web/src/shared/components/ui/tabs.tsx`) para as três abas: Cadastro, Endereço, Contato.
- [x] 3.5 Aba Cadastro: código (somente leitura no modo edit), nome, apelido, política (exibida, não editável nesta change).
- [x] 3.6 Aba Endereço: adicionar inputs de `street`/`number` (já existem no schema, sem UI), manter `neighborhood`/`city` obrigatórios quando há endereço.
- [x] 3.7 Aba Contato: lista dinâmica de telefones usando `PhoneInput`, cada um com rótulo opcional.
- [x] 3.8 Ligar modo edit ao `DrawerFooter` (`mode="edit"`, `onEdit`/`onSave`) chamando `update()`; ligar controle de ativar/inativar chamando `setStatus()`, refletindo imediatamente no Badge da linha e nos cards de estatística de `cambistas.page.tsx`.
- [x] 3.9 Aplicar `useHasPermission` para `participants.betting-agents.create`/`update`/`read`, escondendo cadastrar/editar/ativar de quem não tem `create`/`update` e exigindo `read` para lista/detalhe.
- [x] 3.10 Alinhar estilo do drawer unificado aos padrões Tailwind/`.docs/prompts/21-frontend-ui-standards.md`, removendo o estilo inline (`style`+`useTheme`) do drawer atual sem introduzir regressão visual.
- [x] 3.11 Testes Web: os três modos do drawer (add/view/edit); navegação por abas por teclado; loading/erro/vazio; `PhoneInput` mascarando/normalizando 10 e 11 dígitos; ocultação de controles por permissão.

## 4. Integração e revisão

- [x] 4.1 Rodar build, lint e testes por workspace (`modules/participants`, `apps/backend`, `apps/web`).
- [x] 4.2 Validar a change com `openspec validate enable-betting-agent-management --strict`.
- [x] 4.3 Conferir que a nova permissão `participants.betting-agents.update` aparece corretamente na matriz "Perfis de acesso" já existente (`GET /access-control/role-permissions`), sem exigir código novo na tela de Configurações além da regra de evolução do catálogo já seguida.
- [x] 4.4 Confirmar isolamento de tenant fim a fim (edição, status, leitura) com dados reais em Postgres.
- [x] 4.5 Revisar `.docs/plans/01-participants.md` e confrontar a entrega com os requisitos do INC-02; registrar desvios, se houver.
