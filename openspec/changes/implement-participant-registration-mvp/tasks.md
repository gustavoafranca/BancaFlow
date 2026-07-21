# Tasks — implement-participant-registration-mvp

> Estratégia de aplicação futura (contextos limpos): **Grupo 2 (Negócio) primeiro**; depois **Backend (Grupo 3)** e **Web (Grupo 5)** em subagentes separados, quando os contratos (ports/DTOs/rotas) estiverem estáveis; **Grupo 6 (integração/revisão)** por um responsável coordenador.
> Esta proposta apenas prepara as tarefas — não inicia subagentes, não implementa código, não roda migration e não aplica a change.
> Cada tarefa referencia specs em `specs/**` e o `design.md` (decisões `T1`–`T8`).
> **Dependência cruzada de aplicação:** as tasks 2.4.2–2.4.4 e 3.2.4 (autorização) dependem de `modules/access-control` existir com `hasPermission` e as chaves `participants.betting-agents.create|list|read` mapeadas (change `establish-authoritative-role-permissions`, ver proposal.md desta change). Se este change for aplicado antes daquele, essas tarefas de autorização ficam bloqueadas até `access-control` existir — não implementar checagem de papel bruto como substituto temporário.

## 1. Fundação — `config-new-module` (skill: config-new-module)

- [ ] 1.1 Ler o plano aprovado e confirmar o nome técnico do módulo (`participants`) e a rota reaproveitada (`cambistas`)
- [ ] 1.2 Executar o dry-run e revisar todos os caminhos: `node .claude/skills/config-new-module/scripts/create-module.mjs participants --mode fullstack --route cambistas --dry-run`
- [ ] 1.3 Após revisão, executar o scaffold: `node .claude/skills/config-new-module/scripts/create-module.mjs participants --mode fullstack --route cambistas`
- [ ] 1.4 Confirmar as fronteiras criadas (`modules/participants`, `apps/backend/src/modules/participants`, `apps/backend/prisma/models/participants.model.prisma`, `apps/web/src/modules/cambistas` já existente preservado, registro idempotente no `AppModule`) sem conteúdo de negócio fictício
- [ ] 1.5 NÃO usar `config-project`, `config-prisma`, `config-shared-backend`, `config-shared-frontend` (infra já existe) nem `module-aggregate` (evitar CRUD genérico com delete)

## 2. Negócio — `modules/participants` (subagente Negócio; contexto: só `modules/participants/**`)

### 2.1 Erros e portas (skills: module-repository, module-query-cqrs)

- [ ] 2.1.1 Criar `shared/errors/participants.errors.ts` com códigos estáveis `PARTICIPANTS.FORBIDDEN`, `CODE_ALREADY_EXISTS`, `POSSIBLE_DUPLICATE`, `BETTING_AGENT_NOT_FOUND`, `INVALID_POLICY`, `INVALID_ADDRESS`, `INVALID_CODE`, `PARTY_ALREADY_HAS_AGENT` + `type ParticipantsErrorCode` (design T4/T5/T7)
- [ ] 2.1.2 Criar `shared/ports/clock.port.ts` (`interface Clock { now(): Date }`); reutilizar `TransactionManager`, `Id`, `PaginatedInputDTO/PaginatedResultDTO` de `@bancaflow/shared` sem duplicar (design T1/T3)
- [ ] 2.1.3 Criar `party/party.repository.ts` — `PartyRepository` com `nextId()`, `save(party, tx?)`; sem `delete` (spec participant-registration; design T3)
- [ ] 2.1.4 Criar `betting-agent/betting-agent.repository.ts` — `BettingAgentRepository` com `nextId()`, `save(agent, tx?)`, `findById(id, bancaId)`; sem `delete` (design T3)
- [ ] 2.1.5 Criar `party/query/party-duplicate.query.ts` — `PartyDuplicateQuery` retornando candidatos mínimos tenant-scoped por telefone e por nome+apelido (spec participant-registration: alerta confirmável)
- [ ] 2.1.6 Criar `betting-agent/query/betting-agent.query.ts` — `BettingAgentQuery` com `list(bancaId, filtros, paginação): PaginatedResultDTO<BettingAgentListItemDTO>` e `getDetail(id, bancaId): BettingAgentDetailDTO | null` (spec betting-agent-catalog: projeções)

