## Context

Política de remuneração (`CompensationPolicy`) do `BettingAgent` é hoje create-only. Isso foi decisão deliberada do INC-02 (`enable-betting-agent-management`), documentada tanto em `openspec/changes/archive/2026-07-21-enable-betting-agent-management/design.md:18` quanto no próprio `UpdateBettingAgentDto` (`apps/backend/src/modules/participants/dto/update-betting-agent.dto.ts:8-16`: "Política NUNCA é aceita aqui... nem sequer tem campo no DTO"). A spec `betting-agent-compensation-policy` reserva explicitamente essa lacuna para um "incremento futuro" (`openspec/specs/betting-agent-compensation-policy/spec.md:43,49-51`) — este change é esse incremento.

O modelo de dados já foi desenhado para isso: `BettingAgentCompensationPolicy` é uma tabela dedicada 1:N a partir de `BettingAgent` (`apps/backend/prisma/models/participants.model.prisma:99-118`, comentário: "Tabela dedicada desde já (compatível com histórico futuro)"), com `effectiveFrom`/`effectiveTo`. Hoje só existe uma linha aberta por Cambista (criada em `betting-agent.repository.prisma.ts:save()`, lida por `current-policy.util.ts`). Não é necessária migration.

Existe precedente direto e já em produção para "trocar um valor versionado por vigência sem reescrever histórico": `Party.updateProfile()` (`modules/participants/src/party/party.entity.ts:202-247`) troca o endereço, e o adapter `party.repository.prisma.ts` (`update()`, linhas ~182-210) fecha a linha ativa (`effectiveTo` = novo `effectiveFrom`) e insere a nova. Este design espelha esse padrão para política, ao invés de inventar um novo.

## Goals / Non-Goals

**Goals:**
- Permitir alterar tipo de política / percentual / valor fixo semanal de um Cambista já cadastrado, restrito a quem tem `participants.betting-agents.update` (hoje: OWNER e ADMIN — nunca USER).
- Preservar histórico: a política anterior nunca é sobrescrita ou apagada, só fechada (`effectiveTo`) quando uma nova é aberta.
- Reaproveitar as mesmas regras de validação de valores por tipo já usadas na criação (`CompensationPolicy` VO, `modules/participants/src/betting-agent/vo/compensation-policy.vo.ts`) — sem duplicar regras.
- Frontend: reaproveitar os mesmos campos/`Select` do formulário de criação (`CreateForm` em `betting-agent-drawer.tsx`) no modo edição, ao invés de criar um segundo formulário de política.

**Non-Goals:**
- Consulta de histórico de políticas (listar vigências passadas) — fica para quando houver demanda concreta; a estrutura já suporta, mas nenhuma UI/endpoint de leitura de histórico é criado aqui.
- Agendamento de vigência futura (política que passa a valer numa data futura) — a nova política sempre começa "agora" (`clock.now()`), igual ao padrão de endereço.
- Nova permissão dedicada — ver Decisão D1.
- Mudar os três tipos de política aceitos ou suas regras de validação.
- Tornar `code` editável, ou qualquer outro item já listado como fora de escopo em `standardize-betting-agent-drawer-layout`.

## Decisions

### D1 — Reaproveitar `participants.betting-agents.update`, sem permissão nova

O pedido do usuário foi "owner e admin podem alterar". Hoje `participants.betting-agents.update` já é concedida só a OWNER (`role-permission-map.ts:15`, OWNER recebe todas as chaves) e ADMIN (`role-permission-map.ts:20-23`, listada explicitamente) — nunca a USER. Não existe hoje nenhuma distinção de permissão entre OWNER e ADMIN para nada relacionado a Cambista (cadastro, status, etc. usam a mesma chave). Criar uma chave nova só para política adicionaria superfície de configuração (catálogo + role-map + frontend `useHasPermission`) sem separar nenhum caso de uso real hoje. **Alternativa considerada e rejeitada agora**: `participants.betting-agents.update-policy` dedicada — revisitar se um dia existir um papel que deva editar cadastro mas não política (não é o caso hoje).

### D2 — Endpoint dedicado `PATCH :id/policy`, não estender `UpdateBettingAgentDto`

