// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { crearOpcionBloqueo } from '../efectos'
import { parejasBloqueoOpcion } from '../habilidades'
import type { Ctx, GameState, PlayerId } from '../types'

// Pasivo 1A (FB-005 Voz de las Casas): "bloquea 1 Éter de tu Reserva sobre un Campeón".
// Cassandra FB-016 bloquea "hasta N" Éter (acepta 1 suelto). Aurora FB-010 es de bloqueo FIJO (exige 4 juntos):
// el Pasivo no puede cumplirlo con 1 Éter. Vaela FB-011 no usa Éter bloqueado.
const CASSANDRA = 'FB-016'
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const ETER_PASIVO = 'FB-005'
const ETER = 'FB-001'

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Forja de A con Aurora (slot 0), dos Cassandras (slots 1-2), Vaela (slot 3), 3 Éteres en la Reserva y la opción del Pasivo pendiente. */
function escenario(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: ['dummy'],
    cementerio: [],
    exilio: [],
    eterReserva: [] as string[],
    eterPagado: [] as string[],
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  const s: GameState = {
    version: 4,
    seed: 1,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
  const poner = (id: string, cardId: string) => {
    s.instances[id] = { cardInstanceId: id, cardId, owner: 'A' }
  }
  poner('aurora', AURORA)
  poner('cass1', CASSANDRA)
  poner('cass2', CASSANDRA)
  poner('vaela', VAELA)
  s.players.A.campo.campeones = ['aurora', 'cass1', 'cass2', 'vaela', null]
  poner('pasivo', ETER_PASIVO)
  s.players.A.eterPagado = ['pasivo']
  for (const id of ['e1', 'e2', 'e3']) poner(id, ETER)
  s.players.A.eterReserva = ['e1', 'e2', 'e3']
  s.opcionesPendientes = [{ jugador: 'A', eterId: 'pasivo' }]
  return s
}

describe('Pasivo 1A — elegir_opcion con pareja Campeón + Éter', () => {
  it('parejasBloqueoOpcion lista solo Campeones que aceptan 1 Éter × Éteres de la Reserva', () => {
    const parejas = parejasBloqueoOpcion(escenario(), 'A')
    expect(new Set(parejas.map((p) => p.campeonId))).toEqual(new Set(['cass1', 'cass2']))
    expect(parejas).toContainEqual({ campeonId: 'cass2', eterId: 'e3' })
    expect(parejas.some((p) => p.campeonId === 'aurora' || p.campeonId === 'vaela')).toBe(false)
  })

  it('con pareja: bloquea ESE Éter sobre ESE Campeón (no el primero)', () => {
    const r = applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass2', eterId: 'e3' }, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.instances.cass2.eterBloqueado).toEqual(['e3'])
    expect(r.state.instances.cass1.eterBloqueado ?? []).toEqual([])
    expect(r.state.players.A.eterReserva).toEqual(['e1', 'e2'])
    expect(r.state.opcionesPendientes ?? []).toEqual([])
  })

  it('sin pareja: el motor mantiene el greedy (primera pareja legal)', () => {
    const s = escenario()
    const primera = parejasBloqueoOpcion(s, 'A')[0]
    const r = applyAction(s, { type: 'elegir_opcion', opcionId: 'pasivo' }, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.instances[primera.campeonId].eterBloqueado).toEqual([primera.eterId])
  })

  it.each([
    ['Campeón que no usa Éter bloqueado (Vaela)', { campeonId: 'vaela', eterId: 'e1' }],
    ['Campeón de bloqueo fijo (Aurora exige 4 juntos)', { campeonId: 'aurora', eterId: 'e1' }],
    ['Éter que no está en la Reserva', { campeonId: 'cass1', eterId: 'pasivo' }],
    ['Campeón inexistente', { campeonId: 'nadie', eterId: 'e1' }],
  ])('rechaza una pareja inválida: %s', (_nombre, pareja) => {
    const r = applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', ...pareja }, crearCtx())
    expect(r.ok).toBe(false)
  })

  it('rechaza una pareja a medias (solo Campeón o solo Éter)', () => {
    expect(applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass1' }, crearCtx()).ok).toBe(false)
    expect(applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', eterId: 'e1' }, crearCtx()).ok).toBe(false)
  })
})

describe('Pasivo 1A — la opción solo se ofrece si hay algo que elegir', () => {
  it('con solo Campeones de bloqueo fijo (Aurora) no hay pareja: no se crea la opción', () => {
    const s = escenario()
    s.players.A.campo.campeones = ['aurora', null, null, 'vaela', null]
    s.opcionesPendientes = []
    expect(crearOpcionBloqueo(s, 'A', 'pasivo')).toBe(false)
    expect(s.opcionesPendientes).toEqual([])
  })

  it('con una Cassandra en mesa sí se crea', () => {
    const s = escenario()
    s.opcionesPendientes = []
    expect(crearOpcionBloqueo(s, 'A', 'pasivo')).toBe(true)
    expect(s.opcionesPendientes).toEqual([{ jugador: 'A', eterId: 'pasivo' }])
  })
})
