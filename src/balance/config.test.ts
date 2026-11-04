import { describe, it, expect } from 'vitest'
import { KEYWORDS } from '../shared/types/enums'
import { CONFIG_V1 } from './config'

describe('CONFIG_V1', () => {
  it('declara su versión', () => {
    expect(CONFIG_V1.version).toBe('v1')
  })

  it('define las bandas de suma y los topes individuales por coste', () => {
    expect(CONFIG_V1.bandas).toEqual({
      1: { sumaMin: 4, sumaMax: 6, topeAtq: 4, topeRes: 4 },
      2: { sumaMin: 7, sumaMax: 8, topeAtq: 5, topeRes: 5 },
      3: { sumaMin: 8, sumaMax: 10, topeAtq: 6, topeRes: 6 },
      4: { sumaMin: 9, sumaMax: 11, topeAtq: 7, topeRes: 7 },
    })
  })

  it('pesa más la RES que el ATQ (el daño igual a la RES mata)', () => {
    expect(CONFIG_V1.pesos).toEqual({ atq: 1.0, res: 1.25 })
    expect(CONFIG_V1.pesos.res).toBeGreaterThan(CONFIG_V1.pesos.atq)
  })

  it('exenta a Soberanos, Emperadores y Únicas con un tope propio 18/9/9', () => {
    expect(CONFIG_V1.excepciones.rolesExentos).toEqual(['Soberano', 'Emperador'])
    expect(CONFIG_V1.excepciones.rarezasExentas).toEqual(['Única'])
    expect(CONFIG_V1.excepciones.tope).toEqual({ suma: 18, atq: 9, res: 9 })
  })

  it('define el impuesto por poder de efecto con tope', () => {
    expect(CONFIG_V1.impuesto).toEqual({ umbral: 2, puntosPorPoder: 0.5, maxImpuesto: 3 })
  })

  it('clasifica la identidad de cada mazo', () => {
    expect(CONFIG_V1.identidad.estasis.identidad).toEqual(
      expect.arrayContaining(['block_ether', 'negar', 'toggle_exhaust', 'fix_exhaust']),
    )
    expect(CONFIG_V1.identidad.disonancia.identidad).toEqual(
      expect.arrayContaining(['destroy', 'debuff', 'rival_discard', 'exile']),
    )
  })
  it('pesa cada keyword del juego en poder.keyword', () => {
    expect(Object.keys(CONFIG_V1.poder.keyword).sort()).toEqual([...KEYWORDS].sort())
    for (const peso of Object.values(CONFIG_V1.poder.keyword)) expect(peso).toBeGreaterThan(0)
  })

  it('pesa las keywords de inmunidad por encima de las de ritmo', () => {
    const { keyword } = CONFIG_V1.poder
    expect(keyword.Inmortal).toBeGreaterThan(keyword.Carga)
    expect(keyword.Indestructible).toBeGreaterThan(keyword.Carga)
    expect(keyword.Fugaz).toBeGreaterThan(keyword.Presteza)
  })
})
