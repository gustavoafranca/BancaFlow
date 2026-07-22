'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from '@/shared/theme/theme-provider'
import { v } from '@/shared/form/validator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/dialog'
import { Drawer, DrawerContent, DrawerBody, DrawerFooter } from '@/shared/components/ui/drawer'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { FormField } from '@/shared/components/ui/form-field'
import { ReadOnlyField } from '@/shared/components/ui/read-only-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { SelectionButtonGroup, type SelectionButtonOption } from '@/shared/components/ui/selection-button-group'
import { roleLabel } from '@/shared/lib/role.util'
import {
  createUserAccount,
  updateUserAccount,
  changeAccountRole,
  toggleAccountStatus,
  resetAccountPassword,
  revokeAccountSession,
  type UserAccountDetail,
  type CreateUserAccountData,
  type AdministrableRole,
  type AccountStatusName,
  type ToggleAccountStatusAction,
} from '../data/accounts.client'
import {
  createUserAccountSchema,
  editUserAccountSchema,
  type CreateUserAccountFormData,
  type EditUserAccountFormData,
} from '../data/user-account-form.schema'
import { useAccountSessions } from '../hooks/use-account-sessions'
import { STATUS_ACTION_LABEL, STATUS_BADGE_VARIANT, STATUS_LABEL, STATUS_SELECTION_OPTIONS, actionForTargetStatus } from './account-status.presentation'
import { TemporaryPasswordReveal } from './temporary-password-reveal'

// Perfil (Papel) também é seleção, não ação — mesmo Selection Button Group.
// `roleLabel` é a mesma fonte única de rótulo já usada no header do drawer.
const ROLE_SELECTION_OPTIONS: SelectionButtonOption<AdministrableRole>[] = [
  { value: 'USER', label: roleLabel('USER'), variant: 'neutral' },
  { value: 'ADMIN', label: roleLabel('ADMIN'), variant: 'neutral' },
]

type PendingAction =
  | { kind: 'status'; action: ToggleAccountStatusAction; label: string }
  | { kind: 'role'; role: AdministrableRole }
  | { kind: 'reset' }
  | { kind: 'revoke-session'; sessionId: string }

type CreateSubmitStatus = 'idle' | 'forbidden' | 'username_taken' | 'weak_password' | 'error'
type EditSubmitStatus = 'idle' | 'forbidden' | 'not_found' | 'username_taken' | 'conflict' | 'error'

const CREATE_MESSAGES: Record<Exclude<CreateSubmitStatus, 'idle'>, string> = {
  forbidden: 'Você não tem permissão para criar contas.',
  username_taken: 'Esse nome de usuário já está em uso nesta banca.',
  weak_password: 'Não foi possível gerar uma senha temporária forte. Tente novamente.',
  error: 'Não foi possível criar a conta agora. Tente novamente.',
}

const EDIT_MESSAGES: Record<Exclude<EditSubmitStatus, 'idle'>, string> = {
  forbidden: 'Você não tem permissão para editar esta conta.',
  not_found: 'Esta conta não foi encontrada.',
  username_taken: 'Esse nome de usuário já está em uso nesta banca.',
  conflict: 'Os dados foram alterados por outra ação. Reabra a conta e tente novamente.',
  error: 'Não foi possível salvar as alterações agora. Tente novamente.',
}

type UserAccountDrawerProps =
  | {
      mode: 'create'
      open: boolean
      onOpenChange: (open: boolean) => void
      onCreated: (result: CreateUserAccountData) => void
    }
  | {
      mode: 'detail'
      account: UserAccountDetail | null
      open: boolean
      onOpenChange: (open: boolean) => void
      onMutated: () => void
    }

/**
 * Shell único de lista-detalhe para Usuários sobre o Drawer canônico
 * (`canonical-drawer`, `shared/components/ui/drawer.tsx`): criação
 * (`mode="create"`) e detalhe/edição/papel/status/senha/sessões de uma conta
 * existente (`mode="detail"`, com alternância interna visualização/edição).
 * Ações sensíveis continuam exigindo confirmação em modal aninhado — mesmo
 * padrão já usado em `account-sessions-dialog`. Não existe endpoint de
 * exclusão de conta no Backend (`accounts.controller.ts` só expõe
 * `DELETE :accountId/sessions/:sessionId`, revogação de sessão) — por isso o
 * rodapé de edição não recebe `onDelete`.
 */
