# Contexto do projeto — BancaFlow

## Propósito e resultados

SaaS multi-tenant para organizar a operação e o controle financeiro de bancas e sua rede de Cambistas. O MVP substitui controles manuais por fluxos isolados por banca, auditáveis e explicáveis.

## Stack e ambientes

- TypeScript em monorepo Turbo/npm workspaces.
- Domínio em `modules/*`.
- Backend NestJS em `apps/backend`.
- Prisma/PostgreSQL com modelos modulares.
- Web Next.js em `apps/web`.
- Testes Jest e integração/e2e proporcionais ao risco.

## Repositório e instruções locais

- Skills locais em `.claude/skills`.
- Web segue `apps/web/AGENTS.md` e a documentação local da versão do Next.js.
- Código usa nomes em inglês; o glossário preserva termos do negócio em português.
- Planejamento não cria código; spec aprovada não autoriza implementação automaticamente.

## Arquitetura e limites

DDD, POO e Arquitetura Limpa. Domínio não depende de framework/ORM. Agregados protegem invariantes; casos de uso orquestram portas; adapters implementam HTTP, banco e integrações. CQRS é usado quando útil. Histórico financeiro é imutável e configuração de regras é controlada e versionada.

## Capacidades existentes e planejadas

Existentes: Tenancy/Banca e Identity/Autenticação. Planejadas: Participants (Party e BettingAgent), segundo incremento de Participants (FieldCollector), Turnos, Financeiro/Ledger, Lançamentos, Prêmios, Acertos/Caixa e Dashboard/Relatórios. Apostas digitais ficam fora do MVP atual.

## Identidade, tenancy e autorização

- **Modelo:** multi-tenant por subdomínio, como `farizeu.bancaflow.com.br`.
- **Tenant:** `codigoBanca` é resolvido para `bancaId`; o cliente não escolhe livremente o tenant.
- **Papéis:** `OWNER | ADMIN | USER`.
- OWNER e ADMIN gerenciam Cambistas; USER não acessa a administração de Cambistas no MVP.
- `UserAccount` representa acesso ao SaaS e não substitui `Party`.

## Convenções de domínio, código e documentação

Participante → `Party`; Cambista → `BettingAgent`; Talão → `BettingAgentCode`; Recolhe → `FieldCollector`. Dinheiro nunca usa ponto flutuante binário. Planos são normativos; diagramas e mocks são apoio.

## Ferramentas, workflows e skills disponíveis

OpenSpec em modo spec-driven, Excalidraw, `plan-spec-roadmap`, `config-new-module` e skills locais de domínio, Backend, Prisma e Web. A fundação de módulo usa scaffold idempotente; cada prompt seleciona um incremento vertical, não uma camada técnica. Planos vivem em `.docs/plans`, prompts em `.docs/prompts` e novos diagramas em `.docs/diagrams`.

## Requisitos não funcionais

Isolamento estrito, autorização server-side, auditoria, idempotência/constraints, transações explícitas, preservação histórica, testes por camada, acessibilidade e estados loading/vazio/erro/permissão.

## Decisões existentes

Party e BettingAgent são agregados separados; CPF/documentos ficam fora; OWNER/ADMIN gerenciam Cambistas; FieldCollector fica em segunda change; remuneração individual suporta percentual sobre vendas, fixo semanal ou ambos; lançamento zerado não é criado; comissão sobre lucro usa piso zero.

## Restrições, riscos e pendências

Telas Web existentes são protótipos com dados locais e não definem regras. Não antecipar login de Cambista, apostas digitais ou regras financeiras não fechadas. Validador estrutural aprovado não implica READY_FOR_SPEC.

## Fontes de verdade e precedência

1. Decisão explícita registrada no plano.
2. Plano vigente.
3. Spec/change aprovada.
4. Código e testes como evidência implementada.
5. Diagrama/mock como apoio.

Divergências são registradas e retornam ao gate adequado; não são resolvidas silenciosamente.
