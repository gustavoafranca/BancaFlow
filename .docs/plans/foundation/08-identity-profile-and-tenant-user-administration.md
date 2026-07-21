# Plano 08 — Identity: autogestão de perfil e administração de usuários da Banca

## Identificação e estado

- **Capacidade:** estender `UserAccount` (Identity) para permitir que o próprio usuário mantenha seus dados de exibição e que OWNER/ADMIN administrem o ciclo de vida e o papel de contas da própria Banca, substituindo os dados simulados de `/perfil` e da subseção **Usuários** de `/configuracoes`.
- **Área/trilha:** `foundation`
- **Bounded context:** Identity
- **Estado:** `SPEC_PROPOSED`
- **Nota de estado:** o rótulo do plano reflete o incremento mais avançado (INC-01, agora `SPEC_PROPOSED`); INC-02 e INC-03 permanecem `DISCOVERY` (ver tabela de increments)
- **Roadmap:** [Plano mestre](../00-bancaflow-mvp-roadmap.md)
- **Contexto:** [Contexto do projeto](../00-project-context.md)
- **Prompt:** [13-enable-self-profile-management.md](../../prompts/13-enable-self-profile-management.md) (INC-01)
- **Change/spec:** [openspec/changes/enable-self-profile-management](../../../openspec/changes/enable-self-profile-management/) (proposal, design, specs, tasks — todos completos e válidos via `openspec validate`)
- **Diagrama:** [Identity — perfil e administração](../../diagrams/foundation/08-identity-profile-and-tenant-user-administration.excalidraw)
- **Atualizado em:** 2026-07-18

## Objetivo e valor

Tornar funcionais `/perfil` (autogestão) e a subseção **Usuários** de `/configuracoes` (administração), hoje inteiramente simulados, sem inventar autorização no Web: toda regra de quem pode editar o quê é decidida e aplicada no Backend. A capacidade estende o agregado `UserAccount` já existente em Identity — não cria um novo bounded context — porque perfil, criação de conta adicional, ciclo de vida e papel pertencem ao mesmo dono duradouro (Identity) e ao mesmo agregado.

## Dependências

