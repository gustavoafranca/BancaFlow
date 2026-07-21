---
name: config-new-module
description: Criar ou reconciliar a fundação estrutural de um módulo no monorepo, com pacote de domínio, módulo NestJS, fronteira Prisma e módulo Web selecionáveis por modo. Usar ao iniciar um novo bounded context/capability ou na primeira tarefa de uma change OpenSpec, especialmente quando for necessário preservar rotas/telas existentes, evitar CRUD e exemplos genéricos, executar dry-run e manter o scaffold idempotente.
---

# Configurar novo módulo

Criar somente as fronteiras técnicas repetitivas. Deixar entidades, regras, casos de uso, controllers, adapters Prisma, páginas e formulários para as skills especializadas e para uma spec aprovada.

## Pré-condições

1. Ler o plano/change aprovado e identificar o nome técnico do módulo.
2. Ler `.claude/skills/skills.config.json` e instruções locais dos apps afetados.
3. Escolher o menor modo suficiente.
4. Informar `--route` quando o módulo reaproveitar uma rota existente.
5. Executar primeiro com `--dry-run` e revisar todos os caminhos.

## Modos

| Modo | Domínio | Backend | Web |
|---|---:|---:|---:|
| `domain-only` | sim | não | não |
| `backend-only` | existente | sim | não |
| `web-only` | existente | não | sim |
| `domain-backend` | sim | sim | não |
| `fullstack` | sim | sim | sim |

`backend-only` e `web-only` exigem que `modules/<module>/package.json` já exista.

## Comandos

Pré-visualizar um módulo full-stack associado a uma tela existente:

```bash
node .claude/skills/config-new-module/scripts/create-module.mjs participants \
  --mode fullstack \
  --route cambistas \
  --dry-run
```

Executar após aprovar o preview:

```bash
node .claude/skills/config-new-module/scripts/create-module.mjs participants \
  --mode fullstack \
  --route cambistas
```

Criar somente o núcleo de domínio:

```bash
node .claude/skills/config-new-module/scripts/create-module.mjs finance --mode domain-only
```

Usar `--json` quando outra ferramenta precisar consumir o resumo. Usar `--project-root` apenas para fixtures/validação ou quando o repositório não puder ser inferido pela localização da skill.

## Contrato de saída

### Domínio

- `modules/<module>/package.json`
- `modules/<module>/tsconfig.json`
- `modules/<module>/jest.config.ts`
- `modules/<module>/src/index.ts`

O pacote começa com API pública vazia. Não criar entidade ou teste fictício.

### Backend

- `<backendAppPath>/src/modules/<module>/<module>.module.ts`
- `<backendAppPath>/src/modules/<module>/index.ts`
- `<backendAppPath>/prisma/models/<module>.model.prisma`
- registro idempotente no `AppModule`
- dependência do pacote de domínio

Não criar controller de exemplo, adapter Prisma genérico ou endpoint fictício.

### Web

- `<frontendAppPath>/src/modules/<module>/index.ts`
- índices vazios em `components`, `data` e `pages`
- dependência do pacote de domínio

Não criar dashboard, rota, menu ou dados simulados. Quando `--route` for informado, validar e preservar a página existente; se ela não existir, registrar risco para a etapa Web da spec.

## Segurança de edição

- Nunca sobrescrever um arquivo existente com conteúdo diferente.
- Reconciliar apenas integrações estruturais seguras: dependências e registro do NestJS module.
- Não oferecer `--force`.
- `--dry-run` não pode alterar projeto, log ou configuração.
- Reexecução com os mesmos argumentos deve ser idempotente.
- Parar quando o `AppModule`, a configuração ou o pacote-base não puderem ser interpretados com segurança.

## Composição com outras skills

Depois do scaffold, seguir as tarefas da change:

1. domínio: `module-entity`, `module-value-object`, `module-repository`, `module-query-cqrs`, `module-dto`, `module-use-case` e `module-domain-service` somente quando aplicável;
2. backend: `backend-prisma-data` e `backend-controller`;
3. Web: `frontend-form-schema` e padrões locais do app;
4. execução: `openspec-apply-change` somente após aprovação.

Consultar [module-template.md](references/module-template.md) para detalhes e critérios de validação.

## Validação

```bash
node --test .claude/skills/config-new-module/scripts/create-module.test.mjs
```

Também validar o diretório da skill com o validador oficial de skills após mudanças em metadados ou workflow.
