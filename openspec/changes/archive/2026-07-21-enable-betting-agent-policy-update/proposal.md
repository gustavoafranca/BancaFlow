## Why

A Política de remuneração (`CompensationPolicy`) de um Cambista (`BettingAgent`) é imutável hoje: só é definida na criação, e o próprio DTO de edição (`UpdateBettingAgentDto`) documenta explicitamente que política "nunca é aceita" ali. Isso foi uma decisão deliberada de escopo do INC-02 (`enable-betting-agent-management`), adiada para um incremento futuro rotulado "INC-03" em três specs/designs anteriores. Esse incremento é agora: o usuário validando o drawer padronizado de Cambista pediu para poder corrigir/ajustar o tipo de política, percentual e valor fixo semanal de um Cambista já cadastrado, restrito a quem tem papel de Dono (OWNER) ou Admin (ADMIN) na Banca.

## What Changes

- **Nova operação de alteração de política**: endpoint dedicado `PATCH /participants/betting-agents/:id/policy` (sub-recurso, mesmo padrão já usado por `:id/status`), com DTO e use case próprios — não estende `UpdateBettingAgentDto` (que documenta política como fora de escopo por desenho).
- **Histórico de vigência, não sobrescrita**: a nova política é persistida como uma nova linha vigente (`effectiveFrom` = agora, `effectiveTo` em aberto) na tabela dedicada `BettingAgentCompensationPolicy` (já preparada para histórico), fechando a vigência da política anterior (`effectiveTo` = novo `effectiveFrom`) — mesmo padrão já usado por `Party.updateProfile()` para endereço (fechar linha ativa, abrir nova). Nenhuma reescrita/deleção de linha histórica.
- **Sem permissão nova**: reaproveita `participants.betting-agents.update` (já concedida só a OWNER e ADMIN, nunca a USER — não existe hoje diferenciação de papel entre OWNER/ADMIN para nada de Cambista, então a permissão existente já expressa exatamente "Dono ou Admin").
- **Frontend — drawer de Cambista**: no modo edição, o bloco de Política deixa de ser somente-leitura (`ReadOnlyField`) quando o usuário tem `participants.betting-agents.update` — passa a expor os mesmos campos usados na criação (Tipo de política / Percentual / Valor fixo semanal), com o mesmo `Select`/validação já usados no formulário de criação. Sem essa permissão, ou no modo visualização, o bloco continua somente-leitura.
- Sem mudança na modelagem de criação, nos três tipos de política aceitos, ou nas regras de validação de valores — essas continuam as mesmas, apenas reaplicadas também na alteração.

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova — estende uma capability existente. -->

### Modified Capabilities
- `betting-agent-compensation-policy`: adiciona a operação de alteração de política pós-criação (hoje explicitamente fora de escopo — "no policy change operations in this increment"), preservando o requisito de estrutura versionável por vigência já declarado.

## Impact

- **Backend** (`apps/backend/src/modules/participants`):
  - Novo DTO (ex.: `update-betting-agent-policy.dto.ts`), novo use case (ex.: `update-betting-agent-policy.use-case.ts`), nova rota no `betting-agent.controller.ts` (`PATCH :id/policy`).
  - `BettingAgent` entity: novo método de domínio (ex.: `changePolicy()`), mirrando `Party.updateProfile()` para endereço.
  - `betting-agent.repository.prisma.ts`: persistência do fechamento da linha vigente + inserção da nova linha, mesmo padrão de `party.repository.prisma.ts`.
  - Sem migration de schema (tabela `BettingAgentCompensationPolicy` já suporta múltiplas linhas por `bettingAgentId`).
- **Frontend** (`apps/web/src/modules/cambistas`):
  - `data/betting-agent.client.ts` / `betting-agent.schema.ts`: novo contrato de update de política.
  - `components/betting-agent-drawer.tsx`: bloco de Política editável em modo edit (gated por `canUpdate`), reaproveitando os campos/validação já existentes no `CreateForm`.
- **Testes**: novos testes de use case/controller (backend) e de drawer (frontend, edição de política com/sem permissão).
- **Sem impacto**: os três tipos de política aceitos, regras de validação de valores, permissões de criação/status, rotas/menu.
