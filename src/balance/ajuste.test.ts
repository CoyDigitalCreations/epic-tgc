import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { aplicarAjustes, simularAjustes } from './ajuste'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { evaluarConImpuesto } from './presupuesto'
import type { CartaBalance } from './tipos'

const { cartas } = cargarCartas(ALL_CARDS)
const resultado = simularAjustes(cartas)
const ajuste = (id: string) => resultado.ajustes.find((a) => a.id === id)

const campeon = (id: string, coste: number, atq: number, res: number, extra: Partial<CartaBalance> = {}): CartaBalance => ({
  id,
  nombre: id,
  tipo: 'Campeón',
  rareza: 'Común',
  coste,
  mazo: 'estasis',
  roles: ['Normal'],
  stats: { atq, res },
  keywords: [],
  efectos: [],
  ...extra,
})

function congelarProfundo<T>(x: T): T {
  if (x !== null && typeof x === 'object' && !Object.isFrozen(x)) {
    Object.freeze(x)
    for (const v of Object.values(x)) congelarProfundo(v)
  }
  return x
}

describe('simularAjustes: quién se ajusta', () => {
  it('solo ajusta a los Campeones fuera de banda del seed', () => {
    const fuera = cartas.filter((c) => evaluarConImpuesto(c)?.fueraDeBanda).map((c) => c.id).sort()
    expect(resultado.ajustes.map((a) => a.id).sort()).toEqual(fuera)
  })

  it('S1.3: Vaela, dentro de banda, no aparece', () => {
    expect(ajuste('FB-011')).toBeUndefined()
  })

  it('S1.4: Aurora y Ragnar no cambian', () => {
    expect(ajuste('FB-010')).toBeUndefined()
    expect(ajuste('DS-010')).toBeUndefined()
  })

  it('las cartas que no son Campeón no se ajustan', () => {
    const ids = new Set(cartas.filter((c) => c.tipo !== 'Campeón').map((c) => c.id))
    expect(resultado.ajustes.every((a) => !ids.has(a.id))).toBe(true)
  })
})

describe('simularAjustes: reparto', () => {
  it('S1.1: Isolde baja a la suma objetivo y conserva RES > ATQ', () => {
    const a = ajuste('FB-014')
    expect(a?.antes).toEqual({ poder: 3, resistencia: 7 })
    const ev = evaluarConImpuesto(cartas.find((c) => c.id === 'FB-014') as CartaBalance)
    expect((a?.despues.poder ?? 0) + (a?.despues.resistencia ?? 0)).toBe(Math.floor(ev?.objetivoSuma ?? 0))
    expect(a?.despues.resistencia).toBeGreaterThan(a?.despues.poder ?? 0)
    expect(a?.despues.resistencia).toBeLessThanOrEqual(CONFIG_V1.bandas[3].topeRes)
  })

  it('S1.2: Elena sube a la suma mínima y el excedente de ATQ pasa a RES por el tope', () => {
    const a = ajuste('FB-015')
    // Coste 3: mínimo 8, tope ATQ 6. Perfil todo ofensivo: 8/0 -> 6/2.
    expect(a?.despues).toEqual({ poder: 6, resistencia: 2 })
  })

  it('todos los resultados son enteros >= 0, dentro de tope y dentro de banda', () => {
    for (const a of resultado.ajustes) {
      const c = cartas.find((x) => x.id === a.id) as CartaBalance
      const nuevo = { ...c, stats: { atq: a.despues.poder, res: a.despues.resistencia } }
      expect(Number.isInteger(a.despues.poder) && a.despues.poder >= 0).toBe(true)
      expect(Number.isInteger(a.despues.resistencia) && a.despues.resistencia >= 0).toBe(true)
      expect(evaluarConImpuesto(nuevo)?.fueraDeBanda).toBe(false)
    }
  })

  it('el empate de redondeo favorece la RES', () => {
    // Coste 2 (7-8), 1/1: sube a 7 con perfil 50/50 -> 3.5 -> 3/4.
    const r = simularAjustes([campeon('T-1', 2, 1, 1)])
    expect(r.ajustes[0].despues).toEqual({ poder: 3, resistencia: 4 })
  })

  it('si el ATQ y la RES son 0 reparte a partes iguales', () => {
    const r = simularAjustes([campeon('T-2', 2, 0, 0)])
    expect(r.ajustes[0].despues).toEqual({ poder: 3, resistencia: 4 })
  })

  it('un exceso de tope con la suma en banda mueve el excedente al otro stat sin cambiar la suma', () => {
    // Coste 3 (8-10, tope 6): 7/2 suma 9 -> ATQ 6, RES 3.
    const r = simularAjustes([campeon('T-3', 3, 7, 2)])
    expect(r.ajustes[0].despues).toEqual({ poder: 6, resistencia: 3 })
    expect(r.ajustes[0].motivo).toBe(
      'La suma 9 está en banda para coste 3, pero ATQ 7 pasa el tope de 6; se mueve el excedente al otro stat y la suma queda en 9.',
    )
  })

  it('cambiar la config cambia quién se ajusta (Elena sale de la lista si su banda baja)', () => {
    const cfg = structuredClone(CONFIG_V1)
    cfg.bandas[3].sumaMin = 3
    expect(simularAjustes(cartas, cfg).ajustes.map((a) => a.id)).not.toContain('FB-015')
  })
})

