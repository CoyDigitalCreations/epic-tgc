import { describe, it, expect } from 'vitest'
import { KEYWORDS } from '../shared/types/enums'
import { CONFIG_V1 } from './config'

describe('CONFIG_V1', () => {
  it('define los pasos del análisis de carta (borrador)', () => {
    expect(CONFIG_V1.analisis).toEqual({ pasoSubida: 1, cercaDelTope: 0.5 })
  })

  it('declara su versión', () => {
    expect(CONFIG_V1.version).toBe('v1')
  })

  it('define las bandas de suma y los topes individuales por coste', () => {
    expect(CONFIG_V1.bandas).toEqual({
      1: { sumaMin: 3, sumaMax: 4, topeAtq: 3, topeRes: 3 },
      2: { sumaMin: 5, sumaMax: 6, topeAtq: 4, topeRes: 4 },
      3: { sumaMin: 6, sumaMax: 8, topeAtq: 5, topeRes: 5 },
      4: { sumaMin: 8, sumaMax: 10, topeAtq: 7, topeRes: 7 },
      5: { sumaMin: 10, sumaMax: 13, topeAtq: 8, topeRes: 8 },
      6: { sumaMin: 13, sumaMax: 16, topeAtq: 10, topeRes: 10 },
      7: { sumaMin: 16, sumaMax: 20, topeAtq: 13, topeRes: 13 },
      8: { sumaMin: 20, sumaMax: 25, topeAtq: 16, topeRes: 16 },
      9: { sumaMin: 22, sumaMax: 27, topeAtq: 18, topeRes: 18 },
      10: { sumaMin: 24, sumaMax: 30, topeAtq: 20, topeRes: 20 },
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
  it('pesa los verbos nuevos del rediseño de Estásis (activar_disparo y anclar_eter) y anclar_eter es identidad de Estásis', () => {
    expect(CONFIG_V1.poder.verbo.activar_disparo).toBe(2)
    expect(CONFIG_V1.poder.verbo.anclar_eter).toBe(2)
    expect(CONFIG_V1.identidad.estasis.identidad).toContain('anclar_eter')
    expect(CONFIG_V1.identidad.disonancia.identidad).not.toContain('anclar_eter')
  })

  it('la duración «mientras tenga Éter bloqueado» pesa igual que «mientras ese Éter esté bloqueado»', () => {
    expect(CONFIG_V1.poder.duracion.mientras_tenga_eter_bloqueado).toBe(CONFIG_V1.poder.duracion.mientras_ester_bloqueado)
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
