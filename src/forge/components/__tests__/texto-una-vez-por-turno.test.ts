/**
 * El texto que genera el Card-Maker dice «Una vez por turno» cuando el Bloqueo fijo lleva esa marca
 * (antes la casilla cambiaba el efecto pero el texto de la carta no).
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../../shared/types/cards'

const aurora: EfectoData = {
  tipo: 'continuo',
  efecto: 'steal_champion',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
  duracion: 'mientras_ester_bloqueado',
  costo: { tipo: 'bloqueo_fijo', cantidad: 4 },
}

describe('«Una vez por turno» en el texto del Bloqueo fijo', () => {
  it('con la marca, la cláusula del coste la incluye', () => {
    const texto = generateEffectText({ ...aurora, unaVezPorTurno: true })
    expect(texto).toMatch(/^Una vez por turno, bloquea 4 Éter,/)
  })

  it('sin la marca, el texto queda como siempre', () => {
    const texto = generateEffectText(aurora)
    expect(texto).toMatch(/^Bloquea 4 Éter,/)
    expect(texto).not.toMatch(/una vez por turno/i)
  })

  it('con un trigger, la marca va dentro de la cláusula del coste', () => {
    const texto = generateEffectText({ ...aurora, trigger: 'al_invocar', unaVezPorTurno: true })
    expect(texto).toContain('una vez por turno, bloquea 4 Éter,')
  })

  it('con el origen en Éter pagado, la zona se dice igual', () => {
    const texto = generateEffectText({ ...aurora, costo: { tipo: 'bloqueo_fijo', cantidad: 2, origen: 'pagado' }, unaVezPorTurno: true })
    expect(texto).toContain('Una vez por turno, bloquea 2 Éter desde la zona de éter pagado,')
  })
})
