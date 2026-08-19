// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { sacrificiosRequeridos } from '../campo'
import { bloquearEter } from '../payments'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// FB-011 Campeón Normal cost 2 · FB-010 Aurora Soberano Singular cost 4 ·
// FB-019 Mística cost 2 · FB-021 Táctica cost 0 · FB-023 Arcana cost 3 ·
// FB-024 Combate cost 0 · FB-001 Éter Orden cost 1 · DS-002 Éter Caos ·
// DS-011 Campeón Caos Normal cost 2 (para sacrificio de facción AJENA).
const CAMPEON = 'FB-011'
const AURORA = 'FB-010' // Soberano Singular
const MISTICA = 'FB-019'
const TACTICA = 'FB-021'
const ARCANA = 'FB-023'
const COMBATE = 'FB-024'
const ETER_ORDEN = 'FB-001'
const ETER_CAOS = 'DS-002'
const ETER_BLOQUEO_ORDEN = 'FB-007' // tiene efectoBloqueo
const CAMPEON_CAOS = 'DS-011'

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
    seed: 123,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conInstancias(s: GameState, mapa: Record<string, { cardId: string; owner?: PlayerId }>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(
        Object.entries(mapa).map(([id, { cardId, owner = 'A' }]) => [
          id,
          { cardInstanceId: id, cardId, owner },
        ]),
      ),
    },
  }
}

/** Mano de A con las instancias dadas (registradas como dueño A). */
function conMano(s: GameState, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner: 'A' }])))
  return { ...conInst, players: { ...conInst.players, A: { ...conInst.players.A, mano: Object.keys(mapa) } } }
}

/** Éteres (instancias dueño A) en la Reserva 2A de A. */
function conEteres(s: GameState, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner: 'A' }]))),
      players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
    },
    ids,
  }
}

