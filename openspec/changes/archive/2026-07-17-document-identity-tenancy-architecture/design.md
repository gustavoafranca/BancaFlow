## Context

A vertical Identity + Tenancy foi implementada e endurecida (change arquivada `harden-identity-authentication-mvp`) com boa cobertura de testes, mas sem documentação de referência. O código está distribuído em três camadas de um monorepo Turbo:

- **Domínio** (pacotes TypeScript puros): `modules/identity` (`@bancaflow/identity`) e `modules/tenancy` (`@bancaflow/tenancy`), dependendo apenas de `@bancaflow/shared`. Nenhum import de Prisma, NestJS, JWT ou bcrypt no núcleo — verificado por grep.
- **Backend** (infraestrutura/adapters + composition root NestJS): `apps/backend/**`, consumindo os pacotes de domínio como dependências.
- **Web** (Next.js 16, App Router): `apps/web/**`, com a lógica real de Identity vivendo em `app/login`, `app/trocar-senha`, `shared/api` e `shared/session` — não no placeholder `modules/identity`.

Esta change é **estritamente documental**. A fonte de verdade é a implementação atual e seus testes, não os prompts antigos (`.docs/prompts/01..03`). Divergências devem ser registradas, não replicadas.

Restrições:
- pt-BR para prosa; nomes de classes/métodos/arquivos/conceitos técnicos em inglês.
- Proibido alterar código de produção, schema Prisma, migrations, seed ou APIs.
- Proibido expor secrets, hashes, tokens ou valores de `.env` local.
- Build e testes devem permanecer verdes (prova de que a documentação não mudou comportamento).

## Goals / Non-Goals

**Goals:**
- Permitir que uma pessoa aprendendo DDD/OO/Arquitetura Limpa localize cada responsabilidade e entenda o **porquê** de cada módulo, agregado, VO, port, adapter e caso de uso.
- Tornar rastreáveis, do Web ao banco, os fluxos: login multi-tenant, refresh com rotação, logout, troca voluntária/obrigatória de senha, reset administrativo, bloqueio/desativação e provisionamento.
- Explicar a direção das dependências (inversão via ports) e por que Prisma/NestJS/JWT/bcrypt não aparecem no domínio.
- Fornecer diagramas Mermaid pequenos, cada um respondendo a uma pergunta arquitetural concreta.
- Documentar a estratégia de testes (fakes no domínio; unit/integração/e2e no backend; Jest/RTL no web).
- Registrar decisões de MVP, itens fora de escopo e divergências reais em relação a prompts antigos.

**Non-Goals:**
- Alterar regras de negócio, APIs, nomes, pastas, schema, migrations ou seed.
- Documentar módulos ainda inexistentes ou comportamento não presente no código/testes.
- Implementar permissões granulares, MFA ou recuperação de senha por e-mail.
- Arquivar a change automaticamente sem revisão humana dos READMEs.

## Decisions

### Decisão 1 — Cinco capabilities de documentação, alinhadas às camadas + transversais

Organizar os specs delta em cinco capabilities novas: `domain-module-documentation`, `backend-module-documentation`, `web-module-documentation`, `architecture-diagrams` e `documentation-quality`. As três primeiras espelham os grupos de execução (Domínio, Backend, Web); as duas últimas são transversais (diagramas e qualidade/critérios de aceite).

- **Alternativa considerada**: uma única capability `identity-tenancy-documentation`. Rejeitada porque impediria o paralelismo por subagente e misturaria critérios de aceite de camadas diferentes num só arquivo.
- **Alternativa considerada**: uma capability por README. Rejeitada por fragmentação excessiva (9 arquivos) sem ganho de clareza.

### Decisão 2 — Fonte única de conteúdo + links, sem duplicação

Cada conceito é explicado em **um** README canônico e referenciado por link relativo nos demais. A regra de negócio de domínio (invariantes, transições, isolamento por `bancaId`) mora nos READMEs de domínio; o backend referencia o domínio ao descrever adapters/endpoints; o web referencia o contrato HTTP do backend. Os índices (`apps/backend/README.md`, `apps/web/README.md`, `README.md` raiz) apontam para os detalhes, sem recopiá-los.

- **Rationale**: evita divergência futura e o anti-padrão "README como changelog". Cumpre o critério de aceite de não duplicar conteúdo.

### Decisão 3 — Três subagentes com escopo de escrita disjunto + integração editorial

Execução (na futura aplicação) em três subagentes de contexto limpo e escopo sem sobreposição: Domínio (`modules/identity/**`, `modules/tenancy/**`), Backend (`apps/backend/**`), Web (`apps/web/**`). Depois, o agente principal faz a integração editorial: confere links cruzados, remove duplicações, reconcilia terminologia e valida os diagramas. Nenhum subagente altera código de produção.

- **Rationale**: espelha a fronteira real dos módulos e o padrão já usado com sucesso na change de hardening.

### Decisão 4 — Conjunto fixo de seis diagramas Mermaid, cada um "próximo do texto"

Diagramas obrigatórios, colocados ao lado do texto que explicam:
1. Dependências da Arquitetura Limpa: `Web/Controller → Use Case → Port ← Adapter Prisma/Provider`.
2. Sequência de login multi-tenant (host → `codigoBanca` → `BancaContextResolver` → conta → sessão → tokens).
3. Sequência de refresh com rotação do token (compare-and-swap).
4. Sequência de troca obrigatória de senha (autorização pela flag persistida + reemissão de token na transação).
5. Fluxo atômico de `ProvisionBanca` (composição no `platform`).
6. Relacionamentos `Banca`, `UserAccount`, `Session` (ER simples, incluindo FK composta).

