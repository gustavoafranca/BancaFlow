## Context

O MVP de Identity e Tenancy foi implementado com foco em funcionalidade mínima viável, deixando incoerências críticas:

- **Senha**: Contrato incoerente entre voluntária e obrigatória; força validada apenas no Web; `mustChangePassword` não garante rollback.
- **Transações**: Casos de uso retornam `Result.fail` sem garantir rollback após escrita persistida.
- **Concorrência**: Login e refresh token vulneráveis a condições de corrida; sem operação atômica para compare-and-swap.
- **Tenant**: Isolamento dependente apenas de filtros de aplicação; banco não reforça.
- **Sessão**: Bloqueio/desativação não revoga sessões ativas; refresh token pode ser reutilizado.
- **Web**: Decodificação de JWT no cliente/proxy sem validação de assinatura ou estado no servidor.
- **Roteamento**: Proxy/rewrite em desenvolvimento não definido; trust boundaries ambíguas.
- **Composição**: Identity e Tenancy circulares via `ProvisionBanca`.
- **Segurança**: Backend não valida secrets; DTOs aceitam entrada bruta; erros vazam.
- **Invariantes**: Datas mutáveis, contadores sem validação, transições sem proteção.

Este design corrige cada aspecto seguindo DDD tático, Arquitetura Limpa e isolamento rigoroso.

---

## Goals / Non-Goals

**Goals:**

1. Definir dois fluxos explícitos e coerentes de troca de senha (voluntária e obrigatória) com revogação de sessões e emissão segura de tokens.
2. Estabelecer política autoritativa de força de senha no domínio, rejeitando senha fraca em criação, troca e reset.
3. Garantir que operações compostas (escrita + emissão de token, troca + revogação) sejam atômicas e façam rollback em falha.
4. Proteger login e refresh token contra condições de corrida: incrementos de contador, rotação única, digest único.
5. Reforçar isolamento multi-tenant com constraints no banco: FK composta, UNIQUE(bancaId, userId), UNIQUE refreshTokenDigest.
6. Implementar revogação imediata de sessões ao bloquear ou desativar conta, na mesma transação.
7. Validar assinatura JWT, estado de sessão e conta no servidor; impedir flash de conteúdo privado no Web.
8. Definir proxy/rewrite seguro em desenvolvimento; mesma origem em produção; trust boundaries explícitas.
9. Remover dependência circular entre Identity e Tenancy via composition root externo.
10. Falhar no startup do Backend se secrets inválidos; validar DTOs; CORS whitelist; erros seguros.
11. Proteger invariantes de entidades com cópias defensivas, validações no banco e transições por métodos.

**Non-Goals:**

- Criar serviço distribuído ou microserviço separado.
- Implementar OAuth, social login ou confirmação de e-mail.
- Adicionar RBAC granular além dos papéis (OWNER, ADMIN, USER) já previstos.
- Reescrever componentes visuais do Web que já atendem o fluxo.
- Apostas ou regras futuras do produto.

---

## Decisions

### 1. Troca de Senha — Dois Fluxos Explícitos

**Decisão**: Separar `ChangePasswordUseCase` (voluntária) de `MandatoryPasswordChangeUseCase` (obrigatória) com contratos HTTP distintos.

**Racional**:
- Voluntária (`PATCH /api/auth/password`): usuário envia `currentPassword` + `newPassword`; Backend verifica senha atual contra o hash persistido.
- Obrigatória (`PATCH /api/auth/mandatory-password-change`): usuário envia apenas `newPassword`.
- Ambas revogam **todas as outras** sessões do usuário (não a atual), permitindo continuar na mesma sessão após a troca.
- Nenhuma token antiga com claim desatualizado permanece em uso.

**Autorização por estado autoritativo (P0-1 — revisado pós-review):** o fluxo obrigatório SHALL ser autorizado pelo estado **persistido** da conta — `account.mustChangePassword === true` verificado dentro do `MandatoryPasswordChangeUseCase` — não apenas pela claim do token nem pelo decorator `@AllowPasswordChange()` (que só libera, não exige a flag). Sem essa verificação, qualquer conta autenticada com `mustChangePassword=false` (inclusive `OWNER`/`ADMIN`) poderia trocar a senha sem informar a atual. Se a flag não for `true`, o caso de uso retorna `FORBIDDEN` antes de qualquer escrita. A autorização é pela **flag, não pelo papel**.

