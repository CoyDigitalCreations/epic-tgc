import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarConImpuesto, evaluarPresupuesto } from './presupuesto'

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

/**
 * Segunda fotografía: los mismos 20 Campeones, ahora CON el impuesto de efecto
 * (franquicia: se paga lo que el índice de poder pasa del umbral 2, × 0.5, máx. 3).
 * Con el impuesto lineal anterior (índice × 0.5) salían 10 fuera, incluso Vaela y
 * Mira (índice 1.5, banda 7-8 menos 0.8); con el umbral esos efectos menores ya
 * no pagan y solo pagan los efectos fuertes (Draven, Kael, Marek, Isolde).
 * Las bandas y topes siguen sin tocarse: queda pendiente la matriz de letalidad.
 */
describe('calibración de CONFIG_V1 con impuesto de efecto', () => {
  const { campeones } = cargarCartas(ALL_CARDS)
  const idsFuera = (cfg = CONFIG_V1) =>
    campeones
      .filter((c) => evaluarConImpuesto(c, cfg)?.fueraDeBanda)
      .map((c) => c.id)
      .sort()

  it('con impuesto con umbral salen fuera 8 Campeones (6 sin impuesto, 10 con el impuesto lineal)', () => {
    expect(idsFuera()).toEqual([
      'DS-011',
      'DS-012',
      'DS-013',
      'DS-014',
      'FB-013',
      'FB-014',
      'FB-015',
      'FB-016',
    ])
  })

  it('Aurora y Ragnar siguen exentos aunque su índice de poder es el más alto', () => {
    expect(idsFuera()).not.toContain('FB-010')
    expect(idsFuera()).not.toContain('DS-010')
  })

  it('opción A como piso (sumaMin coste 3 = 7 y coste 4 = 8) deja 4 fuera con impuesto', () => {
    const conPiso = structuredClone(CONFIG_V1)
    conPiso.bandas[3].sumaMin = 7
    conPiso.bandas[4].sumaMin = 8
    expect(idsFuera(conPiso)).toEqual(['DS-011', 'DS-012', 'FB-014', 'FB-015'])
  })
})
