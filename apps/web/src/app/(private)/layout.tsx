import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { AppFrame } from './_shell/app-frame'
import { parseAccessToken, toSession } from '@/shared/session/parse-token'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { PermissionsProvider } from '@/shared/session/permissions-provider'

// Layout do grupo de rotas privadas. Confirma a sessão no servidor antes de
// renderizar (defesa em profundidade — o proxy faz o redirect inicial e o
// backend permanece autoritativo). Aplica o tema e a casca (navbar + sidebar).
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const claims = parseAccessToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value)

  if (!claims) {
    redirect('/login')
  }

  if (claims.mustChangePassword) {
    redirect('/trocar-senha')
  }

  // `session` fica disponível para futura propagação via contexto/props.
  void toSession(claims)

  return (
    <ThemeProvider>
      <CurrentUserProvider>
        <PermissionsProvider>
          <AppFrame>{children}</AppFrame>
        </PermissionsProvider>
      </CurrentUserProvider>
    </ThemeProvider>
  )
}
