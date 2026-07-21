# Plano 09 — Access Control: catálogo autoritativo de papéis e permissões

## Identificação e estado

- **Capacidade:** estabelecer a fonte de verdade de permissões do BancaFlow, substituindo a matriz demonstrativa do frontend (`apps/web/src/modules/configuracoes/lib/permissions.ts`) por uma política autoritativa aplicada de forma coerente entre domínio, Backend e Web.
- **Área/trilha:** `foundation`
- **Bounded context:** Access Control (novo, distinto de Identity — ver D42)
- **Estado:** `IMPLEMENTED` (INC-04, por exceção documentada — mudou de `SPEC_PROPOSED` para `IMPLEMENTED` após implementação verificada e arquivamento da change; ver Nota de estado e histórico de transições)
- **Nota de estado:** D44 está resolvida **apenas para o recorte inicial** do catálogo (Identity + Participants + leitura do próprio Access Control, 9 `PermissionKey`s enumeradas na change); a pergunta ampla de D44 (cobertura de todas as capacidades do roadmap mestre) permanece `OPEN` e será revisitada a cada nova capacidade que avançar. O INC-04 avançou para `SPEC_PROPOSED` por pedido explícito do usuário, sem que o gate formal `READY_FOR_SPEC` tivesse sido atingido antes da criação da change — ver Definition of Ready e histórico de transições para o registro completo da exceção. A implementação foi concluída, revisada seis vezes e verificada (identity 199/199, access-control 22/22, backend unit 87/87, backend e2e 79/79, web 177/177) antes do arquivamento.
- **Roadmap:** [Plano mestre](../00-bancaflow-mvp-roadmap.md)
- **Contexto:** [Contexto do projeto](../00-project-context.md)
- **Prompt:** [17-establish-authoritative-role-permissions.md](../../prompts/17-establish-authoritative-role-permissions.md) (INC-04 — gerado por exceção, ver histórico de transições)
- **Change/spec:** [openspec/changes/archive/2026-07-19-establish-authoritative-role-permissions](../../../openspec/changes/archive/2026-07-19-establish-authoritative-role-permissions/) (arquivada em 2026-07-19; proposal, design, specs, tasks completos, 43/43 tasks; revisada seis vezes após achados de revisão arquitetural, ver histórico de transições) — reconcilia também `openspec/changes/implement-participant-registration-mvp` (ainda ativa; dependência cruzada de autorização). Specs principais sincronizadas: `authoritative-permission-catalog` (nova), `route-protection-backend` e `route-protection-frontend` (modificadas) em `openspec/specs/`.
- **Diagrama:** [Access Control — catálogo](../../diagrams/foundation/09-authoritative-access-control.excalidraw) (atualizado, refletindo a arquitetura implementada — task 8.2 da change concluída)
- **Atualizado em:** 2026-07-19

## Objetivo e valor

Dar a `AccountRole` (`OWNER|ADMIN|USER`) um significado operacional explícito e auditável: quais ações de quais capacidades cada papel autoriza, versionado com o código, consumido de forma idêntica por casos de uso, controllers, rotas e menus/botões do Web. Elimina a divergência hoje existente entre a "matriz módulo.ação" fabricada no frontend (4 perfis fictícios: Administrador/Operador/Cambista/Somente Leitura) e os três papéis reais do domínio.

## Dependências

- **Identity (plano 08):** fornece `AccountRole` no `AuthContext`; este plano não altera o modelo de papéis, apenas atribui significado de permissão a cada papel.
- **Tenancy:** nenhuma dependência direta além do isolamento já garantido pelo `AuthContext`.
- **Todas as capacidades do roadmap (01–07) e Identity/plano 08:** são consumidoras do catálogo; cada uma precisa registrar suas próprias ações no catálogo à medida que suas specs forem aprovadas — este plano não pode enumerar hoje ações de capacidades ainda em `DISCOVERY`/`DECISIONS_PENDING` (Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard).
- **Web:** `frontend-module-workflow` como fonte de restrições para a futura tela de "Perfis de Acesso" (leitura/exibição do catálogo, nunca fonte de autorização).

