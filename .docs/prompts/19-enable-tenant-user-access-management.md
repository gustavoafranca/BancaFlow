# Prompt — Propor administração de usuários por papéis fixos e logout unificado

## Missão

Crie uma **change OpenSpec completa, coerente e pronta para implementação** para tornar o menu **Configurações** funcional na primeira versão, permitindo que o `OWNER` administre as contas de usuário da própria banca com os campos e estruturas que já existem, mantendo a autorização baseada nos papéis fixos `OWNER`, `ADMIN` e `USER`.

Inclua também a unificação da experiência de logout em um único modal.

Esta execução é exclusivamente de **planejamento e especificação**. Não implemente código de produto nesta etapa.

Nome sugerido para a change:

```text
enable-tenant-user-administration
```

## Decisão de escopo já aprovada

Esta é a **primeira versão** da administração de usuários e permissões.

Ela deve:

- usar somente as tabelas, colunas e relações já existentes;
- administrar contas usando os campos atuais de `UserAccount`;
- manter permissões fixas por papel no catálogo em código;
- permitir trocar o papel administrativo permitido de uma conta;
- exibir a matriz de permissões por papel apenas para consulta;
- deixar permissões personalizadas por usuário para uma change futura.

Ela não deve:

- criar tabelas de banco;
- criar colunas;
- criar relações Prisma;
- criar migrações;
- persistir listas de permissões em JSON ou texto;
- reutilizar indevidamente a coluna `role` para serializar permissões;
- criar perfis de acesso persistidos;
- permitir overrides individuais de permissões;
- criar CRUD de chaves de permissão.

Se a análise identificar qualquer requisito que realmente dependa de alteração no banco, **não desenhe nem autorize a alteração**. Registre-o como dependência futura, explique por que a estrutura atual não atende e mantenha-o fora da implementação desta change.

Neste documento, “tabela” de frontend significa apenas o componente visual já existente para listar dados. Seu uso é permitido. A proibição acima se refere a novas estruturas no banco de dados.

## Como executar

1. Use a skill `openspec-propose` e leia integralmente suas instruções antes de agir.
2. Execute `openspec list` e consulte specs canônicas, changes ativas e changes arquivadas relacionadas.
3. Audite o código real de `packages/shared`, `identity`, `access-control`, backend NestJS, adapters Prisma e `apps/web` antes de propor qualquer artefato.
4. Crie uma única change com `proposal.md`, `design.md`, delta specs e `tasks.md` completos.
5. Organize as tasks em fatias verticais verificáveis.
6. Valide a change em modo estrito e corrija todas as inconsistências.
7. Pare depois de criar e validar os artefatos. **Não use `openspec-apply-change` e não altere o código do produto nesta execução.**

Caso uma regra deste prompt contrarie uma spec vigente, produza o delta necessário e registre claramente a mudança de contrato.

## Fontes obrigatórias

Leia e reconcilie, no mínimo:

- todos os `AGENTS.md` aplicáveis;
- `.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md`;
- `.docs/plans/foundation/09-access-control-and-authorization-baseline.md`, se existir;
- `.docs/prompts/12-plan-identity-profile-user-access-management.md`;
- `openspec/specs/user-account-management/spec.md`;
- specs canônicas de autenticação, sessões, tenancy e controle de acesso;
- change arquivada `enable-self-profile-management`;
- change arquivada `enable-profile-security-management`;
- change arquivada `establish-authoritative-role-permissions`;
- changes ativas que consumam permissões, especialmente cadastro de participantes/cambistas;
- `packages/shared/src/base/**`;
- `packages/shared/src/vo/**`;
- `packages/shared/src/db/**`;
- `packages/shared/src/query/**`;
- `modules/identity/**` e seus testes;
- `modules/access-control/**` e seus testes;
- `apps/backend/src/modules/identity/**`;
- `apps/backend/src/modules/access-control/**`;
- schema Prisma atual de Identity, somente para confirmar compatibilidade, sem alterá-lo;
- `apps/web/src/modules/configuracoes/**`;
- `apps/web/src/app/(private)/_shell/app-frame.tsx`;
- `apps/web/src/app/(private)/_shell/app-navbar.tsx`;
- `apps/web/src/app/(private)/_shell/app-sidebar.tsx`;
- `apps/web/src/shared/api/auth.client.ts`;
- componentes compartilhados reais de `Dialog`, `Table`, `Button`, `Input` e `Badge`;
- mecanismo real de schemas e validação de formulários no frontend;
- testes atuais dessas áreas.

