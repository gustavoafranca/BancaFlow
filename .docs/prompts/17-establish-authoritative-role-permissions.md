# Prompt — Propor spec de `establish-authoritative-role-permissions`

## Aviso de exceção de gate (leia antes de propor)

Este prompt foi gerado **fora do fluxo normal de `READY_FOR_SPEC`**, por pedido explícito do usuário em 2026-07-18. O plano de origem registra, na própria Definition of Ready, que **nenhum incremento está `READY_FOR_SPEC`**:

- A decisão **D44 (CRITICAL) permanece `OPEN`**: "Quais capacidades e ações precisam de granularidade agora, além de Identity (plano 08) e Participants (plano 01)?" — não pode ser fechada nesta execução porque Financeiro, Lançamentos, Prêmios, Acertos/Caixa e Dashboard ainda estão em `DISCOVERY`/`DECISIONS_PENDING` no roadmap mestre.
- Consequência prática: o **conteúdo inicial exato do catálogo** (quais `PermissionKey`s além de Identity/Participants) não está definido. A proposta/spec deverá **tratar D44 como decisão a resolver dentro da própria spec**, restringindo o catálogo inicial explicitamente às capacidades já modeladas (Identity/plano 08, Participants/plano 01) e deixando expresso que capacidades futuras registrarão suas próprias `PermissionKey`s quando avançarem — sem inventar granularidade de módulos ainda em `DISCOVERY`.

Se, ao propor a spec, ficar evidente que D44 exige uma decisão de produto que não pode ser assumida dentro da proposta, **pare e reporte o bloqueio** em vez de inventar uma resposta.

## Missão

Produza uma proposta/spec completa somente para o incremento selecionado abaixo. Não implemente código e não execute a change.

## Incremento selecionado

- **ID:** `INC-04`
- **Área/trilha do plano:** `foundation`
- **Resultado vertical:** Sistema aplica e apresenta catálogo autoritativo de permissões para os três papéis fixos (`OWNER|ADMIN|USER`), cobrindo pelo menos as capacidades já modeladas (Identity/plano 08, Participants/plano 01)
- **Change:** `establish-authoritative-role-permissions`
- **Capability specs adicionadas/modificadas:**
  - `authoritative-permission-catalog` — ADDED
  - `route-protection-backend` — MODIFIED (referencia a checagem de permissão além da checagem de autenticação/sessão já existente)
  - `route-protection-frontend` — MODIFIED (mesma referência, do lado Web)

## Fontes e precedência

1. Instruções locais: `CLAUDE.md` (raiz do projeto), convenções de `openspec/`.
2. Contexto do projeto: [`.docs/plans/00-project-context.md`](../.docs/plans/00-project-context.md).
3. Roadmap: [`.docs/plans/00-bancaflow-mvp-roadmap.md`](../.docs/plans/00-bancaflow-mvp-roadmap.md).
4. Plano de origem (**não está `READY_FOR_SPEC`** — ver aviso de exceção acima): [`.docs/plans/foundation/09-authoritative-access-control.md`](../.docs/plans/foundation/09-authoritative-access-control.md).
5. Diagrama: [`.docs/diagrams/foundation/09-authoritative-access-control.excalidraw`](../.docs/diagrams/foundation/09-authoritative-access-control.excalidraw).
6. Código/specs existentes relevantes:
   - `openspec/specs/route-protection-backend/spec.md` (spec vigente a modificar)
   - `openspec/specs/route-protection-frontend/spec.md` (spec vigente a modificar)
   - `apps/web/src/modules/configuracoes/lib/permissions.ts` (matriz demonstrativa a substituir — 4 perfis fictícios: Administrador/Operador/Cambista/Somente Leitura)
   - Plano 08 (`.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md`) e sua change `openspec/changes/enable-self-profile-management/` — fonte do inventário de ações de Identity já modeladas (perfil, criação/gestão de conta, papel, ciclo de vida)
   - Plano 01 (`.docs/plans/01-participants.md`) e `openspec/changes/implement-participant-registration-mvp/` — fonte do inventário de ações de Participants já modeladas (cadastro/gestão de `BettingAgent`)
   - `ToggleAccountStatusUseCase` (Identity) — candidato natural de enforcement real (ver Backend)

