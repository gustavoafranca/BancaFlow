import { ChangePasswordForm } from './change-password-form'

// Tela de troca obrigatória de senha. Rota fora do grupo `(private)` para não
// entrar em loop com o proxy (que redireciona `mustChangePassword` para cá).
export default function TrocarSenhaPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#050F09] px-6 py-10 font-[family-name:var(--font-inter)]">
      <div className="w-full max-w-[420px] rounded-[20px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-7 pb-7 pt-8 shadow-[0_28px_72px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <h1 className="mb-1 text-[20px] font-bold text-[#EDF5F0]">Defina uma nova senha</h1>
        <p className="mb-6 text-[13px] text-[#7FA090]">
          Por segurança, é necessário trocar a senha antes de continuar.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  )
}
