## Context

`/perfil` hoje exibe nome/e-mail simulados (mock estático no Web). O agregado `UserAccount` (`modules/identity/src/user-account/user-account.entity.ts`) já expõe `name`, `email` e `version` (CAS otimista) como props, mas não tem métodos de mutação para nome/e-mail — só `changePassword`, `activate`/`deactivate`/`block`/`unblock`, `recordLoginFailure`/`resetLoginFailures`. `GET /api/auth/me` (`GetAuthenticatedUserContextUseCase` + `AuthenticatedUserContextDto`) já lê e projeta a conta do próprio ator autenticado, mas sua spec vigente (`authenticated-user-context`) proíbe explicitamente expor `version` na resposta. A persistência (`UserAccountRepositoryPrisma.save`) já implementa CAS via `updateMany({ where: { id, version: account.version }, data: { ..., version: { increment: 1 } } })`, retornando `IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT` (já mapeado para `409` no controller) quando `updated.count === 0`.

## Goals / Non-Goals

**Goals:**
- Permitir que o próprio titular autenticado atualize `name`/`email` com concorrência otimista real (proteção contra "carreguei a tela, outro processo mudou, salvei por cima").
- Reaproveitar integralmente a infraestrutura de CAS já implementada no adapter Prisma, sem duplicar lógica de incremento de versão no domínio ou no caso de uso.
- Manter o endpoint `PATCH /api/auth/me` simétrico ao padrão já usado por `PATCH /api/auth/password` (guard, `AuthContext`, sem `bancaId`/`userId` vindos do cliente).

**Non-Goals:**
- Não introduzir revogação de sessão nesta mudança — `rename`/`updateEmail` não alteram claims do token.
- Não tratar `username`, `role` ou qualquer dado de terceiro — está fora do agregado tratado por este incremento (INC-02/INC-03).
- Não introduzir um endpoint de leitura dedicado só para obter `version` — ver Decisão 2.

## Decisions

### Decisão 1 — Novos métodos de entidade em vez de um único `updateProfile`
`UserAccount.rename(newName: PersonName): Result<UserAccount>` e `UserAccount.updateEmail(newEmail: Email | null): Result<UserAccount>` como métodos separados, cada um usando `this.rebuild(...)` (padrão já estabelecido pela entidade — nunca `deepMerge`, que corrompe `Date`).
- **Alternativa considerada:** um único método `updateProfile({ name?, email? })`. Rejeitada porque mistura duas intenções de negócio distintas em uma assinatura, dificulta cenários de falha independentes (nome inválido vs. e-mail inválido) e diverge do estilo already-established de métodos de entidade granulares (`activate`/`deactivate`/`block`/`unblock` são todos unários).
- `newEmail: Email | null` preserva e-mail opcional (D-plano: "e-mail continua opcional").

### Decisão 2 — Expor `version` em `GET /api/auth/me` (MODIFICA `authenticated-user-context`)
O Web precisa do `version` corrente da conta para submeter `PATCH /api/auth/me` com CAS efetivo. A spec vigente proíbe expor `version` nessa resposta.
- **Alternativa A — endpoint de leitura dedicado só para edição de perfil (ex.: `GET /api/auth/me/edit-token` ou reaproveitar uma query própria do INC-01):** rejeitada. Duplicaria a mesma leitura de conta já feita por `GetAuthenticatedUserContextUseCase` só para expor um campo a mais; contradiz a diretriz de não fragmentar em artefatos por detalhe técnico (`change-decomposition`).
- **Alternativa B — CAS via header `ETag`/`If-Match` HTTP em vez de campo no corpo:** rejeitada por ora. Adicionaria uma convenção HTTP nova e não usada em nenhum outro endpoint deste módulo; o padrão estabelecido no repositório para concorrência é um campo de domínio (`version`) transportado meramente, não um mecanismo HTTP dedicado. Pode ser revisitado se mais endpoints precisarem do mesmo padrão.
- **Alternativa C (adotada) — adicionar `version: number` a `AuthenticatedUserContextDto`/`AuthenticatedUserAccountDto` e relaxar a cláusula "SHALL NOT conter... versão" da spec `authenticated-user-context`, mantendo vedados todos os demais campos internos (credential, hash, contadores de falha, bloqueios, timestamps internos, status operacional).** Menor mudança de contrato possível, reaproveita o endpoint e o caso de uso já existentes, e é consistente com o fato de `version` já ser um valor de domínio público (exposto pelo getter `UserAccount.version`), não um segredo de infraestrutura.

### Decisão 3 — Duas proteções complementares: comparação explícita no use case (janela de leitura) + CAS já existente no adapter (janela de escrita)
`UserAccount.rebuild(...)` é **privado** e não existe (nem deve existir) um setter público que substitua somente `version` — reconstruir a entidade "forçando" uma versão diferente da lida acoplaria o caso de uso aos props internos e não tem correspondente real na API atual. A decisão anterior deste documento ("forçar `version: expectedVersion` antes de `save`") não é implementável e está descartada.

O fluxo correto usa as duas janelas de concorrência como proteções distintas e complementares:

