import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarConImpuesto, evaluarPresupuesto } from './presupuesto'
import { CARTAS_DS_ANTES, CARTAS_ELENA_32 } from './test/cartasReales'

/**
 * Calibración de CONFIG_V1 con los 20 Campeones reales (sin impuesto de efecto).
 * Fotografía del estado actual: si se retoca la config, este test dice qué
 * cartas cambian de lado. No decide qué es correcto; eso lo decide el diseño.
 *
 * Las bandas son las v1.1 de la tabla de diseño (coste 2 = 5-6 con tope 4, coste 3 = 6-8
 * con tope 5, coste 4 = 8-10 con tope 7). Las cartas del seed todavía no se rediseñan,
 * así que casi todo el coste 2 (suma 7-8) queda sobre el máximo de 6: es lo esperado.
 *
 * Rediseño de Estásis (stats aprobados): Vaela 5/2, Mira 3/4 y Seraphina 4/3 pasan a coste 3 (suma 7), Isolde a 3/6 coste 4,
 * Elena a 3/2 (luego 4/2) y Titania a 3/3 coste 2. Con Elena en 4/2 (suma 6, el mínimo del coste 3) ningún Campeón de Estásis queda
 * fuera de banda; los cuatro fuera eran de Disonancia (congelada hasta su propio rediseño). La Elena de antes (3/2, «bajo»)
 * se conserva en un caso aparte con CARTAS_ELENA_32.
 * Rediseño de Disonancia (Lote 2: Kael 4/2, Draven 3/3, Emisario 3/3, Marek 4/3, Korr 4/4…): sin impuesto ningún Campeón sale de
 * banda; los cuatro de antes (Kael, Draven, Emisario, Marek) se conservan en un caso aparte con CARTAS_DS_ANTES.
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

  it('Elena 4/2 (suma 6) e Isolde 3/6 coste 4 caben en la banda; la Elena de antes (3/2) sí salía «bajo»', () => {
    expect(fuera).not.toContain('FB-015')
    expect(fuera).not.toContain('FB-014')
    const antes = CARTAS_ELENA_32.filter((c) => c.tipo === 'Campeón')
      .filter((c) => evaluarPresupuesto(c)?.fueraDeBanda)
      .map((c) => c.id)
    expect(antes).toContain('FB-015')
  })

  it('deja dentro a Aurora y Ragnar (exentos) y a los de coste 3-4 que ya cumplen la banda v1.1', () => {
    // Seraphina, Varek y Thane (coste 3, suma 7) y Cassandra (coste 4, suma 8) ahora caben: antes eran «bajo».
    for (const id of ['FB-010', 'DS-010', 'FB-013', 'DS-013', 'DS-014', 'FB-016']) expect(fuera).not.toContain(id)
  })

  it('Vaela y Mira (ahora coste 3, suma 7) ya no pasan el máximo: caben en la banda v1.1 (6-8); Titania 3/3 coste 2 también', () => {
    for (const id of ['FB-011', 'FB-012', 'FB-031']) expect(fuera).not.toContain(id)
  })

  it('con la Disonancia rediseñada (Lote 2) ningún Campeón del seed sale de banda sin impuesto', () => {
    expect(fuera).toEqual([])
  })

  it('la Disonancia de antes: 4 cartas, tres de coste 2 sobre el máximo (Kael, Draven, Emisario) y Marek (sobre)', () => {
    // Coste 2 (suma 7-8 > 6): DS-011 Kael 5/3, DS-012 Draven 4/4, DS-031 Emisario 4/3. Coste 3: DS-015 Marek 5/4 (suma 9 > 8).
    const antes = CARTAS_DS_ANTES.filter((c) => c.tipo === 'Campeón' && evaluarPresupuesto(c)?.fueraDeBanda).map((c) => c.id).sort()
    expect(antes).toEqual(['DS-011', 'DS-012', 'DS-015', 'DS-031'])
  })
})

/**
 * Segunda fotografía: los mismos 20 Campeones, ahora CON el impuesto de efecto
 * (franquicia: se paga lo que el índice de poder pasa del umbral 2, × 0.5, máx. 3).
 * Con el impuesto lineal anterior (índice × 0.5) salían 10 fuera con las bandas v1.0; con el
 * umbral solo pagan los efectos fuertes (Draven, Kael, Marek, Isolde).
 * Con las bandas v1.1 el impuesto ya no cambia el conjunto: las mismas 9 cartas salen fuera
 * con y sin impuesto, porque las del coste 2 ya se pasan del máximo de 6 por sí solas.
 */
describe('calibración de CONFIG_V1 con impuesto de efecto', () => {
  const { campeones } = cargarCartas(ALL_CARDS)
  const idsFuera = (cfg = CONFIG_V1, pool = campeones) =>
    pool
      .filter((c) => evaluarConImpuesto(c, cfg)?.fueraDeBanda)
      .map((c) => c.id)
      .sort()

  // Intención cambiada con el tope de costo del 50 %: Isolde (índice 4.00 a 4.75, impuesto 1.0 a 1.4) ya no llega a su suma 9
  // y sale por encima; los otros 4 son los mismos de siempre. Sin impuesto sigue dentro (ver el describe anterior).
  it('con impuesto con umbral solo sale fuera Isolde (la Disonancia rediseñada cabe en banda)', () => {
    expect(idsFuera()).toEqual(['FB-014'])
  })

  it('con la Disonancia de antes salían 5: los 4 de siempre más Isolde, con las bandas v1.1', () => {
    const antes = CARTAS_DS_ANTES.filter((c) => c.tipo === 'Campeón')
    expect(idsFuera(CONFIG_V1, antes)).toEqual(['DS-011', 'DS-012', 'DS-015', 'DS-031', 'FB-014'])
  })

  it('Aurora y Ragnar siguen exentos aunque su índice de poder es el más alto', () => {
    expect(idsFuera()).not.toContain('FB-010')
    expect(idsFuera()).not.toContain('DS-010')
  })

  it('subir el piso del coste 3 a 8 deja fuera también a Vaela, Mira, Seraphina, Varek, Thane y Marek (suma 7)', () => {
    // La «opción A como piso» de la v1.0 (coste 3 = 7, coste 4 = 8) ya no aplica: la v1.1 trae
    // mínimos de 6 y 8. Se conserva la misma intención: un piso más alto mete cartas a «bajo».
    const conPiso = structuredClone(CONFIG_V1)
    conPiso.bandas[3].sumaMin = 8
    // Con la Disonancia rediseñada (Kael y Draven de coste 2 ya no salen; Marek 4/3 y Emisario 4/3 son de coste 3, suma 7)
    expect(idsFuera(conPiso)).toEqual([
      'DS-013',
      'DS-014',
      'DS-015',
      'DS-031',
      'FB-011',
      'FB-012',
      'FB-013',
      'FB-014',
      'FB-015',
    ])
  })
})
