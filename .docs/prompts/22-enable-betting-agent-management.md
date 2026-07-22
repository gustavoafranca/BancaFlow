# Prompt — Propor spec de `enable-betting-agent-management`

## Missão

Use a skill `openspec-propose` para criar uma proposta OpenSpec completa somente para o incremento `INC-02` do módulo Participants — a manutenção de Cambista (edição de perfil, endereço e contatos + ativar/inativar). Produza os artefatos exigidos pelo workflow spec-driven — proposta, design, delta specs e tarefas — mas **não** implemente código, **não** execute migrations e **não** aplique a change.

## Incremento selecionado

- **ID:** `INC-02`
- **Resultado vertical:** OWNER e ADMIN conseguem editar os dados cadastrais, o endereço e os contatos de um Cambista da própria Banca, e ativar/inativar o perfil, tudo pela rota `/cambistas`, num drawer organizado em três abas (Cadastro, Endereço e Contato).
- **Change:** `enable-betting-agent-management`
- **Capability specs (MODIFIED sobre o INC-01):**
  - `participant-registration` — MODIFIED (edição de nome/apelido, contatos com rótulo e endereço da Party existente);
  - `betting-agent-catalog` — MODIFIED (ciclo de vida ACTIVE/INACTIVE do Cambista);
  - `authoritative-permission-catalog` — MODIFIED/decisão (novo recurso no gerenciamento de usuários para definir, por perfil, quem pode **cadastrar**, **alterar** ou **apenas ler** os dados de Cambista — ver "Autorização por perfil" e "Conflitos conhecidos").
  - Não tocar em `betting-agent-compensation-policy` (política permanece no INC-03).

## Fontes e precedência

Leia antes de propor:

1. instruções do repositório e `apps/web/AGENTS.md`;
2. `.docs/plans/01-participants.md`, fonte normativa principal do módulo;
3. `.docs/prompts/11-implement-participant-registration-mvp.md`, base do INC-01 (decisões D18–D29 e recortes de escopo);
4. `.docs/prompts/20-refine-tenant-user-administration-experience.md`, dono da matriz de perfis de acesso e da "regra de evolução do catálogo de permissões";
5. `.docs/prompts/21-frontend-ui-standards.md`, padrões visuais do frontend;
6. specs existentes em `openspec/specs/` — do módulo (participant-registration, betting-agent-catalog) e de autorização (`authoritative-permission-catalog`), transação e roteamento;
7. contratos e padrões implementados em `modules/participants`, `apps/backend/src/modules/participants`, `apps/backend/src/modules/access-control`, `apps/backend/src/shared` e `apps/web/src/shared` (incluindo `apps/web/src/shared/session/use-permissions.ts` e `apps/web/src/shared/api/permissions.client.ts`);
7. protótipo/estado atual em `apps/web/src/modules/cambistas` (drawer, página, schema e cliente) — como referência de reuso e do que falta.

Em divergência, preserve as decisões explícitas D18–D29 do INC-01 e o recorte do INC-02. Mocks e código existente são evidência, não fonte de regra de negócio.

## Objetivo e resultado esperado

Habilitar a manutenção do Cambista já cadastrado, fechando o ciclo iniciado no INC-01 (que só permitia criar, listar e consultar). A entrega integra domínio, persistência, API e Web para permitir **editar** dados cadastrais/endereço/contatos e **ativar/inativar** o Cambista — sem antecipar alteração de política de remuneração nem integrações financeiras.

## Escopo do INC-02

- editar dados da `Party` de um Cambista existente: nome, apelido, endereço e contatos;
- contatos passam a aceitar **rótulo opcional por telefone** (ex.: Celular, Casa), simétrico ao DTO de saída `PartyContactDTO`;
- ativar e inativar o Cambista, alternando `BettingAgentStatus` entre `ACTIVE` e `INACTIVE` de forma explícita;
- expor os endpoints HTTP necessários para edição de perfil e transição de status (ver "Backend e persistência");
- reorganizar o drawer de `/cambistas` em três abas (Cadastro, Endereço, Contato) com modos add/view/edit;
- extrair um componente de telefone reutilizável com máscara BR;
- manter isolamento por tenant e autorização OWNER/ADMIN em toda a superfície nova;
- incluir no **gerenciamento de usuários (Configurações)** um novo recurso que permita definir, **por perfil de usuário**, quem está autorizado a **cadastrar**, **alterar** ou **apenas realizar leitura** dos dados de Cambista (ver "Autorização por perfil");
- criar testes, atualizar documentação do módulo e evidências proporcionais ao risco.

