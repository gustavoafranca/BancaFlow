## Context

`enable-tenant-user-administration` já entregou a administração funcional: catálogo e matriz em código, endpoints tenant-scoped, criação/reset com senha temporária, listagem paginada via `PaginatedInputDTO`/`PaginatedResultDTO`, menu protegido por `PermissionKey`, tela `/configuracoes` e modal único de logout. A implementação real, porém, ainda carrega dívida de experiência:

- `CryptoTemporaryPasswordGenerator` gera 16 caracteres aleatórios de quatro classes (`vQe*vYSX8VjwA#Na`), forte mas ruim para ditar.
- `ThemeProvider` aplica tokens em um `<div className="contents">`; os portals Radix montados em `document.body` não herdam esses tokens.
- `DialogContent` já tem `variant="drawer"`, mas criação/edição/sessões de usuário ainda usam modal.
- Não existe `Select` compartilhado; Configurações e módulos como `premios`/`acerto` usam `<select>` nativo.
- `Button` não possui `destructive`; vermelho aparece como `#E05555`/rgba em componentes.
- `/configuracoes` renderiza Usuários e Perfis em uma página longa, sem Tabs; a matriz vem toda expandida.
- A tabela de usuários concentra ações na coluna “Ações”, reduzindo leitura.
- O logout possui três botões, mas usa um único estado de processamento e não diferencia ação primária de ação sensível.

O Web roda Next `16.2.10` com App Router. Pela documentação local, layouts preservam estado entre navegações, páginas/layouts são Server Components por padrão e componentes que usam estado/eventos/browser APIs devem ser Client Components. A correção de tema e primitives interativos deve ficar em componentes client pequenos, sem transformar páginas/layouts inteiros em client além do que já existe.

## Goals / Non-Goals

**Goals:**
- Corrigir tema de overlays na raiz, não em cada modal.
- Tornar senhas temporárias fortes e comunicáveis.
- Consolidar primitives reutilizáveis de `Select`, `Button` destrutivo, Tabs/Collapsible quando ausentes, e padrão lista-detalhe/drawer.
- Refinar Usuários, Perfis de acesso e Logout sem reconstruir backend ou mudar regra `OWNER`/`ADMIN`/`USER`.
- Registrar regras canônicas para permissões e paginação para changes futuras.
- Cobrir acessibilidade, teclado, foco, contraste, dark mode, desktop/mobile e validação visual.

**Non-Goals:**
- Criar ou alterar schema Prisma, migrations, perfis persistidos, permissões individuais, CRUD de `PermissionKey`.
- Trocar o design system, adicionar biblioteca visual concorrente ou redesenhar o produto.
- Transformar toda tabela em drawer; o padrão vale para recurso com detalhe/edição.
- Reabrir a change anterior para esconder refinamentos.
- Enfraquecer `StrongPassword`, troca obrigatória da senha temporária, revogação de sessão ou autorização backend.

## Decisions

### D1 — Senha temporária humana no adapter, não no domínio

O port `TemporaryPasswordGenerator` permanece em Identity e os use cases de criação/reset continuam dependendo dele. Apenas o adapter concreto passa a gerar uma senha no formato:

```text
Palavra-palavra-palavra-palavra-palavra-47!
```

Detalhes normativos:
- 5 palavras ASCII sem acentos, curtas, neutras e fáceis de distinguir por voz.
- Vocabulário estável de 2048 palavras selecionadas por índice CSPRNG (`randomInt(2048)` ou API equivalente).
- Primeira palavra capitalizada para satisfazer maiúscula; demais minúsculas.
- Dois dígitos escolhidos de um conjunto sem caracteres ambíguos, preferindo `2..9`.
- Um símbolo de conjunto pequeno e conhecido (`!@#$%&*?`) para satisfazer `StrongPassword`.
- Separador `-`, sem derivar de nome, username, e-mail ou banca.

Entropia: `2048^5 * 8^2 * 8 = 2^55 * 2^6 * 2^3 = 2^64` combinações. Para senha temporária exibida uma vez, rate-limited pelos fluxos de autenticação e obrigada a troca no primeiro acesso, 64 bits aleatórios CSPRNG são suficientes e superiores ao necessário para comunicação humana. A força continua sendo validada por `StrongPassword`; se uma senha gerada falhar por erro de implementação, o adapter retorna falha e o use case não persiste.