/** Campeón de A en el campo (slot dado). Devuelve su id. */
function conCampeonEnCampo(s: GameState, cardId: string, slot: number): { s: GameState; id: string } {
  const id = `campo-${cardId}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner: 'A' } }),
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          campo: {
            ...s.players.A.campo,
            campeones: s.players.A.campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
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

describe('jugar_campeon (R9)', () => {
  it('invoca un Campeón pagando el coste: mano → 2B boca arriba, CANSADO (agotado), evento carta_invocada', () => {
    let s = conMano(estadoMinimo(), { cam: CAMPEON })
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 2)
    s = s2
    const ctx = crearCtx()
    s = aplicar(s, { type: 'jugar_campeon', cardInstanceId: 'cam', slot: 0, eterIds: ids }, ctx)

    expect(s.players.A.campo.campeones[0]).toBe('cam')
    expect(s.players.A.mano).toEqual([])
    expect(s.instances['cam'].agotado).toBe(true) // invocación CANSADA
    expect(s.players.A.eterPagado).toEqual(ids)
    expect(s.players.A.eterReserva).toHaveLength(0)
    expect(ctx.events).toEqual([
      { type: 'eter_pagado', jugador: 'A', eterIds: ids, costo: 2, aportado: 2 },
      { type: 'carta_salida_de_zona', cardInstanceId: 'cam', zona: 'mano', jugador: 'A' },
      { type: 'carta_entrada_a_zona', cardInstanceId: 'cam', zona: '2B', jugador: 'A', bocaArriba: true },
      { type: 'carta_invocada', cardInstanceId: 'cam', tipo: 'Campeón', slot: 0 },
    ])
  })

  it('rechaza: fuera de Forja, carta no en mano, no-Campeón, slot ocupado/fuera de rango y pago insuficiente', () => {
    const ctx = crearCtx()
    const base = conMano(estadoMinimo(), { cam: CAMPEON })
    const { s: s1, ids } = conEteres(base, ETER_ORDEN, 2)

    // Fuera de Forja (Ocaso)
    const ocaso = { ...s1, fase: 'ocaso' as const }
    expect(applyAction(ocaso, { type: 'jugar_campeon', cardInstanceId: 'cam', slot: 0, eterIds: ids }, ctx).ok).toBe(false)

    // Carta no en mano
    expect(applyAction(s1, { type: 'jugar_campeon', cardInstanceId: 'no-en-mano', slot: 0, eterIds: ids }, ctx).ok).toBe(false)

    // No es Campeón (un Éter en la mano)
    const conEter = conMano(s1, { et: ETER_ORDEN })
    const { s: sEter, ids: idsEter } = conEteres(conEter, ETER_ORDEN, 2)
    expect(applyAction(sEter, { type: 'jugar_campeon', cardInstanceId: 'et', slot: 0, eterIds: idsEter }, ctx).ok).toBe(false)

    // Slot fuera de rango (5) y ocupado
    expect(applyAction(s1, { type: 'jugar_campeon', cardInstanceId: 'cam', slot: 5, eterIds: ids }, ctx).ok).toBe(false)
    const conOcupado = conCampeonEnCampo(s1, CAMPEON, 0)
    expect(
      applyAction(conOcupado.s, { type: 'jugar_campeon', cardInstanceId: 'cam', slot: 0, eterIds: ids }, ctx).ok,
    ).toBe(false)

    // Pago insuficiente: 1 Éter para coste 2
    const { s: sPobre, ids: ids1 } = conEteres(estadoMinimo(), ETER_ORDEN, 1)
    const conManoPobre = conMano(sPobre, { cam: CAMPEON })
    const r = applyAction(conManoPobre, { type: 'jugar_campeon', cardInstanceId: 'cam', slot: 0, eterIds: ids1 }, ctx)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/insuficiente/)
  })

  it('Singular (Aurora): rechaza invocar si ya hay 1 copia en el campo', () => {
    const ctx = crearCtx()
    const conCampo = conCampeonEnCampo(estadoMinimo(), AURORA, 0)
    const s = conMano(conCampo.s, { aurora2: AURORA })
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 4)
    // Aurora exige 1 sacrificio: el de campo comparte facción Orden
    const r = applyAction(
      s2,
      { type: 'jugar_campeon', cardInstanceId: 'aurora2', slot: 1, eterIds: ids, sacrificios: ['campo-FB-010-0'] },
      ctx,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Singular/)
  })

  it('Soberano (Aurora): exige exactamente 1 sacrificio de facción compartida que libera slot y va a 2G', () => {
    const ctx = crearCtx()
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 1) // sacrificio en slot 1 (2C)
    const s = conMano(conCampo.s, { aurora: AURORA })
    let { s: s2, ids } = conEteres(s, ETER_ORDEN, 4)
    s2.players.A.campo.campeones[0] = null // slot 0 libre
    const sac = 'campo-FB-011-1'

    s2 = aplicar(
      s2,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: ids, sacrificios: [sac] },
      ctx,
    )
    expect(s2.players.A.campo.campeones[0]).toBe('aurora')
    expect(s2.players.A.campo.campeones[1]).toBeNull() // slot liberado
    expect(s2.players.A.cementerio).toEqual([sac]) // sacrificio → 2G
    expect(s2.instances['aurora'].agotado).toBe(true)
    expect(ctx.events).toEqual([
      { type: 'eter_pagado', jugador: 'A', eterIds: ids, costo: 4, aportado: 4 },
      { type: 'carta_salida_de_zona', cardInstanceId: sac, zona: '2C', jugador: 'A' },
      { type: 'carta_entrada_a_zona', cardInstanceId: sac, zona: '2G', jugador: 'A', bocaArriba: true },
      { type: 'carta_salida_de_zona', cardInstanceId: 'aurora', zona: 'mano', jugador: 'A' },
      { type: 'carta_entrada_a_zona', cardInstanceId: 'aurora', zona: '2B', jugador: 'A', bocaArriba: true },
      { type: 'carta_invocada', cardInstanceId: 'aurora', tipo: 'Campeón', slot: 0 },
    ])
  })

  it('Soberano: el sacrificio libera el Éter bloqueado del sacrificado INMEDIATO → 2A (glosario L1351, 7.2 L937)', () => {
    const ctx = crearCtx()
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 1) // sacrificio en slot 1 (2C)
    const s = conMano(conCampo.s, { aurora: AURORA })
    let { s: s2, ids } = conEteres(s, ETER_ORDEN, 4) // pago de Aurora (cost 4)
    s2.players.A.campo.campeones[0] = null // slot 0 libre
    const sac = 'campo-FB-011-1'
    const eterBloq = 'eter-bloq-1' // Éter YA bloqueado en el sacrificado (1B-1F), fuera de 2A
    s2.instances[sac] = { ...s2.instances[sac], eterBloqueado: [eterBloq] }

    s2 = aplicar(
      s2,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: ids, sacrificios: [sac] },
      ctx,
    )
    expect(s2.instances[sac].eterBloqueado).toBeUndefined() // liberado al salir del campo (ADR-17: delete, no [])
    expect(s2.players.A.eterReserva).toContain(eterBloq) // → 2A INMEDIATO (no 1A)
    expect(s2.players.A.cementerio).toEqual([sac]) // el sacrificio sigue yendo a 2G
  })

  it('Soberano: rechaza sin sacrificios, con 2, duplicados, ajenos o de facción distinta', () => {
    const ctx = crearCtx()
    const montar = () => {
      const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 1)
      const s = conMano(conCampo.s, { aurora: AURORA })
      const { s: s2, ids } = conEteres(s, ETER_ORDEN, 4)
      return { s: s2, ids }
    }

    // Sin sacrificios
    const a = montar()
    const r0 = applyAction(a.s, { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: a.ids }, ctx)
    expect(r0.ok).toBe(false)
    if (!r0.ok) expect(r0.error).toMatch(/sacrificio/)

    // Dos sacrificios
    const b = montar()
    const r1 = applyAction(
      b.s,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: b.ids, sacrificios: ['campo-FB-011-1', 'x'] },
      ctx,
    )
    expect(r1.ok).toBe(false)

    // Duplicado
    const c = montar()
    const r2 = applyAction(
      c.s,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: c.ids, sacrificios: ['campo-FB-011-1', 'campo-FB-011-1'] },
      ctx,
    )
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.error).toMatch(/duplicado/)

    // Sacrificio ajeno (owner B)
    const d = montar()
    const conAjeno = conInstancias(d.s, { 'ajeno': { cardId: CAMPEON, owner: 'B' } })
    const r3 = applyAction(
      conAjeno,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: d.ids, sacrificios: ['ajeno'] },
      ctx,
    )
    expect(r3.ok).toBe(false)
    if (!r3.ok) expect(r3.error).toMatch(/tu campo|tuyo/)

    // Sacrificio de facción distinta (Campeón Caos propio en el campo)
    const e = montar()
    const conCaos = conInstancias(e.s, { 'caos-propio': { cardId: CAMPEON_CAOS, owner: 'A' } })
    const conCaosCampo = {
      ...conCaos,
      players: {
        ...conCaos.players,
        A: {
          ...conCaos.players.A,
          campo: { ...conCaos.players.A.campo, campeones: [null, 'campo-FB-011-1', 'caos-propio', null, null] },
        },
      },
    }
    const r4 = applyAction(
      conCaosCampo,
      { type: 'jugar_campeon', cardInstanceId: 'aurora', slot: 0, eterIds: e.ids, sacrificios: ['caos-propio'] },
      ctx,
    )
    expect(r4.ok).toBe(false)
    if (!r4.ok) expect(r4.error).toMatch(/facción/)
  })

  it('sacrificiosRequeridos: Soberano 1, Emperador 2, resto 0', () => {
    expect(sacrificiosRequeridos(['Soberano'])).toBe(1)
    expect(sacrificiosRequeridos(['Emperador'])).toBe(2)
    expect(sacrificiosRequeridos(['Normal'])).toBe(0)
    expect(sacrificiosRequeridos(['Soporte', 'Emperador'])).toBe(2)
    expect(sacrificiosRequeridos(undefined)).toBe(0)
  })
})

describe('jugar_mistica (R10)', () => {
  it('paga el coste y coloca la Mística boca arriba en 3A-3C', () => {
    let s = conMano(estadoMinimo(), { mist: MISTICA })
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 2)
    s = s2
    const ctx = crearCtx()
    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'mist', slot: 0, eterIds: ids }, ctx)

    expect(s.players.A.campo.misticasTacticas[0]).toBe('mist')
    expect(s.players.A.eterPagado).toEqual(ids)
    expect(ctx.events).toEqual([
      { type: 'eter_pagado', jugador: 'A', eterIds: ids, costo: 2, aportado: 2 },
      { type: 'carta_salida_de_zona', cardInstanceId: 'mist', zona: 'mano', jugador: 'A' },
      { type: 'carta_entrada_a_zona', cardInstanceId: 'mist', zona: '3A', jugador: 'A', bocaArriba: true },
      { type: 'carta_invocada', cardInstanceId: 'mist', tipo: 'Mística', slot: 0 },
    ])
  })

  it('rechaza con slot ocupado o fuera de rango', () => {
    const ctx = crearCtx()
    const conM = conMano(estadoMinimo(), { mist: MISTICA })
    const { s, ids } = conEteres(conM, ETER_ORDEN, 2)
    expect(applyAction(s, { type: 'jugar_mistica', cardInstanceId: 'mist', slot: 3, eterIds: ids }, ctx).ok).toBe(false)
    const ocupado = { ...s, players: { ...s.players, A: { ...s.players.A, campo: { ...s.players.A.campo, misticasTacticas: ['x', null, null] } } } }
    expect(applyAction(ocupado, { type: 'jugar_mistica', cardInstanceId: 'mist', slot: 0, eterIds: ids }, ctx).ok).toBe(false)
  })
})

// TODO: Phase 3 eliminará colocar_tactica y colocar_combate del motor
// describe('colocar_tactica (5.4 — no cuesta Éter)', () => { ... })
// describe('colocar_combate (3D-3F, no cuesta Éter)', () => { ... })

describe('colocar_arcana (boca abajo 3D-3F, gratis) + activar_arcana (paga coste)', () => {
  it('coloca la Arcana GRATIS boca abajo, luego activa pagando coste', () => {
    let s = conMano(estadoMinimo(), { arc: ARCANA })
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 3)
    s = s2
    const ctx = crearCtx()
    // Paso 1: colocar (gratis)
    s = aplicar(s, { type: 'colocar_arcana', cardInstanceId: 'arc', slot: 0 }, ctx)

    expect(s.players.A.campo.arcanasCombate[0]).toBe('arc')
    expect(s.players.A.eterPagado).toEqual([])
    expect(s.players.A.eterReserva).toEqual(ids)
    expect(s.instances['arc']!.bocaArriba).toBe(false)
    expect(ctx.events).toEqual([
      { type: 'carta_salida_de_zona', cardInstanceId: 'arc', zona: 'mano', jugador: 'A' },
      { type: 'carta_entrada_a_zona', cardInstanceId: 'arc', zona: '3D', jugador: 'A', bocaArriba: false },
      { type: 'carta_invocada', cardInstanceId: 'arc', tipo: 'Arcana', slot: 0 },
    ])

    // Paso 2: activar (paga coste)
    ctx.events.length = 0
    s = aplicar(s, { type: 'activar_arcana', cardInstanceId: 'arc', slot: 0, eterIds: ids }, ctx)

    expect(s.players.A.eterPagado).toEqual(ids)
    expect(s.players.A.eterReserva).toHaveLength(0)
    expect(s.instances['arc']!.bocaArriba).toBe(true)
    expect(ctx.events[0]).toMatchObject({ type: 'eter_pagado', jugador: 'A', eterIds: ids })
    expect(ctx.events[1]).toMatchObject({ type: 'carta_activada', cardInstanceId: 'arc', jugador: 'A', slot: 0 })
  })
})

describe('bloquear_eter (acción de forja, facción v2.1)', () => {
  it('bloquea Éter con efectoBloqueo de facción compartida sobre un Campeón propio', () => {
    const ctx = crearCtx()
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const { s, ids } = conEteres(conCampo.s, ETER_BLOQUEO_ORDEN, 1)
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids, campeonSlot: 0 }, ctx)

    expect(s2.instances['campo-FB-011-0'].eterBloqueado).toEqual(ids)
    expect(s2.players.A.eterReserva).toHaveLength(0)
    expect(ctx.events).toEqual([
      { type: 'eter_bloqueado', jugador: 'A', eterIds: ids, campeonId: 'campo-FB-011-0' },
    ])
  })

  it('rechaza Éter de facción ajena, sin efectoBloqueo, y slots vacíos', () => {
    const ctx = crearCtx()
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const { s, ids } = conEteres(conCampo.s, ETER_CAOS, 1) // Caos contra Campeón Orden
    const r = applyAction(s, { type: 'bloquear_eter', eterIds: ids, campeonSlot: 0 }, ctx)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/facción/)

    const r2 = applyAction(s, { type: 'bloquear_eter', eterIds: ids, campeonSlot: 3 }, ctx)
    expect(r2.ok).toBe(false)
    expect(bloquearEter(s, ctx, 'A', ids, 3)).toMatch(/vacío/)

    // Éter sin efectoBloqueo se acepta si comparte facción (sin límite)
    const { s: s3, ids: idsSinBloqueo } = conEteres(conCampo.s, ETER_ORDEN, 1)
    const r3 = applyAction(s3, { type: 'bloquear_eter', eterIds: idsSinBloqueo, campeonSlot: 0 }, ctx)
    expect(r3.ok).toBe(true)
  })
})
