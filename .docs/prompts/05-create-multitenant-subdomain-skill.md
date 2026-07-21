# Prompt — Criar skill genérica para aplicações multi-tenant por subdomínio

Use este prompt com a skill `skill-creator` para criar uma skill pessoal e reutilizável que oriente a descoberta, especificação, implementação, revisão e documentação de aplicações SaaS multi-tenant identificadas por subdomínio.

## Como usar este prompt

1. Inicie uma conversa com acesso à skill `skill-creator`.
2. Forneça o conteúdo completo deste arquivo.
3. Quando for perguntado onde instalar, escolha:
   - skill pessoal: `${CODEX_HOME:-$HOME/.codex}/skills` — recomendada para reutilizar em diferentes projetos;
   - skill do projeto: `<projeto>/.claude/skills` — quando ela deve permanecer versionada apenas naquele repositório.
4. Revise a skill gerada e faça pelo menos um forward-test com um projeto fictício antes de usá-la em produção.

Este prompt cria uma **skill**, não uma aplicação e não uma change OpenSpec.

## Solicitação para o `skill-creator`

Crie uma skill chamada:

`design-multitenant-subdomain`

A skill deve ajudar quando o usuário pedir para criar, planejar, revisar, endurecer ou documentar uma aplicação multi-tenant em que o tenant é identificado pelo host/subdomínio, por exemplo:

- `acme.exemplo.com`;
- `loja-a.plataforma.com.br`;
- `empresa-x.saas.com`.

Ela deve ser genérica e independente do BancaFlow, mas incorporar o método arquitetural aprendido neste projeto:

- descoberta e registro explícito de decisões;
- DDD tático e estratégico;
- orientação a objetos e entidades ricas;
- Arquitetura Limpa;
- separação entre domínio, aplicação e infraestrutura;
- ports e adapters;
- autenticação e sessões multi-tenant;
- isolamento por tenant no banco e na aplicação;
- resolução segura por subdomínio;
- planejamento separado em Negócio, Backend e Web;
- especificação antes da implementação;
- testes de unidade, integração, concorrência, segurança e E2E;
- revisão posterior comparando especificação, código, persistência, interface e testes;
- documentação arquitetural final.

## Princípio central: método reutilizável, contexto variável

A skill não pode presumir que todos os projetos possuem `Banca`, `UserAccount`, NestJS, Prisma, Next.js, PostgreSQL, JWT ou OpenSpec.

Ela deve separar claramente:

1. **Método estável:** perguntas, decisões, riscos, invariantes, limites arquiteturais, segurança, testes e critérios de revisão aplicáveis a qualquer SaaS multi-tenant.
2. **Contexto do projeto:** domínio, linguagem, frameworks, banco, autenticação, deploy, regras de negócio, restrições e convenções fornecidas pelo usuário ou encontradas no repositório atual.

Toda recomendação tecnológica deve ser condicionada ao contexto real. Se o projeto usar NestJS/Prisma/Next.js, a skill pode adaptar o plano; se usar outra stack, deve preservar os princípios sem forçar essas ferramentas.

## Estrutura obrigatória da skill

Usar o processo oficial da `skill-creator`:

1. Inicializar a skill com `scripts/init_skill.py`.
2. Criar `SKILL.md` conciso, preferencialmente abaixo de 500 linhas.
3. Criar `agents/openai.yaml` com:
   - `display_name` coerente;
   - descrição curta;
   - prompt padrão orientado a iniciar pela leitura do contexto.
4. Usar progressive disclosure: detalhes extensos ficam em `references/`, não duplicados no `SKILL.md`.
5. Criar somente recursos úteis; não criar README, changelog ou guia de instalação dentro da skill.
6. Validar com `scripts/quick_validate.py`.
7. Executar forward-tests com contexto limpo.

Estrutura sugerida:

```text
design-multitenant-subdomain/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── discovery-and-decisions.md
│   ├── domain-and-clean-architecture.md
│   ├── tenant-isolation-and-data.md
│   ├── authentication-and-sessions.md
│   ├── subdomain-proxy-security.md
│   ├── testing-and-review.md
│   └── documentation-playbook.md
└── assets/
    └── project-context-template.md
```

