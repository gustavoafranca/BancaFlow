'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/shared/theme/theme-provider'

type SettingsNavItem = { href: string; label: string }

// Itens de Turnos, Configuração do Jogo, Segurança e Auditoria ficam de fora
// desta lista até cada capability existir de fato no Backend — per decisão
// de design (`standardize-frontend-drawer-and-settings-nav`): omitir da
// sidebar, não mostrar item levando a um placeholder que finge estar pronto
// (`settings-area-navigation`).
const SETTINGS_NAV: SettingsNavItem[] = [
  { href: '/configuracoes/usuarios', label: 'Usuários' },
  { href: '/configuracoes/perfis', label: 'Perfis de acesso' },
]

/**
 * Sidebar interna e fixa da área de Configurações — substitui a navegação
 * por `Tabs` de topo. Não é o menu principal da aplicação (`AppSidebar`);
 * vive dentro da área de conteúdo já deslocada por ele.
 */
export function SettingsSidebar() {
  const { c } = useTheme()
  const pathname = usePathname()

  return (
    <nav aria-label="Configurações" style={{ width: 200, flexShrink: 0, paddingRight: 20 }}>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 2, listStyle: 'none', margin: 0, padding: 0 }}>
        {SETTINGS_NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'block',
                  padding: '9px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? c.green : c.sub,
                  background: active ? c.glow : 'transparent',
                }}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
