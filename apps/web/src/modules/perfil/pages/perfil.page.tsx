'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from '@/shared/theme/theme-provider'
import { useCurrentUser } from '@/shared/session/use-current-user'
import { updateOwnProfile } from '@/shared/api/auth.client'
import { v } from '@/shared/form/validator'
import { initials } from '@/shared/lib/format.util'
import { roleLabel } from '@/shared/lib/role.util'
import { IconEdit, IconUser } from '@/shared/components/icons'
import { IcoBuilding, IcoInfo, IcoLock } from '../components/icons'
import { profileSchema, type ProfileFormData } from '../data/profile.schema'
import { SecurityTab } from '../components/security-tab'

type TabId = 'info' | 'sec'

export function PerfilPage() {
  const { c, dark } = useTheme()
  const currentUser = useCurrentUser()
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [editMode, setEditMode] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'invalid' | 'unauthenticated' | 'conflict' | 'error' | 'success' | 'syncError'
  >('idle')
  const alertRef = useRef<HTMLDivElement>(null)

  const currentData = currentUser.status === 'success' ? currentUser.data : undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: v.resolver(profileSchema),
    values: currentData ? { name: currentData.name, email: currentData.email ?? '' } : undefined,
  })

  // Contexto de exibição real (`GET /api/auth/me`) — nunca fabricado. Enquanto
  // carrega ou em erro, os campos ficam vazios (tarefa 7.3, aplicada também
  // aqui e não só no shell, pois esta tela replicava a mesma identidade fixa).
  const displayName = currentUser.status === 'success' ? currentUser.data.name : ''
  const displayUsername = currentUser.status === 'success' ? currentUser.data.username : ''
  const displayEmail = currentUser.status === 'success' ? currentUser.data.email ?? '' : ''
  const displayRole = currentUser.status === 'success' ? roleLabel(currentUser.data.role) : ''
  const displayBanca = currentUser.status === 'success' ? currentUser.data.banca.name : ''
  const displayInitials = currentUser.status === 'success' ? initials(currentUser.data.name) : ''

  function startEdit() {
    setSubmitStatus('idle')
    setEditMode(true)
  }

  function cancelEdit() {
    reset()
    setSubmitStatus('idle')
    setEditMode(false)
  }

  const onSubmit = handleSubmit(async (data) => {
    if (!currentData) return
    setSubmitStatus('idle')

    const result = await updateOwnProfile({
      name: data.name,
      email: data.email ? data.email : null,
      version: currentData.version,
    })

    if (result.status === 'success') {
      // O PATCH só confirma `{ success: true }` — a edição só é considerada
      // concluída depois que o GET autoritativo (nome/e-mail/version reais)
      // é obtido com sucesso. Se o refresh falhar, a edição permanece aberta
      // e o Save é bloqueado (ver `isSyncError` abaixo) até resincronizar,
      // pois `currentData.version` pode já estar desatualizado.
      const refreshed = await currentUser.refreshCurrentUser()
      if (refreshed) {
        setSubmitStatus('success')
        setEditMode(false)
      } else {
        setSubmitStatus('syncError')
      }
      return
    }
    if (result.status === 'conflict') {
      setSubmitStatus('conflict')
      // Recarrega os dados autoritativos — o Web nunca fabrica um `version`
      // localmente; o usuário revisa o estado atual e tenta novamente.
      await currentUser.refreshCurrentUser()
      return
    }
    setSubmitStatus(result.status === 'invalid' ? 'invalid' : result.status === 'unauthenticated' ? 'unauthenticated' : 'error')
  })

  /** Só reexecuta o `GET /api/auth/me` — usado quando o PATCH já teve sucesso mas o refresh anterior falhou. */
  async function retrySync() {
    const refreshed = await currentUser.refreshCurrentUser()
    if (refreshed) {
      setSubmitStatus('success')
      setEditMode(false)
    }
  }

  const isSyncError = submitStatus === 'syncError'

  const submitStatusMessage: Record<Exclude<typeof submitStatus, 'idle'>, string> = {
    success: 'Perfil atualizado com sucesso.',
    invalid: 'Dados inválidos. Verifique o nome e o e-mail informados.',
    unauthenticated: 'Sua sessão expirou. Faça login novamente.',
    conflict: 'Seus dados foram atualizados por outra sessão. Revise as informações e tente novamente.',
    error: 'Não foi possível salvar agora. Tente novamente.',
    syncError:
      'Suas alterações foram salvas, mas não foi possível recarregar seu perfil agora. Tente novamente antes de salvar de novo.',
  }

  const isErrorLikeStatus =
    submitStatus === 'invalid' ||
    submitStatus === 'unauthenticated' ||
    submitStatus === 'conflict' ||
    submitStatus === 'error' ||
    submitStatus === 'syncError'

  // Move o foco para o alerta quando um erro/conflito/falha de sincronização
  // aparece, para leitores de tela anunciarem a mensagem imediatamente.
  useEffect(() => {
    if (isErrorLikeStatus) {
      alertRef.current?.focus()
    }
  }, [submitStatus, isErrorLikeStatus])

  /* cores extras que não fazem parte do objeto `c` compartilhado */
  const glowDim = dark ? 'rgba(0,199,115,0.05)' : 'rgba(0,153,102,0.04)'
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'

  const viewMode = !editMode
  const fBg = editMode ? inputBg : 'transparent'
  const fBd = editMode ? inputBorder : c.cardBL

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 10.5,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: c.muted,
    marginBottom: 8,
  }
  const fieldCard: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.cardB}`,
    borderRadius: 16,
    padding: 22,
  }
  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: fBg,
    border: `1px solid ${fBd}`,
    borderRadius: 10,
    color: c.text,
    fontSize: 13.5,
    fontWeight: 500,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ padding: 28, maxWidth: 960 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', color: c.text, marginBottom: 5 }}>
            Meu Perfil
          </h1>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.65 }}>
            Gerencie suas informações pessoais.
          </p>
        </div>
        {viewMode ? (
          <button
            type="button"
            onClick={startEdit}
            disabled={!currentData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 11,
              border: `1px solid ${c.cardB}`,
              background: c.btn,
              color: c.text,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              cursor: currentData ? 'pointer' : 'default',
              opacity: currentData ? 1 : 0.6,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'flex' }}>
              <IconEdit size={14} />
            </span>
            Editar Perfil
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: 11,
                border: `1px solid ${c.cardB}`,
                background: 'transparent',
                color: c.sub,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              // Enquanto a sincronização pós-PATCH não é confirmada, o botão
              // só reexecuta o GET (nunca reenvia o formulário com uma
              // `version` possivelmente desatualizada).
              onClick={() => void (isSyncError ? retrySync() : onSubmit())}
              disabled={isSubmitting}
              style={{
                padding: '10px 24px',
                borderRadius: 11,
                border: 'none',
                background: c.green,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${c.shadow}`,
                transition: 'all 0.15s',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Salvando...' : isSyncError ? 'Tentar novamente' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </div>

      {submitStatus !== 'idle' && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role={submitStatus === 'success' ? 'status' : 'alert'}
          aria-live={submitStatus === 'success' ? 'polite' : 'assertive'}
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            outline: 'none',
            background: submitStatus === 'success' ? c.glow : 'rgba(224,85,85,0.1)',
            border: `1px solid ${submitStatus === 'success' ? c.glowB : 'rgba(224,85,85,0.3)'}`,
            color: submitStatus === 'success' ? c.green : '#E05555',
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <span>{submitStatusMessage[submitStatus]}</span>
          {isSyncError && (
            <button
              type="button"
              onClick={() => void retrySync()}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid rgba(224,85,85,0.4)',
                background: 'transparent',
                color: '#E05555',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Profile hero card */}
      <div
        style={{
          background: c.card,
          border: `1px solid ${c.cardB}`,
          borderRadius: 20,
          padding: 28,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, background: `radial-gradient(circle,${c.glow},transparent 62%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 60, width: 160, height: 160, background: `radial-gradient(circle,${glowDim},transparent 62%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 26, position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#005533,#00C773)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                boxShadow: `0 0 0 3px ${c.bg},0 0 0 5px ${c.green},0 10px 28px rgba(0,199,115,0.32)`,
              }}
            >
              {displayInitials}
            </div>
            <div
              className="bf-pulse-dot"
              style={{ position: 'absolute', bottom: 3, right: 3, width: 15, height: 15, borderRadius: '50%', background: '#00C773', border: `2.5px solid ${c.bg}` }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', color: c.text }}>{displayName}</span>
              {displayRole && (
                <span style={{ fontSize: 11, padding: '3px 11px', borderRadius: 20, background: c.glow, color: c.green, fontWeight: 600, border: `1px solid ${c.glowB}` }}>
                  {displayRole}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: c.muted, marginBottom: 18 }}>
              {displayUsername && `@${displayUsername}`}
              {displayUsername && displayEmail && ' · '}
              {displayEmail}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'flex', color: c.muted }}>{IcoBuilding}</span>
                <span style={{ fontSize: 12, color: c.sub }}>
                  Banca <span style={{ color: c.text, fontWeight: 500 }}>{displayBanca}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Seções do perfil"
        style={{ display: 'flex', gap: 3, marginBottom: 20, background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 13, padding: 4 }}
      >
        {(
          [
            { id: 'info' as const, label: 'Informações', icon: <IconUser size={16} /> },
            { id: 'sec' as const, label: 'Segurança', icon: IcoLock },
          ]
        ).map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`perfil-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`perfil-tabpanel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 9,
                border: 'none',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? c.green : c.sub,
                background: active ? (dark ? 'rgba(0,199,115,0.14)' : 'rgba(0,153,102,0.09)') : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: active ? (dark ? '0 2px 10px rgba(0,199,115,0.14)' : '0 2px 8px rgba(0,153,102,0.1)') : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'sec' && (
        <div role="tabpanel" id="perfil-tabpanel-sec" aria-labelledby="perfil-tab-sec">
          <SecurityTab />
        </div>
      )}

      {activeTab === 'info' && (
        <div role="tabpanel" id="perfil-tabpanel-info" aria-labelledby="perfil-tab-info">
          {currentUser.status === 'loading' && (
            <div
              role="status"
              aria-live="polite"
              style={{ ...fieldCard, textAlign: 'center', color: c.muted, fontSize: 13 }}
            >
              Carregando perfil...
            </div>
          )}

          {currentUser.status === 'error' && (
            <div
              role="alert"
              style={{
                ...fieldCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                color: '#E05555',
                fontSize: 13,
              }}
            >
              <span>Não foi possível carregar seu perfil agora.</span>
              <button
                type="button"
                onClick={() => void currentUser.refreshCurrentUser()}
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

          {currentUser.status === 'success' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={fieldCard}>
            <label htmlFor="perfil-nome" style={fieldLabel}>
              Nome Completo
            </label>
            <input
              id="perfil-nome"
              type="text"
              readOnly={viewMode}
              style={inputBase}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'perfil-nome-error' : undefined}
              {...register('name')}
            />
            {editMode && errors.name && (
              <p id="perfil-nome-error" role="alert" style={{ marginTop: 6, fontSize: 11.5, fontWeight: 500, color: '#E05555' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          <div style={fieldCard}>
            <label htmlFor="perfil-username" style={fieldLabel}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: c.muted, pointerEvents: 'none' }}>@</span>
              <input
                id="perfil-username"
                type="text"
                defaultValue={displayUsername}
                readOnly
                style={{ ...inputBase, padding: '10px 14px 10px 28px', background: 'transparent', border: `1px solid ${c.cardBL}`, cursor: 'default' }}
              />
            </div>
          </div>

          <div style={fieldCard}>
            <label htmlFor="perfil-email" style={fieldLabel}>
              E-mail
            </label>
            <input
              id="perfil-email"
              type="email"
              readOnly={viewMode}
              style={inputBase}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'perfil-email-error' : undefined}
              {...register('email')}
            />
            {editMode && errors.email && (
              <p id="perfil-email-error" role="alert" style={{ marginTop: 6, fontSize: 11.5, fontWeight: 500, color: '#E05555' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Telefone removido: não existe capability/campo real para esse
              dado em `UserAccount` ainda (fora de escopo desta change — ver
              proposal.md/tasks.md). Exibir um valor fixo aqui seria
              reintroduzir o mesmo tipo de dado fabricado que esta change
              elimina para nome/e-mail. */}

          <div style={fieldCard}>
            <label style={fieldLabel}>Perfil de Acesso</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.glow, border: `1px solid ${c.glowB}`, borderRadius: 10 }}>
              <div className="bf-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: c.green, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: c.green }}>{displayRole}</span>
            </div>
          </div>

          <div style={fieldCard}>
            <label style={fieldLabel}>Banca</label>
            <input
              type="text"
              defaultValue={displayBanca}
              readOnly
              style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: `1px solid ${c.cardBL}`, borderRadius: 10, color: c.sub, fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit', outline: 'none', cursor: 'default' }}
            />
          </div>

          {editMode && (
            <div style={{ gridColumn: '1 / -1', padding: '14px 18px', borderRadius: 12, background: c.glow, border: `1px solid ${c.glowB}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'flex', color: c.green, flexShrink: 0 }}>{IcoInfo}</span>
              <span style={{ fontSize: 12.5, color: c.sub, lineHeight: 1.6 }}>
                Perfil de Acesso e Banca são gerenciados pelo administrador do sistema e não podem ser alterados aqui.
              </span>
            </div>
          )}
        </div>
          )}
        </div>
      )}

      {/* bottom spacer */}
      <div style={{ height: 40 }} />
    </div>
  )
}
