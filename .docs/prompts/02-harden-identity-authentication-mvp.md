# Prompt — OpenSpec: endurecimento do Identity Authentication MVP

Use este prompt para criar uma **nova change OpenSpec**, somente de especificação e planejamento, destinada a corrigir e endurecer a implementação já existente dos módulos Identity e Tenancy.

## Como usar este arquivo

Este arquivo é entrada para **propor** uma change, não para aplicá-la. Não envie seu conteúdo junto de `/opsx:apply` ou `/openspec-apply-change`.

Como as changes que formam a base já estão 100% concluídas, o fluxo recomendado é:

1. `/opsx:archive implement-tenancy-banca-mvp`
2. `/opsx:archive implement-identity-authentication-mvp`
3. execute `/opsx:propose harden-identity-authentication-mvp` e forneça o conteúdo deste arquivo como descrição/instrução da proposta;
4. revise os artefatos gerados em `openspec/changes/harden-identity-authentication-mvp`;
5. somente depois da aprovação, execute `/opsx:apply harden-identity-authentication-mvp`.

Se a interface apresentar os nomes longos das skills em vez dos comandos `opsx`, use `openspec-archive-change`, `openspec-propose` e `openspec-apply-change` nas mesmas etapas.

Não deduza nem selecione `implement-identity-authentication-mvp` como change a aplicar. A change que este prompt deve criar chama-se exatamente `harden-identity-authentication-mvp`.

## Comando/intenção

Crie, usando o fluxo da skill `openspec-propose`, a change:

`harden-identity-authentication-mvp`

Gere todos os artefatos necessários para que a change fique pronta para revisão e futura aplicação:

- `proposal.md`;
- `design.md`;
- specs delta organizadas por capability;
- `tasks.md` com dependências e critérios verificáveis;
- validação estrita do OpenSpec.

**Não implemente código, migration, seed, instalação de dependências ou alteração nas changes anteriores.** Nesta execução, apenas analise, proponha, documente e valide a nova change.

## Contexto obrigatório

Antes de gerar os artefatos, leia integralmente:

- `.docs/prompts/01-identity-module-spec.md`;
- `.docs/03-guia-arquitetura-identity-tenancy.excalidraw`;
- todos os artefatos de `implement-identity-authentication-mvp`, procurando primeiro em `openspec/changes/archive` e, se ainda não tiver sido arquivada, em `openspec/changes`;
- todos os artefatos de `implement-tenancy-banca-mvp`, procurando primeiro em `openspec/changes/archive` e, se ainda não tiver sido arquivada, em `openspec/changes`;
- as specs-base existentes em `openspec/specs`, se houver;
- o código realmente implementado em `modules/identity`, `modules/tenancy`, `apps/backend` e `apps/web`;
- o schema e as migrations do Prisma;
- os testes unitários, de integração e E2E relacionados.

Não presuma que uma tarefa marcada como concluída garante que a regra esteja correta. Compare **spec, implementação, persistência, interface Web e testes**.

Use os tipos corretos de delta (`ADDED`, `MODIFIED`, `REMOVED` ou `RENAMED`) de acordo com o estado real do OpenSpec. Não duplique requirements que já existem nem invente um delta incompatível com as specs-base.

## Objetivo da change

Endurecer o MVP de autenticação multi-tenant para que ele seja coerente de ponta a ponta, seguro sob falhas e concorrência e fiel a:

- DDD tático;
- orientação a objetos;
- entidades ricas, sem modelo anêmico;
- objetos de valor para conceitos e invariantes relevantes;
- agregados com fronteiras explícitas;
- casos de uso como orquestradores da aplicação;
- Arquitetura Limpa com dependências apontando para o domínio/aplicação;
- ports definidos pelo lado que precisa da capacidade e adapters nas bordas;
- separação entre Identity, Tenancy, Backend e Web;
- isolamento por banca em todas as operações e relações persistidas;
- regras testáveis independentemente de NestJS, Prisma, React ou Next.js.

Preserve as decisões já tomadas para o MVP:

