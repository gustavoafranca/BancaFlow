## Why

Hoje o módulo Participants só permite **criar**, **listar** e **consultar** um Cambista (`INC-01`) — não há edição de perfil/endereço/contatos nem ativação/inativação, o que foi explicitamente adiado para um incremento posterior. Sem isso, um erro de cadastro ou uma mudança de endereço/telefone de um Cambista real é irreversível pela tela, e não existe forma de suspender um Cambista sem excluí-lo. Este é o `INC-02`: fechar o ciclo de manutenção do Cambista.

## What Changes

- Adiciona `PATCH /participants/betting-agents/:id` para editar nome, apelido, contatos e endereço da `Party` de um Cambista existente. `code` e política de remuneração continuam imutáveis por este endpoint.
- Adiciona `PATCH /participants/betting-agents/:id/status` para alternar `BettingAgentStatus` entre `ACTIVE` e `INACTIVE`.
- **BREAKING**: o formato de telefone na criação (`CreateBettingAgentDto.phones: string[]`) muda para `phones: { phone: string; label?: string }[]`, para aceitar rótulo (ex.: "Celular", "Casa") de forma simétrica ao DTO de saída (`PartyContactDTO`). Consumidores atuais do `POST` precisam migrar o payload.
- Reconcilia contatos e endereço da `Party` na edição (adicionar/remover/alterar telefones; substituir ou remover o endereço), preservando os invariantes já existentes (bairro+cidade obrigatórios quando há endereço; telefone normalizado via `Phone`).
- Adiciona ao catálogo autoritativo de permissões a chave `participants.betting-agents.update`, concedida a `OWNER` e `ADMIN` (mesmo padrão de `create`); `USER` permanece restrito à leitura já concedida (`list`/`read`).
- Unifica o drawer Web de Cambista (`apps/web/src/modules/cambistas`) num único componente com modos **add/view/edit** e três abas — Cadastro, Endereço e Contato — substituindo os dois drawers atuais (criação e detalhe somente-leitura).
- Introduz um componente `PhoneInput` reutilizável (shared) com máscara BR, substituindo a lista de telefones sem máscara do drawer atual.
- Adiciona controle de ativar/inativar na tela, refletido na tabela e nos cards de estatística de `/cambistas`.
- A nova permissão `participants.betting-agents.update` passa a aparecer automaticamente na matriz somente-leitura "Perfis de acesso" já existente (`GET /access-control/role-permissions`) — nenhuma nova superfície de configuração é criada; a matriz continua sendo projeção do catálogo fixo em código, não um cadastro editável em runtime.

## Capabilities

### New Capabilities

_Nenhuma capability nova — o incremento estende capabilities já existentes do módulo Participants e do catálogo de permissões._

### Modified Capabilities

- `participant-registration`: a `Party` de um Cambista passa a poder ser editada após a criação (nome, apelido, contatos e endereço, através do agregado `Party`); contatos passam a aceitar rótulo opcional por telefone, tanto na criação quanto na edição.
- `betting-agent-catalog`: adiciona a transição explícita de `BettingAgentStatus` (`ACTIVE` ⇄ `INACTIVE`) após a criação, e a autorização passa a incluir a chave `participants.betting-agents.update` para a edição de perfil e a transição de status.
- `authoritative-permission-catalog`: adiciona `participants.betting-agents.update` ao catálogo fechado de `PermissionKey`, com decisão explícita por papel (`OWNER`: concede; `ADMIN`: concede; `USER`: nega), mantendo o catálogo fixo em código e sem endpoint de escrita — a permissão nova aparece na matriz somente-leitura já existente sem exigir uma nova superfície de configuração.

## Impact

- **Backend:** `apps/backend/src/modules/participants/betting-agent.controller.ts` (novos endpoints), `apps/backend/src/modules/participants/dto/*` (novo `UpdateBettingAgentDto`, `phones` com rótulo, DTO de status), `apps/backend/src/modules/access-control/*` (nova `PermissionKey` e decisão por papel).
- **Domínio:** `modules/participants/src/**` (novos casos de uso `UpdateBettingAgentProfile` e `SetBettingAgentStatus`; reconciliação de `PartyContact`/`PartyAddress` no repositório `Party`; DTOs de entrada/saída ajustados para rótulo de contato).
- **Persistência:** `apps/backend/prisma/models/participants.model.prisma` já suporta os campos necessários (`PartyContact.label`, `PartyAddress`, `BettingAgent.status`); avaliar necessidade de migration apenas para a reconciliação de endereço/contatos na edição.
- **Web:** `apps/web/src/modules/cambistas/**` (drawer unificado em abas, `PhoneInput` promovido a `apps/web/src/shared/components/ui/`, novo schema de edição, novas funções `update()`/`setStatus()` no cliente HTTP); nenhuma alteração de rota ou menu.
- **Consumidores externos** do `POST /participants/betting-agents`: precisam migrar o payload de `phones` para o novo formato com rótulo opcional.