## Decomposição em increments e changes

| Incremento | Resultado vertical | Escopo principal | Dependências | Change candidata | Estado |
|---|---|---|---|---|---|
| INC-04 | Sistema aplica e apresenta catálogo autoritativo de permissões para os três papéis fixos, cobrindo pelo menos as capacidades já modeladas (Identity/plano 08, Participants) | `PermissionCatalog` e `RolePermissionMap` versionados no código como políticas de domínio imutáveis (não agregados); `PermissionKey` como união literal + `parsePermissionKey` de fronteira; `hasPermission` como fonte única de autorização por papel/ação, sem exceção (exceto `me/permissions`, que exige apenas autenticação); dois endpoints de leitura (`role-permissions` restrito a OWNER/ADMIN via `hasPermission`, `me/permissions` para qualquer autenticado sem checagem prévia); enforcement em `ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`, `GetAuthenticatedUserContextUseCase`, `UpdateOwnProfileUseCase` e `ChangePasswordUseCase`; tela "Perfis de Acesso" somente leitura, sem toggles fictícios | modelo de papéis (D30, decidida); inventário de ações por capacidade (D44, **decidida para este recorte** — ver Nota de estado) | `establish-authoritative-role-permissions` | `IMPLEMENTED` (arquivada em 2026-07-19) |
| INC-05 (opcional) | OWNER cria perfis personalizados selecionando permissões predefinidas do catálogo | perfil nomeado além dos 3 papéis fixos, restrito a permissões já existentes no catálogo | INC-04 arquivado; necessidade de negócio aprovada (ainda não existe, D30/D43) | `enable-custom-access-profiles` | `DISCOVERY` |

O INC-04 avançou para `SPEC_PROPOSED` por exceção documentada (pedido explícito do usuário), com a change `establish-authoritative-role-permissions` já criada, revisada duas vezes e validada (`openspec validate --strict`); o gate formal `READY_FOR_SPEC` não foi atingido antes dessa criação — ver Definition of Ready. INC-05 permanece fora de alcance: depende de aprovação de negócio ainda inexistente.

## Mapa de capability specs por incremento

| Incremento | Capability specs | Operação esperada |
|---|---|---|
| INC-04 | `authoritative-permission-catalog` | ADDED |
| INC-04 | `route-protection-backend`, `route-protection-frontend` | MODIFIED (`ToggleAccountStatusUseCase`/`AdminResetPasswordUseCase` substituem, não complementam, a checagem de papel bruto pela consulta a `hasPermission`; a checagem de autenticação/sessão do guard permanece inalterada e é anterior a essa consulta) |
| INC-05 | `custom-access-profiles` | ADDED (futuro, condicional) |

## Escopo

- definição de identificadores estáveis de permissão (`PermissionKey`), versionados com o código;
- mapeamento fixo papel → conjunto de permissões para `OWNER`, `ADMIN`, `USER`;
- porta de checagem de permissão reutilizável por qualquer módulo (`hasPermission(actorRole, permissionKey)`);
- exibição de leitura da matriz papel × permissão em `/configuracoes → Perfis de Acesso`, substituindo os 4 perfis fictícios;
- enforcement do catálogo em pelo menos um ponto real do Backend (prova de conceito de que a checagem não é apenas teórica).

## Fora de escopo

- perfis personalizados/nomeados além dos 3 papéis fixos (INC-05, condicional);
- os 4 "perfis" do protótipo (`Administrador/Operador/Cambista/Somente Leitura`) como requisito real (D38, herdada do plano 08);
- permissões criadas por texto livre ou UI de administração de permissões;
- expressões/fórmulas de autorização configuráveis;
- enumeração completa de permissões de capacidades ainda não modeladas (Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard) — o catálogo nasce extensível, não nasce completo;
- login de `Cambista`/`BettingAgent` (permanece sem `UserAccount`, conforme plano 01 e 08).

## Atores e permissões

