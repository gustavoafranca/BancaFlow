export type DeviceKind = 'desktop' | 'mobile' | 'unknown'

export interface DeviceLabel {
  label: string
  kind: DeviceKind
}

const FALLBACK_LABEL = 'Dispositivo não identificado'

const BROWSERS: Array<{ match: RegExp; name: string }> = [
  { match: /edg\//i, name: 'Edge' },
  { match: /chrome\//i, name: 'Chrome' },
  { match: /firefox\//i, name: 'Firefox' },
  { match: /safari\//i, name: 'Safari' },
]

const PLATFORMS: Array<{ match: RegExp; name: string; kind: DeviceKind }> = [
  { match: /iphone/i, name: 'iPhone', kind: 'mobile' },
  { match: /ipad/i, name: 'iPad', kind: 'mobile' },
  { match: /android/i, name: 'Android', kind: 'mobile' },
  { match: /windows/i, name: 'Windows', kind: 'desktop' },
  { match: /mac os|macintosh/i, name: 'macOS', kind: 'desktop' },
  { match: /linux/i, name: 'Linux', kind: 'desktop' },
]

/**
 * Deriva um rótulo amigável de dispositivo a partir do `deviceInfo` bruto
 * (user-agent) já persistido — apresentação pura, sem nova fonte de verdade.
 * Quando ausente ou não reconhecido pela heurística, usa um fallback honesto
 * em vez de inventar um nome de dispositivo (design.md, Decisão D3).
 */
export function deviceLabelFrom(deviceInfo?: string | null): DeviceLabel {
  if (!deviceInfo || !deviceInfo.trim()) {
    return { label: FALLBACK_LABEL, kind: 'unknown' }
  }

  const browser = BROWSERS.find((b) => b.match.test(deviceInfo))
  const platform = PLATFORMS.find((p) => p.match.test(deviceInfo))

  if (!browser && !platform) {
    return { label: FALLBACK_LABEL, kind: 'unknown' }
  }

  const kind = platform?.kind ?? 'desktop'
  if (browser && platform) {
    return { label: `${browser.name} no ${platform.name}`, kind }
  }
  if (browser) {
    return { label: browser.name, kind }
  }
  return { label: platform!.name, kind }
}
