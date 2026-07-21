'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/shared/theme/theme-provider'
import {
  IconHome,
  IconUsers,
  IconShare,
  IconPlusCircle,
  IconClipboardCheck,
  IconAward,
  IconLogout,
} from '@/shared/components/icons'
import { useLogoutModal } from './logout-modal-provider'

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

type MenuItem = { href: string; label: string; Icon: IconType }

const MENU: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconHome },
  { href: '/cambistas', label: 'Cambistas', Icon: IconUsers },
  { href: '/pessoas', label: 'Pessoas e Vínculos', Icon: IconShare },
  { href: '/lancamentos', label: 'Lançamentos', Icon: IconPlusCircle },
  { href: '/acerto', label: 'Acerto', Icon: IconClipboardCheck },
  { href: '/premios', label: 'Prêmios e Reclamações', Icon: IconAward },
]

export function AppSidebar() {
  const { dark, c } = useTheme()
  const [hovered, setHovered] = useState(false)
  const pathname = usePathname()
  const { openLogoutModal } = useLogoutModal()

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: 0,
        top: 54,
        height: 'calc(100vh - 54px)',
        width: hovered ? 240 : 70,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        background: c.sbBg,
        borderRight: `1px solid ${c.sbBorder}`,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s',
        overflow: 'hidden',
        boxShadow: hovered
          ? dark
            ? '4px 0 24px rgba(0,0,0,0.5)'
            : '4px 0 20px rgba(0,0,0,0.15)'
          : 'none',
      }}
    >
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {MENU.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: hovered ? 12 : 0,
                justifyContent: hovered ? 'flex-start' : 'center',
                padding: hovered ? '10px 18px' : '10px 0',
                textDecoration: 'none',
                borderLeft: `3px solid ${active ? c.mActiveBorder : 'transparent'}`,
                background: active ? c.mActive : 'transparent',
                minHeight: 44,
                overflow: 'hidden',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  color: active ? c.mActiveText : c.mText,
                }}
              >
                <Icon size={18} />
              </span>
              {hovered && (
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 400,
                    color: active ? c.mActiveText : c.mText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div style={{ borderTop: `1px solid ${c.sbBorder}`, padding: '10px 0', flexShrink: 0 }}>
        <button
          type="button"
          title="Sair"
          onClick={() => openLogoutModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: hovered ? 12 : 0,
            justifyContent: hovered ? 'flex-start' : 'center',
            padding: hovered ? '10px 18px' : '10px 0',
            width: '100%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            minHeight: 44,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              flexShrink: 0,
              color: '#E05555',
            }}
          >
            <IconLogout size={18} />
          </span>
          {hovered && (
            <span style={{ fontSize: 13.5, fontWeight: 500, color: '#E05555', whiteSpace: 'nowrap' }}>
              Sair
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