describe('simularAjustes: motivo y marcas', () => {
  it('el motivo está en español neutro y menciona la suma', () => {
    for (const a of resultado.ajustes) {
      expect(a.motivo.length).toBeGreaterThan(0)
      expect(a.motivo).toMatch(/suma|tope/)
      expect(a.motivo).not.toMatch(/\bvos\b|\bsos\b|\btenés\b/)
    }
    expect(ajuste('FB-015')?.motivo).toMatch(/sube/)
    expect(ajuste('FB-014')?.motivo).toMatch(/baja/)
  })

  it('S1.5: un efecto fuera de identidad se marca y no se reescribe', () => {
    const destroy = { ...cartas.flatMap((c) => c.efectos).find((e) => e.verbo === 'destroy')! }
    const c = campeon('T-4', 3, 3, 0, { mazo: 'estasis', efectos: [destroy] })
    const r = simularAjustes([c])
    expect(r.ajustes[0].fueraDeIdentidad).toEqual(['destroy'])
    expect(r.fueraDeIdentidad).toEqual([{ id: 'T-4', verbos: ['destroy'] }])
    expect(c.efectos[0]).toEqual(destroy)
    expect(Object.keys(r.ajustes[0].despues).sort()).toEqual(['poder', 'resistencia'])
  })

  it('marca también las cartas dentro de banda con efectos fuera de identidad', () => {
    const destroy = cartas.flatMap((c) => c.efectos).find((e) => e.verbo === 'destroy')!
    const r = simularAjustes([campeon('T-5', 2, 4, 3, { mazo: 'estasis', efectos: [destroy] })])
    expect(r.ajustes).toHaveLength(0)
    expect(r.fueraDeIdentidad.map((m) => m.id)).toEqual(['T-5'])
  })
})

describe('simularAjustes: letalidad antes y después', () => {
  it('trae la letalidad de cada ajustado antes y después, contra el pool del seed', () => {
    const a = ajuste('FB-015')
    expect(a?.letalidadAntes?.id).toBe('FB-015')
    expect(a?.letalidadAntes?.mata).toBeLessThan(a?.letalidadDespues?.mata ?? 0)
  })

  it('avisa cuando el ATQ nuevo supera el techo real de ATQ del pool', () => {
    expect(resultado.techos).toEqual({ atq: 5, res: 7 })
    const elena = ajuste('FB-015')
    expect(elena?.superaTecho).toBe(true)
    expect(elena?.avisos.join(' ')).toMatch(/ATQ/)
    expect(resultado.avisos.some((m) => m.includes('FB-015'))).toBe(true)
  })

  it('no avisa si el ajuste queda dentro del techo', () => {
    expect(ajuste('FB-014')?.superaTecho).toBe(false)
  })
})

describe('aplicarAjustes', () => {
  it('devuelve cartas nuevas con los stats ajustados y no muta las originales', () => {
    const antes = JSON.stringify(cartas)
    const nuevas = aplicarAjustes(cartas, resultado.ajustes)
    expect(JSON.stringify(cartas)).toBe(antes)
    expect(nuevas.find((c) => c.id === 'FB-015')?.stats).toEqual({ atq: 6, res: 2 })
    expect(nuevas.find((c) => c.id === 'FB-011')?.stats).toEqual(cartas.find((c) => c.id === 'FB-011')?.stats)
    expect(nuevas).toHaveLength(cartas.length)
  })

  it('tras ajustar, ningún Campeón queda fuera de banda', () => {
    const nuevas = aplicarAjustes(cartas, resultado.ajustes)
    expect(nuevas.filter((c) => evaluarConImpuesto(c)?.fueraDeBanda)).toEqual([])
  })
})

describe('R4: la simulación no muta el seed', () => {
  it('con ALL_CARDS congelado en profundidad no lanza y el contenido queda idéntico', () => {
    const previo = JSON.stringify(ALL_CARDS)
    congelarProfundo(ALL_CARDS)
    const { cartas: c } = cargarCartas(ALL_CARDS)
    expect(() => simularAjustes(c)).not.toThrow()
    expect(JSON.stringify(ALL_CARDS)).toBe(previo)
  })

  it('es determinista', () => {
    expect(simularAjustes(cartas)).toEqual(simularAjustes(cartas))
  })
})