Não presuma APIs descritas por uma skill quando elas divergirem do código real. O código e os testes atuais são a fonte de verdade para integração.

## Estado atual que a proposta deve reconhecer

O plano 8 foi entregue apenas parcialmente:

- perfil próprio já funciona;
- alteração de senha já funciona;
- sessões próprias podem ser consultadas e revogadas;
- logout atual e logout de todos os dispositivos já possuem APIs;
- existe um catálogo fechado de permissões e uma matriz fixa por papel;
- a tela Configurações mostra uma matriz, mas ainda não administra usuários;
- o item Configurações permanece desabilitado na navegação.

Continuam pendentes nesta primeira versão:

- listar contas da própria banca;
- cadastrar novas contas adicionais;
- consultar os dados de uma conta;
- editar os dados permitidos;
- alterar o papel entre as opções administrativas permitidas;
- ativar, bloquear ou desbloquear conta;
- redefinir senha temporária;
- consultar e revogar sessões de outra conta, se o fluxo atual suportar isso sem alterar banco;
- habilitar e proteger o menu/tela Configurações;
- unificar as duas opções de logout em um modal.

A spec canônica atual afirma que contas são criadas exclusivamente no provisionamento da banca. A change deve alterá-la explicitamente para permitir que o `OWNER` crie contas adicionais dentro da própria banca, sem confundir isso com o provisionamento de uma banca nova.

## Responsabilidade dos módulos

### Identity

`Identity` permanece dono de:

- `UserAccount` e seus invariantes;
- username, nome, e-mail, papel e status;
- credencial, senha temporária e troca obrigatória de senha;
- autenticação e sessões;
- criação administrativa de contas;
- atualização administrativa da conta;
- ativação, bloqueio e desbloqueio;
- redefinição administrativa de senha;
- consulta e revogação administrativa de sessões.

### Access Control

`Access Control` permanece necessário e dono de:

- catálogo oficial e fechado de `PermissionKey`;
- associação fixa entre papéis e permissões;
- verificação de autorização;
- exposição das permissões efetivas do ator;
- matriz de permissões por papel para consulta.

Nesta versão, Access Control **não possui agregado persistido**, repository Prisma, tabela, perfil customizado ou atribuição individual.

### Tenancy

`Tenancy` fornece o contexto e o limite da banca. Não deve absorver conta, credencial, sessão ou catálogo de permissão.

### Pessoas/Participants

O módulo de pessoas/participants não é pré-requisito. Conta de acesso não é a mesma coisa que pessoa, funcionário, cambista ou participante de negócio. Não crie dependência obrigatória entre esses conceitos nesta change.

## Uso obrigatório de `packages/shared`

Antes de criar qualquer base, validação, objeto de valor, contrato ou tipo, procure o equivalente em `@bancaflow/shared`.

Reutilize, quando aplicável:

- `Result` e `Result.combine` para sucesso/falha e agregação de validações;
- `Entity` para entidades de domínio;
- `ValueObject` para VOs realmente necessários;
- `Id` para identificadores;
- `PersonName` para nome de pessoa;
- `Email` para normalização e validação de e-mail;
- objetos de senha existentes quando seus contratos forem adequados;
- contratos compartilhados de paginação, query e repository quando compatíveis.

Não recrie em Identity ou Access Control uma versão local de `Id`, `PersonName`, `Email`, senha, paginação, `Result`, `Entity` ou `ValueObject`.

Preserve o padrão atual:

- `tryCreate` retorna `Result` e não lança;
- `create` delega para `tryCreate` e lança somente pela validação padronizada;
- entidades recebem dados já validados ou os validam por VOs;
- falhas de domínio usam códigos estáveis;
- controller não implementa regra de validação pertencente ao domínio.

Os mecanismos genéricos de erro pertencem ao pacote compartilhado. Os códigos específicos de negócio devem continuar centralizados em seus módulos:

- erros de conta e sessão em `IDENTITY_ERRORS`;
- erros de autorização em `ACCESS_CONTROL_ERRORS`.

Amplie esses catálogos somente quando um caso novo exigir um erro específico. Não espalhe strings de erro em use cases, controllers, adapters ou frontend. Não mova erros específicos de negócio para `packages/shared` apenas para centralizá-los artificialmente.

