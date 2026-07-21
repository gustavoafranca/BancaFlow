# Prompt — OpenSpec: correção do harden-identity-authentication-mvp

Use este prompt para **atualizar a change existente** `harden-identity-authentication-mvp` (NÃO criar uma nova, NÃO arquivar) e depois reimplementar as tarefas afetadas. A change foi implementada, mas uma revisão encontrou divergências críticas entre a spec e o comportamento real.

## Como usar este arquivo

Fluxo recomendado:

1. `/opsx:update harden-identity-authentication-mvp` — forneça o conteúdo deste arquivo. Atualize `proposal.md`, `design.md`, as specs delta afetadas e reabra as tarefas em `tasks.md` (marque `[ ]` de novo nos itens listados na seção "Reabertura de tarefas"). **Esta etapa altera SOMENTE os artefatos OpenSpec (proposal/design/specs/tasks). Nenhum código-fonte (`modules/`, `apps/`, `packages/`) é modificado no `/opsx:update`.**
2. Revise os artefatos atualizados.
3. `/opsx:apply harden-identity-authentication-mvp` — **é aqui, e somente aqui, que o código-fonte é alterado.** Reimplemente as tarefas reabertas, na ordem de prioridade abaixo (dois P0 primeiro).
4. Só então reavalie o arquivamento.

Não crie a change do zero. Não use `/opsx:propose`. A change já existe em `openspec/changes/harden-identity-authentication-mvp/`.

## Princípio-guia inegociável

**OpenSpec `--strict` válido comprova apenas a estrutura dos documentos, NÃO que o código satisfaz os cenários.** Cada correção abaixo só está "feita" quando existir um **teste automatizado que exercita o cenário real da spec** (unitário com fakes, integração com banco real, ou e2e), e esse teste passar. Ajustar o texto da spec sem provar o comportamento é explicitamente insuficiente. Testes que "aceitam uma faixa" de resultado (ex.: contador entre 1 e 5) NÃO contam como prova — o critério da spec é exato.

Não deduza que uma tarefa está pronta porque o arquivo foi alterado. Compare **spec ↔ implementação ↔ persistência ↔ interface Web ↔ teste**.

## Contexto obrigatório de leitura

Antes de alterar qualquer coisa, leia:

- Todos os artefatos atuais de `openspec/changes/harden-identity-authentication-mvp/` (proposal, design, specs, tasks).
- `.docs/prompts/01-identity-module-spec.md` e `.docs/prompts/02-harden-identity-authentication-mvp.md` (decisões de negócio originais).
- `.docs/03-guia-arquitetura-identity-tenancy.excalidraw` (parecer arquitetural).
- O código realmente implementado nos arquivos referenciados em cada achado abaixo.

---

## Correções obrigatórias (em ordem de prioridade)

### P0-1 — Troca obrigatória de senha sem autorização de estado

**Sintoma:** qualquer usuário autenticado (mesmo `mustChangePassword=false`) consegue chamar `PATCH /api/auth/mandatory-password-change` e trocar a senha **sem informar a senha atual**, contornando o fluxo voluntário.

**Causa raiz:**
- `apps/backend/.../identity.controller.ts` — o handler `mandatoryPasswordChange` tem `@AllowPasswordChange()`.
- `apps/backend/.../guards/jwt-cookie-auth.guard.ts` — o decorator só **libera** quem tem a flag; a guarda só bloqueia quando `mustChangePassword && !allowPasswordChange`. Ela **nunca exige** que a flag seja `true`.
- `modules/identity/src/user-account/use-case/mandatory-password-change.use-case.ts` — o caso de uso carrega a conta mas **não verifica** `account.mustChangePassword`.

**Comportamento correto (spec `credential-management`, requirement "Mandatory password change flow after admin reset"):** o fluxo obrigatório SHALL ser autorizado por **estado autoritativo do servidor** — a conta persistida com `mustChangePassword === true`, não apenas a claim do token.

