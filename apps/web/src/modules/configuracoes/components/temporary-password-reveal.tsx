'use client'

import { useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { Button } from '@/shared/components/ui/button'

/**
 * Bloco de exibição única da senha temporária (criação/reset — tarefa 6.6):
 * texto legível para ditar/copiar, aviso de exibição única e ação de copiar
 * para a área de transferência. Não persiste o valor em nenhum lugar — o
 * chamador decide quando descartar (fechar o modal/drawer).
 */
export function TemporaryPasswordReveal({ value }: { value: string }) {
  const { c } = useTheme()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem `navigator.clipboard` disponível: o valor continua selecionável
      // manualmente (`userSelect: 'all'`) para copiar à mão.
    }
  }

  return (
    <div role="status" style={{ padding: '12px 14px', borderRadius: 10, background: c.glow, border: `1px solid ${c.glowB}` }}>
      <div style={{ fontSize: 11.5, color: c.muted, marginBottom: 6 }}>
        Senha temporária — exibida apenas agora, não será possível recuperá-la depois de fechar:
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <code style={{ fontSize: 14, fontWeight: 700, color: c.text, userSelect: 'all' }}>{value}</code>
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>
    </div>
  )
}
