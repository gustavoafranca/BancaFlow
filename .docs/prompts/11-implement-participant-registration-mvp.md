# Prompt — Propor spec de `implement-participant-registration-mvp`

## Missão

Use a skill `openspec-propose` para criar uma proposta OpenSpec completa somente para o incremento `INC-01` do módulo Participants. Produza os artefatos exigidos pelo workflow spec-driven — proposta, design, delta specs e tarefas — mas não implemente código, não execute migrations e não aplique a change.

## Incremento selecionado

- **ID:** `INC-01`
- **Resultado vertical:** OWNER e ADMIN conseguem cadastrar, pesquisar, listar e consultar Cambistas reais da própria Banca pela rota `/cambistas`.
- **Change:** `implement-participant-registration-mvp`
- **Capability specs:**
  - `participant-registration` — ADDED;
  - `betting-agent-catalog` — ADDED;
  - `betting-agent-compensation-policy` — ADDED somente para a política inicial obrigatória.

## Fontes e precedência

Leia antes de propor:

1. instruções do repositório e `apps/web/AGENTS.md`;
2. `.docs/plans/00-project-context.md`;
3. `.docs/plans/00-bancaflow-mvp-roadmap.md`;
4. `.docs/plans/01-participants.md`, fonte normativa principal deste incremento;
5. `.docs/diagrams/01-participants.excalidraw`, apoio visual;
6. specs principais existentes de Identity, Tenancy, autorização, transação e roteamento em `openspec/specs/`;
7. contratos e padrões implementados em `modules/identity`, `modules/tenancy`, `packages/shared`, `apps/backend/src/modules`, `apps/backend/src/shared` e `apps/web/src/shared`;
8. protótipo atual em `apps/web/src/modules/cambistas` e rota `apps/web/src/app/(private)/cambistas/page.tsx`, somente como referência visual.

Em divergência, preserve as decisões explícitas D18–D29 e o recorte do INC-01. Mocks e código existente são evidência, não fonte de regra de negócio.

## Objetivo e resultado esperado

Criar a primeira entrega vertical do bounded context Participants, separando identidade cadastral (`Party`) do perfil operacional de Cambista (`BettingAgent`) e integrando domínio, persistência, API e Web. A entrega deve substituir os dados simulados da listagem de Cambistas por dados reais, sem antecipar manutenção, ciclo de vida ou integrações financeiras.

## Escopo do INC-01

- preparar a fundação full-stack do módulo `participants` com `config-new-module`;
- criar nova `Party` do tipo `PERSON` e novo `BettingAgent` atomicamente;
- cadastrar código/talão manual e política inicial obrigatória;
- aceitar nome, apelido, telefones e endereço inicial opcionais;
- pesquisar/listar Cambistas por código, nome e apelido, com paginação;
- consultar detalhes de um Cambista da própria Banca;
- detectar possível duplicidade por telefone ou nome+apelido e exigir confirmação explícita para prosseguir;
- bloquear código duplicado somente dentro da mesma Banca;
- persistir a política inicial em estrutura compatível com histórico futuro, sem implementar alteração de vigência;
- disponibilizar somente `POST /participants/betting-agents`, `GET /participants/betting-agents` e `GET /participants/betting-agents/:id` neste incremento;
- tornar `/cambistas` funcional para listar, cadastrar e consultar detalhes;
- criar testes, documentação do módulo e evidências proporcionais ao risco.

## Fora de escopo obrigatório

- **INC-02:** edição de perfil, inclusão/remoção posterior de telefones, troca posterior de endereço, ativação, inativação e reativação;
- **INC-03:** alteração/agendamento de políticas, encerramento de vigências e consulta de histórico de mudanças;
- FieldCollector/Recolhe, dono do Cambista e vínculos;
- tela funcional `/pessoas`;
- CPF, documentos e e-mail;
- Party do tipo `ORGANIZATION`;
- login do Cambista ou criação de `UserAccount` para ele;
- migração de Cambista entre Bancas;
- exclusão definitiva ou reutilização de código;
- lançamentos, turnos, prêmios, ledger, acertos, caixa, relatórios e apostas digitais;
- cálculo, reconhecimento ou pagamento de comissão;
- eventos/outbox sem consumidor comprovado;
- seed de negócio não exigido pelos critérios deste incremento.

Não transformar itens fora de escopo em tarefas opcionais.

## Decisões preservadas

