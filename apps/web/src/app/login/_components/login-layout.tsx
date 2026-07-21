'use client'

import { useEffect, useRef, useState } from 'react'
import { AuthIllustration } from './auth-illustration'
import { LoginCard } from './login-card'
import { ThemeToggle } from '@/shared/components/ui/theme-toggle'

// Layout dividido: painel de marca (desktop) + card de login. Responsivo.
// O tema (claro/escuro) afeta apenas o painel direito, como no design original:
// segue a preferência do sistema até o usuário alternar manualmente.
export function LoginLayout({ expired = false }: { expired?: boolean }) {
  const [dark, setDark] = useState(true)
  const manual = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    if (!manual.current) setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      if (!manual.current) setDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    manual.current = true
    setDark((d) => !d)
  }

  return (
    <main className="flex min-h-screen w-full bg-[#050F09] font-[family-name:var(--font-inter)]">
      <AuthIllustration />

      <section
        className={`relative flex w-full items-center justify-center overflow-hidden px-7 py-6 transition-colors duration-300 lg:w-[42%] ${
          dark ? 'bg-[#07180F]' : 'bg-[#F0F5F2]'
        }`}
      >
        {/* Glow superior direito */}
        <div className="pointer-events-none absolute -right-[60px] -top-[80px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(0,199,115,0.08)_0%,transparent_68%)]" />

        <ThemeToggle dark={dark} onToggle={toggleTheme} className="absolute right-4 top-4 z-[5]" />

        <LoginCard dark={dark} expired={expired} />
      </section>
    </main>
  )
}
