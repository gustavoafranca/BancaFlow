# Plano 01 — Gerenciar Cambistas

## Identificação e estado

- **Capacidade:** gerenciar participantes com perfil de Cambista
- **Bounded context:** Participants
- **Estado:** `READY_FOR_SPEC`
- **Roadmap:** [Plano mestre](00-bancaflow-mvp-roadmap.md)
- **Contexto:** [Contexto do projeto](00-project-context.md)
- **Prompt:** [INC-01 — participant registration](../prompts/11-implement-participant-registration-mvp.md)
- **Change/spec:** ver decomposição; nenhuma criada
- **Diagrama:** [Participants](../diagrams/01-participants.excalidraw)
- **Atualizado em:** 2026-07-17

## Objetivo e valor

Permitir que OWNER e ADMIN cadastrem e mantenham Cambistas da própria banca, preservando identidade cadastral, código/talão, estado e acordo de remuneração. Essa capacidade será consumida por Lançamentos, Prêmios, Financeiro, Acertos e Relatórios, sem confundir Cambista com usuário autenticado.

## Dependências

- **Tenancy:** Banca resolvida pelo subdomínio e contexto ativo.
- **Identity:** ator autenticado, `userId`, `bancaId` e papel.
- **Shared:** `Result`, Entity/ValueObject/UseCase, paginação e VOs realmente genéricos.
- **Consumidores futuros:** Lançamentos, Prêmios, Financeiro, Acertos/Caixa, Relatórios e FieldCollector.

## Decomposição em increments e changes

Cada incremento é vertical: inclui Negócio, Backend, Web, testes e documentação aplicáveis. Não criar changes separadas por camada. O primeiro incremento usa `config-new-module` somente para preparar as fronteiras; as skills especializadas implementam o comportamento aprovado.

| Incremento | Resultado vertical | Escopo principal | Dependências | Change candidata | Estado |
|---|---|---|---|---|---|
| INC-01 | OWNER/ADMIN cadastra, pesquisa e consulta Cambistas reais em `/cambistas` | scaffold; Party PERSON; BettingAgent; código; perfil inicial opcional; política inicial; alerta de duplicidade; create/list/get; Prisma/API/Web | Identity e Tenancy concluídos | `implement-participant-registration-mvp` | `READY_FOR_SPEC` |
| INC-02 | OWNER/ADMIN mantém perfil e ciclo de vida sem perder histórico | edição de nome/apelido/telefones; troca de endereço com vigência; ativação/inativação; endpoints e UI correspondentes | INC-01 arquivado | `implement-participant-maintenance-mvp` | `DISCOVERY` |
| INC-03 | OWNER/ADMIN agenda mudanças de remuneração com histórico íntegro | nova vigência hoje/futura; encerramento da anterior; bloqueio de lacuna/sobreposição/retroatividade; histórico e UI | INC-01 arquivado; regras financeiras de semana parcial continuam fora | `implement-betting-agent-compensation-history-mvp` | `DISCOVERY` |

FieldCollector/Recolhe permanece fora destes increments e deverá ganhar plano/change próprios quando entrar no roadmap executável.

## Mapa de capability specs por incremento

| Incremento | Capability specs | Operação esperada |
|---|---|---|
| INC-01 | `participant-registration`, `betting-agent-catalog`, `betting-agent-compensation-policy` | ADDED; remuneração cobre somente política inicial |
| INC-02 | `participant-profile-management`, `betting-agent-lifecycle`, `betting-agent-catalog` | ADDED/MODIFIED |
| INC-03 | `betting-agent-compensation-policy` | MODIFIED para vigências e histórico |

O prompt atual deve selecionar somente o INC-01. INC-02 e INC-03 são obrigatoriamente fora de escopo até cumprirem suas dependências e passarem por revisão de readiness própria.

## Escopo

- criar Party do tipo PERSON e BettingAgent;
- listar, consultar e editar Cambistas;
- ativar e inativar preservando histórico;
- código/talão numérico único por banca, preservando zeros à esquerda;
- política individual de remuneração versionada;
- nome e apelido opcionais;
- vários telefones opcionais por Party;
- um endereço ativo opcional, preservando versões anteriores;
- busca por código, nome e apelido; filtro por estado;
- tornar `/cambistas` funcional.

