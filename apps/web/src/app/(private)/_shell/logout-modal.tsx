'use client'

import { useRef } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { IconLogout } from '@/shared/components/icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { useLogoutModal } from './logout-modal-provider'

/**
 * Modal único de logout (decisão D5, `refine-tenant-user-administration-experience`):
 * hierarquia visual clara entre a ação principal recomendada ("Sair deste
 * dispositivo") e a ação sensível secundária ("Sair de todos os
 * dispositivos", `Button variant="destructive"`), com descrição curta por
 * opção. Foco inicial no controle seguro (Cancelar), devolução de foco ao
 * gatilho ao fechar (comportamento padrão do Radix Dialog), Escape
 * condicional (ignorado durante processamento) e loading independente por
 * ação — só o botão escolhido mostra "Saindo...".
 */
export function LogoutModal() {
  const { c } = useTheme()
  const { open, processingAction, error, closeLogoutModal, confirmLogout } = useLogoutModal()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const isProcessing = processingAction !== null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeLogoutModal()}>
      <DialogContent
        className="max-w-[420px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: c.card,
                border: `1px solid ${c.cardB}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.sub,
                flexShrink: 0,
              }}
            >
              <IconLogout size={19} />
            </span>
            <div>
              <DialogTitle>Sair da sua conta</DialogTitle>
              <DialogDescription>Escolha como deseja encerrar sua sessão.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody style={{ padding: '4px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 500,
                background: 'var(--destructive-muted)',
                color: 'var(--destructive)',
                border: '1px solid var(--destructive-border)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <Button
              type="button"
              size="full"
              disabled={isProcessing}
              onClick={() => void confirmLogout('device')}
            >
              {processingAction === 'device' ? 'Saindo...' : 'Sair deste dispositivo'}
            </Button>
            <p style={{ marginTop: 6, fontSize: 11.5, color: c.muted, lineHeight: 1.5 }}>
              Encerra apenas o acesso deste navegador; as demais sessões continuam ativas.
            </p>
          </div>

          <div>
            <Button
              type="button"
              variant="destructive"
              size="full"
              disabled={isProcessing}
              onClick={() => void confirmLogout('all')}
            >
              {processingAction === 'all' ? 'Saindo...' : 'Sair de todos os dispositivos'}
            </Button>
            <p style={{ marginTop: 6, fontSize: 11.5, color: c.muted, lineHeight: 1.5 }}>
              Encerra todas as sessões ativas desta conta, em qualquer dispositivo — use se suspeitar de acesso indevido.
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button ref={cancelRef} type="button" variant="outline" disabled={isProcessing}>
              Cancelar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
