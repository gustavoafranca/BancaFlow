# Prompt — Refinar a administração de usuários e consolidar padrões de experiência

## Missão

Use a skill `openspec-propose` para criar uma **change OpenSpec de refinamento**, completa, coerente e pronta para implementação, sobre a entrega já realizada por `enable-tenant-user-administration`.

A change deve corrigir a experiência visual e de interação da administração de usuários, do logout e da matriz de perfis de acesso, além de transformar as decisões aprovadas neste prompt em contratos reutilizáveis para os próximos desenvolvimentos do Web.

Esta execução é exclusivamente de **planejamento e especificação**. Não implemente código de produto nesta etapa.

Nome sugerido para a change:

```text
refine-tenant-user-administration-experience
```

Não edite nem reabra a change original para esconder os ajustes. Trate esta iniciativa como uma evolução rastreável do que já foi entregue.

## Decisões de escopo já aprovadas

Esta change deve:

- manter a administração de usuários exclusiva do `OWNER` nesta versão;
- manter os papéis fixos `OWNER`, `ADMIN` e `USER`;
- manter a matriz de permissões como catálogo de código, sem perfis customizados persistidos;
- reutilizar os casos de uso, endpoints, contracts, componentes e tokens existentes sempre que forem adequados;
- corrigir a causa compartilhada dos problemas de tema, em vez de aplicar cores isoladas em cada tela;
- usar drawer para criação, detalhamento e edição de recursos administrativos que possuam ciclo de vida de consulta/alteração;
- manter modal para confirmação de ações, especialmente ações destrutivas;
- preservar o design atual do produto, suas cores, espaçamentos, tipografia e comportamento responsivo;
- garantir acessibilidade por teclado, foco, leitores de tela e contraste em modo claro e escuro;
- criar ou ajustar specs canônicas para que os padrões continuem obrigatórios nas próximas changes.

Esta change não deve:

- criar tabela, coluna, relação ou migração Prisma;
- criar perfil de acesso persistido;
- criar permissão individual por usuário;
- criar CRUD de chaves de permissão;
- introduzir um segundo design system ou uma biblioteca de UI concorrente;
- copiar overlays improvisados de módulos existentes quando já houver um primitive compartilhado capaz de atender;
- transformar toda tabela do sistema em drawer indiscriminadamente;
- alterar a regra de autorização `OWNER`/`ADMIN`/`USER` sem uma decisão de produto separada;
- enfraquecer as regras de senha forte ou a troca obrigatória da senha temporária.

Se a análise concluir que algum requisito depende de banco, biblioteca nova ou mudança de contrato externa, registre a decisão e o impacto no `design.md`. Não autorize banco novo. Para uma dependência frontend realmente necessária, prefira a mesma família tecnológica já adotada e justifique-a antes de criar tasks.

## Como executar

1. Leia integralmente a skill `openspec-propose` antes de agir.
2. Leia todos os `AGENTS.md` aplicáveis. No Web, respeite a documentação local da versão de Next.js antes de especificar comportamento dependente do framework.
3. Execute `openspec list`, valide o estado de `enable-tenant-user-administration` e leia seus `proposal.md`, `design.md`, specs e `tasks.md`.
4. Audite o código e os testes reais antes de propor novos componentes ou contratos.
5. Consulte as specs canônicas e changes ativas que possam consumir permissões ou os novos padrões de interface.
6. Crie uma única change com `proposal.md`, `design.md`, delta specs e `tasks.md` completos.
7. Organize as tasks em fatias verticais verificáveis, sem tarefas genéricas como “ajustar UI”.
8. Inclua testes unitários, de componentes, integração, E2E e validação visual manual em claro/escuro e desktop/mobile.
9. Execute a validação OpenSpec em modo estrito e corrija todas as inconsistências.
10. Pare depois de criar e validar os artefatos. **Não use `openspec-apply-change` e não altere código de produto nesta execução.**