Criar scripts apenas se houver uma validação determinística realmente reutilizável. Não adicionar scripts decorativos.

## Frontmatter e gatilhos

O `SKILL.md` deve conter somente `name` e `description` no frontmatter.

A descrição deve ser suficientemente específica para disparar a skill em pedidos como:

- “quero criar um SaaS multi-tenant por subdomínio”;
- “como separar Tenant e Identity?”;
- “o username pode repetir entre empresas?”;
- “desenhe autenticação multi-tenant”;
- “revise o isolamento por tenant”;
- “crie uma spec para login usando o host”;
- “como confiar em X-Forwarded-Host?”;
- “documente a arquitetura multi-tenant deste projeto”.

Evitar disparar para qualquer aplicação SaaS simples que não envolva tenancy, isolamento ou resolução por host.

## Entrada de contexto por projeto

A skill deve começar procurando contexto nesta ordem:

1. caminho informado explicitamente pelo usuário;
2. arquivo de contexto configurado no projeto;
3. documentação e código existentes no repositório;
4. respostas do usuário para decisões ainda ausentes.

Ela deve aceitar comandos conceituais como:

```text
Use a skill design-multitenant-subdomain.
Contexto do projeto: .docs/project-context.md
Objetivo: planejar Identity e Tenant antes da implementação.
```

Se não existir arquivo de contexto, a skill deve oferecer copiar/preencher o asset `assets/project-context-template.md`. Não criar automaticamente regras críticas com base em suposições silenciosas.

## Template obrigatório de contexto

Criar `assets/project-context-template.md` como um formulário reutilizável contendo, no mínimo:

### Produto e domínio

- nome e objetivo do produto;
- quem são os usuários;
- definição de tenant naquele negócio;
- relação entre pessoa, usuário, conta e tenant;
- termos do glossário/linguagem ubíqua;
- regras já decididas;
- itens explicitamente fora de escopo.

### Stack e repositório

- monorepo ou repositórios separados;
- linguagem;
- framework Backend;
- framework Web/mobile;
- banco e ORM;
- mecanismo de migrations;
- infraestrutura e deploy;
- ferramentas de especificação;
- ferramentas de testes;
- convenções e skills locais obrigatórias.

### Tenancy

- tenant identificado por subdomínio, domínio próprio, path, header ou token;
- formato e estabilidade do código do tenant;
- subdomínios reservados;
- criação, ativação, bloqueio e exclusão do tenant;
- uma pessoa pode participar de vários tenants?;
- isolamento lógico, schema por tenant ou banco por tenant;
- requisitos de auditoria e residência de dados.

### Identity e acesso

- identificador de login;
- unicidade global ou por tenant;
- email obrigatório/opcional;
- confirmação de email;
- criação e convite de usuários;
- papéis e permissões;
- senha, MFA, recuperação e reset administrativo;
- access token, refresh token, cookies e duração;
- múltiplas sessões e revogação;
- bloqueio/rate limit;
- provedores externos/SSO.

### Operação e segurança

- DNS e TLS wildcard;
- reverse proxy/load balancer/CDN;
- política de `Host` e `X-Forwarded-Host`;
- redes/IPs/CIDRs confiáveis;
- ambientes local, homologação e produção;
- secrets;
- observabilidade;
- requisitos legais/compliance.

### Decisões pendentes

- lista numerada `D1`, `D2`, `D3`...;
- opções;
- recomendação fundamentada;
- decisão escolhida;
- consequências e riscos aceitos.

## Workflow obrigatório do `SKILL.md`

A skill deve orientar o agente a seguir estas fases, sem pular diretamente para código.

### Fase 1 — Descobrir e validar o contexto

