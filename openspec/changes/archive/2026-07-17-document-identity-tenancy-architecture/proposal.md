## Why

A vertical de autenticação multi-tenant (Identity + Tenancy) já está implementada, endurecida e coberta por testes, mas não existe documentação que explique **por que** cada peça existe nem **como** Domínio, Backend, Prisma e Web se conectam sem inverter as dependências. Sem isso, quem está aprendendo DDD, orientação a objetos e Arquitetura Limpa não consegue localizar responsabilidades, acompanhar os fluxos de autenticação/provisionamento nem dar manutenção sem vazar regra de negócio para controllers, adapters Prisma ou componentes React. Esta change cria a documentação de referência da vertical, fiel ao código real e aos testes atuais.

## What Changes

- Criar READMEs de domínio: `modules/identity/README.md` e `modules/tenancy/README.md`, explicando bounded contexts, agregados (`UserAccount`, `Session`, `Banca`), Value Objects, ports, casos de uso, invariantes, fronteiras transacionais e estratégia de testes com fakes.
- Criar READMEs de backend: `apps/backend/src/modules/identity/README.md`, `apps/backend/src/modules/tenancy/README.md` e `apps/backend/src/modules/platform/README.md`, documentando a camada de infraestrutura/adapters, composição NestJS, tokens de injeção, tabela de endpoints, guards/middleware, resolução de tenant, JWT/cookies/refresh/HMAC/bcrypt, Prisma, transações, concorrência e o papel do `platform` no `ProvisionBanca`.
- Criar README de web: `apps/web/src/modules/identity/README.md`, documentando estrutura, login, cliente HTTP, `proxy.ts`, troca voluntária vs. obrigatória de senha, rewrites `/api/:path*`, rotas públicas/privadas e como testar.
- Atualizar (preservando conteúdo útil): `apps/backend/README.md` e `apps/web/README.md` como índices/portas de entrada dos módulos; `README.md` da raiz apenas com um índice curto apontando para a documentação detalhada.
- Adicionar diagramas Mermaid pequenos e específicos nos READMEs: dependências da Arquitetura Limpa, sequência de login multi-tenant, sequência de refresh com rotação, sequência de troca obrigatória de senha, fluxo atômico de `ProvisionBanca` e relacionamentos `Banca`/`UserAccount`/`Session`.
- Registrar divergências entre prompts antigos e a implementação atual (ex.: `proxy.ts` em vez de `middleware.ts`; ausência de endpoint HTTP para `ProvisionBanca`; símbolos exportados porém não usados no Web).
- **Não** alterar código de produção, schema Prisma, migrations, seed ou APIs. Escopo estritamente documental (Markdown + artefatos OpenSpec).

## Capabilities

### New Capabilities

- `domain-module-documentation`: Requisitos de conteúdo e precisão dos READMEs de domínio (`modules/identity`, `modules/tenancy`) — agregados, entidades, VOs, ports, casos de uso, invariantes, isolamento por `bancaId`, relação com `ProvisionBanca` e estratégia de testes.
- `backend-module-documentation`: Requisitos dos READMEs de backend (identity, tenancy, platform) e do índice `apps/backend/README.md` — composição NestJS, tokens/factories, tabela de endpoints, guards/middleware, resolução de tenant, mecanismos de credencial, Prisma, transações, concorrência e composição do `ProvisionBanca`.
- `web-module-documentation`: Requisitos do README de web (`apps/web/src/modules/identity`) e do índice `apps/web/README.md` — estrutura, login, cliente HTTP, `proxy.ts`, fluxos de senha, rewrites, rotas e testes do frontend.
- `architecture-diagrams`: Requisitos dos diagramas Mermaid obrigatórios, cada um respondendo a uma pergunta arquitetural concreta e renderizando sem erro.
- `documentation-quality`: Requisitos transversais de qualidade e critérios de aceite verificáveis — pt-BR com termos técnicos em inglês, links relativos válidos, distinção entre regra de negócio/aplicação/infraestrutura, ausência de secrets, seções obrigatórias, e garantia de que build e testes permanecem verdes (a change é documental).

### Modified Capabilities

<!-- Nenhuma. Esta change não altera requisitos comportamentais; os specs de comportamento existentes em openspec/specs permanecem inalterados. -->

## Impact

- **Arquivos criados (documentação)**: `modules/identity/README.md`, `modules/tenancy/README.md`, `apps/backend/src/modules/identity/README.md`, `apps/backend/src/modules/tenancy/README.md`, `apps/backend/src/modules/platform/README.md`, `apps/web/src/modules/identity/README.md`.
- **Arquivos atualizados (documentação)**: `apps/backend/README.md`, `apps/web/README.md`, `README.md` (raiz, apenas índice curto).
- **Código de produção**: nenhum alterado. Sem mudanças em schema Prisma, migrations, seed, DTOs, controllers, use cases ou APIs.
- **Build/testes**: devem permanecer verdes exatamente como estão; a change é validada também por `openspec validate document-identity-tenancy-architecture --strict`.
- **Público-alvo**: pessoas aprendendo DDD/OO/Arquitetura Limpa e mantenedores da vertical Identity + Tenancy.
- **Fora de escopo**: alterar regras/APIs, refatorar nomes/pastas, migrations/seed, permissões granulares, MFA, recuperação por e-mail, documentar módulos ainda inexistentes e arquivar a change sem revisão humana dos READMEs.
