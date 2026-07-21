'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { logout, logoutAll } from '@/shared/api/auth.client'

export type LogoutAction = 'device' | 'all'

interface LogoutModalContextValue {
  open: boolean
  /** `null` quando nenhuma ação está em andamento; caso contrário, qual das duas — só o botão escolhido mostra loading. */
  processingAction: LogoutAction | null
  error: string | null
  openLogoutModal: () => void
  closeLogoutModal: () => void
  confirmLogout: (action: LogoutAction) => Promise<void>
}

const LogoutModalContext = createContext<LogoutModalContextValue | null>(null)

/**
 * Estado compartilhado do modal único de logout — consumido por
 * `app-navbar.tsx` e `app-sidebar.tsx`, de modo que os dois pontos de entrada
 * abram exatamente o mesmo modal/estado, nunca duas instâncias divergentes.
 * Nenhum dos dois chama `logout()`/`logoutAll()` diretamente; ambos apenas
 * `openLogoutModal()`.
 */
export function LogoutModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [processingAction, setProcessingAction] = useState<LogoutAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openLogoutModal = useCallback(() => {
    setError(null)
    setOpen(true)
  }, [])

  // Fechamento por Escape/clique fora é condicional: enquanto uma chamada de
  // logout está em andamento, o fechamento é ignorado — o `open` controlado
  // permanece `true` mesmo que o Radix tente disparar `onOpenChange(false)`.
  const closeLogoutModal = useCallback(() => {
    setOpen((current) => {
      if (processingAction) return current
      return false
    })
    if (!processingAction) setError(null)
  }, [processingAction])

  const confirmLogout = useCallback(
    async (action: LogoutAction) => {
      if (processingAction) return
      setProcessingAction(action)
      setError(null)
      const ok = action === 'device' ? await logout() : await logoutAll()
      setProcessingAction(null)
      if (ok) {
        setOpen(false)
        router.push('/login')
        return
      }
      setError('Não foi possível sair agora. Tente novamente.')
    },
    [processingAction, router],
  )

  return (
    <LogoutModalContext.Provider
      value={{ open, processingAction, error, openLogoutModal, closeLogoutModal, confirmLogout }}
    >
      {children}
    </LogoutModalContext.Provider>
  )
}

export function useLogoutModal(): LogoutModalContextValue {
  const ctx = useContext(LogoutModalContext)
  if (!ctx) {
    throw new Error('useLogoutModal deve ser usado dentro de um LogoutModalProvider')
  }
  return ctx
}
