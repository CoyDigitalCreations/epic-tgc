// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createInitialState } from '../initialState'
import { resolveTargets } from '../targetResolver'
import type { GameState, PlayerId } from '../types'
import type { ObjetivoEfecto } from '../../../shared/types/cards'

/** Create minimal game state for testing */
function createTestState(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: {
      campeones: [null, null, null, null, null],
      misticasTacticas: [null, null, null],
      arcanasCombate: [null, null, null],
    },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 1,
    fase: 'choque',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Add a card instance to the state */
function addInstance(
  s: GameState,
  id: string,
  cardId: string,
  owner: PlayerId,
  overrides?: Partial<any>,
): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      [id]: {
        cardInstanceId: id,
        cardId,
        owner,
        ...overrides,
      },
    },
  }
}

/** Place a champion on the field */
function placeChampion(
  s: GameState,
  id: string,
  cardId: string,
  owner: PlayerId,
  slot: number,
): GameState {
  const newState = addInstance(s, id, cardId, owner)
  const p = newState.players[owner]
  const newCampo = { ...p.campo }
  const newCampeones = [...newCampo.campeones]
  newCampeones[slot] = id
  newCampo.campeones = newCampeones
  return {
    ...newState,
    players: {
      ...newState.players,
      [owner]: { ...p, campo: newCampo },
    },
  }
}

describe('targetResolver', () => {
  describe('resolveTargets', () => {
    it('should resolve self target', () => {
      const s = createTestState()
      const objetivo: ObjetivoEfecto = {
        tipo: 'self',
        controlador: 'propio',
        zona: 'campo',
      }
      const result = resolveTargets(s, objetivo, 'A')
      // Self targets are handled by the caller
      expect(result).toEqual([])
    })

    it('should resolve champion targets on field', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'A', 0)
      s = placeChampion(s, 'c2', 'FB-011', 'A', 1)

      const objetivo: ObjetivoEfecto = {
        tipo: 'campeon',
        controlador: 'propio',
        zona: 'campo',
      }
      const result = resolveTargets(s, objetivo, 'A')
      expect(result).toContain('c1')
      expect(result).toContain('c2')
    })

    it('should resolve rival champion targets', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'B', 0)

      const objetivo: ObjetivoEfecto = {
        tipo: 'campeon',
        controlador: 'rival',
        zona: 'campo',
      }
      const result = resolveTargets(s, objetivo, 'A')
      expect(result).toContain('c1')
    })

    it('should resolve both controllers', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'A', 0)
      s = placeChampion(s, 'c2', 'FB-011', 'B', 0)

      const objetivo: ObjetivoEfecto = {
        tipo: 'campeon',
        controlador: 'ambos',
        zona: 'campo',
      }
      const result = resolveTargets(s, objetivo, 'A')
      expect(result).toContain('c1')
      expect(result).toContain('c2')
    })

    it('should resolve cemetery targets', () => {
      let s = createTestState()
      s = addInstance(s, 'c1', 'FB-010', 'A')
      const p = s.players['A']
      const newCementerio = [...p.cementerio, 'c1']
      s = {
        ...s,
        players: {
          ...s.players,
          A: { ...p, cementerio: newCementerio },
        },
      }

      const objetivo: ObjetivoEfecto = {
        tipo: 'campeon',
        controlador: 'propio',
        zona: 'cementerio',
      }
      const result = resolveTargets(s, objetivo, 'A')
      expect(result).toContain('c1')
    })

    it('should resolve reserve ether targets', () => {
      let s = createTestState()
      s = addInstance(s, 'e1', 'FB-001', 'A')
      const p = s.players['A']
      const newReserva = [...p.eterReserva, 'e1']
      s = {
        ...s,
        players: {
          ...s.players,
          A: { ...p, eterReserva: newReserva },
        },
      }

      const objetivo: ObjetivoEfecto = {
        tipo: 'eter',
        controlador: 'propio',
        zona: 'reserva',
      }
      const result = resolveTargets(s, objetivo, 'A')
      expect(result).toContain('e1')
    })
  })
})