### 2.2 Value Objects (skill: module-value-object)

- [ ] 2.2.1 Criar `betting-agent/vo/betting-agent-code.vo.ts` — trim externo, somente dígitos, zeros à esquerda preservados, `value: string`, nunca numérico (spec betting-agent-catalog; design T5)
- [ ] 2.2.2 Criar `betting-agent/vo/betting-agent-status.vo.ts` — `ACTIVE | INACTIVE`, início `ACTIVE` (spec betting-agent-catalog)
- [ ] 2.2.3 Criar `betting-agent/vo/compensation-policy.vo.ts` — união discriminada `PERCENTAGE_ON_SALES | FIXED_WEEKLY | FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`; rejeitar `FIXED_PER_ENTRY` e valores inválidos; monetário sem float binário (spec betting-agent-compensation-policy; design T6)
- [ ] 2.2.4 Criar `party/vo/effective-period.vo.ts` — início obrigatório, fim opcional (usado por endereço e política) (spec ...compensation-policy; design T1)
- [ ] 2.2.5 Criar `party/vo/phone.vo.ts` — normalização/validação de telefone (não existe `Phone` em `@bancaflow/shared`) (spec participant-registration)
- [ ] 2.2.6 Criar `party/vo/neighborhood.vo.ts` e `party/vo/city.vo.ts` — preservam exibição e expõem valor normalizado para busca/agrupamento (spec participant-registration)
- [ ] 2.2.7 Criar `party/vo/party-type.vo.ts` — somente `PERSON` neste incremento (`ORGANIZATION` rejeitado) (spec participant-registration; D29)

### 2.3 Entidades e agregados (skill: module-entity)

- [ ] 2.3.1 Criar `party/party-contact.entity.ts` e `party/party-address.entity.ts` — entidades filhas, ctor privado + `rebuild()` com spread raso (evitar bug `cloneWith`/Date), alteradas só pelo agregado Party (spec participant-registration; design T1)
- [ ] 2.3.2 Criar `party/party.entity.ts` — agregado `Party` PERSON: `id`, `bancaId`, nome/apelido opcionais, `PartyContact[]`, `PartyAddress` inicial opcional (bairro+cidade obrigatórios; único ativo), auditoria; `create`/`tryCreate` com `Result.combine` (spec participant-registration; design T2)
- [ ] 2.3.3 Criar `betting-agent/betting-agent.entity.ts` — agregado `BettingAgent`: `id`, `bancaId`, `partyId`, `code`, `status=ACTIVE`, política inicial vigente, auditoria; invariante Party+Agent na mesma Banca (spec betting-agent-catalog; design T2)
- [ ] 2.3.4 Escrever testes unitários dos VOs e entidades cobrindo: `001` permanece `001`; código não numérico rejeitado; política obrigatória/tipos válidos; endereço exige bairro+cidade; único endereço ativo; normalização de bairro/cidade (specs; critérios de aceitação do plano)
- [ ] 2.3.5 Justificar ausência de `module-domain-service`: coordenação Party+BettingAgent é do caso de uso; nenhuma regra transversal genuína (design T2)

### 2.4 DTOs e casos de uso (skills: module-dto, module-use-case)