**Emissão de token dentro da transação (P0-2 — revisado pós-review):** a emissão do novo access token (com `mustChangePassword=false`) SHALL ocorrer **dentro** do `runInTransactionResult`, no caso de uso — não depois, no controller. `ChangePasswordUseCase` e `MandatoryPasswordChangeUseCase` recebem a port `AccessTokenIssuer`, emitem o token dentro da transação e o retornam no output; o controller apenas seta o cookie a partir do output. Se a emissão falhar, a transação reverte (senha antiga permanece, sessões não são revogadas), satisfazendo o cenário "Rollback on token emission failure".

**Alternativa considerada**: Unificar em um caso de uso com flag `isMandatory` — rejeitado porque permitiria cliente falsificar fluxo.

---

### 2. Política de Senha no Domínio

**Decisão**: Criar `StrongPasswordValidator` em `modules/identity` (reutilizando `@bancaflow/shared` se `StrongPassword` VO existir), rejeitando senha fraca no Backend antes de persistir.

**Racional**:
- Regra de domínio: o Backend é a fonte da verdade.
- Web replica a validação apenas para feedback rápido e UX; cliente nunca é fonte da verdade.
- `CreateUserAccountUseCase`, `ChangePasswordUseCase` e `AdminResetPasswordUseCase` todos rejeitam senha fraca com `Result.fail(IDENTITY.PASSWORD_TOO_WEAK)`.
- Senha temporária gerada por `TemporaryPasswordGenerator` também satisfaz a política.
- Mensagem de erro nunca detalha exatamente qual critério falhou (comprimento, caracteres especiais, etc.) para não guiar força-bruta.

**Alternativa considerada**: Validar apenas no Web — rejeitado porque viola DDD (regra no domínio, não na interface).

---

### 3. Transações com Semântica de Result

**Decisão**: Implementar `runInTransactionResult(callback: () => Promise<Result<T>>): Promise<Result<T>>` no `PrismaService`, garantindo rollback se callback retorna `Result.fail`.

**Racional**:
- Caso de uso retorna `Result<UserAccount>` com regra de negócio (ex.: senha fraca detectada após hashing).
- Sem `runInTransactionResult`, Prisma confirma escrita anterior mesmo que resultado final seja falha.
- Com helper: se callback retorna `Result.fail`, transação é revertida; se retorna `Result.ok`, é confirmada.
- Documentação clara sobre quais falhas causam rollback e quais representam alteração persistida (ex.: contador de tentativas inválidas deve persistir mesmo em falha de autenticação).

**Aplicação**:
- `LoginUseCase`: escrita do contador, bloqueio e emissão de token devem ser atômicos.
- `ChangePasswordUseCase`: escrita de hash, revogação de sessões, emissão de token devem ser atômicos.
- `RefreshSessionUseCase`: rotação de digest deve ser atômico compare-and-swap.

**Alternativa considerada**: Retornar apenas `void` e falhar com exceção — rejeitado porque `Result` é padrão do projeto.

---

### 4. Proteção contra Condições de Corrida

**4a. Login Simultâneo** *(revisado pós-review — o risco de perder incrementos deixa de ser aceito)*

**Decisão**: **Lock pessimista** no caminho de falha de login. Dentro de uma transação, o adapter faz `SELECT ... FOR UPDATE` na linha da conta antes do read-modify-write do contador, serializando tentativas concorrentes e preservando a lógica de janela de 15 min que vive na entidade (`recordLoginFailure`). A coluna `version` permanece para CAS otimista nas demais escritas de conta, mas o contador de falha usa lock, não CAS.

**Responsabilidades (a correção cruza os três grupos):**
- **Negócio**: define o contrato de `UserAccountRepository` para o incremento de falha, o código de erro público de conflito (se exposto) e a política de retry; `LoginUseCase` **não ignora mais** o resultado do save de falha.
- **Backend**: implementa o `SELECT ... FOR UPDATE` no adapter Prisma, dentro da transação.
- **Integração**: prova com banco real.

