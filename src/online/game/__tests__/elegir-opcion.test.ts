// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { crearOpcionBloqueo, pasivosBloqueo1A } from '../efectos'
import { parejasBloqueoOpcion } from '../habilidades'
import { getValidActions } from '../validActions'
import { reagruparEter } from '../payments'
import type { Ctx, GameState, PlayerId } from '../types'

// Pasivo 1A (FB-005 Voz de las Casas): "bloquea 1 Éter de tu Reserva sobre un Campeón".
// Cassandra FB-016 bloquea "hasta N" Éter (acepta 1 suelto). Aurora FB-010 es de bloqueo FIJO (4 propios exactos),
// pero DECISIÓN A: el Éter del Pasivo entra como EXTERNO y no le exige los 4 juntos. Vaela FB-011 no usa Éter bloqueado.
const CASSANDRA = 'FB-016'
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const ETER_PASIVO = 'FB-005'
const ETER = 'FB-001'

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

/** Forja de A con Aurora (slot 0), dos Cassandras (slots 1-2), Vaela (slot 3), 3 Éteres en la Reserva y el Pasivo 1A (FB-005) en la zona de pago. */
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
  return s
}

describe('Pasivo 1A — elegir_opcion con pareja Campeón + Éter', () => {
  it('parejasBloqueoOpcion lista Campeones con efecto de Éter bloqueado (incl. bloqueo fijo, decisión A) × Reserva', () => {
    const parejas = parejasBloqueoOpcion(escenario(), 'A')
    expect(new Set(parejas.map((p) => p.campeonId))).toEqual(new Set(['aurora', 'cass1', 'cass2']))
    expect(parejas).toContainEqual({ campeonId: 'cass2', eterId: 'e3' })
    expect(parejas).toContainEqual({ campeonId: 'aurora', eterId: 'e1' })
    expect(parejas.some((p) => p.campeonId === 'vaela')).toBe(false)
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

  it('con pareja Aurora (bloqueo fijo): el Éter externo entra sin exigir los 4 juntos (decisión A)', () => {
    const r = applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'aurora', eterId: 'e1' }, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.instances.aurora.eterBloqueado).toEqual(['e1'])
  })

  it.each([
    ['Campeón que no usa Éter bloqueado (Vaela)', { campeonId: 'vaela', eterId: 'e1' }],
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
  it('sin Campeón elegible (solo Vaela) no hay pareja: no se crea la opción', () => {
    const s = escenario()
    s.players.A.campo.campeones = ['vaela', null, null, null, null]
    s.opcionesPendientes = []
    expect(crearOpcionBloqueo(s, 'A', 'pasivo')).toBe(false)
    expect(s.opcionesPendientes).toEqual([])
  })

  it('con solo Aurora (bloqueo fijo) SÍ hay pareja externa: la opción se crea (decisión A)', () => {
    const s = escenario()
    s.players.A.campo.campeones = ['aurora', null, null, 'vaela', null]
    s.opcionesPendientes = []
    expect(crearOpcionBloqueo(s, 'A', 'pasivo')).toBe(true)
  })

  it('con una Cassandra en mesa sí se crea', () => {
    const s = escenario()
    s.opcionesPendientes = []
    expect(crearOpcionBloqueo(s, 'A', 'pasivo')).toBe(true)
    expect(s.opcionesPendientes).toEqual([{ jugador: 'A', eterId: 'pasivo' }])
  })
})

describe('Pasivo 1A — habilidad del turno mientras la carta de Éter está en 1A (§8.3a)', () => {
  const ofrecida = (s: GameState) =>
    getValidActions(s, 'A').some((a) => a.type === 'elegir_opcion' && a.opcionId === 'pasivo')

  it('se ofrece en Forja, en Choque (sin combate) y en Ocaso — nunca depende del Alba', () => {
    for (const fase of ['forja', 'choque', 'ocaso'] as const) {
      expect(ofrecida({ ...escenario(), fase })).toBe(true)
    }
  })

  it('no se ofrece durante un combate ni se acepta (el combate tiene su propio flujo)', () => {
    const s: GameState = {
      ...escenario(),
      fase: 'choque',
      combate: { paso: 'bloqueo', atacantes: [], bloqueos: {}, rupturaDisponible: false, rupturaUsadaEsteTurno: false },
    }
    expect(ofrecida(s)).toBe(false)
    expect(applyAction(s, { type: 'elegir_opcion', opcionId: 'pasivo' }, crearCtx()).ok).toBe(false)
  })

  it('no se ofrece si la carta de Éter está en la Reserva (solo funciona en 1A)', () => {
    const s = escenario()
    s.players.A.eterPagado = []
    s.players.A.eterReserva = ['pasivo', 'e1', 'e2', 'e3']
    expect(pasivosBloqueo1A(s, 'A')).toEqual([])
    expect(ofrecida(s)).toBe(false)
    expect(applyAction(s, { type: 'elegir_opcion', opcionId: 'pasivo' }, crearCtx()).ok).toBe(false)
  })

  it('no se ofrece sin Campeón que acepte Éter ni sin Éter en la Reserva', () => {
    const sinElegible = escenario()
    sinElegible.players.A.campo.campeones = ['vaela', null, null, null, null]
    expect(ofrecida(sinElegible)).toBe(false)

    const soloAurora = escenario()
    soloAurora.players.A.campo.campeones = ['aurora', null, null, 'vaela', null]
    expect(ofrecida(soloAurora)).toBe(true) // decisión A: Aurora acepta el externo

    const sinEter = escenario()
    sinEter.players.A.eterReserva = []
    expect(ofrecida(sinEter)).toBe(false)
  })

  it('una vez por turno por carta: tras usarla deja de ofrecerse; al reagruparse se estrena de nuevo', () => {
    const ctx = crearCtx()
    const r = applyAction(escenario(), { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass1', eterId: 'e1' }, ctx)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.instances.pasivo.opcionUsadaEsteTurno).toBe(true)
    expect(ofrecida(r.state)).toBe(false)
    expect(applyAction(r.state, { type: 'elegir_opcion', opcionId: 'pasivo' }, crearCtx()).ok).toBe(false)

    // Alba siguiente: la carta vuelve a la Reserva y su límite se reinicia
    const s2 = structuredClone(r.state)
    reagruparEter(s2, crearCtx(), 'A')
    expect(s2.instances.pasivo.opcionUsadaEsteTurno).toBeUndefined()
    expect(s2.players.A.eterReserva).toContain('pasivo')
  })

  it('bloquear con el Pasivo no agota al Campeón y no toca la opción pendiente de otras fuentes', () => {
    const s = escenario()
    s.opcionesPendientes = [{ jugador: 'A', eterId: 'otra-fuente' }]
    const r = applyAction(s, { type: 'elegir_opcion', opcionId: 'pasivo', campeonId: 'cass1', eterId: 'e1' }, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.instances.cass1.agotado).toBeUndefined()
    expect(r.state.opcionesPendientes).toEqual([{ jugador: 'A', eterId: 'otra-fuente' }])
  })

  it('una opción PENDIENTE de otra fuente (p.ej. un Vínculo al inicio del Alba) sigue funcionando en Forja', () => {
    const s = escenario()
    s.instances.vinculo = { cardInstanceId: 'vinculo', cardId: 'FB-025', owner: 'A' }
    s.opcionesPendientes = [{ jugador: 'A', eterId: 'vinculo' }]
    const r = applyAction(s, { type: 'elegir_opcion', opcionId: 'vinculo', campeonId: 'cass1', eterId: 'e1' }, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.opcionesPendientes).toEqual([])
    expect(r.state.instances.cass1.eterBloqueado).toEqual(['e1'])
  })
})
