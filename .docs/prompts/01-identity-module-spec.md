# Prompt — OpenSpec do módulo Identity

Quero criar uma proposta OpenSpec completa para o primeiro módulo do BancaFlow: **Identity / Autenticação multi-tenant**.

## Modo de execução desta solicitação

Nesta primeira execução, faça **somente a especificação**:

1. Leia integralmente:
   - `.docs/01-modulo-identidade.excalidraw`
   - `.docs/autenticação.excalidraw`
   - `README.md`
   - `openspec/config.yaml`
   - a estrutura existente de `modules/identity`, `apps/backend` e `apps/web`;
2. Use a skill `openspec-propose` para criar a mudança `implement-identity-authentication-mvp`;
3. Gere todos os artefatos exigidos pelo OpenSpec, incluindo proposta, design, especificações e tarefas, até a mudança ficar pronta para aplicação;
4. Não implemente código durante a criação da proposta;
5. Não execute migrations, seed ou alterações no banco nesta etapa;
6. Não invente decisões de negócio que contradigam este prompt. Se faltar uma decisão essencial, registre-a claramente no design e pergunte antes da aplicação.

O plano de implementação gerado em `tasks.md` deve ser dividido obrigatoriamente em três grupos: **Negócio**, **Backend** e **Web**.

## Contexto do produto

O BancaFlow é um ERP SaaS operacional para bancas físicas. Não é uma plataforma de apostas online. O projeto usa:

- Monorepo TurboRepo;
- TypeScript;
- domínio em `modules/*`;
- backend NestJS em `apps/backend`;
- Prisma com PostgreSQL;
- frontend Next.js 16 e React 19 em `apps/web`;
- arquitetura limpa, DDD, agregados, entidades, Value Objects, casos de uso e repositórios desacoplados;
- `Result` e demais bases compartilhadas de `@bancaflow/shared`.

O módulo `modules/identity` já existe como estrutura inicial. Não recrie o módulo se ele estiver presente.

## Decisões de negócio já aprovadas

Estas decisões são requisitos, não sugestões:

1. `UserAccount` nasce com status `ACTIVE`; não haverá confirmação de e-mail no MVP.
2. O e-mail é opcional, não é identificador de login e não precisa ser único.
3. Somente o fluxo `ProvisionBanca` pode criar a primeira conta da banca no MVP. Não existe cadastro público.
4. Cada `UserAccount` pertence a exatamente uma banca e possui credencial própria daquela banca.
5. A mesma pessoa em bancas diferentes terá contas, senhas, sessões e bloqueios independentes.
6. O `username` pode repetir entre bancas, mas deve ser único dentro da mesma banca: `UNIQUE (bancaId, normalizedUsername)`.
7. A banca é identificada pelo subdomínio. Exemplo: `farizeu.bancaflow.com.br` resulta em `codigoBanca = farizeu`.
8. O frontend de login solicita somente `username` e `password`; o `codigoBanca` vem do host da requisição.
9. O backend resolve `codigoBanca -> bancaId`, valida que a banca está ativa e somente depois procura a conta por `(bancaId, normalizedUsername)`.
10. O access token dura 60 minutos.
11. O refresh token é opaco, rotativo e armazenado somente como hash.
12. São permitidas múltiplas sessões, idealmente uma por dispositivo, com revogação individual e revogação de todas.
13. Após 5 falhas de login dentro de 15 minutos, a conta fica bloqueada por 15 minutos. Um login bem-sucedido zera o contador. Também deve existir rate limit na borda HTTP.
14. Não haverá MFA no MVP.
15. Não haverá recuperação pública de senha por e-mail no MVP.
16. Um administrador da banca poderá redefinir a senha de uma conta da própria banca. A senha temporária exige troca no próximo login.
17. A recuperação da conta `OWNER` exige um administrador da plataforma.
18. O token autenticado deve carregar, no mínimo, `userId`, `bancaId` e `sessionId`. Não confiar em `bancaId` enviado no body.
19. O código da banca deve ser normalizado, único e estável. Reservar subdomínios técnicos como `www`, `api`, `admin`, `app` e `status`.
20. Preferir API no mesmo host, por exemplo `https://farizeu.bancaflow.com.br/api`, com DNS e TLS wildcard `*.bancaflow.com.br`.
21. O refresh token dura 7 dias e seu valor persistido deve ser um digest determinístico HMAC-SHA-256 com segredo próprio; bcrypt é exclusivo para senhas.
22. O MVP terá papel mínimo por conta: `OWNER`, `ADMIN`, `USER`. `OWNER` e `ADMIN` administram a própria banca; `ADMIN` não administra `OWNER`. Papéis customizados e permissões granulares ficam fora do MVP.
23. `Banca` e `ProvisionBanca` pertencem ao módulo Tenancy, que deve ser especificado e implementado antes da persistência, resolução e seed do Identity. Identity não duplica o agregado `Banca`.

