## 1. Domínio

- [x] 1.1 `BettingAgent.changePolicy(policy: CompensationPolicyInput, now: Date): Result<BettingAgent>` em `modules/participants/src/betting-agent/betting-agent.entity.ts`, espelhando `setStatus()` (linha 69-77): valida via `CompensationPolicy.tryCreate`, retorna nova instância com `policy`, `policyEffectiveFrom = now`, `policyEffectiveTo = null`.
- [x] 1.2 Novo método no contrato `BettingAgentRepository` (`modules/participants/src/betting-agent/betting-agent.repository.ts`): `updatePolicy(agent: BettingAgent): Promise<Result<void>>`.

## 2. Persistência (Prisma)

- [x] 2.1 Implementar `BettingAgentRepositoryPrisma.updatePolicy()` em `apps/backend/src/modules/participants/adapters/betting-agent.repository.prisma.ts`: dentro da transação ativa, `findFirst({ bettingAgentId: agent.id, effectiveTo: null })` na tabela `compensationPolicies`, `update({ effectiveTo: agent.policyPeriod.effectiveFrom })` na linha ativa, depois `create()` da nova linha (mesmo shape usado em `save()`, linhas 49-63) — espelhando `party.repository.prisma.ts` (`update()`, ~182-210) para endereço.
- [x] 2.2 Confirmar que nenhuma migration é necessária (tabela `BettingAgentCompensationPolicy` já suporta múltiplas linhas por `bettingAgentId`, `apps/backend/prisma/models/participants.model.prisma:99-118`).

## 3. Use case + DTO + rota

- [x] 3.1 Novo `UpdateBettingAgentPolicyUseCase` em `modules/participants/src/betting-agent/use-case/update-betting-agent-policy.use-case.ts`, espelhando `SetBettingAgentStatusUseCase` linha a linha: checa `permissions.hasPermission(actorRole, 'participants.betting-agents.update')` → `FORBIDDEN`; busca agent por `id`+`bancaId` → `BETTING_AGENT_NOT_FOUND`; chama `agent.changePolicy(...)`; persiste via `tx.runInTransactionResult` chamando `updatePolicy()`.
- [x] 3.2 Novo DTO `UpdateBettingAgentPolicyDto` em `apps/backend/src/modules/participants/dto/update-betting-agent-policy.dto.ts`, reaproveitando `CompensationPolicyBodyDto` (já exportado por `dto/create-betting-agent.dto.ts`) — sem duplicar a forma do payload.
- [x] 3.3 Novo token `UPDATE_BETTING_AGENT_POLICY_USE_CASE` em `participants.tokens.ts` + provider em `participants.module.ts` (mesmo padrão de `SET_BETTING_AGENT_STATUS_USE_CASE`).
- [x] 3.4 Nova rota `PATCH :id/policy` em `betting-agent.controller.ts`, espelhando `setStatus()` (linhas 159-175): injeta o novo use case, mapeia `body.policy` → `data.policy`, resposta `{ bettingAgentId, policy }` (ou shape equivalente já usado por `create`).
- [x] 3.5 Exportar o novo DTO/use case pelos barrels (`index.ts`) necessários, seguindo o padrão dos existentes.

## 4. Frontend — contrato

- [x] 4.1 `updateBettingAgentPolicySchema` novo em `apps/web/src/modules/cambistas/data/betting-agent.schema.ts`, reaproveitando `PolicyTypeField`/`PercentageField`/`WeeklyAmountField` e os mesmos `.refine()` condicionais já usados em `createBettingAgentSchema` (linhas 91-119) — schema separado do `updateBettingAgentSchema` (perfil), não uma extensão dele (D2: endpoint/contrato dedicado).
- [x] 4.2 `UpdateBettingAgentPolicyInput`/`updatePolicy(id, input)` novo em `betting-agent.client.ts`, espelhando `setStatus()` (linhas 260-276): `PATCH ${BASE}/:id/policy`.

## 5. Frontend — drawer

- [x] 5.1 Em `betting-agent-drawer.tsx`, `AgentDetail`: quando `canUpdate` e `detailMode === 'edit'`, o bloco de Política deixa de renderizar `ReadOnlyField` e passa a renderizar os mesmos três campos do `CreateForm` (Select de tipo + percentual/valor fixo condicionais), com `register`/`watch` do form de política (novo `useForm` de política dedicado — `registerPolicy`/`watchPolicy`/`setValuePolicy`).
- [x] 5.2 Sem `canUpdate`, ou em modo `view`, o bloco de Política permanece `ReadOnlyField` (sem mudança nesse caminho).
- [x] 5.3 Submit: ao salvar no modo edição, valida e chama `updatePolicy(agent.id, ...)` (via `handleSubmitPolicy`) antes do `update(agent.id, ...)` de perfil já existente (duas chamadas — perfil e política são operações backend distintas, D2); erro de política reaproveita o mesmo `EDIT_BANNER_MESSAGES` (mesmos status `forbidden|not_found|invalid|error` nos dois contratos).
- [x] 5.4 `cancelEdit()` (já existente, do ajuste anterior) agora também reseta os campos de política (`resetPolicy(policyFormDefaultsFromAgent(agent))`) para os valores originais do `agent` ao cancelar.

## 6. Testes e gates

- [x] 6.1 Testes de `BettingAgent.changePolicy()` (entity) e do novo use case (`update-betting-agent-policy.use-case.spec.ts`): OWNER ok, ADMIN ok, sem permissão → `FORBIDDEN`, agent de outra Banca/inexistente → `BETTING_AGENT_NOT_FOUND`, tipo/valores inválidos → erro de validação sem persistir. 7 testes novos, `modules/participants` 61/61 verdes.
- [x] 6.2 Teste de integração do controller (`apps/backend/test/participants/betting-agents.e2e-spec.ts`, novo describe `PATCH .../policy`): confirma via `prisma.client.bettingAgentCompensationPolicy.findMany` que a linha anterior fica com `effectiveTo` preenchido e a nova linha fica com `effectiveTo: null`, sem apagar a anterior. **Não executado neste ambiente** (suíte e2e exige Postgres real, indisponível no sandbox) — precisa rodar com `npm run test:e2e` (banco no ar) antes do merge.
- [x] 6.3 Testes de `cambistas.page.spec.tsx`: teste de edição existente estendido para cobrir `updatePolicy` sendo chamado com o payload esperado; teste novo cobrindo sem `canUpdate` a política continua somente-leitura.
- [x] 6.4 Lint/testes/build de `apps/backend` (114/114 verdes, `nest build` verde, lint sem erros novos — 13 erros de prettier pré-existentes no arquivo e2e, não tocados) e `apps/web` (286/286 verdes, `tsc --noEmit` limpo, `eslint` sem erros). `tsc --noEmit` do backend tem 1 erro pré-existente e não relacionado em `test/identity/transaction.e2e-spec.ts` (módulo Identity, não tocado nesta change). Suíte `test:e2e` (Postgres real) não executada neste ambiente — sandbox sem banco disponível; rodar antes do merge.
- [x] 6.5 `openspec validate enable-betting-agent-policy-update --strict` verde.