## Fora de escopo

CPF/documentos, e-mail, Party do tipo ORGANIZATION, login do Cambista, FieldCollector/vínculos, tela funcional `/pessoas`, migração entre bancas, hierarquia, estoque de talão físico, cálculo/pagamento financeiro, lançamentos, prêmios, caixa, apostas digitais e exclusão definitiva com histórico.

## Atores e permissões

| Ator | Permissão |
|---|---|
| OWNER | listar, consultar, criar, editar, ativar, inativar e alterar política |
| ADMIN | listar, consultar, criar, editar, ativar, inativar e alterar política |
| USER | sem acesso à tela/endpoints administrativos; lookup operacional limitado fica para módulo consumidor futuro |
| Cambista | sem acesso ao SaaS no MVP |

O Backend autoriza; esconder controles no Web não substitui o bloqueio server-side.

## Jornadas

1. OWNER/ADMIN abre `/cambistas` e pesquisa/filtra.
2. Escolhe “Adicionar Cambista”.
3. Informa obrigatoriamente o código/talão manual e a política inicial; cadastro pessoal, telefones e endereço são opcionais.
4. O sistema valida ator, banca, domínio e unicidade.
5. Party e BettingAgent são criados e persistidos atomicamente; qualquer falha desfaz os dois.
6. A lista mostra o novo Cambista ativo.

Também existem jornadas de edição, inativação com confirmação, reativação e nova vigência de remuneração.

## Glossário e linguagem ubíqua

- **Party/Participante:** identidade cadastral da banca.
- **BettingAgent/Cambista:** perfil operacional com código/talão.
- **BettingAgentCode/Talão:** código numérico único na banca.
- **CompensationPolicy:** acordo individual de remuneração.
- **FieldCollector/Recolhe:** incremento posterior.
- **UserAccount:** acesso no Identity; não é Party.

## Decisões

| ID | Criticidade | Status | Decisão/pergunta | Alternativas | Evidência/decisor | Impacto |
|---|---|---|---|---|---|---|
| D18 | CRITICAL | DECIDED | Party e BettingAgent são agregados separados | agregado único rejeitado | responsável pelo produto | domínio/transação |
| D19 | CRITICAL | DECIDED | OWNER e ADMIN gerenciam Cambistas | somente OWNER rejeitado | responsável pelo produto | autorização |
| D20 | CRITICAL | DECIDED | CPF/documentos fora do MVP | inclusão rejeitada | responsável pelo produto | privacidade |
| D21 | CRITICAL | DECIDED | FieldCollector em segunda change | primeira change rejeitada | responsável pelo produto | escopo |
| D22 | IMPORTANT | DECIDED | Party, BettingAgent, BettingAgentCode e FieldCollector no código | nomes genéricos rejeitados | decisão delegada | linguagem |
| D23 | CRITICAL | DECIDED | USER não acessa administração de Cambistas; lookup limitado poderá existir em módulo consumidor futuro | somente leitura administrativa rejeitada | responsável pelo produto | menor privilégio e separação entre gestão e operação |
| D24 | CRITICAL | DECIDED | primeira change cria nova Party e BettingAgent atomicamente; vínculo com Party existente fica para quando houver outros perfis | seleção antecipada rejeitada | responsável pelo produto | transação única e UX simples |
| D25 | CRITICAL | DECIDED | BettingAgentCode é imutável; erro exige inativação e novo cadastro, sem reutilizar o código antigo | alteração controlada rejeitada | responsável pelo produto | identidade e histórico estáveis |
| D26 | IMPORTANT | DECIDED | código manual é o único dado cadastral obrigatório; nome/apelido são opcionais; Party aceita vários telefones; e-mail fica fora; existe um endereço ativo com histórico | contato único e endereço embutido rejeitados | responsável pelo produto | entidades filhas, formulário enxuto e base para relatórios geográficos |
| D27 | CRITICAL | DECIDED | política é obrigatória; a inicial começa na criação; BettingAgent ativo sempre possui política vigente; mudanças começam hoje ou no futuro, sem retroatividade, lacuna ou sobreposição | política opcional e alteração retroativa rejeitadas | responsável pelo produto | agregado sempre calculável e histórico estável; semana parcial fica para Financeiro |
| D28 | IMPORTANT | DECIDED | possível duplicidade por telefone ou nome+apelido gera alerta confirmável; nunca bloqueia | bloqueio por telefone/nome rejeitado | responsável pelo produto | evita duplicidade acidental sem impedir homônimos/telefone compartilhado |
| D29 | IMPORTANT | DECIDED | primeira change aceita somente Party pessoa natural (PERSON); ORGANIZATION fica para incremento posterior | suporte antecipado a organização rejeitado | responsável pelo produto | reduz campos e regras do primeiro formulário |

