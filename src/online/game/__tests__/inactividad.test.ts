// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  LIMITES_INACTIVIDAD_S,
  LIMITE_INACTIVIDAD_DEFECTO_S,
  LIMITE_INACTIVIDAD_MS,
  esLimiteInactividadS,
  inactividadExpirada,
  vencimientoInactividad,
} from '../inactividad'

const T0 = Date.parse('2026-10-28T12:00:00.000Z')

describe('inactividadExpirada', () => {
  it('no expira dentro del límite ni justo en él', () => {
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', T0 + 1_000)).toBe(false)
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', T0 + LIMITE_INACTIVIDAD_MS)).toBe(false)
  })
  it('expira al pasar el límite', () => {
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', T0 + LIMITE_INACTIVIDAD_MS + 1)).toBe(true)
  })
  it('acepta el formato con zona de PostgREST y un límite propio', () => {
    expect(inactividadExpirada('2026-10-28T12:00:00.123456+00:00', T0 + 61_000, 60_000)).toBe(true)
  })
  it('una fecha ausente o ilegible nunca expira', () => {
    expect(inactividadExpirada(null, T0)).toBe(false)
    expect(inactividadExpirada(undefined, T0)).toBe(false)
    expect(inactividadExpirada('no-es-fecha', T0 + 10 * LIMITE_INACTIVIDAD_MS)).toBe(false)
  })
})

describe('límite configurable de la sala', () => {
  it('el defecto es de 5 min y es una de las opciones', () => {
    expect(LIMITE_INACTIVIDAD_DEFECTO_S).toBe(300)
    expect(LIMITE_INACTIVIDAD_MS).toBe(300_000)
    expect(LIMITES_INACTIVIDAD_S).toContain(LIMITE_INACTIVIDAD_DEFECTO_S)
  })
  it('solo valen los números fijos del lobby', () => {
    for (const s of LIMITES_INACTIVIDAD_S) expect(esLimiteInactividadS(s)).toBe(true)
    for (const malo of [0, 30, 61, 3600, -1, '300', null, undefined, NaN]) expect(esLimiteInactividadS(malo)).toBe(false)
  })
  it('cada límite vence en su propio plazo', () => {
    const mas = (s: number) => T0 + s * 1000 + 1
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', mas(60), 60_000)).toBe(true)
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', mas(60), 120_000)).toBe(false)
    expect(inactividadExpirada('2026-10-28T12:00:00.000Z', mas(600), 600_000)).toBe(true)
  })
})

describe('vencimientoInactividad', () => {
  it('es la última actividad más el límite', () => {
    expect(vencimientoInactividad('2026-10-28T12:00:00.000Z', 120_000)).toBe(T0 + 120_000)
    expect(vencimientoInactividad('2026-10-28T12:00:00.000Z')).toBe(T0 + LIMITE_INACTIVIDAD_MS)
  })
  it('sin fecha legible no hay vencimiento', () => {
    expect(vencimientoInactividad(null)).toBeNull()
    expect(vencimientoInactividad('xx')).toBeNull()
  })
})