- D18: `Party` e `BettingAgent` são agregados separados.
- D19/D23: apenas `OWNER` e `ADMIN` acessam administração de Cambistas; `USER` não acessa tela nem endpoints administrativos.
- D20: CPF/documentos ficam fora.
- D21: FieldCollector fica para incremento posterior.
- D22: usar `Party`, `BettingAgent`, `BettingAgentCode` e `CompensationPolicy` no código.
- D24: a primeira criação sempre cria nova Party e novo BettingAgent na mesma transação; não selecionar Party existente.
- D25: código é imutável e nunca reutilizado.
- D26: apenas código e política inicial são obrigatórios; nome/apelido, telefones e endereço são opcionais; vários telefones são aceitos; e-mail fica fora; quando houver endereço, bairro e cidade são obrigatórios.
- D27: política inicial é obrigatória e começa na criação; `FIXED_PER_ENTRY` fica fora.
- D28: telefone ou nome+apelido semelhantes geram alerta confirmável, nunca bloqueio.
- D29: somente Party `PERSON` neste incremento.

Alternativas rejeitadas não devem reaparecer: agregado único Party/Cambista, código automático ou alterável, unicidade global de código, bloqueio por telefone/nome, política opcional, documento obrigatório, CRUD com delete e usuário autenticado para Cambista.

## Domínio e invariantes

Modele com DDD, POO e Arquitetura Limpa, evitando entidades anêmicas:

- agregado `Party`: `PartyId`, `BancaId`, tipo `PERSON`, nome/apelido opcionais, `PartyContact[]`, `PartyAddress` inicial opcional e metadados de auditoria;
- entidades internas `PartyContact` e `PartyAddress`, alteradas somente pelo agregado/repositório de Party;
- agregado `BettingAgent`: `BettingAgentId`, `BancaId`, `PartyId`, `BettingAgentCode`, estado inicial `ACTIVE`, política inicial e metadados;
- VOs candidatos: `BettingAgentCode`, `BettingAgentStatus`, `CompensationPolicy`, `EffectivePeriod`, `Phone`, `Neighborhood` e `City`; reutilizar shared apenas quando a semântica coincidir;
- políticas aceitas: `PERCENTAGE_ON_SALES`, `FIXED_WEEKLY` e `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`;
- código tratado como texto somente com dígitos, trim externo, zeros à esquerda preservados e nunca convertido em número;
- Party e BettingAgent sempre pertencem à mesma Banca;
- neste incremento, uma Party possui no máximo um BettingAgent na mesma Banca;
- `bancaId` vem do contexto autenticado/tenant, nunca livremente do body;
- código possui constraint única composta por Banca e valor;
- duas Bancas podem usar `001`; a mesma Banca não;
- corrida para o mesmo código produz um sucesso e um conflito determinístico;
- criação de Party, contatos/endereço inicial, BettingAgent e política inicial ocorre na mesma transação;
- qualquer falha produz rollback completo;
- endereço inicial, quando presente, exige bairro e cidade e começa ativo;
- possível duplicidade sem confirmação não persiste nada; com confirmação prossegue;
- não criar serviço de domínio sem regra genuinamente transversal; coordenação entre agregados pertence ao caso de uso.

## Casos de uso e portas

Defina apenas:

- `CreateBettingAgent`;
- `ListBettingAgents`;
- `GetBettingAgent`.

Portas candidatas:

- `PartyRepository` para persistência do agregado Party;
- `BettingAgentRepository` para escrita orientada ao agregado;
- `PartyDuplicateQuery` para candidatos mínimos da própria Banca;
- `BettingAgentQuery` para lista e detalhe em DTO/projeção;
- `Clock` para datas determinísticas;
- `TransactionManager`/mecanismo transacional compartilhado existente.

Repositories não devem expor delete. Queries de leitura não retornam entidades nem modelos Prisma. DTOs não carregam regra de domínio ou acoplamento ao ORM.

## Backend e persistência

- Na primeira tarefa de implementação futura, executar primeiro o dry-run de `config-new-module` e depois o scaffold aprovado:

  `node .claude/skills/config-new-module/scripts/create-module.mjs participants --mode fullstack --route cambistas --dry-run`

  `node .claude/skills/config-new-module/scripts/create-module.mjs participants --mode fullstack --route cambistas`

- O scaffold cria apenas fronteiras; tarefas posteriores criam comportamento real.
- Modelar Prisma modular para Party, contatos, endereço, BettingAgent e política inicial/versionável.
- Usar chaves/constraints que reforcem tenant e relacionamentos, sem cascata destrutiva de histórico.
- Criar migration revisável com estratégia de rollback.
- Implementar repositories e queries Prisma com mapeamento explícito entre banco, domínio e DTO.
- Compartilhar a transação existente para criar os dois agregados e filhos atomicamente.
- Mapear conflitos de constraint e falhas de domínio para erros estáveis, sem vazar detalhes de banco.
- Integrar o módulo NestJS ao contexto autenticado existente.
- Aplicar autorização server-side para `OWNER | ADMIN`; `USER` recebe bloqueio.
- Busca por ID sempre inclui tenant; recurso de outra Banca não revela existência.
- Não registrar telefones/endereço completos em logs.
- Auditar criador e data de criação conforme convenções existentes.

