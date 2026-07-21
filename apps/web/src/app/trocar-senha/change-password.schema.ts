import { v } from '@/shared/form/validator'
import { StrongPasswordField, ConfirmPasswordField } from '@/shared/form/password-fields'

export const changePasswordSchema = v
  .defineObject({
    newPassword: StrongPasswordField,
    confirmPassword: ConfirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    field: 'confirmPassword',
  })

export type ChangePasswordFormData = v.infer<typeof changePasswordSchema>