### Autorização por perfil (gerenciamento de usuários)

- Definir as chaves de permissão que segmentam a ação sobre os dados de Cambista: `participants.betting-agents.create` (já existe), `participants.betting-agents.update` (alterar, inclui edição de perfil e transição de status) e `participants.betting-agents.read` (leitura de lista/detalhe). O `openspec-propose` deve confirmar/registrar essas chaves no catálogo autoritativo seguindo a "regra de evolução do catálogo" do prompt `20-...` (Resultado obrigatório 7).
- No menu **Configurações** (administração de usuários), expor uma superfície onde o `OWNER` define, **por perfil** (`OWNER`, `ADMIN`, `USER`), quais dessas três autorizações — cadastrar, alterar ou apenas ler — cada perfil possui sobre os dados de Cambista.
- **Decisão de produto obrigatória (resolver na proposta):** hoje o `authoritative-permission-catalog` é um **catálogo fixo em código** e a matriz de perfis é **projeção read-only** (o prompt `20-...` colocou fora de escopo "criar perfil de acesso persistido" e "criar permissão individual por usuário"). Permitir *definir* create/alter/read por perfil exige escolher explicitamente entre: (a) tornar a atribuição perfil→permissão **configurável e persistida** por banca (muda o modelo atual e precisa de justificativa/registro na change); ou (b) manter o catálogo fixo em código e entregar apenas a **visualização/gestão da matriz** dessas três permissões por perfil, sem persistir customização. A proposta deve declarar a opção adotada, o motivo, o contrato (endpoints/DTOs) e o impacto em specs, nunca deixar ambíguo.
- Qualquer superfície de configuração é restrita ao `OWNER`; a decisão de autorização permanece **server-side** e o Web apenas reflete o estado. Isolamento por tenant em toda leitura/escrita da configuração.

## Fora de escopo obrigatório

- alteração, agendamento, encerramento de vigência ou histórico de **política de remuneração** (permanece INC-03);
- exclusão definitiva (DELETE) do Cambista; reutilização ou alteração do `code`;
- CPF, CNPJ, documentos, e-mail, CEP, UF/estado e complemento de endereço — não existem no modelo e não devem ser inventados;
- Party do tipo `ORGANIZATION`; FieldCollector/Recolhe, dono do Cambista e vínculos;
- tela funcional `/pessoas`;
- permissão **individual por usuário** (a configuração é sempre por perfil, nunca por conta) e criação de perfis/papéis customizados além de `OWNER`/`ADMIN`/`USER`;
- CRUD de chaves de permissão ou catálogo editável em banco fora da decisão declarada em "Autorização por perfil";
- migração de Cambista entre Bancas; login do Cambista ou criação de `UserAccount` para ele;
- lançamentos, turnos, prêmios, ledger, acertos, caixa, relatórios, apostas digitais e qualquer cálculo de comissão;
- eventos/outbox sem consumidor comprovado.

Não transformar itens fora de escopo em tarefas opcionais.

## Decisões preservadas e novas

Reafirmar as decisões D18–D29 do INC-01 (agregados `Party` e `BettingAgent` separados; apenas OWNER/ADMIN administram; CPF/documentos fora; só Party `PERSON`; código imutável e nunca reutilizado; política obrigatória na criação; endereço exige bairro+cidade quando presente; duplicidade gera alerta confirmável, nunca bloqueio).

Decisões novas do INC-02:

- **D30:** edição de perfil é permitida e altera a `Party` existente (não cria nova Party nem novo BettingAgent).
- **D31:** o `code`/talão permanece **imutável** — nunca editável na tela nem aceito pelos endpoints de edição.
- **D32:** o ciclo de vida do Cambista é `ACTIVE` ⇄ `INACTIVE`, com transição explícita; inativar não apaga nem oculta o histórico, apenas altera o status.
- **D33:** contatos aceitam rótulo opcional por telefone; a ausência de rótulo é válida.
- **D34:** endereço mantém somente os campos existentes na tabela (`street`, `number`, `neighborhood`, `city`); bairro e cidade obrigatórios quando houver endereço.
- **D35:** a política de remuneração **não** é editável neste incremento (fica no INC-03).
- **D36:** a autorização sobre os dados de Cambista é segmentada em três chaves — `create` (cadastrar), `update` (alterar, inclui status) e `read` (apenas ler) — e é configurável **por perfil** (`OWNER`/`ADMIN`/`USER`), nunca por usuário individual; a decisão entre configuração persistida por banca ou matriz fixa em código é resolvida na proposta (ver "Autorização por perfil" e "Conflitos conhecidos"), sempre com a autorização decidida server-side.

Alternativas rejeitadas que não devem reaparecer: código editável/reatribuível; exclusão física do Cambista; edição de política junto com o perfil; adicionar CEP/UF/documentos ao endereço; criar nova Party ao editar.

## Domínio e invariantes

Modele com DDD, POO e Arquitetura Limpa, evitando entidades anêmicas:

- a edição opera sobre o agregado `Party` existente: substitui nome/apelido, reconcilia a lista de `PartyContact` (telefone normalizado + rótulo opcional) e o `PartyAddress` corrente;
- entidades internas `PartyContact` e `PartyAddress` continuam alteradas apenas pelo agregado/repositório de `Party`;
- reconciliação de contatos preserva a semântica atual: telefone normalizado via VO `Phone` (10 ou 11 dígitos, com DDD), rótulo é texto livre curto e opcional;
- transição de status do `BettingAgent` usa o VO `BettingAgentStatus` já existente; `code`, `bancaId` e `partyId` são imutáveis;
- `bancaId`/tenant sempre vêm do contexto autenticado, nunca do body;
- toda edição de outra Banca é indistinguível de inexistente (não revela existência de recurso alheio);
- edição e transição de status ocorrem em transação; falha produz rollback completo;
- endereço, quando presente, exige bairro e cidade; endereço vazio é permitido (perfil sem endereço);
- não criar serviço de domínio sem regra genuinamente transversal; coordenação entre agregados pertence ao caso de uso.

## Casos de uso e portas

Defina apenas:

- `UpdateBettingAgentProfile` — edita nome/apelido, contatos e endereço da `Party` do Cambista;
- `SetBettingAgentStatus` — ativa/inativa o Cambista.

Para a "Autorização por perfil", os casos de uso dependem da decisão de produto adotada: se **(a) persistida**, definir `GetRolePermissionConfiguration` e `SetRolePermissionConfiguration` (escopados por banca/tenant, restritos a `OWNER`) sobre as três permissões de Cambista; se **(b) fixa em código**, reutilizar `GetRolePermissionMatrixUseCase` já existente em Access Control e apenas projetá-lo, sem novo caso de uso de escrita. Não criar repository Prisma nem agregado persistido em Access Control quando a decisão for (b).

Portas reutilizadas (já existentes no INC-01): `PartyRepository`, `BettingAgentRepository`, `BettingAgentQuery` (leitura/detalhe), `Clock` e o `TransactionManager`/mecanismo transacional compartilhado. Repositories continuam sem expor delete. Queries de leitura não retornam entidades nem modelos Prisma. DTOs não carregam regra de domínio nem acoplamento ao ORM.

## Backend e persistência

- Adicionar os endpoints ao controller existente `apps/backend/src/modules/participants/betting-agent.controller.ts`, protegidos por `JwtCookieAuthGuard`, com `bancaId`/autor sempre do token:
  - `PATCH /participants/betting-agents/:id` — edição de perfil: `name?`, `nickname?`, `phones?` e `address?`. **Não** aceitar `code` nem `policy`.
  - `PATCH /participants/betting-agents/:id/status` — corpo `{ status: 'ACTIVE' | 'INACTIVE' }`.