**Racional**:
- Sem serialização, 5 requisições simultâneas com senha errada podem perder incrementos e não bloquear.
- O caminho de falha de login é raro e de baixa frequência — o custo de contenção do lock é aceitável e a correção (contador exato) é crítica.
- O critério da spec é **exato** (`failedLoginAttempts === 5` e bloqueio), não uma faixa.

**Alternativa considerada**: retry otimista com CAS por `version` — funciona, mas empurra complexidade de retry para o caso de uso; o lock pessimista é mais simples de raciocinar neste caminho específico.

**4b. Refresh Token Rotativo**

**Decisão**: `refreshTokenDigest` deve ser UNIQUE no banco. Durante `RefreshSessionUseCase`:
1. Calcular `HMAC(currentRefreshToken, REFRESH_TOKEN_SECRET)` → `oldDigest`.
2. Gerar novo refresh token aleatório → `newRefreshToken`.
3. Calcular `HMAC(newRefreshToken, REFRESH_TOKEN_SECRET)` → `newDigest`.
4. Operação atômica compare-and-swap, exigindo que a sessão ainda esteja **ativa** no próprio `WHERE`: `UPDATE Session SET refreshTokenDigest = newDigest, expiresAt = now + 7d WHERE id = ? AND refreshTokenDigest = oldDigest AND revokedAt IS NULL AND expiresAt > now`.
5. Se nenhuma linha atualizada, o token foi revogado/rotacionado/expirou → retornar erro genérico (`Result.ok(null)` na port → `401`).
6. Retornar `newRefreshToken` e novos tokens ao cliente.

**`now` explícito (revisado pós-review):** a port `SessionRepository.rotateIfDigestMatches(sessionId, oldDigest, newDigest, newExpiresAt, now)` **recebe `now`** vindo da port `Clock` no caso de uso — o adapter Prisma **nunca** chama `new Date()`. Isso mantém a rotação testável/determinística e fecha a corrida em que uma sessão revogada entre a leitura e o update ainda rotacionava (o `revokedAt IS NULL AND expiresAt > now` no `WHERE` resolve o TOCTOU).

**Racional**:
- UNIQUE constraint previne duplicate digest.
- Compare-and-swap atômico com predicado de atividade: sessão revogada/expirada nunca rotaciona, e sob concorrência apenas uma requisição vence.
- Token anterior (oldDigest) não funciona mais.

**Alternativa considerada**: Soft delete com `revokedAt` — menos eficiente; UNIQUE constraint + predicado no `WHERE` é melhor proteção.

---

### 5. Isolamento Multi-Tenant no Banco

**Decisão**: Adicionar constraints no Prisma/migrations:
- `UserAccount`: Ja existe `@@unique([bancaId, normalizedUsername])`.
- `Session`: Adicionar `@@unique([refreshTokenDigest])` e FK composta `userId` → `(bancaId, userId)` em UserAccount (se Prisma suportar).
- Índices: `Session(bancaId, userId)` para queries rápidas.

**Racional**:
- FK composta garante que sessão não pode referenciar usuário de outra banca.
- UNIQUE refreshTokenDigest previne reutilização.
- Indices aceleram isolamento por bancaId em query.

**Nota**: Verificar se Prisma suporta FK composta; caso contrário, documentar que integridade é garantida por transação + rollback.

---

### 6. Bloqueio/Desativação com Revogação Imediata *(REVISADO pós-review — reverte a decisão anterior)*

**Decisão**: a orquestração "mudança de status → revogação de sessões" vive **no caso de uso** (`ToggleAccountStatusUseCase`), NÃO no adapter Prisma. O caso de uso recebe `UserAccountRepository`, `SessionRepository`, `Clock` e `TransactionManager`; ao transicionar para `BLOCKED`/`INACTIVE`, executa, dentro de `runInTransactionResult`:
1. `account.save(...)` com o novo status.
2. `sessions.revokeAll(userId, bancaId, now)`.

O `save()` do `UserAccountRepository` volta a persistir **apenas** o agregado `UserAccount` — sem efeito colateral em outra tabela.