**Correção exigida:**
- No `MandatoryPasswordChangeUseCase`: após carregar a conta, se `account.mustChangePassword !== true`, retornar `Result.fail(IDENTITY_ERRORS.FORBIDDEN)` (ou código dedicado estável) **antes** de qualquer escrita. Essa é a verificação autoritativa (estado do banco, não do token).
- Opcionalmente reforçar no guard uma verificação positiva (a rota obrigatória exige `mustChangePassword === true`), mas a garantia autoritativa fica no caso de uso.
- **Teste:** a autorização é pela **flag, não pelo papel**. **Qualquer** conta com `mustChangePassword=false` — incluindo `OWNER` e `ADMIN`, não só `USER` — chamando o endpoint obrigatório recebe `403` e a senha NÃO muda (unitário no domínio + e2e no backend, cobrindo pelo menos um papel administrativo além de `USER`).

### P0-2 — Emissão de token fora da transação da troca de senha

**Sintoma:** `ChangePasswordUseCase` e `MandatoryPasswordChangeUseCase` confirmam hash + flag + revogação dentro de `runInTransactionResult` e retornam; só **depois** o controller emite o token (`reissueAccessToken`). Se a emissão falhar, a senha nova permanece gravada.

**Causa raiz:** `modules/identity/.../mandatory-password-change.use-case.ts` (transação fecha antes da emissão) + `identity.controller.ts` (emite após `unwrap`).

**Comportamento correto (spec `credential-management`, cenário "Rollback on token emission failure"; `design.md` decisão 3):** a emissão do novo access token SHALL fazer parte da operação atômica coordenada pelo caso de uso, dentro de `runInTransactionResult`. Se a emissão falhar, a troca de senha e a revogação SHALL ser revertidas.

**Correção exigida:**
- Injetar a port `AccessTokenIssuer` em `ChangePasswordUseCase` e `MandatoryPasswordChangeUseCase`.
- Emitir o token **dentro** do callback de `runInTransactionResult` (após save + revoke). Se a emissão falhar, retornar `Result.fail` → rollback.
- Incluir o token emitido (e expiração) no output do caso de uso. O controller passa a apenas **setar o cookie** a partir do output, sem orquestrar nada.
- **Teste:** com um `AccessTokenIssuer` fake que falha, provar que a senha antiga permanece e nenhuma sessão foi revogada (unitário). Isso alinha com a decisão de tirar orquestração do controller (ver P1-6).

### P1-3 — Cinco logins incorretos concorrentes não persistem cinco falhas

**Sintoma:** no caminho de senha errada, `login.use-case.ts` chama `accounts.save(...)` mas **ignora o resultado**; o adapter faz CAS otimista por `version` e retorna `CONCURRENCY_CONFLICT` quando perde a disputa. Falhas concorrentes se perdem; o teste aceita contador entre 1 e 5.

**Causa raiz:** `modules/identity/src/app/use-case/login.use-case.ts` (resultado do save ignorado) + `apps/backend/.../user-account.repository.prisma.ts` (CAS sem retry) + `apps/backend/test/identity/concurrency.e2e-spec.ts` (asserção frouxa).

**Comportamento correto (spec `authentication`, cenário "Five concurrent failed logins result in correct block"):** após 5 falhas concorrentes na janela, `failedLoginAttempts === 5` (exato) e `lockedUntil` definido.

**Correção exigida (DECISÃO — ver seção "Decisões a confirmar"):** eliminar a perda de incrementos. **A correção cruza os três grupos — não é só Backend:**
- **Negócio** (`modules/identity`): define o contrato de concorrência — a assinatura/semântica de `UserAccountRepository` para o incremento de falha, o código de erro público de conflito (se exposto pelo domínio, ex.: `IDENTITY.CONCURRENCY_CONFLICT`) e a política de retry quando aplicável (ex.: quantas tentativas o `LoginUseCase` faz ao receber conflito). O `LoginUseCase` passa a **não ignorar** o resultado do save de falha.
- **Backend** (`apps/backend`): implementa o mecanismo concreto no adapter Prisma — lock pessimista ou CAS com retry, conforme a decisão.
- **Integração**: testa a concorrência real contra o banco.

Mecanismos possíveis:
- **(recomendado)** lock pessimista (`SELECT … FOR UPDATE`) na linha da conta, dentro de uma transação, **apenas no caminho de falha de login** — serializa as tentativas concorrentes preservando a lógica de janela de 15 min que vive na entidade; ou
- retry otimista controlado: ao receber `CONCURRENCY_CONFLICT`, o `LoginUseCase` relê a conta, reaplica `recordLoginFailure` e tenta de novo (limite de tentativas).

