'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/shared/lib/class-name.util'
import { IconMaximize, IconMinimize, IconX } from '@/shared/components/icons'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter as ModalFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'
import { Button } from './button'

// Drawer canônico (`canonical-drawer`) — painel lateral único para
// Criar/Editar/Visualizar em todo o sistema, substituindo `pessoas.page.tsx`
// (inline), `user-account-drawer.tsx` (`DialogContent variant="drawer"` fixo),
// `AcertoDrawer`/`DetailDrawer`. Constrói sobre os mesmos primitives Radix já
// usados por `Dialog` (foco/Escape/portal corretos, não reimplementados
// aqui), adicionando redimensionar, maximizar/restaurar e rodapé por modo.
//
// Referência visual: drawer de Pessoas e Vínculos (header, resize, maximizar,
// abas, rodapé por modo). O offset de topo (`top-[54px]`) mantém a navbar
// principal sempre visível e clicável com o drawer aberto — decisão de
// design que também move `user-account-drawer` (hoje `top-0`) para este
// mesmo comportamento.

export const Drawer = Dialog
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogClose
export const DrawerBody = DialogBody

const DEFAULT_MIN_WIDTH = 380
const DEFAULT_MAX_WIDTH = 900
const DEFAULT_WIDTH = 480
const KEYBOARD_RESIZE_STEP = 24

export interface DrawerContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'> {
  /** Título dinâmico do cabeçalho (ex.: "Novo Usuário", "Editar Usuário"). */
  title: React.ReactNode
  /** Descrição acessível opcional; renderizada apenas para leitor de tela. */
  description?: React.ReactNode
  /** Selo opcional ao lado do título (ex.: badge "Visualização"). */
  titleBadge?: React.ReactNode
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

/**
 * Painel do Drawer: cabeçalho com título/badge/maximizar/fechar, borda de
 * redimensionamento por mouse e teclado, corpo e rodapé ficam a cargo dos
 * `children` (compor com `DrawerBody`/`DrawerFooter`, mesmo modelo flex de
 * `DialogContent`). Largura vive apenas em memória da instância (decisão de
 * design: sem `localStorage`) e reseta ao padrão a cada montagem.
 */
export const DrawerContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DrawerContentProps>(
  (
    {
      className,
      children,
      title,
      description,
      titleBadge,
      minWidth = DEFAULT_MIN_WIDTH,
      maxWidth = DEFAULT_MAX_WIDTH,
      defaultWidth = DEFAULT_WIDTH,
      ...props
    },
    ref,
  ) => {
    const [width, setWidth] = React.useState(() => Math.min(maxWidth, Math.max(minWidth, defaultWidth)))
    const [maximized, setMaximized] = React.useState(false)
    const [resizing, setResizing] = React.useState(false)

    React.useEffect(() => {
      if (!resizing) return
      const onMove = (event: MouseEvent) => {
        const next = window.innerWidth - event.clientX
        setWidth(Math.min(maxWidth, Math.max(minWidth, next)))
      }
      const onUp = () => setResizing(false)
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      return () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }, [resizing, minWidth, maxWidth])

    function onHandleKeyDown(event: React.KeyboardEvent) {
      if (maximized) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setWidth((w) => Math.min(maxWidth, w + KEYBOARD_RESIZE_STEP))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setWidth((w) => Math.max(minWidth, w - KEYBOARD_RESIZE_STEP))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setWidth(minWidth)
      } else if (event.key === 'End') {
        event.preventDefault()
        setWidth(maxWidth)
      }
    }

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          style={{ width: maximized ? '100%' : `${width}px` }}
          className={cn(
            'fixed right-0 top-[54px] z-[210] flex h-[calc(100vh-54px)] flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl outline-none',
            !resizing && 'transition-[width] duration-150',
            className,
          )}
          {...props}
        >
          {!maximized && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar painel"
              aria-valuemin={minWidth}
              aria-valuemax={maxWidth}
              aria-valuenow={width}
              tabIndex={0}
              onMouseDown={(event) => {
                event.preventDefault()
                setResizing(true)
              }}
              onKeyDown={onHandleKeyDown}
              className="absolute -left-0.5 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize touch-none focus-visible:bg-ring/40"
            />
          )}

          <div className="flex shrink-0 flex-col border-b border-border">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <DialogPrimitive.Title className="truncate text-[15px] font-extrabold tracking-[-0.02em]">
                  {title}
                </DialogPrimitive.Title>
                {titleBadge}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMaximized((m) => !m)}
                  aria-label={maximized ? 'Restaurar' : 'Maximizar'}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {maximized ? <IconMinimize size={14} /> : <IconMaximize size={14} />}
                </button>
                {/* Rótulo distinto de "Fechar" (rodapé) para não colidir com
                    ele quando ambos coexistem — duas ações "Fechar" com o
                    mesmo nome acessível confundiriam navegação por leitor de
                    tela e buscas por role+name em teste. */}
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    aria-label="Fechar painel"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <IconX size={16} />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>
            {/* Visível (não `sr-only`): telas reais usam esta área para subtítulo
                e badges (ex.: @usuário, papel, status), não apenas texto para
                leitor de tela — `DialogPrimitive.Description` já cuida do
                `aria-describedby` automaticamente. */}
            {description && (
              <DialogPrimitive.Description className="px-4 pb-3 text-[11px] text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>

          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  },
)
DrawerContent.displayName = 'DrawerContent'