## Escopo funcional mínimo

A spec deve analisar e definir os contratos, regras, erros, entradas, saídas e critérios de aceite para, no mínimo:

- criação de conta pelo `ProvisionBanca`;
- autenticação dentro da banca identificada pelo host;
- criação e rotação de sessão;
- refresh de sessão;
- logout da sessão atual;
- logout de todas as sessões;
- listagem e revogação de sessões;
- alteração voluntária de senha;
- redefinição administrativa com senha temporária;
- obrigação de troca de senha no próximo acesso;
- bloqueio, desbloqueio, ativação e desativação de conta;
- contagem e expiração de tentativas inválidas;
- resolução e validação do contexto da banca;
- proteção das rotas privadas no backend e no frontend;
- isolamento rigoroso por `bancaId`.

## Negócio — `modules/identity`

Planeje esta parte usando as skills locais abaixo e leia integralmente cada `SKILL.md` e referência obrigatória antes da aplicação:

- `module-aggregate`;
- `module-entity`;
- `module-value-object`, quando necessário;
- `module-repository`;
- `module-use-case`;
- `module-dto`, quando necessário;
- `module-domain-service`, somente quando uma regra realmente não pertencer a uma entidade ou Value Object.

### Estrutura e modelagem

- Se for necessário gerar o scaffold de um agregado, use `module-aggregate` com `module = identity` e `mode = example`. O modo CRUD não representa corretamente os fluxos de autenticação.
- Modele ao menos os agregados `UserAccount` e `Session`, validando se `Credential` deve ser um Value Object interno de `UserAccount` em vez de uma entidade independente.
- `UserAccount` deve considerar: `bancaId`, `username`, nome, e-mail opcional, papel mínimo, status, hash de senha, `mustChangePassword`, `failedLoginAttempts`, `failedLoginWindowStartedAt` e `lockedUntil`.
- `Session` deve considerar: `userId`, `bancaId`, digest HMAC-SHA-256 do refresh token, expiração, revogação e metadados opcionais de dispositivo.
- Modele invariantes e comportamentos nas entidades, sem setters e sem espalhar regras de entidade pelos casos de uso.
- Defina erros de domínio estáveis e testáveis.
- Crie ou ajuste testes de entidade e casos de uso em `modules/identity/test/**`.

### Contratos

Defina interfaces mínimas e orientadas aos casos de uso, incluindo quando aplicável:

- `UserAccountRepository`, com busca por `(bancaId, normalizedUsername)`;
- `SessionRepository`;
- `PasswordCryptoProvider`;
- ports separadas para emissão de access token, geração de refresh token, digest de refresh token e geração de senha temporária; decodificação/verificação JWT não pertence ao domínio;
- `BancaContextResolver`, que recebe `codigoBanca` e devolve somente o contexto necessário sem importar a entidade `Banca` para o domínio Identity;
- `Clock`/relógio injetável para testar janelas de bloqueio e expiração;
- reutilizar `Id.createUUID()` e `TransactionManager` de `@bancaflow/shared`, sem recriá-los no Identity;
- reutilizar `Result`, `UseCase`, `Entity`, `ValueObject`, `StrongPassword`, `HashPassword`, `Email` e `PersonName` quando compatíveis.

Os contratos ficam no módulo de negócio. Tipos do NestJS, Prisma, bcrypt, request HTTP ou cookies não podem entrar no domínio.

### Casos de uso

- Casos de uso específicos de um agregado devem seguir a estrutura da skill, em `modules/identity/src/<aggregate>/use-case`.
- Se um caso de uso orquestrar mais de um agregado do próprio módulo, use `modules/identity/src/app/use-case`.
- Casos que coordenam Identity com Banca/Tenancy, como `ProvisionBanca`, não devem ser colocados dentro de um agregado. A spec deve definir a fronteira e quem será o orquestrador.
- Todo caso de uso implementa `UseCase<IN, OUT>`, retorna `Result<OUT>` e depende de interfaces, nunca de Prisma ou bcrypt diretamente.

Inclua no plano os casos de uso necessários para o escopo funcional, evitando CRUD genérico sem valor de negócio.

## Backend — `apps/backend`

Planeje esta parte usando, no mínimo:

- `backend-prisma-data`;
- `backend-controller`;
- `module-repository` para garantir que adapters implementem os contratos corretos;
- `config-prisma` apenas se a configuração existente realmente precisar de ajuste.

### Prisma e persistência

