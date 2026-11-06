import { describe, it, expect } from 'vitest'
import cartasPruebaJson from '../../seed/CartasPrueba.json'
import type { AnyCard } from '../shared/types'
import { ALL_CARDS } from '../shared/data/paquetes'
import { aplicarAjustes, simularAjustes } from './ajuste'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import {
  agruparPor,
  curvaCoste,
  espejo,
  evaluarCarta,
  filtrarCartas,
  FILTROS_VACIOS,
  mapaVerbos,
  promedioPorCoste,
  rankingPoder,
  resumenPorMazo,
  semaforoDe,
} from './metricas'
import { cargarReferencia } from './referencia'
import { CARTAS_DS_ANTES, legadoDS } from './test/cartasReales'
import type { CartaBalance } from './tipos'

const { cartas } = cargarCartas(ALL_CARDS)
const referencia = cargarReferencia(cartasPruebaJson as unknown as AnyCard[])
const carta = (id: string): CartaBalance => {
  const c = cartas.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en el seed`)
  return c
}

/** Recorre el valor buscando NaN o Infinity. */
function hayNoFinitos(x: unknown): boolean {
  if (typeof x === 'number') return !Number.isFinite(x)
  if (Array.isArray(x)) return x.some(hayNoFinitos)
  if (x !== null && typeof x === 'object') return Object.values(x).some(hayNoFinitos)
  return false
}

const sinResultados = filtrarCartas(cartas, { ...FILTROS_VACIOS, coste: 99 })

describe('filtrarCartas', () => {
  it('sin filtros devuelve las 66 cartas del seed', () => {
    expect(filtrarCartas(cartas, FILTROS_VACIOS)).toHaveLength(66)
  })

  it('S7.1: mazo=disonancia y coste=3 solo deja cartas de Disonancia de coste 3', () => {
    const r = filtrarCartas(cartas, { ...FILTROS_VACIOS, mazo: 'disonancia', coste: 3 })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((c) => c.mazo === 'disonancia' && c.coste === 3)).toBe(true)
  })

  it('los filtros se combinan (mazo, tipo, rareza)', () => {
    const r = filtrarCartas(cartas, { mazo: 'estasis', tipo: 'Campeón', coste: null, rareza: 'Única' })
    expect(r.map((c) => c.id)).toEqual(['FB-010'])
  })

  it('un filtro sin coincidencias devuelve una lista vacía', () => {
    expect(sinResultados).toEqual([])
  })

  it('R11: la referencia queda fuera por defecto y entra si se pide', () => {
    const mezcla = [...cartas, ...referencia]
    expect(filtrarCartas(mezcla, FILTROS_VACIOS)).toHaveLength(66)
    expect(filtrarCartas(mezcla, FILTROS_VACIOS, { incluirReferencia: true })).toHaveLength(66 + 58)
  })
})

describe('semáforo y evaluación por carta', () => {
  it('un Campeón dentro de banda es verde', () => {
    expect(evaluarCarta(carta('FB-013')).presupuesto?.estado).toBe('dentro')
    expect(evaluarCarta(carta('FB-013')).semaforo).toBe('verde')
  })

  it('un Campeón sobre su suma objetivo es más que verde y marca rota si pasa el máximo', () => {
    // La Draven de antes (4/4, coste 2): hoy es 3/3 y cabe en banda (Lote 2 del rediseño de Disonancia)
    const draven = evaluarCarta(legadoDS('Draven'))
    expect(draven.presupuesto?.estado).toBe('sobre')
    expect(draven.rota).toBe(true)
    expect(draven.semaforo).not.toBe('verde')
  })

  it('un Campeón por debajo de la banda no es rota', () => {
    // La Elena real (4/2, suma 6) ya está dentro de banda: el caso «bajo» usa su versión de antes (3/2, suma 5)
    expect(evaluarCarta(carta('FB-015')).presupuesto?.estado).toBe('dentro')
    const elena = evaluarCarta({ ...carta('FB-015'), stats: { atq: 3, res: 2 } })
    expect(elena.presupuesto?.estado).toBe('bajo')
    expect(elena.rota).toBe(false)
    expect(elena.semaforo).toBe('verde')
  })

  it('una Mística cara para su coste sale roja y una barata verde', () => {
    const base = cartas.find((c) => c.tipo === 'Mística' && c.efectos.length > 0) as CartaBalance
    const barata = { ...base, coste: 9 }
    const cara = { ...base, coste: 0, efectos: [...base.efectos, ...base.efectos, ...base.efectos, ...base.efectos] }
    expect(semaforoDe(barata).semaforo).toBe('verde')
    expect(semaforoDe(cara).semaforo).not.toBe('verde')
  })

  it('los umbrales del semáforo viven en config', () => {
    const cfg = structuredClone(CONFIG_V1)
    cfg.semaforo.verde = 100
    expect(evaluarCarta(carta('DS-012'), cfg).semaforo).toBe('verde')
  })

  it('trae el índice y el impuesto de la carta', () => {
    // Marek (exile coste 3: impuesto 0.5). Draven ya no paga impuesto con el rediseño de Disonancia (3/3, steal_ether)
    const e = evaluarCarta(carta('DS-015'))
    expect(e.indice).toBeGreaterThan(0)
    expect(e.impuesto).toBeGreaterThan(0)
  })
})

describe('resumenPorMazo', () => {
  const r = resumenPorMazo(cartas)

  it('devuelve Estásis y Disonancia con 33 y 33 cartas', () => {
    expect(r.map((m) => m.mazo)).toEqual(['estasis', 'disonancia'])
    expect(r.map((m) => m.cartas)).toEqual([33, 33])
  })

  it('trae el porcentaje de identidad en [0,100] y los Campeones fuera de banda', () => {
    for (const m of r) {
      expect(m.identidad.porcentaje).toBeGreaterThanOrEqual(0)
      expect(m.identidad.porcentaje).toBeLessThanOrEqual(100)
    }
    // Con el rediseño de Disonancia (Lote 2) solo queda fuera Isolde (índice 4.75, impuesto 1.4: su suma 9 pasa el máximo 8.6).
    expect(r[0].fueraDeBanda + r[1].fueraDeBanda).toBe(1)
    // Antes: tres de coste 2 sobre el máximo (Kael, Draven, Emisario), Marek y además Isolde = 5
    const antes = resumenPorMazo(CARTAS_DS_ANTES)
    expect(antes[0].fueraDeBanda + antes[1].fueraDeBanda).toBe(5)
  })

  it('las cartas rotas son las que pasan su presupuesto', () => {
    expect(r.reduce((n, m) => n + m.rotas, 0)).toBeGreaterThan(0)
  })

  it('con filtros vacíos no hay NaN', () => {
    const v = resumenPorMazo(sinResultados)
    expect(v.map((m) => m.cartas)).toEqual([0, 0])
    expect(hayNoFinitos(v)).toBe(false)
  })
})

describe('agruparPor (suma por coste, rareza y mazo)', () => {
  it('por coste: cada grupo trae conteo, promedios y fuera de banda', () => {
    const g = agruparPor(cartas, 'coste')
    // Coste 4: Isolde (3/6, índice 4.75) es la única fuera de banda del seed rediseñado
    const cuatro = g.find((x) => x.clave === '4')
    expect(cuatro?.conteo).toBeGreaterThan(0)
    expect(cuatro?.promedioSuma).not.toBeNull()
    expect(cuatro?.fueraDeBanda).toBeGreaterThan(0)
    expect(g.reduce((n, x) => n + x.conteo, 0)).toBe(66)
  })

  it('por rareza: la suma de conteos es el total', () => {
    expect(agruparPor(cartas, 'rareza').reduce((n, x) => n + x.conteo, 0)).toBe(66)
  })

  it('por mazo: Estásis 33 y Disonancia 33', () => {
    const g = agruparPor(cartas, 'mazo')
    expect(g.find((x) => x.clave === 'estasis')?.conteo).toBe(33)
    expect(g.find((x) => x.clave === 'disonancia')?.conteo).toBe(33)
  })

  it('los grupos sin Campeones tienen promedios nulos, no NaN', () => {
    const soloEter = cartas.filter((c) => c.tipo === 'Éter')
    const g = agruparPor(soloEter, 'coste')
    expect(g[0].promedioAtq).toBeNull()
    expect(g[0].promedioSuma).toBeNull()
    expect(hayNoFinitos(g)).toBe(false)
  })

  it('S7.2: un filtro vacío devuelve lista vacía sin NaN', () => {
    expect(agruparPor(sinResultados, 'coste')).toEqual([])
  })
})

describe('curvaCoste', () => {
  it('cuenta las cartas por coste y rareza y ordena por coste', () => {
    const curva = curvaCoste(cartas)
    expect(curva.map((c) => c.coste)).toEqual([...curva.map((c) => c.coste)].sort((a, b) => a - b))
    expect(curva.reduce((n, c) => n + c.total, 0)).toBe(66)
    for (const c of curva) expect(Object.values(c.porRareza).reduce((n, x) => n + x, 0)).toBe(c.total)
  })

  it('vacío sin errores', () => {
    expect(curvaCoste(sinResultados)).toEqual([])
  })
})

describe('mapaVerbos (mazo × verbo)', () => {
  const mapa = mapaVerbos(cartas)

  it('cuenta los efectos por mazo y verbo', () => {
    const destroy = mapa.find((f) => f.verbo === 'destroy')
    expect(destroy?.disonancia).toBeGreaterThan(0)
    expect(destroy?.total).toBe((destroy?.estasis ?? 0) + (destroy?.disonancia ?? 0))
  })

  it('trae el eje de identidad de cada verbo por mazo', () => {
    const destroy = mapa.find((f) => f.verbo === 'destroy')
    expect(destroy?.claseEstasis).toBe('fuera')
    expect(destroy?.claseDisonancia).toBe('identidad')
    expect(mapa.find((f) => f.verbo === 'block_ether')?.claseEstasis).toBe('identidad')
  })

  it('ordena por total descendente', () => {
    for (let i = 1; i < mapa.length; i++) expect(mapa[i - 1].total).toBeGreaterThanOrEqual(mapa[i].total)
  })

  it('con filtros vacíos no hay filas', () => {
    expect(mapaVerbos(sinResultados)).toEqual([])
  })
})

describe('rankingPoder', () => {
  const r = rankingPoder(cartas)

  it('ordena por índice descendente e incluye todas las cartas', () => {
    expect(r).toHaveLength(66)
    for (let i = 1; i < r.length; i++) expect(r[i - 1].indice).toBeGreaterThanOrEqual(r[i].indice)
  })

  // Rediseño de Disonancia (Lote 2): Ragnar bajó de índice 10.4 (destroy + Indestructible a todos) a 7.10 y Aurora (FB-010) lo supera.
  it('Aurora y Ragnar, los dos Soberanos exentos, encabezan el ranking de poder', () => {
    expect(r[0].id).toBe('FB-010')
    expect(r[1].id).toBe('DS-010')
  })

  it('cada fila trae semáforo', () => {
    expect(r.every((f) => ['verde', 'amarillo', 'rojo'].includes(f.semaforo))).toBe(true)
  })
})

describe('espejo Estásis vs Disonancia', () => {
  it('trae las mismas métricas para ambos mazos', () => {
    const e = espejo(cartas)
    expect(Object.keys(e)).toEqual(['estasis', 'disonancia'])
    expect(Object.keys(e.estasis)).toEqual(Object.keys(e.disonancia))
    expect(e.estasis.conteo).toBe(33)
    expect(e.disonancia.conteo).toBe(33)
    expect(e.estasis.sumaMedia).not.toBeNull()
    expect(e.disonancia.poderMedio).not.toBeNull()
  })

  it('vacío: conteo 0 y promedios nulos', () => {
    const e = espejo(sinResultados)
    expect(e.estasis).toMatchObject({ conteo: 0, sumaMedia: null, poderMedio: null, porcentajeIdentidad: 0 })
    expect(hayNoFinitos(e)).toBe(false)
  })
})

describe('promedioPorCoste (antes y después)', () => {
  it('S2.2: la suma media de coste 2 después del ajuste queda dentro de la banda 5-6', () => {
    // Con las bandas v1.1 el coste 3 ya parte dentro (media 7.3 en 6-8); el coste 2 (media 7.7 > 6) es el que el ajuste corrige.
    // Con la Disonancia rediseñada el coste 2 ya parte dentro (media 6): el caso se conserva con la Disonancia de antes (CARTAS_DS_ANTES).
    const despues = aplicarAjustes(CARTAS_DS_ANTES, simularAjustes(CARTAS_DS_ANTES).ajustes)
    const antes = promedioPorCoste(CARTAS_DS_ANTES).find((p) => p.coste === 2)
    const luego = promedioPorCoste(despues).find((p) => p.coste === 2)
    expect(antes?.sumaMedia).toBeGreaterThan(CONFIG_V1.bandas[2].sumaMax)
    expect(luego?.sumaMedia).toBeGreaterThanOrEqual(CONFIG_V1.bandas[2].sumaMin)
    expect(luego?.sumaMedia).toBeLessThanOrEqual(CONFIG_V1.bandas[2].sumaMax)
  })

  it('solo promedia Campeones y no tiene NaN con filtros vacíos', () => {
    expect(promedioPorCoste(sinResultados)).toEqual([])
    expect(hayNoFinitos(promedioPorCoste(cartas))).toBe(false)
  })
})
