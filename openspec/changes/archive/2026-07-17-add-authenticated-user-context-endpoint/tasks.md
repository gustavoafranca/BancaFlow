## 1. Baseline e caracterização

- [x] 1.1 Executar os testes atuais de `@bancaflow/identity`, `@bancaflow/tenancy` e Backend antes das alterações e registrar qualquer falha preexistente — baseline verde: identity 160/160, tenancy 39/39
- [x] 1.2 Criar/ajustar testes de caracterização que comprovem as application claims atuais dos access tokens de login e refresh, permitam claims JWT padrão como `iat`/`exp`, validem os códigos estabelecidos do `JwtCookieAuthGuard` e preservem o contrato público vigente de `banca-context-query` por `codigoBanca`
- [x] 1.3 Confirmar que `UserAccount` e `Banca` já possuem todos os dados necessários e registrar que esta change não exige alteração de Prisma schema nem migration — `UserAccount{bancaId,username,name,email?,role,status}`, `Banca{codigoBanca,nome,status}`; sem mudança de schema/migration

## 2. Contratos Query/CQRS no Identity

- [x] 2.1 Definir a query e o DTO mínimo da conta autenticada por `userId + bancaId`, retornando `userId`, `bancaId`, `username`, `name`, `email` e `role` sem entidade ou tipo Prisma
- [x] 2.2 Definir no Identity a port mínima de contexto de exibição da banca por `bancaId`, sem importar `@bancaflow/tenancy`, `Banca`, repository ou use case concreto de Tenancy
- [x] 2.3 Definir `GetAuthenticatedUserContextUseCase` e seu DTO de saída exato, incluindo o mapeamento de `nome` para `banca.name` e excluindo `isActive`
- [x] 2.4 Ajustar fakes e testes unitários para comprovar sucesso, e-mail ausente, role persistida, mismatch de `bancaId`, ausência pós-guard e propagação distinta de falhas técnicas de Identity e Tenancy, sem vazamento de entidade
- [x] 2.5 Ajustar `GetAuthenticatedUserContextUseCase` para mapear somente ausência, inatividade, mismatch ou corrida pós-guard para `INVALID_CREDENTIALS` e preservar falhas técnicas das duas dependências até a borda HTTP

## 3. Query de contexto de exibição no Tenancy

- [x] 3.1 Definir a query/DTO de Tenancy por `bancaId` com saída `{ bancaId, codigoBanca, nome }`, mantendo `Banca.nome` e o código normalizado como fontes autoritativas
- [x] 3.2 Garantir no contrato que apenas banca ativa produz projeção e que banca inexistente/inativa resulta em falha segura
- [x] 3.3 Criar testes diretos da query/provider para banca ativa, inativa, inexistente, falha técnica do provider e ausência de entidade/campos de persistência, comprovando que falha técnica não é convertida em ausência
- [x] 3.4 Comprovar por teste que a consulta pública existente por `codigoBanca` mantém o comportamento e o retorno `{ bancaId, isActive }` — coberto pelo `get-banca-context.use-case.spec.ts` existente (inalterado), que afirma o contrato exato `{ bancaId, isActive }`

## 4. Adapters e composição no Backend

- [x] 4.1 Implementar o adapter Prisma da query de conta do Identity, com busca escopada por `userId + bancaId`, projeção explícita e filtro de estado compatível com falha segura após o guard — `AuthenticatedUserAccountQueryPrisma` (`select` + `status = ACTIVE`)
- [x] 4.2 Implementar o adapter Prisma da query de banca do Tenancy por `bancaId`, retornando somente `bancaId`, `codigoBanca` e `nome` para banca ativa — `BancaDisplayContextQueryPrisma`
- [x] 4.3 Implementar o adapter que satisfaz a port do Identity delegando à query de Tenancy, sem fazer a entidade `Banca` cruzar a fronteira — `BancaDisplayContextResolver` (mapeia `nome`→`name`)
- [x] 4.4 Registrar tokens/providers e exports mínimos nos módulos de origem e compor `GetAuthenticatedUserContextUseCase` no `IdentityModule`, sem `forwardRef` nem nova composição `platform`
- [x] 4.5 Criar testes diretos dos adapters Prisma de Identity e Tenancy para sucesso, ausência/inatividade e falha técnica, sem considerar a cobertura E2E como substituta desses testes
- [x] 4.6 Criar teste de integração da composição NestJS que resolva os providers reais e comprove a preservação da classificação de falhas na fronteira Identity–Tenancy

## 5. Endpoint HTTP do Identity