## Objetivo e resultado esperado

Dar a `AccountRole` (`OWNER|ADMIN|USER`) um significado operacional explícito e auditável: quais ações de quais capacidades cada papel autoriza, versionado com o código, consumido de forma idêntica por casos de uso, controllers, rotas e menus/botões do Web. Eliminar a divergência hoje existente entre a matriz demonstrativa do frontend (4 perfis fictícios) e os três papéis reais do domínio.

Resultado esperado: proposta/spec completa (`proposal.md`, `design.md`, `specs/*/spec.md`, `tasks.md`) para `establish-authoritative-role-permissions`, incluindo a decisão explícita de escopo inicial do catálogo (resolvendo D44 dentro dos limites definidos acima).

## Escopo

- definição de identificadores estáveis de permissão (`PermissionKey`), versionados com o código, estruturados como `capacidade.recurso.acao` (ex.: `identity.accounts.create`, `participants.betting-agents.deactivate`);
- mapeamento fixo papel → conjunto de permissões para `OWNER`, `ADMIN`, `USER`, cobrindo **exclusivamente** as ações já modeladas em Identity (plano 08) e Participants (plano 01) — não inventar ações de capacidades ainda em `DISCOVERY`/`DECISIONS_PENDING` (Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard);
- porta de checagem de permissão reutilizável por qualquer módulo (`hasPermission(actorRole, permissionKey)` ou equivalente), implementada em memória/código-fonte, sem tabela Prisma nesta fase;
- endpoint de leitura `GET /api/access-control/role-permissions` retornando a matriz completa papel × permissão;
- exibição de leitura da matriz papel × permissão em `/configuracoes → Perfis de Acesso`, substituindo os 4 perfis fictícios por `OWNER/ADMIN/USER` reais — tela somente leitura, sem toggles editáveis;
- enforcement real do catálogo em pelo menos um ponto do Backend — candidato natural: `ToggleAccountStatusUseCase` (plano 08) passa a consultar a porta de permissão além da checagem de papel já existente, como prova de que o mecanismo funciona de ponta a ponta (não apenas leitura decorativa).

## Fora de escopo

Incluir explicitamente os demais increments/decisões do plano de origem:

- **INC-05** (perfis personalizados/nomeados além dos 3 papéis fixos): permanece `DISCOVERY`, sem necessidade de negócio aprovada; não abordar seleção dinâmica de permissões por Banca.
- os 4 "perfis" do protótipo (`Administrador/Operador/Cambista/Somente Leitura`) como requisito real (D38, herdada do plano 08) — tratar apenas como matriz de amostra a ser substituída, nunca como especificação de negócio;
- permissões criadas por texto livre ou UI de administração de permissões em runtime;
- expressões/fórmulas de autorização configuráveis;
- enumeração de permissões de capacidades ainda não modeladas no roadmap mestre (Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard) — o catálogo nasce extensível (novas `PermissionKey`s adicionadas por specs futuras), não nasce completo;
- login de `Cambista`/`BettingAgent` (permanece sem `UserAccount`, conforme planos 01 e 08);
- qualquer tabela de auditoria de mudanças no catálogo (catálogo é código-fonte, versionado por git/deploy, não por ação de usuário em runtime, nesta fase).

## Decisões preservadas e alternativas rejeitadas

