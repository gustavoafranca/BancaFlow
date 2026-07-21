import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginLayout } from './_components/login-layout'
import { parseAccessToken } from '@/shared/session/parse-token'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const expired = params?.expired === '1'

  // `expired=1` é o sinal do silent refresh (client) de que a sessão já foi
  // considerada inválida no backend (que limpa os cookies nessa falha — ver
  // `IdentityController.refresh`). NÃO reavaliamos um access token nessa
  // condição: um cookie remanescente nesta requisição específica (corrida
  // entre abas, cache, etc.) ainda pareceria "parseável" e nos devolveria
  // para `/dashboard`, criando um loop entre `/login?expired=1` e
  // `/dashboard`. Fora desse caso, usuário já autenticado não deve
  // permanecer no login: redireciona conforme o estado de troca obrigatória,
  // sem loop (o destino não volta para `/login`).
  if (!expired) {
    const cookieStore = await cookies()
    const claims = parseAccessToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value)
    if (claims) {
      redirect(claims.mustChangePassword ? '/trocar-senha' : '/dashboard')
    }
  }

  return <LoginLayout expired={expired} />
}