- [x] 5.1 Adicionar `GET /api/auth/me` ao `IdentityController` com `JwtCookieAuthGuard`, sem `@AllowPasswordChange` e sem body/query/path params de identificação
- [x] 5.2 Obter `userId` e `bancaId` exclusivamente do `AuthContext` e chamar o caso de uso injetado, mantendo o controller sem repository, Prisma ou regra de negócio
- [x] 5.3 Retornar exatamente `{ userId, username, name, email, role, banca: { bancaId, codigoBanca, name } }`, com `email: null` quando ausente e sem `isActive` ou campos internos
- [x] 5.4 Mapear exclusivamente conta/banca ausente ou inativa, mismatch e corrida detectados após o guard para `401 INVALID_CREDENTIALS`, sem enumeração ou contexto parcial
- [x] 5.5 Atualizar `apps/backend/src/modules/identity/identity.http` com cenários manuais seguros para `GET /api/auth/me` (#19, #19b, #19c, #19d)
- [x] 5.6 Preservar falhas técnicas de Query/Prisma originadas em Identity ou Tenancy e traduzi-las simetricamente para `500` com resposta externa genérica, nunca `400` ou `401`
- [x] 5.7 Registrar causa e contexto das falhas técnicas somente em logs internos seguros, sem expor código interno, mensagem técnica, stack ou detalhe Prisma na resposta HTTP

## 6. Testes de segurança e contrato

- [x] 6.1 Criar E2E de sucesso que valide contrato exato, dados persistidos atuais, `email: null` e role persistida diferente da application claim antiga presente no token
- [x] 6.2 Criar E2E específicos de `GET /api/auth/me` para ausência/token inválido, sessão revogada, sessão expirada, conta inativa, conta `BLOCKED` e banca inativa, afirmando os códigos estabelecidos do guard em cada cenário
- [x] 6.3 Criar e2e que tente fornecer outro `userId`, `bancaId` ou `codigoBanca` e comprove que a entrada do cliente não possui autoridade
- [x] 6.4 Criar e2e de isolamento que comprove que usuário de uma banca nunca recebe conta ou contexto de outra banca
- [x] 6.5 Testar `mustChangePassword=true` e criar cenário determinístico em que conta ou banca muda entre a aprovação do guard e a query, comprovando `401 INVALID_CREDENTIALS` sem contexto parcial
- [x] 6.6 Decodificar os access tokens emitidos por login e refresh, comprovar exatamente as application claims `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword`, permitir `iat`/`exp` e proibir nome, e-mail, username, código ou nome da banca
- [x] 6.7 Criar testes HTTP que provoquem separadamente falha técnica de Identity e falha técnica de Tenancy e comprovem resposta `500` externa genérica, simétrica e sem detalhes internos
- [x] 6.8 Comprovar nos testes de falha técnica que a causa permanece disponível ao mecanismo de logging interno seguro sem aparecer no payload HTTP

## 7. Documentação arquitetural

- [x] 7.1 Atualizar os READMEs afetados de Identity e Tenancy no domínio com as novas queries, DTOs, ownership e direção das dependências
- [x] 7.2 Atualizar os READMEs afetados do Backend com a taxonomia A/B/C, os códigos preservados do guard, a distinção pós-guard/técnica, logging seguro e resposta `500` genérica
- [x] 7.3 Registrar explicitamente que a consulta pública por `codigoBanca` permanece inalterada, que não existe novo bounded context e que a integração Web será uma change posterior

## 8. Gates e validação final

- [x] 8.1 Reexecutar `npm test --workspace @bancaflow/identity` e `npm run build --workspace @bancaflow/identity` após os ajustes de política de erro
- [x] 8.2 Reexecutar `npm test --workspace @bancaflow/tenancy` e `npm run build --workspace @bancaflow/tenancy` após os ajustes de query/adapters
- [x] 8.3 Reexecutar `npm test --workspace @bancaflow/backend -- --runInBand` e os testes E2E relevantes com `npm run test:e2e --workspace @bancaflow/backend -- --runInBand` em ambiente de banco configurado
- [x] 8.4 Reexecutar `npm run lint --workspace @bancaflow/backend`, `npm run build --workspace @bancaflow/backend` e `npm run check-types`, revisando qualquer correção automática do lint
- [x] 8.5 Executar `openspec validate add-authenticated-user-context-endpoint --strict` depois da implementação e corrigir qualquer incoerência entre proposal, design, delta specs e tasks
- [x] 8.6 Realizar revisão humana do contrato, segurança, fronteiras DDD e resultados dos testes antes de arquivar a change ou criar a spec frontend consumidora