export type DrawerMode = 'create' | 'edit' | 'view'

export interface DrawerFooterProps {
  mode: DrawerMode
  onClose: () => void
  /** Ação principal de salvar (criar/editar). Omitir oculta o botão (sem permissão). */
  onSave?: () => void
  /** Ação de ir para edição, exibida em modo `view`. Omitir oculta o botão (sem permissão). */
  onEdit?: () => void
  /** Ação de exclusão, exibida em modo `edit`. Omitir oculta o botão (sem permissão ou sem contrato de backend). */
  onDelete?: () => void
  loading?: boolean
  saveLabel?: string
  savingLabel?: string
  deleteLabel?: string
  deleteConfirmTitle?: string
  deleteConfirmDescription?: string
}

/**
 * Rodapé fixo por modo (tarefa 2.2/2.3): criação = Fechar+Salvar; edição =
 * Excluir(quando fornecido)+Fechar+Salvar Alterações; visualização =
 * Fechar+Editar(quando fornecido). Ação de excluir abre modal de confirmação
 * próprio, sem cada consumidor reimplementar a confirmação.
 */
export function DrawerFooter({
  mode,
  onClose,
  onSave,
  onEdit,
  onDelete,
  loading = false,
  saveLabel,
  savingLabel = 'Salvando...',
  deleteLabel = 'Excluir',
  deleteConfirmTitle = 'Excluir registro',
  deleteConfirmDescription = 'Esta ação não pode ser desfeita.',
}: DrawerFooterProps) {
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const resolvedSaveLabel = saveLabel ?? (mode === 'create' ? 'Salvar' : 'Salvar Alterações')
  const showDelete = mode === 'edit' && Boolean(onDelete)

  return (
    <>
      <ModalFooter className={cn(showDelete ? 'justify-between' : 'justify-end')}>
        {showDelete && (
          <Button type="button" variant="destructive" disabled={loading} onClick={() => setConfirmingDelete(true)}>
            {deleteLabel}
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            Fechar
          </Button>
          {mode === 'view'
            ? onEdit && (
                <Button type="button" disabled={loading} onClick={onEdit}>
                  Editar
                </Button>
              )
            : onSave && (
                <Button type="button" disabled={loading} onClick={onSave}>
                  {loading ? savingLabel : resolvedSaveLabel}
                </Button>
              )}
        </div>
      </ModalFooter>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{deleteConfirmDescription}</DialogDescription>
          </DialogHeader>
          <ModalFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmingDelete(false)
                onDelete?.()
              }}
            >
              {deleteLabel}
            </Button>
          </ModalFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
