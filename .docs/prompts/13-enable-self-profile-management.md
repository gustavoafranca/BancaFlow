# Prompt — Propor spec de `enable-self-profile-management`

## Missão

Produza uma proposta/spec completa somente para o incremento selecionado abaixo. Não implemente código e não execute a change.

## Incremento selecionado

- **ID:** `INC-01`
- **Área/trilha do plano:** `foundation`
- **Resultado vertical:** usuário autenticado consulta e atualiza nome/e-mail reais em `/perfil`, refletidos no shell/sessão sem exigir novo login.
- **Change:** `enable-self-profile-management`
- **Capability specs adicionadas/modificadas:** `self-profile-management` (ADDED)

## Fontes e precedência

1. Instruções locais: `CLAUDE.md` do repositório e das áreas `apps/backend`, `apps/web`, quando existirem.
2. Contexto do projeto: [.docs/plans/00-project-context.md](../plans/00-project-context.md)
3. Roadmap: [.docs/plans/00-bancaflow-mvp-roadmap.md](../plans/00-bancaflow-mvp-roadmap.md)
4. Plano `READY_FOR_SPEC` (fonte normativa deste incremento): [.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md](../plans/foundation/08-identity-profile-and-tenant-user-administration.md)
5. Diagrama: [.docs/diagrams/foundation/08-identity-profile-and-tenant-user-administration.excalidraw](../diagrams/foundation/08-identity-profile-and-tenant-user-administration.excalidraw)
6. Código/specs existentes relevantes: `openspec/specs/user-account-management/spec.md`, `openspec/specs/authenticated-user-context/spec.md`, `openspec/specs/session-management/spec.md`, módulo `apps/backend/src/modules/identity`, tela `/perfil` em `apps/web`.

Em caso de conflito, o plano `READY_FOR_SPEC` prevalece sobre código/specs existentes; qualquer divergência encontrada deve ser registrada em "Conflitos conhecidos", não resolvida silenciosamente.

## Objetivo e resultado esperado

Tornar `/perfil` funcional para autogestão: o próprio usuário autenticado consulta e atualiza nome e e-mail reais (hoje simulados), com o shell/sessão refletindo o novo nome imediatamente, sem exigir novo login. Toda regra de autorização é decidida e aplicada no Backend; o Web não inventa controle de acesso.

## Escopo

- Consulta de nome, username, e-mail e papel reais do próprio usuário autenticado, via `GET /api/auth/me` (endpoint já existente — não faz parte desta change, apenas é consumido).
- Atualização do próprio nome e/ou e-mail pelo titular autenticado, via novo caso de uso `UpdateOwnProfileUseCase` e endpoint `PATCH /api/auth/me`.
- Extensão da entidade `UserAccount` (agregado existente, sem recriação) com os métodos `rename(newName: PersonName): Result<void>` e `updateEmail(newEmail: Email | null): Result<void>`.
- E-mail permanece opcional (`null` é um valor válido).
- Substituição dos dados simulados da subseção "Informações" em `/perfil` por dados reais, com submissão real ao `PATCH /api/auth/me`.
- `username`, `role` e `banca` permanecem somente leitura em `/perfil` (comportamento atual da tela é preservado, não alterado por esta change).
- Concorrência otimista via `version` (coluna já existente) em `rename`/`updateEmail`: conflito retorna erro determinístico, sem sobrescrita silenciosa.

## Fora de escopo