Caso uma regra deste prompt contrarie uma spec vigente, produza o delta correspondente e registre claramente a mudança de contrato.

## Fontes obrigatórias

Leia e reconcilie, no mínimo:

- `.docs/prompts/19-enable-tenant-user-access-management.md`;
- `openspec/changes/enable-tenant-user-administration/**`;
- `openspec/specs/authoritative-permission-catalog/spec.md`;
- `openspec/specs/credential-management/spec.md`;
- `openspec/specs/session-management/spec.md`;
- `openspec/specs/settings-capability-visibility/spec.md`;
- `openspec/specs/route-protection-frontend/spec.md`;
- `openspec/specs/user-account-management/spec.md`;
- `openspec/specs/web-component-inventory/spec.md`;
- `openspec/specs/web-component-ownership/spec.md`;
- `openspec/specs/web-design-migration/spec.md`;
- `openspec/specs/web-frontend-boundaries/spec.md`;
- `openspec/specs/web-frontend-testing/spec.md`;
- changes ativas que criem módulos, menus, endpoints ou capacidades protegidas;
- `packages/shared/src/query/**`;
- regras de senha e erros compartilhados em `packages/shared`;
- `modules/access-control/**` e seus testes;
- `modules/identity/**` e seus testes;
- `apps/backend/src/modules/identity/**`;
- `apps/backend/src/modules/access-control/**`;
- `apps/web/src/modules/configuracoes/**`;
- `apps/web/src/modules/perfil/**`;
- `apps/web/src/modules/premios/**`, apenas como referência de interação de linha que abre detalhe lateral, sem copiar sua implementação improvisada;
- `apps/web/src/app/(private)/_shell/**`;
- `apps/web/src/shared/theme/**`;
- `apps/web/src/shared/components/ui/**`;
- testes atuais de todas essas áreas.

O código e os testes atuais são a fonte de verdade para integração. Não presuma que um componente existe porque é citado por uma skill ou por outro projeto.

## Estado verificado que a proposta deve reconhecer

A implementação atual já entrega a administração funcional e possui testes unitários/de componente aprovados. O refinamento não deve reconstruir o fluxo do zero.

Também já foi verificado que:

- a listagem usa `PaginatedInputDTO` e `PaginatedResultDTO` exportados por `packages/shared/src/query/index.ts`;
- o backend executa `count` e `findMany` com o mesmo filtro tenant-scoped, excluindo `OWNER` antes da paginação;
- o frontend usa páginas de 20 itens e apresenta controles Anterior/Próxima quando há mais de uma página;
- o DTO HTTP valida mínimo de `1`, mas ainda não limita o máximo de `pageSize`;
- o `DialogContent` compartilhado já oferece `variant="drawer"`;
- criação e edição de usuário ainda usam o variant modal;
- a tabela concentra muitas ações pequenas em uma coluna, prejudicando leitura e uso;
- o drawer de Prêmios demonstra a interação desejada de clicar na linha para abrir detalhe lateral, mas é uma implementação específica do módulo;
- os tokens de tema são aplicados em um contêiner interno, enquanto os portals do Radix são montados em `document.body`; por isso dialogs/drawers portaled não herdam corretamente o dark mode;
- não existe um componente `Select` compartilhado; os formulários e filtros usam `<select>` nativo e a lista de opções pode continuar branca no modo escuro;
- a matriz de perfis de acesso renderiza todos os grupos expandidos na mesma página, deixando a leitura longa;
- o `Button` compartilhado ainda não possui uma variante destrutiva canônica;
- o modal de logout usa três botões sem hierarquia destrutiva clara e um único estado de processamento para as duas ações;
- a senha temporária atual é uma sequência aleatória forte de 16 caracteres, segura, mas difícil de ditar e digitar.

