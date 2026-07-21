## 1. Scaffold da skill

- [ ] 1.1 Localizar o `skill-creator` e rodar `scripts/init_skill.py` para gerar o esqueleto de `design-multitenant-subdomain`
- [ ] 1.2 Confirmar a árvore-base (`SKILL.md`, `agents/`, `references/`, `assets/`) e remover quaisquer arquivos gerados que sejam README/changelog/installation guide

## 2. SKILL.md

- [ ] 2.1 Escrever o frontmatter contendo **apenas** `name` e `description`, com disparadores específicos para tenancy/isolamento/resolução por host e sem disparar para SaaS simples
- [ ] 2.2 Escrever a seção "método estável vs contexto variável", condicionando toda recomendação tecnológica ao contexto real (sem impor NestJS/Prisma/Next.js)
- [ ] 2.3 Escrever a ordem de descoberta de contexto (caminho explícito → arquivo de contexto → repo → perguntas) e a oferta do template quando não houver contexto
- [ ] 2.4 Escrever o workflow em 10 fases (descoberta → domínio → tenancy/persistência → resolução por host → identity/auth → arquitetura limpa → especificação → implementação → verificação → documentação)
- [ ] 2.5 Escrever a seção de guardrails obrigatórios (host/proxy, isolamento, domínio limpo, sem mutações externas em fase de exploração, respeitar skills locais, declarar inferências)
- [ ] 2.6 Adicionar o mapa de outputs que a skill sabe produzir e roteamento para `references/`; medir linhas (< 500) e mover excesso para referências

## 3. Template de contexto

- [ ] 3.1 Escrever `assets/project-context-template.md` com as seções Produto/domínio, Stack/repositório, Tenancy, Identity/acesso, Operação/segurança
- [ ] 3.2 Adicionar a seção de Decisões pendentes numeradas `D1..Dn` (opções, recomendação fundamentada, decisão escolhida, consequências/riscos)
- [ ] 3.3 Revisar o template para garantir que é copiável a um projeto novo e não menciona BancaFlow

## 4. Referências especializadas

- [ ] 4.1 `references/discovery-and-decisions.md`: catálogo de decisões (pergunta/opções/quando/riscos/recomendação-condicionada/exemplo `D<n>`) cobrindo os 15 tópicos mínimos
- [ ] 4.2 `references/domain-and-clean-architecture.md`: heurísticas de bounded contexts, agregados, entidades, VOs, domain services, casos de uso, ports/adapters, DTOs e direção de dependências
- [ ] 4.3 `references/tenant-isolation-and-data.md`: comparar shared-DB+`tenantId`, schema-por-tenant, banco-por-tenant e híbrido (constraints, índices, FKs compostas, auditoria, migrations, jobs, cache, filas, storage, prevenção de vazamento)
- [ ] 4.4 `references/authentication-and-sessions.md`: contas, memberships, hashing, tokens, cookies, refresh rotation, revogação, bloqueio, MFA, SSO, recuperação e autorização por estado persistido — sem fixar algoritmos/TTLs universais
- [ ] 4.5 `references/subdomain-proxy-security.md`: parsing/normalização de host, DNS/TLS wildcard, reverse proxies, `Host`/`Forwarded`/`X-Forwarded-Host`, peer imediato, allowlist IP/CIDR, IPv4/IPv6, dev local, Docker/K8s, host header injection, domínios customizados e testes de segurança
- [ ] 4.6 `references/testing-and-review.md`: matriz de testes por camada e checklist de code review, exigindo cenários reais de concorrência/banco quando a regra depender deles
- [ ] 4.7 `references/documentation-playbook.md`: estrutura de READMEs de Domínio/Backend/Web e diagramas mínimos, sem obrigar ferramentas
- [ ] 4.8 Revisar todas as referências para não duplicarem extensamente o `SKILL.md`

## 5. Agente

- [ ] 5.1 Escrever `agents/openai.yaml` com `display_name` coerente, descrição curta e prompt padrão orientado a ler o contexto primeiro, alinhado ao `SKILL.md`

## 6. Validação e forward-tests

- [ ] 6.1 Rodar `scripts/quick_validate.py` e corrigir até passar
- [ ] 6.2 Forward-test 1 (ERP por empresa): decidir User/Tenant no mesmo módulo e planejar login por subdomínio sem escrever código prematuro
- [ ] 6.3 Forward-test 2 (marketplace multi-org): modelar Identity/Membership/Organization e isolamento sem duplicar conta humana automaticamente
- [ ] 6.4 Forward-test 3 (revisão de segurança): revisar resolução por `X-Forwarded-Host`, identificar headers forjáveis e fronteira de confiança, classificar achados
- [ ] 6.5 Forward-test 4 (Java/Spring/React/MySQL): gerar proposta multi-tenant preservando o método sem impor NestJS/Prisma/Next.js
- [ ] 6.6 Ajustar a skill conforme achados dos forward-tests e revalidar

## 7. Entrega

- [ ] 7.1 Confirmar critérios de aceite (frontmatter só `name`/`description`, coerência do `openai.yaml`, ausência de README/changelog/installation guide, template sem BancaFlow)
- [ ] 7.2 Reportar caminho absoluto de instalação, árvore de arquivos essenciais, localização do template, resultado do `quick_validate.py`, resumo dos forward-tests e três exemplos curtos de invocação