- [ ] 2.4.1 Criar DTOs de leitura `BettingAgentListItemDTO` e `BettingAgentDetailDTO` (projeções sem regra de domínio nem acoplamento a ORM) e DTO de entrada de criação com `confirmPossibleDuplicate` (spec betting-agent-catalog; design T3/T4)
- [ ] 2.4.2 Criar `app/use-case/create-betting-agent.use-case.ts` — autorizar via `hasPermission(actorRole, 'participants.betting-agents.create')` (porta de `modules/access-control`, requer change `establish-authoritative-role-permissions` aplicada); construir domínio; se não confirmado, consultar `PartyDuplicateQuery` e retornar `POSSIBLE_DUPLICATE` com candidatos sem persistir; senão, `runInTransactionResult` criando Party+BettingAgent+política atomicamente; mapear conflito de código para `CODE_ALREADY_EXISTS`; `Clock` para datas (specs participant-registration + betting-agent-catalog + ...compensation-policy; design T4)
- [ ] 2.4.3 Criar `betting-agent/use-case/list-betting-agents.use-case.ts` — autorizar via `hasPermission(actorRole, 'participants.betting-agents.list')`; delegar a `BettingAgentQuery` com filtros (código/nome/apelido) e paginação, sempre tenant-scoped (spec betting-agent-catalog)
- [ ] 2.4.4 Criar `betting-agent/use-case/get-betting-agent.use-case.ts` — autorizar via `hasPermission(actorRole, 'participants.betting-agents.read')`; buscar detalhe por id sempre com `bancaId`; recurso de outra Banca retorna `NOT_FOUND` sem revelar existência (spec betting-agent-catalog; segurança/tenancy)
- [ ] 2.4.5 Escrever testes unitários dos casos de uso: alerta de duplicidade não bloqueia após confirmação; sem confirmação nada persiste; criação sem política rejeitada; USER bloqueado; falha transacional → rollback total (specs; critérios do plano)
- [ ] 2.4.6 Exportar a superfície pública em `modules/participants/src/index.ts` (erros, ports, DTOs, VOs, entidades+repos/queries, use cases)

## 3. Backend — persistência e API (subagente Backend; skills: backend-prisma-data, backend-controller)

### 3.1 Prisma e migration (skill: backend-prisma-data)

- [ ] 3.1.1 Modelar `apps/backend/prisma/models/participants.model.prisma`: `party`, `party_contact`, `party_address`, `betting_agent`, `betting_agent_compensation_policy` com `@@map` snake_case e `id String @id` (UUID de domínio) (design T6)
- [ ] 3.1.2 Aplicar constraints: `@@unique([bancaId, code])` em `betting_agent`, `@@unique([bancaId, partyId])` (1:1 por Banca), FKs reforçando tenant/relacionamento, sem cascata destrutiva de histórico (specs; design T5/T6)
- [ ] 3.1.3 Decidir e aplicar armazenamento monetário sem float binário (Decimal ou centavos) e vigência versionável (`effectiveFrom`/`effectiveTo?`) na tabela de política (design T6, Open Questions)
- [ ] 3.1.4 Gerar migration revisável com estratégia de rollback (drop das novas tabelas; nenhuma tabela existente alterada de forma destrutiva); gerar client Prisma (design Migration Plan)
- [ ] 3.1.5 Implementar adapters Prisma das ports com `toDomain`/`fromDomain` explícito: `party.repository.prisma.ts`, `betting-agent.repository.prisma.ts`, `party-duplicate.query.prisma.ts`, `betting-agent.query.prisma.ts`; usar `activeClient()` e a transação compartilhada; traduzir `P2002` (`isUniqueConstraintViolation`) para `CODE_ALREADY_EXISTS` sem vazar detalhes (design T4/T5/T7)
- [ ] 3.1.6 Implementar `system-clock.provider.ts` (adapter de `Clock`)

### 3.2 Módulo NestJS e controller (skill: backend-controller)

- [ ] 3.2.1 Criar `participants.tokens.ts` (tokens string de repos, queries, `CLOCK`, `TRANSACTION_MANAGER`, use cases) e `participants.module.ts` com `useFactory`/`inject`; `TRANSACTION_MANAGER` → `{ useExisting: PrismaService }`; registrar no `AppModule` (idempotente) (design T7)
- [ ] 3.2.2 Criar `betting-agent.controller.ts` (`@Controller('participants/betting-agents')`): `POST` (criação + confirmação de duplicidade), `GET` (lista/busca/paginação), `GET /:id` (detalhe); injetar use cases; usar guard de auth existente + `@CurrentUser()`/`@CurrentBancaId()`; passar `actorRole`/`bancaId`; **somente estes três endpoints** (spec betting-agent-catalog; design T7)
- [ ] 3.2.3 Mapear `Result`→HTTP via `STATUS_BY_CODE` + `unwrap()`: `FORBIDDEN`→403, `CODE_ALREADY_EXISTS`→409, `POSSIBLE_DUPLICATE`→409 (corpo com candidatos mínimos), `NOT_FOUND`→404, validação→400; falha técnica→500 genérico, sem vazar banco (design T7)
- [ ] 3.2.4 Confirmar que a autorização server-side dos três casos de uso (task 2.4.2–2.4.4) já passa por `hasPermission`, sem checagem de papel bruto duplicada no controller; `USER` bloqueado por não possuir as `PermissionKey`s; busca por id sempre com tenant; não logar telefones/endereço completos (specs; segurança/tenancy)
- [ ] 3.2.5 Escrever testes de integração/e2e reais (PostgreSQL): código igual em Bancas diferentes permitido e bloqueado na mesma; corrida de código = exatamente um sucesso; tenant A não lista/consulta tenant B; OWNER/ADMIN acessam, USER bloqueado; rollback em falha; constraints em banco real (critérios do plano)

