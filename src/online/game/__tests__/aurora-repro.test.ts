/**
 * Regresión — ROUTING POR EFECTO de activar_habilidad vs bloquear_eter (§7.7).
 *
 * Bug original (Aurora FB-010, sesión 2026-10-09): getValidActions generaba
 * activar_habilidad para el steal_champion (continuo + bloqueo_fijo:4) usando
 * el costo del DISPARO destroy (eter:2). El jugador bloqueaba 2 Éteres y el
 * efecto nunca resolvía — sin lista de campeones a robar, Éter consumido.
 *
 * Regla genérica del motor (data-driven, ningún cardId hardcodeado):
 * - Efecto con costo-bloqueo NO-disparo → activación exclusiva vía
 *   bloquear_eter (aura derivada / dispararUmbralBloqueo).
 * - Disparo con costo-bloqueo → patrón "Bloqueado" (activar_habilidad:
 *   bloquea N y ejecuta, 1/turno).
 * - Efecto con costo 'eter' → patrón Agota (activar_habilidad: paga 1A).
 * El selector único efectoActivableDe() alimenta validActions, el validador
 * y el ejecutor — validación y ejecución nunca divergen.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { validarActivarHabilidad } from '../habilidades'
import type { GameState, Ctx, PlayerId } from '../types'

const ETER_ORDEN = 'FB-001'
const AURORA = 'FB-010' // disparo destroy eter:2 + continuo steal_champion bloqueo_fijo:4
const RIVAL = 'FB-011' // Vaela — campeón rival

function estadoMinimo(): GameState {
  const eterIds = Array.from({ length: 15 }, (_, i) => `e-${i}`)
  const instances: GameState['instances'] = {}
  for (const id of eterIds) instances[id] = { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }
  const base = {
    turno: 'A' as PlayerId,
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
  }
  return base as unknown as GameState
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

/** Aurora en slot 0 de A + Vaela rival en slot 0 de B + 6 Éteres en Reserva. */
function setup(): GameState {
  const base = estadoMinimo()
  const auroraId = 'aurora-1'
  const rivalId = 'rival-1'
  const ids = Array.from({ length: 6 }, (_, i) => `ea-${i}`)
  return {
    ...base,
    instances: {
      ...base.instances,
      [auroraId]: { cardInstanceId: auroraId, cardId: AURORA, owner: 'A' },
      [rivalId]: { cardInstanceId: rivalId, cardId: RIVAL, owner: 'B' },
      ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }])),
    },
    players: {
      ...base.players,
      A: {
        ...base.players.A,
        campo: { ...base.players.A.campo, campeones: [auroraId, null, null, null, null] },
        eterReserva: ids,
      },
      B: {
        ...base.players.B,
        campo: { ...base.players.B.campo, campeones: [rivalId, null, null, null, null] },
      },
    },
  } as unknown as GameState
}

describe('Routing por efecto — activar_habilidad vs bloquear_eter (§7.7)', () => {
  it('Aurora: activar_habilidad es SOLO el destroy (pago 2), jamás el steal (bloqueo_fijo 4)', () => {
    const s = setup()
    const acciones = getValidActions(s, 'A')
    const activar = acciones.filter(
      (a): a is Extract<Action, { type: 'activar_habilidad' }> =>
        a.type === 'activar_habilidad' && a.cardInstanceId === 'aurora-1',
    )
    expect(activar).toHaveLength(1)
    // El costo del EFECTO activable (destroy eter:2), no el del steal (4)
    expect(activar[0].eterIds).toHaveLength(2)
  })

  it('Aurora: el steal se activa SOLO vía bloquear_eter (4 exactos)', () => {
    const s = setup()
    const bloquear = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloquear).toHaveLength(1)
    if (bloquear[0]?.type === 'bloquear_eter') {
      expect(bloquear[0].targetInstanceId).toBe('aurora-1')
      expect(bloquear[0].eterIds).toHaveLength(4)
    }
  })

  it('ejecutar activar_habilidad de Aurora PAGA a 1A (no bloquea Éter) y no arma steal', () => {
    const s = setup()
    const s2 = aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'aurora-1', eterIds: ['ea-0', 'ea-1'] }, crearCtx())
    expect(s2.instances['aurora-1'].eterBloqueado ?? []).toHaveLength(0)
    expect(s2.players.A.eterPagado).toHaveLength(2)
    expect(s2.objetivosPendientes).toBeUndefined()
    expect(s2.instances['aurora-1'].agotado).toBe(true) // Paga y Agota (§5.2, §8.3a)
    expect(s2.instances['aurora-1'].opcionUsadaEsteTurno).toBeUndefined() // el Disparo no tiene 1/turno
  })

  it('validador rechaza activar_habilidad de Aurora con el costo del steal (4)', () => {
    const s = setup()
    const error = validarActivarHabilidad(s, {
      type: 'activar_habilidad',
      cardInstanceId: 'aurora-1',
      eterIds: ['ea-0', 'ea-1', 'ea-2', 'ea-3'],
    })
    expect(error).toMatch(/exactamente 2/)
  })

  it('flujo completo del steal: bloquear 4 → pendiente D1 → elegir roba el campeón', () => {
    const ctx = crearCtx()
    const s = setup()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ['ea-0', 'ea-1', 'ea-2', 'ea-3'], targetInstanceId: 'aurora-1' }, ctx)
    expect(s2.instances['aurora-1'].efectoUmbralDisparado).toBe(true)
    expect(s2.objetivosPendientes?.[0].opciones).toContain('rival-1')
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: 'rival-1' }, ctx)
    expect(s2.players.A.campo.campeones).toContain('rival-1')
    expect(s2.players.B.campo.campeones[0]).toBeNull()
  })

  it('FB-016 Cassandra (continuo eter_bloqueado con tramos): NINGÚN activar_habilidad — solo bloquear_eter', () => {
    const base = estadoMinimo()
    const cassId = 'cass-1'
    const ids = Array.from({ length: 5 }, (_, i) => `ec-${i}`)
    const s = {
      ...base,
      instances: {
        ...base.instances,
        [cassId]: { cardInstanceId: cassId, cardId: 'FB-016', owner: 'A' },
        ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }])),
      },
      players: {
        ...base.players,
        A: {
          ...base.players.A,
          campo: { ...base.players.A.campo, campeones: [cassId, null, null, null, null] },
          eterReserva: ids,
        },
      },
    } as unknown as GameState

    const acciones = getValidActions(s, 'A')
    expect(acciones.filter((a) => a.type === 'activar_habilidad')).toHaveLength(0)
    // eter_bloqueado flexible (hasta 4): una acción por Éter hasta el máximo
    const bloquear = acciones.filter((a) => a.type === 'bloquear_eter')
    expect(bloquear.length).toBeGreaterThan(0)
    for (const b of bloquear) {
      if (b.type === 'bloquear_eter') expect(b.targetInstanceId).toBe(cassId)
    }

    // El validador también cierra la puerta (defensa en profundidad)
    const error = validarActivarHabilidad(s, {
      type: 'activar_habilidad',
      cardInstanceId: cassId,
      eterIds: ids.slice(0, 4),
    })
    expect(error).toMatch(/bloquear_eter/)
  })
})
