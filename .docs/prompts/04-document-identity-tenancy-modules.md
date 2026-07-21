# Prompt — OpenSpec: documentação arquitetural dos módulos Identity e Tenancy

Use este prompt para criar uma **nova change OpenSpec exclusivamente de documentação** da vertical de autenticação multi-tenant já implementada no BancaFlow.

## Como usar

1. Arquive primeiro a change concluída `harden-identity-authentication-mvp`, se ela ainda estiver ativa.
2. Execute `/opsx:propose document-identity-tenancy-architecture` e forneça o conteúdo deste arquivo como descrição/instrução.
3. Revise os artefatos gerados em `openspec/changes/document-identity-tenancy-architecture`.
4. Somente depois execute `/opsx:apply document-identity-tenancy-architecture` para criar ou atualizar os READMEs.

Este arquivo é entrada para **propor** uma change. Não use seu conteúdo diretamente com `/opsx:apply` e não selecione uma change anterior por inferência.

## Change obrigatória

Crie, usando a skill `openspec-propose`, a change:

`document-identity-tenancy-architecture`

Gere todos os artefatos necessários até a change ficar pronta para aplicação:

- `proposal.md`;
- `design.md`;
- specs delta organizadas por capability de documentação;
- `tasks.md` dividido em Domínio, Backend, Web e validação final;
- validação OpenSpec estrita.

Nesta etapa de proposta, **não crie os READMEs e não altere código**. Apenas especifique e planeje.

## Objetivo

Documentar detalhadamente como a vertical Identity + Tenancy funciona de ponta a ponta, permitindo que uma pessoa que está aprendendo DDD, orientação a objetos e Arquitetura Limpa consiga:

- localizar cada responsabilidade no monorepo;
- entender por que cada módulo, agregado, entidade, Value Object, port, adapter e caso de uso existe;
- acompanhar os fluxos de autenticação e provisionamento;
- compreender as regras e invariantes do negócio;
- entender como Domínio, Backend, Prisma e Web se conectam sem inverter as dependências;
- dar manutenção sem colocar regra de negócio no controller, adapter Prisma ou componente React;
- executar e testar o projeto localmente com segurança.

A documentação deve explicar o sistema real implementado. Não produzir documentação genérica de DDD desconectada do código.

## Leitura obrigatória antes de propor a change

Leia integralmente e confronte entre si:

- `README.md`;
- `apps/backend/README.md`;
- `apps/web/README.md`;
- `.docs/prompts/01-identity-module-spec.md`;
- `.docs/prompts/02-harden-identity-authentication-mvp.md`;
- `.docs/prompts/03-fix-harden-identity-authentication-mvp.md`;
- `.docs/01-modulo-identidade.excalidraw`, se existir;
- `.docs/autenticação.excalidraw`, se existir;
- `.docs/03-guia-arquitetura-identity-tenancy.excalidraw`, se existir;
- specs-base em `openspec/specs`;
- changes arquivadas de `implement-tenancy-banca-mvp` e `implement-identity-authentication-mvp`;
- todos os artefatos de `harden-identity-authentication-mvp`;
- código-fonte e testes de `modules/identity` e `modules/tenancy`;
- código-fonte e testes de `apps/backend/src/modules/identity`, `tenancy` e `platform`;
- Prisma schema, migrations e seed relacionados;
- código-fonte e testes de `apps/web/src/modules/identity`, rotas de login/troca de senha, `proxy.ts` e infraestrutura HTTP/sessão compartilhada;
- primitives realmente utilizadas de `packages/shared`.

Não assumir que nomes ou fluxos descritos em prompts antigos continuam corretos. A implementação atual e seus testes são a evidência principal; divergências devem ser registradas na proposta.

## Artefatos de documentação esperados na futura aplicação

Criar os seguintes arquivos quando ainda não existirem:

- `modules/identity/README.md`;
- `modules/tenancy/README.md`;
- `apps/backend/src/modules/identity/README.md`;
- `apps/backend/src/modules/tenancy/README.md`;
- `apps/backend/src/modules/platform/README.md`;
- `apps/web/src/modules/identity/README.md`.

Atualizar, preservando conteúdo útil existente:

- `apps/backend/README.md`, como porta de entrada e índice dos módulos Backend;
- `apps/web/README.md`, como porta de entrada e índice da aplicação Web;
- `README.md` da raiz, somente para adicionar um índice curto apontando para a documentação detalhada, sem duplicá-la.

Se a inspeção encontrar outro módulo diretamente necessário para explicar a vertical, justificar sua inclusão no `design.md` antes de adicioná-lo ao escopo.

