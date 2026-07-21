## Why

`/perfil` hoje exibe nome e e-mail simulados e não permite que o usuário autenticado atualize seus próprios dados de exibição. O plano de capacidade Identity (INC-01) exige tornar essa autogestão real, mantendo toda decisão de autorização no Backend.

## What Changes

- Estender a entidade `UserAccount` com `rename(newName: PersonName): Result<UserAccount>` e `updateEmail(newEmail: Email | null): Result<UserAccount>`, cada um retornando uma nova instância imutável via `rebuild` interno.
- Adicionar `UpdateOwnProfileUseCase`, que valida e persiste nome/e-mail do próprio ator autenticado, com concorrência otimista em duas proteções complementares: comparação explícita de `expectedVersion` contra a versão lida (janela entre o `GET` do cliente e a leitura do próprio caso de uso) e o compare-and-swap já existente no adapter Prisma (janela entre a leitura e a escrita do `PATCH`).
- Expor `PATCH /api/auth/me`, protegido por `JwtCookieAuthGuard`, com identidade do ator exclusivamente via `AuthContext`; corpo exige pelo menos um de `name`/`email` além do `version` obrigatório (corpo só com `version` é rejeitado); sucesso retorna `200 { success: true }` (confirmação mínima, sem projeção completa).
- Substituir os campos de nome/e-mail simulados da subseção "Informações" em `/perfil` por dados reais, com submissão ao novo endpoint; manter `username`/`role`/`banca` somente leitura; após sucesso, o Web refaz `GET /api/auth/me` (via `refreshCurrentUser()` de um novo `CurrentUserProvider` no layout privado) para sincronizar `/perfil` e o shell/navbar a partir da mesma fonte; cobrir loading, erro, sucesso, conflito de versão e acessibilidade.

## Capabilities

### New Capabilities
- `self-profile-management`: consulta e atualização do próprio nome/e-mail pelo titular autenticado de um `UserAccount`, com concorrência otimista via `version` e sem revogação de sessão.

### Modified Capabilities
- `authenticated-user-context`: `GET /api/auth/me` passa a incluir `version` na resposta. A spec vigente afirma hoje que a resposta "SHALL NOT conter... versão"; esta change relaxa exclusivamente essa restrição porque a edição de perfil (D-técnica registrada em design.md) exige que o Web conheça o `version` corrente para submeter `PATCH /api/auth/me` com concorrência otimista real. Nenhum outro campo hoje vedado (credential, hash, contadores, bloqueios, timestamps internos, status operacional) passa a ser exposto.

## Impact

- **Domínio:** `modules/identity` — entidade `UserAccount` (novos métodos), novo `UpdateOwnProfileUseCase`, e `CONCURRENCY_CONFLICT` promovido para `IDENTITY_ERRORS` (público do domínio, substituindo o hoje Backend-local `IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT`).
- **Backend:** novo endpoint `PATCH /api/auth/me` no controller de Identity; reaproveita `JwtCookieAuthGuard`, `AuthContext`, `UserAccountRepository` (o CAS já é transacionado internamente pelo próprio repository — fluxo de persistência única, sem necessidade de `TransactionManager` explícito); `GetAuthenticatedUserContextUseCase`/`AuthenticatedUserContextDto` ganham `version`; adapter Prisma e controller passam a referenciar `IDENTITY_ERRORS.CONCURRENCY_CONFLICT`.
- **Web:** tela `/perfil` (módulo de perfil) — formulário de edição de nome/e-mail, tratamento de conflito de versão; novo `CurrentUserProvider` (Context) no layout privado (`apps/web/src/app/(private)/layout.tsx`), substituindo o fetch independente de `useCurrentUser()` por estado compartilhado entre `/perfil` e o shell/navbar.
- **Persistência:** nenhuma nova tabela ou coluna; `name`/`email`/`version` já existem no schema `UserAccount`.
- **Fora de escopo:** INC-02 (`enable-tenant-user-administration`) e INC-03 (`manage-tenant-user-access`) do mesmo plano de capacidade — administração de contas de terceiros, criação de conta, papel e ciclo de vida não fazem parte desta change.

## Conflitos conhecidos

- `openspec/specs/authenticated-user-context/spec.md`, requirement "Context response is an explicit read projection", afirma que a resposta de `GET /api/auth/me` `SHALL NOT` conter `versão`. O plano de capacidade (08) assumiu esse endpoint como suficiente para a jornada de edição sem detalhar como o Web obteria o `version` necessário para CAS. Resolução adotada aqui: MODIFICAR essa capability spec para permitir `version`, mantendo vedados todos os demais campos internos já proibidos. Ver design.md § Decisions para alternativas consideradas e rejeitadas.
