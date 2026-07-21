## Why

O método arquitetural aprendido no BancaFlow (DDD, Arquitetura Limpa, isolamento por tenant, resolução segura por subdomínio, autenticação multi-tenant, especificação antes de implementar e revisão comparativa) hoje vive apenas no código e na memória deste repositório. Não existe uma forma reutilizável de aplicar esse método a outros projetos SaaS multi-tenant, independentemente da stack. Precisamos empacotar esse conhecimento em uma **skill** genérica, `design-multitenant-subdomain`, que oriente descoberta, modelagem, especificação, implementação, revisão e documentação de aplicações multi-tenant identificadas por subdomínio — sem forçar as ferramentas específicas do BancaFlow (NestJS/Prisma/Next.js).

## What Changes

- Criar uma nova skill pessoal/reutilizável `design-multitenant-subdomain` no formato do `skill-creator`.
- Gerar `SKILL.md` conciso (< 500 linhas) com frontmatter contendo **apenas** `name` e `description`, disparadores específicos para tenancy/isolamento/resolução por host, e um workflow em 10 fases (descoberta → domínio → tenancy/persistência → resolução por host → identity/auth → arquitetura limpa → especificação → implementação → verificação → documentação).
- Gerar `agents/openai.yaml` coerente com o `SKILL.md` (display_name, descrição curta, prompt padrão orientado a ler o contexto primeiro).
- Gerar `assets/project-context-template.md`: formulário reutilizável de contexto de projeto (produto/domínio, stack, tenancy, identity/acesso, operação/segurança, decisões pendentes `D1..Dn`) — sem qualquer menção ao BancaFlow.
- Gerar referências com progressive disclosure em `references/`: `discovery-and-decisions.md`, `domain-and-clean-architecture.md`, `tenant-isolation-and-data.md`, `authentication-and-sessions.md`, `subdomain-proxy-security.md`, `testing-and-review.md`, `documentation-playbook.md`.
- Separar explicitamente **método estável** (perguntas, decisões, invariantes, segurança, testes, critérios de revisão) de **contexto variável** (domínio, linguagem, frameworks, banco, deploy), condicionando toda recomendação tecnológica ao contexto real.
- Validar a skill com `scripts/quick_validate.py` e executar 4 forward-tests com contexto limpo (ERP, marketplace, revisão de segurança, stack Java/Spring).
- **Não** criar README, changelog ou installation guide dentro da skill.

## Capabilities

### New Capabilities
- `multitenant-subdomain-skill`: a skill reutilizável `design-multitenant-subdomain` — sua estrutura de arquivos, o frontmatter e disparadores, o workflow obrigatório em fases, o template de contexto, o catálogo de decisões, as referências especializadas, os guardrails de segurança/arquitetura e os critérios de aceite/validação.

### Modified Capabilities
<!-- Nenhuma. As specs existentes descrevem a aplicação BancaFlow; esta change adiciona uma capability de tooling/autoria independente. -->

## Impact

- **Novos arquivos**: árvore da skill `design-multitenant-subdomain/` (SKILL.md, agents/openai.yaml, references/*.md, assets/project-context-template.md) no destino de instalação escolhido (skill pessoal em `${CODEX_HOME:-$HOME/.codex}/skills` ou skill do projeto em `.claude/skills`).
- **Dependências**: usa o processo do `skill-creator` (`scripts/init_skill.py`, `scripts/quick_validate.py`); não adiciona dependências de runtime ao BancaFlow.
- **Sem impacto** no código de aplicação, APIs ou banco do BancaFlow — a skill é um artefato de autoria/orientação, genérico e agnóstico de stack.
- **Riscos**: acoplamento acidental ao BancaFlow no conteúdo (mitigado pelos critérios de aceite e forward-test Java/Spring); orientação de segurança incorreta sobre confiança em proxies/headers (mitigado pela referência `subdomain-proxy-security.md` e guardrails).