| ID | Decisão | Alternativas rejeitadas |
|---|---|---|
| D41 | Catálogo organizado por capacidade real do roadmap, com identificadores versionados no código — não replica 1:1 a matriz demonstrativa do frontend | ação por módulo igual ao protótipo; ausência de catálogo granular no MVP |
| D42 | Catálogo vive em bounded context próprio `Access Control`, distinto de Identity; Identity e demais módulos consomem via porta pública | embutir o catálogo dentro de Identity |
| D43 | Perfis personalizados ficam fora do MVP; só viram incremento (INC-05) mediante necessidade de negócio aprovada | perfis personalizados já no MVP |
| D44 (**OPEN no plano — tratar como decisão a resolver na própria proposta**, restrita ao escopo acima) | Quais capacidades/ações entram no catálogo inicial | enumerar permissões de capacidades ainda não modeladas — rejeitada por inventariar regra de negócio inexistente |

A proposta deve registrar D44 como resolvida **dentro do escopo restrito acima** (Identity + Participants), e não deve tentar fechar a versão "completa" da pergunta original de D44 — essa permanece aberta para futuras extensões do catálogo à medida que outras capacidades avançarem.

## Atores, permissões e cenários

| Ator | Permissão |
|---|---|
| OWNER | consulta o catálogo e a matriz papel × permissão; autoridade máxima implícita (todas as `PermissionKey`s existentes, sem necessidade de listagem manual) |
| ADMIN | consulta o catálogo; autoridade conforme conjunto atribuído ao papel ADMIN (pode ser menor que OWNER conforme a spec definir por ação) |
| USER | consulta somente as próprias permissões efetivas (não a matriz completa de outros papéis) |
| Qualquer módulo consumidor | consulta a porta de checagem; nunca decide autorização fora dela |

Jornadas a cobrir:

1. OWNER/ADMIN abre `/configuracoes → Perfis de Acesso` e vê a matriz real (papel × permissão), somente leitura.
2. Um caso de uso (ex.: `ToggleAccountStatusUseCase`) consulta a porta de permissão além da checagem de papel já existente; falha de permissão retorna o mesmo tipo de erro de autorização já padronizado (`FORBIDDEN`).
3. Uma rota/elemento Web oculta, por experiência, ações que o papel do usuário autenticado não teria permissão de executar — sempre revalidado no Backend.

## Regras, invariantes, falhas, concorrência e idempotência

- Toda `PermissionKey` referenciada por um consumidor deve existir no catálogo; referenciar uma chave inexistente é erro de programação (falha em tempo de build/teste, não em runtime de produção).
- `OWNER` sempre possui todas as `PermissionKey`s existentes (autoridade máxima implícita).
- O mapeamento papel → permissões é o mesmo para todas as Bancas (sem personalização por tenant nesta fase, reforça D43).
- Leitura pura, sem escrita em runtime — não há concorrência a proteger.
- Falhas: `PermissionKey` desconhecida é erro de configuração (não de autorização, não deve virar `FORBIDDEN` silencioso); checagem negada em caso de uso real retorna `FORBIDDEN` já padronizado.

## Entregas aplicáveis

### Negócio/domínio

- `PermissionKey` (VO): string estruturada, validada e normalizada, imutável e versionada no código-fonte.
- `PermissionCatalog` (agregado leve, fonte de verdade): coleção de `PermissionKey`s válidas, definida em código.
- `RolePermissionMap` (agregado leve): associação fixa entre cada `AccountRole` e o subconjunto de `PermissionKey`s que autoriza, definida em código.
- Nenhum serviço de domínio adicional além da função pura de consulta (`role`, `permissionKey`) → `boolean`.
- Casos de uso: `CheckPermissionUseCase`/porta de checagem; `GetRolePermissionMatrixUseCase` (leitura pública a qualquer autenticado).

### Backend

- `GET /api/access-control/role-permissions` — retorna a matriz completa para exibição.
- Nenhuma rota de escrita nesta fase.
- Enforcement real em `ToggleAccountStatusUseCase` (ou outro caso de uso real equivalente, a confirmar na proposta) consultando a porta de permissão.
- Porta pública `PermissionCatalogQuery`/`RolePermissionResolver`, adapter inicial em memória/código-fonte.

