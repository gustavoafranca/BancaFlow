## Context

O BancaFlow acumulou um método arquitetural para SaaS multi-tenant por subdomínio: descoberta e registro explícito de decisões, DDD tático/estratégico, entidades ricas, Arquitetura Limpa (ports & adapters), autenticação/sessões multi-tenant, isolamento por tenant, resolução segura por host, planejamento separado (Negócio/Backend/Web), especificação antes da implementação e revisão comparativa. Esse método está preso ao repositório.

Queremos extraí-lo em uma skill reutilizável, `design-multitenant-subdomain`, seguindo o processo oficial do `skill-creator`. A skill deve ser genérica e agnóstica de stack, incorporando o método sem impor NestJS/Prisma/Next.js. Esta change planeja **a construção da skill** (não modifica a aplicação BancaFlow).

Restrições relevantes:
- Frontmatter do `SKILL.md` limitado a `name` e `description`.
- `SKILL.md` conciso (< 500 linhas) com progressive disclosure para `references/`.
- Sem README/changelog/installation guide dentro da skill.
- Template de contexto sem menção ao BancaFlow.
- Validação por `scripts/quick_validate.py` e 4 forward-tests com contexto limpo.

## Goals / Non-Goals

**Goals:**
- Empacotar o método multi-tenant como skill reutilizável e agnóstica de stack.
- Separar rigidamente método estável de contexto variável.
- Fornecer um workflow em 10 fases que impeça pular direto para código.
- Fornecer catálogo de decisões (`D<n>`) sem respostas universais.
- Fornecer referências especializadas com progressive disclosure.
- Fornecer template de contexto copiável para projetos novos.
- Estabelecer guardrails de segurança (host/proxy/isolamento) e de arquitetura (domínio limpo).
- Passar validação e forward-tests, reportando caminho de instalação e exemplos de invocação.

**Non-Goals:**
- Implementar qualquer aplicação multi-tenant concreta.
- Modificar código, specs, banco ou APIs do BancaFlow.
- Prescrever uma stack específica (NestJS/Prisma/Next.js) como obrigatória.
- Criar scripts decorativos ou documentação de instalação dentro da skill.

## Decisions

**D-A: Formato e ferramenta — usar o processo oficial do `skill-creator`.**
Rationale: o pedido exige `scripts/init_skill.py` + `scripts/quick_validate.py` e uma estrutura padronizada. Alternativa (escrever arquivos à mão) foi descartada por não garantir conformidade com o validador.

**D-B: Progressive disclosure com `SKILL.md` fino + `references/`.**
`SKILL.md` roteia; detalhes extensos vivem em 7 referências temáticas. Alternativa (um `SKILL.md` monolítico) violaria o limite de linhas e a manutenibilidade.

**D-C: Método estável vs contexto variável como princípio estrutural.**
Toda recomendação tecnológica é condicionada ao contexto real descoberto. Isso é o que garante o forward-test Java/Spring passar. Alternativa (embutir a stack do BancaFlow) foi descartada — quebraria a genericidade.

**D-D: Descoberta de contexto por precedência explícita.**
Ordem: caminho explícito → arquivo de contexto do projeto → docs/código do repo → perguntas ao usuário. Evita re-perguntar o que é descobrível e evita inventar regras críticas. Sem contexto, oferecer o template — nunca assumir silenciosamente.

**D-E: Guardrails de segurança de host/proxy como conteúdo de primeira classe.**
`X-Forwarded-Host` não confiável por padrão; honrado só quando o peer imediato está numa allowlist de IP/CIDR; tenant do body nunca é autoridade em operações autenticadas; falhas não revelam existência de tenant/usuário. Alternativa (flag global "confiar no proxy") explicitamente proibida.

**D-F: Escopo desta change = criar a skill (não instalá-la em runtime do BancaFlow).**
A skill é um artefato de autoria. A instalação (pessoal vs projeto) é decisão do usuário no momento de aplicar; o resultado deve reportar o caminho.

## Risks / Trade-offs

- **Acoplamento acidental ao BancaFlow no conteúdo** → Mitigação: critérios de aceite explícitos + forward-test Java/Spring + revisão do template para remover qualquer referência ao projeto.
- **Orientação de segurança incorreta sobre proxies/headers** → Mitigação: referência dedicada `subdomain-proxy-security.md` com fronteira de confiança, peer imediato e allowlist; forward-test de revisão de segurança valida a detecção de headers forjáveis.
- **`SKILL.md` crescer além do limite** → Mitigação: progressive disclosure; medir linhas antes de finalizar; mover excesso para `references/`.
- **Frontmatter inválido / desalinhado com `agents/openai.yaml`** → Mitigação: `quick_validate.py` + checagem de coerência display_name/description/prompt.
- **Recomendações universais prematuras (algoritmos/TTLs)** → Mitigação: catálogo e referências exigem decisão por contexto, sem valores fixos universais.
- **Scripts decorativos** → Mitigação: criar script apenas se houver validação determinística reutilizável.

## Migration Plan

1. Rodar `scripts/init_skill.py` para gerar o esqueleto da skill.
2. Escrever `SKILL.md`, `agents/openai.yaml`, referências e o template de contexto.
3. Rodar `scripts/quick_validate.py`; corrigir até passar.
4. Executar os 4 forward-tests com contexto limpo; ajustar conteúdo conforme achados.
5. Reportar caminho de instalação, árvore de arquivos e exemplos de invocação.

Rollback: por ser um artefato novo e isolado (nenhuma alteração no BancaFlow), o rollback é remover o diretório da skill gerada.

## Open Questions

- **Destino de instalação**: skill pessoal (`${CODEX_HOME:-$HOME/.codex}/skills`) vs skill do projeto (`.claude/skills`). Decidir no momento de aplicar; default sugerido: pessoal (reuso entre projetos).
- **Necessidade de script determinístico próprio**: só criar se surgir uma validação reutilizável (ex.: checar frontmatter/estrutura) durante a implementação.
