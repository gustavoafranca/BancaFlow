import type { ReactNode } from 'react'
import { ConfiguracoesLayout } from '@/modules/configuracoes'

export default function Layout({ children }: { children: ReactNode }) {
  return <ConfiguracoesLayout>{children}</ConfiguracoesLayout>
}