## Domínio e contexts

Participants é dono de Party, BettingAgent e política individual. Identity fornece ator, Tenancy fornece banca e Financeiro futuramente interpreta snapshots sem editar Participants. Não há serviço de domínio necessário agora; regras ficam em agregados/VOs e a coordenação Party+BettingAgent no caso de uso.

## Agregados, entidades, VOs e serviços

### Party

Agregado de identidade cadastral de pessoa natural: `PartyId`, `BancaId`, nome/apelido opcionais, coleção de `PartyContact`, histórico de `PartyAddress` e metadados. Party pode existir sem nome porque o identificador operacional obrigatório está no BettingAgent.

Entidades filhas, persistidas em tabelas próprias mas alteradas pelo `PartyRepository`:

- `PartyContact`: `PartyContactId`, `Phone`, rótulo opcional e estado; vários telefones são permitidos;
- `PartyAddress`: `PartyAddressId`, rua, número, `Neighborhood`, `City`, `EffectivePeriod`; no máximo um endereço ativo; versões anteriores são preservadas.

Endereço é opcional. Quando informado, bairro e cidade são obrigatórios para consistência analítica; rua e número podem ficar ausentes.

### BettingAgent

Agregado operacional: `BettingAgentId`, `BancaId`, `PartyId`, `BettingAgentCode`, `BettingAgentStatus`, política vigente/histórico e metadados.

### Value Objects

- `BettingAgentCode`: texto somente com dígitos, trim externo, zeros preservados, nunca convertido para número;
- `BettingAgentStatus`: `ACTIVE | INACTIVE`;
- `CompensationPolicy`: união discriminada;
- `EffectivePeriod`: início obrigatório e fim opcional;
- `Phone`: telefone normalizado e validado;
- `Neighborhood` e `City`: preservam exibição e fornecem valor normalizado para busca/agrupamento;
- reutilizar VOs de `packages/shared` apenas quando as regras coincidirem.

Políticas aprovadas: `PERCENTAGE_ON_SALES`, `FIXED_WEEKLY` e `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`. `FIXED_PER_ENTRY` fica fora.

## Invariantes, estados, concorrência e idempotência

- Party e BettingAgent pertencem à mesma banca.
- BettingAgent referencia exatamente uma Party.
- Uma Party possui no máximo um BettingAgent dentro da mesma Banca neste incremento.
- BettingAgentCode é obrigatório, informado manualmente, nunca gerado automaticamente.
- Código único por banca, com zeros preservados e sem reutilização por outro cadastro.
- Nome, apelido, telefones e endereço são opcionais.
- Esta change cria somente Party pessoa natural; organização fica fora.
- Mesmo telefone ou mesmo nome+apelido normalizados geram alerta, nunca bloqueio.
- Código/talão é a única chave de negócio com bloqueio absoluto de duplicidade.
- Party aceita vários telefones.
- Party possui no máximo um endereço ativo; trocar endereço encerra a vigência anterior sem apagá-la.
- Inativação preserva identidade, política e histórico; reativação mantém código.
- Inativo não recebe novos fatos operacionais nos módulos consumidores.
- Política inicial é obrigatória e começa na data de criação do BettingAgent.
- BettingAgent ativo sempre possui exatamente uma política vigente.
- Mudança de política cria nova vigência para hoje ou futuro, encerra a anterior e não reescreve snapshots.
- Vigências não podem ter lacuna, sobreposição ou início retroativo.
- `bancaId` nunca vem livremente do cliente.
- Constraint única resolve corrida de código com erro determinístico.
- CreateBettingAgent cria Party e BettingAgent na mesma transação; falha em qualquer etapa produz rollback total.
- Estado: `ACTIVE → INACTIVE → ACTIVE`; não existe `DELETED`.