| Ator | Permissão |
|---|---|
| OWNER | consulta o catálogo e a matriz papel × permissão; autoridade máxima implícita (todas as permissões existentes) |
| ADMIN | consulta o catálogo; autoridade conforme conjunto atribuído ao papel ADMIN (menor que OWNER onde a spec da capacidade específica assim definir) |
| USER | consulta somente as próprias permissões efetivas (não a matriz completa de outros papéis) |
| Qualquer módulo consumidor | consulta a porta de checagem; nunca decide autorização fora dela |

## Jornadas

1. OWNER/ADMIN abre `/configuracoes → Perfis de Acesso` e vê a matriz real (papel × permissão, com rótulos e descrições), somente leitura; a própria leitura é autorizada via `hasPermission(actorRole, 'access-control.role-permissions.read')`, sem exceção à fonte única.
2. Um caso de uso de qualquer módulo (ex.: `ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`, `CreateBettingAgent`) consulta a porta de permissão em substituição à antiga checagem de papel bruto — não além dela; falha de permissão retorna o mesmo tipo de erro de autorização já padronizado (`FORBIDDEN`). Invariantes contextuais sobre a relação ator/alvo (ex.: ADMIN não gerencia OWNER) continuam sendo validadas separadamente, no domínio de origem, após a checagem de permissão.
3. Qualquer usuário autenticado consulta `GET /api/access-control/me/permissions` e vê somente suas próprias permissões efetivas, nunca a matriz completa de outros papéis.
4. Uma rota Web oculta, por experiência, ações que o papel do usuário autenticado não teria permissão de executar — sempre validado de novo no Backend.

## Glossário e linguagem ubíqua

- **PermissionKey:** identificador estável de uma ação autorizável (ex.: `identity.accounts.toggle-status`, `participants.betting-agents.create`), definido como união literal (tipo de dados, não VO) no código-fonte; validação de valores não tipados de fronteira é feita por `parsePermissionKey`, separada da checagem de autorização (`hasPermission`).
- **PermissionCatalog:** conjunto versionado de `PermissionKey` existentes no sistema.
- **RolePermissionMap:** atribuição fixa de `PermissionKey`s a cada `AccountRole`.
- **Perfil personalizado:** (INC-05, futuro) conjunto de `PermissionKey`s selecionado pelo OWNER, não um papel do sistema.

## Decisões

| ID | Criticidade | Status | Decisão/pergunta | Alternativas | Evidência/decisor | Impacto |
|---|---|---|---|---|---|---|
| D41 | CRITICAL | DECIDED | O catálogo de permissões é organizado por capacidade real do roadmap (participantes, turnos, financeiro, lançamentos, prêmios, acertos/caixa, dashboard/relatórios, usuários, configurações, auditoria), com identificadores versionados no código — não replica 1:1 a matriz demonstrativa do frontend | ação por módulo igual ao protótipo — rejeitada; sem catálogo granular neste MVP — rejeitada | usuário/produto, bloco de decisão 2026-07-18 | granularidade e organização do catálogo |
| D42 | IMPORTANT | DECIDED (delegada) | O catálogo de permissões vive em um bounded context próprio (`Access Control`), não dentro de Identity: seu ciclo de vida (evolução do catálogo por capacidade, à medida que cada plano avança) é distinto do ciclo de vida de conta/sessão. Identity e demais módulos consomem via porta pública | embutir o catálogo dentro de Identity — rejeitada | decisão técnica delegada, consequência de os dois planos terem ownership duradouro diferente | fronteira de módulo; evita acoplar evolução do catálogo à evolução de conta/sessão |
| D43 | CRITICAL | DECIDED | Perfis personalizados (seleção de permissões do catálogo) ficam fora do MVP; só viram incremento (INC-05) mediante necessidade de negócio aprovada | perfis personalizados já no MVP — rejeitada | usuário/produto (mesma decisão de D30) | escopo do INC-05 |
| D44 | CRITICAL | **DECIDED (recorte inicial); OPEN (escopo amplo)** | Quais capacidades e ações precisam de granularidade agora? **Recorte inicial (decidido nesta revisão, dentro da change `establish-authoritative-role-permissions`):** exatamente 9 `PermissionKey`s, cobrindo Identity (plano 08, 5 chaves), Participants (plano 01 INC-01, 3 chaves) e a leitura do próprio catálogo (`access-control.role-permissions.read`) — ver tabela normativa em `openspec/changes/establish-authoritative-role-permissions/design.md`. **Escopo amplo (permanece OPEN):** cobertura de Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard, e dos increments ainda em `DISCOVERY` de Identity (plano 08 INC-02/INC-03) e Participants (plano 01 INC-02/INC-03) | enumerar permissões de capacidades ainda não modeladas — rejeitada (inventaria regra de negócio inexistente) | usuário, ao autorizar a geração do prompt e da change apesar do gate formal não atingido; tabela normativa como evidência do recorte decidido | recorte inicial desbloqueou `SPEC_PROPOSED` do INC-04 por exceção; escopo amplo continua bloqueando um catálogo "completo" até as capacidades dependentes avançarem |

