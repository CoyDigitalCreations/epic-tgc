import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarConImpuesto, evaluarPresupuesto, impuestoDe } from './presupuesto'
import { poderDeCarta } from './poderEfecto'
import type { CartaBalance, ConfigBalance } from './tipos'
import { legadoDS } from './test/cartasReales'

const { cartas } = cargarCartas(ALL_CARDS)
const carta = (id: string): CartaBalance => {
  const c = cartas.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

/** Campeón sintético normal para los bordes. */
const campeon = (coste: number, atq: number, res: number): CartaBalance => ({
  id: 'T-001',
  nombre: 'Prueba',
  tipo: 'Campeón',
  rareza: 'Común',
  coste,
  mazo: 'estasis',
  roles: ['Normal'],
  stats: { atq, res },
  keywords: [],
  efectos: [],
})

describe('evaluarPresupuesto con el seed real', () => {
  it('S3.1: Seraphina 4/3 y Thane 3/4 (coste 3, suma 7) están dentro de banda', () => {
    for (const id of ['FB-013', 'DS-014']) {
      const ev = evaluarPresupuesto(carta(id))
      expect(ev?.suma).toBe(7)
      expect(ev?.fueraDeBanda).toBe(false)
      expect(ev?.estado).toBe('dentro')
    }
  })

  // Rediseño de Estásis: Vaela 5/2 y Mira 3/4 pasan a coste 3 (suma 7) y caben en la banda 6-8. La intención «una carta de coste
  // bajo pasa el máximo» la conserva Kael (DS-011, coste 2, 5/3, suma 8 > 6).
  it('S3.1b: Vaela 5/2 y Mira 3/4 (coste 3, suma 7) caben en la banda v1.1; Kael 5/3 (coste 2, suma 8) pasa el máximo de 6', () => {
    for (const id of ['FB-011', 'FB-012']) {
      const ev = evaluarPresupuesto(carta(id))
      expect(ev?.suma).toBe(7)
      expect(ev?.banda.sumaMax).toBe(8)
      expect(ev?.estado).toBe('dentro')
      expect(ev?.fueraDeBanda).toBe(false)
    }
    // Kael de antes (5/3, coste 2): con el rediseño de Disonancia (Lote 2) es 4/2 (suma 6) y ya cabe en banda
    const kael = evaluarPresupuesto(legadoDS('Kael'))
    expect(kael?.suma).toBe(8)
    expect(kael?.banda.sumaMax).toBe(6)
    expect(kael?.estado).toBe('sobre')
    expect(kael?.fueraDeBanda).toBe(true)
  })

  // Rediseño de Estásis: Elena pasa a 3/2 y luego a 4/2 (suma 6, ya dentro; el caso «bajo» usa la Elena 3/2 de antes) e Isolde a 3/6 coste 4 (ya cabe). El caso «exceso del tope de RES»
  // que cubría Isolde 3/7 lo toma una carta sintética de coste 3 con RES 6 (tope 5) para no perder la aserción.
  it('S3.2: Elena 3/2 (de antes) queda por debajo y la real 4/2 cabe; Isolde 3/6 (coste 4) cabe; un RES sobre el tope pasa el tope de RES', () => {
    const real = evaluarPresupuesto(carta('FB-015'))
    expect(real?.suma).toBe(6)
    expect(real?.fueraDeBanda).toBe(false)
    expect(real?.estado).toBe('dentro')

    const elena = evaluarPresupuesto({ ...carta('FB-015'), stats: { atq: 3, res: 2 } })
    expect(elena?.suma).toBe(5)
    expect(elena?.fueraDeBanda).toBe(true)
    expect(elena?.estado).toBe('bajo')

    const isolde = evaluarPresupuesto(carta('FB-014'))
    expect(isolde?.suma).toBe(9)
    expect(isolde?.excesoRes).toBe(0)
    expect(isolde?.fueraDeBanda).toBe(false)

    const sobreTope = evaluarPresupuesto({ ...carta('FB-014'), coste: 3, stats: { atq: 3, res: 7 } })
    expect(sobreTope?.suma).toBe(10)
    expect(sobreTope?.excesoRes).toBe(2)
    expect(sobreTope?.fueraDeBanda).toBe(true)
  })

  it('S3.3: Aurora y Ragnar 9/9 quedan dentro por excepción contra el tope propio', () => {
    for (const id of ['FB-010', 'DS-010']) {
      const ev = evaluarPresupuesto(carta(id))
      expect(ev?.exento).toBe(true)
      expect(ev?.banda.sumaMax).toBe(CONFIG_V1.excepciones.tope.suma)
      expect(ev?.fueraDeBanda).toBe(false)
    }
  })
})

describe('evaluarPresupuesto en los bordes', () => {
  it('S3.4: marca el exceso de tope individual de ATQ aunque la suma esté en banda', () => {
    // Coste 3: banda 6-8, tope ATQ 5. 6/1 suma 7 pero ATQ sobre el tope.
    const ev = evaluarPresupuesto(campeon(3, 6, 1))
    expect(ev?.estado).toBe('dentro')
    expect(ev?.excesoAtq).toBe(1)
    expect(ev?.excesoRes).toBe(0)
    expect(ev?.fueraDeBanda).toBe(true)
  })

  it('marca «sobre» cuando la suma pasa el máximo', () => {
    // Coste 2: máximo 6. 3/4 suma 7.
    const ev = evaluarPresupuesto(campeon(2, 3, 4))
    expect(ev?.estado).toBe('sobre')
    expect(ev?.desvio).toBe(1)
    expect(ev?.fueraDeBanda).toBe(true)
  })

  it('S3.5: las cartas que no son Campeón no tienen banda por stats', () => {
    for (const tipo of ['Éter', 'Mística', 'Arcana', 'Vínculo'] as const) {
      expect(evaluarPresupuesto({ ...campeon(1, 0, 0), tipo, stats: null })).toBeNull()
    }
  })

  it('un Campeón sin stats no tiene evaluación', () => {
    expect(evaluarPresupuesto({ ...campeon(2, 0, 0), stats: null })).toBeNull()
  })

  it('un coste sin banda definida no tiene evaluación', () => {
    // Las bandas v1.1 cubren costes 1-10; no existen cartas de coste mayor.
    expect(evaluarPresupuesto(campeon(11, 5, 5))).toBeNull()
  })

  it('calcula los puntos de stats con los pesos de la config', () => {
    const ev = evaluarPresupuesto(campeon(2, 4, 4))
    expect(ev?.puntos).toBe(4 * CONFIG_V1.pesos.atq + 4 * CONFIG_V1.pesos.res)
  })

  it('el impuesto rebaja la suma objetivo y el mínimo de la banda', () => {
    const sin = evaluarPresupuesto(campeon(3, 4, 4))
    const con = evaluarPresupuesto(campeon(3, 4, 4), CONFIG_V1, 2)
    expect(sin?.estado).toBe('dentro')
    expect(con?.objetivoSuma).toBe((sin?.objetivoSuma ?? 0) - 2)
    expect(con?.estado).toBe('sobre')
  })
})

describe('evaluarPresupuesto es configurable', () => {
  it('S1.1: Elena (la de antes, 3/2) pasa de fuera a dentro al cambiar la banda de coste 3', () => {
    const elena: CartaBalance = { ...carta('FB-015'), stats: { atq: 3, res: 2 } }
    expect(evaluarPresupuesto(elena)?.fueraDeBanda).toBe(true)
    const cfg: ConfigBalance = {
      ...CONFIG_V1,
      bandas: { ...CONFIG_V1.bandas, 3: { sumaMin: 3, sumaMax: 10, topeAtq: 6, topeRes: 6 } },
    }
    expect(evaluarPresupuesto(elena, cfg)?.fueraDeBanda).toBe(false)
  })

  it('es determinista', () => {
    expect(evaluarPresupuesto(carta('FB-014'))).toEqual(evaluarPresupuesto(carta('FB-014')))
  })
})

/** Efecto fuerte de prueba: destroy sin costo ni restricciones. */
const efectoFuerte = {
  verbo: 'destroy',
  sinVerbo: false,
  verbosTramos: [],
  tipo: 'hechizo',
  trigger: null,
  objetivoTipo: 'campeon',
  duracion: null,
  costoTipo: null,
  costoCantidad: 0,
  activacion: null,
  keywordsConcedidas: [],
  esComandante: false,
}

describe('impuesto por efecto y suma objetivo', () => {
  it('S5.1: un efecto fuerte rebaja la suma objetivo respecto de un Campeón sin efectos', () => {
    const sinEfectos = campeon(3, 4, 4)
    const conEfecto: CartaBalance = { ...campeon(3, 4, 4), efectos: [efectoFuerte] }
    const a = evaluarConImpuesto(sinEfectos)
    const b = evaluarConImpuesto(conEfecto)
    expect(a?.objetivoSuma).toBe(CONFIG_V1.bandas[3].sumaMax)
    expect(b?.objetivoSuma).toBeLessThan(a?.objetivoSuma ?? 0)
    expect(b?.impuesto).toBeGreaterThan(0)
  })

  it('R9: el impuesto es lo que el índice pasa del umbral por los puntos por poder', () => {
    const c: CartaBalance = { ...campeon(3, 4, 4), efectos: [efectoFuerte] }
    const { umbral, puntosPorPoder } = CONFIG_V1.impuesto
    const indice = poderDeCarta(c).indice
    expect(indice).toBeGreaterThan(umbral)
    expect(impuestoDe(c)).toBeCloseTo((indice - umbral) * puntosPorPoder, 1)
  })

  it('R9: un índice igual o menor al umbral no paga impuesto', () => {
    const debil: CartaBalance = { ...campeon(2, 4, 4), efectos: [{ ...efectoFuerte, verbo: 'mover' }] }
    expect(poderDeCarta(debil).indice).toBeLessThanOrEqual(CONFIG_V1.impuesto.umbral)
    expect(impuestoDe(debil)).toBe(0)
    expect(impuestoDe(campeon(2, 4, 4))).toBe(0)
  })

  it('R9: el impuesto es continuo: crece sin escalón al pasar el umbral', () => {
    const cfg = structuredClone(CONFIG_V1)
    cfg.poder.verbo.destroy = cfg.impuesto.umbral + 0.2
    const c: CartaBalance = { ...campeon(3, 4, 4), efectos: [efectoFuerte] }
    expect(impuestoDe(c, cfg)).toBeLessThanOrEqual(0.1)
    cfg.poder.verbo.destroy = cfg.impuesto.umbral
    expect(impuestoDe(c, cfg)).toBe(0)
  })

  it('R9: cambiar el umbral cambia el impuesto', () => {
    const c: CartaBalance = { ...campeon(3, 4, 4), efectos: [efectoFuerte] }
    const sinUmbral = structuredClone(CONFIG_V1)
    sinUmbral.impuesto.umbral = 0
    expect(impuestoDe(c, sinUmbral)).toBeGreaterThan(impuestoDe(c))
  })

  it('el impuesto no pasa del máximo de la config', () => {
    const muchos: CartaBalance = { ...campeon(3, 4, 4), efectos: Array(10).fill(efectoFuerte) }
    expect(impuestoDe(muchos)).toBe(CONFIG_V1.impuesto.maxImpuesto)
  })

  it('solo los Campeones pagan impuesto', () => {
    const mistica: CartaBalance = { ...campeon(3, 4, 4), tipo: 'Mística', stats: null, efectos: [efectoFuerte] }
    expect(impuestoDe(mistica)).toBe(0)
  })

  it('los Campeones exentos (Únicas y Soberanos) no pagan impuesto aunque su índice sea alto', () => {
    const aurora = carta('FB-010')
    expect(poderDeCarta(aurora).indice).toBeGreaterThan(0)
    expect(impuestoDe(aurora)).toBe(0)
    expect(evaluarConImpuesto(aurora)?.fueraDeBanda).toBe(false)
    expect(evaluarConImpuesto(carta('DS-010'))?.fueraDeBanda).toBe(false)
  })

  it('cambiar los puntos por poder cambia la suma objetivo', () => {
    const c: CartaBalance = { ...campeon(3, 4, 4), efectos: [efectoFuerte] }
    const dura = structuredClone(CONFIG_V1)
    dura.impuesto.puntosPorPoder = dura.impuesto.puntosPorPoder * 2 // 0.5 -> 1: el efecto fuerte pasa 1 punto del umbral
    expect(evaluarConImpuesto(c, dura)?.objetivoSuma).toBeLessThan(evaluarConImpuesto(c)?.objetivoSuma ?? 0)
  })

  it('con el impuesto en 0 coincide con evaluarPresupuesto sin impuesto', () => {
    const c = carta('FB-013')
    const sinImpuesto = structuredClone(CONFIG_V1)
    sinImpuesto.impuesto.puntosPorPoder = 0
    expect(evaluarConImpuesto(c, sinImpuesto)).toEqual(evaluarPresupuesto(c, sinImpuesto, 0))
  })

  it('devuelve null para una carta que no es Campeón', () => {
    expect(evaluarConImpuesto({ ...campeon(3, 4, 4), tipo: 'Mística', stats: null })).toBeNull()
  })
})