**Racional (por que a decisão anterior estava errada)**:
- Colocar a revogação dentro de `UserAccountRepositoryPrisma.save()` fazia o `save` de um agregado alcançar a tabela de **outro** agregado (`Session`), violando a fronteira de agregado e a responsabilidade única do repositório.
- A regra de negócio ("bloquear revoga sessões") ficava **invisível** ao domínio e aos testes com fakes, e o comportamento variava conforme o adapter — um repositório in-memory não a teria.
- A atomicidade continua garantida: a coordenação no caso de uso roda dentro de `runInTransactionResult`, então status + revogação são tudo-ou-nada, sem precisar esconder a regra no adapter.

**Consequência**: `block()`/`unblock()`/`deactivate()`/`activate()` na entidade continuam apenas retornando nova instância; a orquestração de sessões é do caso de uso. O comportamento passa a ser testável por unidade com fakes.

---

### 7. Validação Autoritativa de Sessão no Backend

**Decisão**: Guard JWT no Backend:
1. Extrair payload do token (sem verificar assinatura — feito por middleware NestJS).
2. Buscar sessão no banco por `sessionId` do payload.
3. Validar: `revokedAt IS NULL`, expiração não alcançada, conta `ACTIVE` e não bloqueada, banca `ACTIVE`.
4. Rejeitar com `401` em qualquer violação.

**Racional**:
- Decodificar JWT no cliente/proxy não é autenticação; é apenas leitura não confiável.
- Servidor é a fonte da verdade: revogação, expiração, estado de conta.

---

### 8. Proteção de Rotas Web — Nenhum Flash

**Decisão**: Usar `apps/web/src/proxy.ts` conforme Next.js 16 (NÃO criar `middleware.ts`; a convenção do projeto é `proxy.ts`, e o matcher usa as URLs reais, nunca o route group `(private)`):
1. Verificar presença do cookie de access token.
2. Se ausente, redirecionar para `/login` **antes de qualquer renderização** (no servidor); `/trocar-senha` também é protegida contra acesso anônimo.
3. Se presente, decodificar o payload (apenas leitura, sem tratar como autenticação) e verificar `mustChangePassword`.
4. Se `true` e rota ≠ `/trocar-senha`, redirecionar para `/trocar-senha`.
5. Permitir renderização apenas se cookie presente e `mustChangePassword` coerente, sem criar loop entre `/login`, `/trocar-senha` e `/dashboard`.

**Racional**:
- `proxy.ts` roda no servidor antes da renderização — nenhum conteúdo privado é enviado ao navegador se não autenticado.
- O proxy é apenas verificação de presença/navegação (UX); a validação autoritativa (assinatura, sessão, revogação, expiração, conta/banca) continua no Backend a cada requisição `/api`. Decodificar o JWT no cliente/proxy nunca é autenticação suficiente.
- O layout server do grupo privado confirma a sessão antes de renderizar; o backend permanece autoritativo.

---

### 9. Roteamento e Proxy Explícito

**Decisão** *(revisado pós-review — porta real e rewrite de fato implementado)*:
- **Produção**: API no mesmo host, ex. `https://farizeu.bancaflow.com.br/api`. DNS e TLS wildcard `*.bancaflow.com.br`. Nenhuma proxy necessária.
- **Desenvolvimento**:
  - Backend roda em **`http://localhost:4000`** (porta real do projeto; a menção anterior a `3001` estava incorreta).
  - Web roda em `http://localhost:3000`.
  - Next.js **reescreve `/api/:path*`** para o backend via `rewrites()` em `apps/web/next.config.ts`, com destino em variável de ambiente (ex.: `BACKEND_INTERNAL_URL`, default `http://localhost:4000`). Até esta correção, o `next.config.ts` **não tinha** rewrite algum.
  - O host/subdomínio é preservado de forma controlada para o backend resolver `codigoBanca` (via `X-Forwarded-Host` sob `TRUST_PROXY_HOST=true`, respeitando a allowlist de proxy da decisão 11).
- **Produção em Docker**: Reverse proxy (nginx) gerencia subdomínios; `TRUST_PROXY_HOST=false` ou allowlist restrita ao IP do proxy.

**Racional**:
- Clareza sobre confiança: dev confia no proxy local declarado; prod não confia em headers de origem não confiável.
- Chamadas relativas `/api` do Web passam a chegar ao backend em dev de fato (antes dependiam de configuração manual).

---

### 10. Composição Desacoplada Entre Identity e Tenancy

