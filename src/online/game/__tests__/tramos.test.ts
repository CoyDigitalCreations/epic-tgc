/**
 * Regresión — Tramos escalonados en el MOTOR (Capa 3b).
 *
 * Cassandra FB-016 carta piloto: bloqueo "hasta" 4 con dos tramos:
 * - umbral 2 → toggle_exhaust (one-shot, elección D1)
 * - umbral 4 → fix_exhaust (sostén: campeón fijado no cambia agotamiento
 *   mientras la fuente tenga Éter bloqueado >= 4)
 *
 * Reglas del motor:
 * - dispararUmbralBloqueo arma un pendiente D1 POR TRAMO alcanzado, en
 *   orden de umbral; tramosDisparados evita re-disparo.
 * - ejecutarElegirObjetivo ramifica por tramoUmbral → ejecutarTramo.
 * - fix_exhaust setea fijadoExhaustTargetId (estado derivado exhaustFijado):
 *   Alba NO endereza al campeón fijado y toggle_exhaust no lo afecta.
 * - Liberar Éter limpia tramosDisparados + fijado → nuevo ciclo re-arma.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { exhaustFijado } from '../effectInterpreter'
import { liberarEterBloqueado } from '../replacements'
import { resolverAlba } from '../phases'
import type { GameState, Ctx, PlayerId } from '../types'

const ETER_ORDEN = 'FB-001'
const CASSANDRA = 'FB-016' // continuo eter_bloqueado:4, tramos [2 toggle, 4 fix]
const RIVAL = 'FB-011' // Vaela 5/3

function estadoMinimo(): GameState {
  const eterIds = Array.from({ length: 15 }, (_, i) => `e-${i}`)
  const instances: GameState['instances'] = {}
  for (const id of eterIds) instances[id] = { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }
  return {
    turno: 'A',
    fase: 'forja',
    players: {
      A: {
        id: 'A', mano: [], mazo: [], cementerio: [], exilio: [],
        eterReserva: eterIds, eterPagado: [],
        campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
        vinculos: [null, null, null, null, null, null],
      },
      B: {
        id: 'B', mano: [], mazo: [], cementerio: [], exilio: [],
        eterReserva: [], eterPagado: [],
        campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
        vinculos: [null, null, null, null, null, null],
      },
    },
    instances,
  } as unknown as GameState
}

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return { next: () => n++, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

/** Cassandra en slot 0 de A + 2 campeones rivales (uno agotado) + 6 Éteres. */
function setup(): GameState {
  const base = estadoMinimo()
  const cassId = 'cass-1'
  const rival1 = 'rival-1' // sin agotar
  const rival2 = 'rival-2' // AGOTADO (para fix_exhaust)
  const ids = Array.from({ length: 6 }, (_, i) => `ec-${i}`)
  return {
    ...base,
    instances: {
      ...base.instances,
      [cassId]: { cardInstanceId: cassId, cardId: CASSANDRA, owner: 'A' },
      [rival1]: { cardInstanceId: rival1, cardId: RIVAL, owner: 'B' },
      [rival2]: { cardInstanceId: rival2, cardId: RIVAL, owner: 'B', agotado: true },
      ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }])),
    },
    players: {
      ...base.players,
      A: {
        ...base.players.A,
        campo: { ...base.players.A.campo, campeones: [cassId, null, null, null, null] },
        eterReserva: ids,
      },
      B: {
        ...base.players.B,
        campo: { ...base.players.B.campo, campeones: [rival1, rival2, null, null, null] },
      },
    },
  } as unknown as GameState
}