- **INC-02** (`enable-tenant-user-administration`, permanece `DISCOVERY`): listagem, busca e criação de contas da própria Banca por OWNER/ADMIN, onboarding com senha temporária, tela **Usuários** de `/configuracoes`. Não detalhar nem implementar.
- **INC-03** (`manage-tenant-user-access`, permanece `DISCOVERY`): alteração de papel (ADMIN⇄USER), alteração de `username` de terceiro, ciclo de vida de contas (ativar/desativar/bloquear/desbloquear/reset de senha) por OWNER/ADMIN, revogação de sessão por troca de papel. Não detalhar nem implementar.
- Alteração do próprio `username` pelo titular (nunca é permitida, nem neste nem em incrementos futuros pela mesma rota).
- Alteração do próprio papel por qualquer ator.
- Criação/edição/remoção de `OWNER`; transferência de titularidade de Banca.
- Cadastro público, recuperação pública de senha por e-mail, MFA, convite por e-mail.
- Perfis/papéis personalizados (ver plano 09, INC-05).
- Exclusão definitiva de conta.
- Auditoria estruturada (trilha de ator/alvo/ação) — adiada (D37).
- Telefone e demais campos de `/perfil` sem lastro em `UserAccount` hoje (ex.: "Telefone" hardcoded, 2FA, sessões/atividade simuladas) — permanecem fora até capacidade própria decidir tratá-los; remover a aparência de edição nesses campos sem lastro real.

## Decisões preservadas e alternativas rejeitadas

Preservar integralmente, sem reabrir:

- **D30** (CRITICAL, DECIDED): três papéis fixos (`OWNER|ADMIN|USER`) atendem ao MVP; perfis personalizados ficam condicionados a decisão futura (plano 09, INC-05). Alternativa rejeitada: perfis personalizados já no MVP.
- **D34** (CRITICAL, DECIDED): nome e e-mail são editáveis pelo próprio titular; `username` só é alterável por OWNER/ADMIN sobre conta de terceiro, nunca pelo próprio usuário. Alternativas rejeitadas: tudo editável pelo próprio usuário; username imutável mesmo para admin.
- **D38** (CRITICAL, DECIDED): os "perfis" do protótipo (`Administrador`/`Operador`/`Cambista`/`Somente Leitura`) são exemplo visual sem valor de negócio aprovado; não modelar sistema em cima deles.

Estas decisões não pertencem exclusivamente ao INC-01, mas nenhuma delas é reaberta ou contestada por esta proposta.

## Atores, permissões e cenários

| Ator | Permissão neste incremento |
|---|---|
| OWNER | consulta e edita o próprio nome/e-mail |
| ADMIN | consulta e edita o próprio nome/e-mail |
| USER | consulta e edita o próprio nome/e-mail |

Não há diferenciação de papel para este incremento: qualquer ator autenticado só opera sobre a própria conta.

**Cenário de sucesso:**
1. Usuário autenticado abre `/perfil`.
2. Tela carrega nome/username/e-mail/papel reais via `GET /api/auth/me`.
3. Usuário entra em modo de edição, altera nome e/ou e-mail, salva.
4. Backend valida e persiste via `UpdateOwnProfileUseCase`; shell/sessão refletem o novo nome sem exigir novo login.

**Cenários de falha:**
- Requisição não autenticada → rejeitada pelo `JwtCookieAuthGuard` (padrão já existente).
- Dados inválidos (nome vazio/malformado, e-mail malformado) → erro de validação determinístico, sem persistir.
- Conflito de concorrência (`version` desatualizada) → erro específico; Web recarrega e solicita nova tentativa, sem sobrescrever silenciosamente.

## Regras, invariantes, falhas, concorrência e idempotência

- Nome e e-mail podem ser atualizados livremente pelo titular; e-mail continua opcional (`null` permitido).
- `version` (CAS otimista, já existente no schema `UserAccount`) é obrigatório em `rename`/`updateEmail`: conflito de concorrência retorna erro determinístico, sem sobrescrever silenciosamente.
- `rename`/`updateEmail` não revogam sessão (claims do token não mudam — diferente da troca de papel do INC-03, que não faz parte desta change).
- Nenhum novo Value Object é necessário além dos já existentes/a confirmar na spec (`PersonName`/`Email` — a spec detalha o VO exato reaproveitado em `@bancaflow/shared` ou equivalente).
- Nenhuma checagem de tenant cross-Banca aplicável aqui: a operação é sempre sobre a própria conta do ator autenticado (`actorId` implícito via `AuthContext`, sem `targetId` de terceiro).

