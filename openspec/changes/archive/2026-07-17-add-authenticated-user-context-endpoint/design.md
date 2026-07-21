## Context

O access token contém somente as application claims necessárias (`sub`, `bancaId`, `sessionId`, `role`, `mustChangePassword`), além das claims padrão gerenciadas pelo JWT, como `iat` e `exp`. O shell privado do Web precisa exibir nome, username, e-mail, papel atual e identificação da banca, mas hoje usa dados hardcoded. Esses dados não pertencem ao JWT e devem ser obtidos por uma leitura autenticada do Backend.

Identity já é o bounded context proprietário de `UserAccount`, autenticação e sessão. Tenancy continua proprietário de `Banca`, `codigoBanca`, `nome` e status operacional. A consulta pública existente resolve tenant por `codigoBanca`, enquanto o contexto autenticado fornece `bancaId`; portanto, ampliar apenas o retorno da consulta pública não atende `GET /api/auth/me`.

O `JwtCookieAuthGuard` é autoritativo: valida token, sessão, conta ativa, banca ativa e `mustChangePassword`, injeta `AuthContext` e já possui uma política pública de códigos de erro que deve ser preservada. Há precedente de endpoints Identity protegidos por esse guard, como `GET /api/auth/sessions`.

A revisão da implementação identificou que falhas técnicas das leituras de Identity e Tenancy podem percorrer caminhos assimétricos e acabar convertidas em `400` ou em falha de autenticação. O desenho precisa distinguir estados esperados de autenticação de indisponibilidade técnica sem expor detalhes internos.

## Goals / Non-Goals

**Goals:**
- Expor `GET /api/auth/me` no Identity com o contexto de exibição do próprio usuário.
- Resolver usuário e banca exclusivamente por `userId`/`bancaId` do `AuthContext` validado.
- Aplicar Query/CQRS para retornar projeções explícitas sem reidratar ou serializar entidades.
- Consultar Tenancy por `bancaId`, preservando a resolução pública por `codigoBanca`.
- Preservar os códigos públicos já emitidos pelo guard e definir uma política explícita para inconsistências pós-guard e falhas técnicas.
- Manter mínimas as application claims do JWT e o isolamento multi-tenant autoritativo.

**Non-Goals:**
- Criar outro módulo/bounded context de autenticação, perfil ou contexto de usuário.
- Alterar a resolução pública de tenant por subdomínio.
- Editar perfil, avatar, preferências ou permissões.
- Incluir dados de exibição nas application claims.
- Alterar Prisma schema ou criar migration.
- Refatorar globalmente o guard, o filtro de exceções ou todos os controllers.
- Implementar qualquer parte do Web nesta change.

## Decisions

### D1. A capability pertence ao Identity existente

`GET /api/auth/me` fica no `IdentityController`, protegido por `JwtCookieAuthGuard`. O controller recebe `AuthContext`, chama um caso de uso injetado e traduz o resultado para HTTP conforme a taxonomia desta change; não consulta repositories/Prisma nem serializa entidades.

**Alternativa rejeitada:** criar `Auth`, `Profile`, `UserContext` ou outro bounded context. A operação não introduz linguagem, invariantes ou ciclo de vida próprios; é uma projeção autenticada de conceitos já pertencentes a Identity e Tenancy.

### D2. Identificação exclusivamente pelo contexto autenticado

O caso de uso recebe `{ userId, bancaId }` derivados de `AuthContext`. A rota não declara body, query ou path params para esses identificadores e ignora qualquer tentativa de enviá-los pelo cliente.

O endpoint não recebe `@AllowPasswordChange`: `mustChangePassword=true` continua bloqueado pelo comportamento padrão do guard, pois o contexto é destinado ao shell privado posterior à troca obrigatória.

### D3. Query/CQRS para dados de exibição

Como a operação é uma leitura orientada à API/Web, Identity define uma query de conta que retorna DTO mínimo equivalente a `{ userId, bancaId, username, name, email, role }`. O adapter Prisma implementa a query sem retornar `UserAccount` ou tipo Prisma e restringe a busca ao par `userId + bancaId`.

Tenancy define uma query de contexto de exibição por `bancaId`, retornando DTO equivalente a `{ bancaId, codigoBanca, nome }` somente para banca ativa. `Banca.nome` é a fonte autoritativa; `nome` é mapeado para `name` apenas no DTO HTTP.

