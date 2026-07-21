import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseAccessToken } from '@/shared/session/parse-token'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'

// Rota raiz determinística: resolve o destino no servidor a partir do estado de
// sessão, antes de qualquer renderização, e sem servir conteúdo. Coerente com o
// `proxy.ts` e o layout `(private)` — o backend permanece autoritativo sobre
// sessão, conta e tenant. O `proxy.ts` já cobre `/` no matcher (host
// indisponível e os mesmos casos de sessão), mas mantém aqui o redirect final
// para `/dashboard` com sessão válida (caso que o proxy deixa passar). Não há
// loop: cada destino (`/login`, `/trocar-senha`, `/dashboard`) tem
// comportamento próprio que não volta para `/`.
export default async function RootPage(): Promise<never> {
  const cookieStore = await cookies()
  const claims = parseAccessToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value)

  if (!claims) {
    redirect('/login')
  }

  if (claims.mustChangePassword) {
    redirect('/trocar-senha')
  }

  redirect('/dashboard')
}
