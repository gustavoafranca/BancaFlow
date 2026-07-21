# BancaFlow — Plano mestre do MVP

**Versão:** 1.0

## Objetivo

Este é o índice oficial do planejamento do MVP. Ele organiza a construção por capacidades e impede que uma spec seja criada antes de seu plano estar claro.

1. **Plano:** problema, linguagem, regras, modelo, fluxos, portas e decisões.
2. **Spec:** requisitos, design e tarefas verificáveis.
3. **Implementação:** execução da spec aprovada.
4. **Revisão/documentação:** confronto entre código, testes, spec e plano antes do arquivamento.

## Estados

`DISCOVERY → DECISIONS_PENDING → READY_FOR_SPEC → SPEC_PROPOSED → SPEC_APPROVED → IMPLEMENTING → IMPLEMENTED → REVIEWED → DOCUMENTED → ARCHIVED`

Decisão crítica aberta impede `READY_FOR_SPEC`. Testes verdes não significam, sozinhos, que uma change está pronta para arquivar.

## Princípios

- Monorepo Turbo, DDD, POO e Arquitetura Limpa.
- Módulo representa capacidade de negócio, não tabela ou tela.
- Domínio não depende de NestJS, Prisma, HTTP ou Next.js.
- Entidades protegem identidade/ciclo de vida; VOs protegem conceitos/invariantes.
- Agregados delimitam consistência transacional.
- Casos de uso orquestram regras e portas; adapters implementam portas.
- Todo dado operacional pertence a uma `Banca`; consultas nunca atravessam tenants.
- Histórico financeiro é imutável; correções usam reversão/compensação.
- `UserAccount` é acesso ao SaaS; participante não ganha login automaticamente.
- Configuração de negócio usa opções controladas e versionadas, nunca fórmula arbitrária.

## Sequência

| Ordem | Capacidade | Estado | Depende de |
|---:|---|---|---|
| 0 | Tenancy e Identity | `REVIEWED` | — |
| 1 | Participantes / Rede Operacional | `READY_FOR_SPEC` | Tenancy e Identity |
| 2 | Turnos | `READY_FOR_SPEC` | Tenancy e Identity |
| 3 | Núcleo Financeiro / Ledger | `DECISIONS_PENDING` | Participantes |
| 4 | Lançamentos | `DECISIONS_PENDING` | Participantes, Turnos e Financeiro |
| 5 | Prêmios | `DECISIONS_PENDING` | Participantes, Turnos e Financeiro |
| 6 | Acertos e Caixa | `DISCOVERY` | Financeiro, Lançamentos e Prêmios |
| 7 | Dashboard e Relatórios | `DISCOVERY` | Módulos transacionais |
| 8 | Identity — Perfil e Administração de Usuários da Banca | `READY_FOR_SPEC` (somente INC-01; INC-02/INC-03 em `DISCOVERY`) | Tenancy e Identity (capacidade 0) |
| 9 | Access Control — Catálogo Autoritativo de Papéis e Permissões | `DECISIONS_PENDING` (D44 aberta) | Identity (capacidade 8); consumido por todas as demais capacidades |

Capacidades 8 e 9 tornam funcionais `/perfil` e `/configuracoes`, hoje simulados, e substituem a matriz demonstrativa de permissões do frontend por uma política autoritativa. Ambas vivem na área estável `foundation` (ver convenção abaixo) por compartilharem ownership duradouro com Tenancy/Identity, mas têm ownership entre si distinto: capacidade 8 estende o agregado `UserAccount` já existente em Identity; capacidade 9 introduz um bounded context novo (Access Control), consumido — não possuído — por Identity e por todas as demais capacidades do roadmap.

## Convenção de área `foundation`

A partir da capacidade 8, planos e diagramas de Identity/Tenancy/Access Control usam uma área estável duradoura em vez da raiz plana usada por 01–07:

- Planos: `.docs/plans/foundation/NN-capability.md`.
- Diagramas: `.docs/diagrams/foundation/NN-capability.excalidraw`.
- Numeração permanece global e sequencial a partir do próximo número livre (`08`), confirmada recursivamente antes de cada novo plano.
- Os planos `01` a `07` permanecem na raiz de `.docs/plans`, sem renumeração, sem migração e sem duplicação — apenas esta tabela passa a apontar para a nova área quando uma capacidade for de Identity/Tenancy/Access Control.
- Um plano de capacidade dedicado a Tenancy só é criado se o discovery encontrar uma capacidade/jornada nova de Tenancy; até lá, Tenancy permanece dependência e fonte de invariantes dos planos de Identity/Access Control (capacidade 0, `REVIEWED`, sem arquivo de plano numerado).

## Planos

- [01 — Participantes](./01-participants.md)
- [02 — Turnos](./02-operational-shifts.md)
- [03 — Financeiro](./03-finance-core.md)
- [04 — Lançamentos](./04-entries.md)
- [05 — Prêmios](./05-prizes.md)
- [06 — Acertos e Caixa](./06-settlements-cash.md)
- [07 — Dashboard e Relatórios](./07-dashboard-reports.md)
- [08 — Identity: perfil e administração de usuários](./foundation/08-identity-profile-and-tenant-user-administration.md)
- [09 — Access Control: catálogo de permissões](./foundation/09-authoritative-access-control.md)

## Processo por capacidade

1. Resolver decisões bloqueantes.
2. Desenhar Excalidraw: atores, jornada, casos de uso, domínio e portas/adapters.
3. Decompor a capacidade em increments verticais e mapear capability specs.
4. Validar Definition of Ready do incremento selecionado e marcar `READY_FOR_SPEC`.
5. Gerar um prompt OpenSpec para exatamente um incremento, sem implementar.
6. Criar/revisar a proposta OpenSpec.
7. Aplicar somente após aprovação.
8. Revisar arquitetura, regras, segurança e testes.
9. Atualizar documentação/diagrama com o comportamento real.
10. Arquivar.

## Definition of Ready

- objetivo, atores, permissões, escopo e fora de escopo definidos;
- linguagem ubíqua sem ambiguidade;
- agregados, entidades, VOs, invariantes e estados candidatos descritos;
- casos de uso, falhas, portas e eventos descritos;
- transações, concorrência e idempotência explícitas;
- tenancy, autorização e auditoria definidas;
- persistência, Backend, Web e aceitação descritos;
- nenhuma decisão crítica aberta;
- diagrama e prompt vinculados.

Descoberta posterior atualiza plano e spec; não fica escondida na implementação.
