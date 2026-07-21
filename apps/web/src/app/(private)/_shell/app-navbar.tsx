'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from '@/shared/theme/theme-provider'
import {
  IconBell,
  IconChevronDown,
  IconUser,
  IconGear,
  IconLogout,
} from '@/shared/components/icons'
import { ThemeToggle } from '@/shared/components/ui/theme-toggle'
import { useCurrentUser } from '@/shared/session/use-current-user'
import { useHasPermission } from '@/shared/session/use-permissions'
import { initials } from '@/shared/lib/format.util'
import { roleLabel } from '@/shared/lib/role.util'
import { useLogoutModal } from './logout-modal-provider'

export function AppNavbar() {
  const { dark, c, toggleTheme } = useTheme()
  const [profileOpen, setProfileOpen] = useState(false)
  const currentUser = useCurrentUser()
  const canManageAccounts = useHasPermission('identity.accounts.list')
  const { openLogoutModal } = useLogoutModal()

  const roundBtn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 'none',
    background: c.btn,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: c.sub,
    transition: 'color 0.15s',
  }

  // Contexto de exibição real (`GET /api/auth/me`) — nunca um placeholder
  // fabricado. Enquanto carrega ou em erro, os campos ficam vazios em vez de
  // exibir um nome/banca inventado (tarefa 7.3/29).
  const displayName = currentUser.status === 'success' ? currentUser.data.name : ''
  const displayEmail = currentUser.status === 'success' ? currentUser.data.email ?? '' : ''
  const displayRole = currentUser.status === 'success' ? roleLabel(currentUser.data.role) : ''
  const displayBanca = currentUser.status === 'success' ? currentUser.data.banca.name : ''
  const displayInitials = currentUser.status === 'success' ? initials(currentUser.data.name) : ''

  return (
    <>
      {profileOpen && (
        <div
          onClick={() => setProfileOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60 }}
        />
      )}

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px 0 0',
          background: c.navBg,
          borderBottom: `1px solid ${c.navBorder}`,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '0 18px 0 16px',
              flexShrink: 0,
            }}
          >
            <Image
              src="/design-imports/dashboard/logo.png"
              alt="BancaFlow"
              width={28}
              height={28}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(0,199,115,0.55))',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: c.text }}>Banca</span>
                <span style={{ color: c.green }}>Flow</span>
              </span>
              <span style={{ fontSize: 10, color: c.muted, letterSpacing: '0.04em', lineHeight: 1.2 }}>
                v 1.0.0
              </span>
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: c.navBorder, flexShrink: 0 }} />
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: c.text, lineHeight: 1.2 }}>
              {displayBanca}
            </span>
            <span style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.2 }}>Painel operacional</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />

          <div style={{ position: 'relative' }}>
            <button type="button" title="Notificações" style={roundBtn}>
              <IconBell size={16} />
            </button>
            <span
              style={{
                position: 'absolute',
                top: 1,
                right: 1,
                minWidth: 16,
                height: 16,
                background: c.green,
                borderRadius: 20,
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${c.navBg}`,
                pointerEvents: 'none',
                padding: '0 2px',
              }}
            >
              3
            </span>
          </div>

          <div style={{ width: 1, height: 22, background: c.navBorder, margin: '0 4px' }} />

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '4px 10px 4px 4px',
                borderRadius: 40,
                border: `1px solid ${c.navBorder}`,
                background: c.btn,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#005533,#00C773)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {displayInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: c.text,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {displayName}
                </span>
                <span style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                  {displayRole}
                </span>
              </div>
              <span style={{ color: c.sub, display: 'flex', alignItems: 'center' }}>
                <IconChevronDown size={13} />
              </span>
            </button>

            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 215,
                  background: c.dropdownBg,
                  border: `1px solid ${c.cardB}`,
                  borderRadius: 14,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${c.cardB}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 2 }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 11, color: c.muted }}>{displayEmail}</div>
                </div>
                <div style={{ padding: '6px 0' }}>
                  <DropdownItem
                    c={c}
                    icon={<IconUser size={16} />}
                    label="Meu Perfil"
                    href="/perfil"
                    onNavigate={() => setProfileOpen(false)}
                  />
                  {canManageAccounts && (
                    <DropdownItem
                      c={c}
                      icon={<IconGear size={16} />}
                      label="Configurações"
                      href="/configuracoes"
                      onNavigate={() => setProfileOpen(false)}
                    />
                  )}
                </div>
                <div style={{ padding: '6px 0', borderTop: `1px solid ${c.cardB}` }}>
                  <DropdownItem
                    c={c}
                    icon={<IconLogout size={16} />}
                    label="Sair"
                    danger
                    onClick={() => {
                      setProfileOpen(false)
                      openLogoutModal()
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}

function DropdownItem({
  c,
  icon,
  label,
  href,
  onNavigate,
  onClick,
  danger = false,
  disabled = false,
  disabledReason,
}: {
  c: ReturnType<typeof useTheme>['c']
  icon: React.ReactNode
  label: string
  href?: string
  onNavigate?: () => void
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  disabledReason?: string
}) {
  const content = (
    <>
      <span style={{ display: 'flex' }}>{icon}</span>
      {label}
    </>
  )

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        title={disabledReason}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          cursor: 'not-allowed',
          color: c.muted,
          fontSize: 13,
        }}
      >
        {content}
      </div>
    )
  }

  if (href) {
    return (
      <Link
        href={href}
        onNavigate={onNavigate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          cursor: 'pointer',
          color: danger ? '#E05555' : c.sub,
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        cursor: 'pointer',
        color: danger ? '#E05555' : c.sub,
        fontSize: 13,
      }}
    >
      {content}
    </div>
  )
}