- a banca nasce ativa;
- não há confirmação de e-mail;
- login usa `codigoBanca + username + senha`;
- o mesmo username pode existir em bancas diferentes;
- a URL usa o subdomínio como código da banca, por exemplo `farizeu.bancaflow.com.br`;
- sessão possui access token de 60 minutos;
- o administrador da banca redefine a senha de outro usuário;
- após reset administrativo, o usuário deve trocar a senha no próximo acesso;
- senha e autenticação pertencem ao Identity; `Banca` pertence ao Tenancy;
- `ProvisionBanca` cria a banca e a conta OWNER inicial de forma atômica quando a integração estiver completa.

## Problemas obrigatórios a especificar

### 1. Troca obrigatória e troca voluntária de senha — prioridade crítica

O contrato atual está incoerente: a tela de troca obrigatória envia apenas a nova senha, enquanto o caso de uso exige sempre a senha atual.

Defina dois fluxos explícitos:

1. **Troca voluntária:** usuário autenticado informa senha atual e nova senha; a senha atual deve ser conferida.
2. **Troca obrigatória após reset administrativo:** usuário autenticado por uma sessão originada com a senha temporária e marcado com `mustChangePassword = true` informa a nova senha; o Backend deve autorizar esse fluxo por estado confiável do servidor, nunca apenas por um booleano enviado pelo cliente.

Após uma troca bem-sucedida:

- persistir a nova credencial;
- limpar `mustChangePassword`;
- revogar/invalidar as sessões que não devem sobreviver à troca;
- emitir ou renovar a sessão/token de forma coerente, com `mustChangePassword = false`;
- permitir redirecionamento seguro para `/dashboard`;
- impedir que token antigo com claim desatualizada mantenha acesso indevido ou provoque loop de redirecionamento.

O design deve declarar o contrato HTTP, os inputs dos casos de uso, a política de sessão e os cenários de erro de ambos os fluxos.

### 2. Política de senha no domínio

Hoje a força da senha é validada principalmente no Web. A regra autoritativa deve existir no núcleo de negócio/aplicação.

Especifique que:

- criação de conta, troca de senha e reset administrativo rejeitam senha fraca no Backend;
- o Web replica a validação apenas para feedback rápido;
- a regra reutiliza o conceito compartilhado já existente em `@bancaflow/shared`, sem criar cópias divergentes;
- a senha temporária gerada também satisfaz a mesma política;
- senha em texto puro nunca é persistida, logada ou exposta em erro.

### 3. Transações baseadas em `Result`

Há casos de uso que retornam `Result.fail` dentro de uma transação. Para o Prisma, um retorno normal pode confirmar a transação, mesmo quando o resultado de negócio representa falha.

Defina uma política transacional explícita, por exemplo uma port/helper `runInTransactionResult` ou um mecanismo interno equivalente, garantindo rollback quando uma falha ocorrer depois de alguma escrita.

A solução deve:

- não vazar Prisma para os casos de uso;
- preservar `Result` na fronteira da aplicação;
- reverter alterações quando emissão de token, rotação de refresh token, hashing ou outra etapa posterior falhar;
- manter deliberadamente persistido o contador de senha incorreta quando essa for a regra de negócio;
- tornar atômicos `ChangePassword + revogação de sessões` e `AdminResetPassword + revogação de sessões`;
- documentar claramente quais falhas fazem rollback e quais representam uma alteração de negócio que deve ser confirmada.

### 4. Concorrência em login e refresh token

Especifique proteção contra condições de corrida:

- cinco logins incorretos simultâneos não podem perder incrementos do contador nem contornar bloqueio;
- a atualização deve usar versão otimista, operação atômica no banco ou bloqueio adequado;
- refresh token é de uso único durante a rotação;
- duas requisições simultâneas com o mesmo refresh token não podem ambas obter uma nova sessão válida;
- a comparação e substituição do digest antigo devem ser uma operação atômica (compare-and-swap ou equivalente);
- `refreshTokenDigest` deve possuir unicidade no banco.

O design deve separar invariantes do agregado das garantias de concorrência fornecidas pelo adapter de persistência.

### 5. Integridade multi-tenant no banco

Não dependa somente de filtros da aplicação para garantir isolamento.

Especifique:

- a sessão deve referenciar a conta pela combinação coerente de `userId` e `bancaId`;
- o banco deve rejeitar uma sessão cujo usuário pertença a outra banca;
- adicionar chave/índice composto em `UserAccount` quando necessário;
- índices e constraints necessários para login por `(bancaId, username)`;
- username único apenas dentro da banca, não globalmente;
- avaliar enums/check constraints para `AccountRole`, `AccountStatus` e `BancaStatus`;
- migrations devem ser reversíveis e compatíveis com os dados do MVP.

### 6. Bloqueio/desativação e sessões existentes

Defina que bloquear ou desativar uma conta revoga imediatamente suas sessões ativas, de forma atômica com a mudança de estado.

Explique também:

- comportamento ao reativar/desbloquear;
- se uma nova autenticação é obrigatória;
- como guards e validação de sessão impedem o uso de tokens emitidos antes do bloqueio;
- diferença entre bloqueio temporário por tentativas inválidas e desativação administrativa.

### 7. Proteção real das rotas Web

Decodificar um JWT no cliente ou no proxy, sem validação autoritativa, não deve ser tratado como autenticação suficiente.

Especifique:

- validação de expiração e autenticidade da sessão em fronteira confiável;
- estratégia de refresh segura;
- prevenção de renderização momentânea do conteúdo privado para usuário inválido;
- `/trocar-senha` protegida contra acesso anônimo;
- prevenção de loops entre login, troca obrigatória e dashboard;
- comportamento quando sessão estiver revogada, expirada, conta bloqueada ou banca inativa;
- responsabilidades do proxy/middleware, layout privado, guard do Backend e endpoint de sessão.

### 8. Roteamento Web → Backend e resolução do subdomínio

O Web usa caminhos relativos `/api`, mas a configuração de desenvolvimento não demonstra como essas chamadas chegam ao Backend em outra porta.

Defina:

- estratégia de mesma origem em produção;
- rewrite/proxy seguro no desenvolvimento;
- uso consistente de variável de ambiente quando necessário;
- preservação controlada de `Host`/`X-Forwarded-Host` para resolver `codigoBanca`;
- lista de proxies confiáveis e rejeição de headers forjados;
- testes cobrindo `farizeu.bancaflow.com.br` e o ambiente local.

### 9. Composição entre Identity e Tenancy

Revise a dependência circular entre `IdentityModule` e `TenancyModule`.

Adote como direção preferencial uma composição externa, por exemplo `PlatformProvisioningModule` ou outra composition root, responsável por conectar o `ProvisionBancaUseCase` às ports de ambos os bounded contexts.

O design deve mostrar:

- o que pertence ao domínio Tenancy;
- o que pertence ao domínio Identity;
- quem é dono da orquestração que cruza os dois módulos;
- direção das dependências;
- como remover ou justificar qualquer `forwardRef`;
- como manter os contratos públicos pequenos e estáveis.

Não crie um Domain Service genérico apenas para mover lógica de lugar. Use Domain Service somente quando existir uma regra de domínio pura que não pertença naturalmente a uma entidade ou objeto de valor.

### 10. Configuração e segurança do Backend

Especifique:

- produção deve falhar ao iniciar se `JWT_SECRET` ou `REFRESH_TOKEN_SECRET` estiver ausente, fraco ou igual ao outro;
- não usar secrets inseguros como fallback em produção;
- CORS com allowlist configurável, não `origin: true` irrestrito;
- DTOs de entrada com validação runtime; interfaces TypeScript não contam como validação;
- adapters Prisma não retornam `error.message` bruto ao cliente;
- erros públicos estáveis e logs internos sem dados sensíveis;
- `role` deve ser obrigatório na criação de conta ou assumir `USER`, nunca `OWNER` implicitamente;
- `ProvisionBanca` informa `OWNER` explicitamente.

### 11. Invariantes das entidades e objetos de valor

Revise e especifique, quando aplicável:

