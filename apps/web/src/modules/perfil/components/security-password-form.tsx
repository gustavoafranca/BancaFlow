'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTheme } from '@/shared/theme/theme-provider'
import { v } from '@/shared/form/validator'
import { changePassword } from '@/shared/api/auth.client'
import { securityPasswordSchema, type SecurityPasswordFormData } from '../data/security-password.schema'
import { IcoLock } from './icons'

type SubmitStatus = 'idle' | 'success' | 'wrong_current_password' | 'invalid' | 'error'

const MESSAGES: Record<Exclude<SubmitStatus, 'idle'>, string> = {
  success: 'Senha atualizada. As demais sessões foram encerradas.',
  wrong_current_password: 'A senha atual informada está incorreta.',
  invalid: 'A nova senha não atende aos requisitos de segurança.',
  error: 'Não foi possível trocar a senha agora. Tente novamente.',
}

export function SecurityPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { c, dark } = useTheme()
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const alertRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SecurityPasswordFormData>({
    resolver: v.resolver(securityPasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setSubmitStatus('idle')
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })

    if (result.status === 'success') {
      setSubmitStatus('success')
      reset()
      onSuccess()
      return
    }
    setSubmitStatus(result.status)
  })

  // Move o foco para o alerta quando um erro vindo do Backend aparece (senha
  // atual incorreta, senha fraca ou falha técnica), para leitores de tela
  // anunciarem a mensagem imediatamente.
  useEffect(() => {
    if (submitStatus !== 'idle' && submitStatus !== 'success') {
      alertRef.current?.focus()
    }
  }, [submitStatus])

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
  const secLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: c.muted,
    marginBottom: 7,
  }
  const pwInput: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border: `1px solid ${c.cardB}`,
    borderRadius: 10,
    color: c.text,
    fontSize: 13.5,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
  }
  const fieldErrorStyle: React.CSSProperties = { marginTop: 6, fontSize: 11.5, fontWeight: 500, color: '#E05555' }

  return (
    <div style={secCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={secIconBox}>{IcoLock}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 2 }}>Alterar Senha</div>
          <div style={{ fontSize: 12, color: c.muted }}>A nova senha deve ter no mínimo 8 caracteres.</div>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
          <div>
            <label htmlFor="security-current-password" style={secLabel}>
              Senha Atual
            </label>
            <input
              id="security-current-password"
              type="password"
              autoComplete="current-password"
              style={pwInput}
              aria-invalid={errors.currentPassword ? 'true' : 'false'}
              aria-describedby={errors.currentPassword ? 'security-current-password-error' : undefined}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p id="security-current-password-error" role="alert" style={fieldErrorStyle}>
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="security-new-password" style={secLabel}>
              Nova Senha
            </label>
            <input
              id="security-new-password"
              type="password"
              autoComplete="new-password"
              style={pwInput}
              aria-invalid={errors.newPassword ? 'true' : 'false'}
              aria-describedby={errors.newPassword ? 'security-new-password-error' : undefined}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p id="security-new-password-error" role="alert" style={fieldErrorStyle}>
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="security-confirm-password" style={secLabel}>
              Confirmar Nova Senha
            </label>
            <input
              id="security-confirm-password"
              type="password"
              autoComplete="new-password"
              style={pwInput}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'security-confirm-password-error' : undefined}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="security-confirm-password-error" role="alert" style={fieldErrorStyle}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {submitStatus !== 'idle' && (
          <div
            ref={alertRef}
            tabIndex={-1}
            role={submitStatus === 'success' ? 'status' : 'alert'}
            aria-live={submitStatus === 'success' ? 'polite' : 'assertive'}
            style={{
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 500,
              outline: 'none',
              background: submitStatus === 'success' ? c.glow : 'rgba(224,85,85,0.1)',
              color: submitStatus === 'success' ? c.green : '#E05555',
              border: `1px solid ${submitStatus === 'success' ? c.glowB : 'rgba(224,85,85,0.3)'}`,
            }}
          >
            {MESSAGES[submitStatus]}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 26px',
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
            {isSubmitting ? 'Salvando...' : 'Atualizar Senha'}
          </button>
        </div>
      </form>
    </div>
  )
}
