## Context

O BancaFlow é um SaaS multi-tenant para bancas físicas. Cada banca é identificada pelo subdomínio (`farizeu.bancaflow.com.br`). O Identity autentica uma conta sempre dentro do `bancaId` resolvido pelo host.

O repositório já possui scaffolds de Identity no domínio e backend, tela de login por e-mail, grupo de rotas privadas sem proteção real e bases genéricas em `@bancaflow/shared`. Ainda não existe um modelo de `Banca`; o modelo atual de bootstrap é temporário.

**Constraints:**

- `modules/identity` não importa NestJS, Prisma, bcrypt, JWT, HTTP ou cookies.
- Casos de uso implementam `UseCase<IN, OUT>`, retornam `Result<OUT>` e dependem de ports.
- `bancaId` nunca vem do body como fonte de autoridade; no login vem do host e, depois, do token validado.
- Tenancy é dono de `Banca` e `ProvisionBanca`; Identity é dono de contas, credenciais e sessões.

## Goals / Non-Goals

**Goals:**

- Autenticação multi-tenant por subdomínio.
- Sessões com access token JWT de 60 minutos e refresh token opaco rotativo de 7 dias.
- Bloqueio após 5 falhas dentro de 15 minutos e bloqueio temporário de 15 minutos.
- Redefinição administrativa com `mustChangePassword`.
- Autorização mínima por `OWNER`, `ADMIN` e `USER` nos fluxos administrativos do MVP.
- Proteção backend e frontend e seed de uma conta OWNER para a banca `farizeu` já provisionada.

**Non-Goals:**

- MFA, OAuth, SSO e recuperação pública por e-mail.
- Papéis customizados, permissões granulares e políticas configuráveis de RBAC.
- `Membership` separado; uma conta pertence a uma única banca no MVP.
- Criação do agregado/modelo `Banca` e do fluxo `ProvisionBanca`, que pertencem a uma change separada de Tenancy.
- Detecção de família/reuse de refresh token e revogação global automática.
- Configuração de rate limit na infraestrutura de borda.

## Decisions

### D1 — Credential é Value Object de UserAccount

`Credential` não tem identidade própria e contém `passwordHash`, `passwordChangedAt` e `mustChangePassword`. Trocas geram nova instância do VO.

### D2 — Session é agregado separado

Sessões têm ciclo de vida próprio. Uma conta possui múltiplas sessões, revogáveis e rotacionáveis independentemente.

### D3 — Tenancy é pré-requisito e BancaContextResolver é uma port

Identity não importa a entidade `Banca`. A port de saída `BancaContextResolver` recebe `codigoBanca` e retorna `Result<{ bancaId: string; isActive: boolean }>`. O adapter composto no backend consulta a API de leitura pública de Tenancy.

Antes de aplicar persistência, resolução de tenant e seed desta change, Tenancy deve fornecer `Banca`, código normalizado/único/estável, status e `ProvisionBanca`. Esse fluxo chama a port de entrada pública de `CreateUserAccountUseCase` para criar a primeira conta `OWNER`.

**Alternativa rejeitada:** duplicar `Banca` no Identity ou consultar tabela ainda inexistente como responsabilidade deste módulo.

### D4 — O NestJS compõe as dependências

O `IdentityModule` registra adapters concretos e factories dos casos de uso. O controller recebe casos de uso prontos por classe ou token de DI; não recebe repositórios e não executa Prisma.

Isso mantém o controller como adapter HTTP e os casos de uso dependentes apenas das ports do domínio.

### D5 — Cookies host-only