## Domínio e contexts

Access Control é um bounded context novo, dedicado exclusivamente ao catálogo de permissões e ao mapeamento papel → permissões. Não possui `UserAccount` nem `Banca`; recebe `actorRole` já resolvido por quem o consome (tipicamente via `AuthContext` do Backend). Não depende de infraestrutura de outros módulos além de expor uma porta de leitura simples.

## Agregados, entidades, VOs e serviços

Nenhum dos elementos abaixo é um agregado DDD: nenhum possui identidade, ciclo de vida, mutação ou fronteira transacional própria. São políticas de domínio imutáveis e uma função pura de consulta.

- **`PermissionKey`** (tipo de dados — união literal, não VO): string estruturada `capacidade.recurso.acao` (ex.: `identity.accounts.create`), fechada e versionada no código-fonte (não editável em runtime). `parsePermissionKey(value: unknown)` valida valores não tipados de fronteira; nenhum consumidor interno tipado precisa dela.
- **`PermissionCatalog`** (política de domínio/configuração imutável, fonte de verdade): coleção fechada de `PermissionKey`s válidas conhecidas pelo sistema, definida em código, com metadados de apresentação (`label`/`description`/`order`) por chave e por capacidade.
- **`RolePermissionMap`** (política de domínio imutável): associação fixa entre cada `AccountRole` e o subconjunto de `PermissionKey`s que autoriza. Também definida em código nesta fase — não há UI de edição de permissões no MVP.
- Nenhum serviço de domínio adicional: a checagem (`hasPermission`) é uma função pura e **total** de consulta (`role`, `permissionKey`) → `boolean`, que nunca lança, pois seu parâmetro já é restrito ao conjunto fechado pelo tipo `PermissionKey`.

## Invariantes, estados, concorrência e idempotência

- Toda `PermissionKey` referenciada por um consumidor deve existir no catálogo; referenciar uma chave inexistente é erro de programação (falha em tempo de build/teste, não em runtime de produção).
- `OWNER` sempre possui todas as `PermissionKey`s existentes (autoridade máxima implícita, sem necessidade de listagem manual por chave).
- O mapeamento papel → permissões é o mesmo para todas as Bancas (não há personalização por tenant neste MVP — reforça D43).
- Não há concorrência a proteger: leitura pura, sem escrita em runtime, nesta fase.

## Casos de uso e falhas

| Caso | Resultado | Falhas |
|---|---|---|
| `hasPermission` (porta de checagem) | função total: retorna se `actorRole` autoriza uma `PermissionKey` tipada | nenhuma (nunca lança; chave desconhecida só é possível em valores não tipados, tratados por `parsePermissionKey`) |
| `parsePermissionKey` | valida um valor não tipado contra o catálogo fechado | `PermissionKey` desconhecida (erro de configuração `ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`, não de autorização) |
| `GetRolePermissionMatrixUseCase` | retorna a matriz completa papel × permissão, com metadados de apresentação | ator sem `access-control.role-permissions.read` (USER) → `FORBIDDEN`, não leitura pública |
| `GetOwnEffectivePermissionsUseCase` | retorna somente as `PermissionKey`s efetivas do `actorRole` do próprio ator | nenhuma (disponível a qualquer autenticado, sem `PermissionKey` própria) |

