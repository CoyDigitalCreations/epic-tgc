import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarPresupuesto } from './presupuesto'
import type { CartaBalance, ConfigBalance } from './tipos'

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
  efectos: [],
})

describe('evaluarPresupuesto con el seed real', () => {
  it('S3.1: Vaela 5/3 y Mira 4/4 (coste 2) están dentro de banda', () => {
    for (const id of ['FB-011', 'FB-012']) {
      const ev = evaluarPresupuesto(carta(id))
      expect(ev?.suma).toBe(8)
      expect(ev?.fueraDeBanda).toBe(false)
      expect(ev?.estado).toBe('dentro')
    }
  })

  it('S3.2: Elena 3/0 queda por debajo e Isolde 3/7 por encima del tope de RES', () => {
    const elena = evaluarPresupuesto(carta('FB-015'))
    expect(elena?.suma).toBe(3)
    expect(elena?.fueraDeBanda).toBe(true)
    expect(elena?.estado).toBe('bajo')

    const isolde = evaluarPresupuesto(carta('FB-014'))
    expect(isolde?.suma).toBe(10)
    expect(isolde?.excesoRes).toBe(1)
    expect(isolde?.fueraDeBanda).toBe(true)
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
    // Coste 3: banda 8-10, tope ATQ 6. 7/2 suma 9 pero ATQ sobre el tope.
    const ev = evaluarPresupuesto(campeon(3, 7, 2))
    expect(ev?.estado).toBe('dentro')
    expect(ev?.excesoAtq).toBe(1)
    expect(ev?.excesoRes).toBe(0)
    expect(ev?.fueraDeBanda).toBe(true)
  })

  it('marca «sobre» cuando la suma pasa el máximo', () => {
    const ev = evaluarPresupuesto(campeon(2, 4, 5))
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
    expect(evaluarPresupuesto(campeon(9, 5, 5))).toBeNull()
  })

  it('calcula los puntos de stats con los pesos de la config', () => {
    const ev = evaluarPresupuesto(campeon(2, 4, 4))
    expect(ev?.puntos).toBe(4 * CONFIG_V1.pesos.atq + 4 * CONFIG_V1.pesos.res)
  })

  it('el impuesto rebaja la suma objetivo y el mínimo de la banda', () => {
    const sin = evaluarPresupuesto(campeon(3, 5, 5))
    const con = evaluarPresupuesto(campeon(3, 5, 5), CONFIG_V1, 2)
    expect(sin?.estado).toBe('dentro')
    expect(con?.objetivoSuma).toBe((sin?.objetivoSuma ?? 0) - 2)
    expect(con?.estado).toBe('sobre')
  })
})

describe('evaluarPresupuesto es configurable', () => {
  it('S1.1: Elena pasa de fuera a dentro al cambiar la banda de coste 3', () => {
    const elena = carta('FB-015')
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