## Grupo 1 — Domínio: `modules/identity` e `modules/tenancy`

Os READMEs de domínio devem explicar em linguagem didática, mas tecnicamente precisa:

1. O bounded context e a responsabilidade de cada módulo.
2. Por que `Banca` pertence ao Tenancy e `UserAccount`/`Session` pertencem ao Identity.
3. Agregados, entidades e Value Objects existentes, incluindo:
   - identidade e ciclo de vida;
   - invariantes protegidas;
   - normalização;
   - métodos de domínio e transições permitidas;
   - cópias defensivas e imutabilidade prática;
   - diferença entre entidade rica e entidade anêmica.
4. Cada caso de uso público e interno:
   - finalidade;
   - entrada e saída;
   - pré-condições;
   - entidades/VOs envolvidos;
   - ports utilizadas;
   - efeitos persistidos;
   - erros esperados;
   - fronteira transacional e comportamento em rollback.
5. Contratos de repositório e demais ports, esclarecendo:
   - port de entrada versus port de saída;
   - qual lado define o contrato;
   - por que Prisma, NestJS, JWT e bcrypt não aparecem no núcleo de domínio.
6. Relação entre Identity e Tenancy no `ProvisionBanca`, sem dependência circular.
7. Regras de username por banca, papéis, status, bloqueio, senha, sessões e isolamento por `bancaId`.
8. Estrutura de pastas comentada e guia para adicionar uma nova regra corretamente.
9. Estratégia de testes unitários com fakes.

Use as skills como critérios de revisão durante a futura aplicação:

- `module-aggregate`;
- `module-entity`;
- `module-value-object`;
- `module-repository`;
- `module-use-case`;
- `module-domain-service`, apenas para explicar quando seria apropriado;
- `module-dto`, quando houver DTOs na fronteira da aplicação.

## Grupo 2 — Backend: NestJS, Prisma e integrações

Os READMEs do Backend devem documentar:

1. Papel do Backend como camada de infraestrutura/adapters da Arquitetura Limpa.
2. Composição dos módulos NestJS e direção das dependências.
3. Providers, tokens de injeção e factories que conectam ports a adapters.
4. Controllers e tabela de endpoints contendo:
   - verbo e rota;
   - autenticação/guard;
   - DTO de entrada;
   - caso de uso chamado;
   - resposta esperada;
   - principais códigos de erro, sem expor detalhes internos.
5. Guards, decorators e middleware de resolução de tenant.
6. Fluxo de `Host`/`X-Forwarded-Host`, `codigoBanca`, proxy confiável, IP/CIDR e configuração local/produção.
7. Emissão e validação de JWT, cookies, refresh token, HMAC e bcrypt, deixando clara a responsabilidade de cada mecanismo.
8. Prisma:
   - modelos e relacionamentos;
   - constraints e índices relevantes;
   - FK composta e isolamento por banca;
   - mapeamento banco ↔ domínio;
   - migrations existentes;
   - seed `farizeu`.
9. Transações com `TransactionManager`, `PrismaService` e `AsyncLocalStorage`.
10. Concorrência:
    - lock pessimista nas falhas de login;
    - versionamento otimista de conta;
    - compare-and-swap na rotação de sessão.
11. Revogação de sessões e por que a orquestração está nos casos de uso, não escondida no adapter Prisma.
12. Configurações obrigatórias e exemplos seguros, sem copiar segredos reais.
13. Como executar migrations, seed, testes unitários, integração e E2E.
14. Responsabilidade do módulo `platform` na composição do `ProvisionBanca`.

Use como critérios de revisão:

- `backend-controller`;
- `backend-prisma-data`;
- `config-prisma`, apenas para descrever a infraestrutura existente, sem recriá-la.

## Grupo 3 — Web: Next.js e experiência de autenticação

O README Web do Identity deve explicar:

1. Estrutura de `components`, `data` e `pages`.
2. Tela e formulário de login, campos, validações e tratamento de erros.
3. Por que o usuário informa apenas `username` e senha e como a banca vem do subdomínio.
4. Cliente HTTP, cookies HttpOnly, credenciais e política de silent refresh.
5. `proxy.ts` e regras de navegação:
   - visitante anônimo;
   - usuário autenticado;
   - `mustChangePassword=true`;
   - prevenção de loops de redirecionamento.
