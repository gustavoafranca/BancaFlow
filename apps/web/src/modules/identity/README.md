# Identity no Web

## Responsabilidade e limite

Esta documentação descreve a experiência de autenticação do BancaFlow no Web: entrada do usuário, navegação condicionada pela sessão, troca obrigatória de senha e chamadas ao contrato HTTP de Identity. O Web oferece feedback e direciona a navegação, mas **não decide** se uma credencial, sessão, conta ou banca é válida. O backend continua autoritativo.

No MVP, [`src/modules/identity`](./) é apenas um placeholder: sua rota `/identity` exibe um dashboard estático. A experiência real está em [`app/login`](../../app/login), [`app/trocar-senha`](../../app/trocar-senha), [`shared/api`](../../shared/api) e [`shared/session`](../../shared/session). As regras de negócio pertencem ao [domínio de Identity](../../../../../modules/identity/README.md), e endpoints, cookies e validações autoritativas pertencem ao [backend de Identity](../../../../backend/src/modules/identity/README.md). Este README é a fonte canônica para o comportamento do Web.

## Estrutura atual

```text
apps/web/src/
├── app/
│   ├── login/                    # tela pública, formulário e schema de login
│   ├── trocar-senha/             # fluxo condicional de troca obrigatória
│   └── (private)/
│       ├── layout.tsx            # defesa em profundidade no servidor
│       └── identity/page.tsx     # entrada do placeholder /identity
├── modules/identity/
│   ├── components/               # dashboard estático do placeholder
│   ├── data/                     # reservado; atualmente vazio
│   └── pages/                    # composição do dashboard estático
├── shared/
│   ├── api/auth.client.ts        # cliente HTTP de Identity
│   ├── form/validator.ts         # resolver do React Hook Form
│   └── session/                  # claims e silent refresh
└── proxy.ts                      # redirects antes da renderização no Next 16
```

`app/page.tsx` (`/`) resolve a rota raiz por sessão (redireciona para `/login`, `/trocar-senha` ou `/dashboard`); não faz parte da experiência de Identity do MVP.

## Login e contexto da banca

A rota [`/login`](../../app/login/page.tsx) interpreta `?expired=1`. Quando presente, a tela avisa que a sessão expirou; o aviso desaparece na próxima tentativa. O formulário em [`login-form.tsx`](../../app/login/_components/login-form.tsx) usa React Hook Form com o resolver `v` e representa:

- carregamento: `isSubmitting` desabilita o botão e mostra `Entrando...`;
- erro de campo: mensagem ligada ao input com `aria-describedby` e `role="alert"`;
- erro da chamada: mensagem genérica ou aviso específico de bloqueio;
- sucesso: navegação para `/trocar-senha` se `mustChangePassword=true`, ou `/dashboard`, seguida de `router.refresh()`.

O schema [`login.schema.ts`](../../app/login/_components/login.schema.ts) valida:

| Campo | Validação no Web |
| --- | --- |
| `username` | `trim`, mínimo de 3 caracteres e regex `^[a-zA-Z0-9._-]+$` |
| `password` | string não vazia, sem normalização |

Isso dá feedback rápido, mas não substitui as regras do backend. O corpo enviado é exatamente `{ username, password }`: não há `bancaId` ou `codigoBanca`, pois o backend resolve a banca pelo host/subdomínio. O cliente converte `invalid_credentials` e `invalid_banca` na mesma mensagem — “Usuário ou senha inválidos.” — para não revelar a existência de conta ou banca. `account_locked` recebe mensagem própria; falhas inesperadas recebem mensagem operacional genérica.

## Cliente HTTP e cookies

[`auth.client.ts`](../../shared/api/auth.client.ts) usa caminhos same-origin sob `/api/auth`:

| Função | Método e rota | Uso no MVP |
| --- | --- | --- |
| `login` | `POST /api/auth/login` | conectada à tela de login |
| `refresh` | `POST /api/auth/refresh` | suporte direto exportado, sem chamada pela UI |
| `logout` | `POST /api/auth/logout` | suporte presente, sem UI conectada |
| `logoutAll` | `POST /api/auth/logout-all` | suporte presente, sem UI conectada |
| `changePassword` | `PATCH /api/auth/password` | fluxo voluntário disponível, sem UI no MVP |
| `mandatoryPasswordChange` | `PATCH /api/auth/mandatory-password-change` | conectada a `/trocar-senha` |

As chamadas usam `credentials: 'include'` diretamente ou via `fetchWithRefresh`, permitindo ao navegador enviar e aceitar os cookies emitidos pelo backend. Os tokens ficam em cookies HttpOnly: JavaScript no browser não lê seus valores nem usa `localStorage`. O access token só recebe parse leve no servidor, em `proxy.ts` e no layout privado, para navegação; assinatura, expiração efetiva e estado persistido da sessão são revalidados pelo backend.

