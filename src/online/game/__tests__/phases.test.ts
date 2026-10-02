// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { createInitialState } from '../initialState'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'
import { expandirMazo } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS) // 66: 15 Éter + 45 Principal + 6 Vínculos
const deckB = expandirMazo(DISONANCIA_CARDS)

/** Arranca la partida con ambos mulligans pasados: fase forja, turno = primerJugador. */
function partidaIniciada(seed: number): { state: GameState; ctx: Ctx } {
  const { state, ctx } = createInitialState(deckA, deckB, seed)
  let s = state
  for (const accion of [{ type: 'pasar_mulligan' }, { type: 'pasar_mulligan' }] as const) {
    const r = applyAction(s, accion, ctx)
    if (!r.ok) throw new Error(`arranque falló: ${r.error}`)
    s = r.state
  }
  return { state: s, ctx }
}

/** Aplica una acción asumiendo que es válida; devuelve el estado resultante. */
function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const rivalDe = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A')

/** Busca un evento por tipo en la última acción (ctx.events se resetea por applyAction). */
const evento = <T extends { type: string }>(events: Ctx['events'], tipo: T['type']): T | undefined =>
  events.find((e): e is T => e.type === tipo)

describe('máquina de fases y turnos (R7)', () => {
  it('turno completo: Forja → Choque → Ocaso → Alba del rival (auto-resuelta) → Forja del rival; primerTurno se apaga', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const b = rivalDe(a)
    expect(state.fase).toBe('forja')
    expect(state.primerTurno).toBe(true)

    // Forja → Choque
    let s = aplicar(state, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('choque')
    expect(evento<{ type: 'fase_iniciada'; fase: string; jugador: PlayerId }>(ctx.events, 'fase_iniciada'))
      .toEqual({ type: 'fase_iniciada', fase: 'choque', jugador: a })

    // Choque → Ocaso
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('ocaso')
    expect(evento<{ type: 'fase_iniciada'; fase: string; jugador: PlayerId }>(ctx.events, 'fase_iniciada'))
      .toEqual({ type: 'fase_iniciada', fase: 'ocaso', jugador: a })

    // Ocaso → cambio de turno + Alba auto-resuelta del rival
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('forja')
    expect(s.turno).toBe(b)
    expect(s.primerTurno).toBe(false)
    // B robó en su Alba (mano ≥ 6 — DS-026 puede haberle descontado cartas)
    expect(s.players[b].mano.length).toBeGreaterThanOrEqual(6)
    expect(s.players[b].mazo.length).toBeLessThanOrEqual(39)
    // Eventos de FASE de la última acción (robados, en orden)
    const fases = ctx.events.filter((e) => e.type === 'fase_iniciada') as Array<{ type: 'fase_iniciada'; fase: string; jugador: PlayerId }>
    expect(fases.map((e) => e.fase)).toEqual(['alba', 'forja'])
    expect(fases[0].jugador).toBe(b)
    expect(fases[1].jugador).toBe(b)
    expect(evento<{ type: 'turno_iniciado'; jugador: PlayerId }>(ctx.events, 'turno_iniciado'))
      .toEqual({ type: 'turno_iniciado', jugador: b })
  })

  it('el Éter pagado vuelve a la Reserva en la Alba del DUEÑO (no en la del rival)', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const b = rivalDe(a)
    // Simula que A pagó 3 Éter en su Forja: 2A → 1A
    const pagados = state.players[a].eterReserva.slice(0, 3)
    let s: GameState = {
      ...state,
      players: {
        ...state.players,
        [a]: {
          ...state.players[a],
          eterReserva: state.players[a].eterReserva.slice(3),
          eterPagado: [...state.players[a].eterPagado, ...pagados],
        },
      },
    }
    expect(s.players[a].eterPagado).toEqual(pagados)

    // A juega su turno: los Éteres pagados de A siguen en 1A (DS-027 puede añadir más)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(b)
    expect(s.players[a].eterPagado).toEqual(expect.arrayContaining(pagados))
    expect(s.players[a].eterPagado.length).toBeGreaterThanOrEqual(3)

    // B juega su turno → Alba de A: TODO el Éter pagado de A se reagrupa a 2A
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(a)
    expect(s.players[a].eterPagado).toEqual([])
    for (const id of pagados) {
      expect(s.players[a].eterReserva).toContain(id)
    }
    // eter_reagrupado emitió para A en su Alba
    const reagrupo = evento<{ type: 'eter_reagrupado'; jugador: PlayerId; eterIds: string[] }>(ctx.events, 'eter_reagrupado')
    expect(reagrupo?.jugador).toBe(a)
  })

  it('derrota por mazo vacío: al robar en Alba con 3G vacío emite mazo_agotado + partida_terminada', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const b = rivalDe(a)
    // Vacía el mazo de A (mano 6 ≤ 6, puede pasar Ocaso)
    let s: GameState = { ...state, players: { ...state.players, [a]: { ...state.players[a], mazo: [] } } }

    // A pasa su turno → B en Alba (B roba con normalidad)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(b)

    // B pasa su turno → Alba de A → A roba con el mazo vacío → derrota
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) throw new Error('pasar_turno falló')
    expect(r.state.fase).toBe('terminada')
    expect(r.state.ganador).toBe(b)
    expect(r.state.motivo).toBe('mazo_vacio')
    // Eventos clave de la última acción (robados — side-effects de vínculos OK)
    expect(evento<{ type: 'mazo_agotado'; jugador: PlayerId }>(ctx.events, 'mazo_agotado'))
      .toEqual({ type: 'mazo_agotado', jugador: a })
    expect(evento<{ type: 'partida_terminada'; ganador: PlayerId; motivo: string }>(ctx.events, 'partida_terminada'))
      .toEqual({ type: 'partida_terminada', ganador: b, motivo: 'mazo_vacio' })
  })

  it('límite de mano en Ocaso: pasar_turno inválido mientras mano > 6; descartar_carta lo desbloquea', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    // Mano 6 → 8: mueve 2 cartas del mazo a la mano
    const extra = state.players[a].mazo.slice(0, 2)
    let s: GameState = {
      ...state,
      players: {
        ...state.players,
        [a]: {
          ...state.players[a],
          mano: [...state.players[a].mano, ...extra],
          mazo: state.players[a].mazo.slice(2),
        },
      },
    }
    expect(s.players[a].mano).toHaveLength(8)

    // Forja → Choque → Ocaso (pasar_turno sigue válido en forja/choque)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('ocaso')

    // En Ocaso con 8 cartas: pasar_turno NO está en getValidActions
    expect(getValidActions(s, a).map((x) => x.type)).not.toContain('pasar_turno')

    // applyAction lo rechaza sin mutar el estado (fallo atómico)
    const antes = JSON.stringify(s)
    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(false)
    expect(JSON.stringify(r.state)).toBe(antes)

    // descartar_carta está disponible y desbloquea el Ocaso
    const descartes = getValidActions(s, a).filter((x) => x.type === 'descartar_carta')
    expect(descartes.length).toBeGreaterThan(0)
    s = aplicar(s, { type: 'descartar_carta', cardInstanceIds: extra }, ctx)
    expect(s.players[a].mano).toHaveLength(6)
    expect(s.players[a].cementerio).toEqual(extra)
    expect(ctx.events).toEqual([{ type: 'carta_descartada', jugador: a, cardInstanceIds: extra }])

    // Con mano ≤ 6, pasar_turno vuelve a estar disponible
    expect(getValidActions(s, a).map((x) => x.type)).toContain('pasar_turno')
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(rivalDe(a))
  })

  it('pasar_turno es inválido fuera de forja/choque/ocaso (pre_partida y terminada)', () => {
    const { state, ctx } = createInitialState(deckA, deckB, 123)
    expect(state.fase).toBe('pre_partida')
    expect(getValidActions(state, 'A').map((a) => a.type)).not.toContain('pasar_turno')
    const r = applyAction(state, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(false)

    // Partida terminada: sin acciones válidas
    const { state: s2, ctx: ctx2 } = partidaIniciada(123)
    const rendirse = applyAction(s2, { type: 'rendirse' }, ctx2)
    if (!rendirse.ok) throw new Error('rendirse falló')
    expect(rendirse.state.fase).toBe('terminada')
    expect(getValidActions(rendirse.state, 'A')).toEqual([])
    const r2 = applyAction(rendirse.state, { type: 'pasar_turno' }, ctx2)
    expect(r2.ok).toBe(false)
  })

  it('la Alba auto-resuelta endereza Campeones agotados antes de reagrupar/robar', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    // Pone un Campeón agotado en el campo de A (slot 0)
    const campeonId = state.players[a].mano[0]
    let s: GameState = {
      ...state,
      instances: { ...state.instances, [campeonId]: { ...state.instances[campeonId], agotado: true } },
      players: {
        ...state.players,
        [a]: { ...state.players[a], campo: { ...state.players[a].campo, campeones: [campeonId, null, null, null, null] } },
      },
    }
    expect(s.instances[campeonId].agotado).toBe(true)

    // A juega su turno completo; en la Alba de B el campeón de A sigue agotado (no es su Alba)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.instances[campeonId].agotado).toBe(true)

    // B juega su turno completo → Alba de A: endereza (silencioso, sin evento)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(a)
    expect(s.instances[campeonId].agotado).toBeUndefined()
    // Enderezar es silencioso: no hay evento propio; los eventos de FASE de la
    // última acción (robados — side-effects de vínculos FB-027/FB-029 OK)
    expect(evento<{ type: 'turno_iniciado'; jugador: PlayerId }>(ctx.events, 'turno_iniciado'))
      .toEqual({ type: 'turno_iniciado', jugador: a })
    const alba = ctx.events.find((e) => e.type === 'fase_iniciada' && (e as { fase: string }).fase === 'alba')
    expect(alba).toMatchObject({ type: 'fase_iniciada', fase: 'alba', jugador: a })
  })
})