6. Fluxo de troca voluntária e troca obrigatória de senha.
7. Rewrite `/api/:path*` para o Backend em desenvolvimento e same-origin em produção.
8. Tabela de rotas públicas e privadas relacionadas ao Identity.
9. Estados de carregamento, erro e sucesso relevantes.
10. Como testar forms, proxy, cliente HTTP e integração manual local por subdomínio.
11. Como adicionar uma nova tela autenticada sem duplicar regra do Backend.

Use como critérios de revisão:

- `frontend-form-schema`, quando documentar forms e schemas;
- `config-shared-frontend`, apenas para compreender a infraestrutura compartilhada já existente, sem recriá-la.

## Diagramas obrigatórios nos READMEs

Usar diagramas Mermaid pequenos e legíveis, próximos do texto que explicam. No mínimo:

1. Diagrama de dependências da Arquitetura Limpa:
   `Web/Controller → Use Case → Port ← Adapter Prisma/Provider`.
2. Sequência de login multi-tenant.
3. Sequência de refresh com rotação do token.
4. Sequência de troca obrigatória de senha.
5. Fluxo atômico de `ProvisionBanca`.
6. Diagrama simples dos relacionamentos `Banca`, `UserAccount` e `Session`.

Não criar diagramas decorativos ou gigantes. Cada diagrama deve responder uma pergunta arquitetural concreta.

## Regras de qualidade da documentação

- Escrever em português do Brasil; manter nomes de classes, métodos, arquivos e conceitos técnicos do código em inglês.
- Começar cada README explicando responsabilidade e limite do módulo.
- Usar links relativos clicáveis para arquivos e READMEs relacionados.
- Distinguir claramente regra de negócio, regra de aplicação e detalhe de infraestrutura.
- Explicar o “porquê”, não apenas listar arquivos.
- Incluir exemplos curtos e reais, sem duplicar arquivos inteiros.
- Não documentar comportamento que não exista no código ou nos testes.
- Não expor secrets, hashes, tokens, senhas reais ou valores do `.env` local.
- Não transformar README em changelog ou relatório da implementação.
- Não copiar o mesmo conteúdo para vários READMEs: usar um documento como fonte e links nos demais.
- Evitar referências frágeis a números exatos de linha.
- Indicar explicitamente decisões de MVP e itens fora de escopo.
- Incluir seção “Erros comuns ao evoluir este módulo”.
- Incluir seção “Checklist para adicionar um novo caso de uso/endpoint/tela”.

## Estratégia de execução a registrar em `tasks.md`

Na futura aplicação, executar as três partes em agentes/subagentes com contexto limpo e escopo sem sobreposição:

1. **Domínio** — `modules/identity/**` e `modules/tenancy/**`.
2. **Backend** — `apps/backend/**`.
3. **Web** — `apps/web/**`.

Depois, o agente principal deve fazer a integração editorial: conferir links cruzados, remover duplicações, reconciliar terminologia e validar todos os diagramas.

Nenhum subagente pode alterar código de produção. O trabalho desta change é somente documentação Markdown e os artefatos OpenSpec correspondentes.

## Critérios de aceite verificáveis

A change só pode ser considerada concluída quando:

1. Todos os READMEs definidos existem e possuem links entre si.
2. Cada agregado, entidade, VO, port, adapter e caso de uso atual está documentado no lugar correto.
3. Cada endpoint atual do Identity aparece na tabela do Backend.
4. Os fluxos de login, refresh, logout, troca de senha, reset administrativo, bloqueio e provisionamento podem ser acompanhados do Web até o banco.
5. Os diagramas Mermaid renderizam sem erro.
6. Todos os links relativos locais apontam para arquivos existentes.
7. Uma busca automatizada confirma que nenhum secret real foi copiado.
8. A documentação está coerente com testes e implementação atuais.
9. Build e testes permanecem verdes, provando que a change documental não alterou comportamento.
10. `openspec validate document-identity-tenancy-architecture --strict` passa.

## Fora de escopo

- Alterar regras de negócio ou APIs.
- Refatorar classes, pastas ou nomes.
- Criar migrations ou modificar schema Prisma.
- Alterar seed ou dados do banco.
- Implementar permissões granulares, MFA ou recuperação de senha por e-mail.
- Criar documentação de módulos futuros ainda inexistentes.
- Arquivar automaticamente a nova change sem revisão humana dos READMEs.

## Resultado esperado da proposta

Ao terminar `/opsx:propose`, informar:

- nome e localização da change;
- artefatos criados;
- lista exata de READMEs planejados;
- divisão das tarefas por Domínio, Backend e Web;
- pontos que exigem confirmação humana;
- comando correto para futura aplicação: `/opsx:apply document-identity-tenancy-architecture`.