export function UserAccountDrawer(props: UserAccountDrawerProps) {
  if (props.mode === 'create') {
    return <CreateAccountForm open={props.open} onOpenChange={props.onOpenChange} onCreated={props.onCreated} />
  }
  return (
    <AccountDetail account={props.account} open={props.open} onOpenChange={props.onOpenChange} onMutated={props.onMutated} />
  )
}

function CreateAccountForm({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (result: CreateUserAccountData) => void
}) {
  const [submitStatus, setSubmitStatus] = useState<CreateSubmitStatus>('idle')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserAccountFormData>({
    resolver: v.resolver(createUserAccountSchema),
    defaultValues: { username: '', name: '', email: undefined, role: 'USER' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setSubmitStatus('idle')
    const result = await createUserAccount({
      username: data.username,
      name: data.name,
      email: data.email || undefined,
      role: data.role,
    })
    if (result.status === 'success') {
      reset()
      onOpenChange(false)
      onCreated(result.data)
      return
    }
    setSubmitStatus(result.status)
  })

  function close() {
    reset()
    setSubmitStatus('idle')
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          setSubmitStatus('idle')
        }
        onOpenChange(next)
      }}
    >
      <DrawerContent
        title="Nova conta"
        description="Crie uma conta ADMIN ou USER da própria banca. Uma senha temporária será gerada e exibida uma única vez."
      >
        <DrawerBody>
          <form
            onSubmit={onSubmit}
            noValidate
            style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <FormField label="Usuário" htmlFor="create-account-username" error={errors.username?.message}>
              <Input
                id="create-account-username"
                autoComplete="off"
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'create-account-username-error' : undefined}
                {...register('username')}
              />
            </FormField>

            <FormField label="Nome" htmlFor="create-account-name" error={errors.name?.message}>
              <Input
                id="create-account-name"
                autoComplete="off"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'create-account-name-error' : undefined}
                {...register('name')}
              />
            </FormField>

            <FormField label="E-mail (opcional)" htmlFor="create-account-email" error={errors.email?.message}>
              <Input
                id="create-account-email"
                type="email"
                autoComplete="off"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'create-account-email-error' : undefined}
                {...register('email')}
              />
            </FormField>

            <FormField label="Papel" htmlFor="create-account-role">
              <Select value={watch('role')} onValueChange={(next) => setValue('role', next as AdministrableRole)}>
                <SelectTrigger id="create-account-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário (USER)</SelectItem>
                  <SelectItem value="ADMIN">Administrador (ADMIN)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {submitStatus !== 'idle' && <ErrorBanner>{CREATE_MESSAGES[submitStatus]}</ErrorBanner>}
          </form>
        </DrawerBody>

        <DrawerFooter mode="create" onClose={close} onSave={() => void onSubmit()} loading={isSubmitting} />
      </DrawerContent>
    </Drawer>
  )
}

