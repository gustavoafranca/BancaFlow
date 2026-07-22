## ADDED Requirements

### Requirement: Betting-agent drawer places tabs above Status at the top of the panel
O drawer de Cambista SHALL posicionar o grupo de abas (Cadastro / Endereço / Contato) no topo do painel, fora da área rolável do corpo, logo abaixo do header de identificação — coerente com o drawer de Prêmios. O controle de Status (Ativo/Inativo) SHALL aparecer **abaixo** das abas, dentro da aba Cadastro (no topo dela), nunca flutuando entre o header e as abas. Esse posicionamento SHALL valer nos modos add, view e edit.

#### Scenario: Abas ficam acima do Status em todos os modos
- **WHEN** o drawer é aberto em qualquer modo (add, view ou edit)
- **THEN** as abas Cadastro/Endereço/Contato aparecem no topo do painel, fora do corpo rolável, e o controle de Status aparece abaixo delas dentro da aba Cadastro

#### Scenario: Controle de Status respeita o gating de permissão
- **WHEN** o usuário não possui a permissão `participants.betting-agents.update`
- **THEN** o controle de ativar/inativar não é exibido, mantendo o comportamento de gating atual, e as abas continuam no topo do painel

### Requirement: View mode presents betting-agent data as field cards
No modo view, o drawer de Cambista SHALL apresentar os dados em field cards legíveis (rótulo + valor), em vez de campos empilhados ou concatenados em uma única linha. Cadastro SHALL exibir Código/Talão, Nome, Apelido e a Política em rótulo legível (não editável). Endereço SHALL ser apresentado de forma legível e não concatenada numa linha única. Contato SHALL listar cada telefone individualmente com número formatado em máscara BR e rótulo quando houver. Estados "sem endereço" e "sem telefone" SHALL ter representação vazia explícita e discreta.

#### Scenario: Endereço presente é exibido de forma legível
- **WHEN** o Cambista possui endereço com logradouro, número, bairro e cidade
- **THEN** os campos aparecem em field cards legíveis (não em uma única linha concatenada)

#### Scenario: Cambista sem endereço mostra estado vazio explícito
- **WHEN** o Cambista não possui endereço cadastrado
- **THEN** a aba Endereço exibe um estado vazio explícito e discreto, sem string concatenada residual

#### Scenario: Telefones são listados individualmente com máscara BR
- **WHEN** o Cambista possui um ou mais telefones
- **THEN** cada telefone é listado como um item com o número formatado em máscara BR e o rótulo quando existir, em vez de unidos por vírgula

#### Scenario: Cambista sem telefone mostra estado vazio explícito
- **WHEN** o Cambista não possui telefones
- **THEN** a aba Contato exibe um estado vazio explícito e discreto

### Requirement: Status badge is visually consistent between list and drawer
A cor/variant do Badge de status do Cambista SHALL ser consistente entre a listagem e o drawer para o mesmo estado. Em particular, o Badge "Inativo" SHALL usar a mesma variant nos dois lugares.

#### Scenario: Badge Inativo idêntico na lista e no drawer
- **WHEN** um Cambista está `INACTIVE` e é exibido tanto na listagem quanto no drawer
- **THEN** o Badge "Inativo" usa a mesma variant visual nos dois contextos

### Requirement: Statistics cards are coherent under pagination and free of redundancy
Os cards de estatística da listagem de Cambistas SHALL apresentar valores coerentes ao paginar: contagens de Ativos/Inativos SHALL refletir agregados globais ou, quando indisponíveis sem alterar o backend, SHALL ser rotuladas explicitamente com o escopo "nesta página". Os cards NÃO SHALL conter uma métrica redundante que apenas repita o valor de outro card (o card "Talões" idêntico a "Total" SHALL ser removido ou receber um significado próprio).

#### Scenario: Ativos/Inativos coerentes ao paginar
- **WHEN** o usuário navega entre páginas da listagem
- **THEN** os cards de Ativos/Inativos ou refletem agregados globais consistentes, ou deixam claro que representam apenas "nesta página"

#### Scenario: Sem card duplicado Talões=Total
- **WHEN** os cards de estatística são renderizados
- **THEN** não existe um card cujo valor apenas duplica outro (o antigo "Talões"=="Total" não persiste)