- **Ampliar o DTO de contato** para carregar rótulo: `phones: { phone: string; label?: string }[]`. Hoje `CreateBettingAgentDto.phones` é `string[]` (`apps/backend/src/modules/participants/dto/create-betting-agent.dto.ts`); aplicar o novo formato tanto na **criação** quanto na **edição**, para manter simetria com `PartyContactDTO` de saída. Criar `UpdateBettingAgentDto` (ou equivalente) reutilizando `BettingAgentAddressBodyDto`.
- O modelo Prisma **já suporta** `PartyContact.label`, `PartyAddress` (street/number/neighborhood/city) e `BettingAgent.status` — avaliar explicitamente se alguma migration é necessária (p. ex. índice/versionamento na reconciliação de endereço/contatos); se não for, declarar "sem migration" com justificativa.
- Implementar a reconciliação de contatos/endereço nos repositories Prisma com mapeamento explícito entre banco, domínio e DTO; sem cascata destrutiva de histórico.
- Aplicar autorização server-side OWNER/ADMIN em todos os endpoints novos; `USER` recebe bloqueio. Busca por ID sempre inclui tenant.
- Mapear conflitos e falhas de domínio para os erros estáveis já existentes em `modules/participants/src/shared/errors/participants.errors.ts` (ex.: `BETTING_AGENT_NOT_FOUND`, `FORBIDDEN`, `INVALID_PHONE`, `INVALID_ADDRESS`); não vazar detalhes de banco. Não registrar telefones/endereço completos em logs.
- Segmentar a autorização dos endpoints de Cambista pelas chaves `participants.betting-agents.create` (POST), `participants.betting-agents.update` (PATCH de perfil e de status) e `participants.betting-agents.read` (GET lista/detalhe), coerentes com a superfície de "Autorização por perfil". Registrar/confirmar essas chaves no catálogo autoritativo (`apps/backend/src/modules/access-control`) conforme a regra de evolução do catálogo do prompt `20-...`.
- **Autorização por perfil no Access Control:** conforme a decisão adotada — (a) persistida: adicionar endpoints em `access-control.controller.ts` para ler e gravar a atribuição perfil→(create/alter/read) escopada por tenant, com use cases/portas correspondentes e migration Prisma revisável; (b) fixa: reutilizar `GET /access-control/role-permissions` (`GetRolePermissionMatrixUseCase`) projetando as três permissões por papel, sem persistência nova. Em ambos os casos, escrita/leitura restrita a `OWNER` e isolada por banca.

## Web

- Reutilizar a rota `/cambistas` e o módulo `apps/web/src/modules/cambistas`; não criar rota nem menu novos.
- **Unificar** `CreateBettingAgentDrawer` e `BettingAgentDetailDrawer` (`components/betting-agent-drawer.tsx`) num único drawer com modos **add / view / edit** e **três abas**, usando o primitive `Tabs` de `apps/web/src/shared/components/ui/tabs.tsx`. Seguir o padrão drawer+tabs+modos já demonstrado em `apps/web/src/modules/pessoas/pages/pessoas.page.tsx` (referência estrutural, ainda que mock):
  - **Aba Cadastro:** código/talão (somente leitura no modo edit), nome, apelido e política (formulário discriminado — já existe; não editável nesta change, apenas exibida no edit).
  - **Aba Endereço:** `street`, `number`, `neighborhood` (obrigatório), `city` (obrigatório). Adicionar os inputs de `street`/`number`, que já existem no schema mas ainda não têm UI.
  - **Aba Contato:** lista dinâmica de telefones, cada um com número (mascarado) e rótulo opcional.
