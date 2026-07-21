'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { v } from '@/shared/form/validator'
import { changePasswordSchema, type ChangePasswordFormData } from './change-password.schema'
import { mandatoryPasswordChange } from '@/shared/api/auth.client'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function ChangePasswordForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: v.resolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    // Fluxo OBRIGATÓRIO: só `newPassword` — autorização é pelo claim
    // `mustChangePassword` da sessão atual (backend), nunca por flag do body.
    const result = await mandatoryPasswordChange({ newPassword: data.newPassword })

    if (result.status === 'success') {
      // O backend já reemitiu o access token (mustChangePassword=false) via
      // Set-Cookie na própria resposta deste endpoint — não é necessário (nem
      // correto) chamar refresh() aqui. `router.refresh()` revalida o layout
      // server (que lê o cookie já atualizado) antes de renderizar /dashboard.
      router.push('/dashboard')
      router.refresh()
      return
    }
    if (result.status === 'invalid') {
      setFormError('A nova senha não atende aos requisitos de segurança.')
      return
    }
    setFormError('Não foi possível trocar a senha agora. Tente novamente.')
  })

  const labelCls = 'mb-[6px] block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#4E7060]'
  const fieldErrorCls = 'mt-1 text-[11.5px] font-medium text-[#E5484D]'

  return (
    <form className="flex flex-col" onSubmit={onSubmit} noValidate>
      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 rounded-[10px] border border-[#E5484D]/40 bg-[#E5484D]/10 px-3 py-2 text-[12.5px] font-medium text-[#E5484D]"
        >
          {formError}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="new-password" className={labelCls}>
          Nova senha
        </label>
        <Input
          id="new-password"
          type="password"
          variant="brand"
          autoComplete="new-password"
          aria-invalid={errors.newPassword ? 'true' : 'false'}
          aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p id="new-password-error" role="alert" className={fieldErrorCls}>
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="confirm-password" className={labelCls}>
          Confirmar nova senha
        </label>
        <Input
          id="confirm-password"
          type="password"
          variant="brand"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" role="alert" className={fieldErrorCls}>
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" variant="brand" size="full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
      </Button>
    </form>
  )
}
