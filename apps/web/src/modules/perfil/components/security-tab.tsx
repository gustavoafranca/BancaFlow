'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/dialog'
import { useSessions } from '../hooks/use-sessions'
import { deviceLabelFrom } from '../lib/device-label'
import { IcoMonitor, IcoSmartphone, IcoDeviceUnknown } from './icons'
import { SecurityPasswordForm } from './security-password-form'

function deviceIcon(kind: ReturnType<typeof deviceLabelFrom>['kind']) {
  if (kind === 'mobile') return IcoSmartphone
  if (kind === 'desktop') return IcoMonitor
  return IcoDeviceUnknown
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function SecurityTab() {
  const { c } = useTheme()
  const { state, refetch, revoke } = useSessions()
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const revokeErrorRef = useRef<HTMLDivElement>(null)

  // Move o foco para o alerta de erro de revogação assim que ele aparece.
  useEffect(() => {
    if (revokeError) {
      revokeErrorRef.current?.focus()
    }
  }, [revokeError])

  const secCard: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.cardB}`,
    borderRadius: 16,
    padding: 24,
  }
  const secIconBox: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 11,
    background: c.glow,
    border: `1px solid ${c.glowB}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: c.green,
    flexShrink: 0,
  }
  const deviceIconBox: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: c.card,
    border: `1px solid ${c.cardB}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: c.sub,
    flexShrink: 0,
  }
  const statPill = (bg: string, color: string): React.CSSProperties => ({
    fontSize: 11.5,
    padding: '3px 11px',
    borderRadius: 20,
    fontWeight: 500,
    background: bg,
    color,
  })

  async function handleConfirmRevoke() {
    if (!pendingSessionId) return
    setRevoking(true)
    setRevokeError(null)
    const outcome = await revoke(pendingSessionId)
    setRevoking(false)
    setPendingSessionId(null)
    if (outcome === 'unauthenticated' || outcome === 'error') {
      setRevokeError('Não foi possível encerrar a sessão agora. Tente novamente.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SecurityPasswordForm onSuccess={() => void refetch()} />

      <div style={secCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={secIconBox}>{IcoMonitor}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 2 }}>Sessões Ativas</div>
            <div style={{ fontSize: 12, color: c.muted }}>Gerencie os dispositivos conectados à sua conta.</div>
          </div>
        </div>

        {state.status === 'loading' && (
          <div role="status" aria-live="polite" style={{ color: c.muted, fontSize: 13 }}>
            Carregando sessões...
          </div>
        )}

        {state.status === 'error' && (
          <div
            role="alert"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: '#E05555', fontSize: 13 }}
          >
            <span>Não foi possível carregar suas sessões agora.</span>
            <button
              type="button"
              onClick={() => void refetch()}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(224,85,85,0.4)',
                background: 'transparent',
                color: '#E05555',
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <>
            {revokeError && (
              <div
                ref={revokeErrorRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                style={{
                  marginBottom: 14,
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 500,
                  outline: 'none',
                  background: 'rgba(224,85,85,0.1)',
                  color: '#E05555',
                  border: '1px solid rgba(224,85,85,0.3)',
                }}
              >
                {revokeError}
              </div>
            )}

            {state.data.map((session) => {
              const device = deviceLabelFrom(session.deviceInfo)
              return (
                <div
                  key={session.sessionId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: `1px solid ${c.cardBL}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={deviceIconBox}>{deviceIcon(device.kind)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: c.text, marginBottom: 3 }}>{device.label}</div>
                      <div style={{ fontSize: 11.5, color: c.muted }}>
                        Criada em {formatDate(session.createdAt)} · expira em {formatDate(session.expiresAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {session.isCurrent ? (
                      <span style={statPill(c.glow, c.green)}>Sessão atual</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingSessionId(session.sessionId)}
                        style={{
                          fontSize: 12,
                          color: '#E05555',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontWeight: 500,
                          padding: 0,
                        }}
                      >
                        Encerrar sessão
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {state.data.length === 1 && (
              <div style={{ padding: '14px 0', color: c.muted, fontSize: 12.5 }}>
                Nenhuma outra sessão ativa além desta.
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={pendingSessionId !== null} onOpenChange={(open) => !open && setPendingSessionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar sessão</DialogTitle>
            <DialogDescription>
              Essa sessão será desconectada imediatamente e precisará de um novo login para acessar a conta novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: `1px solid ${c.cardB}`,
                  background: 'transparent',
                  color: c.sub,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={() => void handleConfirmRevoke()}
              disabled={revoking}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#E05555',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: revoking ? 0.7 : 1,
              }}
            >
              {revoking ? 'Encerrando...' : 'Encerrar sessão'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
