// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createInitialState } from '../initialState'
import { interpretEffect } from '../effectInterpreter'
import type { GameState, PlayerId } from '../types'
import type { EfectoData } from '../../../shared/types/cards'

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

/** Create a mock context */
function createCtx() {
  const events: any[] = []
  return {
    next: () => 0,
    emit: (e: any) => events.push(e),
    events,
  }
}

describe('effectInterpreter', () => {
  describe('interpretEffect', () => {
    it('should execute buff effect', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'A', 0)

      const efectoData: EfectoData = {
        tipo: 'pasivo',
        efecto: 'buff',
        objetivo: {
          tipo: 'self',
          controlador: 'propio',
          zona: 'campo',
        },
        stats: { ATQ: 2, RES: 1 },
      }

      const ctx = createCtx()
      const inst = s.instances['c1']
      const payload = { jugador: 'A' as PlayerId }

      interpretEffect(s, ctx, inst, efectoData, payload)

      // Verify buff was applied
      const updatedInst = s.instances['c1']
      expect(updatedInst?.modificadores).toBeDefined()
      expect(updatedInst?.modificadores?.length).toBe(2)
    })

    it('should execute draw effect', () => {
      let s = createTestState()
      s = addInstance(s, 'c1', 'FB-010', 'A')
      
      // Add cards to deck
      const p = s.players['A']
      s = {
        ...s,
        players: {
          ...s.players,
          A: { ...p, mazo: ['card1', 'card2', 'card3'] },
        },
      }

      const efectoData: EfectoData = {
        tipo: 'hechizo',
        efecto: 'draw',
        cantidad: 2,
      }

      const ctx = createCtx()
      const inst = s.instances['c1']
      const payload = { jugador: 'A' as PlayerId }

      interpretEffect(s, ctx, inst, efectoData, payload)

      // Verify cards were drawn
      const updatedP = s.players['A']
      expect(updatedP.mano.length).toBe(2)
      expect(updatedP.mazo.length).toBe(1)
    })

    it('should execute grant_keyword effect', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'A', 0)

      const efectoData: EfectoData = {
        tipo: 'pasivo',
        efecto: 'grant_keyword',
        objetivo: {
          tipo: 'self',
          controlador: 'propio',
          zona: 'campo',
        },
        keyword: 'Inmortal',
        duracion: 'turno',
      }

      const ctx = createCtx()
      const inst = s.instances['c1']
      const payload = { jugador: 'A' as PlayerId }

      interpretEffect(s, ctx, inst, efectoData, payload)

      // Verify keyword was granted
      const updatedInst = s.instances['c1']
      expect(updatedInst?.keywordsTemporales).toContain('Inmortal')
    })

    it('should execute destroy effect', () => {
      let s = createTestState()
      s = placeChampion(s, 'c1', 'FB-010', 'A', 0)
      s = placeChampion(s, 'c2', 'FB-011', 'B', 0)

      const efectoData: EfectoData = {
        tipo: 'hechizo',
        efecto: 'destroy',
        objetivo: {
          tipo: 'campeon',
          controlador: 'rival',
          zona: 'campo',
        },
      }

      const ctx = createCtx()
      const inst = s.instances['c1']
      const payload = { jugador: 'A' as PlayerId }

      interpretEffect(s, ctx, inst, efectoData, payload)

      // Verify target was destroyed (moved to cemetery)
      const rivalP = s.players['B']
      expect(rivalP.cementerio).toContain('c2')
      expect(rivalP.campo.campeones).not.toContain('c2')
    })
  })
})