1. `UpdateOwnProfileUseCase` recebe `expectedVersion` (o `version` que o cliente leu em um `GET /api/auth/me` anterior) e `bancaId`/`userId`/`name?`/`email?`.
2. Lê a conta via `UserAccountRepository.findById`, obtendo o `version` **persistido no momento desta leitura**.
3. Compara `expectedVersion` com `account.version` explicitamente. Se forem diferentes, retorna imediatamente `IDENTITY_ERRORS.CONCURRENCY_CONFLICT` **sem aplicar `rename`/`updateEmail` e sem chamar `save`** — cobre a janela entre o `GET` do cliente e esta leitura do caso de uso.
4. Se forem iguais, aplica `rename`/`updateEmail` (que preservam o `version` lido via `rebuild`, sem alterá-lo) e chama `UserAccountRepository.save(...)` normalmente.
5. O CAS já implementado em `UserAccountRepositoryPrisma.save` (`UPDATE ... WHERE id = ? AND version = ?`, incrementando a versão) continua sendo a proteção da janela entre a leitura do `PATCH` (passo 2) e sua escrita persistida — cobre uma corrida que a comparação do passo 3 não alcança, pois ocorre depois dela.

As duas proteções não são redundantes: a comparação do passo 3 pega uma corrida que já terminou antes do caso de uso começar a ler (o cliente estava desatualizado); o CAS do passo 5 pega uma corrida que começa depois que o caso de uso já leu (duas requisições concorrentes dentro da mesma janela do `PATCH`). Removendo qualquer uma das duas, uma das corridas deixaria de ser detectada.

- **Alternativa considerada e descartada:** "forçar `version: expectedVersion`" via reconstrução manual da entidade — inviável (`rebuild` privado) e semanticamente incorreta (compararia o CAS do adapter contra o valor que o cliente acreditava ser o corrente, e não contra o valor efetivamente lido nesta requisição, invertendo o papel das duas janelas).
- **Código de erro — promovido de Backend-local para domínio público:** `IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT` (`apps/backend/src/modules/identity/identity.errors.local.ts`) existe hoje só no Backend, para uma condição que antes só ocorria dentro do adapter Prisma. Com o passo 3 acima, o **caso de uso** (em `modules/identity`, domínio) também precisa retornar esse código — um caso de uso do domínio não pode depender de um código definido em `apps/backend` (domínio não depende de Backend/infra). Resolução: adicionar `CONCURRENCY_CONFLICT: 'IDENTITY.CONCURRENCY_CONFLICT'` a `IDENTITY_ERRORS` (`modules/identity/src/shared/errors/identity.errors.ts`), preservando o mesmo valor de string já usado hoje (nenhuma quebra de mapeamento HTTP). O adapter Prisma (`UserAccountRepositoryPrisma.persist`) e o controller (`STATUS_BY_CODE`) passam a referenciar `IDENTITY_ERRORS.CONCURRENCY_CONFLICT`; `IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT` é removido por redundância — um único código público cobre as duas janelas.

### Decisão sobre o corpo do `PATCH /api/auth/me`
`UpdateOwnProfileDto` exige pelo menos um de `name`/`email` além do `version` obrigatório. Um corpo contendo somente `version` (sem `name` nem `email`) é rejeitado com erro de validação determinístico, sem chamar `rename`/`updateEmail`/`save` — evita uma escrita que só incrementaria a versão sem alterar nenhum dado real. A validação de "pelo menos um campo presente" vive no DTO (`class-validator`, ex.: `@ValidateIf`/regra customizada), antes de chegar ao caso de uso.

### Decisão 4 — Validação de entrada via DTO (`class-validator`) reaproveitando `PersonName`/`Email` do domínio
O `UpdateOwnProfileDto` no Backend valida forma básica (strings, `email` opcional/nullable, pelo menos um de `name`/`email` presente — ver "Decisão sobre o corpo do `PATCH /api/auth/me`" acima); a validação de domínio (regras de `PersonName`/`Email`) acontece nos VOs, construídos pelo `UpdateOwnProfileUseCase` a partir dos campos brutos do DTO antes de chamar `rename`/`updateEmail` — os métodos da entidade já recebem VOs válidos, seguindo o padrão já usado pelos demais DTOs de Identity (`dto/*.ts`).

### Decisão 5 — Fonte única de sincronização entre `/perfil` e o shell: `CurrentUserProvider` no layout privado (Web)
Hoje `useCurrentUser()` (`apps/web/src/shared/session/use-current-user.ts`) é chamado de forma independente pelo shell/navbar e por `/perfil`, cada instância fazendo seu próprio `GET /api/auth/me` no mount, sem nenhum estado compartilhado. Sem um mecanismo comum, salvar o perfil não teria como atualizar o navbar (árvore de componentes diferente) sem recarregar a página ou exigir novo login.

