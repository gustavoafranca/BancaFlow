## Context

O BancaFlow é um SaaS multi-tenant (subdomínio → `bancaId`) com domínio framework-free em `modules/*`, backend NestJS em `apps/backend`, Prisma/PostgreSQL modular e Web Next.js 16 em `apps/web`. Já existem os bounded contexts **Identity** (ator autenticado, papel `OWNER|ADMIN|USER`) e **Tenancy** (`Banca`, `bancaId`), com autenticação por cookie JWT, guard, decorators `@CurrentUser()`/`@CurrentBancaId()`, `TransactionManager` no `PrismaService` (`runInTransaction`/`runInTransactionResult`) e bases genéricas em `@bancaflow/shared`.

Este incremento (INC-01) cria o bounded context **Participants**, cujo plano normativo é [.docs/plans/01-participants.md](.docs/plans/01-participants.md), preservando as decisões de produto D18–D29. A rota `/cambistas` hoje é um protótipo 100% mockado (`apps/web/src/modules/cambistas/data/cambistas.sample.ts`) e passa a consumir a API real.

**Constraints herdadas do repositório:**

- `modules/participants` NÃO importa NestJS, Prisma, HTTP ou Next.js.
- Casos de uso implementam `UseCase<IN, OUT>` de `@bancaflow/shared` e retornam `Result<OUT>`.
- `bancaId` vem sempre do contexto autenticado (`@CurrentBancaId()` / token), nunca do body.
- Entidades usam ctor privado + `rebuild()` com spread raso (`{ ...this.props, ...overrides }`) + `tryCreate`; NÃO usar `Entity.cloneWith` genérico, que corrompe `Date` ([[shared-clonewith-date-bug]]).
- VOs seguem o par `create()` (lança) + `tryCreate()` (`Result<VO>`) + `get value()`.
- Erros de domínio são constantes estáveis (`PARTICIPANTS.*`), mapeadas para HTTP no controller.
- Leituras usam projeções/DTOs; nunca retornam entidade de domínio ou modelo Prisma.

## Goals / Non-Goals

**Goals:**

- Fundação full-stack do módulo `participants` via `config-new-module` (dry-run + execução), criando apenas fronteiras.
- Agregados separados `Party` (PERSON) e `BettingAgent`, coordenados no caso de uso `CreateBettingAgent`, criados na mesma transação com rollback total.
- `BettingAgentCode` manual, texto somente-dígitos, imutável, único por `(bancaId, code)`; corrida resolvida pela constraint.
- Política inicial obrigatória, união discriminada de 3 tipos, persistida em estrutura versionável por vigência (sem alterar vigência agora).
- Perfil opcional (nome/apelido/telefones/endereço), endereço exige bairro+cidade quando presente.
- Alerta confirmável de possível duplicidade (telefone ou nome+apelido), nunca bloqueio; sem confirmação nada persiste.
- Três endpoints (`POST`/`GET`/`GET /:id`) com autorização server-side via `hasPermission(actorRole, permissionKey)` do catálogo autoritativo (`modules/access-control`, change `establish-authoritative-role-permissions`) e isolamento estrito por tenant. **Dependência de ordem:** requer que `modules/access-control` já exista com as chaves `participants.betting-agents.create|list|read` mapeadas para `OWNER|ADMIN`.
- `/cambistas` funcional: listar/buscar/paginar/cadastrar/consultar detalhe, substituindo os arrays mock.

**Non-Goals (INC-02/INC-03 e além):**

- Edição de perfil, adicionar/remover telefones ou trocar endereço após a criação.
- Ciclo de vida `ACTIVE↔INACTIVE` (ativar/inativar/reativar) e seus endpoints.
- Alteração/agendamento/encerramento de política e consulta de histórico de vigências.
- FieldCollector/Recolhe, dono do Cambista e vínculos; tela `/pessoas` funcional.
- CPF/documentos, e-mail, Party `ORGANIZATION`, login/`UserAccount` de Cambista, migração entre Bancas.
- Vínculo a `Party` já existente (D24: sempre nova Party + novo BettingAgent).
- Exclusão/reutilização de código; eventos/outbox; seed de negócio não exigido.

## Decisions

### T1 — Estrutura do pacote de domínio `modules/participants`

Espelhar a convenção de `modules/identity`/`modules/tenancy`:

- `modules/participants/src/party/` — `party.entity.ts`, `party.repository.ts`, entidades filhas `party-contact.entity.ts` e `party-address.entity.ts` (alteradas só pelo agregado, sem repositório público próprio), `vo/` (`phone.vo.ts`, `neighborhood.vo.ts`, `city.vo.ts`, `party-type.vo.ts`, `effective-period.vo.ts`), `query/party-duplicate.query.ts`.
- `modules/participants/src/betting-agent/` — `betting-agent.entity.ts`, `betting-agent.repository.ts`, `vo/` (`betting-agent-code.vo.ts`, `betting-agent-status.vo.ts`, `compensation-policy.vo.ts`), `query/betting-agent.query.ts`, `use-case/list-betting-agents.use-case.ts`, `use-case/get-betting-agent.use-case.ts`.
- `modules/participants/src/app/use-case/create-betting-agent.use-case.ts` — caso de uso multi-agregado (coordena Party + BettingAgent + política na transação).
- `modules/participants/src/shared/ports/` (`clock.port.ts`), `shared/errors/participants.errors.ts` (`PARTICIPANTS_ERRORS` + `type ParticipantsErrorCode`), `shared/dto/`.
- `modules/participants/src/index.ts` — superfície pública curada.

`EffectivePeriod` é candidato a viver em `party/vo` (usado por endereço) e ser reutilizado pela política; se a semântica divergir, criar dois VOs. `config-new-module` só cria as fronteiras (`package.json`, `tsconfig.json`, `jest.config.ts`, `src/index.ts` vazio); as skills `module-*` criam o conteúdo.

**Alternativa rejeitada:** `module-aggregate` gerando CRUD genérico com delete — proibido pelo prompt e por D25 (código nunca reutilizado, sem `DELETED`).

### T2 — `Party` e `BettingAgent` são agregados separados; coordenação no caso de uso (D18)

Nenhum serviço de domínio é criado: não há regra genuinamente transversal. `CreateBettingAgent` orquestra as portas dentro de `transactionManager.runInTransactionResult(...)`, seguindo o modelo de `ProvisionBancaUseCase` (Tenancy) que cria Banca + primeira conta OWNER numa transação. A coordenação entre agregados é responsabilidade de aplicação, não de domínio.

**Alternativa rejeitada:** agregado único Party/BettingAgent (conflita com D18) ou `ParticipantsDomainService` sem regra transversal.

### T3 — Portas de escrita (repository) e leitura (query) separadas por CQRS

- `PartyRepository`: `nextId()`, `save(party, tx?)`, e leitura mínima por telefone/nome+apelido só se necessária ao agregado. Persiste `PartyContact`/`PartyAddress` filhos. **Sem `delete`.**
- `BettingAgentRepository`: `nextId()`, `save(agent, tx?)`, `findById(id, bancaId)` retornando entidade para invariantes. **Sem `delete`.**
- `PartyDuplicateQuery`: retorna candidatos mínimos da própria Banca (id + rótulo), nunca entidade — alimenta o alerta de duplicidade.
- `BettingAgentQuery`: `list(bancaId, filtros, paginação)` → `PaginatedResultDTO<BettingAgentListItemDTO>` e `getDetail(id, bancaId)` → `BettingAgentDetailDTO | null`. Usa `PaginatedInputDTO`/`PaginatedResultDTO` de `@bancaflow/shared`.

Repositories não expõem delete; queries não retornam entidades nem modelos Prisma; DTOs não carregam regra de domínio nem acoplamento a ORM.

### T4 — Criação atômica e detecção de duplicidade em duas fases

`CreateBettingAgent` (entrada inclui `confirmPossibleDuplicate: boolean`):

1. Autorizar via `hasPermission(actorRole, 'participants.betting-agents.create')` do catálogo de `access-control` (falha → `PARTICIPANTS.FORBIDDEN`); não reintroduzir a checagem de papel bruto `actorRole ∈ {OWNER, ADMIN}` em paralelo.
2. Construir VOs/entidades de domínio (código, política, contatos, endereço) — falha de validação retorna cedo, fora da transação.
3. Se `confirmPossibleDuplicate` for falso, consultar `PartyDuplicateQuery`; havendo candidatos, retornar `Result.fail(PARTICIPANTS.POSSIBLE_DUPLICATE)` com os candidatos anexados e **não abrir transação** — nada persiste.
4. Dentro de `runInTransactionResult`: `party.save` → `bettingAgent.save` (com política inicial). Conflito de código único (`P2002` via `isUniqueConstraintViolation`) mapeia para `PARTICIPANTS.CODE_ALREADY_EXISTS`; qualquer `Result.fail`/exceção reverte tudo.

O alerta é heurístico, não identidade: com confirmação prossegue sem criar constraint artificial. `Clock` injetável fornece a data de criação (auditoria + início da vigência da política/endereço).