- **Tenancy:** `bancaId` resolvido pelo contexto autenticado (`banca-context-resolution`); nenhuma operação aceita `bancaId` do cliente.
- **Identity (já implementado):** `UserAccount`, `AccountRole`, `AccountStatus`, `JwtCookieAuthGuard`, `AuthContext`, sessões (`SessionRepository`), casos de uso existentes (`CreateUserAccountUseCase`, `ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`, `ChangePasswordUseCase`, `GetAuthenticatedUserContextUseCase`).
- **Provision Banca:** único caminho hoje de criação de conta; a spec vigente de `user-account-management` precisa de modificação explícita de contrato para admitir criação pós-provisionamento (não é apenas uma tela).
- **Access Control (plano 09):** este plano não depende do catálogo de permissões para operar (autorização aqui usa somente `AccountRole`), mas os increments futuros que exibirem "permissões" em `/configuracoes → Perfis de Acesso" dependem do plano 09.
- **Web:** `frontend-module-workflow` como fonte de restrições de organização (contrato/tipos → shared → módulo/feature → rotas/navegação → testes); `frontend-form-schema` para os formulários de perfil/usuário.

## Decomposição em increments e changes

Cada incremento é vertical: domínio, Backend, Web, testes e documentação aplicáveis juntos. Não criar changes por camada técnica.

| Incremento | Resultado vertical | Escopo principal | Dependências | Change candidata | Estado |
|---|---|---|---|---|---|
| INC-01 | Usuário autenticado consulta e atualiza nome/e-mail reais em `/perfil`, refletidos no shell/sessão | `UserAccount.rename`/`updateEmail`; `UpdateOwnProfileUseCase`; `PATCH /api/auth/me`; substituição dos dados simulados de "Informações" em `/perfil` | contexto autenticado existente (`GET /api/auth/me`) | `enable-self-profile-management` | `SPEC_PROPOSED` |
| INC-02 | OWNER/ADMIN lista, pesquisa e cria contas da própria Banca com onboarding seguro e papel permitido (ADMIN ou USER) | `CreateUserAccountUseCase` exposto por endpoint administrativo; `ListTenantUserAccountsQuery`; senha temporária única + `mustChangePassword`; tela **Usuários** funcional | Identity, Tenancy, D30–D33, D40 decididas | `enable-tenant-user-administration` | `DISCOVERY` |
| INC-03 | OWNER/ADMIN altera papel (ADMIN⇄USER) e ciclo de vida (ativar/desativar/bloquear/desbloquear/reset de senha) de contas existentes, com autoproteção e revogação de sessão | `ChangeAccountRoleUseCase`; reforço de autoproteção em `deactivate`/`block`; revogação de sessão do alvo na troca de papel; UI de gestão de usuário existente | INC-02 arquivado; D31, D32, D35, D36, D39 decididas | `manage-tenant-user-access` | `DISCOVERY` |

INC-02 e INC-03 têm todas as decisões críticas necessárias já `DECIDED` (ver seção Decisões), mas ainda não tiveram o detalhamento completo de casos de uso, erros e critérios de aceitação exigido pela Definition of Ready — permanecem `DISCOVERY` até esse detalhamento ser concluído em uma iteração futura deste plano, não por decisão pendente.

## Mapa de capability specs por incremento

| Incremento | Capability specs | Operação esperada |
|---|---|---|
| INC-01 | `self-profile-management` | ADDED |
| INC-02 | `tenant-user-provisioning`, `user-account-management` | ADDED; MODIFIED (substitui a afirmação de que contas só nascem via `ProvisionBanca`) |
| INC-03 | `tenant-user-lifecycle-management`, `session-management` | ADDED; MODIFIED (nova regra de revogação por troca de papel) |

O próximo prompt de spec deve selecionar exatamente o INC-01. INC-02 e INC-03 são obrigatoriamente fora de escopo até concluírem seu detalhamento e passarem por revisão de readiness própria.

## Escopo

- consulta e atualização de nome e e-mail do próprio usuário autenticado;
- listagem, busca e consulta de contas `UserAccount` da própria Banca por OWNER/ADMIN;
- criação de conta adicional (papel `ADMIN` ou `USER`) por OWNER/ADMIN, com onboarding por senha temporária;
- alteração de papel entre `ADMIN` e `USER` por OWNER/ADMIN, nunca envolvendo `OWNER`;
- ativação, desativação, bloqueio, desbloqueio e reset de senha de contas existentes (já implementados; expostos/reaproveitados pela tela real);
- alteração de `username` de conta de terceiro por OWNER/ADMIN.

## Fora de escopo

- criação/edição/remoção de `OWNER`; transferência de titularidade de Banca;
- cadastro público, recuperação pública de senha por e-mail, MFA;
- convite por e-mail (sem infraestrutura de envio hoje);
- perfis/papéis personalizados (ver plano 09, INC-05);
- exclusão definitiva de conta;
- edição do próprio papel por qualquer ator;
- auditoria estruturada (trilha de ator/alvo/ação) — adiada, ver D37;
- telefone e demais campos de perfil sem lastro em `UserAccount` hoje (ex.: "Telefone" hardcoded em `/perfil`, 2FA, sessões/atividade simuladas em `/perfil`) permanecem fora até capacidade própria decidir tratá-los.

## Atores e permissões

| Ator | Permissão |
|---|---|
| OWNER | consulta/edita o próprio perfil (nome/e-mail); lista, cria, edita username, altera papel (ADMIN⇄USER), ativa/desativa/bloqueia/desbloqueia/reseta senha de ADMIN e USER da própria Banca |
| ADMIN | consulta/edita o próprio perfil (nome/e-mail); lista, cria, edita username, altera papel (ADMIN⇄USER), ativa/desativa/bloqueia/desbloqueia/reseta senha de outro ADMIN e de USER da própria Banca; nunca gerencia `OWNER` |
| USER | consulta/edita somente o próprio perfil (nome/e-mail); sem acesso às telas/endpoints administrativos de `/configuracoes → Usuários` |
| Qualquer ator | nunca altera o próprio papel; nunca desativa/bloqueia a própria conta (D36) |

O Backend autoriza; ocultar controles no Web (ex.: esconder o botão "Editar papel" para USER) é experiência, não segurança.

## Jornadas

**INC-01 — Autogestão:**
1. Usuário autenticado abre `/perfil`.
2. Tela carrega nome/username/e-mail/papel reais via `GET /api/auth/me` (já existente).
3. Usuário entra em modo de edição, altera nome e/ou e-mail, salva.
4. Backend valida e persiste via `UpdateOwnProfileUseCase`; shell/sessão refletem o novo nome sem exigir novo login.
5. Conflito de concorrência (`version` desatualizada) retorna erro específico; Web recarrega e pede nova tentativa.

**INC-02 — Criação de usuário (para detalhamento futuro):** OWNER/ADMIN abre **Usuários**, pesquisa/lista, aciona "Adicionar Usuário", informa nome/username/e-mail opcional/papel (ADMIN ou USER); sistema valida unicidade de username por Banca, cria conta com senha temporária, exibe a senha uma única vez ao criador.

**INC-03 — Gestão de ciclo de vida e papel (para detalhamento futuro):** OWNER/ADMIN seleciona uma conta existente e altera papel, status ou username; sistema valida autoproteção e regras de OWNER, revoga sessões quando aplicável, atualiza a lista.

## Glossário e linguagem ubíqua

- **UserAccount:** acesso ao SaaS; não é `Party`/`BettingAgent` (reforçado do plano 01).
- **Perfil (self-service):** dados de exibição que o próprio titular da conta mantém.
- **Administração de usuários:** operações que OWNER/ADMIN executam sobre contas de terceiros da mesma Banca.
- **Onboarding:** processo de entrega de acesso inicial a uma conta recém-criada.
- **Autoproteção:** regra que impede um ator de enfraquecer a própria autoridade/acesso.

## Decisões

| ID | Criticidade | Status | Decisão/pergunta | Alternativas | Evidência/decisor | Impacto |
|---|---|---|---|---|---|---|
| D30 | CRITICAL | DECIDED | Os três papéis fixos (`OWNER\|ADMIN\|USER`) atendem ao MVP; perfis personalizados ficam condicionados a necessidade de negócio aprovada (plano 09, INC-05) | perfis personalizados já no MVP — rejeitada | usuário/produto, bloco de decisão 2026-07-18 | escopo e complexidade do modelo de acesso |
| D31 | CRITICAL | DECIDED | Existe exatamente um `OWNER` por Banca; sem múltiplos OWNERs; transferência de titularidade é jornada futura fora deste plano | múltiplos OWNERs livres — rejeitada; múltiplos OWNERs sem invariante de mínimo — rejeitada | usuário/produto | ninguém pode ser promovido/rebaixado de/para `OWNER` fora do provisionamento inicial (D39) |
| D32 | CRITICAL | DECIDED | ADMIN cria e gerencia outro ADMIN e USER; nunca cria, promove a, ou gerencia `OWNER` | ADMIN restrito a gerenciar somente USER — rejeitada | usuário/produto | delegação administrativa e limite de autoridade |
| D33 | CRITICAL | DECIDED | Onboarding usa senha temporária única gerada pelo backend + `mustChangePassword=true`, reaproveitando o padrão já implementado em `AdminResetPasswordUseCase`; sem convite por e-mail | convite por e-mail — rejeitada (sem infraestrutura de envio hoje) | usuário/produto | zero infraestrutura nova; consistência com fluxo de reset já revisado |
| D34 | CRITICAL | DECIDED | Nome e e-mail são editáveis pelo próprio titular; `username` só é alterável por OWNER/ADMIN, nunca pelo próprio usuário | tudo editável pelo próprio usuário — rejeitada; username imutável mesmo para admin — rejeitada | usuário/produto | superfície de autoelevação/erro reduzida; username continua estável como identificador de login salvo ação administrativa deliberada |
| D35 | CRITICAL | DECIDED | Alterar o papel de uma conta sempre revoga todas as sessões ativas do alvo, na mesma transação, forçando novo login com claims atualizadas | não revogar e aceitar janela de inconsistência — rejeitada | usuário/produto | consistente com o padrão já usado em `ToggleAccountStatus`/`AdminResetPassword` |
| D36 | CRITICAL | DECIDED | Nenhum ator desativa ou bloqueia a própria conta, independentemente do papel (autoproteção incondicional) | autoproteção restrita a OWNER (comportamento atual da entidade) — rejeitada | usuário/produto | evita perda operacional acidental de acesso administrativo por qualquer papel, não só OWNER |
| D37 | IMPORTANT | DECIDED | Auditoria estruturada (ator/alvo/ação/banca/data) de mutações administrativas é adiada para capacidade futura; estes increments não vão além dos logs técnicos já existentes | auditar já neste conjunto de increments — rejeitada | usuário/produto | risco aceito: sem trilha de auditoria de negócio até incremento futuro dedicado; registrar como risco (ver Riscos e hipóteses) |
| D38 | CRITICAL | DECIDED | Os perfis do protótipo (`Administrador`, `Operador`, `Cambista`, `Somente Leitura` em `configuracoes.sample.ts`/`permissions.ts`) são exemplo visual sem valor de negócio aprovado; não modelar sistema em cima deles. `Cambista` não ganha `UserAccount`/login neste MVP | tratá-los como requisito real — rejeitada (contradiria specs vigentes de que `BettingAgent` não tem login) | usuário/produto | remove ambiguidade entre `AccountRole` real e os "perfis" visuais do mock; nenhum dos dois planos desta demanda modela os 4 perfis do protótipo |
| D39 | IMPORTANT | DECIDED (delegada) | `ChangeAccountRoleUseCase` (INC-03) transiciona somente `ADMIN ⇄ USER`; atribuir ou retirar `OWNER` não é uma operação suportada fora do provisionamento inicial | permitir transição envolvendo OWNER neste use case — rejeitada | decisão técnica delegada, consequência direta de D31 | simplifica o caso de uso e elimina a necessidade de proteção de "último OWNER" nesta troca — não existe transição que remova o único OWNER |
| D40 | IMPORTANT | DECIDED (delegada) | Alterar `username` de terceiro reaproveita a mesma unicidade `(bancaId, normalizedUsername)` já vigente; a troca por si só não revoga sessões do alvo (diferente de papel/senha), pois não altera claims do token | revogar sessão também na troca de username — rejeitada por ora | decisão técnica delegada | menor efeito colateral; login usa `username` apenas no momento da autenticação, não como claim do token ativo |

## Domínio e contexts

Identity permanece dono exclusivo de `UserAccount`, incluindo perfil, ciclo de vida e papel. Nenhum novo bounded context é criado; a extensão vive inteiramente dentro de `modules/identity`. Access Control (plano 09) é consumido, não incorporado — Identity não passa a possuir o catálogo de permissões.

## Agregados, entidades, VOs e serviços

`UserAccount` (agregado existente, estendido — não recriado):

- **Novos métodos de entidade:**
  - `rename(newName: PersonName): Result<void>` — INC-01.
  - `updateEmail(newEmail: Email | null): Result<void>` — INC-01.
  - `changeUsername(newUsername: Username, actorRole: AccountRole): Result<void>` — INC-03; falha se `actorRole` não for `OWNER`/`ADMIN`.
  - `changeRole(newRole: AccountRole, actorRole: AccountRole): Result<void>` — INC-03; falha determinística se `newRole === OWNER`, se `this.role === OWNER`, se `actorRole` não for `OWNER`/`ADMIN`, ou se o alvo for o próprio ator (ver invariantes).
- **Métodos existentes reaproveitados sem alteração de assinatura:** `activate`, `deactivate`, `block`, `unblock` — ganham apenas a checagem adicional de autoproteção incondicional (D36), hoje restrita a `OWNER`.
- Nenhum novo Value Object é necessário além dos já existentes (`Username`, `AccountRole`, `AccountStatus`); `PersonName`/`Email` já existem como conceitos de validação em `@bancaflow/shared` ou equivalente — a spec detalhará o VO exato reaproveitado.
- Nenhum serviço de domínio novo: as regras de autoproteção e de delegação pertencem à entidade e ao caso de uso, não a um serviço à parte.

## Invariantes, estados, concorrência e idempotência

- Nome e e-mail podem ser atualizados livremente pelo titular; e-mail continua opcional (`null` permitido).
- `username` só muda por ação de OWNER/ADMIN sobre conta de terceiro; nunca sobre a própria conta do ator (evita username trocado por autoelevação disfarçada de manutenção) — a decidir com detalhe formal no INC-03: se o próprio ator puder ter username corrigido por *outro* admin, isso é permitido; um ator nunca executa a operação de troca de username sobre si mesmo pela rota administrativa (ele usaria, se existisse, um fluxo próprio — fora de escopo).
- `changeRole` nunca resulta em `OWNER`; nunca parte de `OWNER`; nunca tem `actorId === targetId`.
- `deactivate`/`block`/`changeRole` nunca têm `actorId === targetId` (autoproteção incondicional, D36).
- Toda operação sobre conta de terceiro exige `target.bancaId === actor.bancaId`; violação retorna `FORBIDDEN` sem revelar existência cross-tenant (padrão já estabelecido em `ToggleAccountStatus`/`AdminResetPassword`).
- `version` (CAS otimista, já existente no schema) é obrigatório em `rename`/`updateEmail`/`changeUsername`/`changeRole`: conflito de concorrência retorna erro determinístico, sem sobrescrever silenciosamente.
- `changeRole` revoga (via `SessionRepository.revokeAll`) todas as sessões do alvo na mesma transação (D35); `rename`/`updateEmail`/`changeUsername` não revogam sessão (claims do token não mudam).
- `username` segue `UNIQUE(bancaId, normalizedUsername)` já vigente; corrida de troca para o mesmo valor produz um sucesso e um conflito determinístico.
- Criação de conta (INC-02) reaproveita `CreateUserAccountUseCase` existente sem alterar sua assinatura de domínio; muda apenas quem a invoca (novo endpoint administrativo) e a política de autorização do ator chamador.

## Casos de uso e falhas

| Caso | Resultado | Falhas |
|---|---|---|
| `UpdateOwnProfileUseCase` (INC-01) | atualiza nome e/ou e-mail do próprio ator autenticado | não autenticado, dados inválidos, conflito de versão |
| `CreateTenantUserAccountUseCase` (INC-02, wrapper de autorização sobre `CreateUserAccountUseCase`) | cria conta ADMIN ou USER na Banca do ator, com senha temporária | ator não OWNER/ADMIN, papel solicitado é `OWNER`, username duplicado, senha gerada fraca (retry interno) |
| `ListTenantUserAccountsUseCase` (INC-02) | página filtrada de contas da própria Banca | ator não OWNER/ADMIN, filtros inválidos |
| `ChangeAccountRoleUseCase` (INC-03) | transiciona papel entre ADMIN e USER, revogando sessões do alvo | ator não OWNER/ADMIN, alvo é OWNER, papel destino é OWNER, alvo é o próprio ator, alvo cross-tenant |
| `ChangeUsernameUseCase` (INC-03) | altera username de conta de terceiro | ator não OWNER/ADMIN, alvo é o próprio ator, username duplicado, alvo cross-tenant |

Leituras retornam DTOs/projeções, nunca a entidade ou linhas Prisma, seguindo o padrão de `GetAuthenticatedUserContextUseCase`.

## Portas e adapters

Portas reaproveitadas: `UserAccountRepository`, `SessionRepository`, `Clock`, `TransactionManager`, `AuthContext`. Nenhuma porta nova de infraestrutura é necessária — apenas novos métodos/consultas sobre o mesmo agregado. Adapters: Prisma (mesma tabela `UserAccount`), controller/módulo NestJS de Identity (novas rotas), módulo Web `perfil`/`configuracoes`.

## Eventos e integrações

Não publicar eventos apenas por usar DDD. Nenhum consumidor externo identificado ainda para mudanças de perfil/papel/username; se Access Control (plano 09) precisar reagir a mudança de papel para invalidar cache de permissões, isso será revisitado quando o plano 09 detalhar sua estratégia de leitura (hoje ele lê `role` diretamente do `AuthContext`, sem cache próprio).

## Persistência e migração

Nenhuma nova tabela. Possível migração para tornar `name`/`email` atualizáveis sem restrição adicional (já são colunas simples); nenhuma mudança de schema é esperada para INC-01. INC-02/INC-03 não introduzem colunas novas — reaproveitam `role`, `username`, `normalizedUsername`, `version` já existentes. Detalhes de migration/rollback ficam para a spec.

## Backend

Contratos candidatos:

- `PATCH /api/auth/me` — INC-01, atualiza nome/e-mail do próprio ator.
- `POST /api/accounts` — INC-02, cria conta na Banca do ator (papel ADMIN ou USER).
- `GET /api/accounts` — INC-02, lista/pesquisa contas da Banca do ator.
- `PATCH /api/accounts/:accountId/role` — INC-03.
- `PATCH /api/accounts/:accountId/username` — INC-03.

Todas exigem `JwtCookieAuthGuard`; autorização por papel dentro do caso de uso (mesmo padrão já usado em `ToggleAccountStatus`); `bancaId` exclusivamente do `AuthContext`; erros estáveis sem vazamento de Prisma.

## Web

`/perfil` (INC-01): substituir os campos de nome/e-mail simulados por dados reais com submissão real ao `PATCH /api/auth/me`; manter `username`/`role`/`banca` como somente leitura (já é o comportamento atual da tela); remover a aparência de edição em campos sem lastro real (ex.: telefone) até decisão própria; cobrir loading, erro, sucesso, conflito de versão e acessibilidade.

`/configuracoes → Usuários` (INC-02/INC-03, para detalhamento futuro): substituir `configuracoes.sample.ts` por integração real de listagem/criação/edição/papel/status; ocultar por experiência (não por segurança) ações que o papel do ator não deveria ver, mas sempre validando no Backend. Seguir a ordem de tasks recomendada por `frontend-module-workflow`: contrato/tipos → shared necessário → módulo/feature → rotas/navegação → testes.

## Segurança, tenancy e auditoria

- `bancaId` exclusivamente do `AuthContext`; toda query de conta de terceiro é tenant-scoped.
- Resposta indistinguível para conta de outra Banca (`FORBIDDEN` genérico, sem revelar existência).
- Autoproteção incondicional (D36) e proibição de autoelevação (`changeRole`/`changeUsername` nunca têm `actorId === targetId`, e `changeRole` nunca produz/parte de `OWNER`).
- Revogação de sessão do alvo na troca de papel (D35), na mesma transação.
- Armazenamento de senha reaproveita bcrypt já vigente; senha temporária exibida uma única vez (mesmo padrão de `AdminResetPassword`).
- Auditoria estruturada explicitamente adiada (D37) — risco residual registrado, não escondido.
- Nenhum log inclui senha, hash ou token.

## Testes e critérios de aceitação

- Atualização válida e inválida do próprio nome/e-mail (INC-01).
- Conflito de concorrência otimista retorna erro determinístico, sem sobrescrever (INC-01).
- OWNER/ADMIN criam conta com username único por Banca; colisão concorrente produz um sucesso e um conflito (INC-02).
- Mesmo username é permitido em Bancas diferentes (INC-02).
- Onboarding entrega senha temporária uma única vez, com `mustChangePassword=true` (INC-02).
- ADMIN não cria/gerencia `OWNER`; tentativa retorna `FORBIDDEN` (INC-02/INC-03).
- Nenhum ator altera o próprio papel, username ou desativa/bloqueia a própria conta (INC-03).
- Troca de papel revoga todas as sessões do alvo; sessão do ator que executou a troca permanece válida (INC-03).
- Tenant A não lista, consulta ou altera conta de tenant B (INC-02/INC-03).
- Endpoints recusam ação mesmo chamados diretamente, sem depender do botão estar visível no Web.
- Web cobre loading, vazio, erro, sucesso, conflito e acesso negado nas telas afetadas.
- Nenhum mock permanece nos fluxos efetivamente entregues por incremento.

## Skills e workflow por fase

- **Planejamento (esta execução):** `plan-spec-roadmap`.
- **Proposta/spec futura:** `openspec-propose`, exatamente para o INC-01 quando solicitado.
- **Implementação futura do grupo Backend/domínio:** `module-entity`, `module-use-case`, `module-repository`, `module-dto`, `backend-controller`, `backend-prisma-data` conforme o contrato do incremento.
- **Implementação/revisão futura do grupo Web:** `frontend-module-workflow` (já concluída e validada — usada aqui somente como fonte de restrições de organização: contrato/tipos → shared → módulo/feature → rotas/navegação → testes) e `frontend-form-schema` para os formulários de perfil/usuário. Nenhuma dessas skills é executada nesta etapa de planejamento.

## Riscos e hipóteses

- Auditoria adiada (D37) é um risco residual explícito: mudanças administrativas sensíveis (criação de conta, troca de papel, ativação/desativação) não deixam trilha de negócio até um incremento futuro dedicado — se um incidente exigir rastrear "quem fez o quê", essa lacuna deve ser resolvida antes, não depois.
- `changeUsername` sobre a própria conta do ator via fluxo administrativo foi deliberadamente deixado ambíguo (ver Invariantes) — a spec do INC-03 deve fechar esse detalhe antes de `READY_FOR_SPEC`.
- A spec vigente de `user-account-management` afirma hoje que contas nascem exclusivamente por `ProvisionBanca`; o INC-02 exige uma mudança de contrato explícita, não apenas uma nova tela — tratado como MODIFIED no mapa de capability specs, não como extensão silenciosa.
- Campos hoje simulados em `/perfil` sem lastro em `UserAccount` (telefone, 2FA, sessões/atividade "reais") ficam fora deste plano; se algum deles for aprovado como requisito real, exige nova decisão e possivelmente novo campo/agregado.

## Definition of Ready

- [x] Objetivo, escopo, atores e dependências definidos
- [x] Increments verticais, changes e capability specs mapeados
- [x] Exatamente um incremento (INC-01) selecionado como `READY_FOR_SPEC` para o próximo prompt
- [x] Nenhuma decisão `CRITICAL/OPEN` (D30–D40 todas `DECIDED`)
- [x] Regras, falhas e critérios de aceitação verificáveis para o INC-01
- [x] Aspectos técnicos e não funcionais do INC-01 definidos (concorrência via `version`, sem eventos, sem nova tabela)
- [x] Diagrama sincronizado
- [ ] INC-02 e INC-03 com detalhamento completo de casos de uso/erros/testes (pendente — mantém esses increments em `DISCOVERY`)

## Definition of Done

- [ ] Implementação e desvios rastreados
- [ ] Testes e evidências vinculados aos critérios
- [ ] Plano, spec, código e documentação reconciliados
- [ ] Revisão e arquivamento autorizados

## Conflitos e descobertas posteriores

- A spec `user-account-management` vigente afirma que contas nascem exclusivamente por `ProvisionBanca`; este plano registra a necessidade de MODIFICAR esse contrato no INC-02, não de contornar a regra silenciosamente.
- A proposta/spec do INC-01 (`enable-self-profile-management`) revelou que a spec vigente `authenticated-user-context` proíbe expor `version` em `GET /api/auth/me`, mas a concorrência otimista exigida por este plano depende do Web conhecer o `version` corrente antes de submeter `PATCH /api/auth/me`. Resolvido na proposta como MODIFICAÇÃO explícita de `authenticated-user-context` (adiciona `version`, mantém vedados os demais campos internos) — ver `openspec/changes/enable-self-profile-management/design.md`, Decisão 2.
- `permissions.ts`/`configuracoes.sample.ts` descrevem 4 "perfis" (Administrador/Operador/Cambista/Somente Leitura) sem relação codificada com `AccountRole`; D38 resolve isso como fora de escopo, mas a divergência textual entre `PERM_MODS` e a lista interna `mods` de `permissions.ts` (ex.: `taloes` presente em um array e ausente no outro) é uma inconsistência do próprio protótipo, não deste plano — sinalizada aqui para não ser confundida com regra de negócio aprovada.

## Histórico de transições

| Data | De | Para | Evidência | Motivo |
|---|---|---|---|---|
| 2026-07-18 | baseline desconhecido | DISCOVERY | prompt `.docs/prompts/12-plan-identity-profile-user-access-management.md`, pesquisa de código/specs | início do planejamento desta capacidade |
| 2026-07-18 | DISCOVERY | READY_FOR_SPEC (somente INC-01) | D30–D40 decididas em 3 blocos com o usuário; plano e diagrama completos para INC-01 | INC-01 apto a gerar prompt; INC-02/INC-03 seguem em `DISCOVERY` até detalhamento próprio |
| 2026-07-18 | READY_FOR_SPEC (INC-01) | SPEC_PROPOSED (INC-01) | change `openspec/changes/enable-self-profile-management` criada com proposal, design, specs (`self-profile-management` ADDED, `authenticated-user-context` MODIFIED) e tasks; `openspec validate enable-self-profile-management` OK | proposta/spec do INC-01 completa via `openspec-propose`; INC-02/INC-03 seguem em `DISCOVERY` |