- datas válidas;
- contadores nunca negativos;
- consistência da janela de tentativas e bloqueio;
- expiração e rotação de sessão sempre com datas futuras válidas;
- `Credential` com `passwordChangedAt` válido;
- cópias defensivas de `Date` para evitar mutabilidade externa;
- `CodigoBanca` armazenado em forma normalizada e autoritativa;
- nome de banca com erro/VO apropriado, sem reutilizar erro de código inválido;
- transições de estado realizadas por métodos da entidade/agregado, não por setters públicos;
- nenhum objeto ser apenas um saco de getters e setters sem proteger regra real.

Explique no `design.md` por que cada conceito é entidade, objeto de valor, agregado, caso de uso, port ou adapter.

## Estrutura arquitetural esperada

### Negócio

- `modules/identity`: entidades, VOs, ports, DTOs de aplicação e casos de uso do Identity;
- `modules/tenancy`: agregado e regras próprias da banca;
- nenhum import de NestJS, Prisma, React ou Next.js em `modules/*`;
- casos de uso envolvendo várias entidades do mesmo módulo ficam em `modules/<contexto>/src/app/usecase`;
- orquestração entre bounded contexts fica na camada de composição/aplicação apropriada, não dentro de uma entidade;
- reutilizar `@bancaflow/shared` somente para conceitos realmente compartilhados e estáveis.

Considere as skills locais conforme o tipo de mudança e leia o respectivo `SKILL.md` antes de definir tarefas:

- `module-entity`;
- `module-value-object`;
- `module-repository`;
- `module-use-case`;
- `module-dto`;
- `module-domain-service`, somente se a justificativa acima for satisfeita.

### Backend

- Prisma implementa as ports, mas não contamina o domínio;
- controllers fazem apenas transporte, validação de entrada, chamada de caso de uso e mapeamento de resposta;
- módulos NestJS são a composition root dos adapters concretos;
- constraints do banco reforçam o isolamento tenant;
- transações e concorrência possuem contrato explícito;
- usar as skills `backend-prisma-data` e `backend-controller` quando aplicáveis.

Não proponha injetar implementações Prisma diretamente dentro dos casos de uso. É aceitável o módulo/controller conhecer o adapter concreto para composição, mas o caso de uso deve depender da port.

### Web

- formulários espelham as validações do domínio para UX, sem se tornarem a fonte da regra;
- proteção de rota e sessão têm comportamento determinístico;
- todos os estados de erro relevantes aparecem de forma segura ao usuário;
- usar a skill `frontend-form-schema` quando aplicável;
- definir testes do fluxo real, não apenas testes isolados de componentes.

## Capabilities e requirements

Inspecione os nomes existentes antes de decidir a divisão. A change deve modificar ou adicionar somente as capabilities necessárias, provavelmente incluindo:

- authentication;
- credential-management;
- session-management;
- user-account-management;
- route-protection-backend;
- route-protection-frontend;
- banca-context-resolution;
- provision-banca/composição entre contextos;
- security-configuration ou transaction-consistency, somente se realmente forem capabilities independentes.

Cada requirement deve ser normativo e conter cenários `WHEN/THEN` testáveis. Evite frases vagas como “deve ser seguro” sem explicar o comportamento observável.

## Casos de teste obrigatórios

Inclua tarefas e critérios de aceite para, no mínimo:

1. troca voluntária exige senha atual correta;
2. troca obrigatória funciona com o contrato real do Web e limpa `mustChangePassword`;
3. token/sessão após a troca permite dashboard e não cria loop;
4. senha fraca é rejeitada pelo Backend em criação, troca e reset;
5. falha do emissor de token depois de uma escrita provoca rollback;
6. falha do provider de senha em uma operação composta provoca rollback;
7. cinco logins incorretos concorrentes resultam no contador/bloqueio correto;
8. dois refreshes concorrentes com o mesmo token: apenas um vence;
9. banco rejeita sessão cruzando banca e usuário;
10. username repetido em bancas diferentes é aceito, mas duplicado na mesma banca é rejeitado;
11. bloquear/desativar revoga sessões já emitidas;
12. conta reativada precisa autenticar novamente;
13. banca inativa não consegue usar sessão anterior;
14. Web encaminha corretamente o host/subdomínio no ambiente de desenvolvimento;
15. headers de host forjados não atravessam proxy não confiável;
16. erros Prisma não vazam detalhes internos;
17. Backend falha no startup com secrets inválidos em produção;
18. CORS rejeita origem fora da allowlist;
19. DTO inválido é rejeitado antes do caso de uso;
20. fluxo E2E completo: login com senha temporária → troca obrigatória → dashboard;
21. testes de regressão das regras existentes de Identity e Tenancy continuam verdes.