## Casos de uso e falhas

| Caso | Resultado | Falhas |
|---|---|---|
| `CreateBettingAgent` | cria nova Party PERSON e BettingAgent atomicamente; exige confirmação quando houver alerta de possível duplicidade | não autorizado, banca/dados inválidos, código duplicado, possível duplicidade não confirmada, falha transacional |
| `GetBettingAgent` | detalhe da banca | não autorizado, não encontrado |
| `ListBettingAgents` | página filtrada | não autorizado, filtros inválidos |
| `UpdateBettingAgentProfile` | altera campos permitidos | não autorizado, não encontrado, inválido/conflito |
| `ActivateBettingAgent` | reativa | não autorizado, não encontrado, estado inválido |
| `DeactivateBettingAgent` | inativa | não autorizado, não encontrado, estado inválido |
| `ChangeBettingAgentCompensationPolicy` | agenda nova vigência hoje ou no futuro e encerra a anterior | não autorizado, não encontrado, política inválida, retroativa, com lacuna ou sobreposição |

Leituras retornam DTOs/projeções, nunca entidades ou modelos Prisma. Possível duplicidade é um alerta de negócio: sem confirmação explícita, o caso de uso não persiste; com confirmação, prossegue sem criar constraint artificial.

## Portas e adapters

Portas: `PartyRepository`, `PartyDuplicateQuery`, `BettingAgentRepository`, `BettingAgentQuery`, `Clock` e `TransactionManager` quando necessário. O ator/tenant usa contratos públicos existentes; não duplicar entidade Banca.

Adapters: Prisma, controller/module NestJS, autenticação/autorização existente e módulo/cliente/forms Web.

## Eventos e integrações

Não publicar eventos apenas por usar DDD. Candidatos futuros com consumidor/outbox: `BettingAgentCreated`, `BettingAgentActivated`, `BettingAgentDeactivated`, `CompensationPolicyChanged`. Até lá, módulos usam contrato público de Participants. Quando Lançamentos for planejado, deverá referenciar a versão do endereço vigente ou copiar o snapshot de bairro/cidade do momento da venda; consultar apenas o endereço atual produziria relatório histórico incorreto.

## Persistência e migração

Tabelas conceituais para Party pessoa natural, PartyContact, PartyAddress, BettingAgent e políticas imutáveis/versionadas por vigência. PartyContact e PartyAddress são entidades filhas do agregado Party, sem repositórios públicos próprios. Constraint `(bancaId, code)`; código é texto. Integridade tenant/relacionamentos deve ser reforçada pelo adapter/banco e domínio. Sem cascata que apague histórico. Prisma não atravessa o domínio. Migration e rollback serão detalhados na spec.

## Backend

Contratos candidatos:

- `POST/GET /participants/betting-agents`;
- `GET /participants/betting-agents/:id`;
- `PATCH /participants/betting-agents/:id/profile`;
- `POST /participants/betting-agents/:id/activate`;
- `POST /participants/betting-agents/:id/deactivate`;
- `POST /participants/betting-agents/:id/compensation-policies`.

Autenticação obrigatória, tenant contextual, autorização, paginação/filtros, erros estáveis e nenhum vazamento entre bancas. A criação suporta confirmação explícita de alerta de possível duplicidade e retorna somente candidatos mínimos da própria Banca.

## Web

Tornar `/cambistas` funcional, substituindo arrays locais. O mock visual é referência, não contrato. Remover da primeira entrega dono/vínculos. Listagem cobre busca, estado, paginação, loading, vazio e erro. Cadastro identifica ausência de nome pelo código/talão, sem gravar nome artificial. Permite adicionar/remover vários telefones e editar o endereço ativo, preservando o anterior no Backend. Cadastro/edição segue o drawer existente, com política inicial obrigatória e formulário discriminado de remuneração, aviso confirmável de possível duplicidade, mensagens de conflito, confirmação de inativação, reativação, acessibilidade e permissões. `/pessoas` permanece fora.

## Segurança, tenancy e auditoria

