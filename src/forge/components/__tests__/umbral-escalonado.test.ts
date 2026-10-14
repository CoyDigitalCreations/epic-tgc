/**
 * Regresión — Tramos escalonados de Éter bloqueado (Capa 3b).
 *
 * Cassandra FB-016 rediseñada (sesión 2026-10-13) como carta piloto del
 * modelo de tramos — UN bloqueo "hasta" con recompensas por umbral:
 *   "Puedes bloquear hasta un máximo de 4 Éter (Max. 4). Con 2 Éteres
 *    bloqueados, cambia el agotamiento de 1 Campeón que controla el rival.
 *    Con 4 Éteres bloqueados, fija el agotamiento de un Campeón que controla
 *    el rival que esté agotado, mientras ese Éter esté bloqueado."
 *
 * El efecto raíz declara costo + objetivo base; los tramos aportan
 * efecto/duración/filtros. El texto no repite el prefijo de bloqueo.
 * Compatibilidad: efectos SIN tramos (umbral simple en CostoEfecto) no cambian.
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../../shared/types/cards'

describe('Tramos escalonados de Éter bloqueado (Card-Maker)', () => {
  const cassandra: EfectoData = {
    tipo: 'continuo',
    trigger: 'ninguno',
    costo: { tipo: 'eter_bloqueado', cantidad: 4 },
    objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
    duracion: 'mientras_ester_bloqueado',
    tramos: [
      { umbral: 2, efecto: 'toggle_exhaust', duracion: 'permanente' },
      { umbral: 4, efecto: 'fix_exhaust', filtros: { agotado: true } },
    ],
  }

  it('Cassandra: prefijo de bloqueo UNA sola vez, tramos como cláusulas propias', () => {
    const texto = generateEffectText(cassandra)
    expect(texto).toContain('bloquear hasta un máximo de 4 Éter (Max. 4)')
    // Cada cláusula con su umbral — sin repetir el prefijo de bloqueo
    expect(texto).toContain('con 2 Éteres bloqueados, cambia el agotamiento de')
    expect(texto).toContain('con 4 Éteres bloqueados, fija el agotamiento de')
    expect(texto).toContain('que esté agotado')
    expect(texto).toContain('mientras ese Éter esté bloqueado')
    // El prefijo NO se repite por tramo
    expect(texto.match(/bloquear hasta un máximo/g)?.length).toBe(1)
  })

  it('tramos se ordenan por umbral sin importar el orden del array', () => {
    const invertido: EfectoData = {
      ...cassandra,
      tramos: [...cassandra.tramos!].reverse(),
    }
    const texto = generateEffectText(invertido)
    const idx2 = texto.indexOf('con 2 Éteres')
    const idx4 = texto.indexOf('con 4 Éteres')
    expect(idx2).toBeGreaterThan(-1)
    expect(idx4).toBeGreaterThan(idx2)
  })

  it('tramo con duración propia vs heredada del raíz', () => {
    const texto = generateEffectText(cassandra)
    // Tramo 1: duración permanente propia
    expect(texto).toMatch(/cambia el agotamiento de[^.]*de forma permanente/)
    // Tramo 2: hereda la del raíz (mientras_ester_bloqueado)
    expect(texto).toMatch(/fija el agotamiento de[^.]*mientras ese Éter esté bloqueado/)
  })

  it('compatibilidad: umbral simple en CostoEfecto sin tramos no cambia', () => {
    const simple: EfectoData = {
      tipo: 'continuo',
      efecto: 'toggle_exhaust',
      trigger: 'ninguno',
      costo: { tipo: 'eter_bloqueado', cantidad: 4, umbral: 2 },
      objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
      duracion: 'permanente',
    }
    const texto = generateEffectText(simple)
    expect(texto).toContain('con 2 Éteres bloqueados')
    expect(texto).toContain('cambia el agotamiento de')
  })

  it('umbral 1 usa singular', () => {
    const uno: EfectoData = {
      ...cassandra,
      tramos: [{ umbral: 1, efecto: 'toggle_exhaust', duracion: 'permanente' }],
    }
    expect(generateEffectText(uno)).toContain('con 1 Éter bloqueado,')
  })
})
