import { describe, it, expect } from 'vitest'
import { efectosComandante } from './efectoComandante'
import { describirEfectosDeCarta } from '../online/describirEfecto'
import { limpiarEfectosDeCarta } from '../forge/utils/limpiar-efecto'
import type { AnyCard, EfectoData } from './types'

const buff: EfectoData = { tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2, RES: 2 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } }
const regla: EfectoData = { tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', activacion: 'una_por_turno' }

describe('efectosComandante (normalización única)', () => {
  it('sin efecto: arreglo vacío', () => {
    expect(efectosComandante(undefined)).toEqual([])
    expect(efectosComandante(null)).toEqual([])
  })

  it('un objeto (formato histórico: Ragnar) se vuelve un arreglo de uno', () => {
    expect(efectosComandante(buff)).toEqual([buff])
  })

  it('un arreglo se devuelve tal cual (Aurora lleva dos)', () => {
    expect(efectosComandante([buff, regla])).toEqual([buff, regla])
  })
})

describe('consumidores de efectoComandante con arreglo', () => {
  it('describirEfectosDeCarta lista una línea «Comandante: …» por cada efecto', () => {
    const lineas = describirEfectosDeCarta({ efectoComandante: [buff, regla], type: 'Campeón' })
    expect(lineas.filter((l) => l.startsWith('Comandante: '))).toHaveLength(2)
    expect(describirEfectosDeCarta({ efectoComandante: buff, type: 'Campeón' })).toHaveLength(1)
  })

  it('limpiarEfectosDeCarta conserva la forma: un arreglo sigue siendo arreglo y un objeto sigue siendo objeto', () => {
    const conArreglo = { id: 'T-1', type: 'Campeón', efectoComandante: [buff, regla] } as unknown as AnyCard
    const conObjeto = { id: 'T-2', type: 'Campeón', efectoComandante: buff } as unknown as AnyCard
    const a = limpiarEfectosDeCarta(conArreglo) as unknown as { efectoComandante: unknown }
    const o = limpiarEfectosDeCarta(conObjeto) as unknown as { efectoComandante: unknown }
    expect(Array.isArray(a.efectoComandante)).toBe(true)
    expect(Array.isArray(o.efectoComandante)).toBe(false)
  })
})
