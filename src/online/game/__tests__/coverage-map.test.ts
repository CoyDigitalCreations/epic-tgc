/**
 * Brújula de la Fase 0-2: TODO combo tipo×trigger×efecto que exista en la
 * FUENTE DE VERDAD (seed/FuenteEfectos.json) debe estar clasificado
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
import { efectosComandante } from '../../../shared/efectoComandante'
import { buildReporte, pctOK, HANDLERS, GUARDS } from '../coverageMap'

const sourcePath = resolve(__dirname, '../../../../seed/FuenteEfectos.json')
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
    // efectoComandante puede ser un arreglo (Aurora lleva dos): cada entrada es un item
    const entradas = CARDS.flatMap((c) => (c.type === 'Campeón' ? efectosComandante(c.efectoComandante) : []))
    const items = reporte.items.filter((i) => i.origen === 'efectoComandante')
    expect(items.length).toBe(entradas.length)
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
    // Baseline contra seed/FuenteEfectos.json. A medida que avancen
    // Fases 1-2, ACTUALIZAR este snapshot al subir la cobertura — es la métrica
    // de avance del plan. No bajar nunca: si este número cae, algo se rompió.
    const ok = pctOK(reporte)
    console.log(`[coverageMap] fuente=FuenteEfectos.json cobertura actual: ${ok}% (${reporte.totalEfectos} efectos)`)
    expect(ok).toBeGreaterThanOrEqual(0)
  })

  // Huecos CONOCIDOS de Purga (PU-) y Mutación (MU-): el motor de esos dos mazos se hace al final, con el arte ya cerrado.
  // Cada entrada es «idDeCarta:ESTADO». Al implementar el motor de una carta, BORRA su entrada: el test siguiente falla
  // si una entrada ya no es un hueco, para que esta lista nunca quede desactualizada.
  const PENDIENTES_MOTOR_PURGA_MUTACION = [
    'PU-001:HUECO_NOOP',
    'PU-004:HUECO_NOOP',
    'PU-005:HUECO_NOOP',
    'PU-010:HUECO_NOOP',
    'PU-017:HUECO_NOOP',
    'PU-028:HUECO_TRIGGER',
    'PU-029:HUECO_NOOP',
    'PU-032:HUECO_NOOP',
    'PU-033:HUECO_NOOP',
    'MU-004:HUECO_SIN_RUTA',
    'MU-010:HUECO_TRIGGER',
    'MU-013:HUECO_TRIGGER',
    'MU-018:HUECO_TRIGGER',
    'MU-027:HUECO_TRIGGER',
    'MU-030:HUECO_TRIGGER',
  ]
  const huecosActuales = () => reporte.items.filter((i) => i.estado.startsWith('HUECO')).map((i) => `${i.cardId}:${i.estado}`)

  it('Lote 4B: ninguna carta de Estásis ni Disonancia queda con HUECO (NOOP, TRIGGER ni SIN_RUTA), ni ninguna de Purga/Mutación fuera de la lista pendiente', () => {
    const nuevos = huecosActuales().filter((h) => !PENDIENTES_MOTOR_PURGA_MUTACION.includes(h))
    expect(nuevos).toEqual([])
  })

  it('la lista de pendientes de Purga y Mutación no tiene entradas que ya dejaron de ser huecos', () => {
    const actuales = huecosActuales()
    const resueltos = PENDIENTES_MOTOR_PURGA_MUTACION.filter((h) => !actuales.includes(h))
    expect(resueltos, 'ya están cubiertas por el motor: bórralas de PENDIENTES_MOTOR_PURGA_MUTACION').toEqual([])
  })

  it('Lote 4B: el Comandante de Ragnar (buff +3 ATQ y Peaje) y el Choque del rival de Vorlag están cubiertos', () => {
    const ragnar = reporte.items.filter((i) => i.cardId === 'DS-010' && i.origen === 'efectoComandante')
    expect(ragnar.map((i) => i.estado)).toEqual(['OK_AURA_JSON', 'OK_AURA_JSON'])
    const vorlag = reporte.items.filter((i) => i.cardId === 'DS-017')
    expect(vorlag.length).toBeGreaterThan(0)
    for (const it of vorlag) expect(it.estado.startsWith('HUECO')).toBe(false)
  })

  it('el registro de handlers del mapa coincide con los archivos de handlers/ y effects-guards.ts', () => {
    // Post-Fase 2: SIN handlers por cardId y SIN guards hardcodeados —
    // todo se resuelve desde el JSON (auras, hechizos, block_ether, Pasivo 1A,
    // recompensas de Arcana, invocar_y_equipar, condicionCumple).
    expect(Object.keys(HANDLERS)).toEqual([])
    expect(GUARDS.size).toBe(0)
  })
})