## Silent refresh

[`refresh-on-expire.ts`](../../shared/session/refresh-on-expire.ts) implementa `fetchWithRefresh`:

1. executa a requisição original com cookies;
2. se a resposta não for `401`, retorna sem refresh;
3. em `401`, chama `POST /api/auth/refresh` uma vez;
4. em sucesso, repete a requisição original **uma única vez**;
5. se o refresh falhar, ou se o retry ainda devolver `401`, redireciona para `/login?expired=1` no browser.

`refreshSession` mantém uma Promise em `inFlight`. Chamadas concorrentes aguardam o mesmo refresh em vez de iniciar várias rotações. Esse coalescing reduz corridas no cliente; a rotação e sua concorrência continuam autoritativas no backend.

## `proxy.ts` no Next.js 16

Este projeto usa [`src/proxy.ts`](../../proxy.ts), **não** `middleware.ts`. No Next.js 16, `middleware` foi depreciado e renomeado para `proxy`; veja também [`apps/web/AGENTS.md`](../../../AGENTS.md).

O proxy faz apenas parse leve das claims do cookie `access_token`. Ele não valida assinatura nem consulta a sessão no banco.

| Situação | Destino/comportamento |
| --- | --- |
| Sem cookie, ou token ilegível, em rota coberta | redireciona para `/login` |
| `mustChangePassword=true` fora de `/trocar-senha` | redireciona para `/trocar-senha` |
| `mustChangePassword=true` em `/trocar-senha` | permite continuar |
| `mustChangePassword=false` em `/trocar-senha` | redireciona para `/dashboard` |
| `mustChangePassword=false` em outra rota coberta | permite continuar |

O caso especial fecha o loop nos dois sentidos. `/trocar-senha` fica fora de `(private)` porque o layout privado redireciona `mustChangePassword=true` para ela; colocá-la dentro desse layout criaria uma barreira circular. Ela não é pública: o proxy inclui a rota no matcher e rejeita acesso anônimo.

O matcher contém URLs reais, pois `(private)` é um route group e não aparece no endereço:

```text
/dashboard/:path*  /acerto/:path*       /cambistas/:path*
/configuracoes/:path*  /identity/:path* /lancamentos/:path*
/perfil/:path*     /pessoas/:path*      /premios/:path*
/trocar-senha
```

Uma nova rota privada precisa ser incluída explicitamente no matcher.

## Fluxos de senha

### Troca obrigatória

[`ChangePasswordForm`](../../app/trocar-senha/change-password-form.tsx) coleta `newPassword` e `confirmPassword`. O schema local exige ao menos 8 caracteres, maiúscula, minúscula, número e símbolo, além da igualdade dos campos. Somente `{ newPassword }` atravessa a fronteira HTTP; `confirmPassword` serve apenas à UI.

O formulário chama `mandatoryPasswordChange({ newPassword })`. A autorização vem da sessão e da flag persistida, nunca de um booleano enviado pelo cliente. Em sucesso, o backend reemite o access token com `mustChangePassword=false` via `Set-Cookie` na mesma resposta. A tela então navega para `/dashboard` e executa `router.refresh()`, mas **não** chama `refresh()` manualmente.

Durante a submissão, o botão fica desabilitado e mostra `Salvando...`. Senha rejeitada mostra mensagem genérica de requisitos; falha inesperada pede nova tentativa; sucesso navega ao dashboard.

### Troca voluntária

`changePassword({ currentPassword, newPassword })` atende ao endpoint voluntário e exige a senha atual. O suporte existe no cliente, mas não há tela ou ação conectada no MVP. Não reutilize a tela obrigatória: contratos e condições de autorização são diferentes.

## Rewrite para o backend

[`next.config.ts`](../../../next.config.ts) reescreve `/api/:path*` para `${BACKEND_INTERNAL_URL}/api/:path*`; sem variável, usa `http://localhost:4000`. O browser continua chamando caminhos same-origin, simplificando cookies e ocultando a topologia interna.

Em desenvolvimento/Docker, o Next funciona como proxy HTTP e preserva o host encaminhado, necessário para o backend derivar `codigoBanca`. Em produção, o reverse proxy publica `/api` no mesmo origin da banca e deve preservar `Host`/`X-Forwarded-Host`. A confiança nesse header e a allowlist do proxy são responsabilidades do backend/infraestrutura. `BACKEND_INTERNAL_URL` deve conter apenas uma URL interna, nunca credenciais.

## Rotas relacionadas a Identity