## Portas e adapters

Porta pública: `hasPermission`/`GetRolePermissionMatrixUseCase`/`GetOwnEffectivePermissionsUseCase`, consumida por casos de uso de qualquer módulo (Identity, Participants, futuros) e pelos dois endpoints de leitura para o Web. Adapter inicial: implementação em memória/código-fonte (sem tabela Prisma nesta fase, já que o catálogo é versionado com o código, não editável em runtime).

## Eventos e integrações

Nenhum evento nesta fase — leitura pura. Se o INC-05 (perfis personalizados) avançar, ele exigirá persistência real (tabela `CustomProfile`/`ProfilePermission`) e possivelmente eventos de invalidação de cache; fora de escopo aqui.

## Persistência e migração

Nenhuma tabela nova é estritamente necessária para INC-04, já que catálogo e mapeamento papel→permissão nascem versionados em código. Se a spec do INC-04 decidir por uma tabela de auditoria/leitura ao invés de constantes em código, isso será decidido e registrado na spec, não neste plano.

## Backend

Contrato:

- `GET /api/access-control/role-permissions` — matriz completa, autorizada via `hasPermission(actorRole, 'access-control.role-permissions.read')` (OWNER/ADMIN); resposta inclui rótulos/descrições, não chaves técnicas cruas.
- `GET /api/access-control/me/permissions` — permissões efetivas do próprio ator, disponível a qualquer papel autenticado.
- Nenhuma rota de escrita nesta fase (o catálogo não é editável via API no MVP).
- Enforcement: `ToggleAccountStatusUseCase` e `AdminResetPasswordUseCase` (ambos do plano 08, já implementados) substituem sua checagem de papel bruto por `hasPermission`, sem exceção — prova de que o mecanismo funciona de ponta a ponta em mais de um ponto real, não apenas um candidato isolado.
- **Cross-change:** as três operações de Participants (`CreateBettingAgent`/`ListBettingAgents`/`GetBettingAgent`, plano 01 INC-01) também consomem `hasPermission`, mas são implementadas na change separada `implement-participant-registration-mvp`, reconciliada para isso — ver dependência de ordem no `design.md` de `establish-authoritative-role-permissions` (D8).

## Web

Substituir `apps/web/src/modules/configuracoes/lib/permissions.ts` (matriz fabricada de 4 perfis fictícios) por uma leitura real de `GET /api/access-control/role-permissions`, exibindo apenas os 3 papéis reais (`OWNER/ADMIN/USER`). Tela somente leitura nesta fase — sem toggles editáveis, já que não há UI de edição de permissões no MVP. Seguir a ordem de tasks recomendada por `frontend-module-workflow` quando a spec for gerada.

## Segurança, tenancy e auditoria

- Checagem de permissão é sempre server-side; o Web nunca decide autorização, apenas espelha o catálogo para experiência.
- Catálogo não varia por Banca — nenhuma superfície de tenant a proteger nesta fase (mapeamento é global ao sistema, não por tenant).
- Auditoria de mudanças no catálogo não se aplica nesta fase (catálogo é código-fonte, versionado por git/deploy, não por ação de usuário em runtime).

## Testes e critérios de aceitação

