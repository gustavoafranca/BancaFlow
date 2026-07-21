'use client'

// Alternância de tema controlada — primitive única do design system (tarefa
// 4.2). Substitui as 3 implementações antigas: o stub órfão que existia neste
// mesmo caminho (`shared/components/ui/theme-toggle.tsx`), a versão usada em
// `login-layout.tsx` (agora migrada para importar daqui) e os dois toggles
// hand-rolled inline em `(private)/_shell/app-navbar.tsx` (consolidados na
// Fase 5, junto da fiação da sessão real).
//
// Deliberadamente controlado (props `dark`/`onToggle`, sem acoplar a um
// provider específico): tanto o `ThemeProvider` de `shared/theme` (área
// privada) quanto o estado local de tema das telas de auth (que segue
// `prefers-color-scheme` até alternância manual) podem reutilizá-lo.
type ThemeToggleProps = {
  dark: boolean
  onToggle: () => void
  className?: string
}

export function ThemeToggle({ dark, onToggle, className = '' }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Alternar tema"
      aria-label="Alternar tema"
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full transition-transform duration-200 hover:rotate-[20deg] hover:scale-110 ${
        dark ? 'bg-[rgba(255,255,255,0.08)] text-[#7A9E8E]' : 'bg-[rgba(0,0,0,0.07)] text-[#5B6A62]'
      } ${className}`}
    >
      {dark ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