- Ler integralmente o arquivo de contexto e as instruções locais do projeto.
- Inspecionar estrutura, código, schemas, migrations, testes e documentação existentes.
- Separar fatos confirmados, inferências e decisões pendentes.
- Não perguntar novamente algo que pode ser descoberto no repositório.
- Fazer poucas perguntas por vez quando uma escolha alterar materialmente a arquitetura.

### Fase 2 — Modelar o domínio

- Definir linguagem ubíqua e bounded contexts.
- Decidir se Tenant, Identity, Membership, Authorization e Provisioning pertencem ao mesmo módulo ou a módulos diferentes.
- Modelar agregados, entidades, Value Objects, invariantes e serviços de domínio apenas quando necessários.
- Evitar entidades anêmicas e também evitar colocar toda regra em um agregado gigante.
- Definir limites transacionais e consistência entre agregados.
- Explicar quando a mesma pessoa precisa de contas separadas por tenant.

### Fase 3 — Definir tenancy e persistência

- Escolher e justificar isolamento lógico, schema ou banco por tenant.
- Exigir `tenantId` nas relações e consultas relevantes.
- Definir unicidades compostas, por exemplo `(tenantId, normalizedUsername)`, apenas quando a regra do projeto exigir.
- Planejar FKs, constraints, índices, auditoria e comportamento de exclusão.
- Tratar consultas sem escopo de tenant como risco explícito.
- Definir provisionamento e rollback atômico quando a criação cruzar contextos.

### Fase 4 — Resolver tenant pelo host com segurança

- Extrair e normalizar o subdomínio.
- Validar sufixo/domínio permitido e subdomínios reservados.
- Não aceitar `tenantId` ou código do tenant vindo do body como autoridade para operações autenticadas.
- Tratar `X-Forwarded-Host` como não confiável por padrão.
- Só honrar forwarded headers quando o peer imediato pertencer à allowlist configurada de IP/CIDR.
- Diferenciar configuração local, Docker, reverse proxy e produção.
- Planejar DNS/TLS wildcard e domínio customizado, se aplicável.
- Modelar falhas sem revelar existência de tenants ou usuários indevidamente.

### Fase 5 — Modelar Identity, autenticação e autorização

- Definir identidade humana versus conta de acesso versus membership no tenant.
- Decidir unicidade de username/email no escopo correto.
- Separar autenticação, sessão e autorização.
- Definir password hashing, refresh token, digest, rotação, revogação e expiração.
- Planejar claims mínimas e nunca confiar em tenant enviado pelo cliente.
- Definir bloqueio, rate limit, troca/reset de senha e MFA conforme o contexto.
- Validar estado atual de tenant, conta e sessão em pontos autoritativos.
- Evitar colocar autorização apenas na interface Web.

### Fase 6 — Desenhar Arquitetura Limpa

- Mostrar direção das dependências.
- Definir casos de uso como orquestradores.
- Definir ports pelo lado que necessita da capacidade.
- Implementar adapters nas bordas.
- Manter framework, ORM, JWT, bcrypt e HTTP fora do núcleo de domínio.
- Separar tarefas em Negócio, Backend, Web e integração.
- Explicar quando um caso de uso cruza mais de um agregado ou bounded context.

### Fase 7 — Especificar antes de implementar

- Se o projeto usa OpenSpec, seguir a skill OpenSpec disponível e criar proposal, design, delta specs e tasks.
- Caso não use OpenSpec, produzir artefatos equivalentes no formato adotado pelo projeto.
- Registrar decisões com cenários verificáveis.
- Não misturar proposta e aplicação.
- Não marcar tarefa como concluída apenas porque o documento é estruturalmente válido.

### Fase 8 — Implementar por camadas

- Respeitar as skills e convenções locais do projeto.
- Estabilizar contratos do domínio antes de adapters e interface.
- Permitir Backend e Web em paralelo somente quando o contrato HTTP estiver definido.
- Manter migrações, seeds e mudanças de infraestrutura explícitas.
- Não introduzir dependência circular para resolver composição entre módulos.

### Fase 9 — Verificar e revisar