- `OWNER` sempre autorizado para qualquer `PermissionKey` existente.
- `ADMIN`/`USER` autorizados exatamente conforme o `RolePermissionMap` definido, negados fora dele.
- Endpoint de leitura da matriz retorna os 3 papéis reais, nunca os 4 perfis fictícios do protótipo; `USER` recebe `FORBIDDEN` ao tentar lê-lo.
- `GET /api/access-control/me/permissions` retorna somente as permissões do próprio papel, para os três papéis.
- `ToggleAccountStatusUseCase` e `AdminResetPasswordUseCase` recusam a ação quando a permissão correspondente é negada, mesmo com papel tecnicamente compatível com a checagem antiga; e continuam recusando `ADMIN` contra alvo `OWNER` pela invariante contextual, mesmo com a permissão concedida — prova de enforcement real, não apenas leitura decorativa, e de que a fonte única não elimina as invariantes contextuais.
- Ausência de qualquer toggle editável de permissão na tela nesta fase (evita sugerir capacidade que não existe).
- Nenhuma chave do catálogo (das 9 enumeradas) fica sem um consumidor real que a chame via `hasPermission`.

## Skills e workflow por fase

- **Planejamento (esta execução):** `plan-spec-roadmap`.
- **Proposta/spec:** `openspec-propose` já executada por exceção (ver Nota de estado); a change `establish-authoritative-role-permissions` existe, foi revisada duas vezes e está validada.
- **Implementação futura do grupo Backend/domínio:** `module-value-object` (`PermissionKey`), `module-domain-service` ou `module-use-case` conforme desenho final, `backend-controller`.
- **Implementação/revisão futura do grupo Web:** `frontend-module-workflow` (fonte de restrições de organização, não executada agora) para a tela somente leitura de "Perfis de Acesso".

## Riscos e hipóteses

- D44 ampla permanece aberta: o catálogo cobre hoje só Identity + Participants + leitura do próprio Access Control (9 chaves); capacidades futuras do roadmap mestre precisarão registrar suas próprias `PermissionKey`s quando suas specs avançarem.
- **Risco de dependência entre changes:** 3 das 9 `PermissionKey`s (`participants.betting-agents.*`) são consumidas por `implement-participant-registration-mvp`, uma change separada e ainda não implementada. Se essa change for implementada antes de `establish-authoritative-role-permissions` sem observar a dependência de ordem registrada em ambas, há risco de reintrodução de checagem de papel bruto como atalho temporário — mitigado registrando o bloqueio explicitamente nas tasks de ambas as changes (ver D8 do `design.md`).
- Enforcement real cobre hoje 2 casos de uso de Identity (`ToggleAccountStatus`, `AdminResetPassword`) e, quando a change de Participants for aplicada, mais 3 — suficiente para não repetir o erro do protótipo (catálogo decorativo), mas ainda restrito a essas duas capacidades.
- Se o INC-05 (perfis personalizados) avançar no futuro, a arquitetura em código-fonte do catálogo (sem tabela) precisará ser revisitada para suportar seleção dinâmica por Banca.

## Definition of Ready

> **Nota:** os dois itens abaixo permanecem marcados como não atingidos porque descrevem o gate formal deste plano, avaliado *antes* da criação da change. A change `establish-authoritative-role-permissions` foi criada, revisada duas vezes e validada mesmo assim, por pedido explícito do usuário — uma exceção registrada, não uma reinterpretação retroativa do gate. D44 está `DECIDED` apenas para o recorte inicial (ver Nota de estado e tabela de Decisões); a versão ampla de D44 é o que mantém este item como não atingido no sentido estrito do plano.

- [x] Objetivo, escopo, atores e dependências definidos
- [x] Increments verticais, changes e capability specs mapeados
- [ ] Exatamente um incremento selecionado como `READY_FOR_SPEC` — **não atingido no gate formal**: INC-04 avançou para `SPEC_PROPOSED` por exceção, não por ter satisfeito este critério; INC-05 sem necessidade de negócio aprovada
- [ ] Nenhuma decisão `CRITICAL/OPEN` — **não atingido no gate formal**: D44 ampla (cobertura de todas as capacidades do roadmap) permanece `OPEN`; apenas o recorte inicial usado pela change está `DECIDED`
- [x] Regras, falhas e critérios de aceitação verificáveis, dentro do que já é decidível
- [x] Aspectos técnicos e não funcionais definidos ou não aplicáveis
- [x] Diagrama atualizado