`UpdateBettingAgentDto` (`dto/update-betting-agent.dto.ts`) documenta deliberadamente que política é rejeitada ali (nem tem campo — `whitelist: true` no `ValidationPipe` rejeitaria se enviada). Duas opções: (a) adicionar o campo a esse DTO/endpoint, ou (b) endpoint irmão dedicado, no mesmo padrão de `PATCH :id/status` (`betting-agent.controller.ts:159-175`). Escolhido (b): política é uma operação de negócio distinta (gera nova linha de histórico, não é um PATCH parcial de campos soltos), e mexer no DTO de perfil exigiria remover a garantia textual/estrutural de "política nunca entra por aqui" que hoje é uma proteção deliberada. Endpoint novo: `PATCH /participants/betting-agents/:id/policy`, DTO próprio reaproveitando `CompensationPolicyBodyDto` (já existe e é exportado por `create-betting-agent.dto.ts` — sem duplicar a forma do payload).

### D3 — Fechar+abrir linha, espelhando `PartyRepositoryPrisma.update()` para endereço

Novo método no contrato `BettingAgentRepository` (ex.: `updatePolicy(agent: BettingAgent): Promise<Result<void>>`), implementado em `BettingAgentRepositoryPrisma` assim: `findFirst({ bettingAgentId, effectiveTo: null })` → `update({ effectiveTo: novaPolitica.effectiveFrom })` na linha ativa → `create()` da nova linha com `effectiveFrom = now`, `effectiveTo = null`. Mesma sequência de `party.repository.prisma.ts:182-210`, mesma transação (`tx.runInTransactionResult`, já usado por `SetBettingAgentStatusUseCase`/`UpdateBettingAgentProfileUseCase`). **Alternativa rejeitada**: `UPDATE` in-place na linha existente — quebraria a garantia de histórico que a tabela dedicada já foi desenhada para dar, e contradiz a Requirement já aprovada ("sem reescrever snapshots").

### D4 — Novo método de domínio `BettingAgent.changePolicy()`, espelhando `setStatus()`

`BettingAgent.setStatus(status, now)` (`betting-agent.entity.ts:69-77`) é o precedente direto: valida via VO, retorna uma nova instância imutável. `changePolicy(policy: CompensationPolicyInput, now: Date)` segue o mesmo formato — valida via `CompensationPolicy.tryCreate`, retorna `Result<BettingAgent>` com `policy` atualizado e `policyEffectiveFrom = now`/`policyEffectiveTo = null`. O use case novo (`UpdateBettingAgentPolicyUseCase`) espelha `SetBettingAgentStatusUseCase` (`betting-agent/use-case/set-betting-agent-status.use-case.ts`) linha a linha: checa permissão → busca agent → chama método de domínio → persiste em transação via o novo `updatePolicy()` do repositório.

### D5 — Frontend: reaproveitar os campos do `CreateForm`, não duplicar

`betting-agent-drawer.tsx` já tem toda a UI de política (Select de tipo + campos condicionais de percentual/valor fixo) dentro de `CreateForm`. No modo edição do `AgentDetail`, quando `canUpdate` for `true`, o bloco hoje fixo (`ReadOnlyField label="Política (não editável)"`) passa a renderizar os mesmos três campos (reaproveitando `POLICY_LABELS`, `Select`/`SelectItem`, e os mesmos `register`/`watch` do formulário — o schema de edição (`updateBettingAgentSchema`) precisa ganhar os mesmos campos opcionais de política que `createBettingAgentSchema` já tem). Sem `canUpdate`, ou em modo view, o bloco permanece `ReadOnlyField` (sem mudança nesse caminho). **Alternativa rejeitada**: modal/drawer separado só para política — fragmenta o fluxo de edição em duas superfícies para o mesmo registro, sem necessidade (o formulário de edição já é um form único hoje).

## Risks / Trade-offs

- **Concorrência (duas edições de política ao mesmo tempo)** → a query `findFirst({ effectiveTo: null })` dentro da mesma transação do `updatePolicy()` já serializa por transação do Postgres; não é um problema novo introduzido aqui (o mesmo padrão já existe hoje para endereço).
- **Confundir "editar política" com "reabrir decisão de criação"** → o formulário de edição reaproveita o mesmo componente visual do de criação, então o usuário reconhece o mesmo padrão; a diferença semântica (nova vigência, não alteração da antiga) fica só no backend/histórico, invisível na UI atual (aceitável — não há UI de histórico neste incremento, Non-Goal).
- **DTO/permissão genéricos demais (`update` cobre cadastro E dinheiro)** → aceito conscientemente em D1; documentar a decisão para não ser re-perguntado no futuro caso um caso de uso realmente distinto apareça.
