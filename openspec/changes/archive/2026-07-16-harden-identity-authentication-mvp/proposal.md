## Why

O MVP de Identity e Tenancy foi implementado com escopo mínimo viável, mas expõe incoerências críticas e riscos de segurança que comprometem a confiabilidade em produção:

1. **Contrato incoerente de troca de senha**: A tela de troca obrigatória envia apenas a nova senha, enquanto o caso de uso exige sempre a senha atual — uma inconsistência que permite falhas silenciosas e loops de redirecionamento.
2. **Falta de política de senha no domínio**: Força de senha é validada principalmente no Web; não existe regra autoritativa no Backend.
3. **Transações sem semântica clara**: Casos de uso retornam `Result.fail` sem garantir rollback — alterações podem ser confirmadas mesmo em falha de negócio.
4. **Vulnerabilidade a condições de corrida**: Login e refresh token não possuem proteção contra logins simultâneos ou refresh tokens reutilizados.
5. **Isolamento de tenant ineficaz**: Confiança apenas em filtros de aplicação, sem constraints no banco.
6. **Bloqueio/desativação sem efeito imediato**: Bloquear ou desativar uma conta não revoga sessões já emitidas.
7. **Proteção de rotas fraca no Web**: Decodificar JWT no cliente sem validar assinatura ou estado de sessão no servidor.
8. **Roteamento ambíguo**: Web usa caminhos relativos `/api` sem definição clara de proxy/rewrite em desenvolvimento e produção.
9. **Composição circular**: Identity e Tenancy possuem dependência cíclica via `ProvisionBanca`.
10. **Configuração insegura**: Backend não valida secrets em startup; DTOs aceitam entrada sem validação; erros Prisma vazam para o cliente.
11. **Invariantes não protegidas**: Datas, contadores e estados de entidades podem violar regras de negócio sem verificação no banco.

Este change endurece o MVP corrigindo essas incoerências, garantindo coerência ponta a ponta, segurança sob falhas e concorrência, e fidelidade aos princípios de DDD, Arquitetura Limpa e isolamento multi-tenant.

## What Changes

- **Troca de senha**: Dois fluxos explícitos — voluntária (exige senha atual) e obrigatória pós-reset (autorizada por estado confiável do servidor, revoga sessões antigas, emite novo token sem loop).
- **Política de senha**: Validação autoritativa no domínio/aplicação, rejeitando senha fraca em criação, troca e reset administrativo; Web replica apenas para feedback.
- **Transações por Result**: Helper `runInTransactionResult` ou equivalente que garante rollback quando falha ocorre após escrita.
- **Concorrência segura**: Logins simultâneos usam versionamento otimista ou lock; refresh token é de uso único com digest único no banco; operação atômica compare-and-swap para rotação.
- **Isolamento multi-tenant**: Sessão referencia conta por `(userId, bancaId)`; banco rejeita violações; constraints e índices protegem.
- **Bloqueio imediato**: Bloquear/desativar revoga sessões na mesma transação; novo login se torna obrigatório.
- **Proteção Web real**: Validação autoritativa de expiração e autenticidade no servidor; refresh seguro; nenhum flash de conteúdo privado; comportamento determinístico em logout, bloqueio, expiração e inatividade de banca.
- **Roteamento claro**: Produção usa mesma origem; desenvolvimento reescreve proxies de forma segura; variáveis de ambiente documentadas; host/X-Forwarded-Host preservados com confiança explícita; testes abrangem subdomínios.
- **Composição desacoplada**: Orquestração de Identity e Tenancy sai de ambos os módulos para uma composition root; dependências apontam para domínio/aplicação.
- **Segurança em startup**: Backend falha se secrets ausentes/fracos/iguais; CORS whitelist configurável; DTOs com validação runtime; erros Prisma não vazam; role obrigatório em criação.
- **Invariantes protegidas**: Cópias defensivas de datas; contadores não-negativos; transições por métodos; constraints e checks no banco; nenhuma entidade anêmica.

## Capabilities

> Regra de modelagem: endurecimentos de comportamento existente entram como **MODIFIED** nas capabilities-base já sincronizadas em `openspec/specs`; apenas conceitos genuinamente novos e independentes entram como **ADDED**. Cada arquivo de delta em `specs/**` corresponde exatamente a um item abaixo.

### New Capabilities

- `transaction-consistency`: Transação com semântica de `Result` (`runInTransactionResult`) garantindo rollback quando uma falha de negócio ou etapa posterior ocorre após uma escrita; documenta quais falhas revertem e quais persistem (ex.: contador de tentativas).
- `security-configuration`: Backend falha no startup se `JWT_SECRET`/`REFRESH_TOKEN_SECRET` ausentes, fracos ou iguais; CORS por allowlist; DTOs com validação runtime; `role` obrigatório no DTO de criação.
- `request-routing-and-proxy`: Same-origin em produção; rewrite seguro `/api` → backend em desenvolvimento com preservação controlada do host; testes cobrindo produção e ambiente local.

