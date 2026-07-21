import { BrandHeader } from './brand-header'
import { LoginForm } from './login-form'

// Card de login (painel direito). Estilo depende do tema recebido do layout.
export function LoginCard({ dark, expired = false }: { dark: boolean; expired?: boolean }) {
  return (
    <div
      className={`relative z-[2] w-full max-w-[380px] rounded-[20px] px-7 pb-6 pt-7 transition-colors duration-300 ${
        dark
          ? 'border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] shadow-[0_28px_72px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'border border-[rgba(0,0,0,0.07)] bg-white shadow-[0_14px_48px_rgba(0,0,0,0.09)]'
      }`}
    >
      <BrandHeader dark={dark} />
      <LoginForm dark={dark} expired={expired} />

      <div
        className={`text-center text-[12px] ${dark ? 'text-[#2E5045]' : 'text-[#9AADA6]'}`}
      >
        Não tem acesso?{' '}
        <a
          href="#"
          className={`font-semibold no-underline transition-colors ${
            dark ? 'text-[#00C773] hover:text-[#00FF99]' : 'text-[#009966] hover:text-[#006644]'
          }`}
        >
          Fale com o administrador.
        </a>
      </div>
    </div>
  )
}