## Entregas aplicáveis

### Negócio/domínio

- `UserAccount.rename(newName: PersonName): Result<void>`.
- `UserAccount.updateEmail(newEmail: Email | null): Result<void>`.
- `UpdateOwnProfileUseCase`: orquestra validação, checagem de `version` e persistência sobre a própria conta do ator autenticado. Leitura de retorno via DTO/projeção, nunca a entidade ou linhas Prisma, seguindo o padrão de `GetAuthenticatedUserContextUseCase`.

### Backend

- `PATCH /api/auth/me`: atualiza nome/e-mail do próprio ator. Exige `JwtCookieAuthGuard`; `bancaId`/identidade do ator exclusivamente do `AuthContext`; erros estáveis sem vazamento de Prisma.

### Web

- `/perfil`: substituir os campos de nome/e-mail simulados por dados reais com submissão real ao `PATCH /api/auth/me`; manter `username`/`role`/`banca` como somente leitura; remover a aparência de edição em campos sem lastro real (ex.: telefone); cobrir loading, erro, sucesso, conflito de versão e acessibilidade.

### Persistência, eventos e migração

- Nenhuma nova tabela; nenhuma mudança de schema esperada (`name`/`email` já são colunas simples).
- Nenhum evento publicado — nenhum consumidor externo identificado para mudança de perfil.

## Segurança, tenancy, auditoria e requisitos não funcionais

- `JwtCookieAuthGuard` obrigatório; identidade do ator exclusivamente do `AuthContext`, nunca do corpo da requisição.
- Operação restrita à própria conta do ator; não há alvo de terceiro neste incremento, logo não há checagem de tenant cross-Banca a implementar aqui (diferente do INC-02/INC-03).
- Auditoria estruturada explicitamente adiada (D37) — risco residual já registrado no plano, não introduzido por esta change.
- Nenhum log inclui senha, hash ou token.

## Testes e critérios de aceitação

- Atualização válida do próprio nome e/ou e-mail.
- Atualização inválida (nome vazio/malformado, e-mail malformado) é rejeitada sem persistir.
- Conflito de concorrência otimista (`version` desatualizada) retorna erro determinístico, sem sobrescrever.
- Requisição não autenticada é rejeitada.
- Web cobre loading, erro, sucesso, conflito de versão e acessibilidade em `/perfil`.
- Nenhum mock permanece no fluxo de "Informações" de `/perfil` após a entrega.

## Skills, ferramentas e convenções locais

- **Proposta/spec:** `openspec-propose`, exatamente para o INC-01.
- **Aplicação futura — Negócio/Backend:** `module-entity`, `module-use-case`, `module-repository`, `module-dto`, `backend-controller`, `backend-prisma-data`, conforme o contrato detalhado pela spec.
- **Aplicação futura — Web:** `frontend-module-workflow` (fonte de restrições de organização: contrato/tipos → shared → módulo/feature → rotas/navegação → testes) e `frontend-form-schema` para o formulário de perfil.
- **Skills condicionais ou ainda em construção:** nenhuma identificada para este incremento.

Não executar skills de aplicação durante a proposta/spec.

## Conflitos conhecidos

- Nenhum conflito de código/spec identificado para este incremento. `openspec/specs/user-account-management/spec.md` afirma hoje que contas nascem exclusivamente por `ProvisionBanca` — essa divergência é relevante para o INC-02 (fora de escopo aqui), não para o INC-01, que não cria nem altera a origem de contas.

## Saída solicitada

Crie os artefatos de proposta/spec exigidos pelo workflow OpenSpec local (`openspec-propose`), incluindo design, requisitos/cenários e tarefas, para a change `enable-self-profile-management`. Mantenha rastreabilidade com as fontes listadas acima, destaque bloqueios encontrados e não implemente código nem execute a change.
