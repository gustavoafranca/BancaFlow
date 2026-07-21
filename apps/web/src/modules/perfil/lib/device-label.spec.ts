import { deviceLabelFrom } from './device-label'

describe('deviceLabelFrom', () => {
  it('reconhece navegador + plataforma desktop', () => {
    expect(
      deviceLabelFrom('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'),
    ).toEqual({ label: 'Chrome no Windows', kind: 'desktop' })
  })

  it('reconhece navegador + plataforma mobile', () => {
    expect(
      deviceLabelFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'),
    ).toEqual({ label: 'Safari no iPhone', kind: 'mobile' })
  })

  it('reconhece somente a plataforma quando o navegador não é identificado', () => {
    expect(deviceLabelFrom('curl/8.0 (Macintosh; Intel Mac OS X)')).toEqual({
      label: 'macOS',
      kind: 'desktop',
    })
  })

  it('usa fallback honesto quando deviceInfo está ausente', () => {
    expect(deviceLabelFrom(undefined)).toEqual({ label: 'Dispositivo não identificado', kind: 'unknown' })
    expect(deviceLabelFrom(null)).toEqual({ label: 'Dispositivo não identificado', kind: 'unknown' })
    expect(deviceLabelFrom('')).toEqual({ label: 'Dispositivo não identificado', kind: 'unknown' })
  })

  it('usa fallback honesto quando deviceInfo não é reconhecido pela heurística', () => {
    expect(deviceLabelFrom('some-unrecognized-agent-string-123')).toEqual({
      label: 'Dispositivo não identificado',
      kind: 'unknown',
    })
  })
})