As convenções da skill de Query/CQRS são orientação para a separação entre leitura, DTO e persistência, mas não impõem renomear métodos ou mover contratos já coerentes apenas para reproduzir literalmente um caminho de pasta. A estrutura atual — ports compartilhadas no Identity e query própria no Tenancy — é uma adaptação local válida porque mantém contratos explícitos, direção de dependência e ausência de vazamento do Prisma. Novos nomes e caminhos devem seguir o padrão predominante do módulo onde forem criados.

**Alternativa rejeitada:** usar repositories para reidratar `UserAccount` e `Banca` somente para serialização. Repository/entidade permanece destinado a comandos e leituras necessárias às invariantes; projeções para consumidores usam queries.

**Alternativa rejeitada:** provocar churn estrutural para forçar `execute(input)` e uma pasta única em contratos que já preservam a semântica Query/CQRS. Isso aumenta o diff sem corrigir o problema funcional ou arquitetural desta change.

### D4. Port do Identity e integração unidirecional com Tenancy

Identity define uma port mínima para obter o contexto de exibição da banca por `bancaId`, sem importar `@bancaflow/tenancy`, `Banca`, `BancaRepository` ou o use case concreto de Tenancy. Um adapter no Backend implementa essa port delegando à query pública de aplicação de Tenancy.

O `IdentityModule` continua importando `TenancyModule`, registra os adapters atrás de tokens e injeta o `GetAuthenticatedUserContextUseCase` pronto no controller.

**Alternativa rejeitada:** criar composição em `PlatformProvisioningModule`. Não há dependência reversa nem ciclo: a necessidade é expressa por uma port do Identity e satisfeita externamente, seguindo a direção já existente. Uma composition root separada só seria necessária se surgisse um ciclo real.

### D5. Caso de uso fino e DTO HTTP explícito

`GetAuthenticatedUserContextUseCase` coordena a query de conta e a port de contexto da banca. Ele valida que ambas as projeções pertencem ao mesmo `bancaId`, distingue ausência/inatividade de falha técnica e retorna:

```ts
{
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: "OWNER" | "ADMIN" | "USER";
  banca: {
    bancaId: string;
    codigoBanca: string;
    name: string;
  };
}
```

`role` vem da projeção persistida da conta, não da claim potencialmente antiga. `email` é `null` quando ausente. O DTO não contém status, credential, hashes, digests, bloqueios, tentativas, versão, timestamps internos ou campos Prisma.

`isActive` não é exposto: o guard e as queries já rejeitam conta/banca inativa, logo o campo seria invariavelmente `true` em um `200`.

### D6. Guard autoritativo sem reutilização de entidades

O guard continua responsável por token, sessão, conta ativa, banca ativa e troca obrigatória. Ele não anexa `UserAccount` ou `Banca` ao request para reutilização/serialização pelo controller.

As queries do endpoint podem repetir leituras feitas pelo guard. Esse custo é aceito para preservar responsabilidades e obter uma projeção atual. Se conta ou banca mudar entre o guard e as queries, o caso de uso aplica a política pós-guard definida na categoria B; não retorna contexto parcial nem dados cross-tenant.

### D7. Taxonomia de falhas em três categorias

**Categoria A — rejeições do guard.** A rota preserva os códigos públicos já estabelecidos pelo `JwtCookieAuthGuard`:

- token inválido ou autenticação ausente: `401 INVALID_CREDENTIALS`;
- sessão revogada ou expirada: `401 SESSION_REVOKED`;
- conta ausente, inativa ou bloqueada: `401 ACCOUNT_INACTIVE`;
- banca ausente ou inativa: `401 BANCA_INACTIVE`;
- troca obrigatória de senha: `403 MUST_CHANGE_PASSWORD`.

O controller e o caso de uso não interceptam nem generalizam essas respostas.

**Categoria B — inconsistência de estado após o guard.** Conta ou banca que deixa de existir ou fica inativa entre o guard e a leitura, divergência de `bancaId`, projeção inesperadamente ausente ou outra corrida equivalente retorna `401 INVALID_CREDENTIALS`. A resposta não informa qual registro mudou e nunca contém dados parciais.

**Categoria C — falha técnica.** Erros de conexão, timeout, falha do Prisma, exceção inesperada ou falha equivalente em Query/adapters de Identity ou Tenancy mantêm uma representação técnica distinguível até a borda HTTP. Nessa borda, são registrados com contexto interno seguro e convertidos simetricamente em `500` com resposta externa genérica, sem código, mensagem, stack ou detalhe técnico da causa. Eles nunca são reclassificados como `400` ou `401`.