- **Componente de telefone reutilizável** `PhoneInput` em `apps/web/src/shared/components/ui/` (promovido a shared por ser reutilizado em outros módulos): máscara BR `(XX) XXXX-XXXX` / `(XX) XXXXX-XXXX`, armazena somente dígitos, `inputMode="tel"`, integrável com React Hook Form. Validação de UX espelhando o VO `Phone` do domínio (10 ou 11 dígitos com DDD). Não introduzir biblioteca de máscara nova sem justificativa; preferir máscara leve própria. Substituir o `PhoneList` inline atual por este componente.
- **Editar:** usar `DrawerFooter` de `apps/web/src/shared/components/ui/drawer.tsx` com `mode="edit"` e `onEdit`/`onSave` (já suportados). Criar `updateBettingAgentSchema` em `data/betting-agent.schema.ts` reaproveitando os VOs locais existentes; no modo edição, `code` é read-only/omitido (padrão create-vs-update do `frontend-form-schema`).
- **Ativar/inativar:** controle (botão ou switch) coerente com o layout de `.docs/prompts/21-frontend-ui-standards.md`, chamando o novo endpoint de status; refletir imediatamente no Badge da linha e nos cards de estatística da página.
- Adicionar ao cliente `data/betting-agent.client.ts` as funções `update()` e `setStatus()`, mapeando os códigos de erro de domínio no mesmo padrão discriminado de `create()`.
- Implementar estados loading/erro/vazio, respeitar as permissões `participants.betting-agents.*` (esconder cadastrar/editar/ativar de quem não tem `create`/`update`; exigir `read` para ver lista/detalhe) via `useHasPermission` (`apps/web/src/shared/session/use-permissions.ts`) e manter o Backend como autoridade.
- **Autorização por perfil (Configurações):** no módulo de administração de usuários (`apps/web/src/modules/configuracoes`), adicionar a superfície onde o `OWNER` define, por perfil (`OWNER`/`ADMIN`/`USER`), quais das três autorizações — cadastrar / alterar / apenas ler — cada perfil tem sobre os dados de Cambista. Integrar-se à matriz de perfis de acesso já existente (consumindo `apps/web/src/shared/api/permissions.client.ts` / endpoints de Access Control) e seguir os padrões de `.docs/prompts/20-...` e `.docs/prompts/21-...`. A UI é somente reflexo/edição do estado autoritativo; a decisão permanece server-side. Se a decisão de produto for a opção (b) fixa, esta superfície é apenas leitura da matriz dessas três permissões por perfil.
- Usar React Hook Form e o validador local `apps/web/src/shared/form/validator.ts` (`v.defineObject`/`resolver`/`infer`/`refine`); não há `v.string/array` nem componentes `Form*` — usar VOs locais em `data/*.schema.ts` e as primitives `ui/*` com RHF direto (modelo: `betting-agent-drawer.tsx`).
- Seguir `apps/web/AGENTS.md` e a documentação local da versão do Next.js antes de escrever código de rota.

## Testes e critérios de aceitação

Exigir testes unitários, integração real e Web para provar pelo menos:

- edição de nome/apelido persiste e retorna no detalhe;
- edição de contatos: adicionar, remover e trocar telefone; rótulo opcional preservado; telefone inválido (≠ 10/11 dígitos) é rejeitado;
- edição de endereço: preencher, alterar e remover; bairro/cidade obrigatórios quando há endereço;
- `code` e política **não** podem ser alterados pela edição (endpoint ignora/rejeita);
- ativar e inativar alternam o status e refletem na listagem; transição é idempotente e determinística;
- OWNER e ADMIN editam e alternam status; USER é bloqueado (tela e endpoints);
- tenant A não edita nem altera status de recurso do tenant B (indistinguível de inexistente);
- edição/transição em transação: falha causa rollback total, sem estado parcial;
- Web cobre os três modos (add/view/edit), navegação por abas por teclado, e estados loading/erro/vazio;
- o `PhoneInput` mascara/normaliza corretamente números de 10 e 11 dígitos e entrega somente dígitos ao submit;
- autorização por perfil: um perfil com apenas `read` vê lista/detalhe mas não cadastra nem altera; um perfil sem `read` não acessa; alterar a configuração por perfil (opção persistida) reflete na autorização efetiva e é restrita ao `OWNER`; a configuração de uma banca não afeta outra (isolamento por tenant);
- integridade do catálogo/matriz das três permissões de Cambista por papel, conforme a regra de evolução do catálogo do prompt `20-...`.

