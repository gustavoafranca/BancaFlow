# Platform Provisioning no Backend

## Responsabilidade e limite

`PlatformProvisioningModule` é um composition root externo para um fluxo que cruza os bounded contexts Tenancy e Identity. Ele não contém regra de negócio nem adapter próprio: apenas conecta contratos já definidos para construir `ProvisionBancaUseCase`.

A regra e o diagrama canônico do fluxo atômico estão no [README de domínio de Tenancy](../../../../../modules/tenancy/README.md#provisionbancausecase). A infraestrutura Prisma/transacional está no [README do backend](../../../README.md).

## Como a composição quebra o ciclo

O módulo importa `IdentityModule` e `TenancyModule`, sem `forwardRef`, e monta:

| Dependência do `ProvisionBancaUseCase` | Origem no NestJS                                                    |
| -------------------------------------- | ------------------------------------------------------------------- |
| `BancaRepository`                      | `BANCA_REPOSITORY`, exportado por Tenancy                           |
| `CreateUserAccountPort`                | `CREATE_USER_ACCOUNT_USE_CASE`, exportado por Identity              |
| `TransactionManager`                   | `TENANCY_TRANSACTION_MANAGER`, a mesma instância de `PrismaService` |

Se essa factory ficasse dentro de Identity, Identity precisaria conhecer Tenancy; se ficasse em Tenancy, o módulo NestJS precisaria conhecer Identity. O composition root externo conhece ambos e preserva os módulos sem ciclo. O `ProvisionBancaUseCase` continua no domínio Tenancy porque a operação nasce do ciclo de vida de `Banca`; o backend somente fornece implementações às ports.

## Execução no MVP

Não existe endpoint HTTP para `ProvisionBanca` no MVP. O caso de uso é obtido do `AppModule` e executado pelo seed [`provision-farizeu.seed.ts`](../../../prisma/seed/tasks/provision-farizeu.seed.ts), que cria uma banca de desenvolvimento e seu primeiro OWNER de forma idempotente. A senha do seed permanece no arquivo de dados local ao fluxo e **não é reproduzida nesta documentação**.

O teste [`provision-banca.e2e-spec.ts`](../../../test/tenancy/provision-banca.e2e-spec.ts) comprova tanto o commit das duas entidades quanto o rollback real quando a criação do OWNER falha. Consulte o [diagrama do fluxo atômico no domínio](../../../../../modules/tenancy/README.md#provisionbancausecase).

## Decisões do MVP e fora de escopo

Provisionamento é uma operação interna de seed/teste. Controller, autenticação administrativa, retries distribuídos, fila e API pública de onboarding estão fora do escopo atual. Criar uma rota sem essas decisões ampliaria a superfície de segurança e não está autorizado pelo comportamento existente.

## Erros comuns ao evoluir este módulo

- Mover a regra de criação de `Banca` ou OWNER para a factory NestJS.
- Importar Identity dentro de `TenancyModule`, ou Tenancy dentro de Identity para provisionar.
- Resolver o ciclo com `forwardRef` em vez de manter esta composition root.
- Usar instâncias/transações diferentes para salvar banca e conta.
- Chamar repositórios Prisma diretamente no seed e contornar o caso de uso real.
- Documentar ou registrar a senha do seed, hashes ou secrets.
- Expor endpoint HTTP por conveniência sem contrato de autorização e testes e2e.

## Checklist para adicionar uma nova composição cross-context

- [ ] Confirmar qual domínio é dono do caso de uso e das invariantes.
- [ ] Definir ports estreitas nos domínios, sem imports de infraestrutura.
- [ ] Exportar apenas tokens/providers necessários nos módulos de origem.
- [ ] Montar a factory no platform sem `forwardRef` e sem regra de negócio.
- [ ] Compartilhar o mesmo `TransactionManager` quando a operação for atômica.
- [ ] Manter controller/trigger separado da composição e aplicar autorização explícita.
- [ ] Testar commit e rollback reais entre todos os contextos participantes.
- [ ] Atualizar os links e a documentação canônica do fluxo no domínio proprietário.