As imagens originais fornecidas pelo solicitante estavam em uma pasta temporária do Windows e podem não estar disponíveis durante a execução do prompt. Use as observações acima como requisito. Se as imagens forem anexadas novamente, use-as apenas como referência visual adicional, sem substituir os critérios objetivos de aceite.

## Resultado obrigatório 1 — senha temporária segura e fácil de comunicar

Substitua o formato visualmente aleatório, semelhante a `vQe*vYSX8VjwA#Na`, por uma senha temporária humana, fácil de ler, ditar e digitar.

A proposta deve definir e justificar um formato memorizável, por exemplo uma combinação CSPRNG de palavras curtas e neutras com separadores e números. O exemplo é ilustrativo; o `design.md` deve calcular/documentar a entropia real e escolher quantidade de palavras, tamanho do vocabulário e sufixo suficientes para o contexto de senha temporária.

Requisitos obrigatórios:

- continuar usando gerador criptograficamente seguro;
- satisfazer o contrato real de `StrongPassword` sem enfraquecê-lo;
- usar palavras sem acentos, fáceis de distinguir por voz e sem conteúdo ofensivo;
- evitar caracteres, palavras ou números ambíguos quando isso melhorar a comunicação;
- nunca derivar a senha de nome, username, e-mail, banca ou outro dado previsível;
- continuar exigindo troca no primeiro acesso;
- retornar a senha em texto puro somente uma vez ao `OWNER` autorizado;
- nunca registrar a senha em log, telemetria, erro ou persistência em texto puro;
- manter comportamento seguro em falha de geração;
- mostrar a senha em bloco legível, com ação de copiar e aviso explícito de exibição única;
- cobrir criação e redefinição administrativa de senha com o mesmo padrão;
- adicionar testes determinísticos por port/fake e testes do gerador real por invariantes, não por valor fixo.

Não crie um novo VO se `StrongPassword` e os contratos atuais já expressarem as invariantes. O formato pertence ao adapter do gerador; a regra de força continua compartilhada.

## Resultado obrigatório 2 — tema correto em todos os overlays

Corrija a causa-raiz da herança de tema dos conteúdos renderizados por portal.

A solução deve garantir que Dialog, Drawer, Select e futuros overlays recebam os mesmos tokens do tema ativo, mesmo quando montados fora da árvore visual imediata. Avalie aplicar os tokens no elemento raiz/documento ou configurar um contêiner de portal temático. Registre no `design.md` a alternativa escolhida e por que ela funciona com SSR/hidratação e a versão real do Next.js.

Não aceite como solução:

- cor branca/preta hardcoded dentro de cada modal;
- duplicar os tokens manualmente em cada drawer;
- corrigir apenas “Novo usuário” e deixar os demais portals inconsistentes;
- depender somente da classe `dark` se o sistema atual usa tokens dinâmicos adicionais.

Valide pelo menos:

- novo usuário;
- edição/detalhe de usuário;
- sessões e confirmações administrativas;
- logout;
- select aberto;
- modo claro e escuro;
- troca de tema com overlay aberto, se o primitive suportar esse estado;
- ausência de flash de tema incorreto na hidratação.

## Resultado obrigatório 3 — Select compartilhado e acessível

Crie ou consolide um único primitive `Select` compartilhado para substituir os selects nativos nos fluxos tocados pela change e fornecer um caminho de migração para os demais módulos.

O componente deve:

- respeitar integralmente os tokens de tema no controle e na lista de opções;
- ter estados hover, focus-visible, open, selected, disabled e invalid;
- funcionar por teclado e leitor de tela;
- expor label/descrição/erro por contratos compatíveis com os forms existentes;
- integrar-se com React Hook Form sem criar estado duplicado;
- funcionar em filtros e formulários;
- usar portal compatível com a correção de tema;
- possuir testes do primitive e testes de integração nos fluxos de usuário.

Se o select nativo não conseguir atender de forma confiável ao popup escuro em todos os navegadores suportados, a proposta pode avaliar o primitive Select da mesma família Radix já usada por Dialog. Essa decisão deve ser explícita; não introduza outra biblioteca visual concorrente.