- Executar testes unitários de entidades, VOs e casos de uso.
- Executar integração com banco real para transactions, constraints e concorrência.
- Executar E2E para os fluxos principais.
- Testar isolamento entre pelo menos dois tenants.
- Testar headers forjados, tenant inexistente/inativo, sessão revogada e conta bloqueada.
- Comparar spec, domínio, adapters, banco, API, Web e testes.
- Classificar achados por severidade.
- Não confundir cobertura alta com comportamento correto.

### Fase 10 — Documentar e ensinar

- Criar READMEs por módulo quando solicitado.
- Explicar responsabilidade, limites, fluxos, decisões e como evoluir.
- Usar diagramas pequenos para dependências, sequências e relacionamentos.
- Explicar o porquê sem transformar documentação em cópia do código.

## Catálogo de decisões da referência

Criar `references/discovery-and-decisions.md` com um catálogo de decisões, sem respostas universais. Para cada tópico, incluir:

- pergunta;
- opções comuns;
- quando cada opção faz sentido;
- riscos;
- recomendação apenas quando houver contexto suficiente;
- exemplo de registro `D<n>`.

Cobrir pelo menos:

- definição de tenant;
- pessoa global versus conta por tenant;
- username/email global ou por tenant;
- memberships e múltiplos tenants;
- papel fixo versus permissões granulares;
- criação pública, convite ou provisionamento administrativo;
- isolamento de dados;
- estratégia de subdomínio;
- domínio customizado;
- sessão única ou múltipla;
- reset de senha;
- conta OWNER/administrador do tenant;
- administrador da plataforma;
- consistência e transação de provisionamento;
- exclusão/suspensão do tenant.

## Referências especializadas

### `domain-and-clean-architecture.md`

Incluir heurísticas para bounded contexts, agregados, entidades, VOs, domain services, casos de uso, ports/adapters, DTOs e dependências, com pequenos exemplos genéricos.

### `tenant-isolation-and-data.md`

Comparar:

- banco compartilhado + `tenantId`;
- schema por tenant;
- banco por tenant;
- modelos híbridos.

Incluir constraints, índices, FKs compostas, auditoria, migrations, jobs, cache, filas, storage de arquivos e prevenção de vazamento entre tenants.

### `authentication-and-sessions.md`

Cobrir contas, memberships, password hashing, tokens, cookies, refresh rotation, revogação, bloqueio, MFA, SSO, recuperação e autorização por estado persistido.

Não fixar algoritmos ou TTLs universais; exigir decisão conforme risco e contexto.

### `subdomain-proxy-security.md`

Cobrir:

- parsing e normalização de host;
- DNS/TLS wildcard;
- reverse proxies;
- `Host`, `Forwarded` e `X-Forwarded-Host`;
- peer imediato;
- allowlist de IP/CIDR;
- IPv4/IPv6;
- desenvolvimento local;
- Docker/Kubernetes;
- host header injection;
- domínios customizados;
- testes de segurança.

### `testing-and-review.md`

Fornecer matriz de testes por camada e checklist de code review. Exigir cenários reais de concorrência e banco quando a regra depender deles.

### `documentation-playbook.md`

Fornecer estrutura recomendada para READMEs de Domínio, Backend e Web e diagramas mínimos, sem obrigar ferramentas específicas.

## Outputs que a skill deve saber produzir

Dependendo do pedido, a skill deve conseguir entregar um ou mais destes resultados:

- diagnóstico do projeto atual;
- questionário/contexto preenchível;
- glossário e mapa de bounded contexts;
- registro de decisões `D1...Dn`;
- modelo de agregados/entidades/VOs;
- mapa de módulos e dependências;
- desenho dos fluxos de login, refresh, provisioning e autorização;
- modelo de dados multi-tenant;
- threat model de host/proxy/isolamento;
- proposta OpenSpec ou equivalente;
- plano de implementação separado por Negócio, Backend e Web;
- matriz de testes;
- code review arquitetural;
- plano de correção;
- documentação/README por camada.

A skill deve adaptar o nível de detalhe ao pedido. Não gerar todos os artefatos quando o usuário pediu apenas uma explicação ou decisão pontual.