## Web

- Reutilizar a rota `/cambistas` e o módulo visual existente; não criar `/participants` nem novo menu.
- Substituir arrays simulados da listagem pelo cliente HTTP real.
- Remover da primeira entrega colunas/controles de dono ou FieldCollector.
- Implementar loading, vazio, erro, paginação e busca.
- Implementar cadastro acessível com código e política obrigatórios; nome, apelido, telefones e endereço opcionais.
- Usar formulário discriminado para os três tipos de política.
- Exibir aviso de possível duplicidade com ação explícita para confirmar e reenviar.
- Exibir conflito de código sem perder silenciosamente os dados preenchidos.
- Permitir consulta de detalhes; não oferecer edição, inativação ou mudança de política nesta change.
- Ocultar/bloquear a administração para `USER`, mantendo o Backend como autoridade.
- Usar React Hook Form e o validador local em `apps/web/src/shared/form/validator.ts`.
- Seguir `apps/web/AGENTS.md`, a documentação local da versão do Next.js e os componentes compartilhados existentes.

## Testes e critérios de aceitação

Exigir testes unitários, integração real e Web para provar pelo menos:

- cadastro válido somente com código e política inicial;
- cadastro com perfil, vários telefones e endereço inicial;
- `001` permanece `001` e formato não numérico é rejeitado;
- código igual permitido em Bancas diferentes e bloqueado na mesma Banca;
- corrida de código produz exatamente um sucesso;
- alerta por telefone ou nome+apelido não bloqueia após confirmação;
- sem confirmação, nenhuma linha parcial é persistida;
- falha em qualquer persistência causa rollback total;
- política ausente ou tipo/valores inválidos são rejeitados;
- OWNER e ADMIN acessam; USER é bloqueado;
- tenant A não lista nem consulta tenant B;
- lista, busca, paginação e detalhe retornam projeções corretas;
- migration e constraints funcionam em PostgreSQL real;
- Web cobre loading, vazio, erro, sucesso, conflito, confirmação e navegação por teclado;
- `/cambistas` deixa de depender dos arrays mock para os fluxos entregues.

Inclua comandos/gates de build, lint e testes por workspace, mas não marque tarefas como concluídas na proposta.

## Skills e organização das tarefas

Organize `tasks.md` em grupos verticais e rastreáveis, preparando a aplicação futura nesta ordem:

1. **Fundação:** `config-new-module` em dry-run e execução.
2. **Negócio:** `module-entity`, `module-value-object`, `module-repository`, `module-query-cqrs`, `module-dto` e `module-use-case`; `module-domain-service` somente se justificado.
3. **Backend:** `backend-prisma-data` e `backend-controller`.
4. **Web:** `frontend-form-schema` adaptada a `apps/web` e ao validador local.
5. **Integração/revisão:** build, testes, migration real, isolamento tenant, documentação e confronto com o plano.

Na aplicação futura, preservar a estratégia de contextos limpos: Negócio primeiro; depois Backend e Web em subagentes separados quando os contratos estiverem estáveis; integração e validação final por um responsável coordenador. A proposta apenas prepara essas tarefas e não inicia subagentes.

Não usar `module-aggregate` para gerar CRUD genérico e não executar `config-project`, `config-prisma`, `config-shared-backend` ou `config-shared-frontend`, pois a infraestrutura já existe.

## Conflitos conhecidos

- O protótipo `/cambistas` mostra dono/Recolhe e ações de manutenção fora do INC-01; a spec deve removê-los ou deixá-los não operacionais, sem implementá-los.
- O plano completo descreve casos de manutenção e mudança de política pertencentes a INC-02/INC-03; não copiá-los para as tarefas atuais.
- `UserAccount` do Identity não representa Party ou BettingAgent.
- Não existe outbox comprovada, portanto não exigir eventos apenas para “seguir DDD”.

## Saída solicitada

Crie a change `implement-participant-registration-mvp` usando o workflow OpenSpec local e produza todos os artefatos necessários para ficar pronta para revisão, não para aplicação automática. Garanta rastreabilidade entre requisitos, cenários, design e tarefas; detalhe decisões técnicas sem alterar as decisões de produto; destaque qualquer bloqueio real. Ao final, informe os arquivos criados e peça revisão/aprovação antes de `/opsx:apply`.
