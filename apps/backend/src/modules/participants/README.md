# Participants — Cambistas (INC-01 + INC-02)

Bounded context **Participants**: cadastro atômico de `Party` (PERSON) + `BettingAgent`
(perfil operacional), com código/talão único por Banca, política de remuneração inicial e
alerta confirmável de possível duplicidade (`implement-participant-registration-mvp`, INC-01);
edição de perfil e ciclo de vida ativo/inativo (`enable-betting-agent-management`, INC-02).

## Endpoints

| Método | Rota | Uso | Autorização |
|---|---|---|---|
| `POST` | `/api/participants/betting-agents` | Cria Party+BettingAgent (+ confirmação de duplicidade) | `participants.betting-agents.create` (OWNER, ADMIN) |
| `GET` | `/api/participants/betting-agents` | Lista/busca/paginação | `participants.betting-agents.list` (OWNER, ADMIN, USER) |
| `GET` | `/api/participants/betting-agents/:id` | Detalhe | `participants.betting-agents.read` (OWNER, ADMIN, USER) |
| `PATCH` | `/api/participants/betting-agents/:id` | Edita nome/apelido/contatos/endereço da `Party` | `participants.betting-agents.update` (OWNER, ADMIN) |
| `PATCH` | `/api/participants/betting-agents/:id/status` | Alterna `ACTIVE`⇄`INACTIVE` (idempotente) | `participants.betting-agents.update` (OWNER, ADMIN) |

`bancaId` e `actorRole`/`actorUserId` vêm sempre do `AuthContext` (cookie JWT), nunca do body.

## Edição de perfil (INC-02)

- **BREAKING**: `phones` na criação (`POST`) mudou de `string[]` para `{ phone: string; label?: string }[]`
  — simétrico ao formato de saída (`PartyContactDTO`) e ao corpo de edição. Consumidores do `POST`
  precisam migrar o payload.
- `PATCH /:id` opera sempre sobre a `Party` já existente (nunca cria uma nova). `code` e a política de
  remuneração são imutáveis por este endpoint: `code` tem campo no DTO só para ser aceito e descartado
  (não bloqueia a edição dos demais campos se reenviado); política nem tem campo (rejeitada pelo
  `whitelist: true` global se enviada).
- Reconciliação por **substituição total** (D5, não patch incremental): `phones`, quando informado,
  representa a lista final desejada — telefones ausentes são removidos (soft-delete via
  `PartyContact.status`), telefones cujo valor normalizado já existir têm só o rótulo atualizado
  (preserva `id`/auditoria), novos são criados. `address`, quando informado, substitui o endereço ativo
  (encerra a vigência anterior e abre uma nova); **omitido ou `null` remove o endereço ativo** — não há
  "manter como está" para este campo, é a única forma de expressar remoção num payload de estado final
  único. `name`/`nickname` só mudam quando a chave é enviada.
- `PATCH /:id/status` alterna `BettingAgentStatus` entre `ACTIVE`/`INACTIVE`; idempotente (repetir a
  mesma transição não escreve no banco nem falha) e nunca apaga histórico.
- Sem migration de schema: `PartyContact.status`, `PartyAddress` (versionável por `EffectiveFrom`/`To`) e
  `BettingAgent.status` já existiam desde o INC-01 — a mudança é só de comportamento na camada de
  aplicação e de contrato HTTP.

## Autorização — "catalog wins"

A autorização é server-side via `hasPermission(actorRole, key)` do catálogo autoritativo de
`@bancaflow/access-control` (porta `PermissionChecker`), sem checagem de papel bruto. O plano
original (D23) previa `USER` sem acesso a nenhum endpoint administrativo; o catálogo
autoritativo (change `enable-tenant-user-administration`, já aplicada) concede a `USER`
`list`/`read` (lookup read-only) e nega `create`. Nesta implementação o **catálogo é a fonte
de verdade**: `USER` é bloqueado apenas na criação; a spec `betting-agent-catalog` desta change
foi reconciliada para refletir isso. Ver a decisão registrada em `proposal.md`/`tasks.md`.

## Mapeamento de erros → HTTP

`unwrapParticipantsResult` + `PARTICIPANTS_STATUS_BY_CODE`:

- `FORBIDDEN` → 403
- `CODE_ALREADY_EXISTS` → 409 (traduzido de `P2002` no adapter, sem vazar o banco)
- `POSSIBLE_DUPLICATE` → 409 com `details` = candidatos mínimos (via `ApiExceptionFilter`)
- `BETTING_AGENT_NOT_FOUND` → 404 (id inexistente **ou** de outra Banca — não revela existência)
- validações (`INVALID_CODE|POLICY|ADDRESS|PHONE|PARTY_TYPE`) → 400
- falha técnica (`PARTICIPANTS.*_ERROR`) → 500 genérico

O código de domínio viaja em `message[0]` e no campo `code`; candidatos de duplicidade em `details`.

## Persistência

Modelos em `prisma/models/participants.model.prisma`: `parties`, `party_contacts`,
`party_addresses`, `betting_agents`, `betting_agent_compensation_policies`. Constraints:
`@@unique([bancaId, code])`, `@@unique([bancaId, partyId])` e FK composta
`betting_agents(bancaId, partyId) → parties(bancaId, id)` reforçando "mesma Banca". Dinheiro em
centavos (`Int`); percentual `Decimal(5,2)`; política versionável por `EffectivePeriod`. Sem
cascata destrutiva (`onDelete: Restrict`). Rollback da migration = drop das novas tabelas.

## Domínio

`@bancaflow/participants` (framework-free). `CreateBettingAgent` orquestra Party+BettingAgent+
política em `runInTransactionResult` (rollback total em falha). `UpdateBettingAgentProfile` carrega
`BettingAgent`+`Party` por `bancaId`+`id` e aplica `Party.updateProfile` (reconciliação de
contatos/endereço); `SetBettingAgentStatus` carrega o `BettingAgent` e aplica `setStatus`
(idempotente — curto-circuita antes da transação quando o status já é o desejado). Coordenação
multi-agregado no caso de uso — sem serviço de domínio (nenhuma regra transversal genuína). O
alerta de possível duplicidade é modelado como `outcome` do OUTPUT (não `Result.fail`), pois o
`Result` compartilhado não carrega payload em falha.

## Testes

- Domínio (`modules/participants`): VOs, entidades e casos de uso, incluindo reconciliação de
  contatos/endereço e transição de status idempotente.
- Backend e2e (PostgreSQL real, `test/participants/betting-agents.e2e-spec.ts`): unicidade por
  Banca, corrida de código (exatamente um sucesso), isolamento por tenant, autorização
  (OWNER/ADMIN criam/editam/alteram status; USER bloqueado em escrita, list/read read-only),
  duplicidade confirmável, edição de perfil (nome/apelido/contatos/endereço, imutabilidade de
  `code`/política) e ciclo de vida ativo/inativo (idempotência, isolamento de tenant).
- Web (`apps/web/src/modules/cambistas`): loading/vazio/erro/sucesso, conflito de código,
  confirmação de duplicidade, drawer unificado (add/view/edit), `PhoneInput` e navegação por
  teclado.

## Fora de escopo (INC-03+)

Alteração/histórico de política de remuneração, exclusão de Cambista, dono/FieldCollector,
`/pessoas`, CPF/documentos, Party ORGANIZATION, permissões persistidas por Banca (ver D1 de
`enable-betting-agent-management`).