function AccountDetail({
  account,
  open,
  onOpenChange,
  onMutated,
}: {
  account: UserAccountDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated: () => void
}) {
  const { c } = useTheme()
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view')
  const [editSubmitStatus, setEditSubmitStatus] = useState<EditSubmitStatus>('idle')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [processing, setProcessing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  const { state: sessionsState, refetch: refetchSessions } = useAccountSessions(account?.userId ?? null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserAccountFormData>({
    resolver: v.resolver(editUserAccountSchema),
    defaultValues: { username: '', name: '', email: undefined },
  })

  const [lastAccountId, setLastAccountId] = useState<string | null>(null)
  if (account && account.userId !== lastAccountId) {
    setLastAccountId(account.userId)
    setDetailMode('view')
    setEditSubmitStatus('idle')
    setPendingAction(null)
    setActionError(null)
    setTemporaryPassword(null)
  }

  useEffect(() => {
    if (account) {
      reset({ username: account.username, name: account.name, email: account.email ?? undefined })
    }
  }, [account, reset])

  function cancelEdit() {
    if (!account) return
    setDetailMode('view')
    setEditSubmitStatus('idle')
    reset({ username: account.username, name: account.name, email: account.email ?? undefined })
  }

  const onSubmitEdit = handleSubmit(async (data) => {
    if (!account) return
    setEditSubmitStatus('idle')
    const result = await updateUserAccount(account.userId, {
      username: data.username !== account.username ? data.username : undefined,
      name: data.name,
      email: data.email || null,
      version: account.version,
    })
    if (result.status === 'success') {
      setDetailMode('view')
      onMutated()
      return
    }
    setEditSubmitStatus(result.status)
  })

  function openStatusAction(targetStatus: AccountStatusName) {
    if (!account) return
    const action = actionForTargetStatus(account.status, targetStatus)
    if (!action) return // já é o status atual — seleção redundante, sem ação
    setActionError(null)
    setPendingAction({ kind: 'status', action, label: STATUS_ACTION_LABEL[action] })
  }

  function openRoleAction(targetRole: AdministrableRole) {
    if (!account || targetRole === account.role) return
    setActionError(null)
    setPendingAction({ kind: 'role', role: targetRole })
  }

  function openResetAction() {
    setActionError(null)
    setPendingAction({ kind: 'reset' })
  }

  function openRevokeSessionAction(sessionId: string) {
    setActionError(null)
    setPendingAction({ kind: 'revoke-session', sessionId })
  }

  function closePendingAction() {
    setPendingAction(null)
    setTemporaryPassword(null)
    setActionError(null)
  }

  async function confirmPendingAction() {
    if (!pendingAction || processing || !account) return
    setProcessing(true)
    setActionError(null)

    if (pendingAction.kind === 'status') {
      const result = await toggleAccountStatus(account.userId, pendingAction.action)
      setProcessing(false)
      if (result.status === 'success') {
        setPendingAction(null)
        onMutated()
      } else {
        setActionError('Não foi possível concluir a ação agora. Tente novamente.')
      }
      return
    }

    if (pendingAction.kind === 'role') {
      const result = await changeAccountRole(account.userId, pendingAction.role)
      setProcessing(false)
      if (result.status === 'success') {
        setPendingAction(null)
        onMutated()
      } else {
        setActionError('Não foi possível trocar o papel agora. Tente novamente.')
      }
      return
    }

    if (pendingAction.kind === 'revoke-session') {
      const outcome = await revokeAccountSession(account.userId, pendingAction.sessionId)
      setProcessing(false)
      setPendingAction(null)
      if (outcome === 'success' || outcome === 'not_found') {
        await refetchSessions()
      } else {
        setActionError('Não foi possível encerrar a sessão agora. Tente novamente.')
      }
      return
    }

    // reset
    const result = await resetAccountPassword(account.userId)
    setProcessing(false)
    if (result.status === 'success') {
      setTemporaryPassword(result.data.temporaryPassword)
    } else {
      setActionError('Não foi possível redefinir a senha agora. Tente novamente.')
    }
  }

  const isViewMode = detailMode === 'view'

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DrawerContent
        title={account?.name ?? 'Conta'}
        titleBadge={
          isViewMode ? (
            <Badge variant="neutral" className="shrink-0">
              Visualização
            </Badge>
          ) : undefined
        }
        description={
          account && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>@{account.username}</span>
              <Badge>{roleLabel(account.role)}</Badge>
              <Badge variant={STATUS_BADGE_VARIANT[account.status]}>{STATUS_LABEL[account.status]}</Badge>
            </span>
          )
        }
      >
        {account && (
          <DrawerBody style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Section title="Dados">
              {isViewMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ReadOnlyField label="Usuário" value={account.username} />
                  <ReadOnlyField label="Nome" value={account.name} />
                  <ReadOnlyField label="E-mail" value={account.email ?? '—'} />
                </div>
              ) : (
                <form
                  onSubmit={onSubmitEdit}
                  noValidate
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <FormField label="Usuário" htmlFor="edit-account-username" error={errors.username?.message}>
                    <Input
                      id="edit-account-username"
                      autoComplete="off"
                      aria-invalid={errors.username ? 'true' : 'false'}
                      aria-describedby={errors.username ? 'edit-account-username-error' : undefined}
                      {...register('username')}
                    />
                  </FormField>
                  <FormField label="Nome" htmlFor="edit-account-name" error={errors.name?.message}>
                    <Input
                      id="edit-account-name"
                      autoComplete="off"
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-describedby={errors.name ? 'edit-account-name-error' : undefined}
                      {...register('name')}
                    />
                  </FormField>
                  <FormField label="E-mail (opcional)" htmlFor="edit-account-email" error={errors.email?.message}>
                    <Input
                      id="edit-account-email"
                      type="email"
                      autoComplete="off"
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'edit-account-email-error' : undefined}
                      {...register('email')}
                    />
                  </FormField>
                  {editSubmitStatus !== 'idle' && <ErrorBanner>{EDIT_MESSAGES[editSubmitStatus]}</ErrorBanner>}
                </form>
              )}
            </Section>

            {/* Papel/Status são SELEÇÃO de estado, não ação — Selection Button
                Group (ajuste solicitado antes do archive). A seleção só abre
                o modal de confirmação; a troca real só ocorre ao confirmar. */}
            <Section title="Papel">
              <SelectionButtonGroup
                aria-label="Papel"
                value={account.role}
                onValueChange={(next) => openRoleAction(next as AdministrableRole)}
                options={ROLE_SELECTION_OPTIONS}
              />
            </Section>

            <Section title="Status">
              <SelectionButtonGroup
                aria-label="Status"
                value={account.status}
                onValueChange={(next) => openStatusAction(next as AccountStatusName)}
                options={STATUS_SELECTION_OPTIONS}
              />
            </Section>

            <Section title="Senha">
              <Button type="button" variant="outline" onClick={openResetAction}>
                Redefinir senha
              </Button>
            </Section>

            <Section title="Sessões ativas">
              {sessionsState.status === 'loading' && (
                <p role="status" aria-live="polite" style={{ color: c.muted, fontSize: 13 }}>
                  Carregando sessões...
                </p>
              )}
              {(sessionsState.status === 'error' || sessionsState.status === 'forbidden' || sessionsState.status === 'not_found') && (
                <p role="alert" style={{ color: 'var(--destructive)', fontSize: 13 }}>
                  Não foi possível carregar as sessões desta conta.
                </p>
              )}
              {sessionsState.status === 'success' && sessionsState.data.length === 0 && (
                <p style={{ color: c.muted, fontSize: 13 }}>Nenhuma sessão ativa.</p>
              )}
              {sessionsState.status === 'success' &&
                sessionsState.data.map((session) => (
                  <div
                    key={session.sessionId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: `1px solid ${c.cardB}`,
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12.5, color: c.text }}>{session.deviceInfo ?? 'Dispositivo desconhecido'}</div>
                      <div style={{ fontSize: 11, color: c.muted }}>
                        Criada em {formatDate(session.createdAt)} · expira em {formatDate(session.expiresAt)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => openRevokeSessionAction(session.sessionId)}
                    >
                      Encerrar sessão
                    </Button>
                  </div>
                ))}
            </Section>
          </DrawerBody>
        )}

        {isViewMode ? (
          <DrawerFooter mode="view" onClose={() => onOpenChange(false)} onEdit={() => setDetailMode('edit')} />
        ) : (
          <DrawerFooter
            mode="edit"
            onClose={() => onOpenChange(false)}
            onCancel={cancelEdit}
            onSave={() => void onSubmitEdit()}
            loading={isSubmitting}
          />
        )}
      </DrawerContent>

      {/* Confirmação de status/papel/senha/sessão — modal aninhado sobre o drawer. */}
      <Dialog open={pendingAction !== null} onOpenChange={(next) => !next && closePendingAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.kind === 'status' && `${pendingAction.label} conta`}
              {pendingAction?.kind === 'role' && 'Trocar papel'}
              {pendingAction?.kind === 'reset' && 'Redefinir senha'}
              {pendingAction?.kind === 'revoke-session' && 'Encerrar sessão'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.kind === 'status' && account && `${pendingAction.label} a conta de ${account.name}?`}
              {pendingAction?.kind === 'role' &&
                account &&
                `Alterar o papel de ${account.name} para ${pendingAction.role}? As sessões ativas desta conta serão encerradas.`}
              {pendingAction?.kind === 'reset' &&
                !temporaryPassword &&
                account &&
                `Gerar uma nova senha temporária para ${account.name}? As sessões ativas desta conta serão encerradas.`}
              {pendingAction?.kind === 'revoke-session' &&
                'Essa sessão será desconectada imediatamente. O dispositivo precisará de um novo login para acessar a conta novamente.'}
            </DialogDescription>
          </DialogHeader>

          <div style={{ padding: '0 20px 16px' }}>
            {actionError && <ErrorBanner>{actionError}</ErrorBanner>}

            {pendingAction?.kind === 'reset' && temporaryPassword && (
              <div style={{ marginTop: 12 }}>
                <TemporaryPasswordReveal value={temporaryPassword} />
              </div>
            )}
          </div>

          <DialogFooter>
            {pendingAction?.kind === 'reset' && temporaryPassword ? (
              <Button type="button" onClick={closePendingAction}>
                Fechar
              </Button>
            ) : (
              <>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant={
                    (pendingAction?.kind === 'status' && pendingAction.action === 'block') ||
                    pendingAction?.kind === 'revoke-session'
                      ? 'destructive'
                      : 'default'
                  }
                  disabled={processing}
                  onClick={() => void confirmPendingAction()}
                >
                  {processing ? 'Processando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <section>
      <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.muted, marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