- **Contrato do `PATCH` adotado:** `PATCH /api/auth/me` bem-sucedido retorna `200 { success: true }` — confirmação mínima, sem projeção completa nem `version` incrementado localmente. Após sucesso, o Web sempre chama `refreshCurrentUser()`, que refaz `GET /api/auth/me` para obter o estado autoritativo (nome/e-mail atualizados e o novo `version` persistido).
- **Mecanismo adotado — `CurrentUserProvider` (React Context) no layout privado, não uma store singleton de módulo:** `apps/web/src/shared/session/current-user-provider.tsx` expõe um `CurrentUserProvider` que busca `GET /api/auth/me` uma vez ao montar e mantém `{ status, data, refresh }` em contexto. `apps/web/src/app/(private)/layout.tsx` passa a envolver `<AppFrame>` com `<CurrentUserProvider>`. `useCurrentUser()` (mesma assinatura pública já consumida por `app-navbar.tsx` e `perfil.page.tsx`: `{status:'loading'|'success'|'error', data?}`) passa a ler `useContext(CurrentUserContext)` em vez de fazer seu próprio fetch independente; ganha adicionalmente `refreshCurrentUser()` do mesmo contexto.
- **Por que Provider escopado ao layout privado em vez de store singleton de módulo:** o estado fica escopado à árvore de sessão (não sobrevive fora dela); reinicia naturalmente na troca de sessão, pois `PrivateLayout` remonta ao sair para `/login` e voltar a autenticar — sem estado residual entre logout/login que uma store de módulo (viva enquanto o bundle JS estiver carregado) poderia reter; simplifica SSR/hidratação porque o provider é um limite `'use client'` único e explícito, já alinhado ao padrão de `ThemeProvider` no mesmo layout.
- **Alternativa considerada e descartada:** store de módulo (singleton fora da árvore React) com `useSyncExternalStore`. Rejeitada nesta revisão — funciona, mas não escopa o estado à sessão nem reinicia automaticamente em logout/login; um Provider React já resolve isso sem custo adicional, usando exatamente o mesmo boundary de client component que o projeto já usa para tema.
- **Alternativa considerada:** o `PATCH` retornar a projeção completa atualizada e o Web aplicá-la diretamente sem novo `GET`. Rejeitada — duplicaria em dois lugares (resposta do `PATCH` e resposta do `GET`) a mesma forma de projeção; o padrão já estabelecido no repositório para `changePassword`/`mandatoryPasswordChange` é o `PATCH` devolver só uma confirmação mínima, deixando a leitura completa para o `GET` existente.
- Não fabricar localmente um `version` incrementado: o valor usado na próxima edição vem sempre do `refresh()` mais recente do provider.

## Risks / Trade-offs

- **[Risco] Relaxar `authenticated-user-context` para expor `version` amplia levemente a superfície pública do endpoint.** → Mitigação: `version` é um inteiro monotônico sem valor de negócio sensível (não é segredo, não permite enumeração, não vaza estado operacional); a spec modificada continua vedando explicitamente todos os demais campos internos.
- **[Risco] Dependência circular de leitura:** o Web precisa ter chamado `GET /api/auth/me` (com o `version` novo) antes do primeiro `PATCH`. → Mitigação: a tela `/perfil` já chama `GET /api/auth/me` no carregamento (jornada já descrita no plano); nenhuma chamada adicional é introduzida.
- **[Risco] Confusão entre "conflito de versão real" (edição concorrente) e "versão desatualizada por falha do cliente em recarregar".** → Mitigação: ambos os casos retornam o mesmo `409 IDENTITY.CONCURRENCY_CONFLICT`; o Web sempre recarrega e solicita nova tentativa (comportamento já especificado no plano), sem distinguir causa.
- **[Risco] Introduzir `CurrentUserProvider` (Decisão 5) toca o hook `useCurrentUser()` já consumido pelo shell/navbar hoje em produção.** → Mitigação: o provider preserva a mesma interface pública consumida pelos chamadores atuais (`status: 'loading' | 'success' | 'error'`); a mudança é aditiva (novo `refresh()` exposto pelo contexto) e não requer alterar `app-navbar.tsx` além de continuar consumindo `useCurrentUser()` normalmente.
- **[Risco] Promover `CONCURRENCY_CONFLICT` de `IDENTITY_LOCAL_ERRORS` (Backend) para `IDENTITY_ERRORS` (domínio) toca dois pontos existentes (adapter Prisma e controller).** → Mitigação: o valor de string permanece idêntico (`'IDENTITY.CONCURRENCY_CONFLICT'`), preservando o mapeamento HTTP `409` já testado; é uma renomeação de import, não uma mudança de comportamento.

## Migration Plan

- Nenhuma migração de schema (colunas já existem).
- Deploy do Backend antes do Web: o novo campo `version` em `GET /api/auth/me` é aditivo (clientes antigos que ignoram o campo continuam funcionando); o novo `PATCH /api/auth/me` é um endpoint novo, sem impacto em consumidores existentes.
- Rollback: reverter o deploy do Backend remove o endpoint novo e o campo `version` da resposta; nenhum dado migrado precisa ser revertido.

## Open Questions

Nenhuma pendente para o INC-01. Pendências de INC-02/INC-03 (ex.: ambiguidade sobre `changeUsername` sobre a própria conta do ator) permanecem registradas no plano de capacidade e fora do escopo desta change.
