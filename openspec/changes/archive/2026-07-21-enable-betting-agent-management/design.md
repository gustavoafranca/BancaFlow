## Context

O `INC-01` (`implement-participant-registration-mvp`) entregou apenas `POST`, `GET` (lista) e `GET :id` para `BettingAgent`. Editar perfil e ativar/inativar foram explicitamente adiados. O prompt que originou esta change (`.docs/prompts/22-enable-betting-agent-management.md`) pediu, além da edição e do ciclo de vida, um "recurso no gerenciamento de usuários para definir, por perfil, quem pode cadastrar, alterar ou apenas ler os dados de Cambista", deixando em aberto se isso deveria ser uma **configuração persistida** por Banca ou apenas o uso do modelo de permissões já existente.

O catálogo de autorização já está implementado e testado em `authoritative-permission-catalog` (aplicado pela change `enable-tenant-user-administration`): é um catálogo **fechado, definido em código-fonte**, com mapeamento fixo papel→permissão (`RolePermissionMap`), sem tabela e sem endpoint de escrita ("O catálogo NÃO SHALL ser editável em runtime nesta fase"). A tela **Perfis de acesso** (`settings-capability-visibility`) já existe como projeção somente-leitura desse catálogo, e trata explicitamente "perfis de acesso persistidos" e "permissões individuais por usuário" como capability ainda não disponível, mostrando um estado explícito em vez de simular persistência.

## Goals / Non-Goals

**Goals:**
- Permitir editar nome, apelido, contatos (com rótulo) e endereço de um Cambista existente.
- Permitir ativar/inativar um Cambista existente.
- Adicionar `participants.betting-agents.update` ao catálogo autoritativo, com decisão explícita por papel, aparecendo automaticamente na matriz "Perfis de acesso" já existente.
- Unificar o drawer Web em três abas (Cadastro, Endereço, Contato) com modos add/view/edit, e extrair um `PhoneInput` reutilizável com máscara BR.

**Non-Goals:**
- Não criar uma configuração de permissões **persistida por Banca** nem editável em runtime — isso contradiria uma decisão já aplicada e testada (`authoritative-permission-catalog`) e um estado de produto já entregue (`settings-capability-visibility`, que trata "perfis de acesso persistidos" como capability indisponível de propósito).
- Não criar permissão individual por usuário nem novos papéis além de `OWNER`/`ADMIN`/`USER`.
- Não editar política de remuneração (`INC-03`), não excluir Cambista, não alterar `code`.
- Não adicionar CPF/CNPJ/CEP/UF/complemento — seguem fora do modelo.

## Decisions

### D1 — Autorização por perfil é resolvida via catálogo fixo em código (opção "b"), não configuração persistida

O prompt de origem deixou explicitamente em aberto entre (a) tornar a atribuição perfil→permissão configurável e persistida por Banca, ou (b) manter o catálogo fixo em código e apenas garantir que a nova permissão apareça na matriz já existente.

**Decisão: opção (b).** Motivo: o sistema já implementado e testado (`authoritative-permission-catalog`) declara como requisito vigente que o catálogo "NÃO SHALL ser editável em runtime nesta fase (sem tabela, sem UI de administração de permissões)", e `settings-capability-visibility` já trata "perfis de acesso persistidos" como capability explicitamente indisponível nesta versão — não um gap a preencher, mas uma decisão de produto já tomada e comunicada ao usuário na própria UI. Reabrir isso exigiria reverter duas changes já aplicadas, migration de tabela de permissões, e um novo endpoint de escrita sensível (privilege escalation se malfeito) — desproporcional ao pedido real, que é: "quem administra Cambista por papel".

**Como isso atende ao pedido do usuário:** a chave `participants.betting-agents.update` é adicionada ao catálogo com decisão explícita por papel (`OWNER`: sim; `ADMIN`: sim; `USER`: não), exatamente como todas as outras 15 chaves do catálogo. Isso *define, por perfil, quem cadastra/altera/lê* — apenas via código-fonte revisável em PR, e não via uma tela de configuração em runtime. A tela "Perfis de acesso" já existente passa a exibir essa nova linha automaticamente, sem código novo no frontend de Configurações além do já previsto pela regra de evolução do catálogo.

**Alternativas rejeitadas:** (a) configuração persistida por Banca — rejeitada por contradizer decisão vigente e introduzir superfície de escrita de privilégio sem necessidade comprovada; permissão individual por usuário — rejeitada, fora de escopo do modelo de papéis fixos.

### D2 — Papel concedido para `participants.betting-agents.update`

`OWNER` e `ADMIN` concedidos (mesmo padrão de `participants.betting-agents.create`); `USER` negado, mantendo-se apenas com leitura (`list`/`read`), consistente com D19/D23 (só OWNER/ADMIN administram Cambistas) e com o padrão já usado para `create`.

### D3 — Formato de telefone passa a incluir rótulo, com BREAKING change no `POST`

