'use client'

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

// Paleta de cores por tema, extraída fielmente do design (BancaFlow *.dc.html).
// Fonte única de verdade: tanto os consumidores legados (estilo inline via `c`,
// em migração na Fase 6) quanto as primitives do design system (`Button`,
// `Input`, `Table`, `Dialog`, `Badge` — via as CSS custom properties abaixo)
// leem os MESMOS valores, nunca duplicados.
export type ThemeColors = {
  bg: string
  navBg: string
  navBorder: string
  sbBg: string
  sbBorder: string
  card: string
  cardB: string
  cardBL: string
  dropdownBg: string
  text: string
  sub: string
  muted: string
  green: string
  glow: string
  glowB: string
  shadow: string
  btn: string
  hover: string
  mHover: string
  mActive: string
  mActiveBorder: string
  mActiveText: string
  mText: string
}

const DARK: ThemeColors = {
  bg: '#06110D',
  navBg: 'rgba(6,17,13,0.95)',
  navBorder: 'rgba(0,199,115,0.11)',
  sbBg: '#07140D',
  sbBorder: 'rgba(0,199,115,0.1)',
  card: 'rgba(255,255,255,0.04)',
  cardB: 'rgba(255,255,255,0.08)',
  cardBL: 'rgba(255,255,255,0.04)',
  dropdownBg: '#0D2318',
  text: '#F0F5F2',
  sub: '#8BA89A',
  muted: '#4A6658',
  green: '#00C773',
  glow: 'rgba(0,199,115,0.11)',
  glowB: 'rgba(0,199,115,0.24)',
  shadow: 'rgba(0,199,115,0.18)',
  btn: 'rgba(255,255,255,0.06)',
  hover: 'rgba(255,255,255,0.03)',
  mHover: 'rgba(0,199,115,0.08)',
  mActive: 'rgba(0,199,115,0.12)',
  mActiveBorder: '#00C773',
  mActiveText: '#00C773',
  mText: '#8BA89A',
}

const LIGHT: ThemeColors = {
  bg: '#F4F7F5',
  navBg: 'rgba(255,255,255,0.95)',
  navBorder: 'rgba(0,0,0,0.08)',
  sbBg: '#FFFFFF',
  sbBorder: 'rgba(0,0,0,0.08)',
  card: '#FFFFFF',
  cardB: 'rgba(0,0,0,0.07)',
  cardBL: 'rgba(0,0,0,0.04)',
  dropdownBg: '#FFFFFF',
  text: '#1B1F1D',
  sub: '#5B645F',
  muted: '#9AADA6',
  green: '#009966',
  glow: 'rgba(0,153,102,0.08)',
  glowB: 'rgba(0,153,102,0.2)',
  shadow: 'rgba(0,153,102,0.15)',
  btn: 'rgba(0,0,0,0.04)',
  hover: 'rgba(0,0,0,0.025)',
  mHover: 'rgba(0,153,102,0.07)',
  mActive: 'rgba(0,153,102,0.1)',
  mActiveBorder: '#009966',
  mActiveText: '#009966',
  mText: '#6B7B73',
}

type ThemeContextValue = {
  dark: boolean
  c: ThemeColors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Mapeia a paleta `ThemeColors` para as CSS custom properties consumidas pelas
 * primitives do design system (`--primary`, `--background`, etc. — ver
 * `globals.css`). Só os campos genéricos/reutilizáveis são promovidos; tokens
 * específicos do shell (nav/sidebar/menu) permanecem em `c`, consumidos como
 * antes por estilo inline nos componentes de shell.
 */
function toDesignTokens(c: ThemeColors): Record<string, string> {
  return {
    '--background': c.bg,
    '--foreground': c.text,
    '--card': c.card,
    '--card-foreground': c.text,
    '--popover': c.dropdownBg,
    '--popover-foreground': c.text,
    '--border': c.cardB,
    '--input': c.cardB,
    '--ring': c.glowB,
    '--primary': c.green,
    '--primary-foreground': '#FFFFFF',
    '--secondary': c.btn,
    '--secondary-foreground': c.text,
    '--accent': c.mHover,
    '--accent-foreground': c.text,
    '--muted-foreground': c.sub,
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(true)
  const value = useMemo<ThemeContextValue>(
    () => ({ dark, c: dark ? DARK : LIGHT, toggleTheme: () => setDark((d) => !d) }),
    [dark],
  )

  // Os tokens são aplicados em `document.documentElement`, não em um wrapper
  // local: portals Radix (Dialog/Drawer/Select) montam em `document.body`,
  // fora da subárvore React desta provider, e só herdam CSS custom properties
  // definidas no documento. `:root` em `globals.css` cobre o primeiro paint
  // (tema escuro, o default atual) até este efeito rodar.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = dark ? 'dark' : 'light'
    for (const [property, tokenValue] of Object.entries(toDesignTokens(value.c))) {
      root.style.setProperty(property, tokenValue)
    }
  }, [dark, value.c])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>')
  return ctx
}