Crie um novo VO somente se existir uma invariante real não atendida pelos VOs compartilhados. Username, papel, status e credencial podem continuar como VOs locais de Identity porque carregam semântica própria do módulo. Documente qualquer novo VO e justifique por que `Text` ou outro VO compartilhado não atende.

## Papéis e regras da primeira versão

Mantenha os papéis sistêmicos existentes:

- `OWNER`: autoridade máxima; único papel que administra contas de outros usuários e acessa Configurações;
- `ADMIN`: acesso administrativo e operacional amplo, incluindo futuramente Caixa, mas não administra usuários nem permissões;
- `USER`: acesso operacional básico definido pela matriz fixa em código, sem Caixa e sem Configurações.

Para evitar ampliar o ciclo de vida de owner sem discussão:

- o owner inicial continua sendo criado pelo provisionamento da banca;
- Configurações cria apenas contas `ADMIN` ou `USER` nesta versão;
- uma conta criada por Configurações pode alternar apenas entre `ADMIN` e `USER`;
- o owner não pode ser bloqueado, rebaixado ou excluído por esse painel;
- dados do próprio owner continuam sendo alterados nos fluxos de autosserviço já existentes.

Se o código ou uma spec vigente permitir múltiplos owners de outra forma, registre a divergência, mas não amplie essa capacidade silenciosamente nesta change.

### Matriz fixa

Reconcilie o catálogo e a matriz para representar, no mínimo:

- `OWNER`: todas as capacidades atualmente existentes, incluindo administração de contas;
- `ADMIN`: operações administrativas/operacionais, sem administração de contas e acessos;
- `USER`: lançamentos, pesquisa/listagem/visualização de cambistas, relatórios operacionais e acertos, conforme as capacidades que já existirem ou estiverem especificadas; sem Caixa e sem Configurações.

Não invente chaves desconectadas de um endpoint, use case, menu ou ação real. Quando uma capacidade ainda estiver apenas planejada, registre o contrato antecipado e sua dependência no módulo consumidor.

Reconcilie changes ativas que hoje possam restringir a leitura de cambistas a `OWNER` e `ADMIN`: criação e manutenção cadastral podem continuar restritas, mas pesquisa/listagem/visualização deve contemplar o `USER` quando essa for a decisão vigente.

## Administração de contas

Projete contratos tenant-scoped e exclusivos do `OWNER` para:

- listagem paginada com busca e filtros por papel e status;
- detalhamento da conta;
- criação de conta com username, nome, e-mail opcional e papel `ADMIN` ou `USER`;
- geração segura de senha temporária;
- exigência de troca de senha no primeiro acesso;
- atualização de username, nome e e-mail conforme invariantes existentes;
- alteração entre os papéis `ADMIN` e `USER`;
- ativação, bloqueio e desbloqueio;
- redefinição de senha temporária;
- consulta e revogação de sessões da conta, reutilizando a estrutura atual;
- revogação das sessões após mudança sensível de papel, status ou senha.

Não implemente exclusão física de conta. “CRUD completo” nesta versão significa gestão completa do ciclo de vida por status.

Valide os casos de uso, entidades, VOs, repositories, queries, DTOs e adapters existentes antes de criar qualquer novo artefato. Reutilize os casos de uso existentes quando seus contratos forem adequados e extraia somente as extensões necessárias.

Separe leitura e escrita conforme o padrão atual:

- repository para persistir o agregado existente;
- query/projeção para listas paginadas;
- DTO sem vazamento de entidade ou Prisma;
- controller fino, com guard, permissão e tradução consistente de erros HTTP.

A criação da query de listagem ou de métodos novos no adapter Prisma é permitida porque utiliza a tabela atual. Alterar o schema Prisma não é permitido.

O `bancaId` deve vir do contexto autenticado. Nunca aceite um tenant arbitrário do body/query para ampliar escopo. Toda busca, escrita e verificação precisa impedir acesso cruzado entre bancas.

## Permissões administrativas necessárias

Amplie o catálogo fechado em código apenas com chaves efetivamente aplicadas, equivalentes a:

- listar contas;
- visualizar conta;
- criar conta;
- atualizar conta;
- trocar papel;
- alterar status;
- redefinir senha;
- consultar sessões de uma conta;
- revogar sessões de uma conta;
- consultar a matriz fixa de papéis e permissões.

