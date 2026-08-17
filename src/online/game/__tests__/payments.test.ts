// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validarPago, aplicarPago, bloquearEter, reagruparEter } from '../payments'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// Éter Orden FB-001 (coste 1), Éter Caos DS-002 (coste 1) — sin efectoBloqueo
// Éter con bloqueo: FB-007 Éter de la Primogénita (+2 ATQ, +2 RES), DS-008 Éter del Primogénito (+2 ATQ, +2 RES)
// Campeón Orden FB-013 Seraphina (coste 3), Campeón Orden FB-010 Aurora (coste 4).
const ETER_ORDEN = 'FB-001'
const ETER_CAOS = 'DS-002'
const ETER_BLOQUEO_ORDEN = 'FB-007' // tiene efectoBloqueo
const ETER_BLOQUEO_CAOS = 'DS-008'  // tiene efectoBloqueo
const SERAPHINA = 'FB-013' // Campeón Orden, coste 3
const AURORA = 'FB-010' // Campeón Orden, coste 4

/** Estado mínimo válido: jugador A activo en forja, zonas vacías, sin instancias. */
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
    version: 4,
    seed: 123,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Registra instancias en el estado: { id → cardId }. */
function conInstancias(s: GameState, mapa: Record<string, string>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardInstanceId: id, cardId, owner: 'A' as PlayerId }])),
    },
  }
}

/** Pone Éteres (instancias) en la Reserva 2A del jugador A. Devuelve los ids. */
function conEteresEnReserva(s: GameState, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, cardId]))),
      players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
    },
    ids,
  }
}

/** Pone un Campeón en el campo de A (slot 0). Devuelve su id. */
function conCampeonEnCampo(s: GameState, cardId: string): { s: GameState; campeonId: string } {
  const campeonId = `cam-${cardId}`
  return {
    s: {
      ...conInstancias(s, { [campeonId]: cardId }),
      players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, campeones: [campeonId, null, null, null, null] } } },
    },
    campeonId,
  }
}

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return {
    next: () => n++,
    emit: (event) => {
      events.push(event)
    },
    events,
  }
}

describe('pago de coste con Éter (R8)', () => {
  it('pago exacto: 3 Éter Orden cubren el coste 3 de un Campeón Orden; 2A → 1A y evento eter_pagado', () => {
    const base = estadoMinimo()
    const { s, ids } = conEteresEnReserva(base, ETER_ORDEN, 3)
    const r = validarPago(s, 'A', ids, SERAPHINA)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.aportado).toBe(3)
    }

    const ctx = crearCtx()
    const s2 = aplicarPago(s, ctx, 'A', ids, SERAPHINA)
    expect(s2.players.A.eterReserva).toHaveLength(0)
    expect(s2.players.A.eterPagado).toEqual(ids)
    expect(ctx.events).toEqual([
      { type: 'eter_pagado', jugador: 'A', eterIds: ids, costo: 3, aportado: 3 },
    ])
  })

  it('sobrepago rechazado: 4 Éter para coste 3 → inválido', () => {
    const base = estadoMinimo()
    const { s, ids } = conEteresEnReserva(base, ETER_ORDEN, 4)
    const r = validarPago(s, 'A', ids, SERAPHINA)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/sobrepago/)
  })

  it('pago insuficiente: 2 Éter para coste 3 → inválido y el estado no cambia', () => {
    const base = estadoMinimo()
    const { s, ids } = conEteresEnReserva(base, ETER_ORDEN, 2)
    const r = validarPago(s, 'A', ids, SERAPHINA)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/insuficiente/)
    const ctx = crearCtx()
    const s2 = aplicarPago(s, ctx, 'A', ids, SERAPHINA)
    expect(s2.players.A.eterReserva).toHaveLength(2)
    expect(s2.players.A.eterPagado).toEqual([])
    expect(ctx.events).toEqual([])
  })

  it('mezcla propia/ajena ½: 1 Orden (1) + 4 Caos (½ cada uno) = 3 exacto; 1 Orden + 2 Caos = 2 → insuficiente', () => {
    const base = estadoMinimo()
    const { s, ids: ordenes } = conEteresEnReserva(base, ETER_ORDEN, 1)
    const { s: s2, ids: caos } = conEteresEnReserva(s, ETER_CAOS, 4)
    // 1×1 + 4×½ = 3 → cubre el coste 3 del Campeón Orden
    const r = validarPago(s2, 'A', [...ordenes, ...caos], SERAPHINA)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.aportado).toBe(3)
    }

    // 1×1 + 2×½ = 2 < 3 → insuficiente
    const { s: s3, ids: caos2 } = conEteresEnReserva(estadoMinimo(), ETER_CAOS, 2)
    const { s: s4, ids: ordenes2 } = conEteresEnReserva(s3, ETER_ORDEN, 1)
    const r2 = validarPago(s4, 'A', [...ordenes2, ...caos2], SERAPHINA)
    expect(r2.ok).toBe(false)
  })

  it('payloads inválidos: duplicados, Éter fuera de la Reserva y carta que no es Éter', () => {
    const base = estadoMinimo()
    const { s, ids } = conEteresEnReserva(base, ETER_ORDEN, 2)
    expect(validarPago(s, 'A', [...ids, ids[0]], SERAPHINA).ok).toBe(false) // duplicado
    expect(validarPago(s, 'A', ['no-en-reserva'], SERAPHINA).ok).toBe(false) // fuera de 2A
    const conNoEter = conInstancias(s, { 'x-aurora': AURORA }) // Campeón, no Éter
    expect(validarPago(conNoEter, 'A', ['x-aurora'], SERAPHINA).ok).toBe(false) // no es Éter
    expect(validarPago(s, 'A', [], SERAPHINA).ok).toBe(false) // lista vacía
  })
})