### Modified Capabilities

- `authentication`: Incremento atômico (versionamento otimista) do contador de falhas; cinco falhas concorrentes bloqueiam corretamente; contador persiste mesmo em falha; emissão de token e contador atômicos.
- `credential-management`: Dois fluxos explícitos — troca voluntária (exige senha atual) e troca obrigatória (autorizada por estado confiável do servidor); política de força de senha autoritativa no domínio (criação/troca/reset + senha temporária forte); revogação de sessões e emissão de novo token sem loop, tudo transacional.
- `session-management`: Rotação de refresh token de uso único via compare-and-swap atômico com `UNIQUE(refreshTokenDigest)`; FK composta `(userId, bancaId)`; revogação imediata de sessões ao bloquear/desativar; invariantes de data.
- `user-account-management`: `role` sempre explícito (default `USER`, nunca `OWNER`); senha fraca rejeitada na criação; bloqueio/desativação revoga sessões e reativação exige novo login; constraints e índices multi-tenant e de enum no banco; invariantes de contador/data e transições por métodos.
- `route-protection-backend`: Guard valida assinatura e expiração do JWT e o estado da sessão/conta/banca no servidor a cada requisição; erros de persistência não vazam ao cliente.
- `route-protection-frontend`: Proteção via `proxy.ts` (não `middleware.ts`); nenhum flash de conteúdo privado; `/trocar-senha` protegida; prevenção de loop; refresh seguro; validação autoritativa permanece no backend.
- `banca-context-resolution`: `X-Forwarded-Host` só é aceito com `TRUST_PROXY_HOST=true` vindo de proxy da allowlist; host forjado é rejeitado com falha genérica.
- `provision-banca`: `role: 'OWNER'` explícito; orquestração cross-context em composition root externa, eliminando dependência circular/`forwardRef`; atomicidade sob transação com `Result`.
- `banca-aggregate`: `codigoBanca` armazenado normalizado e autoritativo; erro próprio para nome de banca inválido; transições por métodos; enum/check de `BancaStatus` no banco.

## Impact

**Código impactado**:
- `modules/identity/src/**`: Entidades, VOs, casos de uso, ports.
- `modules/tenancy/src/**`: Agregado Banca, `ProvisionBanca`, composition.
- `apps/backend/prisma/**`: Models, migrations, constraints.
- `apps/backend/src/modules/**`: Adapters Prisma, providers, controllers, módulo de composição.
- `apps/web/src/**`: Formulários, sessão, proxy, validação.

**APIs afetadas**:
- `POST /api/auth/login`: Comportamento de erro idêntico em falha de senha/username/banca.
- `PATCH /api/auth/password`: Dois fluxos distintos (voluntário vs. obrigatório); revogação de sessões conforme política.
- `POST /api/auth/refresh`: Refresh token rotacionado atomicamente; anteriormente revogado não funciona.
- Controllers de gerenciamento de conta: Bloqueio/desativação revoga sessões.

**Dependências**:
- Nenhuma adição; validação forte de secrets existentes em startup.

**Testes**:
- Novos cenários para ambos fluxos de senha; concorrência; transações; isolamento multi-tenant; routing.
- Regressão de testes existentes — implementação anterior deve permanecer verde.

## Revisão v2 (pós-implementação)

A primeira implementação passou nos gates estruturais, mas uma revisão encontrou 2 P0 e vários P1 (detalhados em `.docs/prompts/03-fix-harden-identity-authentication-mvp.md` e no **Grupo 5** de `tasks.md`). Os artefatos foram atualizados para refletir as correções, com destaque para:

- **Autorização autoritativa** da troca obrigatória de senha pelo estado persistido (`account.mustChangePassword === true`), não pela mera claim/decorator (P0-1).
- **Emissão do token dentro da transação** da troca de senha, com rollback em falha (P0-2).
- **Lock pessimista** no contador de falha de login para contador exato sob concorrência (P1-3).
- **Rewrite `/api` real** no Web para o backend na porta `4000` (P1-4).
- **Allowlist de IP/CIDR** de proxy confiável para honrar `X-Forwarded-Host` (P1-5).
- **Revogação de sessões orquestrada no caso de uso**, não no adapter Prisma (P1-6, reverte a decisão 6 do design).
- **Rotação de refresh** exigindo sessão ativa no predicado (`revokedAt IS NULL AND expiresAt > now`) com `now` injetado (P1-7).
- Desvios: `role` obrigatório, `Session.rotate(now)`, `CHECK failedLoginAttempts >= 0`, encapsulamento `protected readonly` de `Entity`/`ValueObject`, testes Web obrigatórios (Jest).

**Critério de arquivamento:** a change só pode ser arquivada quando o Grupo 5 estiver completo e cada achado provado por teste comportamental.
