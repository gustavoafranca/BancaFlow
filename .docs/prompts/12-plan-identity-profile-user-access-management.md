# Prompt — Planejar perfil, usuários, papéis e permissões

**Este prompt cria ou atualiza planos e diagramas; não cria change OpenSpec, não gera spec e não implementa código.**

Use a skill `plan-spec-roadmap` para planejar a evolução full-stack de Identity e autorização do BancaFlow. O resultado deve decompor a entrega em capacidades e increments verticais pequenos, preparando futuras changes OpenSpec independentes sem transformar todo o escopo em uma única spec.

## Missão

Concluir o discovery e criar o planejamento normativo necessário para tornar funcionais as áreas existentes de:

- `/perfil`, permitindo que o usuário autenticado consulte e atualize os próprios dados autorizados;
- `/configuracoes`, permitindo que OWNER e ADMIN, dentro dos limites de autoridade definidos, gerenciem contas de usuários da própria Banca;
- papéis e permissões, substituindo a matriz demonstrativa do frontend por uma política autoritativa e coerente entre domínio, Backend e Web;
- navegação e ações protegidas por autorização real, mantendo o Backend como fonte de verdade.

O planejamento deve produzir increments que possam ser especificados, implementados, testados, revisados e arquivados separadamente.

## Como executar

1. Leia integralmente `.claude/skills/plan-spec-roadmap/SKILL.md` e todas as referências exigidas por ela para planejamento, decomposição, diagramas e gates.
2. Leia as instruções locais do repositório e `apps/web/AGENTS.md`.
3. Inspecione o contexto, roadmap, planos, specs, código, testes e protótipos indicados neste prompt.
4. Diferencie explicitamente fatos implementados, decisões já aprovadas, hipóteses, conflitos e decisões pendentes.
5. Faça perguntas de decisão em blocos pequenos quando uma regra crítica não puder ser inferida com segurança.
6. Crie os novos planos na área estável `foundation`, sob `.docs/plans/foundation/`, e espelhe seus diagramas em `.docs/diagrams/foundation/`. Use numeração global a partir do próximo número livre, inicialmente `08`, confirmando-a recursivamente antes de escrever.
7. Mantenha contexto e roadmap na raiz de `.docs/plans`. Atualize `.docs/plans/00-bancaflow-mvp-roadmap.md` para incluir as novas capacidades, a convenção da área `foundation` e suas dependências sem apagar o histórico de Tenancy e Identity já revisado.
8. Execute o validador somente leitura da skill nos arquivos planejados.
9. Não invoque `openspec-propose`, não crie diretório em `openspec/changes`, não gere prompt de spec e não implemente código nesta execução.

## Organização obrigatória dos artefatos

- Use `foundation` como área duradoura para planos de Identity, Tenancy e Access Control desta demanda.
- Crie planos em `.docs/plans/foundation/NN-capability.md`.
- Crie os diagramas correspondentes em `.docs/diagrams/foundation/NN-capability.excalidraw`.
- Mantenha `.docs/plans/00-project-context.md` e `.docs/plans/00-bancaflow-mvp-roadmap.md` na raiz.
- Mantenha os prompts em `.docs/prompts/` com a sequência global já adotada, salvo decisão explícita posterior de reorganizá-los.
- Não mova, renumere ou duplique os planos existentes `01` a `07`; apenas faça o roadmap mestre apontar para a nova área.
- Não crie um plano separado de Tenancy apenas para preencher a pasta. Crie-o somente se o discovery encontrar uma capacidade ou jornada nova de Tenancy; caso contrário, registre Tenancy como dependência e fonte de invariantes dos planos de Identity/Access Control.
- Se Identity e Access Control tiverem ownership duradouro diferente, prefira dois planos dentro da mesma área `foundation`, com dependências explícitas, em vez de um plano monolítico.

## Integração com a futura skill Web

A change OpenSpec `add-frontend-module-workflow-skill` está construindo `.claude/skills/frontend-module-workflow`. Ela é relevante para esta demanda porque `/perfil` e `/configuracoes` são módulos Web existentes que precisarão de evolução incremental, ownership de componentes, integração com cliente HTTP, rotas privadas, estados de tela e testes.

Durante o planejamento:

1. leia os artefatos da change `add-frontend-module-workflow-skill` para conhecer o contrato pretendido;
2. se `.claude/skills/frontend-module-workflow/SKILL.md` existir, confirme que todas as referências obrigatórias apontadas por ele existem e que a skill passa na validação oficial;
3. use a skill somente como fonte de restrições arquiteturais e de organização das futuras tarefas Web; não implemente frontend durante o plano;
4. registre `frontend-module-workflow` na seção de skills/workflow dos increments que alterarem módulos Web existentes;
5. ao gerar futuramente o prompt de spec de um incremento Web, cite `frontend-module-workflow` como skill de **aplicação futura**, não como substituta de `openspec-propose`;
6. peça que o futuro `tasks.md` organize o grupo Web em contrato/tipos, shared necessário, módulo/feature, rotas/navegação e testes/integração;
7. use também `frontend-form-schema` quando houver formulário/schema e preserve o roteamento para `config-new-module`, `config-shared-frontend` e `import-cloud-design-next` somente quando seus gatilhos reais forem satisfeitos;
8. se a skill ainda estiver incompleta ou não validada, registre-a como dependência condicional e não invente conteúdo ausente nem bloqueie decisões de produto independentes dela.

A divisão de responsabilidades deve permanecer explícita:

- `plan-spec-roadmap`: discovery, decisões, capacidades, increments e readiness;
- `openspec-propose`: proposta, design, delta specs e tarefas de exatamente um incremento;
- `frontend-module-workflow`: implementação e revisão futuras do grupo Web aprovado;
- Backend/domínio: skills específicas escolhidas conforme os contratos do incremento.

## Fontes normativas e evidências mínimas

Leia integralmente, no mínimo:

### Planejamento e instruções

- `.docs/plans/00-project-context.md`;
- `.docs/plans/00-bancaflow-mvp-roadmap.md`;
- planos de capacidades que dependam de autorização, especialmente `.docs/plans/01-participants.md`;
- `apps/web/AGENTS.md`;
- `.claude/skills/plan-spec-roadmap/references/roadmap-state-machine.md`;
- `.claude/skills/plan-spec-roadmap/references/capability-plan-template.md`;
- `.claude/skills/plan-spec-roadmap/references/change-decomposition.md`;
- `.claude/skills/plan-spec-roadmap/references/diagram-playbook.md`;
- `.claude/skills/plan-spec-roadmap/references/quality-gates.md`;
- `openspec/changes/add-frontend-module-workflow-skill/proposal.md`;
- `openspec/changes/add-frontend-module-workflow-skill/design.md`;
- `openspec/changes/add-frontend-module-workflow-skill/specs/frontend-module-workflow-skill/spec.md`;
- `openspec/changes/add-frontend-module-workflow-skill/tasks.md`;
- `.claude/skills/frontend-module-workflow/SKILL.md` e referências existentes, somente se a skill já estiver materializada.

### Specs principais existentes

- `openspec/specs/user-account-management/spec.md`;
- `openspec/specs/authenticated-user-context/spec.md`;
- `openspec/specs/authentication/spec.md`;
- `openspec/specs/credential-management/spec.md`;
- `openspec/specs/session-management/spec.md`;
- `openspec/specs/route-protection-backend/spec.md`;
- `openspec/specs/route-protection-frontend/spec.md`;
- `openspec/specs/request-routing-and-proxy/spec.md`;
- `openspec/specs/security-configuration/spec.md`;
- `openspec/specs/transaction-consistency/spec.md`;
- specs de Tenancy necessárias para isolamento por Banca.

### Identity e Backend

- `modules/identity/README.md`;
- `apps/backend/src/modules/identity/README.md`;
- `modules/identity/src/user-account/user-account.entity.ts`;
- `modules/identity/src/user-account/user-account.repository.ts`;
- `modules/identity/src/user-account/vo/account-role.vo.ts`;
- `modules/identity/src/user-account/vo/account-status.vo.ts`;
- todos os casos de uso em `modules/identity/src/user-account/use-case/`;
- `modules/identity/src/app/use-case/get-authenticated-user-context.use-case.ts`;
- DTOs e ports relacionados a conta e contexto autenticado;
- testes de domínio e casos de uso correspondentes;
- `apps/backend/prisma/models/identity.model.prisma`;
- migrations e seeds relacionados a Identity;
- `apps/backend/src/modules/identity/identity.controller.ts`;
- DTOs, guards, decorators, adapters, módulo e testes do adapter HTTP de Identity;
- mecanismos compartilhados de autorização, contexto autenticado, erros, auditoria e transação.

### Web e protótipos existentes

