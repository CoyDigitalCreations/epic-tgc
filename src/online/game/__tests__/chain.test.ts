// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { visibleState } from '../visibleState'
import type { GameEvent } from '../events'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// FB-011 Vaela 5/3 Carga · FB-014 Isolde 3/7 Protector · FB-019 (Mística) ·
// FB-021 Marcha de las Primeras (Táctica) · FB-023 El Reino Perdido (Arcana) ·
// FB-024 Filo del Éter Primigenio (Combate)
const VAELA = 'FB-011'
const ISOLDE = 'FB-014'
const MISTICA = 'FB-019'
const TACTICA = 'FB-021'
const ARCANA = 'FB-023'
const COMBATE = 'FB-024'

function estadoMinimo(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 7,
    fase: 'choque' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

interface OpcionesCarta {
  owner?: PlayerId
  entradaEsteTurno?: boolean
  bocaArriba?: boolean
}

/** Carta de `owner` en el campo: Campeón (2B-2F) o Táctica/Mística (3A-3C) o Arcana/Combate (3D-3F). */
function conCarta(
  s: GameState,
  cardId: string,
  grupo: 'campeones' | 'misticasTacticas' | 'arcanasCombate',
  slot: number,
  opts: OpcionesCarta = {},
): { s: GameState; id: string } {
  const owner = opts.owner ?? 'A'
  const id = `c-${cardId}-${grupo}-${slot}`
  const inst: Record<string, unknown> = { cardInstanceId: id, cardId, owner }
  if (opts.entradaEsteTurno !== undefined) inst.entradaEsteTurno = opts.entradaEsteTurno
  if (opts.bocaArriba !== undefined) inst.bocaArriba = opts.bocaArriba
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: inst },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            [grupo]: s.players[owner].campo[grupo].map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Ctx que cuenta extracciones RNG (cadena = 0 extracciones, contrato 89). */
function ctxContador(): { ctx: Ctx; llamadas: () => number } {
  const events: GameEvent[] = []
  let n = 0
  return {
    ctx: { next: () => { n++; return 0 }, emit: (e) => { events.push(e) }, events },
    llamadas: () => n,
  }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const tiposDe = (s: GameState, p: PlayerId): string[] => getValidActions(s, p).map((a) => a.type)

// TODO: Phase 5 reescribirá estos tests con el sistema de velocidades
// describe('cadena 9.6 — apertura y prioridad (ADR-12)', () => { ... })

// TODO: Phase 5 reescribirá estos tests con el sistema de velocidades
// describe('responder_cadena (9.6) — pila, orden inverso y consumo', () => { ... })
// describe('pasar_prioridad y cierre (L1183)', () => { ... })

describe('visibleState con cadena (6.2)', () => {
  it('la Arcana rival en la pila de la cadena es visible para el atacante', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const arcB = conCarta(a.s, ARCANA, 'arcanasCombate', 0, { owner: 'B' })
    const s1 = aplicar(arcB.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    const s2 = aplicar(s1, { type: 'responder_cadena', cardInstanceId: arcB.id }, ctx)

    const visA = visibleState(s2, 'A') // el RIVAL ve la Arcana respondida
    expect(visA.instances[arcB.id].cardId).toBe(ARCANA)
  })
})