## Definition of Done

- [x] Implementação e desvios rastreados (43/43 tasks da change, seções 1–11 de `tasks.md`, incluindo 6 rodadas de revisão arquitetural)
- [x] Testes e evidências vinculados aos critérios (identity 199/199; access-control 22/22; backend unit 87/87; backend e2e real 79/79; web 177/177; `openspec validate --strict` em ambas as changes)
- [x] Plano, spec, código e documentação reconciliados (este plano, `openspec/specs/authoritative-permission-catalog|route-protection-backend|route-protection-frontend` sincronizados, diagrama atualizado)
- [x] Revisão e arquivamento autorizados (change arquivada em `openspec/changes/archive/2026-07-19-establish-authoritative-role-permissions`)

## Conflitos e descobertas posteriores

- `apps/web/src/modules/configuracoes/lib/permissions.ts` já documenta, em comentário próprio, que sua matriz é apenas dado de amostra e que uma capability de backend real de permissões estaria fora do escopo até então — este plano é exatamente essa capability, agora formalizada.
- Divergência interna do protótipo entre `PERM_MODS` (lista exibida) e `mods` (lista usada em `buildDefaultPerms()`) não é regra de negócio a preservar; é bug/inconsistência do mock, irrelevante para o catálogo real definido aqui.

## Histórico de transições

