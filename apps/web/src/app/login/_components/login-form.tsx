'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { v } from '@/shared/form/validator'
import { loginSchema, type LoginFormData } from './login.schema'
import { login } from '@/shared/api/auth.client'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

// Formulário de login. Campos com ícone, alternância de visibilidade da senha
// e botão primário com gradiente/shine. Estilo depende do tema recebido.
export function LoginForm({ dark, expired = false }: { dark: boolean; expired?: boolean }) {
  const router = useRouter()
  const [passVisible, setPassVisible] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [expiredNotice, setExpiredNotice] = useState(expired)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: v.resolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    setExpiredNotice(false)
    const result = await login({ username: data.username, password: data.password })

    switch (result.status) {
      case 'success':
        router.push(result.mustChangePassword ? '/trocar-senha' : '/dashboard')
        router.refresh()
        return
      case 'invalid_credentials':
      case 'invalid_banca':
        // Mensagem genérica: não revela existência de conta ou banca.
        setFormError('Usuário ou senha inválidos.')
        return
      case 'account_locked':
        setFormError(
          'Conta temporariamente bloqueada por tentativas de acesso. Tente novamente mais tarde.',
        )
        return
      default:
        setFormError('Não foi possível entrar agora. Tente novamente.')
    }
  })

  const labelCls = `mb-[6px] block text-[11px] font-semibold uppercase tracking-[0.05em] ${
    dark ? 'text-[#4E7060]' : 'text-[#5B6A62]'
  }`

  const fieldErrorCls = 'mt-1 text-[11.5px] font-medium text-[#E5484D]'

  return (
    <form className="flex flex-col" onSubmit={onSubmit} noValidate>
      {expiredNotice && (
        <div
          role="status"
          className="mb-3 rounded-[10px] border border-[#F5A623]/40 bg-[#F5A623]/10 px-3 py-2 text-[12.5px] font-medium text-[#B4740A]"
        >
          Sua sessão expirou. Entre novamente para continuar.
        </div>
      )}

      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 rounded-[10px] border border-[#E5484D]/40 bg-[#E5484D]/10 px-3 py-2 text-[12.5px] font-medium text-[#E5484D]"
        >
          {formError}
        </div>
      )}

      {/* Usuário */}
      <div className="mb-3">
        <label htmlFor="login-username" className={labelCls}>
          Usuário
        </label>
        <Input
          id="login-username"
          type="text"
          variant="brand"
          dark={dark}
          autoComplete="username"
          placeholder="seu.usuario"
          aria-invalid={errors.username ? 'true' : 'false'}
          aria-describedby={errors.username ? 'login-username-error' : undefined}
          leftIcon={
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9AADA6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          {...register('username')}
        />
        {errors.username && (
          <p id="login-username-error" role="alert" className={fieldErrorCls}>
            {errors.username.message}
          </p>
        )}
      </div>

      {/* Senha */}
      <div className="mb-3">
        <label htmlFor="login-password" className={labelCls}>
          Senha
        </label>
        <Input
          id="login-password"
          type={passVisible ? 'text' : 'password'}
          variant="brand"
          dark={dark}
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          leftIcon={
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9AADA6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
          rightSlot={
            <button
              type="button"
              onClick={() => setPassVisible((val) => !val)}
              aria-label={passVisible ? 'Ocultar senha' : 'Mostrar senha'}
              className="opacity-40 transition-opacity hover:opacity-75"
            >
              {passVisible ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9AADA6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9AADA6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          }
          {...register('password')}
        />
        {errors.password && (
          <p id="login-password-error" role="alert" className={fieldErrorCls}>
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Entrar */}
      <Button type="submit" variant="brand" size="full" disabled={isSubmitting} className="mb-3 mt-1">
        {isSubmitting ? 'Entrando...' : 'Entrar'}
        {!isSubmitting && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        )}
      </Button>
    </form>
  )
}
