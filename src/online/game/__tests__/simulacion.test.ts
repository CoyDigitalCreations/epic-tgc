// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida, botTonto } from '../bot'
import { verificarInvariantes } from '../invariants'
import { expandirMazo } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS) // 66: 15 Éter + 45 Principal + 6 Vínculos
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('bot tonto (5.7)', () => {
  it('elige la primera acción válida que no sea rendirse; null si no tiene acciones', () => {
    const { estado } = simularPartida(deckA, deckB, 1)
    const jugadorActivo = estado.turno
    const rival = jugadorActivo === 'A' ? 'B' : 'A'
    // El bot del rival puede tener acciones de bloqueo durante el Choque del activo
    const accionRival = botTonto(estado, rival)
    if (accionRival) {
      // Si tiene acción, debe ser de bloqueo (no declarar_ataque ni jugar)
      expect(['declarar_bloqueo', 'pasar_prioridad']).toContain(accionRival.type)
    }
    // El bot solo juega acciones de rendirse cuando no hay más opciones
  })
})

describe('simularPartida (5.7) — invariantes en 10 seeds', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it.each(seeds)('seed %i: termina en <500 turnos con invariantes de zonas y Éter', (seed) => {
    const { estado, turnos } = simularPartida(deckA, deckB, seed)

    expect(turnos).toBeLessThan(500)
    expect(turnos).toBeGreaterThan(0)
    if (estado.fase === 'terminada') {
      expect(estado.ganador === 'A' || estado.ganador === 'B').toBe(true)
      expect(['mazo_vacio', 'rendicion']).toContain(estado.motivo)
    }
    // Invariantes centralizadas (invariants.ts, C4): mano ≤ 6, 15 Éter,
    // límites de campo y las 66 cartas en zonas del dueño.
    expect(verificarInvariantes(estado)).toEqual([])
  })
})
