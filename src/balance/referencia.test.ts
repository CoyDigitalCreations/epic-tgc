import { describe, it, expect } from 'vitest'
import cartasPruebaJson from '../../seed/CartasPrueba.json'
import type { AnyCard } from '../shared/types'
import { ALL_CARDS } from '../shared/data/paquetes'
import { simularAjustes } from './ajuste'
import { cargarCartas } from './cargador'
import { poolLetalidad } from './letalidad'
import { poderDeCarta } from './poderEfecto'
import { cargarReferencia, rankingReferencia } from './referencia'

const cartasPrueba = cartasPruebaJson as unknown as AnyCard[]
const referencia = cargarReferencia(cartasPrueba)
const campeones = referencia.filter((c) => c.tipo === 'Campeón')
const ref = (id: string) => {
  const c = referencia.find((x) => x.id === id)
  if (!c) throw new Error(`Falta ${id} en la referencia`)
  return c
}

describe('R11: paquete de pruebas como referencia opcional', () => {
  it('carga las 58 cartas marcadas esReferencia', () => {
    expect(referencia).toHaveLength(58)
    expect(referencia.every((c) => c.esReferencia === true)).toBe(true)
    expect(campeones).toHaveLength(21)
  })

  it('no las confunde con un mazo del tablero', () => {
    expect(referencia.every((c) => c.mazo === null)).toBe(true)
  })

  it('el seed publicado nunca trae la marca esReferencia', () => {
    expect(cargarCartas(ALL_CARDS).cartas.some((c) => c.esReferencia === true)).toBe(false)
  })

  it('por defecto no entran al pool de letalidad ni al ajuste, aunque se mezclen con el seed', () => {
    const mezcla = [...cargarCartas(ALL_CARDS).cartas, ...referencia]
    expect(poolLetalidad(mezcla)).toHaveLength(18)
    expect(simularAjustes(mezcla).ajustes.every((a) => !a.id.startsWith('PR-'))).toBe(true)
  })

  it('solo entran si el llamador lo pide', () => {
    const mezcla = [...cargarCartas(ALL_CARDS).cartas, ...referencia]
    expect(poolLetalidad(mezcla, undefined, { incluirReferencia: true }).length).toBeGreaterThan(18)
    expect(simularAjustes(mezcla, undefined, { incluirReferencia: true }).ajustes.some((a) => a.id.startsWith('PR-'))).toBe(true)
  })

  it('no muta las cartas de entrada', () => {
    const antes = JSON.stringify(cartasPrueba)
    cargarReferencia(cartasPrueba)
    expect(JSON.stringify(cartasPrueba)).toBe(antes)
  })
})

describe('referencia: casos de forma', () => {
  it('Peón de Prueba (PR-010, 2/2 coste 1) es la línea base', () => {
    const peon = ref('PR-010')
    expect(peon.stats).toEqual({ atq: 2, res: 2 })
    expect(peon.coste).toBe(1)
  })

  it('Doble Filo (PR-023, 3/1) y Muro Doble (PR-030, 1/4) son formas raras con efecto', () => {
    expect(ref('PR-023').stats).toEqual({ atq: 3, res: 1 })
    expect(ref('PR-023').efectos.some((e) => e.verbo === 'double_attack')).toBe(true)
    expect(ref('PR-030').stats).toEqual({ atq: 1, res: 4 })
    expect(ref('PR-030').efectos.some((e) => e.verbo === 'modificar_regla')).toBe(true)
  })

  it('Ladrona de Prueba (PR-025, steal_champion) está entre los índices de poder más altos de los Campeones de prueba', () => {
    const ranking = rankingReferencia(referencia).filter((r) => r.tipo === 'Campeón')
    const posicion = ranking.findIndex((r) => r.id === 'PR-025')
    expect(posicion).toBeGreaterThanOrEqual(0)
    // Intención conservada con otro número: con el tope de costo del 50 % El Doble Filo (PR-023) sube a 2.5 y empata con la Ladrona (el desempate es por id),
    // así que la Ladrona pasa del puesto 2 al 4 de los Campeones (sigue entre los más altos, con 2.5 de 3 que tiene el primero).
    expect(posicion).toBeLessThan(4)
    expect(poderDeCarta(ref('PR-025')).indice).toBeGreaterThan(poderDeCarta(ref('PR-010')).indice)
  })
})

describe('rankingReferencia', () => {
  it('ordena de mayor a menor índice con desempate estable por id', () => {
    const r = rankingReferencia(referencia)
    for (let i = 1; i < r.length; i++) expect(r[i - 1].indice).toBeGreaterThanOrEqual(r[i].indice)
    expect(rankingReferencia(referencia)).toEqual(r)
  })

  it('con una lista vacía devuelve una lista vacía', () => {
    expect(rankingReferencia([])).toEqual([])
  })
})
