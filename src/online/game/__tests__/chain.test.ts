// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { respondiblesDe } from '../chain'
import { getCardMeta, registrarCartas, type AnyCard } from '../cards'
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
// F5f: responder con una Arcana exige cumplir su `condicion` (FB-023: 2 Campeones propios con Éter bloqueado). Estos
// tests son de mecánica de cadena, no de esa condición: usan un clon de FB-023 sin condicion.
const ARCANA = 'TEST-ARCANA-LIBRE'
registrarCartas([{ ...getCardMeta('FB-023')!, id: ARCANA, condicion: undefined } as AnyCard])
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

/** F5e: responder con una Arcana la PAGA — le da `n` Éteres inertes (FB-007) en la Reserva. */
function conEteres(s: GameState, owner: PlayerId, n: number): GameState {
  const ids = Array.from({ length: n }, (_, i) => `eter-${owner}-${i}`)
  const instances = { ...s.instances }
  for (const id of ids) instances[id] = { cardInstanceId: id, cardId: 'FB-007', owner }
  return { ...s, instances, players: { ...s.players, [owner]: { ...s.players[owner], eterReserva: [...s.players[owner].eterReserva, ...ids] } } }
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

describe('visibleState con cadena (6.2)', () => {
  it('la Arcana rival en la pila de la cadena es visible para el atacante', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const arcB = conCarta(a.s, ARCANA, 'arcanasCombate', 0, { owner: 'B' })
    const s1 = aplicar(conEteres(arcB.s, 'B', 2), { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    const s2 = aplicar(s1, { type: 'responder_cadena', cardInstanceId: arcB.id }, ctx)

    const visA = visibleState(s2, 'A') // el RIVAL ve la Arcana respondida
    expect(visA.instances[arcB.id].cardId).toBe(ARCANA)
  })
})

describe('entradaEsteTurno — caduca al terminar TU turno (fix 2026-10-14)', () => {
  it('una Arcana colocada en tu turno SÍ puede responder en el turno del rival siguiente', () => {
    // Este era el bug de "Marcha de las Primeras": el flag se limpiaba recién
    // en tu próximo Alba, dejando a la Arcana muda durante TODO el turno rival.
    const ctx = crearCtx()
    // Arcana de A colocada en el turno de A (entradaEsteTurno=true), luego A
    // pasa el turno → el flag debe caducar.
    const arc = conCarta(conEteres(estadoMinimo(), 'A', 2), ARCANA, 'arcanasCombate', 0, { entradaEsteTurno: true })
    // respondibles de A con el flag puesto: NO puede responder (mismo turno)
    expect(respondiblesDe(arc.s, 'A')).not.toContain(arc.id)
    // A termina su turno (forja→choque→ocaso→alba del rival)
    let s = arc.s
    s.fase = 'forja'
    const finTurno = aplicar(s, { type: 'pasar_turno' }, ctx) // forja→choque
    const finChoque = aplicar(finTurno, { type: 'pasar_turno' }, ctx) // choque→ocaso
    const cambio = aplicar(finChoque, { type: 'pasar_turno' }, ctx) // ocaso→turno rival
    // El flag caducó al terminar el turno de A
    expect(cambio.instances[arc.id].entradaEsteTurno).toBeUndefined()
    // Ahora, en el turno del rival, A SÍ puede responder con su Arcana
    expect(respondiblesDe(cambio, 'A')).toContain(arc.id)
  })
})
