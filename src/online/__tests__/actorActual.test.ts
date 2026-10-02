import { describe, it, expect } from 'vitest'
import { actorActual } from '../usePartida'
import type { GameState } from '../game/types'

function estadoBase(overrides: Partial<GameState> = {}): GameState {
  const jugador = (id: 'A' | 'B') => ({
    id,
    mano: [], mazo: [], cementerio: [], exilio: [],
    eterReserva: [], eterPagado: [],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 1,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
    ...overrides,
  } as GameState
}

describe('actorActual — cadena global (fix freeze 66676)', () => {
  it('cadena GLOBAL en Forja: el actor es prioridad, NO el turno', () => {
    const s = estadoBase({
      fase: 'forja',
      turno: 'A',
      cadena: { pila: [], prioridad: 'B', pasesConsecutivos: 0, faseAbierta: 'forja' },
    })
    expect(actorActual(s)).toBe('B')
  })

  it('cadena global prioridad A en forja → actor A', () => {
    const s = estadoBase({
      turno: 'B',
      cadena: { pila: [], prioridad: 'A', pasesConsecutivos: 1, faseAbierta: 'forja' },
    })
    expect(actorActual(s)).toBe('A')
  })

  it('sin cadena: forja con turno A → actor A', () => {
    const s = estadoBase({ fase: 'forja', turno: 'A' })
    expect(actorActual(s)).toBe('A')
  })

  it('prevenición pendiente manda sobre cadena', () => {
    const s = estadoBase({
      preventivosPendientes: [{ victimId: 'v1', fuenteId: 'f1', jugador: 'B', causa: 'efecto' }],
      cadena: { pila: [], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' },
    })
    expect(actorActual(s)).toBe('B')
  })
})
