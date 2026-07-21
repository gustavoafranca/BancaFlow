# Tenancy no Backend

## Responsabilidade e limite

Este diretório implementa adapters e composição NestJS para o bounded context Tenancy. Ele persiste e consulta `Banca` e oferece a Identity um contexto mínimo de tenant. Regras como formato de `codigoBanca`, subdomínios reservados, estado e provisionamento pertencem ao [`@bancaflow/tenancy`](../../../../../modules/tenancy/README.md); não devem migrar para Prisma ou NestJS.

Prisma, transações, migrações e configuração têm fonte canônica no [README do backend](../../../README.md).

## Composição do `TenancyModule`

`TenancyModule` importa apenas `DbModule` e registra:

| Provider/token                | Implementação                          | Exportado | Motivo                                                         |
| ----------------------------- | -------------------------------------- | --------- | -------------------------------------------------------------- |
| `BANCA_REPOSITORY`            | `BancaRepositoryPrisma`                | sim       | Satisfaz a port `BancaRepository` e permite composição externa |
| `TENANCY_TRANSACTION_MANAGER` | `useExisting: PrismaService`           | sim       | Compartilha a mesma instância transacional do backend          |
| `GetBancaContextUseCase`      | factory com `BANCA_REPOSITORY`         | sim       | Leitura pública mínima de contexto                             |
| `BancaContextResolver`        | adapter sobre `GetBancaContextUseCase` | sim       | Implementa a port de saída definida por Identity               |

O módulo **não depende de `IdentityModule`** e não usa `forwardRef`. Identity importa Tenancy para obter `BancaContextResolver`; a operação que precisa de ambos os contextos é composta externamente no [`PlatformProvisioningModule`](../platform/README.md).

## `BancaRepositoryPrisma`

O adapter implementa o contrato `BancaRepository` do domínio e usa `PrismaService.activeClient()`, reaproveitando a transação ambiente quando existe. Leituras por código recebem o valor já normalizado; `fromDomain` persiste `banca.codigoBanca.normalized`, enquanto `toDomain` reconstrói por `Banca.tryCreate`, revalidando invariantes.

Nenhum tipo Prisma cruza a fronteira: os métodos retornam `Result<Banca | null>`, `Result<boolean>` ou `Result<void>`. Falhas são convertidas em códigos estáveis por `safeErrorCode`. O `upsert` por `id` persiste somente campos do agregado; detalhes de tabela permanecem no adapter.

## `BancaContextResolver`

Identity define a port `BancaContextResolver`; este adapter a implementa delegando para `GetBancaContextUseCase`. A resposta contém somente `bancaId` e `isActive`, nunca a entidade `Banca`. Isso evita que Identity conheça o modelo de Tenancy e mantém a dependência apontando para o contrato interno.

O fluxo completo host → `codigoBanca` → contexto está no [README de Identity do backend](../identity/README.md#resolução-segura-do-tenant).

## `BancaDisplayContextQueryPrisma` e `BancaDisplayContextResolver`

Para o contexto de exibição de `GET /api/auth/me` (rota que **pertence ao Identity**, não a Tenancy):

- `BancaDisplayContextQueryPrisma` implementa a port de leitura `BancaDisplayContextQuery` do domínio, projetando via `select` apenas `{ bancaId, codigoBanca, nome }` de uma banca **ativa** por `id` (`findFirst` com `status = 'ACTIVE'`). Não reidrata `Banca` nem vaza tipos Prisma. Separa **ausência esperada** (banca inexistente/inativa → `Result.ok(null)`) de **falha técnica** (exceção Prisma → `Result.fail(TENANCY.BANCA_DISPLAY_QUERY_ERROR)` via `safeErrorCode`); falha técnica **nunca** é colapsada em ausência.
- `BancaDisplayContextResolver` implementa a port `BancaDisplayContextResolver` do **Identity**, delegando ao `GetBancaDisplayContextUseCase` e mapeando `nome`→`name`. Preserva a distinção acima ao traduzir para o contrato do Identity: banca ativa → `Result.ok(context)`; `BANCA_NOT_FOUND` → `Result.ok(null)` (categoria B); qualquer outro código → `Result.fail(...)` (categoria C, técnica). Assim a borda HTTP do Identity mapeia falha técnica de Tenancy para `500` genérico, e não para `401`. Ambos são registrados/exports do `TenancyModule` e consumidos pelo `IdentityModule` via `useExisting` (mesma direção unidirecional do `BancaContextResolver`).

## Testes e evidências

- [`provision-banca.e2e-spec.ts`](../../../test/tenancy/provision-banca.e2e-spec.ts) comprova persistência atômica de banca + OWNER e rollback real;
- [`tenant-isolation.e2e-spec.ts`](../../../test/identity/tenant-isolation.e2e-spec.ts) comprova unicidade por banca e a FK composta;
- [`identity.e2e-spec.ts`](../../../test/identity/identity.e2e-spec.ts) comprova que o login resolve a banca pelo host;
- os testes de domínio e os fakes de Tenancy são catalogados no [README do domínio](../../../../../modules/tenancy/README.md).

## Decisões do MVP e fora de escopo

Tenancy continua **não expondo controller próprio** neste MVP. As consultas de contexto (pública por `codigoBanca` para login; autenticada por `bancaId` para `GET /api/auth/me`) servem outros módulos via adapters/ports; o provisionamento é interno. A rota `GET /api/auth/me` vive no Identity e apenas consome a projeção de exibição da banca. Esta change **não** cria novo bounded context; a integração Web é uma change posterior. Gestão administrativa de bancas por HTTP, billing e custom domains não estão implementados.

## Erros comuns ao evoluir este módulo

- Duplicar regex, subdomínios reservados ou transições de `Banca` no adapter.
- Persistir `codigoBanca.raw` em vez de `codigoBanca.normalized`.
- Retornar rows/inputs Prisma ou a entidade `Banca` para Identity.
- Fazer `TenancyModule` importar `IdentityModule` e recriar o ciclo.
- Instanciar outro gerenciador transacional e perder o `AsyncLocalStorage` compartilhado.
- Abrir endpoint de provisionamento sem uma decisão de produto e autorização explícitas.
- Alterar mapeamento/modelo sem atualizar migração, testes e a documentação canônica de Prisma.

## Checklist para adicionar um novo adapter ou integração

- [ ] Confirmar que a regra e o contrato pertencem ao domínio Tenancy.
- [ ] Implementar a port sem expor tipos Prisma/NestJS.
- [ ] Manter `toDomain`/`fromDomain` explícitos e persistir valores normalizados.
- [ ] Usar `activeClient()` para participar da transação ambiente.
- [ ] Registrar provider/token/export mínimo no `TenancyModule` sem importar Identity.
- [ ] Compor dependências cross-context no módulo platform.
- [ ] Testar sucesso, falha, rollback, normalização e isolamento por tenant.
- [ ] Atualizar este README e apontar regras para o README do domínio.
