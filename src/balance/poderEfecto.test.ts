import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { componentesDeEfecto, poderDeCarta, poderDeEfecto } from './poderEfecto'
import type { CartaBalance, ConfigBalance, EfectoBalance } from './tipos'

const { cartas, campeones } = cargarCartas(ALL_CARDS)
const real = (id: string): CartaBalance => {
  const c = cartas.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

const efecto = (parcial: Partial<EfectoBalance> = {}): EfectoBalance => ({
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
  ...parcial,
})

const carta = (efectos: EfectoBalance[] = [], keywords: string[] = []): CartaBalance => ({
  id: 'T-001',
  nombre: 'Prueba',
  tipo: 'Mística',
  rareza: 'Común',
  coste: 2,
  mazo: 'disonancia',
  roles: [],
  stats: null,
  keywords,
  efectos,
})

const conPeso = (cambio: (c: ConfigBalance) => void): ConfigBalance => {
  const copia = structuredClone(CONFIG_V1)
  cambio(copia)
  return copia
}

describe('poderDeEfecto', () => {
  it('S4.1: un efecto con costo de Éter vale menos que el mismo sin costo', () => {
    const libre = poderDeEfecto(efecto({ costoTipo: 'ninguno' }))
    const caro = poderDeEfecto(efecto({ costoTipo: 'eter', costoCantidad: 2 }))
    expect(caro.poder).toBeLessThan(libre.poder)
  })

  it('S4.2: es determinista', () => {
    const e = efecto({ costoTipo: 'eter', costoCantidad: 1, activacion: 'una_por_turno' })
    expect(poderDeEfecto(e)).toEqual(poderDeEfecto(e))
  })

  it('usa el peso del verbo de la config', () => {
    expect(poderDeEfecto(efecto({ verbo: 'destroy' })).poder).toBe(CONFIG_V1.poder.verbo.destroy)
  })

  it('cambiar un peso de la config cambia el poder', () => {
    const alterada = conPeso((c) => {
      c.poder.verbo.destroy = c.poder.verbo.destroy * 2
    })
    expect(poderDeEfecto(efecto(), alterada).poder).toBeGreaterThan(poderDeEfecto(efecto()).poder)
  })

  it('aplica activación, duración y objetivo como multiplicadores', () => {
    const base = poderDeEfecto(efecto()).poder
    expect(poderDeEfecto(efecto({ activacion: 'una_por_turno' })).poder).toBeCloseTo(base * CONFIG_V1.poder.activacion.una_por_turno)
    expect(poderDeEfecto(efecto({ duracion: 'turno' })).poder).toBeCloseTo(base * CONFIG_V1.poder.duracion.turno)
    expect(poderDeEfecto(efecto({ objetivoTipo: 'todos_campeones_rivales' })).poder).toBeCloseTo(
      base * CONFIG_V1.poder.objetivo.todos_campeones_rivales,
    )
  })

  it('un efecto sin trigger usa el peso por defecto', () => {
    const doble = conPeso((c) => {
      c.poder.fallback = c.poder.fallback * 2
    })
    expect(poderDeEfecto(efecto({ trigger: null }), doble).poder).toBeCloseTo(poderDeEfecto(efecto()).poder * 2)
  })

  it('una duración desconocida pesa como el valor por defecto, sin lanzar', () => {
    const conocida = poderDeEfecto(efecto({ duracion: 'permanente' })).poder
    expect(poderDeEfecto(efecto({ duracion: 'hasta_alba_oponente' })).poder).toBe(conocida * CONFIG_V1.poder.fallback)
  })

  it('un efecto sin verbo vale 0 y marca sinVerbo', () => {
    const r = poderDeEfecto(efecto({ verbo: null, sinVerbo: true }))
    expect(r.poder).toBe(0)
    expect(r.sinVerbo).toBe(true)
  })

  it('un efecto sin verbo principal suma los verbos de sus tramos (Cassandra)', () => {
    const r = poderDeEfecto(efecto({ verbo: null, verbosTramos: ['toggle_exhaust', 'fix_exhaust'], objetivoTipo: 'campeon' }))
    expect(r.poder).toBeCloseTo(CONFIG_V1.poder.verbo.toggle_exhaust + CONFIG_V1.poder.verbo.fix_exhaust)
  })

  it('grant_keyword suma el peso de la keyword concedida por el multiplicador de objetivo', () => {
    const sinKw = poderDeEfecto(efecto({ verbo: 'grant_keyword', objetivoTipo: 'todos_campeones_propios' })).poder
    const conKw = poderDeEfecto(
      efecto({ verbo: 'grant_keyword', objetivoTipo: 'todos_campeones_propios', keywordsConcedidas: ['Indestructible'] }),
    )
    expect(conKw.poder - sinKw).toBeCloseTo(CONFIG_V1.poder.keyword.Indestructible * CONFIG_V1.poder.objetivo.todos_campeones_propios)
    expect(conKw.keywords).toBeCloseTo(CONFIG_V1.poder.keyword.Indestructible * CONFIG_V1.poder.objetivo.todos_campeones_propios)
  })

  it('una keyword concedida desconocida pesa como el valor por defecto', () => {
    const r = poderDeEfecto(efecto({ verbo: 'grant_keyword', keywordsConcedidas: ['Misteriosa'] }))
    expect(r.keywords).toBe(CONFIG_V1.poder.fallback * CONFIG_V1.poder.objetivo.campeon)
  })
})

describe('poderDeCarta', () => {
  it('S4.3: suma los efectos y expone el desglose', () => {
    const c = carta([efecto({ verbo: 'destroy' }), efecto({ verbo: 'buff' })])
    const r = poderDeCarta(c)
    expect(r.efectos).toHaveLength(2)
    expect(r.indice).toBeCloseTo(CONFIG_V1.poder.verbo.destroy + CONFIG_V1.poder.verbo.buff)
    expect(r.indice).toBeCloseTo(r.efectos.reduce((n, e) => n + e.poder, 0))
  })

  it('una carta sin efectos ni keywords vale 0', () => {
    expect(poderDeCarta(carta()).indice).toBe(0)
  })

  it('el índice nunca es negativo', () => {
    const costoso = efecto({ verbo: 'scry', costoTipo: 'exile_self', costoCantidad: 3 })
    expect(poderDeCarta(carta([costoso])).indice).toBe(0)
  })

  it('las keywords propias suman su peso', () => {
    const r = poderDeCarta(carta([], ['Inmortal', 'Presteza']))
    expect(r.keywords.map((k) => k.keyword)).toEqual(['Inmortal', 'Presteza'])
    expect(r.indice).toBeCloseTo(CONFIG_V1.poder.keyword.Inmortal + CONFIG_V1.poder.keyword.Presteza)
  })

  it('una keyword propia desconocida pesa como el valor por defecto', () => {
    expect(poderDeCarta(carta([], ['Rarísima'])).indice).toBe(CONFIG_V1.poder.fallback)
  })

  it('cambiar el peso de una keyword cambia el índice', () => {
    const alterada = conPeso((c) => {
      c.poder.keyword.Inmortal = c.poder.keyword.Inmortal * 2
    })
    expect(poderDeCarta(carta([], ['Inmortal']), alterada).indice).toBeGreaterThan(poderDeCarta(carta([], ['Inmortal'])).indice)
  })

  it('el efecto de Comandante cuenta en el índice (es un efecto real de la carta)', () => {
    const normal = poderDeCarta(carta([efecto()])).indice
    const conComandante = poderDeCarta(carta([efecto(), efecto({ esComandante: true })])).indice
    expect(conComandante).toBeCloseTo(normal * 2)
  })

  it('con el seed real, todas las cartas dan un índice finito y no negativo', () => {
    for (const c of cartas) {
      const { indice } = poderDeCarta(c)
      expect(Number.isFinite(indice)).toBe(true)
      expect(indice).toBeGreaterThanOrEqual(0)
    }
  })

  it('Aurora y Ragnar (Inmortal / Indestructible) quedan por encima de la mediana de los Campeones', () => {
    const indices = campeones.map((c) => poderDeCarta(c).indice).sort((a, b) => a - b)
    const mediana = indices[Math.floor(indices.length / 2)]
    expect(poderDeCarta(real('FB-010')).indice).toBeGreaterThan(mediana)
    expect(poderDeCarta(real('DS-010')).indice).toBeGreaterThan(mediana)
  })
})

describe('componentesDeEfecto', () => {
  const todos = cartas.flatMap((c) => c.efectos.map((e) => ({ id: c.id, e })))

  it('S5.1: el poder de los componentes es EXACTAMENTE el de poderDeEfecto en los efectos de las 65 cartas', () => {
    expect(cartas).toHaveLength(65)
    expect(todos).toHaveLength(71)
    for (const { id, e } of todos) {
      const c = componentesDeEfecto(e)
      expect(c.poder, id).toBe(poderDeEfecto(e).poder)
      expect(c.keywords, id).toBe(poderDeEfecto(e).keywords)
    }
  })

  it('S5.1: base × multiplicador + keywords + costo reconstruye el poder con los factores del desglose', () => {
    for (const { id, e } of todos) {
      const c = componentesDeEfecto(e)
      const producto = c.tipo * c.trigger * c.activacion * c.duracion * c.objetivo
      expect(c.multiplicador, id).toBe(producto)
      expect(c.base * c.multiplicador + c.keywords + c.costo, id).toBe(c.poder)
    }
  })

  it('S5.2: el trigger pesa el valor por defecto porque cfg.poder.trigger está vacío', () => {
    expect(CONFIG_V1.poder.trigger).toEqual({})
    const conTrigger = todos.filter(({ e }) => e.trigger !== null)
    expect(conTrigger.length).toBeGreaterThan(0)
    for (const { e } of conTrigger) {
      expect(componentesDeEfecto(e).trigger).toBe(CONFIG_V1.poder.fallback)
    }
  })

  it('un trigger con peso en la config cambia el componente trigger', () => {
    const cfg = conPeso((c) => {
      c.poder.trigger = { al_entrar: 2 }
    })
    expect(componentesDeEfecto(efecto({ trigger: 'al_entrar' }), cfg).trigger).toBe(2)
  })

  it('S5.4: Ragnar concede Indestructible (2) a todos los campeones propios (×1.5) y Aurora imprime Inmortal (2.5)', () => {
    const ragnar = real('DS-010').efectos.map((e) => componentesDeEfecto(e))
    expect(ragnar.some((c) => c.keywords === 2 * 1.5)).toBe(true)
    const aurora = poderDeCarta(real('FB-010')).keywords
    expect(aurora).toContainEqual({ keyword: 'Inmortal', peso: 2.5 })
  })

  it('S9.3: un efecto sin verbo da todo 0 y multiplicador 1; Cassandra (verbos en tramos) no se marca sin verbo', () => {
    const c = componentesDeEfecto(efecto({ verbo: null, sinVerbo: true }))
    expect(c).toEqual({ base: 0, tipo: 0, trigger: 0, activacion: 0, duracion: 0, objetivo: 0, multiplicador: 1, keywords: 0, costo: 0, poder: 0 })
    const cassandra = real('FB-016').efectos.map((e) => componentesDeEfecto(e))
    expect(cassandra.some((x) => x.base > 0)).toBe(true)
  })

  it('S5.1: la suma de componentes y keywords impresas es el poderDeCarta bruto en las 65 cartas', () => {
    for (const c of cartas) {
      const efectos = c.efectos.reduce((n, e) => n + componentesDeEfecto(e).poder, 0)
      const impresas = poderDeCarta(c).keywords.reduce((n, k) => n + k.peso, 0)
      expect(Math.max(0, efectos + impresas), c.id).toBe(poderDeCarta(c).indice)
    }
  })
})