Mapeie os selects nativos existentes no projeto e delimite a migração. Esta change deve corrigir todos os selects da administração de usuários e pode criar tasks separadas e justificadas para migrar ocorrências simples relacionadas, sem expandir para um redesign geral.

## Resultado obrigatório 4 — padrão canônico de lista e drawer

Refatore a seção Usuários para uma experiência de lista-detalhe:

- a linha inteira representa a abertura do detalhe e deve ser clicável e acionável por teclado;
- clicar ou pressionar Enter/Espaço abre um drawer lateral;
- o drawer usa o `DialogContent variant="drawer"` compartilhado como base, ajustando o primitive somente se houver uma necessidade genérica comprovada;
- o drawer apresenta os dados da conta e organiza edição, papel, status, senha e sessões com hierarquia clara;
- criação usa o mesmo shell visual de drawer em modo de criação;
- atualização permanece no drawer, evitando modal solto para formulário CRUD;
- ações destrutivas ou sensíveis continuam exigindo confirmação explícita em modal;
- controles interativos dentro da linha não podem disparar acidentalmente a abertura do drawer;
- o estado selecionado, retorno de foco, fechamento por Escape, título acessível e navegação mobile devem ser especificados;
- a tabela deixa de exibir uma coluna extensa com todas as ações pequenas; mantenha, no máximo, um affordance discreto de detalhe/mais ações quando necessário;
- após mutação, a lista deve recarregar a fonte autoritativa sem perder contexto válido de busca/página, exceto quando o item deixa de pertencer ao filtro atual.

Transforme essa decisão em uma spec canônica do Web para próximos desenvolvimentos:

- tabela/lista de **recurso com detalhe e edição**: linha abre drawer; criar e editar usam drawer; confirmação destrutiva usa modal;
- tabela estritamente analítica, relatório, resumo ou seleção em massa: não é obrigada a ter drawer;
- formulário curto e contextual sem recurso detalhável pode continuar em modal quando houver justificativa;
- nenhuma página deve copiar o drawer específico de outro módulo; o primitive e o shell reutilizável pertencem à camada compartilhada adequada.

Avalie o fluxo de Prêmios como referência de comportamento, mas não replique seus valores fixos de posição/largura nem sua implementação específica.

## Resultado obrigatório 5 — logout destrutivo, claro e alinhado

Redesenhe o modal único de logout preservando as duas opções funcionais:

- sair somente deste dispositivo;
- sair de todos os dispositivos.

O modal deve:

- usar cor/token destrutivo vermelho de forma coerente com o design atual;
- ter ícone, título, descrição e ações visualmente alinhados;
- explicar de forma curta o efeito de cada opção;
- destacar “Sair deste dispositivo” como ação principal recomendada;
- apresentar “Sair de todos os dispositivos” como ação secundária sensível, sem competir visualmente com a principal;
- manter Cancelar como ação segura e foco inicial preferencial;
- funcionar bem sem quebra confusa dos botões em telas estreitas;
- indicar carregamento somente na opção escolhida;
- impedir duplo envio e manter o modal aberto com erro compreensível quando a chamada falhar;
- devolver foco ao gatilho quando cancelado;
- redirecionar somente após sucesso, preservando os contratos atuais do backend.

Consolide no design system:

- tokens destrutivos com contraste aprovado em claro/escuro;
- variante `destructive` do Button, se ainda não existir;
- regras para confirmação destrutiva, sem espalhar vermelho hardcoded pelos módulos.

## Resultado obrigatório 6 — Configurações e Perfis de acesso legíveis

Organize Configurações em abas de alto nível, no mínimo:

- `Usuários`;
- `Perfis de acesso`.

Na aba Perfis de acesso:

- deixe explícito que os perfis são papéis fixos do sistema, não cadastros editáveis nesta versão;
- mantenha a matriz como projeção do catálogo autoritativo do backend;
- apresente legenda clara para permitido/não permitido e para `OWNER`, `ADMIN` e `USER`;
- agrupe por capability/tópico;
- permita recolher e expandir cada tópico;
- defina um estado inicial que evite uma página excessivamente longa;
- preserve busca/leitura rápida, responsividade, semântica e navegação por teclado;
- não exiba chaves técnicas cruas ao usuário quando já houver label e descrição em português;
- trate loading, forbidden, erro e catálogo vazio.

Audite se já existem primitives compartilhados de Tabs e Collapsible/Accordion. Se não existirem, especifique primitives mínimos, acessíveis e reutilizáveis, justificando sua propriedade e seus testes. Não crie componentes locais descartáveis se o padrão será obrigatório em outras telas.

## Resultado obrigatório 7 — regra para nunca esquecer novas permissões

Atualize a spec canônica de catálogo autoritativo e, quando necessário, as specs de workflow do frontend para tornar obrigatório o seguinte Definition of Done:

Toda nova capability, rota, endpoint ou ação protegida deve, na mesma change:

1. declarar uma `PermissionKey` estável no catálogo oficial;
2. fornecer label, descrição, ordem e agrupamento em português para apresentação;
3. decidir explicitamente a concessão para `OWNER`, `ADMIN` e `USER`, inclusive quando a decisão for negar;
4. aplicar enforcement no backend por `PermissionChecker`/`hasPermission`, mantendo invariantes contextuais no domínio;
5. aplicar gate de rota, menu e ação no frontend quando for pertinente, sem substituir a segurança do backend;
6. aparecer automaticamente na projeção/matriz de Perfis de acesso;
7. incluir testes de integridade do catálogo, matriz por papel, endpoint protegido e visibilidade da UI;
8. reconciliar changes ativas consumidoras para impedir divergências silenciosas;
9. documentar capacidades planejadas sem criar chave desconectada de uso real.

Isso é uma regra de evolução do catálogo em código. **Não** significa cadastrar perfis, chaves ou permissões em banco.

Inclua uma proteção automatizada de integridade que falhe quando:

- uma chave estiver duplicada;
- uma chave não tiver metadados de apresentação;
- um papel não tiver decisão explícita para uma chave;
- a matriz exposta divergir do catálogo/mapeamento;
- uma capability protegida adicionada pela change não tiver cobertura prevista de enforcement e UI.

## Resultado obrigatório 8 — paginação robusta e compartilhada

Preserve o uso de:

- `PaginatedInputDTO`;
- `PaginatedResultDTO`;
- `PaginationMetaDTO`;
- exports de `packages/shared/src/query/index.ts`.

Não crie DTO local incompatível nem paginação client-side sobre o conjunto inteiro.

Aprimore o contrato atual para:

- limitar `pageSize` no DTO HTTP a um teto seguro e documentado;
- manter `page >= 1` e `pageSize >= 1`;
- manter `count` e busca com o mesmo `where` tenant-scoped;
- evitar página inválida após filtros ou mutações;
- apresentar total e contexto de página de forma legível;
- desabilitar corretamente Anterior/Próxima;
- manter filtros ao navegar e voltar do drawer;
- cobrir zero itens, uma página, múltiplas páginas, última página incompleta e mudança de filtro;
- testar rejeição de `pageSize` acima do limite.

Se houver uma necessidade genérica de paginação que ainda não esteja expressa no pacote compartilhado, proponha a menor extensão compatível. Não mova regra específica de tela para `packages/shared`.

## Fronteiras arquiteturais obrigatórias

### Identity

Continua dono da geração de senha temporária, credenciais, conta, status, papel e sessões. O gerador concreto permanece adapter; o caso de uso depende do port. Não mova regra de identidade para o frontend.

### Access Control