Inclua comandos/gates de build, lint e testes por workspace, mas não marque tarefas como concluídas na proposta.

## Skills e organização das tarefas

Organize `tasks.md` em grupos verticais e rastreáveis, preparando a aplicação futura nesta ordem:

1. **Negócio:** `module-use-case` (`UpdateBettingAgentProfile`, `SetBettingAgentStatus`); `module-entity`/`module-value-object` apenas se a reconciliação de contatos/endereço ou a transição de status exigirem ajuste; `module-repository` e `module-dto` para edição, rótulo de contato e status. `module-domain-service` somente se justificado.
2. **Backend:** `backend-prisma-data` (reconciliação/mapeamento, migration só se necessária) e `backend-controller` (novos endpoints PATCH + DTOs).
3. **Web:** `frontend-module-workflow` (evolução do módulo cambistas — unificação do drawer em abas, ownership do `PhoneInput` promovido a shared — e a superfície de autorização por perfil no módulo `configuracoes`) + `frontend-form-schema` (schema de edição e do contato com rótulo). Ambas as skills se aplicam; adaptar os caminhos genéricos das skills ao projeto real (`apps/frontend` → `apps/web`; `@namespace/shared` → `@/shared/form/validator`).
4. **Integração/revisão:** build, testes, migration real (se houver), isolamento de tenant, documentação do módulo e confronto com o plano.

Na aplicação futura, preservar a estratégia de contextos limpos: Negócio primeiro; depois Backend e Web em subagentes separados quando os contratos estiverem estáveis; integração e validação final por um responsável coordenador. A proposta apenas prepara essas tarefas e não inicia subagentes.

Não usar `config-project`, `config-prisma`, `config-shared-backend`, `config-shared-frontend` (a infraestrutura já existe) nem `module-aggregate` (nada de CRUD genérico).

## Conflitos conhecidos

- O INC-01 declarou explicitamente que edição, ativação e inativação ficariam para o INC-02 (ver `.docs/prompts/11-...`, "Fora de escopo obrigatório"); esta change é a materialização desse INC-02 — não reabrir decisões de produto do INC-01.
- O DTO de criação atual aceita `phones: string[]` sem rótulo; ao introduzir o rótulo, atualizar criação e edição juntas, mantendo compatibilidade com o `PartyContactDTO` de saída.
- O drawer atual mistura estilo inline (`style` + `useTheme`) com as primitives Tailwind dos componentes shared; ao unificar, alinhar ao padrão de `.docs/prompts/21-frontend-ui-standards.md` sem introduzir regressão visual.
- A política de remuneração aparece no detalhe/edição apenas como leitura; não transformar isso em edição de política.
- **Tensão de autorização (decidir na proposta):** o prompt `20-...` fixou "manter a matriz como catálogo de código, sem perfis customizados persistidos" e colocou fora de escopo "criar perfil de acesso persistido" e "criar permissão individual por usuário". O novo recurso de *definir* create/alter/read por perfil pressiona essa decisão. A change deve resolver isso explicitamente — opção (a) persistida por banca (supera a decisão anterior, exige justificativa e migration) ou opção (b) matriz fixa por código com UI de leitura/gestão dessas três permissões — e nunca contradizer o histórico de forma silenciosa. Continuar tratando permissão como decisão **server-side**; nunca confiar em flag vinda do body/cliente.

## Saída solicitada

Crie a change `enable-betting-agent-management` usando o workflow OpenSpec local e produza todos os artefatos necessários para ficar pronta para revisão, não para aplicação automática. Garanta rastreabilidade entre requisitos, cenários, design e tarefas; detalhe decisões técnicas sem alterar as decisões de produto; destaque qualquer bloqueio real. Ao final, informe os arquivos criados e peça revisão/aprovação antes de `/opsx:apply`.
