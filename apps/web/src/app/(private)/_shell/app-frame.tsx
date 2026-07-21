'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { AppNavbar } from './app-navbar'
import { AppSidebar } from './app-sidebar'
import { LogoutModalProvider } from './logout-modal-provider'
import { LogoutModal } from './logout-modal'

// Casca da aplicação privada: navbar fixa + sidebar retrátil + área de conteúdo.
// O conteúdo é deslocado 70px (sidebar recolhida) e 54px (navbar), como no design.
export function AppFrame({ children }: { children: ReactNode }) {
  const { c } = useTheme()
  return (
    <LogoutModalProvider>
      <div
        style={{
          height: '100vh',
          fontFamily: "'Inter', system-ui, sans-serif",
          background: c.bg,
          color: c.text,
          overflow: 'hidden',
        }}
      >
        <AppNavbar />
        <AppSidebar />
        <div
          style={{
            marginLeft: 70,
            paddingTop: 54,
            height: '100vh',
            overflowY: 'auto',
            background: c.bg,
          }}
        >
          {children}
        </div>
        <LogoutModal />
      </div>
    </LogoutModalProvider>
  )
}