## Guardrails obrigatórios

- Nunca assumir que subdomínio, header ou token recebido do cliente é confiável sem definir a fronteira de confiança.
- Nunca recomendar confiar globalmente em qualquer proxy apenas para fazer o host funcionar.
- Nunca permitir acesso sem escopo de tenant em operações tenant-owned.
- Nunca tratar o frontend como fronteira autoritativa de segurança.
- Nunca colocar detalhes de ORM/framework dentro das entidades de domínio.
- Nunca criar um agregado gigante contendo tenant, usuários, sessões e todas as permissões sem justificar consistência.
- Nunca duplicar a entidade de tenant dentro do Identity apenas por conveniência.
- Nunca inventar regras ausentes quando elas alterarem isolamento, identidade, recuperação de conta ou autorização.
- Nunca expor secrets, hashes ou tokens reais em documentação e exemplos.
- Nunca executar migrations, seeds, deploy ou alterações externas durante uma fase apenas de exploração/especificação.
- Sempre respeitar instruções e skills locais do projeto acima das recomendações genéricas da skill.
- Sempre declarar inferências e riscos aceitos.

## Exemplos de uso para validar a skill

Realizar forward-tests com contexto limpo, passando apenas a skill e um contexto fictício por teste.

### Cenário 1 — ERP por empresa

```text
Use $design-multitenant-subdomain.
Leia /tmp/erp-context.md.
Quero decidir se User e Tenant ficam no mesmo módulo e planejar o login por subdomínio antes de implementar.
```

Esperado: descobrir decisões pendentes, separar Identity/Tenant quando apropriado, explicar contas por tenant e não escrever código prematuramente.

### Cenário 2 — Marketplace com múltiplas organizações

```text
Use $design-multitenant-subdomain.
Uma pessoa pode participar de várias organizações com papéis diferentes. Modele Identity, Membership e Organization e proponha isolamento no banco.
```

Esperado: não criar uma conta humana duplicada automaticamente sem discutir a escolha; modelar membership e unicidades no escopo correto.

### Cenário 3 — Revisão de segurança

```text
Use $design-multitenant-subdomain.
Revise a resolução de tenant por X-Forwarded-Host deste backend e classifique os achados.
```

Esperado: inspecionar fronteira de proxy, peer imediato, IP/CIDR, headers forjados, sufixo permitido e testes; não confiar apenas em uma flag global.

### Cenário 4 — Stack diferente

```text
Use $design-multitenant-subdomain.
Projeto em Java/Spring, React e MySQL. Gere uma proposta de arquitetura multi-tenant por subdomínio.
```

Esperado: preservar o método sem mencionar NestJS, Prisma ou Next.js como obrigatórios.

## Critérios de aceite da skill

A skill só está pronta quando:

1. `quick_validate.py` passa.
2. O frontmatter possui apenas `name` e `description` válidos.
3. `agents/openai.yaml` está coerente com o `SKILL.md`.
4. O `SKILL.md` é conciso e roteia corretamente para as referências.
5. O template de contexto pode ser copiado para um projeto novo sem mencionar BancaFlow.
6. As referências não duplicam extensamente o `SKILL.md`.
7. Os quatro forward-tests produzem resultados coerentes.
8. O teste com Java/Spring não recebe uma solução forçada de NestJS/Prisma/Next.js.
9. A revisão de proxy identifica headers forjáveis e fronteira de confiança.
10. A modelagem diferencia tenant, identidade, conta e membership conforme o contexto.
11. Nenhum arquivo extra como README, changelog ou installation guide é criado dentro da skill.
12. O resultado final informa o caminho de instalação e exemplos curtos de invocação.

## Resultado esperado

Ao concluir, apresentar:

- caminho absoluto da skill criada;
- árvore dos arquivos essenciais;
- resumo do workflow;
- localização do template de contexto;
- resultado do `quick_validate.py`;
- resumo dos forward-tests e ajustes realizados;
- três exemplos curtos de como chamar a skill em um projeto novo.