- **Rationale**: proíbe diagramas decorativos/gigantes; cada um responde uma pergunta arquitetural.

### Decisão 5 — Registrar divergências entre prompts antigos e o código atual

A documentação descreve o sistema real. Divergências relevantes encontradas na inspeção, a serem registradas explicitamente onde couber:

- **Web usa `proxy.ts`, não `middleware.ts`** (Next.js 16 modificado; ver `apps/web/AGENTS.md`).
- **`ProvisionBanca` não tem endpoint HTTP** no MVP — é exercitado apenas pelo seed (`prisma/seed/tasks/provision-farizeu.seed.ts`) e por teste e2e.
- **Duas pilhas de auth no backend**: os endpoints Identity usam `JwtCookieAuthGuard` (guard autoritativo); a pilha Passport `JwtGuard`/`JwtStrategy` em `shared/auth` está registrada/exportada porém **não** é usada pelas rotas Identity; `@Public()` só afeta `JwtGuard`.
- **Símbolos exportados mas não usados no Web**: `changePassword` (fluxo voluntário sem UI), `logout`, `logoutAll`, `refresh` (como função direta), `isTokenExpired`, `REFRESH_TOKEN_COOKIE`. Documentar como "suporte presente, UI não conectada no MVP".
- **`modules/identity` do Web é placeholder** (dashboard estático); a lógica real está em `app/**` e `shared/**`.
- **`app/page.tsx` (`/`)** ainda é a página inicial padrão do create-next-app.
- **Dois tokens de transação** (`TRANSACTION_MANAGER`, `TENANCY_TRANSACTION_MANAGER`) resolvem via `useExisting` para a mesma instância de `PrismaService`.
- **`Session.tryCreate`** usa a string literal `'IDENTITY.INVALID_REFRESH_DIGEST'`, que não é uma constante do catálogo `IDENTITY_ERRORS`.

- **Rationale**: cumpre a instrução de não assumir que prompts antigos continuam corretos e evita documentar comportamento inexistente.

### Decisão 6 — Skills como critérios de revisão, não como geradores

As skills (`module-aggregate`, `module-entity`, `module-value-object`, `module-repository`, `module-use-case`, `module-domain-service`, `module-dto`, `backend-controller`, `backend-prisma-data`, `config-prisma`, `frontend-form-schema`, `config-shared-frontend`) são usadas como **checklists de revisão** durante a aplicação, para conferir se cada peça documentada está no lugar certo e descrita corretamente — não para recriar infraestrutura.

### Decisão 7 — Precisão factual sobre completude decorativa

Preferir exemplos curtos e reais (assinaturas de método, nomes de tokens, rotas) a blocos copiados inteiros. Evitar referências frágeis a números de linha. Ancorar afirmações no código e nos testes; quando um comportamento só existe em teste (ex.: rollback simulado), citar o teste correspondente.

## Risks / Trade-offs

- **Documentação diverge do código com o tempo** → Mitigação: fonte única + links; ancorar em nomes estáveis (classes, tokens, rotas) e não em linhas; incluir seção "Erros comuns ao evoluir este módulo" que force revisão junto com mudanças de código.
- **Subagentes duplicam conteúdo nas fronteiras** → Mitigação: escopo de escrita disjunto + passo final de integração editorial do agente principal (Decisão 3) para remover duplicações e reconciliar termos.
- **Diagramas Mermaid com erro de sintaxe passam despercebidos** → Mitigação: critério de aceite exige render sem erro; validar cada diagrama na integração final.
- **Vazamento acidental de secret** (ex.: senha do seed `Dev@Farizeu123`, `dev-refresh-secret`) → Mitigação: documentar mecanismos sem colar valores reais; busca automatizada por secrets nos critérios de aceite; tratar valores de seed/dev como placeholders explicitamente marcados como não-produtivos.
- **Links relativos quebrados entre READMEs e arquivos** → Mitigação: critério de aceite verifica que todo link relativo local aponta para arquivo existente; conferência na integração final.
- **Change documental altera comportamento por engano** → Mitigação: proibição de tocar código de produção; build + testes devem permanecer verdes como gate.

## Migration Plan

Não há migração de dados nem de schema. Passos de entrega (na futura aplicação via `/opsx:apply`):

1. Subagente Domínio cria `modules/identity/README.md` e `modules/tenancy/README.md`.
2. Subagente Backend cria os três READMEs de `apps/backend/src/modules/**` e atualiza `apps/backend/README.md`.
3. Subagente Web cria `apps/web/src/modules/identity/README.md` e atualiza `apps/web/README.md`.
4. Agente principal atualiza o `README.md` raiz (índice curto), faz a integração editorial (links, duplicações, terminologia), valida diagramas e roda build/testes + `openspec validate --strict`.

Rollback: por ser documentação, reverter é remover/descartar os arquivos Markdown criados/alterados (via git), sem impacto em runtime.

## Open Questions

- Confirmar com revisão humana se símbolos "presentes mas não usados" (ex.: `changePassword` sem UI, `logout`/`logoutAll`) devem ser documentados como "trabalho futuro" ou omitidos — a proposta assume documentá-los como suporte presente/UI não conectada.
- Confirmar se a página raiz do Web (`/`, ainda o starter do create-next-app) deve ser mencionada como pendência ou ignorada na documentação da vertical.
