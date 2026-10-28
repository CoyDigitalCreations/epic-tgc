// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LIMITE_INACTIVIDAD_MS, inactividadExpirada } from '../inactividad'

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