Atualizar `design.md` decisão 4a para descrever o mecanismo escolhido (hoje ela aceita explicitamente perder incrementos "para simplificar" — esse risco deixa de ser aceito).
- **Teste:** 5 logins errados concorrentes (`Promise.all`) contra banco real resultam em `failedLoginAttempts === 5` e bloqueio — asserção **exata**, não faixa.

### P1-4 — Roteamento Web → Backend não implementado

**Sintoma:** o Web chama `/api/**`, mas `apps/web/next.config.ts` não tem `rewrites`. A spec cita porta `3001`; o backend usa `4000`; não há env var; não há teste de preservação de host.

**Comportamento correto (spec `request-routing-and-proxy`):** em desenvolvimento, `/api/**` do Web (`:3000`) SHALL ser reescrito para o backend, preservando o host/subdomínio necessário à resolução de `codigoBanca`.

**Correção exigida:**
- Implementar `rewrites()` em `apps/web/next.config.ts` de `/api/:path*` para o backend, com destino via env var (ex.: `BACKEND_INTERNAL_URL`), default coerente com a porta real.
- **Alinhar a spec e o `design.md` decisão 9 para a porta real `4000`** (não 3001) — a spec deve refletir a realidade do projeto.
- Documentar a preservação de `Host`/`X-Forwarded-Host` e como o subdomínio (`farizeu`) chega ao backend em dev.
- **Teste:** um teste (ou script verificável documentado) provando que uma chamada relativa `/api/...` a partir do Web chega ao backend e resolve `codigoBanca = "farizeu"`.

### P1-5 — `X-Forwarded-Host` confia apenas em uma variável global

**Sintoma:** com `TRUST_PROXY_HOST=true`, **qualquer** origem que alcance o backend pode fornecer `X-Forwarded-Host`. Não há conferência do IP/origem do proxy. O ataque relevante não é `hack.com` (rejeitado pelo sufixo) e sim forjar **outro host válido**, como `outra-banca.bancaflow.com.br`, sequestrando o tenant.

**Causa raiz:** `apps/backend/.../middleware/tenant-resolver.middleware.ts`.

**Comportamento correto (spec `banca-context-resolution`, requirement "Trust proxy host header conditionally"):** `X-Forwarded-Host` SHALL ser aceito somente quando `TRUST_PROXY_HOST=true` **e** a requisição vier de um proxy da allowlist confiável.

**Correção exigida (DECISÃO — ver seção):** adicionar uma allowlist de IP/CIDR de proxies confiáveis (ex.: `TRUSTED_PROXY_IPS`). **Atenção à semântica de `req.ip`:** ele NÃO é confiável antes de configurar corretamente o `trust proxy` do Express/Nest, pois pode passar a refletir `X-Forwarded-For` (que o próprio cliente forja). Ordem correta:
  1. Configurar o Express/Nest para confiar somente nos IPs/CIDRs de proxy conhecidos (`app.set('trust proxy', ...)` com a lista, não `true`).
  2. Conferir o **peer imediato** da conexão via `req.socket.remoteAddress` contra a allowlist — esse é o IP real de quem abriu o socket, não forjável por header.
  3. Somente se o peer imediato estiver na allowlist, considerar `X-Forwarded-Host`; caso contrário, usar exclusivamente o `Host` direto.
- **Teste:** com `TRUST_PROXY_HOST=true` mas peer imediato **fora** da allowlist, um `X-Forwarded-Host: outra-banca.bancaflow.com.br` forjado (outro domínio **válido** do BancaFlow — não `hack.com`, que já cai no sufixo) é ignorado, não sequestra o tenant. Testar também o header `X-Forwarded-For` forjado para garantir que `req.ip` não seja usado ingenuamente.

### P1-6 — Regra de revogação escondida no adapter Prisma

**Sintoma:** a regra "bloquear/desativar revoga sessões" vive dentro de `UserAccountRepositoryPrisma.save()`. O `ToggleAccountStatusUseCase` conhece só o repositório de contas. O comportamento varia conforme o adapter e é invisível para testes com fakes.