Alternativa rejeitada: manter 16 caracteres embaralhados. É forte, mas falha no requisito operacional de ditar/digitar sem confusão. Alternativa rejeitada: criar novo VO de senha temporária. As invariantes de força já são de `StrongPassword`; o formato é responsabilidade do gerador.

### D2 — Tokens de tema no documento para cobrir portals

Mover a aplicação dos CSS custom properties canônicos de `ThemeProvider` para `document.documentElement` ou `document.body`, mantendo `data-theme` no mesmo escopo. O provider pode continuar expondo `useTheme().c` para consumidores legados, mas deve sincronizar `--background`, `--foreground`, `--popover`, `--border`, `--destructive` e demais tokens no elemento raiz durante a hidratação e em toda troca de tema.

Com isso, conteúdos Radix montados em `document.body` herdam os mesmos tokens que a árvore visual imediata. Para evitar flash incorreto, o layout raiz deve declarar tokens iniciais compatíveis com o tema default atual e o provider deve atualizar antes da pintura interativa sempre que possível (`useLayoutEffect` em client, com fallback SSR via CSS global). A solução não depende apenas de `.dark`, pois o sistema usa tokens dinâmicos além de classe.

Alternativa considerada: configurar um container de portal dentro do provider. Funciona para Dialog/Select, mas exige que todo primitive lembre de apontar para o container e não cobre futuros overlays por padrão. Aplicar tokens no documento é menor e mais robusto para SSR/hidratação no App Router.

### D3 — Select compartilhado com Radix Select

O projeto já usa Radix Dialog/Slot. Como `<select>` nativo não oferece controle confiável do popup em dark mode entre navegadores, a change deve adicionar `@radix-ui/react-select` somente se ele ainda não estiver instalado. Isso não cria biblioteca visual concorrente; fica na mesma família de primitives de acessibilidade já adotada.

`apps/web/src/shared/components/ui/select.tsx` deve expor trigger, content, item e uma composição simples compatível com React Hook Form via `value`/`onValueChange`/`name`/`ref` quando aplicável, sem estado duplicado. Deve suportar label/description/error por `aria-labelledby`/`aria-describedby`, invalid, disabled, selected, open, hover e focus-visible. Os fluxos tocados por esta change migram obrigatoriamente: filtros de Usuários e papel da criação/edição/drawer. Ocorrências em `premios` e `acerto` ficam mapeadas, com tasks separadas apenas quando simples e sem redesign.

### D4 — Drawer como shell reutilizável para recurso administrável

Usuários passa para lista-detalhe:
- linha inteira é `button`/row acionável por mouse, Enter e Espaço;
- estado selecionado fica perceptível;
- detalhe abre em drawer via `DialogContent variant="drawer"`;
- criação usa o mesmo shell em modo criação;
- edição ocorre dentro do drawer;
- status, troca de papel, reset de senha e revogação de sessão continuam exigindo modal de confirmação;
- botões internos da linha/drawer usam `stopPropagation`/estrutura semântica adequada para não abrir detalhe por acidente;
- fechamento por Escape e retorno de foco seguem Radix;
- mobile usa largura total e conteúdo rolável.

O drawer específico de Prêmios serve apenas como referência de comportamento, não como base de código. Se `DialogContent variant="drawer"` precisar de largura, header/footer sticky ou scroll body reutilizável, isso deve ser adicionado ao primitive/shell compartilhado, não copiado em Configurações.

### D5 — Logout destrutivo com tokens e estados independentes

Adicionar tokens destrutivos (`--destructive`, `--destructive-foreground`, `--destructive-muted`, `--destructive-border`) derivados da paleta atual, com contraste aprovado em claro/escuro, e `Button variant="destructive"`. O modal de logout usa ícone, título, descrição curta e três ações:

- Cancelar: seguro, foco inicial preferencial.
- Sair deste dispositivo: ação principal recomendada.
- Sair de todos os dispositivos: ação sensível secundária, visualmente destrutiva mas sem competir com a principal.