`CreateBettingAgentDto.phones` muda de `string[]` para `{ phone: string; label?: string }[]`. Isso é necessário porque (i) o domínio e o DTO de saída (`PartyContactDTO`) já modelam `label`, e (ii) manter dois formatos diferentes entre criação e edição do mesmo recurso criaria uma inconsistência permanente de contrato. Como não há consumidores externos do endpoint além do próprio Web deste monorepo, o custo da mudança é local — atualizar o cliente Web (`data/betting-agent.client.ts`) e o schema (`data/betting-agent.schema.ts`) junto com o backend, na mesma change.

**Alternativa rejeitada:** manter `phones: string[]` na criação e aceitar `{phone,label}[]` só na edição — rejeitada por criar dois contratos divergentes para o mesmo conceito e obrigar o Web a manter dois formatos de estado para o mesmo campo.

### D4 — Edição opera sobre a `Party` existente, nunca cria nova Party/BettingAgent

Reafirma D24 do INC-01 (a primeira criação sempre cria nova Party; não há segunda criação). Editar reconcilia contatos/endereço da `Party` já vinculada ao `BettingAgent`, através do `PartyRepository` (único ponto de mutação de `PartyContact`/`PartyAddress`, por `participant-registration`).

### D5 — Reconciliação de contatos e endereço: substituição total por lista informada, não patch incremental

Ao editar, o payload de `phones` representa o **estado final** desejado (a lista completa de telefones do Cambista), não uma lista de operações de add/remove. O backend reconcilia: remove os que não aparecem mais, atualiza rótulo dos que persistem (mesmo `phone` normalizado), cria os novos. O mesmo vale para `address`: enviar `address` substitui o endereço ativo corrente; omitir/enviar `null` remove o endereço ativo (mantendo o histórico de vigência via `EffectivePeriod`, nunca deletando fisicamente a linha). Essa escolha é mais simples de implementar corretamente em uma transação única e evita ambiguidade de payloads parciais de diff.

**Alternativa rejeitada:** endpoints granulares por telefone (`POST/DELETE /betting-agents/:id/phones/:phoneId`) — mais RESTful, mas multiplica chamadas de rede do drawer (que edita tudo de uma vez, numa única tela com "Salvar") e adiciona complexidade de coordenação no frontend sem benefício para o caso de uso real.

### D6 — Migration Prisma: nenhuma migration de schema é necessária

O modelo Prisma já suporta `PartyContact.label`, `PartyAddress` (com `effectiveFrom`/`effectiveTo` para versionamento) e `BettingAgent.status`. A edição reaproveita essas colunas; a única mudança é de comportamento na camada de aplicação (reconciliação) e de contrato HTTP (DTOs), não de schema.

## Risks / Trade-offs

- [Risco] BREAKING change no `POST` de criação (formato de `phones`) pode quebrar qualquer consumidor externo não identificado → Mitigação: nesta fase o único consumidor é o próprio Web do monorepo, atualizado na mesma change; documentar a mudança no `README.md` do módulo `participants`.
- [Risco] Reconciliação "substituição total" de telefones pode apagar/recriar `PartyContact` desnecessariamente se a comparação de igualdade for ingênua (ex.: comparar string bruta em vez de telefone normalizado) → Mitigação: comparar pelo valor normalizado do VO `Phone`, preservando o `id` do contato existente quando o telefone normalizado coincide, para não perder metadados de auditoria por linha.
- [Risco] Adicionar `participants.betting-agents.update` sem cobrir a "regra de evolução do catálogo" (metadados de apresentação, decisão por papel, teste de integridade) faria a matriz "Perfis de acesso" ficar incompleta ou o teste de integridade do catálogo falhar → Mitigação: tratar isso como tarefa obrigatória de Backend, com teste de integridade cobrindo a nova chave.
- [Trade-off] Optar por (b) em vez de (a) significa que, se o negócio realmente precisar de permissões diferentes por Banca no futuro, será necessária uma nova change para introduzir persistência — decisão consciente, documentada aqui, não uma limitação acidental.

## Migration Plan

1. Backend: adicionar `participants.betting-agents.update` ao catálogo (`PermissionKey`, metadados, `RolePermissionMap`) e os dois novos endpoints (`PATCH /:id`, `PATCH /:id/status`), com o novo formato de `phones` aplicado a criação e edição.
2. Web: atualizar `data/betting-agent.client.ts` e `data/betting-agent.schema.ts` para o novo formato de `phones` (com rótulo) e as novas operações `update()`/`setStatus()`, antes de trocar o drawer.
3. Web: unificar o drawer em abas com modos add/view/edit, introduzir `PhoneInput`, ligar edição e ativar/inativar.
4. Sem migration de banco. Sem passo de rollback de dados — rollback é reverter a change (branch/PR), já que não há dado de produção migrado.

## Open Questions

- Nenhuma pendente para implementação: a decisão de autorização (D1) e o formato de telefone (D3) foram resolvidos nesta proposta. Caso o negócio peça futuramente permissões diferentes por Banca, isso exige uma nova change específica para introduzir persistência no Access Control — não faz parte deste incremento.