Inclua testes unitários, integração com banco real e E2E conforme a responsabilidade. Não tente provar concorrência ou constraints exclusivas apenas com mocks.

Os números atuais de testes — Identity 91, Tenancy 38 e Backend E2E 16 — são apenas uma linha de base. Não os use como evidência de que os problemas acima já estão cobertos.

Se o build Web falhar somente por indisponibilidade externa do Google Fonts, registre separadamente como limitação ambiental; não confunda isso com erro funcional. Avalie no design se fontes locais são apropriadas, sem ampliar o escopo sem necessidade.

## Organização de `tasks.md`

Organize as tarefas com ordem, dependências, arquivos/áreas afetadas e comandos de verificação. Separe em quatro grupos:

1. **Negócio** — `modules/identity`, `modules/tenancy` e contratos compartilhados estritamente necessários;
2. **Backend** — Prisma, migrations, adapters, segurança, composição NestJS e integração com banco;
3. **Web** — formulários, sessão, proxy/rewrite, guards e rotas;
4. **Integração e validação final** — testes concorrentes, transacionais, E2E, lint, build e validação OpenSpec.

Expresse bloqueios reais. Backend depende dos contratos do Negócio. Web pode avançar após os contratos HTTP serem definidos. Integração final depende das três partes.

Para a futura execução de `/opsx:apply`, registre esta estratégia obrigatória:

- executar **Negócio, Backend e Web em exatamente três subagentes separados**, cada um com contexto limpo e escopo de escrita explícito;
- Negócio deve concluir contratos antes das integrações dependentes;
- Backend e Web podem ser paralelizados somente quando seus contratos estiverem estáveis;
- o agente principal coordena conflitos, integra as partes e executa a validação final;
- cada subagente deve ler as skills relevantes antes de alterar arquivos;
- não permitir que um subagente marque tarefas de outro grupo como concluídas.

## Decisões que o `design.md` deve explicar de forma didática

Além da decisão técnica, explique o “porquê” com linguagem adequada a alguém estudando arquitetura:

- diferença entre regra de domínio e validação de interface;
- por que `StrongPassword` precisa ser autoritativo no núcleo;
- por que um caso de uso orquestra, mas não deve conhecer Prisma;
- o que é uma port e por que ela pertence ao lado consumidor;
- por que retornar `Result.fail` pode não causar rollback automaticamente;
- diferença entre invariantes do agregado e garantia de concorrência do banco;
- por que FK composta protege o tenant melhor que apenas um filtro;
- por que refresh token precisa de rotação atômica;
- por que a composição entre bounded contexts deve ficar fora deles;
- quando um Domain Service é legítimo e quando apenas mascara uma modelagem fraca;
- diferença entre autenticar um token e apenas decodificá-lo.

Use diagramas Mermaid no `design.md` quando ajudarem a mostrar:

- dependências entre Identity, Tenancy, composição, Backend e Web;
- fluxo de login e resolução da banca;
- fluxo de troca obrigatória de senha;
- transação e rollback;
- disputa concorrente pela rotação do refresh token.

## Fora do escopo

- apostas e regras futuras do produto;
- confirmação de e-mail;
- recuperação de senha por e-mail;
- OAuth/social login;
- RBAC granular além dos papéis já previstos, salvo correção necessária de segurança;
- criação de um serviço distribuído ou microserviço separado;
- reescrita geral sem relação com os riscos levantados;
- implementação da change durante o comando de proposta.

## Saída esperada

Ao finalizar:

1. mostre os artefatos criados;
2. resuma as decisões arquiteturais;
3. liste dúvidas realmente bloqueantes, se ainda existirem;
4. execute a validação estrita da change;
5. corrija erros de estrutura/especificação até a validação passar;
6. informe claramente que a change está **pronta para revisão**, não implementada;
7. não execute `/opsx:apply` automaticamente.