**Causa raiz:** `apps/backend/.../user-account.repository.prisma.ts` (revogação no `save`) + `modules/identity/.../toggle-account-status.use-case.ts` (orquestração ausente). **Esta correção reverte a decisão 6 do `design.md` atual**, que era arquiteturalmente fraca (um `save()` de agregado mexendo na tabela de outro agregado).

**Comportamento correto (Arquitetura Limpa / DDD; specs `user-account-management` e `session-management`):** a orquestração "mudança de status → revogação de sessões" SHALL viver no caso de uso, coordenando `UserAccountRepository`, `SessionRepository`, `Clock` e `TransactionManager`, de forma atômica. O `save()` do repositório volta a persistir **apenas** o próprio agregado.

**Correção exigida:**
- `ToggleAccountStatusUseCase` passa a receber `SessionRepository`, `Clock` e `TransactionManager`; ao transicionar para `BLOCKED`/`INACTIVE`, executa `account.save` + `sessions.revokeAll(userId, bancaId, now)` dentro de `runInTransactionResult`.
- Remover a revogação de dentro de `UserAccountRepositoryPrisma.save()`.
- **Atualizar `design.md` decisão 6** para refletir a orquestração no caso de uso.
- Recompor o use case no `IdentityModule` (novas dependências).
- **Teste:** teste unitário com fakes provando que bloquear/desativar revoga as sessões (comportamento agora visível no domínio) + e2e confirmando atomicidade no banco.

### P1-7 — Corrida entre rotação e revogação

**Sintoma:** `rotateIfDigestMatches` faz `UPDATE ... WHERE id = ? AND refreshTokenDigest = oldDigest`. Se a sessão for revogada/expirar entre a leitura do domínio e o update, a rotação ainda casa e emite token.

**Causa raiz:** `apps/backend/.../session.repository.prisma.ts`.

**Comportamento correto (spec `session-management`, rotação de uso único):** o compare-and-swap SHALL exigir também `revokedAt IS NULL` e `expiresAt > now` no `WHERE`, de modo que uma sessão revogada/expirada nunca rotacione.

**Correção exigida:**
- A port `SessionRepository.rotateIfDigestMatches(...)` SHALL **receber `now` explicitamente** (vindo da port `Clock` no caso de uso), nunca chamar `new Date()` dentro do adapter Prisma — isso mantém o tempo testável e determinístico, coerente com o resto do domínio. Nova assinatura: `rotateIfDigestMatches(sessionId, oldDigest, newDigest, newExpiresAt, now)`.
- No adapter, adicionar `revokedAt: null` e `expiresAt: { gt: now }` ao `where` do `updateMany` de rotação (o `now` recebido, não `new Date()`).
- **Teste:** revogar a sessão entre leitura e rotação (ou simular via ordem de operações num teste de integração) e provar que a rotação falha (`Result.ok(null)` → `401`), sem emitir token; e uma sessão expirada (com `now` controlado pela `Clock` fake) também não rotaciona.

---

## Desvios menores (corrigir junto)

