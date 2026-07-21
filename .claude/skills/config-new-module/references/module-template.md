# Contrato do scaffold de módulo

## Objetivo

Preparar fronteiras compiláveis e integrações repetitivas sem antecipar decisões de negócio ou interface.

## Seleção de camadas

O modo escolhido controla quais fronteiras serão reconciliadas. Um scaffold não é evidência de que a capability foi implementada; ele apenas habilita as próximas tarefas da change.

## Regras do pacote de domínio

- Usar `modules/<module>` e o namespace resolvido pela configuração compartilhada.
- Depender apenas do pacote shared no scaffold inicial.
- Manter `src/index.ts` vazio até as APIs públicas reais existirem.
- Permitir teste vazio no instante do scaffold; as tarefas de domínio devem adicionar testes reais antes de concluir a change.

## Regras do Backend

- Criar um NestJS module vazio, sem controller ou provider inventado.
- Registrar o module no `AppModule` sem duplicação.
- Criar apenas a fronteira de schema Prisma com comentário de ownership.
- Adicionar o pacote de domínio nas dependências do backend.
- A spec define models, migrations, repositories, queries, transactions e endpoints.

## Regras da Web

- Criar apenas os índices de `components`, `data`, `pages` e do módulo.
- Adicionar o pacote de domínio nas dependências da Web.
- Não criar rota automaticamente.
- `--route <path>` associa uma rota existente e confirma que ela será preservada.
- A spec Web decide página, navegação, permissões, formulários, estados e integração.

## Idempotência e preservação

- Arquivo ausente: criar.
- Arquivo gerado e idêntico: preservar.
- Arquivo existente e diferente: preservar e registrar risco.
- Dependência ausente: acrescentar sem remover as existentes.
- Registro NestJS ausente: acrescentar sem reordenar módulos existentes.
- Segunda execução: não produzir mudança funcional.

## Definition of Done do scaffold

- dry-run revisado;
- caminhos resolvidos pela configuração correta;
- somente camadas selecionadas criadas;
- nenhuma regra, endpoint, model ou tela fictícia;
- rota informada preservada;
- teste de integração da skill verde;
- a change continua responsável por build, testes e implementação real.