### Web

- Substituir `apps/web/src/modules/configuracoes/lib/permissions.ts` (matriz fabricada de 4 perfis fictícios) por leitura real de `GET /api/access-control/role-permissions`, exibindo apenas `OWNER/ADMIN/USER`.
- Tela somente leitura nesta fase — sem toggles editáveis.
- Seguir a ordem de tasks recomendada por `frontend-module-workflow` (contrato/tipos → shared → módulo/feature → rotas/navegação → testes).

### Persistência, eventos e migração

- Nenhuma tabela nova é estritamente necessária — catálogo e mapeamento papel→permissão nascem versionados em código. Se a proposta decidir por uma tabela de auditoria/leitura em vez de constantes em código, isso deve ser decidido e registrado explicitamente na spec, com justificativa.
- Nenhum evento nesta fase — leitura pura.

## Segurança, tenancy, auditoria e requisitos não funcionais

- Checagem de permissão é sempre server-side; o Web nunca decide autorização, apenas espelha o catálogo para experiência.
- Catálogo não varia por Banca — nenhuma superfície de tenant a proteger nesta fase.
- Auditoria de mudanças no catálogo não se aplica nesta fase (catálogo é código-fonte, versionado por git/deploy).

## Testes e critérios de aceitação

- `OWNER` sempre autorizado para qualquer `PermissionKey` existente.
- `ADMIN`/`USER` autorizados exatamente conforme o `RolePermissionMap` definido, negados fora dele.
- Endpoint de leitura da matriz retorna os 3 papéis reais, nunca os 4 perfis fictícios do protótipo.
- Pelo menos um endpoint real (candidato: toggle de status de conta) recusa a ação quando a permissão correspondente é negada, mesmo com papel tecnicamente compatível com a checagem antiga — prova de enforcement real, não apenas leitura decorativa.
- Ausência de qualquer toggle editável de permissão na tela nesta fase.

## Skills, ferramentas e convenções locais

- **Proposta/spec:** `openspec-propose`.
- **Aplicação futura — Negócio/Backend:** `module-value-object` (`PermissionKey`), `module-domain-service` ou `module-use-case` conforme desenho final da proposta, `backend-controller`.
- **Aplicação futura — Web:** `frontend-module-workflow` (fonte de restrições de organização, não executada agora) para a tela somente leitura de "Perfis de Acesso".
- **Skills condicionais ou ainda em construção:** nenhuma identificada para este incremento.

Não executar skills de aplicação durante a proposta/spec.

## Conflitos conhecidos

- `apps/web/src/modules/configuracoes/lib/permissions.ts` já documenta, em comentário próprio, que sua matriz é apenas dado de amostra e que uma capability de backend real de permissões estaria fora do escopo até então — esta change é exatamente essa capability, agora formalizada.
- Divergência interna do protótipo entre `PERM_MODS` (lista exibida) e `mods` (lista usada em `buildDefaultPerms()`) não é regra de negócio a preservar; é bug/inconsistência do mock, irrelevante para o catálogo real definido aqui.
- **D44 aberta no plano de origem** (ver Aviso de exceção de gate, no topo): a proposta deve resolver apenas a fatia restrita ao escopo declarado acima; não deve assumir cobertura de capacidades ainda não modeladas.

## Saída solicitada

Crie os artefatos de proposta/spec exigidos pelo workflow OpenSpec local (`proposal.md`, `design.md`, `specs/*/spec.md` para `authoritative-permission-catalog` ADDED e `route-protection-backend`/`route-protection-frontend` MODIFIED, `tasks.md`), incluindo design, requisitos/cenários e tarefas. Mantenha rastreabilidade com as fontes listadas acima, destaque bloqueios (incluindo a exceção de gate registrada neste prompt) e não implemente.
