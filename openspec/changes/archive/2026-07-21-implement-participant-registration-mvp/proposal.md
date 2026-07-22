## Why

O BancaFlow ainda não tem um cadastro real de Cambistas: a rota `/cambistas` exibe dados simulados e nenhum módulo consumidor futuro (Lançamentos, Prêmios, Financeiro, Acertos, Relatórios) tem uma identidade operacional confiável para referenciar. Este incremento (INC-01) entrega a primeira fatia vertical do bounded context **Participants**, permitindo que OWNER e ADMIN cadastrem, pesquisem, listem e consultem Cambistas reais da própria Banca, separando a identidade cadastral (`Party`) do perfil operacional de Cambista (`BettingAgent`).

## What Changes

- Novo bounded context **Participants** com dois agregados separados: `Party` (identidade cadastral pessoa natural) e `BettingAgent` (perfil operacional com código/talão), coordenados no caso de uso, sem serviço de domínio artificial (D18)
- Criação atômica de nova `Party` do tipo `PERSON` + novo `BettingAgent` na mesma transação; qualquer falha produz rollback total (D24)
- `BettingAgentCode` manual, imutável, tratado como texto somente-dígitos com zeros à esquerda preservados; unicidade por `(bancaId, code)`, nunca global (D25)
- Política de remuneração inicial obrigatória na criação, persistida em estrutura versionável por vigência (`PERCENTAGE_ON_SALES`, `FIXED_WEEKLY`, `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`); sem alteração/agendamento de vigência neste incremento (D27)
- Perfil pessoal opcional: nome, apelido, vários telefones e um endereço inicial opcional (bairro e cidade obrigatórios quando há endereço); e-mail e documentos fora (D20, D26, D29)
- Alerta confirmável de possível duplicidade por telefone ou nome+apelido — nunca bloqueia; sem confirmação nada é persistido (D28)
- Três casos de uso apenas: `CreateBettingAgent`, `ListBettingAgents`, `GetBettingAgent`
- Três endpoints REST apenas: `POST /participants/betting-agents`, `GET /participants/betting-agents`, `GET /participants/betting-agents/:id`, com autorização server-side via o catálogo autoritativo de permissões (`hasPermission(actorRole, 'participants.betting-agents.create'|'list'|'read')`, ver **Dependência cruzada** abaixo) e isolamento estrito por tenant (D19, D23)
- Modelos Prisma modulares para Party, contatos, endereço, BettingAgent e política, com migration revisável e constraint única `(bancaId, code)`
- Rota Web `/cambistas` passa a consumir a API real (listar, buscar, paginar, cadastrar, consultar detalhe), substituindo os arrays simulados; sem colunas/controles de dono ou FieldCollector

## Capabilities

### New Capabilities

- `participant-registration`: Cadastro atômico de `Party` PERSON (nome/apelido opcionais, contatos telefônicos múltiplos, endereço inicial opcional com bairro/cidade obrigatórios) dentro do tenant, incluindo detecção heurística de possível duplicidade com confirmação explícita
- `betting-agent-catalog`: Agregado operacional `BettingAgent` com `BettingAgentCode` manual/imutável/único por Banca, estado inicial `ACTIVE`, vínculo 1:1 com Party na mesma Banca, e as operações de criação, listagem paginada/filtrada e consulta de detalhe isoladas por tenant
- `betting-agent-compensation-policy`: Política de remuneração individual do BettingAgent — união discriminada com três tipos aprovados, obrigatória na criação, iniciando na data de criação e persistida em estrutura compatível com histórico futuro por vigência (sem alteração/encerramento neste incremento)

### Modified Capabilities

<!-- Nenhuma. Este incremento não altera requisitos de specs existentes (Identity/Tenancy/roteamento/transação). Reutiliza-as como dependências. -->

## Impact

- **`modules/participants`** (novo pacote de domínio): agregados `Party` e `BettingAgent`, entidades filhas `PartyContact`/`PartyAddress`, Value Objects (`BettingAgentCode`, `BettingAgentStatus`, `CompensationPolicy`, `EffectivePeriod`, `Phone`, `Neighborhood`, `City`), casos de uso, contratos de repositório/query, ports (`Clock`) e erros de domínio estáveis
- **`apps/backend/prisma`**: novos modelos modulares (`participants.model.prisma`) para party, party_contact, party_address, betting_agent e betting_agent_compensation_policy; migration revisável com constraint `UNIQUE (bancaId, code)` e sem cascata destrutiva de histórico
- **`apps/backend/src/modules/participants`** (novo): `ParticipantsModule` NestJS, `BettingAgentController`, adapters Prisma dos repositories/queries, integração ao contexto autenticado/tenant e autorização via a porta `hasPermission` de `modules/access-control`
- **`apps/web/src/modules/cambistas`** e **`apps/web/src/app/(private)/cambistas/page.tsx`**: substituição dos arrays simulados por cliente HTTP real; listagem com loading/vazio/erro/paginação/busca; cadastro com código+política obrigatórios e perfil opcional; formulário discriminado de política; aviso confirmável de duplicidade; consulta de detalhe. Sem edição/inativação/mudança de política
- **`packages/shared`**: reuso de `Result`, `Entity`, `ValueObject`, `UseCase`, `Id`, paginação e `TransactionManager`; criar VOs novos em `modules/participants` apenas quando a semântica não coincidir com o shared existente
- **Fundação**: primeira tarefa de implementação futura roda `config-new-module participants --mode fullstack --route cambistas` (dry-run + execução) para criar apenas as fronteiras; comportamento real vem das skills especializadas
- **Dependências existentes reutilizadas**: Identity (ator autenticado, papel), Tenancy (`bancaId` contextual), guard/decorators de autenticação e mecanismo transacional compartilhado do backend
- **Dependência cruzada (adicionada nesta revisão):** `CreateBettingAgent`, `ListBettingAgents` e `GetBettingAgent` autorizam via `hasPermission(actorRole, permissionKey)` de `modules/access-control` (change `establish-authoritative-role-permissions`, que enumera `participants.betting-agents.create|list|read` para `OWNER|ADMIN`), não mais via checagem de papel bruto embutida no caso de uso. **Ordem de aplicação:** `establish-authoritative-role-permissions` deve estar implementada (módulo `access-control` existente com a porta `hasPermission` disponível) antes ou junto da implementação das tasks de autorização deste change; se aplicada fora de ordem, a tarefa correspondente deve permanecer bloqueada até `access-control` existir, em vez de reintroduzir uma checagem de papel bruto paralela
- **Fora de escopo (INC-02/INC-03 e além)**: edição de perfil, ciclo de vida (ativar/inativar/reativar), alteração/agendamento/histórico de políticas, FieldCollector/dono e vínculos, tela `/pessoas`, CPF/documentos/e-mail, Party `ORGANIZATION`, login de Cambista, migração entre Bancas, exclusão/reutilização de código, lançamentos/financeiro e eventos/outbox sem consumidor
