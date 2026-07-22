import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { parseAccessToken } from '@/shared/session/parse-token'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'

// Proxy do Next.js 16 (substitui `middleware.ts`). Confirmado na doc local
// (`node_modules/next/dist/docs/.../file-conventions/proxy.md`): exporta uma
// função `proxy` + `config.matcher`, roda no runtime Node.js por padrão.
//
// Responsabilidade: verificação leve, ANTES da renderização, da presença/estado
// básico do cookie de access token. A validação criptográfica (assinatura,
// sessão ativa) permanece autoritativa no backend. O expiry NÃO é bloqueado
// aqui de propósito: o silent refresh (client) trata 401 rotacionando a sessão.

const CHANGE_PASSWORD_PATH = '/trocar-senha'
const LOGIN_PATH = '/login'
const DASHBOARD_PATH = '/dashboard'
const UNAVAILABLE_PATH = '/unavailable'

// Mesma env var que `next.config.ts` usa para o rewrite `/api/:path*` — lida
// aqui de novo (não importada de lá) porque `next.config.ts` não exporta a
// constante, só a usa dentro de `rewrites()`.
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:4000'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Host sem tenant válido (D6 do design.md de `review-web-frontend-
  // architecture`): consulta o endpoint público `GET /api/tenant-context`
  // (não enumerável — mesma resposta para inexistente/inativo/reservado/
  // formato inválido) ANTES de qualquer lógica de sessão, cobrindo `/`,
  // `/login` e as rotas privadas com o mesmo comportamento. Reescreve (não
  // redireciona) para manter a URL original e não vazar a existência da
  // página `/unavailable` (que fica fora do matcher, ver abaixo — visitável
  // diretamente sem exigir sessão).
  if (!(await isTenantAvailable(request))) {
    return NextResponse.rewrite(new URL(UNAVAILABLE_PATH, request.url))
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  // Sem cookie de sessão -> redireciona para o login (server-side, sem flash).
  // Isso agora também cobre `/trocar-senha`, que está no matcher: acesso
  // anônimo à tela de troca obrigatória não é permitido. EXCEÇÃO: o próprio
  // `/login` — agora que o matcher cobre todas as rotas (Fase 8), sem este
  // caso especial um usuário anônimo em `/login` seria "redirecionado" para
  // `/login` (mesmo destino da origem), um loop de verdade (o browser
  // re-solicita a mesma URL indefinidamente). `/login` sempre foi acessível
  // anonimamente — a própria página já cuida de afastar quem já tem sessão.
  if (!token) {
    if (pathname === LOGIN_PATH) {
      return NextResponse.next()
    }
    return redirect(request, LOGIN_PATH)
  }

  const claims = parseAccessToken(token)

  // Cookie presente porém ilegível -> trata como ausência de sessão.
  if (!claims) {
    if (pathname === LOGIN_PATH) {
      return NextResponse.next()
    }
    return redirect(request, LOGIN_PATH)
  }

  // `/trocar-senha` é caso especial: só faz sentido estar nela com sessão
  // válida E `mustChangePassword=true`. Com token e flag falsa, não há razão
  // para permanecer ali -> manda para `/dashboard` (fecha o loop nesse
  // sentido; o sentido contrário é tratado abaixo, para as demais rotas).
  if (pathname === CHANGE_PASSWORD_PATH) {
    if (claims.mustChangePassword) {
      return NextResponse.next()
    }
    return redirect(request, DASHBOARD_PATH)
  }

  // Troca obrigatória de senha pendente: força a tela dedicada nas demais rotas.
  if (claims.mustChangePassword) {
    return redirect(request, CHANGE_PASSWORD_PATH)
  }

  return NextResponse.next()
}

function redirect(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

// Falha técnica (rede/timeout/backend fora do ar) ou resposta não-2xx ->
// `true` (fail-open, D6 do design.md: sem o endpoint disponível, cai de volta
// no comportamento seguro da Opção 1 — deixa passar; a falha real de tenant
// já é fail-closed no backend em `POST /api/auth/login`). O objetivo aqui é
// só evitar que uma falha do endpoint novo derrube a aplicação inteira.
//
// SEGURANÇA (corrigido após revisão — SSRF, P1): o `Host` que o browser envia
// é entrada NÃO CONFIÁVEL. A versão anterior fazia `target.host = host`,
// usando esse valor como destino de rede do `fetch` — um `Host` como
// `127.0.0.1:4000` faria o servidor conectar num endereço interno arbitrário
// (SSRF), e um `Host` público sem porta poderia escapar do roteamento interno
// esperado. A conexão de rede AQUI é sempre para `BACKEND_INTERNAL_URL`
// (variável de ambiente controlada pelo operador, nunca por entrada do
// cliente) — o mesmo destino que `next.config.ts` já usa para o rewrite
// `/api/:path*`. O `Host` do browser só viaja como header `X-Forwarded-Host`,
// exatamente como uma chamada real do browser via login/`/api/*` já faria; o
// backend (`TenantResolverMiddleware`) só honra esse header sob a MESMA
// fronteira de confiança já estabelecida (`TRUST_PROXY_HOST` +
// `TRUSTED_PROXY_IPS`) — nenhuma trava nova precisa ser configurada.
async function isTenantAvailable(request: NextRequest): Promise<boolean> {
  try {
    const host = request.headers.get('host')
    const headers: HeadersInit = {}
    if (host) {
      headers['x-forwarded-host'] = host
    }
    const res = await fetch(`${BACKEND_INTERNAL_URL}/api/tenant-context`, {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) {
      return true
    }
    const body = (await res.json()) as { available?: boolean }
    return body.available === true
  } catch {
    return true
  }
}

// `/unavailable` fica FORA do matcher: é a página genérica de host
// indisponível, deve ser visitável diretamente sem exigir sessão. As demais
// exclusões são os caminhos que o Next já trata antes de rotas de página
// (`api`, assets estáticos, otimização de imagem, favicon) — mais qualquer
// arquivo estático servido de `public/` (`.*\..*`, ex.: `/design-imports/**`),
// já que nenhuma rota de página deste app usa ponto no pathname. Sem essa
// exclusão, o proxy intercepta a própria imagem (auth/redirect) e devolve
// HTML no lugar do binário — doc local confirma:
// `node_modules/next/dist/docs/.../file-conventions/proxy.md` ("Without a
// matcher, Proxy runs on every request, including... assets in the public/
// folder... otherwise auth logic or redirects can unintentionally block CSS,
// JS, or images from loading"). O route group `(private)` NÃO aparece na
// URL, então nunca é usado no matcher.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|unavailable|.*\\..*).*)',
  ],
}
