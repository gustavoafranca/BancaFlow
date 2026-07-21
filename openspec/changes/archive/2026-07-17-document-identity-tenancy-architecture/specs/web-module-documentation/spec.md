## ADDED Requirements

### Requirement: README de web existe e mapeia a experiência de Identity

O sistema de documentação SHALL prover `apps/web/src/modules/identity/README.md` e atualizar `apps/web/README.md` como índice/porta de entrada, explicando a estrutura de `components`, `data` e `pages` e registrando que a lógica real de Identity vive em `app/login`, `app/trocar-senha`, `shared/api` e `shared/session` (o `modules/identity` é placeholder no MVP).

#### Scenario: README de web abre pela responsabilidade e estrutura

- **WHEN** um leitor abre `apps/web/src/modules/identity/README.md`
- **THEN** encontra a estrutura de pastas comentada e onde a lógica real de Identity reside
- **AND** `apps/web/README.md` aponta para essa documentação

#### Scenario: Placeholder registrado como tal

- **WHEN** a documentação descreve `modules/identity` do web
- **THEN** registra explicitamente que é um placeholder (dashboard estático) e que a implementação está em `app/**` e `shared/**`

### Requirement: Login e contexto de banca documentados

A documentação de web SHALL explicar a tela e o formulário de login (campos, validações, tratamento de erros) e por que o usuário informa apenas `username` e senha, com a banca vindo do subdomínio.

#### Scenario: Banca vem do subdomínio, não do formulário

- **WHEN** um leitor pergunta por que não há campo de banca no login
- **THEN** a documentação explica que o backend resolve a banca a partir do host/subdomínio e que o corpo do login carrega apenas `{ username, password }`

#### Scenario: Erros de login mapeados para mensagens genéricas

- **WHEN** a documentação descreve o tratamento de erros do login
- **THEN** registra que `invalid_credentials` e `invalid_banca` exibem a mesma mensagem genérica (não revela existência de conta/banca) e que `account_locked` tem mensagem própria

### Requirement: Cliente HTTP, cookies e silent refresh documentados

A documentação de web SHALL descrever o cliente HTTP (`auth.client.ts`), o uso de cookies HttpOnly, `credentials: 'include'` e a política de silent refresh com coalescing (`refresh-on-expire.ts`).

#### Scenario: Silent refresh explicado

- **WHEN** um leitor consulta o comportamento em `401`
- **THEN** a documentação descreve `fetchWithRefresh` (tenta refresh uma vez, retenta a requisição, redireciona para `/login?expired=1` em falha) e o coalescing de chamadas concorrentes

#### Scenario: Símbolos presentes sem UI são registrados

- **WHEN** a documentação lista os métodos do cliente
- **THEN** registra que `changePassword` (voluntário), `logout`, `logoutAll` e `refresh` existem mas não estão conectados a UI no MVP

### Requirement: proxy.ts e regras de navegação documentados

A documentação de web SHALL explicar `proxy.ts` (Next 16, não `middleware.ts`) e as regras de navegação para visitante anônimo, usuário autenticado e `mustChangePassword=true`, incluindo a prevenção de loops de redirecionamento e a lista do matcher.

#### Scenario: Regras de redirecionamento sem loop

- **WHEN** um leitor consulta as regras do proxy
- **THEN** encontra: sem cookie → `/login`; `mustChangePassword=true` fora de `/trocar-senha` → `/trocar-senha`; `mustChangePassword=false` em `/trocar-senha` → `/dashboard`
- **AND** a documentação explica por que `/trocar-senha` fica fora do grupo `(private)` e como o loop é evitado

#### Scenario: proxy.ts registrado como escolha do Next 16

- **WHEN** a documentação menciona o arquivo
- **THEN** registra que é `proxy.ts` (não `middleware.ts`), por ser o Next.js 16 modificado deste projeto

### Requirement: Fluxos de senha, rewrites e rotas documentados

A documentação de web SHALL explicar os fluxos de troca voluntária e obrigatória de senha, o rewrite `/api/:path*` para o backend em desenvolvimento e same-origin em produção, e conter uma tabela de rotas públicas e privadas relacionadas ao Identity.

#### Scenario: Troca obrigatória vs. voluntária distinguida

- **WHEN** um leitor consulta os fluxos de senha
- **THEN** a documentação registra que a tela `/trocar-senha` chama `mandatoryPasswordChange({ newPassword })` e que o backend reemite o access token via `Set-Cookie` na mesma resposta (sem `refresh()` manual)
- **AND** registra que o fluxo voluntário (`changePassword`, exige `currentPassword`) tem suporte no cliente mas não tem UI no MVP

#### Scenario: Rewrite e preservação de host explicados

- **WHEN** a documentação descreve `next.config.ts`
- **THEN** explica o rewrite `/api/:path*` → `BACKEND_INTERNAL_URL` (default `http://localhost:4000`) e que o `Host`/`X-Forwarded-Host` é preservado para resolução de tenant

#### Scenario: Tabela de rotas públicas/privadas presente

- **WHEN** um leitor procura quais rotas exigem autenticação
- **THEN** encontra uma tabela distinguindo rotas públicas (`/login`), condicionais (`/trocar-senha`) e privadas (grupo `(private)`)

### Requirement: Estados de UI, testes e guia de extensão documentados

A documentação de web SHALL descrever estados de carregamento, erro e sucesso relevantes, como testar forms/proxy/cliente HTTP/integração local por subdomínio, e como adicionar uma nova tela autenticada sem duplicar regra do backend.

#### Scenario: Como testar o frontend

- **WHEN** um leitor quer rodar os testes do web
- **THEN** encontra a configuração Jest + Testing Library e a lista de specs (proxy, formulário de troca, `fetchWithRefresh`, `next.config`) com o que cada um cobre

#### Scenario: Guia para nova tela autenticada

- **WHEN** um leitor quer adicionar uma nova tela privada
- **THEN** encontra um checklist que preserva o backend como autoridade e reaproveita `proxy.ts`/layout do grupo `(private)`