A distinção entre B e C nasce no contrato de Query/port: ausência esperada é representada separadamente de falha de execução. O adapter Tenancy não colapsa falha técnica em ausência, e o caso de uso não colapsa falha técnica em `INVALID_CREDENTIALS`. A tradução HTTP fica na borda já responsável por converter `Result`/falhas do caso de uso, seguindo a política centralizada existente sempre que ela suportar essa distinção; qualquer ajuste deve permanecer restrito ao necessário para este contrato.

**Alternativa rejeitada:** mapear toda falha para `401`. Isso oculta indisponibilidade do backend como problema de credencial, prejudica observabilidade e cria tratamento assimétrico entre Identity e Tenancy.

**Alternativa rejeitada:** usar `400` como fallback para falhas desconhecidas. Erros técnicos não representam entrada inválida do cliente.

### D8. JWT e frontend permanecem fora da mudança

Login e refresh continuam emitindo somente as application claims `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword`. Claims padrão do JWT gerenciadas pela biblioteca, como `iat` e `exp`, são permitidas e não violam esse contrato. Nome, e-mail, username, código e nome da banca nunca entram no token.

Depois que esta change estiver implementada e estável, uma change frontend separada definirá cliente, cache/view model e integração do shell. Isso não é tarefa necessária para concluir o backend.

## Risks / Trade-offs

- [Leituras repetidas após o guard] → Aceitar o custo inicial para manter guard, queries e controller desacoplados; medir antes de introduzir otimização.
- [Mudança de conta/banca entre guard e query] → Queries filtram pelo tenant e estado atual; ausência, inatividade ou divergência pós-guard vira `401 INVALID_CREDENTIALS` sem resposta parcial.
- [Falha técnica confundida com ausência] → Contratos e adapters preservam estados distintos; testes diretos e HTTP cobrem falhas técnicas de Identity e Tenancy.
- [Detalhe técnico exposto ao cliente] → A borda HTTP emite resposta `500` genérica e mantém causa, código interno e stack somente em logs seguros.
- [Política assimétrica entre módulos] → Os dois caminhos, Identity e Tenancy, atravessam a mesma taxonomia e possuem testes de mapeamento equivalentes.
- [Enumeração ou vazamento cross-tenant] → IDs vêm somente do `AuthContext`; query de conta usa `userId + bancaId`; o caso de uso confere o `bancaId` das projeções.
- [Acoplamento Identity–Tenancy] → Identity depende somente de port/DTO próprios; o adapter concreto conhece a query de Tenancy; nenhuma entidade cruza a fronteira.
- [Role da claim ficar desatualizada] → O DTO usa a projeção persistida. A autorização continua responsabilidade do guard/backend, não do valor exibido pelo Web.
- [Divergência de nomenclatura] → Tenancy mantém `nome`; somente a borda HTTP mapeia para `name`.
- [Churn por convenção estrutural] → Preservar contratos Query/CQRS semanticamente corretos e aplicar o padrão predominante de cada módulo a código novo.
- [Crescimento do DTO em um endpoint genérico] → Manter contrato mínimo; novos dados exigem requisito e ownership explícitos, não inclusão por conveniência.

## Migration Plan

1. Revisar contratos Query/CQRS e DTOs mínimos em Identity e Tenancy para distinguir ausência esperada de falha técnica.
2. Ajustar adapters e a integração Tenancy para preservar falhas técnicas até o caso de uso.
3. Aplicar a taxonomia A/B/C no caso de uso e na tradução HTTP de `GET /api/auth/me`, com logging interno seguro para a categoria C.
4. Manter a composição do `GetAuthenticatedUserContextUseCase` no `IdentityModule` e a proteção da rota no `IdentityController`.
5. Validar adapters diretamente, mapeamentos HTTP dos dois módulos, cenários E2E do guard e corridas pós-guard.
6. Decodificar tokens de login e refresh em testes para validar application claims, permitir `iat`/`exp` e impedir dados de exibição.
7. Executar unit, integração, e2e, lint, typecheck, build e validação OpenSpec estrita.
8. Atualizar a documentação arquitetural afetada.
9. Somente após o backend estar estável, criar a spec frontend consumidora.

Não há migração de dados ou schema. Rollback consiste em remover a rota, providers, adapters e contratos aditivos ou reverter os ajustes locais de política de erro; login, refresh, códigos do guard e a consulta pública por `codigoBanca` permanecem inalterados.

## Open Questions

Nenhuma. `Banca.nome` já é a fonte autoritativa, a consulta autenticada parte de `bancaId`, o contrato de sucesso não expõe `isActive`, a taxonomia de erros está definida, a estrutura Query/CQRS atual é uma adaptação local aceita e o frontend está fora de escopo.