- rota e módulo de `/perfil` em `apps/web/src/app/(private)/perfil` e `apps/web/src/modules/perfil`;
- rota e módulo de `/configuracoes` em `apps/web/src/app/(private)/configuracoes` e `apps/web/src/modules/configuracoes`;
- `apps/web/src/modules/configuracoes/data/configuracoes.sample.ts`;
- `apps/web/src/modules/configuracoes/lib/permissions.ts` e seus testes;
- shell privado, sidebar e navbar em `apps/web/src/app/(private)/_shell`;
- `apps/web/src/shared/session`;
- `apps/web/src/shared/api/auth.client.ts` e seus testes;
- `apps/web/src/proxy.ts` e seus testes;
- componentes, formulários, validação e padrões compartilhados aplicáveis.

Mocks, telas atuais e matrizes locais são evidência visual e de intenção, não fonte autoritativa de regra de negócio.

## Estado conhecido que deve ser confirmado

Confronte estes fatos com o repositório e corrija o plano se algum deles tiver mudado:

- o sistema é multi-tenant por Banca e o `bancaId` autoritativo vem do contexto autenticado;
- `UserAccount` representa acesso ao SaaS e não representa automaticamente `Party` ou `BettingAgent`;
- o domínio atual trabalha com os papéis fixos `OWNER | ADMIN | USER`;
- `GET /api/auth/me` já retorna contexto autenticado com `userId`, `username`, `name`, `email`, `role` e Banca;
- já existem casos de uso de criação interna de conta, reset administrativo de senha e alteração de status;
- o fluxo atual de criação de conta foi desenhado para `ProvisionBanca` e não possui endpoint administrativo público para criar outro usuário na Banca;
- a spec vigente afirma que contas são criadas exclusivamente por `ProvisionBanca`, portanto a nova administração de usuários exige decisão e modificação explícita de contrato, não apenas uma tela;
- `/perfil` e `/configuracoes` ainda contêm dados simulados ou ações sem persistência real;
- a matriz `módulo.ação` da tela de Configurações é demonstrativa e não é validada pelo Backend;
- permissões granulares não estão implementadas de forma autoritativa;
- o frontend já possui proteção de sessão/rotas, mas a proteção visual por papel ou permissão precisa ser confrontada com a autorização server-side real.

## Resultados de produto desejados

O roadmap deve preparar, sem implementar nesta etapa:

1. **Autogestão de perfil**
   - consultar dados reais do usuário autenticado;
   - atualizar pelo menos o nome;
   - decidir explicitamente se e-mail e username podem ser alterados, por quem e com quais efeitos;
   - refletir a alteração no shell e na sessão/contexto sem exigir comportamento inseguro;
   - tratar validação, concorrência, erro, sucesso e acessibilidade.

2. **Administração de usuários da Banca**
   - listar, pesquisar e consultar contas da própria Banca;
   - criar uma conta adicional sem permitir cadastro público;
   - definir onboarding seguro: senha temporária exibida uma vez com troca obrigatória, convite ou outro fluxo compatível com a infraestrutura real;
   - atribuir um papel permitido na criação e, se aprovado, alterá-lo posteriormente;
   - ativar, desativar, bloquear, desbloquear e redefinir senha conforme regras já existentes;
   - nunca oferecer exclusão definitiva se desativação preserva melhor auditoria e histórico.

3. **Papéis e permissões autoritativos**
   - definir a fonte de verdade do catálogo de permissões;
   - definir como permissões se relacionam com módulos/capacidades e ações reais;
   - exibir uma matriz compreensível no frontend sem permitir que a UI invente autorização;
   - garantir a mesma política em casos de uso, controllers, rotas, menus, páginas e botões;
   - tratar evolução do catálogo, compatibilidade e testes de negação.

4. **Experiência Web funcional**
   - integrar `/perfil` e as subseções `Usuários` e `Perfis de Acesso` de `/configuracoes` a contratos reais;
   - preservar o design aproveitável dos protótipos, removendo dados simulados somente no incremento que entregar o fluxo correspondente;
   - cobrir loading, vazio, erro, sucesso, conflito, acesso negado e atualização dos dados após mutações;
   - ocultar ações não autorizadas por experiência, sem tratar ocultação como segurança.

## Direção recomendada, sujeita a decisão registrada

Use esta direção como hipótese preferencial, não como desculpa para ignorar conflitos do domínio:

- permissões devem ser identificadores estáveis definidos pelo sistema e versionados com o código ou outra fonte autoritativa controlada;
- usuários não devem cadastrar livremente nomes/chaves arbitrárias de permissões;
- a primeira entrega deve avaliar papéis fixos com permissões predefinidas;
- se houver valor real para flexibilidade, perfis/papéis personalizados devem formar um incremento posterior, selecionando apenas permissões existentes no catálogo do sistema;
- `OWNER` é um papel protegido, não um perfil comum editável;
- `ADMIN` não gerencia `OWNER`, não concede autoridade superior à própria e não promove alguém a `OWNER`;
- ninguém altera o próprio papel nem eleva as próprias permissões;
- o último `OWNER` não pode ser rebaixado, desativado, bloqueado ou removido;
- transferência de propriedade deve ser uma jornada separada e ficar fora do primeiro incremento, salvo decisão explícita em contrário;
- autorização efetiva sempre ocorre no Backend; o frontend somente espelha a política para experiência e prevenção;
- mudanças administrativas relevantes devem possuir auditoria segura e tenant-scoped.

## Decisões críticas a conduzir

Não marque incremento como `READY_FOR_SPEC` enquanto alguma decisão crítica correspondente permanecer aberta.

1. **Modelo de acesso:** os três papéis fixos atendem ao MVP ou são necessários perfis personalizados?
2. **Catálogo de permissões:** quais capacidades e ações precisam de granularidade agora, evitando uma matriz CRUD genérica desconectada dos casos de uso?
3. **Semântica de OWNER:** existe um OWNER único por Banca, vários OWNERs ou um fluxo futuro de transferência?
4. **Delegação do ADMIN:** ADMIN pode criar outro ADMIN? Quais papéis pode atribuir e alterar?
5. **Criação/onboarding:** senha temporária com troca obrigatória, convite por e-mail ou outro mecanismo? Não inventar infraestrutura de e-mail inexistente.
6. **Campos do perfil:** nome, e-mail e username — quais são editáveis pelo próprio usuário e por administrador? Username alterado afeta login, sessões ou auditoria?
7. **Mudança de papel:** revoga sessões, atualiza claims imediatamente ou depende de nova autenticação/refresh? Definir consistência e janela de autorização.
8. **Status e autoproteção:** um administrador pode desativar/bloquear a própria conta? Como impedir perda total de administração da Banca?
9. **Auditoria:** quais ações precisam registrar ator, alvo, Banca, data e mudança, sem registrar senha temporária ou secrets?
10. **Perfis do protótipo:** `Administrador`, `Operador`, `Cambista` e `Somente Leitura` são requisitos aprovados ou apenas exemplos visuais? Não confundir perfil operacional Cambista com `UserAccount` sem decisão explícita.

## Decomposição inicial a avaliar

Não aceite esta lista automaticamente. Valide jornadas, dependências e fronteiras duradouras antes de consolidá-la.

| Incremento candidato | Resultado vertical | Change candidata | Dependências iniciais |
|---|---|---|---|
| `INC-01` | Usuário autenticado consulta e atualiza os próprios dados reais em `/perfil` | `enable-self-profile-management` | contexto autenticado existente |
| `INC-02` | OWNER/ADMIN lista e cria contas da própria Banca com onboarding seguro e papel permitido | `enable-tenant-user-administration` | Identity, Tenancy, decisão de onboarding e delegação |
| `INC-03` | OWNER/ADMIN administra ciclo de vida e papel de contas existentes com proteções e auditoria | `manage-tenant-user-access` | INC-02 e regras de OWNER/ADMIN |
| `INC-04` | Sistema aplica e apresenta catálogo autoritativo de permissões para papéis predefinidos | `establish-authoritative-role-permissions` | modelo de acesso e inventário dos casos de uso |
| `INC-05` opcional | OWNER cria perfis personalizados selecionando permissões predefinidas | `enable-custom-access-profiles` | INC-04 e necessidade de negócio aprovada |

Verifique se Identity e Access Control devem possuir planos de capacidade separados por terem ownership duradouro diferente. Ambos continuam agrupados na área `foundation`. Trate Tenancy como plano próprio somente se houver resultado novo de negócio/operacional além do isolamento e contexto já existentes. Não divida changes por camada técnica: domínio, persistência, Backend e Web necessários ao mesmo resultado vertical permanecem juntos.

