import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { evaluarPresupuesto } from './presupuesto'

/**
 * Calibración de CONFIG_V1 con los 20 Campeones reales (sin impuesto de efecto).
 * Fotografía del estado actual: si se retoca la config, este test dice qué
 * cartas cambian de lado. No decide qué es correcto; eso lo decide el diseño.
 */
describe('calibración de CONFIG_V1 con los Campeones del seed', () => {
  const { campeones } = cargarCartas(ALL_CARDS)
  const fuera = campeones
    .filter((c) => evaluarPresupuesto(c)?.fueraDeBanda)
    .map((c) => c.id)
    .sort()

  it('evalúa los 20 Campeones', () => {
    expect(campeones.map((c) => evaluarPresupuesto(c)).filter((e) => e !== null)).toHaveLength(20)
  })

  it('deja fuera de banda a Elena e Isolde, como se espera', () => {
    expect(fuera).toEqual(expect.arrayContaining(['FB-015', 'FB-014']))
  })

  it('deja dentro a Aurora, Ragnar, Vaela y Mira', () => {
    for (const id of ['FB-010', 'DS-010', 'FB-011', 'FB-012']) expect(fuera).not.toContain(id)
  })

  it('fuera de banda en total: las dos esperadas más cuatro cartas por suma baja (para decidir)', () => {
    // FB-013 Seraphina, DS-013 Varek, DS-014 Thane (coste 3, suma 7 < 8) y FB-016 Cassandra (coste 4, suma 8 < 9).
    expect(fuera).toEqual(['DS-013', 'DS-014', 'FB-013', 'FB-014', 'FB-015', 'FB-016'])
  })
})
