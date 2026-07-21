# Next.js App Router (versão instalada: 16.2.10)

`apps/web` usa Next.js **16.2.10** com App Router (`src/app`). Esta versão renomeou `middleware.ts` para **`proxy.ts`** — não escrever `middleware.ts`, não seguir tutoriais que ainda usam esse nome. Antes de qualquer mudança de proxy/matcher, confirmar a versão real com `grep '"next"' apps/web/package.json` — se um projeto futuro tiver atualizado, revisar `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` local antes de aplicar esta referência.

## Pages e layouts

- `app/**/page.tsx` é sempre um Server Component fino: importa e renderiza um componente de `modules/<domain>` (ou `_components` locais) e retorna.
- Layouts (`app/layout.tsx`, `app/(private)/layout.tsx`) concentram providers e casca visual — não lógica de feature.
- O projeto usa dois grupos de rota: `app/(private)/**` (autenticado, dentro do `AppFrame`) e rotas soltas (`app/login`, `app/trocar-senha`, `app/unavailable`) fora de qualquer grupo autenticado. Route groups (`(private)`) não aparecem na URL — nunca usar o nome do grupo no matcher do proxy.

## `proxy.ts` e matcher

Arquivo real: `apps/web/src/proxy.ts`. Pontos obrigatórios ao alterar:

- Exporta uma função `proxy` (ou default) recebendo `NextRequest`, e um `export const config = { matcher: [...] }`.
- O `matcher` deve ser uma constante estática (analisada em build-time) — não montar o array dinamicamente a partir de uma variável.
- Padrão de negative matching já usado no projeto: `'/((?!api|_next/static|_next/image|favicon.ico|unavailable).*)'` — exclui rotas de API, assets estáticos, otimização de imagem e a própria página `/unavailable` (que precisa ser visitável sem sessão).
- Ao adicionar uma nova rota **pública** que não deve passar pela checagem de sessão (como `/unavailable`), adicioná-la à exclusão do matcher — não deixar a lógica interna do proxy "abrir uma exceção" silenciosa sem refletir isso no matcher/comentário.
- Ao adicionar uma nova rota **privada**, nada precisa mudar no matcher (ele já cobre "tudo exceto exclusões") — mas revisar se a nova rota precisa de alguma guard clause específica (ex.: uma tela que só faz sentido com uma flag de sessão).
- O proxy roda no runtime Node.js por padrão nesta versão (não é possível configurar `runtime` no arquivo de proxy).

### Ordem de decisão dentro do proxy (padrão do projeto)

1. Tenant disponível? (`GET /api/tenant-context`, fail-open em erro técnico) → se não, rewrite para `/unavailable`.
2. Cookie de sessão presente e decodificável? → se não, redirect para `/login` (exceto o próprio `/login`, que deixa passar — sem essa exceção, um usuário anônimo em `/login` cai num loop de redirect para si mesmo).
3. `mustChangePassword` true? → força `/trocar-senha` (exceto se já estiver lá); em `/trocar-senha` com a flag false, redireciona para `/dashboard`.
4. Caso contrário, `NextResponse.next()`.

Qualquer nova regra de guard deve ser inserida respeitando essa ordem e sem reabrir os loops que os comentários no arquivo já descrevem — ler `apps/web/src/proxy.ts` inteiro (incluindo os comentários) antes de editar.

### Segurança: `Host` não é confiável

O `Host` recebido do browser é entrada não confiável — nunca usá-lo como destino de rede de um `fetch` dentro do proxy (isso é SSRF). O destino de rede é sempre `BACKEND_INTERNAL_URL` (variável de ambiente); o `Host` do browser só viaja como header `X-Forwarded-Host` para o backend resolver o tenant, dentro da mesma fronteira de confiança que `TenantResolverMiddleware`/`TRUST_PROXY_HOST` já estabelece no backend.

## Redirects

- Usar `redirect()` de `next/navigation` dentro de Server Components (layouts/pages) para redirects que dependem de estado só disponível no servidor (ex.: `apps/web/src/app/(private)/layout.tsx` verifica o cookie de sessão de novo como defesa em profundidade, mesmo com o proxy já tendo feito o primeiro redirect).
- Usar `NextResponse.redirect`/`NextResponse.rewrite` dentro do `proxy.ts`.
- Preferir `rewrite` (não `redirect`) quando o objetivo é não vazar a existência de uma rota nem mudar a URL visível (caso do `/unavailable`).

## `loading.tsx` / `error.tsx` / `not-found.tsx`

O projeto ainda não usa esses arquivos de convenção. Ao introduzir um fluxo com carregamento assíncrono relevante (ex.: uma listagem que busca dados no servidor), considerar:

- `app/**/loading.tsx`: fallback de Suspense automático para a rota — usar para um skeleton/spinner simples, não para lógica de negócio.
- `app/**/error.tsx`: precisa ser Client Component (`'use client'`) por contrato do Next — captura erros de renderização da árvore da rota; usar para um estado de erro genérico, nunca para mascarar um erro que deveria ser tratado explicitamente no componente/hook.
- `app/**/not-found.tsx`: usado com `notFound()` de `next/navigation` para recursos que não existem (ex.: um registro por id).

Só adicionar esses arquivos quando o fluxo realmente precisar — não criar como boilerplate "por completude".

## Autenticação

- Sessão via cookies HttpOnly emitidos pelo backend (`ACCESS_TOKEN_COOKIE`); o Web nunca lê o token diretamente para fins de autorização, só decodifica claims não sensíveis (`parseAccessToken`) para decisões de roteamento (ex.: `mustChangePassword`).
- Toda chamada ao backend usa `credentials: 'include'`; chamadas autenticadas passam por `fetchWithRefresh` (`shared/session/refresh-on-expire.ts`), que trata 401 rotacionando a sessão via silent refresh.
- Nunca enviar `tenantId`/`codigoBanca` no body de uma chamada autenticada esperando que ele seja tratado como autoridade — o backend resolve o tenant pelo host/subdomínio.
- `GET /api/auth/me` é a fonte de dados de exibição do usuário atual (nome, papel, banca) — nunca fabricar esses dados no client; se a chamada falhar, tratar como ausência, não como placeholder.