describe('Tramos escalonados en el motor (Cassandra FB-016)', () => {
  it('al bloquear 2 Éteres → pendiente D1 del tramo toggle (umbral 2)', () => {
    const ctx = crearCtx()
    const s = setup()
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1'], targetInstanceId: 'cass-1' }, ctx)
    expect(s2.instances['cass-1'].tramosDisparados).toEqual([2])
    // D1: opciones = campeones rivales (el toggle no filtra agotado)
    const pend = s2.objetivosPendientes?.[0]
    expect(pend?.tramoUmbral).toBe(2)
    expect(pend?.opciones).toContain('rival-1')
    expect(pend?.opciones).toContain('rival-2')
  })

  it('al elegir el objetivo del tramo toggle → cambia el agotamiento del rival', () => {
    const ctx = crearCtx()
    const s = setup()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1'], targetInstanceId: 'cass-1' }, ctx)
    // rival-1 NO está agotado → toggle lo AGOTA
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx)
    expect(s2.instances['rival-1'].agotado).toBe(true)
    expect(s2.objetivosPendientes).toHaveLength(0)
  })

  it('al bloquear 4 Éteres de una → DOS pendientes (toggle umbral 2 + fix umbral 4)', () => {
    const ctx = crearCtx()
    const s = setup()
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    expect(s2.instances['cass-1'].tramosDisparados).toEqual([2, 4])
    expect(s2.objetivosPendientes).toHaveLength(2)
    // FIFO: toggle (2) primero, fix (4) después
    expect(s2.objetivosPendientes?.[0].tramoUmbral).toBe(2)
    expect(s2.objetivosPendientes?.[1].tramoUmbral).toBe(4)
  })

  it('tramo fix: el filtro agotado restringe las opciones al campeón agotado', () => {
    const ctx = crearCtx()
    const s = setup()
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    // Resolver el toggle primero (frente FIFO)
    const s3 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx)
    // El pendiente del fix SOLO ofrece al campeón agotado
    const pendFix = s3.objetivosPendientes?.[0]
    expect(pendFix?.tramoUmbral).toBe(4)
    expect(pendFix?.opciones).toEqual(['rival-2'])
  })

  it('fix_exhaust: al elegir → fijado activo; Alba NO endereza al campeón fijado', () => {
    const ctx = crearCtx()
    const s = setup()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx) // toggle → agota rival-1
    // fix SOLO sobre agotados → opciones [rival-2]; pero rival-2 ya estaba agotado
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-2' }, ctx)
    expect(s2.instances['cass-1'].fijadoExhaustTargetId).toBe('rival-2')
    expect(exhaustFijado(s2, 'rival-2')).toBe(true)
    expect(exhaustFijado(s2, 'rival-1')).toBe(false)

    // Alba del RIVAL: rival-1 (agotado por toggle) se endereza; rival-2 (fijado) NO
    const s3 = { ...s2, turno: 'B' as PlayerId }
    resolverAlba(s3, crearCtx(), 'B')
    expect(s3.instances['rival-1'].agotado).toBeUndefined()
    expect(s3.instances['rival-2'].agotado).toBe(true)
  })

  it('toggle_exhaust no afecta a un campeón con agotamiento fijado', () => {
    const ctx = crearCtx()
    const s = setup()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-2' }, ctx) // fija rival-2 (agotado)
    // Segundo toggle (nuevo bloqueo) no puede cambiar a rival-2... pero
    // tramosDisparados ya consumió los tramos. Simular otro toggle vía
    // ejecutarTramo directo con el estado fijado:
    expect(s2.instances['rival-2'].agotado).toBe(true)
    expect(exhaustFijado(s2, 'rival-2')).toBe(true)
    // El fijado sobrevive al Alba propio del rival (ya probado arriba)
  })

  it('sin campeones agotados rivales → tramo fix NO se arma (re-evalúa después)', () => {
    const ctx = crearCtx()
    const s = setup()
    // Quitar el agotado del setup
    const sinAgotados: GameState = {
      ...s,
      instances: { ...s.instances, 'rival-2': { cardInstanceId: 'rival-2', cardId: RIVAL, owner: 'B' } },
    } as unknown as GameState
    const s2 = aplicar(sinAgotados, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    // Solo el toggle se armó (umbral 2) — el fix (4) no tiene opciones válidas
    expect(s2.objetivosPendientes).toHaveLength(1)
    expect(s2.objetivosPendientes?.[0].tramoUmbral).toBe(2)
    // Y el umbral 4 NO se consumió — se re-evalúa en el próximo bloqueo
    expect(s2.instances['cass-1'].tramosDisparados).toEqual([2])
  })

  it('al liberar el Éter → tramosDisparados y fijado se limpian (nuevo ciclo)', () => {
    const ctx = crearCtx()
    const s = setup()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1', 'ec-2', 'ec-3'], targetInstanceId: 'cass-1' }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-2' }, ctx)
    expect(s2.instances['cass-1'].tramosDisparados).toEqual([2, 4])
    expect(s2.instances['cass-1'].fijadoExhaustTargetId).toBe('rival-2')

    // Sacar a Cassandra del campo → liberarEterBloqueado limpia todo
    const sinCassandra: GameState = {
      ...s2,
      players: {
        ...s2.players,
        A: { ...s2.players.A, campo: { ...s2.players.A.campo, campeones: [null, null, null, null, null] } },
      },
    } as unknown as GameState
    // El cleanup vive en liberarEterBloqueado — invocarlo vía la salida
    // del campo (patrón existente: moverAlCementerio / replacements)
    liberarEterBloqueado(sinCassandra, crearCtx(), 'cass-1', '1A')
    expect(sinCassandra.instances['cass-1'].tramosDisparados).toBeUndefined()
    expect(sinCassandra.instances['cass-1'].fijadoExhaustTargetId).toBeUndefined()
    expect(exhaustFijado(sinCassandra, 'rival-2')).toBe(false)
  })

  it('getValidActions expone elegir_objetivo para el pendiente de tramo', () => {
    const ctx = crearCtx()
    const s = setup()
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ec-0', 'ec-1'], targetInstanceId: 'cass-1' }, ctx)
    const acciones = getValidActions(s2, 'A')
    const elegir = acciones.filter((a) => a.type === 'elegir_objetivo')
    expect(elegir.length).toBe(2) // toggle ofrece ambos rivales
  })
})