| Categoria | Rota | Proteção e finalidade |
| --- | --- | --- |
| Pública | `/login` | fora do matcher; envia credenciais e recebe cookies |
| Condicional | `/trocar-senha` | exige cookie legível e `mustChangePassword=true` |
| Privada | `/dashboard` | proxy + layout `(private)` |
| Privada | `/identity` | proxy + layout; placeholder estático no MVP |
| Privadas | `/acerto`, `/cambistas`, `/configuracoes`, `/lancamentos`, `/perfil`, `/pessoas`, `/premios` | proxy + layout `(private)` |
| Fora da vertical | `/` | página inicial padrão, sem proteção de Identity no MVP |

[`(private)/layout.tsx`](../../app/%28private%29/layout.tsx) relê o cookie no servidor e redireciona quando as claims estão ausentes ou indicam troca obrigatória. É defesa em profundidade contra renderização indevida, não autorização completa. Toda operação sensível recebe a decisão final do backend.

## Estados e símbolos sem UI

Os fluxos conectados exibem loading, erros de validação, erros operacionais e navegação de sucesso. Ainda não há tela global de sessão nem feedback visual de logout.

Suporte exportado sem UI conectada no MVP:

- `changePassword`, `logout`, `logoutAll` e `refresh`, em `auth.client.ts`;
- `isTokenExpired`, em [`parse-token.ts`](../../shared/session/parse-token.ts); o proxy não bloqueia por `exp`, pois o `401` autoritativo dispara silent refresh;
- `REFRESH_TOKEN_COOKIE`, em [`session.types.ts`](../../shared/session/session.types.ts); o browser o transporta, mas o Web não lê seu valor.

Esses símbolos não significam que o fluxo de produto esteja entregue. Ao conectá-los, adicione UI, estados acessíveis e testes sem mover decisões do backend para o frontend.

## Como testar

Na raiz:

```bash
npm run test -w apps/web
npm run build -w apps/web
```

O Jest usa `next/jest`, Testing Library e `jsdom` por padrão, com ambiente Node explícito onde os objetos Web Fetch reais são necessários.

| Spec | O que prova |
| --- | --- |
| [`src/proxy.spec.ts`](../../proxy.spec.ts) | anônimo, token ilegível, troca obrigatória, acesso normal e prevenção de loop |
| [`change-password-form.spec.tsx`](../../app/trocar-senha/change-password-form.spec.tsx) | schema, body só com `newPassword`, mensagens e navegação |
| [`refresh-on-expire.spec.ts`](../../shared/session/refresh-on-expire.spec.ts) | retry único, redirect em falha, ausência de refresh desnecessário e coalescing |
| [`next.config.spec.ts`](../../../next.config.spec.ts) | destino default e override de `BACKEND_INTERNAL_URL` |

Para verificar multi-tenancy localmente, suba backend e Web, acesse o Web por um hostname de desenvolvimento com subdomínio configurado para resolução local e confirme que `/api/auth/login` chega ao backend com o host esperado. Use apenas contas locais; não copie senhas, cookies ou tokens para documentação ou logs compartilhados.

## Erros comuns ao evoluir este módulo

- Criar `middleware.ts`; no Next 16 deste projeto, altere `proxy.ts`.
- Colocar `/trocar-senha` dentro de `(private)` e provocar loop.
- Criar página privada e esquecer sua URL real no `config.matcher`.
- Tratar parse local do JWT como validação de assinatura/autorização.
- Ler tokens no browser, usar `localStorage` ou omitir `credentials: 'include'`.
- Enviar `bancaId`, `codigoBanca` ou `mustChangePassword` como autoridade no body.
- Tentar refresh repetidamente, inclusive depois do retry.
- Diferenciar banca inexistente de credencial inválida na mensagem.
- Confiar na validação do componente como regra final do negócio.
- Assumir que funções exportadas sem tela já são funcionalidades completas.

## Checklist para adicionar uma nova tela autenticada

- [ ] Criar a rota em `app/(private)` quando ela exigir sessão normal.
- [ ] Incluir a URL real no matcher e testar anônimo, troca obrigatória e acesso normal.
- [ ] Reaproveitar o layout privado; não duplicar redirects em cada página.
- [ ] Chamar o backend por `/api/**`, usando `fetchWithRefresh` quando exigir access token.
- [ ] Manter `credentials: 'include'` e nunca persistir tokens no browser.
- [ ] Modelar loading, erro e sucesso com feedback acessível e sem vazamento de informação.
- [ ] Validar formato para UX, mantendo autenticação, tenant e invariantes no backend.
- [ ] Adicionar testes e atualizar a tabela de rotas e esta documentação.
- [ ] Verificar sessão ausente, expirada, válida e com `mustChangePassword=true`.
