// @vitest-environment node
/**
 * Invariante de cartas no-Éter (51 por jugador, manual: «dueño fijo»): se cuentan por DUEÑO, no por la zona donde estén.
 * Un Campeón robado (steal_champion) vive en el campo del ladrón y sigue siendo de su dueño; contarlo por zona daba
 * 52/50 y marcaba como rotas partidas legales (con bots difíciles, que roban más).
 */
import { describe, expect, it } from 'vitest'
import { simularPartida } from '../bot'
import { createInitialState } from '../initialState'
import { esCampeon, getCardMeta } from '../cards'
import { verificarInvariantes } from '../invariants'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('invariante de cartas no-Éter por dueño', () => {
  it('un Campeón robado en el campo del ladrón NO rompe el invariante', () => {
    const { state } = createInitialState(deckA, deckB, 1)
    expect(verificarInvariantes(state)).toEqual([])
    const id = state.players.B.mazo.find((x) => {
      const meta = state.instances[x]?.cardId ? getCardMeta(state.instances[x]!.cardId!) : null
      return !!meta && esCampeon(meta)
    })!
    state.players.B.mazo.splice(state.players.B.mazo.indexOf(id), 1)
    state.players.A.campo.campeones[0] = id // A lo controla; sigue siendo de B (instances[id].owner === 'B')
    expect(state.instances[id].owner).toBe('B')
    expect(verificarInvariantes(state)).toEqual([])
  })
  it('sigue detectando una carta perdida (el invariante no se aflojó)', () => {
    const { state } = createInitialState(deckA, deckB, 1)
    const perdida = state.players.B.mazo.find((x) => {
      const meta = state.instances[x]?.cardId ? getCardMeta(state.instances[x]!.cardId!) : null
      return !!meta && esCampeon(meta)
    })!
    state.players.B.mazo.splice(state.players.B.mazo.indexOf(perdida), 1) // desaparece de toda zona
    expect(verificarInvariantes(state).join(' ')).toMatch(/B: cartas no-Éter 50 ≠ 51/)
  })
  // Semillas que antes terminaban con 52/50: ahora terminan limpias (tope de acciones holgado: una partida pasa de 1000)
  it.each([
    [43, 'medio', 'medio'],
    [13, 'dificil', 'dificil'],
    [8, 'medio', 'dificil'],
  ] as const)('seed %i (%s vs %s): la partida termina con las invariantes intactas', (seed, a, b) => {
    const { estado } = simularPartida(deckA, deckB, seed, 6000, a, b)
    expect(estado.fase).toBe('terminada')
    expect(verificarInvariantes(estado)).toEqual([])
  })
})
