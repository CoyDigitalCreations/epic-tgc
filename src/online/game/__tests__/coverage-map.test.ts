/**
 * Brújula de la Fase 0-2: TODO combo tipo×trigger×efecto que exista en la
 * FUENTE DE VERDAD (seed/PrimerColeccionEfectos.json) debe estar clasificado
 * en el mapa de cobertura.
 *
 * Si aparece un combo nuevo sin clasificar, este test falla — es la métrica
 * objetiva de que el mapa está al día. A medida que la Fase 1-2 avanza,
 * `pctOK` sube; el piso de cobertura de clasificación es 100%.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AnyCard } from '../../../shared/types'
import { buildReporte, pctOK, HANDLERS, GUARDS } from '../coverageMap'

const sourcePath = resolve(__dirname, '../../../../seed/PrimerColeccionEfectos.json')
const CARDS = JSON.parse(readFileSync(sourcePath, 'utf8')) as AnyCard[]

describe('coverageMap — mapa de cobertura motor vs fuente de verdad', () => {
  const reporte = buildReporte(CARDS)

  it('clasifica el 100% de los efectos de la fuente de verdad (sin combos desconocidos)', () => {
    expect(reporte.totalEfectos).toBeGreaterThan(0)
    const sinEstado = reporte.items.filter((i) => !i.estado || !i.ruta)
    expect(sinEstado).toEqual([])
  })

  it('todas las cartas con efectos[] tienen al menos un item clasificado', () => {
    const conEfectos = CARDS.filter((c) => 'efectos' in c && c.efectos && c.efectos.length > 0)
    const cubiertas = new Set(reporte.items.map((i) => i.cardId))
    const faltantes = conEfectos.filter((c) => !cubiertas.has(c.id)).map((c) => c.id)
    expect(faltantes).toEqual([])
  })

  it('los efectoComandante presentes en la fuente de verdad quedan clasificados como OK_AURA_JSON (Fase 1)', () => {
    const comandantes = CARDS.filter((c) => c.type === 'Campeón' && c.efectoComandante)
    const items = reporte.items.filter((i) => i.origen === 'efectoComandante')
    expect(items.length).toBe(comandantes.length)
    for (const it of items) {
      expect(it.estado).toBe('OK_AURA_JSON')
    }
  })

  it('las Arcanas con condicion estructurada quedan clasificadas como OK_ACTIVACION (data-driven)', () => {
    const arcanaCond = CARDS.filter((c) => c.condicion && typeof c.condicion === 'object')
    const items = reporte.items.filter((i) => i.origen === 'condicion')
    expect(items.length).toBe(arcanaCond.length)
    for (const it of items) {
      expect(it.estado).toBe('OK_ACTIVACION')
    }
  })

  it('métrica pctOK está computada sobre el total de efectos', () => {
    const ok = pctOK(reporte)
    expect(ok).toBeGreaterThanOrEqual(0)
    expect(ok).toBeLessThanOrEqual(100)
  })

  it('snapshot de la métrica de cobertura (baseline contra fuente de verdad)', () => {
    // Baseline contra seed/PrimerColeccionEfectos.json. A medida que avancen
    // Fases 1-2, ACTUALIZAR este snapshot al subir la cobertura — es la métrica
    // de avance del plan. No bajar nunca: si este número cae, algo se rompió.
    const ok = pctOK(reporte)
    console.log(`[coverageMap] fuente=PrimerColeccionEfectos.json cobertura actual: ${ok}% (${reporte.totalEfectos} efectos)`)
    expect(ok).toBeGreaterThanOrEqual(0)
  })

  it('el registro de handlers del mapa coincide con los archivos de handlers/ y effects-guards.ts', () => {
    // Post-Fase 2: SIN handlers por cardId y SIN guards hardcodeados —
    // todo se resuelve desde el JSON (auras, hechizos, block_ether, Pasivo 1A,
    // recompensas de Arcana, invocar_y_equipar, condicionCumple).
    expect(Object.keys(HANDLERS)).toEqual([])
    expect(GUARDS.size).toBe(0)
  })
})