Se algum incremento ainda contiver mais de uma jornada independente, múltiplos rollbacks ou critérios difíceis de resumir em uma frase, decomponha novamente.

## Fora de escopo inicial

Salvo decisão explícita durante o planejamento, mantenha fora dos primeiros increments:

- cadastro público de usuários;
- recuperação pública de senha por e-mail;
- MFA;
- login automático para Party, BettingAgent/Cambista ou outros participantes;
- permissões arbitrárias criadas por texto livre;
- expressões ou fórmulas de autorização configuráveis;
- transferência de propriedade;
- exclusão definitiva de contas e histórico;
- SSO, provedores externos e diretórios corporativos;
- gestão de usuários entre Bancas diferentes;
- configurações operacionais não relacionadas, como Turnos, WhatsApp, APIs e Webhooks;
- refatoração visual completa das telas além do necessário para os fluxos funcionais.

Itens fora de escopo não devem aparecer como tarefas opcionais dentro do primeiro incremento.

## Segurança, tenancy e consistência obrigatórias

O plano deve tratar explicitamente:

- `bancaId` derivado somente do contexto autenticado;
- queries e comandos sempre tenant-scoped;
- resposta indistinguível ou segura para recurso de outra Banca;
- proteção contra IDOR e mass assignment;
- validação server-side de papel e permissão em cada operação;
- prevenção de autoelevação e delegação superior;
- proteção do último OWNER;
- concorrência em username, alteração de perfil, status e papel;
- versionamento otimista ou estratégia equivalente quando aplicável;
- revogação/atualização de sessão após mudanças sensíveis;
- armazenamento seguro de senha e exibição única de credencial temporária, se escolhida;
- logs e auditoria sem senha, token, hash ou dados pessoais desnecessários;
- códigos HTTP e erros públicos estáveis, sem vazamento de Prisma ou detalhes internos;
- acessibilidade e comportamento seguro para `401` e `403` no frontend.

## Testes e critérios que o plano deve preparar

Inclua critérios verificáveis para, no mínimo:

- atualização válida e inválida do próprio perfil;
- isolamento entre duas Bancas com identificadores conhecidos;
- OWNER, ADMIN e USER em cenários permitidos e negados;
- criação de conta com username único por Banca e colisão concorrente;
- mesmo username permitido em Bancas diferentes;
- onboarding e troca obrigatória de senha, conforme decisão;
- ADMIN impedido de gerenciar OWNER e de elevar autoridade;
- usuário impedido de alterar o próprio papel;
- proteção contra perda do último OWNER;
- ativação/desativação/bloqueio com revogação de sessões quando aplicável;
- mudança de papel refletida de forma consistente em sessão, Backend e Web;
- endpoints recusando ação mesmo quando chamada diretamente sem botão visível;
- rotas, menu e ações do frontend coerentes com as permissões;
- loading, vazio, erro, sucesso, conflito e acesso negado;
- ausência de mocks nos fluxos efetivamente entregues;
- auditoria das ações críticas sem vazamento de segredo.

## Entregáveis esperados

Ao final desta execução de planejamento:

1. atualize o contexto do projeto apenas se houver nova decisão transversal comprovada;
2. atualize o roadmap mestre com as capacidades, dependências, valor, risco e estado;
3. crie um ou mais planos sequenciais a partir de `08` dentro de `.docs/plans/foundation/`, conforme as fronteiras identificadas;
4. crie os diagramas Excalidraw correspondentes dentro de `.docs/diagrams/foundation/`, com atores/jornadas, sucessos/falhas, domínio, portas/adapters, dependências e pendências;
5. registre decisões, alternativas rejeitadas, conflitos com specs/código e impactos;
6. decomponha cada capacidade em increments verticais e mapeie as capability specs esperadas como `ADDED`, `MODIFIED` ou `REMOVED`;
7. atribua estado e Definition of Ready separadamente a cada incremento;
8. deixe explícito qual incremento pode ser o próximo candidato a spec, sem gerar seu prompt ainda;
9. mantenha `DECISIONS_PENDING` onde houver decisão `CRITICAL/OPEN`;
10. execute o validador da skill e relate arquivos criados/alterados, diagnóstico, bloqueios e próximas decisões.

Não declare `READY_FOR_SPEC` apenas porque o template está preenchido. Não gere vários prompts OpenSpec de uma vez. Depois que exatamente um incremento estiver realmente pronto e for escolhido pelo usuário, seu prompt de spec deverá ser solicitado em uma execução separada.