- Access token: cookie `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, TTL de 60 minutos.
- Refresh token: cookie `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/refresh`, TTL de 7 dias configurável por `REFRESH_TOKEN_TTL_DAYS`.
- Ambos são host-only, nunca vão para `localStorage` ou `sessionStorage`.

Em produção, `Secure` é obrigatório. Em HTTP local, somente `Secure` pode ser desativado por configuração de desenvolvimento.

### D6 — Next.js 16 usa proxy.ts e URLs reais

O Web usa `apps/web/src/proxy.ts`, não `middleware.ts`. O Proxy verifica presença e estado básico do cookie antes da renderização; a segurança criptográfica continua no backend. O layout server do grupo `(private)` confirma a sessão antes de renderizar.

`(private)` é route group e não aparece na URL. O matcher protege `/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas` e `/premios`. O destino padrão autenticado é `/dashboard`.

### D7 — Resolução segura do host

O backend normaliza o host, exige o sufixo configurado e rejeita `www`, `api`, `admin`, `app` e `status`. `X-Forwarded-Host` somente é autoritativo quando `TRUST_PROXY_HOST=true` e o proxy de borda é controlado. Falhas retornam resposta genérica.

### D8 — Janela de falhas faz parte de UserAccount

`UserAccount` mantém `failedLoginAttempts`, `failedLoginWindowStartedAt` e `lockedUntil`. A primeira falha abre a janela; falha após 15 minutos inicia nova janela com contador 1; a quinta falha dentro da janela define `lockedUntil = now + 15min`. Sucesso e desbloqueio limpam os três campos.

Comportamentos que alteram estado retornam `Result<UserAccount>` com nova instância, seguindo imutabilidade prática. `Clock` é injetável.

### D9 — Refresh token usa digest determinístico

O refresh token é aleatório e opaco. O banco armazena apenas HMAC-SHA-256 determinístico com segredo próprio. Isso permite localizar a sessão pelo digest. Bcrypt é exclusivo para senhas porque seu salt aleatório não serve para busca por igualdade.

No refresh, o sistema calcula o digest, valida sessão/expiração, gera novo par, substitui o digest e devolve novos cookies. O token anterior passa a retornar `401` genérico.

### D10 — Username normalizado por banca

`normalizedUsername = username.trim().toLowerCase()`. O valor original é preservado para exibição e a constraint é `UNIQUE (bancaId, normalizedUsername)`.

### D11 — Ports específicas e packages/shared

Os casos de uso são ports de entrada. As ports de saída específicas são `UserAccountRepository`, `SessionRepository`, `BancaContextResolver`, `PasswordCryptoProvider`, `RefreshTokenGenerator`, `RefreshTokenDigester`, `AccessTokenIssuer`, `Clock` e `TemporaryPasswordGenerator`. Operações assíncronas que podem falhar retornam `Result<T>`.

O módulo reutiliza `Result`, `UseCase`, `Entity`, `ValueObject`, `TransactionManager`, `Id.createUUID()`, `StrongPassword`, `HashPassword`, `Email`, `PersonName` e contratos-base compatíveis de `@bancaflow/shared`. Não recria `TransactionManager` nem `IdGenerator`. `StrongPassword` valida texto puro e `HashPassword` representa o hash; bcrypt continua no adapter de `PasswordCryptoProvider`.

A verificação/decodificação de access token pertence ao guard backend, não ao `AccessTokenIssuer`.

### D12 — Papel mínimo

`UserAccount.role` aceita `OWNER`, `ADMIN` ou `USER`. `OWNER` e `ADMIN` podem administrar contas da própria banca. `ADMIN` não pode redefinir senha, bloquear ou desativar `OWNER`. Recuperação de OWNER por administrador da plataforma fica fora desta change.

### D13 — Substituir o fluxo JWT antigo

O backend existente possui autenticação Bearer e claims antigas. A aplicação deve substituí-la ou adaptá-la para cookies e claims `{ sub, bancaId, sessionId, role, mustChangePassword }`, evitando dois sistemas concorrentes. Um DTO autenticado do Identity será usado; o DTO compartilhado atual somente será alterado após verificar todos os consumidores.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Concorrência na contagem de falhas | Transação e controle de concorrência no adapter Prisma |
| Refresh token comprometido | TTL de 7 dias, rotação, HMAC com segredo próprio e revogação explícita |
| Cookie Strict afetar ambiente local | Configuração local documentada; produção permanece Strict e Secure |
| `X-Forwarded-Host` falsificado | Aceitar somente atrás de proxy explicitamente confiável |
| Consulta de sessão a cada request | Aceito no MVP para revogação imediata; medir antes de otimizar |
| Senha temporária aparecer em logs | Nunca registrar nem persistir texto puro; devolvê-la uma única vez ao chamador autorizado |

## Migration Plan

1. Especificar e aplicar a change de Tenancy/Banca.
2. Implementar e testar `modules/identity`.
3. Criar modelos/migration de Identity.
4. Implementar adapters, providers e composição NestJS, substituindo o JWT antigo.
5. Executar seed de Tenancy e depois seed de Identity.
6. Implementar login e proteção Web com `proxy.ts`.
7. Validar integração, isolamento e rotação.
8. Executar build do monorepo.

**Rollback:** migrations destrutivas não serão usadas. Em desenvolvimento, reverter a migration específica; em produção futura, preparar SQL reversível.

## Open Questions

Não há decisão bloqueante interna ao Identity. A aplicação permanece condicionada à especificação e implementação prévia de Tenancy/Banca.
