import { TURNO_LABELS, TURNO_BADGE_VARIANT } from './turno.util'

describe('turno.util', () => {
  it('rotula os 3 turnos em português', () => {
    expect(TURNO_LABELS).toEqual({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' })
  })

  it('mapeia cada turno a uma variante de Badge distinta', () => {
    expect(TURNO_BADGE_VARIANT).toEqual({ manha: 'warning', tarde: 'info', noite: 'purple' })
  })
})