Continua dono do catálogo, `PermissionKey`, matriz fixa e decisão de autorização. Não crie repository Prisma nem agregado persistido em Access Control.

### Tenancy

Continua fornecendo o limite da banca. Todas as queries e mutações administrativas permanecem tenant-scoped pelo contexto autenticado.

### Web compartilhado

Primitives genéricos de tema, Select, Drawer/Dialog, Tabs, Collapsible e Button pertencem à camada compartilhada somente quando tiverem contrato reutilizável e independente do domínio. Composição “Usuário”, labels e regras de conta permanecem no módulo Configurações.

### `packages/shared`

Reutilize `Result`, erros, VOs e paginação existentes. Não transforme componentes visuais em compartilhamento backend/frontend. Não duplique contratos já exportados.

## Segurança e tratamento de erros

Preserve:

- backend como autoridade final;
- `bancaId` vindo somente do contexto autenticado;
- ausência de administração do próprio `OWNER` pelo painel;
- ausência de alvos `OWNER` na listagem administrável;
- `403` para falta de permissão/invariante contextual e `404` para alvo inexistente ou de outra banca, conforme contrato vigente;
- `expectedVersion`/concorrência otimista na atualização;
- revogação de sessões nas mudanças sensíveis já definidas;
- códigos de erro centralizados nos catálogos existentes;
- nenhuma senha em logs ou estado persistido do navegador.

Não faça controller, componente ou client comparar papel bruto quando já existir `PermissionKey` para a decisão.

## Testes e evidências obrigatórias

A `tasks.md` deve exigir, no mínimo:

- testes do gerador de senha humana e das invariantes de força;
- testes dos casos de uso de criação/reset para exibição única e troca obrigatória;
- testes do limite máximo de paginação;
- testes do Select compartilhado em teclado, erro, disabled e tema;
- testes do Drawer compartilhado e integração com criação/detalhe/edição;
- testes de clique e teclado na linha, incluindo prevenção de propagação de ações internas;
- testes do logout para cada ação, loading independente, erro e foco;
- testes de Tabs e grupos recolhíveis de Perfis de acesso;
- testes de integridade do catálogo e da matriz;
- testes dos gates de menu/rota/ação;
- regressão dos testes de Shared, Access Control, Identity, Backend e Web;
- E2E com banco real para isolamento entre bancas, OWNER/ADMIN/USER, paginação, criação, atualização, mudança de papel, status, senha e sessões;
- E2E ou teste de navegador para logout local/global;
- validação visual em claro/escuro, desktop/mobile, com overlays abertos;
- verificação de contraste, foco visível e ausência de popup branco no dark mode;
- `lint`, `check-types`, testes e build dos pacotes afetados;
- `openspec validate <change> --strict`.

Não marque E2E como concluído sem banco e navegador reais. Se o ambiente não estiver disponível, mantenha a task aberta e registre exatamente o bloqueio e o comando necessário.

## Critérios finais de aceite da proposta

A proposta só está pronta quando:

- a senha temporária ficou segura e viável de ditar;
- o problema de dark mode foi resolvido na origem para todos os portals;
- Select, modal e drawer são consistentes em claro/escuro;
- a listagem de usuários está limpa e abre um drawer acessível por linha;
- criação e edição usam drawer;
- confirmações sensíveis continuam em modal;
- o logout possui hierarquia destrutiva clara e ações alinhadas;
- Perfis de acesso está em aba própria, com legenda e grupos recolhíveis;
- a regra de evolução de permissões está registrada em spec canônica e coberta por integridade automatizada;
- a paginação continua compartilhada e recebe limite máximo seguro;
- nenhuma tabela, coluna, relação ou migração foi criada;
- as responsabilidades de Identity, Access Control, Tenancy, Web e Shared continuam separadas;
- todas as tasks possuem arquivos-alvo, comportamento verificável e teste correspondente;
- a change passa na validação estrita;
- nenhum código de produto foi alterado nesta execução de planejamento.
