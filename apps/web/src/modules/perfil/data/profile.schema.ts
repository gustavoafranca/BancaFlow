import { v, type VOResult } from '@/shared/form/validator'

// Value Objects locais para o schema de edição de perfil, espelhando as
// regras de `PersonName`/`Email` de `@bancaflow/shared` (mesmo padrão de
// `login.schema.ts`/`change-password.schema.ts`: client-safe, sem arrastar o
// pacote de domínio para o bundle). A validação AUTORITATIVA continua no
// Backend (`UpdateOwnProfileUseCase`); esta é só feedback imediato de UX.

const NAME_MIN = 3
const NAME_MAX = 50
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'`´^~\- ]+$/

export const ProfileNameField = {
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

export const ProfileEmailField = {
  tryCreate(value: string): VOResult<string> {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!EMAIL_REGEX.test(raw)) {
      return { isFailure: true, isOk: false, errors: ['EMAIL_INVALID'] }
    }
    return { isFailure: false, isOk: true, instance: { value: raw } }
  },
}

export const profileSchema = v.defineObject({
  name: ProfileNameField,
  email: { vo: ProfileEmailField, optional: true },
})

export type ProfileFormData = v.infer<typeof profileSchema>