- Evolua o arquivo existente `apps/backend/prisma/models/identity.model.prisma`.
- Modele constraints e índices, especialmente a unicidade composta de `(bancaId, normalizedUsername)`.
- Defina relações, `onDelete`, nomes de tabelas e mapeamentos explicitamente no design.
- Planeje a geração e aplicação da migration Prisma e a regeneração do client.
- Implemente os adapters Prisma em arquivos terminados por `*.prisma.ts`, por exemplo `user-account.repository.prisma.ts`, com mapeamentos explícitos `toDomain` e `fromDomain` e retorno por `Result`.
- Não vaze tipos Prisma para `modules/identity`.
- Use transação para operações compostas.

### Criptografia, token e sessão

- Crie uma implementação concreta de `PasswordCryptoProvider` usando bcrypt, por exemplo `bcrypt-password-crypto.provider.ts`.
- Adicione dependências de bcrypt somente se ainda não existirem.
- Nunca armazene senha ou refresh token em texto puro.
- Defina no design a estratégia de hash, comparação e custo configurável do bcrypt.
- Defina emissão, validação e rotação dos tokens conforme as decisões aprovadas; refresh token usa HMAC-SHA-256 determinístico e TTL de 7 dias.
- Revogar ou rotacionar refresh token deve invalidar o token anterior.
- Inspecione e substitua/adapte a estratégia JWT/Bearer existente para não manter dois sistemas de autenticação concorrentes.

### Host e tenant

- O backend deve extrair o `codigoBanca` do host confiável e validar o sufixo permitido.
- Quando estiver atrás de proxy, não confiar indiscriminadamente em `X-Forwarded-Host`; documentar a fronteira de confiança.
- Não aceitar `bancaId` do body como fonte de autoridade.
- Subdomínio inválido, reservado, inexistente ou de banca inativa deve resultar em falha genérica e segura.

### Controller e injeção de dependências

- Atualize ou crie `identity.controller.ts` seguindo `backend-controller`.
- O controller chama casos de uso; não deve conter regra de negócio nem executar operações Prisma diretamente.
- Avalie explicitamente a solicitação de injetar classes `*.prisma.ts` concretas no controller.
- É aceitável que a camada NestJS/composição conheça as implementações concretas para montar os casos de uso, mas os casos de uso devem continuar dependendo das interfaces do domínio.
- Prefira registrar providers/factories no módulo NestJS e injetar o caso de uso pronto no controller quando isso reduzir acoplamento e facilitar testes.
- No `design.md`, explique objetivamente a diferença entre:
  1. controller chamar um repositório Prisma diretamente;
  2. controller construir um caso de uso com adapters concretos;
  3. módulo NestJS compor adapters e injetar um caso de uso no controller.
- Recomende uma opção com justificativa, sem adotar um padrão mais complexo apenas por formalidade.

### Testes de integração e Rest Client

- Crie cenários manuais do VS Code Rest Client em `apps/backend/src/modules/identity/identity.http`.
- O arquivo `.http` deve cobrir: login válido, senha inválida, host/banca inválida, bloqueio após tentativas, refresh, rotação, logout, acesso após revogação, redefinição administrativa e obrigação de troca de senha.
- Trate o arquivo Rest Client como roteiro de integração manual, não como substituto automático para testes unitários.
- Inclua testes automatizados de integração quando necessários para garantir persistência, transações, isolamento por banca e rotação de refresh token.

### Seed

- Crie dados determinísticos em `apps/backend/prisma/seed/data/identity.json` ou arquivos JSON equivalentes dentro dessa pasta.
- Integre o seed ao fluxo existente de `apps/backend/prisma/seed/main.ts`.
- O seed de Tenancy deve criar a banca `farizeu`; o seed de Identity cria somente a conta `OWNER` ativa e credenciais apropriadas para desenvolvimento, executando depois do seed de Tenancy.
- Não versione uma senha real ou reutilizada; use valor exclusivamente local/de desenvolvimento e documentado.
- O plano deve incluir executar o seed e verificar que a conta consegue autenticar.

## Web — `apps/web`

Antes da aplicação, leia `apps/web/AGENTS.md` e a documentação local relevante do Next.js 16 dentro de `apps/web/node_modules/next/dist/docs/`.

Use a skill `frontend-form-schema`, adaptando os paths antigos da skill para o aplicativo real `apps/web`.

### Login

- Inspecione e reutilize o que já existe em `apps/web/src/app/login` antes de criar novos componentes.
- O formulário atual usa e-mail; planeje a alteração para `username` e `password`.
- Remova ou desative o fluxo público "Esqueci minha senha" no MVP, pois D9 definiu redefinição administrativa.
- Aplique validação tipada e mensagens acessíveis.
- Não peça `codigoBanca` no formulário: ele vem do subdomínio.
- Defina comportamento claro para domínio raiz, subdomínio inválido e banca inativa.