**Alternativa rejeitada:** bloquear por telefone/nome (viola D28) ou persistir parcialmente antes de confirmar.

### T5 — `BettingAgentCode` como texto e unicidade por tenant

VO `BettingAgentCode`: trim externo, exigir somente dígitos (`/^\d+$/`), preservar zeros à esquerda, expor `value: string`; nunca converter para número. Constraint de banco `@@unique([bancaId, code])`. Duas Bancas podem repetir `001`; a mesma não. A corrida é resolvida pela constraint → exatamente um sucesso; o adapter traduz `P2002` em erro estável sem vazar detalhe do banco (`prisma-error.util`).

### T6 — Modelagem Prisma versionável por vigência

`apps/backend/prisma/models/participants.model.prisma`, seguindo as convenções existentes (`id String @id` UUID gerado no domínio, `@@map` snake_case, status/tipo como `String`, timestamps de auditoria):

- `party` (`@@map("parties")`): `id`, `bancaId`, `type` (`"PERSON"`), `name?`, `nickname?`, timestamps, `createdBy`.
- `party_contact` (`@@map("party_contacts")`): `id`, `partyId`, `phone`, `label?`, `status`; FK para `party`.
- `party_address` (`@@map("party_addresses")`): `id`, `partyId`, `street?`, `number?`, `neighborhood`, `neighborhoodNormalized`, `city`, `cityNormalized`, `effectiveFrom`, `effectiveTo?`; no máximo um ativo por Party (garantido pelo domínio; opcionalmente índice parcial `WHERE effectiveTo IS NULL`).
- `betting_agent` (`@@map("betting_agents")`): `id`, `bancaId`, `partyId`, `code`, `status` (`"ACTIVE"`), timestamps, `createdBy`; `@@unique([bancaId, code])`; `@@unique([bancaId, partyId])` para reforçar 1:1 por Banca.
- `betting_agent_compensation_policy` (`@@map("betting_agent_compensation_policies")`): `id`, `bettingAgentId`, `type`, `percentage?` (Decimal), `weeklyFixedAmount?` (armazenamento monetário sem float binário — inteiro em centavos ou `Decimal`), `effectiveFrom`, `effectiveTo?` — tabela dedicada e versionável desde já.

Migration revisável com estratégia de rollback; sem cascata que apague histórico (restrição de FK, não `onDelete: Cascade` em histórico). Adapters Prisma fazem `toDomain`/`fromDomain` explícito; Prisma não atravessa o domínio.

### T7 — Fiação NestJS (`apps/backend/src/modules/participants`)

Espelhar `identity.module.ts`: tokens string em `participants.tokens.ts` (`PARTY_REPOSITORY`, `BETTING_AGENT_REPOSITORY`, `PARTY_DUPLICATE_QUERY`, `BETTING_AGENT_QUERY`, `CLOCK`, `TRANSACTION_MANAGER`, `CREATE_BETTING_AGENT_USE_CASE`, `LIST_BETTING_AGENTS_USE_CASE`, `GET_BETTING_AGENT_USE_CASE`). `TRANSACTION_MANAGER` → `{ useExisting: PrismaService }`; `CLOCK` → adapter `system-clock.provider.ts`. Casos de uso montados por `useFactory`/`inject`. `BettingAgentController` (`@Controller('participants/betting-agents')` sob o prefixo global `/api`) injeta os use cases prontos, usa o guard de auth existente (`JwtGuard`/`JwtCookieAuthGuard`) + `@CurrentUser()`/`@CurrentBancaId()`, passa `actorRole: user.role` e `bancaId` para os use cases, e traduz `Result` via um `STATUS_BY_CODE` (`PARTICIPANTS.FORBIDDEN`→403, `CODE_ALREADY_EXISTS`→409, `POSSIBLE_DUPLICATE`→409 com corpo de candidatos, `NOT_FOUND`→404, validação→400) num helper `unwrap()` privado, sem vazar detalhes de banco. Registro idempotente no `AppModule` (o scaffold já o adiciona).

### T8 — Web `/cambistas` consumindo API real

Manter a rota re-export (`app/(private)/cambistas/page.tsx` → `@/modules/cambistas`) e o item de menu já existente em `app-sidebar.tsx`; não criar `/participants` nem novo menu. No feature module `apps/web/src/modules/cambistas/`:

