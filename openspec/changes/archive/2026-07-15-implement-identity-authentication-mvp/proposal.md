## Why

O BancaFlow precisa de um sistema de autenticação multi-tenant funcional para que usuários possam acessar a área privada com segurança. Sem ele, nenhum fluxo operacional do produto pode ser protegido ou executado.

## What Changes

- Novo domínio de identidade em `modules/identity` com agregados `UserAccount` e `Session`, Value Objects, casos de uso, contratos de repositório e portas de infraestrutura
- Modelos Prisma para `user_account` e `session` em `apps/backend/prisma/models/identity.model.prisma`, com índice único composto `(bancaId, normalizedUsername)`
- Adapters Prisma, provider bcrypt, emissor/verificador JWT e módulo NestJS `IdentityModule` completo em `apps/backend`
- Controller REST `IdentityController` com endpoints de login, refresh, logout, logout global, listagem e revogação de sessões, redefinição de senha e gestão de conta
- Resolução de tenant via subdomínio: o backend extrai `codigoBanca` do `Host` da requisição HTTP e valida a banca antes de qualquer busca de conta
- Proteção de rotas privadas no frontend via `proxy.ts` do Next.js 16 e layout server component em `apps/web`
- Formulário de login atualizado de e-mail para `username`; fluxo público de recuperação de senha removido
- Sem seed próprio de conta `OWNER`: a banca `farizeu` e sua conta `OWNER` são criadas atomicamente pelo `ProvisionBancaUseCase` do Tenancy, na fase final de integração daquela change
- Reutilização das bases genéricas de `@bancaflow/shared`; criação no Identity somente de ports específicas do domínio
- Papel mínimo de conta (`OWNER`, `ADMIN`, `USER`) para autorizar as operações administrativas do MVP, sem implementar permissões granulares

## Capabilities

### New Capabilities

- `banca-context-resolution`: Resolução e validação do contexto de tenant a partir do subdomínio da requisição HTTP; rejeição de subdomínios reservados, inválidos, inexistentes ou de bancas inativas
- `user-account-management`: Criação de conta via `ProvisionBanca`, ativação, desativação, bloqueio, desbloqueio e gestão de status; isolamento rigoroso por `bancaId`
- `credential-management`: Hash e validação de senha com bcrypt; redefinição administrativa com senha temporária; obrigação de troca no próximo acesso; alteração voluntária de senha
- `authentication`: Login com `username` + `password` dentro do contexto de banca; contagem de falhas com bloqueio automático após 5 tentativas em 15 minutos; zeragem do contador em sucesso
- `session-management`: Criação de sessão com access token JWT (60 min) e refresh token opaco rotativo (hash no banco); múltiplas sessões por dispositivo; revogação individual e global
- `route-protection-backend`: Guard JWT no NestJS validando `bancaId` do token; rejeição de `bancaId` do body como fonte de autoridade
- `route-protection-frontend`: `proxy.ts` e layout server component Next.js 16 protegendo as URLs privadas reais; tratamento de `mustChangePassword`

### Modified Capabilities

## Impact

- **`modules/identity`**: Criação completa do domínio — entidades, Value Objects, casos de uso, contratos, testes unitários
- **`apps/backend/prisma`**: Novos modelos `UserAccount` e `Session`; migration. Sem seed de Identity separado — o seed de desenvolvimento é atômico via `ProvisionBanca` (Tenancy)
- **`apps/backend/src/modules/identity`**: Substituição completa do scaffold inicial por implementação funcional — adapters, providers, controller, módulo NestJS
- **`apps/web/src/app/login`**: Formulário de login adaptado de e-mail para `username`; remoção do link "Esqueci minha senha"
- **`apps/web/src/app/(private)`**: Layout e `apps/web/src/proxy.ts` para proteção das URLs privadas reais
- **`packages/shared`**: Reuso de `Result`, `UseCase`, `Entity`, `ValueObject`, `TransactionManager`, `Id`, `StrongPassword`, `HashPassword`, `Email` e `PersonName`; nenhuma tecnologia de infraestrutura será adicionada ao pacote
- **Dependências novas ou a verificar**: `bcrypt`, `@types/bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` no backend; o Web usa o validator `v` de `@bancaflow/shared`
- **Pré-requisito arquitetural**: uma change separada de Tenancy deve fornecer o agregado/modelo `Banca`, `codigoBanca`, status e o fluxo `ProvisionBanca` antes da aplicação das tarefas de persistência, resolução e seed desta change
- **DNS/TLS**: Wildcard `*.bancaflow.com.br` necessário em produção (não é tarefa desta spec, mas é pré-requisito operacional documentado)