**Decisão**: Criar `modules/provisioning` (ou usar um composition root no Backend, ex. `PlatformModule`) responsável por orquestrar `ProvisionBancaUseCase`:
- `ProvisionBancaUseCase` recebe `CreateUserAccountPort` (implementado pelo Identity) e `BancaRepository` (Tenancy) como dependências.
- ProvisionBanca não fica dentro de Tenancy nem de Identity.
- Cada módulo exporta apenas ports/use-cases públicos; internos ficam privados.

**Racional**:
- Remove `forwardRef` e dependência cíclica.
- Cada bounded context é independente e testável.
- Orquestração é responsabilidade da camada de aplicação/composição, não do domínio.

**Alternativa considerada**: Manter ProvisionBanca em Tenancy, importar CreateUserAccountUseCase do Identity — rejeitado porque cria ciclo.

---

### 11. Segurança em Startup, Validação de DTO e Fronteira de Proxy

**Decisão**:
- **Backend startup**: Validar `JWT_SECRET` e `REFRESH_TOKEN_SECRET` obrigatórios, com comprimento mínimo 32 caracteres, diferentes um do outro. Falhar (`exit 1`) se ausentes/fracos.
- **DTOs**: Usar `class-validator` para validar entrada; `ValidationPipe` global com `whitelist`/`forbidNonWhitelisted`.
- **Erros**: Nunca retornar `error.message` bruto do Prisma. Traduzir para erro de domínio estável.
- **CORS**: Allowlist configurável via `CORS_ORIGINS`; nunca `origin: true`. A rejeição de origem **não** deve responder `500` — apenas omitir os cabeçalhos CORS (corrigido: o callback lançava `Error`).
- **Role em criação (revisado)**: `role` é **obrigatório** — tanto no `CreateUserAccountDto` (HTTP) quanto na interface de domínio `CreateUserAccountInput` (remover o `?`). Não existe endpoint público de criação; o único chamador (`ProvisionBanca`) passa `OWNER` explicitamente. Isso reconcilia a inconsistência entre as specs `security-configuration` e `user-account-management`: **nunca** há papel implícito (nem `USER`, nem `OWNER`).
- **Fronteira de proxy / `X-Forwarded-Host` (revisado pós-review)**: honrar `X-Forwarded-Host` exige `TRUST_PROXY_HOST=true` **E** que o **peer imediato** da conexão esteja numa allowlist de IP/CIDR de proxies confiáveis (ex.: `TRUSTED_PROXY_IPS`). Ordem: (1) configurar `trust proxy` do Express só para os IPs conhecidos (nunca `true`); (2) conferir `req.socket.remoteAddress` (o peer TCP real, não forjável por header) contra a allowlist; (3) só então considerar `X-Forwarded-Host`. `req.ip` sozinho não é confiável, pois pode refletir `X-Forwarded-For` forjado pelo cliente. O ataque relevante é forjar **outro host válido** (`outra-banca.bancaflow.com.br`), não `hack.com` (que já cai no sufixo).

**Racional**:
- Previne secrets fracos, CORS aberto, entrada não validada, vazamento de erro e papel implícito.
- Fecha o sequestro de tenant por header forjado quando o backend está alcançável fora do proxy de borda.

---

### 12. Encapsulamento das Bases `Entity` e `ValueObject` *(novo pós-review — decisão: refatorar agora)*

**Decisão**: tornar `Entity.props` e `ValueObject.value` (em `packages/shared/src/base`) **`protected readonly`** (ou expor apenas via getters imutáveis), de modo que consumidores não consigam contornar os métodos do agregado mutando os objetos diretamente.

**Racional**:
- Hoje `props`/`value` são públicos e mutáveis: é possível fazer `account['props'].status = 'ACTIVE'` e furar todas as invariantes e transições protegidas por método — anulando boa parte do endurecimento das entidades.
- É um refactor de **classe-base** que afeta todos os módulos (`identity`, `tenancy`) e o próprio `shared`; por isso o subagente Negócio ganha escopo de escrita em `packages/shared/**` **apenas para esta correção**, com regressão de todos os pacotes.

**Invariante de `Session.rotate()` (relacionado)**: `rotate()` passa a **receber `now`** e rejeitar `newExpiresAt <= now` — nunca comparar apenas com a `expiresAt` atual (que aceitaria data passada se a sessão já expirou). Coerente com a port `rotateIfDigestMatches(..., now)` da decisão 4b.

