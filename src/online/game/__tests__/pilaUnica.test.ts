// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { cadenaActiva } from '../chain'
import { visibleState } from '../visibleState'
import { getValidActions, actorActual } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

// F5a — pila única: una sola ranura `GameState.cadena` (origen 'combate' | 'global').
// Cartas reales: FB-011 Vaela (Campeón) · FB-023 El Reino Perdido (Arcana).
const VAELA = 'FB-011'
const ARCANA = 'FB-023'
const MSG_CADENA = 'cadena abierta'

function estadoMinimo(fase: GameState['fase'] = 'forja'): GameState {
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
    fase,
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conCarta(
  s: GameState,
  cardId: string,
  grupo: 'campeones' | 'misticasTacticas' | 'arcanasCombate',
  slot: number,
  owner: PlayerId,
): string {
  const id = `c-${cardId}-${grupo}-${slot}-${owner}`
  s.instances[id] = { cardInstanceId: id, cardId, owner }
  s.players[owner].campo[grupo][slot] = id
  return id
}

/** F5e: responder con una Arcana la PAGA — `n` Éteres inertes (FB-007) en la Reserva de `owner`. */
function conEteres(s: GameState, owner: PlayerId, n: number): void {
  for (let i = 0; i < n; i++) {
    const id = `eter-${owner}-${i}`
    s.instances[id] = { cardInstanceId: id, cardId: 'FB-007', owner }
    s.players[owner].eterReserva.push(id)
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Estado en Forja con una cadena GLOBAL abierta: A tiene la Arcana respondible, prioridad de A. */
function conCadenaGlobal(): { s: GameState; arcana: string } {
  const s = estadoMinimo('forja')
  const arcana = conCarta(s, ARCANA, 'arcanasCombate', 0, 'A')
  conEteres(s, 'A', 2)
  s.cadena = { origen: 'global', pila: [], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' }
  return { s, arcana }
}

describe('cadenaActiva (F5a)', () => {
  it('sin cadena abierta devuelve undefined', () => {
    expect(cadenaActiva(estadoMinimo())).toBeUndefined()
  })

  it('devuelve la cadena global tal cual', () => {
    const { s } = conCadenaGlobal()
    expect(cadenaActiva(s)).toBe(s.cadena)
    expect(cadenaActiva(s)?.origen).toBe('global')
  })

  it('la cadena de combate vive en la misma ranura, con origen "combate"', () => {
    const ctx = crearCtx()
    const s0 = estadoMinimo('choque')
    const atacante = conCarta(s0, VAELA, 'campeones', 0, 'A')
    conCarta(s0, ARCANA, 'arcanasCombate', 0, 'B')
    conEteres(s0, 'B', 2)
    const r = applyAction(s0, { type: 'declarar_ataque', atacanteIds: [atacante] }, ctx)
    if (!r.ok) throw new Error(r.error)
    const cadena = cadenaActiva(r.state)
    expect(cadena?.origen).toBe('combate')
    expect(cadena?.prioridad).toBe('B') // el defensor responde primero (§9.6)
    expect(r.state.combate).toBeDefined()
    expect('cadena' in (r.state.combate ?? {})).toBe(false) // ya no hay segunda ranura
  })

  it('al cerrarse la cadena de combate la ranura queda libre y el combate continúa', () => {
    const ctx = crearCtx()
    const s0 = estadoMinimo('choque')
    const atacante = conCarta(s0, VAELA, 'campeones', 0, 'A')
    conCarta(s0, ARCANA, 'arcanasCombate', 0, 'B')
    conEteres(s0, 'B', 2)
    let s = applyAction(s0, { type: 'declarar_ataque', atacanteIds: [atacante] }, ctx)
    if (!s.ok) throw new Error(s.error)
    let estado = s.state
    for (let i = 0; i < 4 && cadenaActiva(estado); i++) {
      const r = applyAction(estado, { type: 'pasar_prioridad' }, ctx)
      if (!r.ok) throw new Error(r.error)
      estado = r.state
    }
    expect(cadenaActiva(estado)).toBeUndefined()
    expect(estado.cadena).toBeUndefined()
  })
})

describe('validación central con cadena abierta (F5a)', () => {
  const rechazadas: Action[] = [
    { type: 'pasar_turno' },
    { type: 'jugar_campeon', cardInstanceId: 'x', slot: 0, eterIds: [] },
    { type: 'activar_habilidad', cardInstanceId: 'x', eterIds: [] },
    { type: 'declarar_ataque', atacanteIds: ['x'] },
    { type: 'declarar_bloqueo', asignaciones: {} },
    { type: 'elegir_objetivo', objetivoId: 'x' },
    { type: 'elegir_opcion', opcionId: 'x' },
    { type: 'descartar_carta', cardInstanceIds: ['x'] },
    { type: 'elegir_ruptura', atacanteId: null },
    { type: 'mulligan' },
  ]

  for (const accion of rechazadas) {
    it(`rechaza ${accion.type} con la cadena abierta`, () => {
      const { s } = conCadenaGlobal()
      const r = applyAction(s, accion, crearCtx())
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error).toContain(MSG_CADENA)
        expect(r.state).toBe(s) // atómico: mismo estado
      }
    })
  }

  it('acepta pasar_prioridad', () => {
    const { s } = conCadenaGlobal()
    const r = applyAction(s, { type: 'pasar_prioridad' }, crearCtx())
    expect(r.ok).toBe(true)
  })

  it('acepta responder_cadena con una carta respondible', () => {
    const { s, arcana } = conCadenaGlobal()
    const r = applyAction(s, { type: 'responder_cadena', cardInstanceId: arcana }, crearCtx())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.cadena?.pila).toEqual([arcana])
  })

  it('acepta rendirse', () => {
    const { s } = conCadenaGlobal()
    const r = applyAction(s, { type: 'rendirse' }, crearCtx())
    expect(r.ok).toBe(true)
  })

  it('jugar_respuesta, bloquear_eter y responder_prevenicion no se rechazan por la cadena', () => {
    const { s } = conCadenaGlobal()
    const permitidas: Action[] = [
      { type: 'jugar_respuesta', cardInstanceId: 'x', eterIds: [] },
      { type: 'bloquear_eter', eterIds: [], targetInstanceId: 'x' },
    ]
    for (const accion of permitidas) {
      const r = applyAction(s, accion, crearCtx())
      // pueden fallar por sus propias reglas (carta inexistente), pero NO por la regla de la cadena
      if (!r.ok) expect(r.error).not.toContain(MSG_CADENA)
    }
    const conPreven = structuredClone(s)
    conPreven.preventivosPendientes = [{ jugador: 'A', fuenteId: 'f', victimId: 'v', causa: 'efecto' } as never]
    const r = applyAction(conPreven, { type: 'responder_prevenicion', prevenir: false }, crearCtx())
    if (!r.ok) expect(r.error).not.toContain(MSG_CADENA)
  })

  it('sin cadena las acciones normales siguen pasando por sus propios validadores', () => {
    const r = applyAction(estadoMinimo('forja'), { type: 'pasar_turno' }, crearCtx())
    expect(r.ok).toBe(true)
  })

  it('getValidActions y actorActual siguen la prioridad de la cadena única', () => {
    const { s } = conCadenaGlobal()
    s.cadena!.prioridad = 'B'
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').some((a) => a.type === 'pasar_prioridad')).toBe(true)
    expect(getValidActions(s, 'A').some((a) => a.type === 'pasar_prioridad')).toBe(false)
  })
})

describe('visibleState con cadena global (F5a)', () => {
  it('una Arcana respondida en la cadena global es visible para el rival', () => {
    const { s, arcana } = conCadenaGlobal()
    expect(visibleState(s, 'B').instances[arcana].cardId).toBeNull() // antes de responder: oculta
    const r = applyAction(s, { type: 'responder_cadena', cardInstanceId: arcana }, crearCtx())
    if (!r.ok) throw new Error(r.error)
    expect(r.state.cadena?.origen).toBe('global')
    expect(visibleState(r.state, 'B').instances[arcana].cardId).toBe(ARCANA)
  })
})