- **`Session.rotate()` aceita expiração no passado** (`modules/identity/src/session/session.entity.ts`). Spec `session-management` cenário "Rotation sets a future expiry" exige rejeitar `newExpiresAt` no passado. Corrigir fazendo `rotate()` **receber `now` explicitamente** (`rotate(newDigest, newExpiresAt, now)`, vindo da port `Clock` no caso de uso) e validar `newExpiresAt > now`. **NÃO** comparar com a `expiresAt` atual da sessão — se a sessão já expirou, `newExpiresAt > expiresAt_atual` ainda aceitaria uma data no passado. A referência correta é sempre `now`. Teste unitário com `now` controlado cobrindo rejeição de expiração passada.
- **`role` opcional com default `USER`** (`modules/identity/.../create-user-account.use-case.ts`, `CreateUserAccountInput`). Há inconsistência entre `security-configuration` ("role obrigatório") e `user-account-management` ("default USER"). **Resolver tornando `role` obrigatório em `CreateUserAccountInput`** (remover o `?`); o único chamador (`ProvisionBanca`) já passa `OWNER` explicitamente. Reconciliar as duas specs para essa decisão. Teste garantindo que criar sem role é erro de tipo/compilação (ou falha explícita), nunca um `OWNER`/`USER` implícito silencioso.
- **Falta `CHECK (failedLoginAttempts >= 0)`** na migration (`apps/backend/prisma/migrations/.../migration.sql`). Adicionar via SQL bruto (mesma abordagem dos outros checks) numa migration nova reversível. A entidade já valida em runtime; o banco deve reforçar.
- **`Entity.props` e `ValueObject.value` públicos/mutáveis** (`packages/shared/src/base/entity.ts`, `vo.ts`). É possível contornar os métodos do agregado mutando os objetos diretamente. **DECISÃO de escopo:** tornar esses membros `protected readonly` (ou expor só via getters imutáveis) é um refactor de classe-base que afeta todos os módulos. Avaliar o impacto; se aprovado, fazer com testes de regressão de todos os pacotes. Se adiado, registrar explicitamente como dívida conhecida no `design.md`, não deixar implícito.
- **Testes Web ausentes — agora OBRIGATÓRIOS** (`tasks.md` itens 22.3, 23.3, 24.2). O Web **não tem script de testes** configurado, e o princípio-guia deste prompt exige teste automatizado — logo, cobrir só por validação manual **não é aceitável**. Ações obrigatórias:
  - Configurar o runner (Vitest ou Jest + Testing Library, conforme a convenção do Next.js 16 do projeto — ler `apps/web/AGENTS.md` e a doc local antes) e adicionar o script `test` ao `apps/web/package.json`.
  - Teste de `proxy.ts`: redirect anônimo em `/dashboard` e `/trocar-senha`; usuário com `mustChangePassword=true` forçado a `/trocar-senha`; com `mustChangePassword=false` fora de `/trocar-senha`; sem loop.
  - Teste do formulário de troca obrigatória (chama o endpoint obrigatório com só `newPassword`; sucesso → `/dashboard`; senha fraca → erro acessível).
  - Teste do cliente HTTP (`auth.client` + `fetchWithRefresh`): silent refresh em `401`, redirect `/login?expired=1` quando o refresh falha.
  - **Correção de estado de tarefa:** `27.3` já está `[x]` (verificado ao vivo pelo agente principal); a pendência de validação manual remanescente é **`26.1`** (bloqueio/desativação → 401; token antigo inválido; reativação exige novo login) — que também deve virar teste automatizado (e2e no backend, já que é regra de servidor), não manual.

---

## Atualizações de spec/design exigidas

- `design.md` decisão 3 — reforçar que a emissão de token é parte da transação (P0-2).
- `design.md` decisão 4a — descrever o mecanismo de concorrência escolhido; remover a aceitação do risco de perder incrementos (P1-3).
- `design.md` decisão 6 — reescrever: revogação orquestrada no caso de uso, não no adapter (P1-6).
- `design.md` decisão 9 — porta real `4000` e rewrite de dev (P1-4).
- spec `banca-context-resolution` — detalhar a allowlist de proxies confiáveis por IP/CIDR (P1-5).
- specs `security-configuration` e `user-account-management` — reconciliar a regra de `role` obrigatório.
- spec `session-management` — deixar explícito que a rotação exige `revokedAt IS NULL` e expiração futura, e que `rotate()` rejeita expiração passada.
- `proposal.md` — se alguma capability mudar de forma relevante, refletir no resumo.

---

## Reabertura de tarefas

Marque `[ ]` novamente (não concluídas) em `tasks.md` para os itens que cobrem: fluxo obrigatório/voluntário de senha (P0-1, P0-2), concorrência de login (P1-3), roteamento/proxy (P1-4), fronteira de confiança de host (P1-5), revogação em bloqueio/desativação (P1-6), rotação de refresh (P1-7), invariante de expiração de `Session`, `role` obrigatório, `CHECK` de contador, e as tarefas de teste Web. Ajuste as descrições que hoje afirmam conclusão para refletir o estado real. Adicione um item explícito para o encapsulamento de `Entity`/`ValueObject` (com a decisão de escopo).

---

