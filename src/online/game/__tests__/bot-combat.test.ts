// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida } from '../bot'
import { verificarInvariantes } from '../invariants'
import { expandirMazo } from './helpers'

/**
 * Simulación con combate + cadena 9.6 (C4): el bot pasa prioridad SIEMPRE
 * (ADR-19), así que la cadena nunca encadena cartas — pero la ventana se abre
 * y cierra sin deadlock, manteniendo invariantes y determinismo.
 */
const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('simularPartida con cadena 9.6 (C4)', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it.each(seeds)('seed %i: termina sin deadlock en <500 turnos y respeta las invariantes', (seed) => {
    const { estado, turnos } = simularPartida(deckA, deckB, seed)

    expect(turnos).toBeGreaterThan(0)
    expect(turnos).toBeLessThan(500)
    if (estado.fase === 'terminada') {
      expect(estado.ganador === 'A' || estado.ganador === 'B').toBe(true)
    }
    expect(verificarInvariantes(estado)).toEqual([])
  })

  it('mismo seed → mismo estado y misma secuencia de eventos (determinismo con cadena)', () => {
    const a = simularPartida(deckA, deckB, 123)
    const b = simularPartida(deckA, deckB, 123)
    expect(JSON.stringify(a.estado)).toBe(JSON.stringify(b.estado))
    expect(JSON.stringify(a.eventos)).toBe(JSON.stringify(b.eventos))
    expect(a.turnos).toBe(b.turnos)
  })

  it('el bot NUNCA encadena cartas (ADR-19): sin respuesta_encadenada, solo prioridad_pasada', () => {
    const { eventos } = simularPartida(deckA, deckB, 1)
    const tipos = eventos.map((e) => e.type)
    expect(tipos).not.toContain('respuesta_encadenada')
    // Si la cadena llegó a abrirse alguna vez, el bot pasó la prioridad
    expect(tipos.includes('prioridad_pasada') || !tipos.includes('ataque_declarado')).toBe(true)
  })
})