O estado de processamento passa a distinguir `device` e `all`; só o botão escolhido mostra loading, ambos ficam protegidos contra duplo envio. Erro mantém modal aberto e não navega. Sucesso redireciona para `/login` somente depois da API responder.

### D6 — Configurações em Tabs e Perfis recolhíveis

`/configuracoes` deve renderizar duas abas de alto nível: **Usuários** e **Perfis de acesso**. Tabs e Collapsible/Accordion devem ser primitives compartilhados mínimos se não existirem, pois o padrão será reutilizável. A aba de Perfis:
- explica que `OWNER`, `ADMIN` e `USER` são papéis fixos, não cadastros editáveis;
- consome a matriz autoritativa do backend;
- agrupa por capability;
- inicia com todos os grupos recolhidos ou apenas o primeiro aberto para evitar página longa;
- mostra legenda permitido/não permitido e labels/descrições em português;
- trata loading, forbidden, erro e catálogo vazio.

### D7 — Definition of Done do catálogo de permissões

Toda change que cria capability, rota, endpoint ou ação protegida deve declarar, na mesma change, a `PermissionKey`, metadados de apresentação, decisão explícita por papel, enforcement backend, gate frontend quando pertinente, presença automática na matriz, testes e coordenação com changes ativas. Isso permanece catálogo em código, sem banco. A proteção automatizada deve falhar por duplicidade, metadata ausente, papel sem decisão explícita ou matriz divergente.

### D8 — Paginação HTTP com teto seguro e contexto preservado

`ListUserAccountsDto` deve adicionar `@Max`, com teto inicial `100`, mantendo default Web de `20`. `packages/shared/src/query` não ganha regra específica de tela; o teto pertence ao DTO HTTP/edge. Após filtro ou mutação, o Web recarrega da fonte autoritativa, preserva filtros e página quando ainda válidos, e ajusta para a última página disponível quando a página atual ficar vazia por mudança de filtro ou remoção do item do filtro.

## Risks / Trade-offs

- [Risk] Aplicar tokens no documento pode divergir de consumidores inline que leem `useTheme().c`. → Mitigation: `toDesignTokens(c)` continua fonte única; testes alternam tema com overlay aberto.
- [Risk] Radix Select adiciona dependência. → Mitigation: mesma família Radix já usada; só instalar se ausente; sem biblioteca visual concorrente.
- [Risk] 64 bits de entropia parece menor que 16 chars aleatórios de amplo alfabeto. → Mitigation: contexto é senha temporária CSPRNG, exibida uma vez, com troca obrigatória e rate limit; documentar cálculo e testar invariantes.
- [Risk] Refatorar a tabela para row-click pode quebrar ações internas. → Mitigation: testes específicos de clique/teclado e prevenção de propagação.
- [Risk] Deltas simultâneos sobre permissões podem conflitar com `implement-participant-registration-mvp`. → Mitigation: task explícita de reconciliação antes de implementar qualquer endpoint protegido daquela change.

## Migration Plan

1. Implementar primitives/tokens compartilhados primeiro: tema no documento, destructive tokens/Button, Select, Tabs/Collapsible, ajustes genéricos do Dialog/drawer.
2. Atualizar senha temporária e paginação backend, com testes unitários/DTO antes de tocar UI.
3. Refatorar Configurações em abas, drawer de usuários e matriz recolhível.
4. Refinar logout no shell privado.
5. Rodar regressões Shared, Access Control, Identity, Backend e Web; e2e com banco real; navegador/visual manual em claro/escuro desktop/mobile.
6. Rollback: como não há banco novo, reverter deploy de código restaura UI e gerador anteriores; senhas já emitidas continuam válidas até a troca obrigatória ou reset.

## Open Questions

- O vocabulário final de 2048 palavras deve ficar versionado no adapter ou em arquivo de dados interno do backend; a implementação deve escolher o formato mais simples para testes determinísticos e revisão.
- O teto `pageSize=100` é a decisão inicial desta proposta; se métricas reais pedirem outro valor, uma change futura pode ajustar o contrato.