---

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Lock pessimista (`SELECT FOR UPDATE`) no caminho de falha de login serializa tentativas concorrentes. | Aceitável: caminho de baixa frequência; a correção (contador exato + bloqueio) é crítica e supera o custo de contenção. |
| UNIQUE(refreshTokenDigest) pode causar violação se client envia 2x mesmo token rapidamente. | Esperado; client retry com exponential backoff. Documentar. |
| FK composta em Session. | **Resolvido**: `@@unique([id, bancaId])` em `UserAccount` + `@relation(fields: [userId, bancaId], references: [id, bancaId])` em `Session` funcionou no Prisma; teste prova rejeição de sessão cross-banca. |
| Proxy `proxy.ts` roda contra backend sem validar assinatura. | Mitigado: proxy é só presença/navegação; Backend valida assinatura + sessão + conta + banca em cada `/api/**`. |
| Allowlist de proxy mal configurada pode bloquear dev legítimo ou permitir forjar host. | Testar peer imediato via `req.socket.remoteAddress`; testar `X-Forwarded-Host`/`X-Forwarded-For` forjados de origem fora da allowlist. |
| Revogação síncrona de sessões ao bloquear pode ser lenta em conta com muitas sessões. | Aceitar para MVP; a orquestração agora está no caso de uso (decisão 6), facilitando trocar por job assíncrono se virar problema. |

---

## Migration Plan

1. **Negócio**: Entidades, VOs, casos de uso (novos e modificados), testes unitários.
   - `StrongPasswordValidator`, `ChangePasswordUseCase`, `MandatoryPasswordChangeUseCase`.
   - Métodos em `UserAccount`: `block()`, `unblock()`, etc.
   
2. **Backend — Prisma**:
   - Modelo: Adicionar `version` em `UserAccount`; `UNIQUE(refreshTokenDigest)` em `Session`; índices.
   - Geração e aplicação de migration.
   - `runInTransactionResult` no `PrismaService`.
   
3. **Backend — Adapters e Controllers**:
   - Adapters Prisma com versionamento e compare-and-swap.
   - Controllers atualizados para dois endpoints de senha.
   - Validação de startup, DTOs, CORS.
   - Rest Client atualizado.
   
4. **Web**:
   - Middleware para proteção de rotas.
   - Formulários para troca obrigatória vs. voluntária.
   - Validação de sessão no lado cliente.
   
5. **Testes e Validação**:
   - Testes unitários, integração e E2E abrangendo concorrência, transações, isolamento.
   - Validação de OpenSpec.

**Rollback**: Cada migration é reversível. Se falhar, revert migrations e redeploy código anterior.

---

## Open Questions

1. **FK composta**: Prisma suporta FK composta `(userId, bancaId)` → `UserAccount(id, bancaId)`? Se não, documentar mitigation.
   **Resolvido (Backend)**: SIM — Prisma aceitou `@@unique([id, bancaId])` em `UserAccount` + `@relation(fields: [userId, bancaId], references: [id, bancaId])` em `Session`, sem conflito com o `@id` simples existente. Migration aplicada com sucesso; validado por teste de integração que tenta inserir uma `Session` cruzando bancas via escrita direta (bypass da aplicação) e confirma rejeição pelo Postgres (`test/identity/tenant-isolation.e2e-spec.ts`). Nenhum fallback de validação em aplicação foi necessário.
2. **Versionamento vs. Lock**: Em contenção alta (> 1% de erro de versão), considerar lock pessimista? Ou aceitar error rate?
   **Observação (Backend)**: confirmado experimentalmente (`test/identity/concurrency.e2e-spec.ts`) que, como `LoginUseCase.recordLoginFailure` não faz retry no CAS e ignora o resultado do `save()` nesse ramo (decisão do domínio, fora do escopo de escrita do Backend), tentativas de login incorretas VERDADEIRAMENTE simultâneas contra a mesma versão só persistem uma escrita por rodada de contenção — as demais são descartadas silenciosamente. É o comportamento aceito pelo risco #1 acima. Tentativas sequenciais continuam bloqueando corretamente na 5ª falha. Se este risco precisar ser eliminado no futuro, a mitigação exigiria retry no `LoginUseCase` (mudança de domínio) ou lock pessimista (`SELECT ... FOR UPDATE`) no adapter — nenhuma das duas foi aplicada nesta change.