### Sessão e proteção de rotas

- Defina um cliente HTTP e o contrato de sessão sem duplicar regras do backend.
- Não armazene refresh token em `localStorage`.
- O design deve decidir e justificar armazenamento e transporte de access/refresh token, preferindo cookie seguro, `HttpOnly`, `Secure`, `SameSite` e escopo host-only quando compatível com a arquitetura.
- Crie proteção para as rotas do grupo privado.
- Se usar um component guard, ele serve para UX e navegação; a segurança real continua no backend.
- Use `apps/web/src/proxy.ts` conforme Next.js 16 e proteção no layout server, evitando flash de conteúdo privado. Não crie `middleware.ts`.
- O route group `(private)` não aparece na URL. O matcher deve usar as URLs reais (`/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas`, `/premios`) e o redirect autenticado padrão deve ser `/dashboard`.
- Trate estados de carregamento, erro de credencial, bloqueio temporário, sessão expirada e `mustChangePassword`.
- Referencie corretamente as rotas de login, troca obrigatória de senha e área privada.

### Verificação Web

- Planeje lint, typecheck e build do `apps/web`.
- Preserve o design existente da tela sempre que possível.
- Não refaça componentes visuais que já atendem ao fluxo.

## Estratégia obrigatória de subagentes durante a aplicação

> IMPORTANTE: ao executar a futura fase de implementação, use exatamente três subagentes separados e com contexto limpo. Esta regra não autoriza implementação durante a criação da spec.

### Subagente 1 — Negócio

- Contexto fornecido: artefatos OpenSpec aprovados, decisões de domínio e skills de `module-*` relevantes.
- Escopo de escrita: `modules/identity/**`.
- Não pode alterar backend ou web.
- Deve finalizar e validar contratos, entidades, casos de uso e testes antes da integração do backend.

### Subagente 2 — Backend

- Contexto fornecido: artefatos OpenSpec aprovados e contratos públicos finalizados pelo subagente de Negócio.
- Escopo de escrita: `apps/backend/**`.
- Não pode alterar `modules/identity` sem reportar incompatibilidade ao agente principal.
- Responsável por Prisma, adapters, bcrypt, tokens, controller, migrations, Rest Client, testes de integração e seed.

### Subagente 3 — Web

- Contexto fornecido: artefatos OpenSpec aprovados e contrato HTTP definido no design/spec.
- Escopo de escrita: `apps/web/**`.
- Não pode alterar negócio ou backend.
- Responsável por login, validações, consumo da API, sessão, troca obrigatória de senha e proteção de rotas.

Os subagentes devem receber somente o contexto necessário à sua parte, sem histórico amplo da conversa. A execução pode ser sequencial quando houver dependência: Negócio primeiro; Backend e Web depois que contratos de domínio e HTTP estiverem definidos. O agente principal é responsável pela integração final, resolução de incompatibilidades e validação completa do monorepo.

## Critérios de aceite obrigatórios da spec

A proposta OpenSpec somente estará pronta quando definir cenários verificáveis para:

1. `farizeu.bancaflow.com.br` resolver a banca correta;
2. a mesma combinação de username existir em duas bancas diferentes;
3. username duplicado dentro da mesma banca ser rejeitado;
4. login nunca consultar conta fora do `bancaId` resolvido pelo host;
5. conta ativa autenticar com senha válida;
6. falha de senha não revelar se banca ou username existem;
7. quinta falha na janela definida bloquear a conta;
8. bloqueio expirar após 15 minutos;
9. login bem-sucedido zerar tentativas;
10. access token expirar em 60 minutos;
11. refresh token ser rotacionado e o anterior deixar de funcionar;
12. logout e revogação invalidarem a sessão correspondente;
13. logout global invalidar todas as sessões da conta;
14. administrador não conseguir redefinir conta de outra banca;
15. senha temporária exigir troca antes de acessar a área privada;
16. `bancaId` do body não conseguir sobrescrever o tenant autenticado;
17. rotas privadas do frontend não exibirem conteúdo sem sessão válida;
18. seed de desenvolvimento permitir login completo no tenant `farizeu`.

## Validações finais da futura implementação

O `tasks.md` deve incluir comandos reais existentes no projeto para:

- testes e build de `modules/identity`;
- validação, geração e migration do Prisma;
- execução do seed;
- testes, lint e build do backend;
- lint, typecheck quando disponível e build do web;
- validação final do OpenSpec.

Não marque uma tarefa como concluída apenas porque o arquivo foi criado. Cada parte precisa ser verificada proporcionalmente ao risco, e qualquer comando indisponível deve ser reportado claramente.