## Decisões a confirmar (não decida sozinho — pergunte se houver dúvida)

1. **Concorrência (P1-3):** lock pessimista (`SELECT … FOR UPDATE`) — recomendado — vs. retry otimista. Ambos satisfazem a spec; a escolha afeta performance sob contenção.
2. **Fronteira de proxy (P1-5):** allowlist por IP/CIDR (`TRUSTED_PROXY_IPS`) — recomendado — vs. documentar uma premissa de deploy (backend nunca exposto diretamente, só atrás do proxy). Depende de como produção será servida.
3. **Encapsulamento de base (`Entity`/`ValueObject`):** refatorar agora (impacto amplo em `packages/shared`; **se aprovado, o subagente Negócio ganha escopo de escrita em `packages/shared/**`**) vs. registrar como dívida técnica documentada no `design.md`.
4. **Runner de testes Web:** Vitest vs. Jest — apenas a ferramenta é decisão; **os testes Web em si são obrigatórios** (não há mais a opção de substituí-los por validação manual).

---

## Estratégia obrigatória de subagentes (reimplementação)

Mesma regra das changes anteriores: **exatamente três subagentes**, contexto limpo, escopo de escrita explícito, na ordem:

1. **Negócio** (`modules/identity`, `modules/tenancy`, e **`packages/shared` SOMENTE se a decisão 3 — encapsulamento de `Entity`/`ValueObject` — for aprovada**): P0-1 (verificação autoritativa `account.mustChangePassword === true` no use case), P0-2 (emissão de token dentro da transação — injetar `AccessTokenIssuer` nos use cases de senha, alterar outputs), **P1-3 parte de domínio** (contrato/erro público de conflito e política de retry; `LoginUseCase` para de ignorar o resultado do save de falha), P1-6 (orquestração de revogação no `ToggleAccountStatusUseCase` com `SessionRepository`/`Clock`/`TransactionManager`), P1-7 parte de domínio (`SessionRepository.rotateIfDigestMatches` recebe `now`; `Session.rotate()` recebe `now`), invariante de `Session.rotate()`, `role` obrigatório em `CreateUserAccountInput`. **Deve finalizar os contratos antes** de Backend/Web. Se a decisão 3 for adiada, o escopo de escrita **não** inclui `packages/shared`.
2. **Backend** (`apps/backend`): **P1-3 parte de infra** (lock pessimista/CAS+retry no adapter Prisma + teste de concorrência exato), P1-5 (allowlist de proxy por IP/CIDR + `trust proxy` + peer imediato), P1-7 parte de infra (WHERE da rotação com `revokedAt: null` e `expiresAt: { gt: now }`), remover revogação do adapter `save()`, `CHECK failedLoginAttempts >= 0` na migration, recompor módulos, setar cookie a partir do output dos use cases.
3. **Web** (`apps/web`): P1-4 (rewrite em `next.config.ts` + env var), **testes Web obrigatórios** (runner + `proxy.ts` + formulário + `auth.client`/silent refresh).

O agente principal integra, resolve conflitos e roda a validação final. Um subagente não marca tarefas de outro grupo. Cada subagente lê as skills relevantes antes de alterar arquivos.

## Gates de verificação (comportamentais, não só estruturais)

- `npm run build` e `npm run test` na raiz — verdes, **incluindo os novos testes de cada cenário corrigido**.
- `npm run test:e2e -w apps/backend` — verdes, com asserções **exatas** (contador `=== 5`, rotação de sessão revogada/expirada falha, troca obrigatória barra qualquer conta com `mustChangePassword=false` — inclusive `OWNER`/`ADMIN` —, rollback em falha de emissão de token).
- `npm run lint` (backend e web) — verde.
- `openspec validate harden-identity-authentication-mvp --strict` — válido (necessário, **não suficiente**).
- Relatório final DEVE mapear cada achado (P0-1..P1-7 + desvios) ao teste específico que o comprova. Achado sem teste comportamental correspondente = tarefa não concluída.

## Fora de escopo

- Reescrever partes não relacionadas aos achados.
- Introduzir MFA, recuperação por e-mail, OAuth, RBAC granular.
- Arquivar a change antes de todos os P0 e P1 estarem corrigidos e provados por teste.