3. **Revogação assíncrona**: Bloquear conta pode ser lenta com muitas sessões? Considerar job background?
4. **Soft delete de session**: Usar `revokedAt` ou hard delete? Current design usa soft delete (revokedAt), mas poderia ser mais eficiente.
5. **Proxy em dev**: Reescrever `/api` em `next.config.js` ou usar middleware? Preferir rewrite (simpler).
6. **Rate limit HTTP**: Fora do escopo desta change? Ou adicionar rate limit na borda?

---

## Diagramas

### Fluxo de Troca de Senha

```
Usuário autenticado
    ↓
[POST /api/auth/password] (voluntária) → ChangePasswordUseCase
    ├─ Valida currentPassword (hash compare)
    ├─ Valida newPassword (força)
    ├─ Hash newPassword
    ├─ runInTransactionResult:
    │   ├─ Persistir credential nova
    │   ├─ Revogar todas as outras sessões (não a atual)
    │   ├─ Emitir novo token (currentSession, accessToken, refreshToken)
    └─ [200 + novo token]

Usuário com mustChangePassword=true
    ↓
[PATCH /api/auth/mandatory-password-change] → MandatoryPasswordChangeUseCase
    ├─ Valida token.mustChangePassword == true
    ├─ Valida newPassword (força)
    ├─ Hash newPassword
    ├─ runInTransactionResult:
    │   ├─ Persistir credential nova com mustChangePassword=false
    │   ├─ Revogar todas as outras sessões
    │   ├─ Emitir novo token (currentSession, mustChangePassword=false)
    └─ [200 + novo token] → Frontend redireciona para /dashboard
```

### Refresh Token Rotativo

```
Client com refreshToken antigo
    ↓
[POST /api/auth/refresh]
    ├─ Extrair sessionId de accessToken (ou body)
    ├─ Hash refreshToken (oldDigest)
    ├─ SELECT Session WHERE sessionId=? AND refreshTokenDigest=oldDigest
    ├─ Validar !revoked, !expired
    ├─ Gerar newRefreshToken
    ├─ Hash newRefreshToken (newDigest)
    ├─ runInTransactionResult:
    │   ├─ UPDATE Session SET refreshTokenDigest=newDigest, expiresAt=now+7d WHERE sessionId=? AND refreshTokenDigest=oldDigest
    │   ├─ Compare-and-swap: se nenhuma linha, retornar Result.fail (revogado ou já rotacionado)
    │   ├─ Emitir novo accessToken
    └─ [200 + novo accessToken + novo refreshToken]
    
Client com refreshToken já rotacionado
    ↓
[POST /api/auth/refresh]
    ├─ Hash refreshToken (oldDigest) — mismatch com DB
    ├─ SELECT Session WHERE ... AND refreshTokenDigest=oldDigest → NULL
    └─ [401 Unauthorized]
```

### Isolamento Multi-Tenant

```
Constraints na Sessão:
  - FOREIGN KEY (userId, bancaId) REFERENCES UserAccount(id, bancaId)
  - UNIQUE(refreshTokenDigest)
  - INDEX(bancaId, userId)

Garantias:
  - Sessão não pode referenciar usuário de outra banca
  - Digest não pode ser reutilizado
  - Queries por bancaId são rápidas
```

### Bloqueio com Revogação

```
Admin bloqueia usuário
    ↓
[PATCH /api/accounts/:accountId/status] { status: BLOCKED }
    ├─ Guard valida admin autorizado
    ├─ UserAccountRepository.findById(accountId, bancaId)
    ├─ account.block() → Result<UserAccount>
    ├─ runInTransactionResult:
    │   ├─ Persistir account com status=BLOCKED
    │   ├─ UPDATE Session SET revokedAt=now WHERE userId=? AND bancaId=? AND revokedAt IS NULL
    └─ [200]

Sessão revogada
    ↓
Cliente usa accessToken antigo
    ├─ Guard extrai sessionId
    ├─ SELECT Session WHERE sessionId=?
    ├─ Valida: revokedAt IS NULL → FAIL
    └─ [401 Unauthorized]
```