| Data | De | Para | Evidência | Motivo |
|---|---|---|---|---|
| 2026-07-18 | baseline desconhecido | DISCOVERY | prompt `.docs/prompts/12-plan-identity-profile-user-access-management.md`, pesquisa de specs/código | início do planejamento desta capacidade |
| 2026-07-18 | DISCOVERY | DECISIONS_PENDING | D41–D43 decididas; D44 registrada como `CRITICAL/OPEN` por depender de capacidades ainda não modeladas no roadmap mestre | nenhum incremento pode ser `READY_FOR_SPEC` enquanto D44 permanecer aberta |
| 2026-07-18 | DECISIONS_PENDING | DECISIONS_PENDING (sem alteração de estado) | prompt `.docs/prompts/17-establish-authoritative-role-permissions.md` gerado para INC-04 por pedido explícito do usuário, apesar de D44 seguir `OPEN` e o gate `READY_FOR_SPEC` não estar atingido | exceção registrada a pedido do usuário; o prompt restringe o escopo do catálogo inicial a Identity (plano 08) e Participants (plano 01) e trata D44 como decisão a resolver dentro dos limites da própria proposta, não como resposta completa à pergunta original de D44 |
| 2026-07-18 | DECISIONS_PENDING | DECISIONS_PENDING (sem alteração de estado) | change `openspec/changes/establish-authoritative-role-permissions` criada (v1) via `openspec-propose`; `openspec validate --strict` OK | proposta/spec inicial gerada a partir do prompt; validação formal do OpenSpec confirmada |
| 2026-07-18 | DECISIONS_PENDING | DECISIONS_PENDING (sem alteração de estado) | revisão arquitetural externa apontou 4 bloqueios na v1 da change (D44 não enumerada de fato; dupla fonte de autorização entre papel bruto e permissão; contradição de visibilidade da matriz para USER; ciclo de dependência Identity↔Access Control) e 4 ajustes (tipagem/validação de `PermissionKey`, nomenclatura de `PermissionCatalog`/`RolePermissionMap` como política de domínio e não agregado, jornada Web de ocultação sem controle real para gatear, DTO não especificado) | proposal/design/specs/tasks revisados: tabela normativa de 8 `PermissionKey`s enumerada (Identity implementado + Participants `READY_FOR_SPEC`); `hasPermission` passa a ser fonte única de autorização por papel/ação, mantendo invariantes contextuais em Identity; endpoint dividido em `role-permissions` (OWNER/ADMIN) e `me/permissions` (qualquer autenticado); `AccountRoleType` migrado para `packages/shared` para eliminar o ciclo; `openspec validate --strict` reconfirmado após a revisão |
| 2026-07-19 | DECISIONS_PENDING | SPEC_PROPOSED (INC-04, por exceção) | segunda revisão arquitetural externa apontou que a v2 ainda violava a fonte única em 3 pontos concretos (endpoint da própria matriz autorizado por papel bruto; `AdminResetPasswordUseCase` com `PermissionKey` catalogada mas sem migração; as 3 operações de Participants catalogadas mas a change `implement-participant-registration-mvp` ainda mandando autorizar por papel bruto) e que este plano não havia sido reconciliado com os artefatos corrigidos | v3 da change: 9ª `PermissionKey` (`access-control.role-permissions.read`) adicionada para eliminar a exceção do próprio endpoint da matriz; `AdminResetPasswordUseCase` migrado junto com `ToggleAccountStatusUseCase`; `implement-participant-registration-mvp` (change separada, não implementada) reconciliada para consumir `hasPermission`, com dependência de ordem explícita registrada em ambas as changes (D8 do design.md); `parsePermissionKey`/`hasPermission` separados (fronteira vs. função total); DTOs de leitura passam a incluir `label`/`description`/`order`; este plano reconciliado integralmente (estado, D44, agregados→políticas de domínio, casos de uso, backend, testes, skills, riscos); `openspec validate --strict` reconfirmado em ambas as changes |
| 2026-07-19 | SPEC_PROPOSED (INC-04) | SPEC_PROPOSED (INC-04, implementação em andamento) | `/opsx:apply` executado: módulo `modules/access-control` implementado; `AccountRoleType` migrado para `packages/shared`; 5 casos de uso de Identity migrados para `hasPermission` via porta `PermissionChecker` injetada; dois endpoints no Backend; seção "Perfis de Acesso" implementada no Web (`configuracoes.page.tsx`) | primeira rodada de implementação real do INC-04, cobrindo os 5 grupos de tasks originais (shared, domínio, Backend, Identity, Web) |
| 2026-07-19 | SPEC_PROPOSED (INC-04, implementação em andamento) | SPEC_PROPOSED (INC-04, 3 rodadas de correção pós-implementação) | três revisões de código sucessivas encontraram e corrigiram, nesta ordem: (1) 3 chaves de autoatendimento sem enforcement real, catálogo com 3 fontes paralelas, `hasPermission` não injetado, cliente Web sem validação estrutural, e causa raiz de falhas e2e (`BANCA_HOST_SUFFIX` divergente entre `.env` local e specs); (2) contradição de que `/me/permissions` usaria `hasPermission` (na verdade só exige autenticação), e ausência de testes que exercitassem o caminho de negação das 3 permissões de autoatendimento (o `RealPermissionChecker` nunca as nega); (3) dois erros pontuais — "8" em vez de "9" chaves no design.md, e restauração incorreta de `BANCA_HOST_SUFFIX` quando o valor anterior era `undefined` (10 arquivos e2e afetados, incluindo 2 pré-existentes) | cada rodada corrigida com testes reconfirmados (identity, access-control, backend unit, backend e2e real, web) antes de prosseguir; nenhuma correção aceita sem verificação executável |
| 2026-07-19 | SPEC_PROPOSED (INC-04) | IMPLEMENTED (INC-04, arquivada) | `/opsx:archive` executado: `tasks.md` com 43/43 tasks concluídas; delta specs sincronizadas para `openspec/specs/authoritative-permission-catalog` (nova), `route-protection-backend` e `route-protection-frontend` (modificadas) via `openspec-sync-specs`; diagrama Excalidraw atualizado refletindo a arquitetura final; change movida para `openspec/changes/archive/2026-07-19-establish-authoritative-role-permissions` | implementação verificada (identity 199/199, access-control 22/22, backend unit 87/87, backend e2e real 79/79, web 177/177) e revisada seis vezes antes do arquivamento; `implement-participant-registration-mvp` permanece ativa, reconciliada mas não implementada — INC-04 desta capacidade está concluído, D44 ampla permanece `OPEN` para capacidades futuras |