describe('bloqueo de Éter sobre Campeón (facción v2.1)', () => {
  it('Éter de facción compartida con efectoBloqueo se bloquea: 2A → Campeón.eterBloqueado + evento eter_bloqueado', () => {
    const base = estadoMinimo()
    const { s, campeonId } = conCampeonEnCampo(base, SERAPHINA) // Campeón Orden
    const { s: s2, ids } = conEteresEnReserva(s, ETER_BLOQUEO_ORDEN, 2) // Éter con efectoBloqueo: comparte facción
    const ctx = crearCtx()
    const error = bloquearEter(s2, ctx, 'A', ids, 0)
    expect(error).toBeNull()
    expect(s2.instances[campeonId].eterBloqueado).toEqual(ids)
    expect(s2.players.A.eterReserva).toHaveLength(0)
    expect(ctx.events).toEqual([{ type: 'eter_bloqueado', jugador: 'A', eterIds: ids, campeonId }])
  })

  it('Éter de facción ajena se rechaza: Caos contra Campeón Orden', () => {
    const base = estadoMinimo()
    const { s } = conCampeonEnCampo(base, SERAPHINA) // Campeón Orden
    const { s: s2, ids } = conEteresEnReserva(s, ETER_BLOQUEO_CAOS, 1) // Éter con efectoBloqueo Caos: facción ajena
    const ctx = crearCtx()
    const error = bloquearEter(s2, ctx, 'A', ids, 0)
    expect(error).toMatch(/facción/)
    expect(s2.instances['cam-FB-013'].eterBloqueado).toBeUndefined()
    expect(s2.players.A.eterReserva).toHaveLength(1) // nada se movió
    expect(ctx.events).toEqual([])
  })

  it('Éter sin efectoBloqueo se rechaza aunque comparta facción', () => {
    const base = estadoMinimo()
    const { s } = conCampeonEnCampo(base, SERAPHINA) // Campeón Orden
    const { s: s2, ids } = conEteresEnReserva(s, ETER_ORDEN, 1) // Éter Orden sin efectoBloqueo
    const ctx = crearCtx()
    const error = bloquearEter(s2, ctx, 'A', ids, 0)
    expect(error).toMatch(/efecto de bloqueo/)
    expect(s2.players.A.eterReserva).toHaveLength(1) // nada se movió
    expect(ctx.events).toEqual([])
  })
})

describe('reagrupar Éter (Alba del dueño)', () => {
  it('solo reagrupa 1A → 2A; el Éter bloqueado permanece en el Campeón', () => {
    const base = estadoMinimo()
    const { s, campeonId } = conCampeonEnCampo(base, SERAPHINA)
    const { s: s2, ids: pagados } = conEteresEnReserva(s, ETER_ORDEN, 2)
    // Simula: 2 pagados (1A) y 1 bloqueado en el Campeón
    const bloqueados = ['bloq-1']
    const s3: GameState = {
      ...s2,
      players: {
        ...s2.players,
        A: {
          ...s2.players.A,
          eterReserva: [],
          eterPagado: pagados,
        },
      },
      instances: {
        ...s2.instances,
        [campeonId]: { ...s2.instances[campeonId], eterBloqueado: bloqueados },
      },
    }
    const ctx = crearCtx()
    reagruparEter(s3, ctx, 'A')
    expect(s3.players.A.eterPagado).toEqual([])
    for (const id of pagados) expect(s3.players.A.eterReserva).toContain(id)
    expect(s3.instances[campeonId].eterBloqueado).toEqual(bloqueados) // permanece bloqueado
    expect(ctx.events).toEqual([{ type: 'eter_reagrupado', jugador: 'A', eterIds: pagados }])
  })
})
