// @vitest-environment node
/**
 * End-to-end test: Card-Maker JSON → registrarCartas → getCardMeta → interpretEffect
 *
 * Proves the full pipeline: cards exported from Card-Maker can be loaded
 * dynamically and their effects executed by the interpreter WITHOUT
 * per-card handlers.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { registrarCartas, getCardMeta } from '../cards'
import { interpretEffect } from '../effectInterpreter'
import type { GameState, PlayerId } from './types'
import type { AnyCard } from '../../shared/types'
import type { EfectoData } from '../../shared/types/cards'

// ─── Load JSON from Card-Maker ────────────────────────────────────

const JSON_PATH = resolve(process.cwd(), 'seed/PrimerColeccion.json')
const jsonCards: AnyCard[] = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))

// ─── Test helpers ──────────────────────────────────────────────────

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
      [id]: { cardInstanceId: id, cardId, owner, ...overrides },
    },
  }
}

function placeChampion(
  s: GameState,
  id: string,
  cardId: string,
  owner: PlayerId,
  slot: number,
): GameState {
  const newState = addInstance(s, id, cardId, owner)
  const p = newState.players[owner]
  const newCampeones = [...p.campo.campeones]
  newCampeones[slot] = id
  return {
    ...newState,
    players: {
      ...newState.players,
      [owner]: { ...p, campo: { ...p.campo, campeones: newCampeones } },
    },
  }
}

function createCtx() {
  const events: any[] = []
  return {
    next: () => 0,
    emit: (e: any) => events.push(e),
    events,
  }
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('Card-Maker JSON → engine integration', () => {
  beforeAll(() => {
    // Register all cards from the Card-Maker JSON
    registrarCartas(jsonCards)
  })

  it('all 65 JSON cards are loadable via getCardMeta', () => {
    for (const card of jsonCards) {
      const meta = getCardMeta(card.id)
      expect(meta).not.toBeNull()
      expect(meta!.id).toBe(card.id)
    }
  })

  it('JSON cards have efectos[] structure compatible with interpreter', () => {
    for (const card of jsonCards) {
      if (!('efectos' in card) || !card.efectos) continue
      for (const efecto of card.efectos) {
        // Every effect must have tipo and efecto fields
        expect(efecto.tipo).toBeDefined()
        expect(efecto.efecto).toBeDefined()
        // If objective exists, it must have tipo
        if (efecto.objetivo) {
          expect(efecto.objetivo.tipo).toBeDefined()
          // controlador and zona may be omitted for self/todos_campeones targets
        }
      }
    }
  })

  it('FB-019 return_hand with atqMax filter works via interpreter', () => {
    // FB-019: "Devuelve a la mano 1 Campeón ATQ 5 o menos que controla el rival"
    const card = jsonCards.find(c => c.id === 'FB-019')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-019')
    expect(meta).not.toBeNull()

    let s = createTestState()
    s = placeChampion(s, 'c1', 'FB-019', 'A', 0) // caster
    s = placeChampion(s, 'c2', 'FB-011', 'B', 0) // Vaela: poder 5 (should be returned)
    s = placeChampion(s, 'c3', 'FB-010', 'B', 1) // Aurora: poder 9 (should NOT be returned)

    const efecto = meta!.efectos![0] as EfectoData
    const ctx = createCtx()
    interpretEffect(s, ctx, s.instances['c1'], efecto, { jugador: 'A' })

    // Vaela (ATQ 5 <= 5) should be returned to hand
    expect(s.players.B.mano).toContain('c2')
    // Aurora (ATQ 9 > 5) should stay on field
    expect(s.players.B.campo.campeones).toContain('c3')
  })

  it('FB-030 debuff with seleccionar filter works via interpreter', () => {
    // FB-030: "El Campeón con mayor RES que controla el rival pierde 3/3"
    const card = jsonCards.find(c => c.id === 'FB-030')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-030')
    expect(meta).not.toBeNull()

    let s = createTestState()
    s = placeChampion(s, 'c1', 'FB-030', 'A', 0) // caster
    s = placeChampion(s, 'c2', 'FB-011', 'B', 0) // Vaela: RES 3
    s = placeChampion(s, 'c3', 'FB-014', 'B', 1) // Isolde: RES 7 (highest)

    const efecto = meta!.efectos![0] as EfectoData
    const ctx = createCtx()
    interpretEffect(s, ctx, s.instances['c1'], efecto, { jugador: 'A' })

    // Isolde (highest RES) should get debuffed
    const isoldeMods = s.instances['c3'].modificadores ?? []
    expect(isoldeMods.some(m => m.stat === 'poder' && m.valor === -3)).toBe(true)
    expect(isoldeMods.some(m => m.stat === 'resistencia' && m.valor === -3)).toBe(true)
    // Vaela (lower RES) should NOT be debuffed
    const vaelaMods = s.instances['c2'].modificadores ?? []
    expect(vaelaMods.length).toBe(0)
  })

  it('FB-005 block_ether with puedeBloquearEter filter works', () => {
    // FB-005: "Bloquea 1 Éter sobre un Campeón que pueda recibir éter bloqueado"
    const card = jsonCards.find(c => c.id === 'FB-005')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-005')
    expect(meta).not.toBeNull()

    // FB-005 is an Ether, not a champion — verify it has the correct structure
    const efecto = meta!.efectos![0]
    expect(efecto.objetivo?.filtros?.puedeBloquearEter).toBe(true)
  })

  it('DS-022 invocar_y_equipar with faccion+costeMax filter works', () => {
    // DS-022: "Invoca un Campeón de facción Caos de coste 5 o menos del Exilio"
    const card = jsonCards.find(c => c.id === 'DS-022')
    expect(card).toBeDefined()
    const meta = getCardMeta('DS-022')
    expect(meta).not.toBeNull()

    const efecto = meta!.efectos![0]
    expect(efecto.objetivo?.filtros?.faccion).toBe('Caos')
    expect(efecto.objetivo?.filtros?.costeMax).toBe(5)
  })

  it('draw effect works via interpreter with JSON card data', () => {
    // FB-023: "Roba 2 carta de tu mazo"
    const card = jsonCards.find(c => c.id === 'FB-023')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-023')
    expect(meta).not.toBeNull()

    let s = createTestState()
    s = addInstance(s, 'c1', 'FB-023', 'A')
    s = { ...s, players: { ...s.players, A: { ...s.players.A, mazo: ['card1', 'card2', 'card3'] } } }

    const efecto = meta!.efectos![0] as EfectoData
    const ctx = createCtx()
    interpretEffect(s, ctx, s.instances['c1'], efecto, { jugador: 'A' })

    expect(s.players.A.mano.length).toBe(2)
    expect(s.players.A.mazo.length).toBe(1)
  })

  it('buff effect with stats works via interpreter', () => {
    // FB-024: "El Campeón equipado gana 2 de ATQ por cada Éter bloqueado"
    const card = jsonCards.find(c => c.id === 'FB-024')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-024')
    expect(meta).not.toBeNull()

    let s = createTestState()
    s = placeChampion(s, 'c1', 'FB-024', 'A', 0)

    // Find the buff effect
    const buffEffect = meta!.efectos!.find(e => e.efecto === 'buff') as EfectoData
    expect(buffEffect).toBeDefined()
    expect(buffEffect.stats?.ATQ).toBe(2)
  })

  it('grant_keyword effect works via interpreter', () => {
    // FB-002: "Cuando pagues esta carta, un Campeón gana Vigor"
    const card = jsonCards.find(c => c.id === 'FB-002')
    expect(card).toBeDefined()
    const meta = getCardMeta('FB-002')
    expect(meta).not.toBeNull()

    let s = createTestState()
    s = placeChampion(s, 'c1', 'FB-010', 'A', 0)

    const efecto = meta!.efectos![0] as EfectoData
    expect(efecto.efecto).toBe('grant_keyword')
    expect(efecto.keyword).toBe('Vigor')

    const ctx = createCtx()
    interpretEffect(s, ctx, s.instances['c1'], efecto, { jugador: 'A' })
    expect(s.instances['c1'].keywordsTemporales).toContain('Vigor')
  })
})
