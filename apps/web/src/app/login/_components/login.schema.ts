import { v, type VOResult } from '@/shared/form/validator'

// Value Objects locais para o schema de login. Mantidos no app (client-safe),
// pois `@bancaflow/shared` não expõe um `Username` e importar o pacote no
// bundle do client traria dependências server-only.

export const UsernameField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (raw.length < 3) return { isFailure: true, isOk: false, errors: ['USERNAME_TOO_SHORT'] }
    if (!/^[a-zA-Z0-9._-]+$/.test(raw)) {
      return { isFailure: true, isOk: false, errors: ['USERNAME_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

export const LoginPasswordField = {
  tryCreate(value: string): VOResult<string> {
    if (typeof value !== 'string' || value.length === 0) {
      return { isFailure: true, isOk: false, errors: ['PASSWORD_REQUIRED'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}

export const loginSchema = v.defineObject({
  username: UsernameField,
  password: LoginPasswordField,
})

export type LoginFormData = v.infer<typeof loginSchema>
