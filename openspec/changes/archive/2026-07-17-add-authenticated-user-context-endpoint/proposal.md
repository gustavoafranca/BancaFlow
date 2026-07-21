## Why

O Web precisa exibir a identidade real do usuário logado e da banca no shell privado, mas o access token contém somente as application claims necessárias (`sub`, `bancaId`, `sessionId`, `role`, `mustChangePassword`), além das claims padrão gerenciadas pelo JWT, como `iat` e `exp`. Hoje a interface contorna essa lacuna com dados hardcoded; dados de exibição não devem ser fabricados no frontend nem adicionados ao JWT.

Falta uma leitura autenticada do contexto do próprio usuário. Esta change de backend estabelece esse contrato antes da futura spec de frontend que substituirá a identidade hardcoded e desbloqueará as tarefas 7.3/7.4 de `review-web-frontend-architecture`.

## What Changes

- Adicionar `GET /api/auth/me` ao Identity existente, protegido pelo `JwtCookieAuthGuard`, retornando somente o contexto de exibição do próprio usuário identificado pelo `AuthContext` validado.
- Definir o contrato mínimo de sucesso como `{ userId, username, name, email, role, banca: { bancaId, codigoBanca, name } }`, com `email` anulável e sem entidades ou campos internos.
- Adicionar uma projeção autenticada de Tenancy por `bancaId` para obter `codigoBanca` e `Banca.nome`; preservar sem alteração semântica a resolução pública existente por `codigoBanca`.
- Aplicar Query/CQRS às leituras de Identity e Tenancy, com interfaces `*Query`, DTOs explícitos e adapters de infraestrutura que não vazam Prisma nem entidades de domínio.
- Preservar a política de falhas já aplicada pelo guard: token inválido retorna `401 INVALID_CREDENTIALS`; sessão revogada ou expirada retorna `401 SESSION_REVOKED`; conta ausente, inativa ou bloqueada retorna `401 ACCOUNT_INACTIVE`; banca ausente ou inativa retorna `401 BANCA_INACTIVE`; troca obrigatória de senha retorna `403 MUST_CHANGE_PASSWORD`.
- Tratar ausência, divergência ou corrida detectada depois da validação do guard como falha segura de autenticação, retornando `401 INVALID_CREDENTIALS`, sem resposta parcial nem exposição da causa interna.
- Tratar falhas técnicas de Identity, Tenancy, Query ou Prisma como `500` com resposta externa genérica; códigos e detalhes técnicos ficam restritos aos logs internos e não podem ser convertidos em `400` ou `401`.
- Manter mínimas as application claims do JWT, permitir claims JWT padrão como `iat` e `exp` e deixar frontend, edição de perfil e novos módulos/bounded contexts fora do escopo.

## Capabilities

### New Capabilities
- `authenticated-user-context`: leitura autenticada do contexto de exibição do próprio usuário e da sua banca por `GET /api/auth/me`, sem enumeração, IDs fornecidos pelo cliente ou vazamento de entidades.

### Modified Capabilities
- `banca-context-query`: adicionar uma consulta autenticada e mínima por `bancaId` para composição do contexto do usuário, preservando o requisito público existente de resolução por `codigoBanca`.

## Impact

- **Domínio/aplicação:** novos contratos Query/CQRS e DTOs de leitura em Identity e Tenancy; a capability permanece no Identity, enquanto `Banca`, `codigoBanca`, `nome` e status continuam pertencendo ao Tenancy.
- **Backend:** adapters de query, composição no `IdentityModule`, nova rota `GET /api/auth/me` no `IdentityController` e tradução simétrica das falhas técnicas de Identity e Tenancy para erro interno seguro; não é necessário criar módulo de domínio nem composição `platform` sem ciclo demonstrado.
- **Contrato HTTP:** o retorno `200` contém somente dados de exibição atuais da conta e da banca. `isActive` não é exposto porque o guard já rejeita conta ou banca inativa. Falhas esperadas do guard preservam seus códigos atuais; inconsistências posteriores ao guard retornam `401 INVALID_CREDENTIALS`; falhas técnicas retornam `500` genérico.
- **Web:** nenhuma alteração nesta change. Uma spec posterior consumirá o contrato depois que o backend estiver implementado, testado e estável.
- **Segurança:** `userId` e `bancaId` vêm exclusivamente do contexto autenticado; o endpoint não consulta outro usuário, não aceita identificadores do cliente e não adiciona dados de exibição às application claims do JWT. A cobertura deve comprovar os códigos do guard, as corridas pós-guard, a separação entre falhas esperadas e técnicas e o conteúdo dos tokens de login e refresh.