## 4. — (reservado; Web segue no Grupo 5)

- [ ] 4.1 Confirmar que os contratos de domínio/DTO e as rotas do Backend estão estáveis antes de iniciar o Web em contexto separado

## 5. Web — `/cambistas` funcional (subagente Web; skill: frontend-form-schema adaptada + padrões locais)

- [ ] 5.1 Ler `node_modules/next/dist/docs/` e `apps/web/AGENTS.md` antes de codar (Next.js modificado com breaking changes)
- [ ] 5.2 Criar `apps/web/src/modules/cambistas/data/betting-agent.client.ts` — `fetch` com `credentials: 'include'`, base `/api/participants/betting-agents`, funções `list`/`getById`/`create`, resultados discriminados (sucesso, conflito de código, alerta de duplicidade) (design T8)
- [ ] 5.3 Criar `apps/web/src/modules/cambistas/data/betting-agent.schema.ts` com o validador local `v` (`apps/web/src/shared/form/validator.ts`): código e política obrigatórios; nome/apelido/telefones/endereço opcionais; bairro+cidade obrigatórios quando há endereço; formulário discriminado por tipo de política via `.refine` (spec ...compensation-policy; design T8)
- [ ] 5.4 Reescrever `apps/web/src/modules/cambistas/pages/cambistas.page.tsx`: listagem real com loading/vazio/erro, busca e paginação; remover colunas/controles de dono e FieldCollector (spec betting-agent-catalog; design T8)
- [ ] 5.5 Implementar cadastro no drawer/dialog existente (componentes `shared/components/ui`) com código+política obrigatórios e perfil opcional; exibir aviso confirmável de possível duplicidade com ação de reenviar confirmando; exibir conflito de código sem perder os dados preenchidos (specs participant-registration + betting-agent-catalog; design T8)
- [ ] 5.6 Implementar consulta de detalhes; **não** oferecer edição, inativação ou mudança de política nesta change (fora de escopo)
- [ ] 5.7 Remover a dependência dos arrays mock (`data/cambistas.sample.ts`) nos fluxos entregues; ocultar/bloquear administração para `USER` mantendo o Backend como autoridade (spec betting-agent-catalog)
- [ ] 5.8 Escrever testes Web cobrindo loading, vazio, erro, sucesso, conflito de código, confirmação de duplicidade e navegação por teclado (critérios do plano)

## 6. Integração, revisão e documentação (responsável coordenador)

- [ ] 6.1 Rodar gates por workspace: build, lint e testes (`modules/participants`, `apps/backend`, `apps/web`) e a suíte de integração real
- [ ] 6.2 Aplicar e validar a migration em PostgreSQL real; confirmar constraints `(bancaId, code)` e isolamento por tenant end-to-end
- [ ] 6.3 Verificar autorização server-side (`OWNER|ADMIN` acessam, `USER` bloqueado) e que recurso de outra Banca não revela existência
- [ ] 6.4 Confirmar que `/cambistas` deixou de depender dos arrays mock nos fluxos entregues (listar, cadastrar, consultar detalhe)
- [ ] 6.5 Atualizar documentação do módulo `participants` e confrontar implementação × [.docs/plans/01-participants.md](.docs/plans/01-participants.md) (Definition of Done): rastrear desvios, ligar testes aos critérios, reconciliar plano/spec/código/testes/diagrama
- [ ] 6.6 `openspec validate implement-participant-registration-mvp` verde e change pronta para arquivamento (arquivar somente após autorização)