- `data/betting-agent.client.ts` — cliente `fetch` próprio (não há client genérico; espelhar `shared/api/auth.client.ts`) com `credentials: 'include'`, base `/api/participants/betting-agents`, funções `list`, `getById`, `create`, tipos de resultado discriminados (sucesso, conflito de código, alerta de duplicidade).
- `data/betting-agent.schema.ts` — schema com o validador local `v` (`apps/web/src/shared/form/validator.ts`), campos VO-like; formulário discriminado por tipo de política (`v` + `.refine`), código e política obrigatórios, nome/apelido/telefones/endereço opcionais (bairro+cidade obrigatórios quando há endereço).
- `pages/cambistas.page.tsx` — substitui os arrays mock; estados loading/vazio/erro; busca + paginação; drawer/dialog de cadastro reutilizando os componentes de `shared/components/ui`; aviso confirmável de possível duplicidade com ação de reenviar com confirmação; conflito de código sem perder os dados preenchidos; consulta de detalhe. Sem colunas/controles de dono/FieldCollector, edição, inativação ou mudança de política.
- Remover a dependência de `data/cambistas.sample.ts` nos fluxos entregues (manter o arquivo só se ainda referenciado por algo fora do escopo; caso contrário, removê-lo). Autorização é autoridade do Backend; ocultar controles para `USER` no Web não substitui o bloqueio server-side.

Antes de escrever código Web, ler `node_modules/next/dist/docs/` (aviso de `apps/web/AGENTS.md`: este Next.js tem breaking changes).

## Risks / Trade-offs

- **Duplicidade heurística sem documento** → alerta confirmável, nunca identidade nem bloqueio; candidatos mínimos e tenant-scoped (D28). Não substitui deduplicação por documento (fora do MVP).
- **Snapshot histórico de endereço/bairro** → a política e o endereço já nascem versionáveis por `EffectivePeriod`; consumidores futuros (Lançamentos) devem copiar o snapshot do momento da venda, não o endereço atual. Documentado, não implementado aqui.
- **Monetário da política** → nunca usar float binário; usar `Decimal`/inteiro em centavos e validar no VO. Cálculo/semana parcial pertence ao Financeiro (fora).
- **Corrida de código** → depende da constraint `@@unique([bancaId, code])`; teste de concorrência em banco real é obrigatório para provar "exatamente um sucesso".
- **Atomicidade de dois agregados** → toda a criação passa por `runInTransactionResult`; teste de falha injetada deve provar rollback sem linha parcial.
- **Web sem client genérico** → cada contexto cria seu `*.client.ts`; risco de divergência de convenção mitigado espelhando `auth.client.ts` e `fetchWithRefresh`.
- **Next.js modificado** → risco de usar API desatualizada; mitigado lendo os docs locais antes de codar.
- **Escopo criativo** → itens de INC-02/INC-03 (edição, ciclo de vida, histórico de política) NÃO viram tarefas opcionais; o protótipo mostra dono/Recolhe fora do INC-01 e deve ser removido/inoperante, não implementado.

## Migration Plan

1. `config-new-module participants --mode fullstack --route cambistas --dry-run` → revisar caminhos; depois executar sem `--dry-run` (idempotente).
2. Implementar domínio (`modules/participants`) primeiro, com testes unitários; estabilizar os contratos (ports/DTOs) antes de Backend/Web.
3. Adicionar `participants.model.prisma`, gerar migration revisável, aplicar em banco de desenvolvimento; validar constraints em PostgreSQL real. **Rollback:** a migration é reversível (drop das novas tabelas); nenhuma tabela existente é alterada de forma destrutiva.
4. Implementar backend (adapters Prisma, módulo, controller) e Web (client, schema, página) em contextos separados, uma vez estáveis os contratos.
5. Integração/revisão: build+lint+testes por workspace, isolamento tenant, e confronto com [.docs/plans/01-participants.md](.docs/plans/01-participants.md); reconciliar Definition of Done do plano.

Nenhuma migration é aplicada nesta proposta; a aplicação ocorre só após aprovação, via `/opsx:apply`.

## Open Questions

- **`EffectivePeriod` compartilhado ou dois VOs?** — decidir na implementação de domínio se endereço e política compartilham o mesmo VO ou se a semântica diverge o suficiente para separá-los.
- **Armazenamento monetário do fixo semanal** — `Decimal(prisma)` vs. inteiro em centavos: alinhar com a convenção que o Financeiro vier a adotar; ambos satisfazem "sem float binário".
- **Índice parcial de endereço ativo único** — impor no banco (`UNIQUE ... WHERE effectiveTo IS NULL`) além do domínio, ou apenas no domínio neste incremento (já que só há um endereço criado por vez)?
- **Formato do payload de política na API** — união discriminada por `type` no body do `POST`; confirmar nomes de campos com o schema do Web para manter contrato único.
