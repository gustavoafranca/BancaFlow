import { v, type VOResult } from '@/shared/form/validator'

// Value Objects locais para os formulários de criação/edição de conta em
// Configurações → Usuários, espelhando as regras de `Username`/`PersonName`/
// `Email` já usadas nos demais schemas do app (`login.schema.ts`,
// `profile.schema.ts`) — client-safe, sem arrastar pacotes server-only para o
// bundle. A validação AUTORITATIVA continua no Backend; isto é só feedback
// imediato de UX.

const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/

export const AccountUsernameField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (!USERNAME_REGEX.test(raw.toLowerCase())) {
      return { isFailure: true, isOk: false, errors: ['USERNAME_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

const NAME_MIN = 3
const NAME_MAX = 50
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'`´^~\- ]+$/

export const AccountNameField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim() : ''
    if (raw.length < NAME_MIN || raw.length > NAME_MAX) {
      return { isFailure: true, isOk: false, errors: ['NAME_INVALID_LENGTH'] }
    }
    const words = raw.split(/\s+/).filter((w) => w.length > 0)
    if (words.length < 2 || words[0]!.length < 2 || words[words.length - 1]!.length < 2) {
      return { isFailure: true, isOk: false, errors: ['NAME_MUST_HAVE_FIRST_AND_LAST_NAME'] }
    }
    if (!NAME_REGEX.test(raw)) {
      return { isFailure: true, isOk: false, errors: ['NAME_MUST_HAVE_FIRST_AND_LAST_NAME'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const AccountEmailField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!EMAIL_REGEX.test(raw)) {
      return { isFailure: true, isOk: false, errors: ['EMAIL_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

export const AccountRoleField = {
  tryCreate(value: 'ADMIN' | 'USER'): VOResult<'ADMIN' | 'USER'> {
    if (value !== 'ADMIN' && value !== 'USER') {
      return { isFailure: true, isOk: false, errors: ['ROLE_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value } }
  },
}

export const createUserAccountSchema = v.defineObject({
  username: AccountUsernameField,
  name: AccountNameField,
  email: { vo: AccountEmailField, optional: true },
  role: AccountRoleField,
})

export type CreateUserAccountFormData = v.infer<typeof createUserAccountSchema>

export const editUserAccountSchema = v.defineObject({
  username: AccountUsernameField,
  name: AccountNameField,
  email: { vo: AccountEmailField, optional: true },
})

export type EditUserAccountFormData = v.infer<typeof editUserAccountSchema>