Toda query filtra `bancaId`; busca por ID sem tenant é proibida. IDs de outra banca não revelam existência. OWNER/ADMIN escrevem e leem dados administrativos; USER não acessa esses endpoints. Lookup futuro expõe somente identificação operacional necessária. Auditar criador/alterador e transições/políticas. Não coletar documentos nem registrar contato completo em logs.

## Testes e critérios de aceitação

- Apenas o código manual é obrigatório; cadastro sem nome, telefone e endereço é válido.
- `001` permanece `001`; formato inválido é rejeitado.
- Vários telefones podem coexistir na mesma Party.
- Trocar endereço mantém a versão anterior e somente uma versão ativa.
- Bairro/cidade são normalizados para evitar agrupamentos diferentes por caixa/espaço.
- Duas bancas podem usar `001`; a mesma banca não.
- Corrida para mesmo código produz um sucesso e um conflito.
- Mesmo telefone ou nome+apelido produz alerta; sem confirmação não persiste; com confirmação permite continuar.
- Homônimos e telefone compartilhado nunca são bloqueados.
- Inativar/reativar preserva identidade e código.
- Criação sem política é rejeitada.
- Política inicial começa na criação.
- Nova política pode começar hoje ou no futuro, sem lacuna, retroatividade ou sobreposição, e não altera histórico.
- Falha transacional não deixa Party ou BettingAgent parcial.
- OWNER/ADMIN executam; USER recebe bloqueio nos endpoints administrativos.
- tenant A não lista, consulta ou altera tenant B.
- migration/constraints são testadas em banco real.
- Web cobre loading, vazio, erro, sucesso, conflito, confirmação e teclado.
- Integração remove dependência dos arrays mock.

## Riscos e hipóteses

Sem documento não há deduplicação perfeita; o alerta é heurístico e não pode ser tratado como identidade. Relatórios por bairro precisam usar a versão do endereço vigente no fato, e não apenas o endereço atual. Party/BettingAgent exige fluxo transacional claro. Código imutável estabiliza o histórico, mas exige confirmação clara no cadastro. Política versionada é necessária para snapshots futuros; cálculo de semana parcial e reconhecimento do fixo pertencem ao plano Financeiro. O mock mistura dono/Recolhe fora do escopo. Não existe outbox comprovada. Limites exatos de campos e paginação são decisões técnicas da spec e devem reutilizar VOs/convenções existentes sem alterar as regras aprovadas.

## Definition of Ready

- [x] Objetivo, escopo, atores e dependências identificados
- [x] Bounded context e fronteiras definidos
- [x] D18–D29 registradas
- [x] Nenhuma decisão `CRITICAL/OPEN`
- [x] Criação, código e contatos fechados
- [x] Política de remuneração fechada
- [x] Casos/falhas, tenancy, persistência, Backend, Web e testes avaliados
- [x] Diagrama sincronizado
- [x] Revisão final de prontidão executada
- [x] Capacidade decomposta em increments verticais e INC-01 selecionado

## Definition of Done

- [ ] Implementação/desvios rastreados
- [ ] Testes ligados aos critérios
- [ ] Isolamento, autorização e migration verificados
- [ ] Plano, spec, código, testes e diagrama reconciliados
- [ ] Documentação atualizada e arquivamento autorizado

## Conflitos e descobertas posteriores

- `/cambistas` possui mock com dono/vínculo, que pertence à segunda change.
- `/pessoas` possui protótipo de Dono/Funcionário/Recolhe e fica fora.
- Proposta de entidade única Party/BettingAgent conflita com D18.

## Histórico de transições

| Data | De | Para | Evidência | Motivo |
|---|---|---|---|---|
| 2026-07-17 | baseline desconhecido | DECISIONS_PENDING | decisões D18–D22 | retomada com plan-spec-roadmap |
| 2026-07-17 | DECISIONS_PENDING | READY_FOR_SPEC | D18–D29 decididas, plano completo, diagrama sincronizado e gates aprovados | planejamento apto a gerar prompt; spec ainda não criada |
| 2026-07-17 | READY_FOR_SPEC | READY_FOR_SPEC | INC-01–INC-03 decompostos; INC-01 revalidado | evitar change monolítica e preservar entrega vertical |
