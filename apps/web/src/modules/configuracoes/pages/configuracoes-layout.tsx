'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { useHasPermission } from '@/shared/session/use-permissions'
import { usePermissionsContext } from '@/shared/session/permissions-provider'
import { SettingsSidebar } from '../components/settings-sidebar'

/**
 * Layout da área de Configurações (`settings-area-navigation`): gate único
 * por `PermissionKey` (`identity.accounts.list`) para toda a área — Usuários
 * e Perfis de acesso partilham a mesma permissão hoje — mais a sidebar
 * interna fixa. Substitui o antigo `ConfiguracoesPage` monolítico com
 * `Tabs`; cada sub-rota (`/configuracoes/usuarios`, `/configuracoes/perfis`)
 * é uma página fina que só renderiza sua seção.
 */
export function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const { c } = useTheme()
  const { state: permissionsState } = usePermissionsContext()
  // Gate real por PermissionKey, nunca por papel bruto. Nesta versão, só
  // OWNER possui essa permissão — o acesso direto por URL de qualquer outro
  // papel cai no estado "sem permissão" abaixo, sem vazar dado algum (o
  // Backend já nega 403 nas chamadas reais).
  const canManageAccounts = useHasPermission('identity.accounts.list')

  if (permissionsState.status === 'loading') {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <div role="status" aria-live="polite" style={{ color: c.muted, fontSize: 13 }}>
          Carregando Configurações...
        </div>
      </div>
    )
  }

  if (!canManageAccounts) {
    return (
      <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: 300,
            background: c.card,
            border: `1px solid ${c.cardB}`,
            borderRadius: 20,
            padding: 40,
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: c.text, marginBottom: 10 }}>
            Você não tem permissão para acessar Configurações
          </h1>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.7, maxWidth: 420 }}>
            Apenas o Proprietário da banca administra usuários e consulta os perfis de acesso nesta versão.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 8 }}>
      <SettingsSidebar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  )
}