As capacidades de administrar contas devem pertencer somente ao `OWNER`.

Não crie endpoints para cadastrar, editar ou excluir chaves de permissão. Chaves são contratos de código e só existem quando há enforcement correspondente no backend.

O endpoint equivalente a `/api/access-control/me/permissions` deve continuar sendo a fonte das permissões efetivas para o frontend. Como a autorização continua fixa por papel, não há necessidade de consultar banco para resolver permissões.

## Tela Configurações

Habilite o item **Configurações** somente para quem possuir a permissão correspondente — inicialmente, apenas `OWNER`.

A proposta deve preservar o design existente e especificar:

### Usuários

- listagem visual usando o componente `Table` atual;
- busca, paginação e filtros;
- nome, username, papel, status e ações;
- estados de carregamento, vazio, erro e sem permissão;
- criação de usuário;
- edição de dados;
- troca entre `ADMIN` e `USER`;
- ativação, bloqueio e desbloqueio com confirmação;
- redefinição de senha temporária com apresentação segura do resultado;
- consulta/revogação de sessões quando fizer sentido no fluxo;
- feedback de sucesso e erro;
- prevenção de envio duplicado.

### Permissões

- manter a matriz de permissões por papel para consulta;
- apresentar rótulos e descrições humanas em português;
- deixar claro que a matriz é fixa nesta versão;
- não mostrar checkboxes editáveis;
- não criar formulário de perfil de acesso;
- não permitir atribuição individual de permissões;
- não sugerir visualmente uma ação que o backend não suporta.

### Reuso frontend

- reutilize `Dialog`, `Table`, `Button`, `Input`, `Badge` e demais componentes atuais;
- preserve cores, tipografia, espaçamento, responsividade e linguagem visual;
- não adicione outra biblioteca visual;
- mantenha a página fina;
- coloque clients, hooks, schemas, forms e componentes no módulo `configuracoes`;
- reutilize o mecanismo real de formulários e validação do projeto;
- crie componente novo somente depois de provar que não existe equivalente;
- preserve acessibilidade de labels, foco, teclado, loading e mensagens de erro;
- proteja menu, rota e botões por `PermissionKey`, sem comparações espalhadas de papel.

O frontend apenas melhora a experiência. O backend permanece autoritativo. Acesso por URL direta e chamadas manuais devem receber `403` sem vazamento de dados.

## Logout unificado

Substitua as ações separadas por uma única ação chamada **Sair** em todos os pontos do shell privado, inclusive navbar e sidebar.

Ao clicar, abra um único modal acessível, reutilizando o `Dialog` atual, com:

- título e explicação curta;
- **Sair deste dispositivo**, usando a API atual de `logout`;
- **Sair de todos os dispositivos**, usando a API atual de `logoutAll`;
- **Cancelar**;
- foco inicial adequado;
- fechamento por Escape quando seguro;
- devolução de foco ao gatilho;
- estado de processamento;
- prevenção de clique duplicado;
- erro visível;
- regra explícita de redirecionamento.

O estado do modal deve ser compartilhado pelo shell para navbar e sidebar não divergirem. Não degrade a tela de segurança que lista e revoga sessões individualmente.

Especifique o comportamento quando a chamada falhar, considerando a limpeza de cookies. O redirecionamento deve seguir um contrato decidido e testado.

## Fora de escopo obrigatório

- novas tabelas, colunas, relações ou migrações;
- perfis de acesso customizados;
- permissões diferentes entre dois usuários que tenham o mesmo papel;
- atribuição individual de permissões;
- CRUD de chaves de permissão;
- persistência de permissões em JSON/texto;
- módulo de pessoas como dependência;
- editor de políticas condicionais;
- SSO, MFA ou recuperação por e-mail;
- exclusão física de contas;
- implementação do futuro Caixa;
- redesign geral do shell.

Registre como evolução futura, sem tarefas de implementação nesta change, que permissões personalizadas exigirão uma discussão específica sobre modelo e persistência antes de qualquer alteração de banco.

## Skills para a futura implementação

A `tasks.md` deve orientar o executor a usar, conforme aplicável:

- `openspec-apply-change`;
- `frontend-module-workflow`;
- `frontend-form-schema`, adaptada ao `apps/web` e às APIs reais;
- `module-entity` somente para evoluir a entidade existente;
- `module-value-object` somente se houver invariante nova não coberta por `packages/shared`;
- `module-repository`;
- `module-query-cqrs`;
- `module-use-case`;
- `module-dto`;
- `backend-controller`;
- `backend-prisma-data` apenas para adapters/queries sobre o schema existente, sem schema ou migração.

Não use:

- `module-aggregate`, pois não deve ser gerado CRUD genérico;
- `config-new-module`, pois os módulos já existem;
- `config-prisma`, pois não haverá mudança estrutural no banco;
- `config-shared-frontend`;
- importação de novo design.

Se alguma skill sugerir criar tabela, coluna, VO duplicado, componente duplicado ou estrutura incompatível com o projeto real, prevalecem este prompt, `packages/shared`, o código atual e os testes existentes.

## Testes obrigatórios

### Domínio e aplicação

- criação de `ADMIN` e `USER` pelo owner;
- rejeição de criação de novo `OWNER` pelo painel;
- validações reutilizadas de nome, e-mail, username, papel, status e senha;
- alteração de conta dentro da mesma banca;
- rejeição cross-tenant;
- admin/user proibidos de administrar contas;
- mudança de papel e status;
- redefinição de senha temporária;
- revogação de sessões após mudanças sensíveis;
- erros estáveis vindos dos catálogos dos módulos.

### Persistência e API

- queries sobre `UserAccount` existente;
- paginação, busca e filtros tenant-scoped;
- mapeamento domínio/DTO/Prisma sem novos campos;
- concorrência otimista usando `version` existente;
- guards e permissões de todos os endpoints;
- owner autorizado;
- admin/user recebendo `403`;
- isolamento entre duas bancas;
- prova automatizada de que o schema Prisma não foi alterado pela change.

### Frontend

- Configurações aparece e funciona para owner;
- Configurações fica oculta e inacessível para admin/user;
- listagem, filtros, paginação e estados de tela;
- forms de criação e edição;
- validações e erros de API;
- troca de papel refletida na matriz fixa de autorização;
- matriz somente leitura;
- nenhuma UI de perfil ou permissão individual;
- modal único de logout aberto por navbar e sidebar;
- cancelamento, teclado, foco, loading e erro;
- cada escolha de logout chama exatamente a API correspondente;
- comportamento de redirecionamento testado.

### E2E

Inclua jornadas para:

1. owner cria um usuário com senha temporária;
2. usuário entra e realiza a troca obrigatória de senha;
3. owner edita e bloqueia a conta;
4. owner troca uma conta entre `USER` e `ADMIN` e a matriz fixa passa a valer;
5. admin não vê nem acessa a administração de usuários;
6. usuário de outra banca não pode ser consultado nem alterado;
7. logout do dispositivo atual preserva outra sessão;
8. logout de todos os dispositivos invalida as demais sessões.

## Gates de qualidade

A `tasks.md` deve exigir:

- testes de `packages/shared` somente se ele realmente for alterado; preferencialmente, apenas reutilizá-lo;
- testes de `identity` e `access-control`;
- testes do backend afetado;
- testes do frontend afetado;
- testes E2E críticos;
- typecheck;
- lint;
- build;
- auditoria de componentes do frontend;
- verificação explícita de ausência de mudança no schema/migrations Prisma;
- `openspec validate --strict`.

Não aceite somente “compilou” como evidência. Cada regra de autorização deve possuir cenário positivo, negativo e cross-tenant quando aplicável.

## Saída esperada

Ao final, apresente:

1. nome e caminho da change criada;
2. resumo da parte ainda pendente do plano 8;
3. confirmação de que não foram propostas tabelas, colunas, relações ou migrações;
4. responsabilidades finais de Identity, Access Control e Tenancy;
5. elementos de `packages/shared` que serão reutilizados;
6. casos de uso, repositories, queries, DTOs e controllers que serão criados ou evoluídos;
7. matriz fixa de `OWNER`, `ADMIN` e `USER`;
8. comportamento da tela Configurações;
9. comportamento do logout unificado;
10. itens de permissões personalizadas adiados para discussão futura;
11. resultado da validação estrita.

Se a análise encontrar necessidade de nova persistência, registre-a apenas como risco ou evolução futura. Não a transforme em requisito ou tarefa desta change.
