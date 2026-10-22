// @vitest-environment node
/**
 * Gaps de la auditoría obs 1860 — B2 / B5 / B6 / B8:
 *
 * - B2: objetivo tipo 'vinculo' en targetResolver (4A-4F, solo vivos) —
 *   doctrina Capa 2 permite "destruye 1 Vínculo" (ejemplo aprobado).
 * - B5: controladorDestino del objetivo resuelve el DUEÑO de la zona destino
 *   ('propio'/undefined = el que lanza, 'rival', 'dueno') — antes SIEMPRE
 *   inst.owner (DS-017 mandaba el Éter a la Reserva del RIVAL).
 * - B6: duracion 'hasta_fase' + duracionFase + duracionControlador — el efecto
 *   expira al ENTRAR esa fase del dueño indicado (antes: todo en Ocaso).
 * - B8: costo tipo 'eter' de efectos TRIGGER-EADOS se COBRA al resolverse
 *   (Reserva → 1A) — antes validateCost solo validaba (o nada: triggers
 *   saltaban la validación entera → efectos gratis).
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import { registrarCartas, getCardMeta } from '../cards'
import { dispararTrigger, purgarHastaFase, keywordsDe } from '../efectos'
import { statsDe } from '../efectos'
import { resolverAlba } from '../phases'
import { resolveTargets } from '../targetResolver'
import type { AnyCard } from '../cards'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'

const ETER_ORDEN = 'DS-002' // Éter del Nudo — trigger 'ninguno' (INERTE: sin pendientes al pagar; FB-001 crea D1 al-pagar-eter)
const VINCULO = 'DS-028' // Cristal del Nudo — Vínculo real (para B2/B6)
const TEST_DESTRUYE = 'TEST-DESTRUYE-VINCULO'
const TEST_MOVER_TUYO = 'TEST-MOVER-PROPIO' // controladorDestino 'propio' → TRANSFIERE al lanzador
const TEST_MOVER_DUENO = 'TEST-MOVER-DUENO' // SIN campo → default 'dueno' (inst.owner)
const TEST_MOVER_RIVAL = 'TEST-MOVER-RIVAL' // controladorDestino 'rival'
const TEST_BUFF_HASTA = 'TEST-BUFF-HASTA-FASE'
const TEST_TRIGGER_PAGO = 'TEST-TRIGGER-PAGO'

registrarCartas([
  {
    id: TEST_DESTRUYE,
    name: 'Destructor de Vínculos Test',
    type: 'Mística',
    rarity: 'Rara',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 1 },
    efectos: [{
      tipo: 'hechizo',
      efecto: 'destroy',
      objetivo: { tipo: 'vinculo', controlador: 'rival', zona: 'campo' },
      texto: 'Destruye 1 Vínculo que controla el rival.',
    }],
  },
  {
    id: TEST_MOVER_TUYO,
    name: 'Mueve a Tu Reserva Test',
    type: 'Mística',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 1 },
    efectos: [{
      tipo: 'hechizo',
      efecto: 'mover',
      objetivo: { tipo: 'eter', controlador: 'rival', zona: 'pagado', zonaDestino: 'reserva', controladorDestino: 'propio' },
      texto: 'Mueve 1 Éter del rival de su zona de pago a tu Reserva.',
    }],
  },
  {
    id: TEST_MOVER_DUENO,
    name: 'Mueve a la Zona del Dueño Test',
    type: 'Mística',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 1 },
    efectos: [{
      tipo: 'hechizo',
      efecto: 'mover',
      objetivo: { tipo: 'eter', controlador: 'rival', zona: 'pagado', zonaDestino: 'reserva' },
      // SIN controladorDestino → DEFAULT 'dueno' (decisión usuario 2026-10-22:
      // FB-017 'a su zona de pago' / FB-027 'de su dueño' son la mayoría)
      texto: 'Mueve 1 Éter del rival de su zona de pago a su Reserva (de su dueño).',
    }],
  },
  {
    id: TEST_MOVER_RIVAL,
    name: 'Mueve a la Zona del Rival Test',
    type: 'Mística',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 1 },
    efectos: [{
      tipo: 'hechizo',
      efecto: 'mover',
      objetivo: { tipo: 'eter', controlador: 'propio', zona: 'reserva', zonaDestino: 'pagado', controladorDestino: 'rival' },
      texto: 'Mueve 1 Éter de tu Reserva a la zona de pago del RIVAL.',
    }],
  },
  {
    id: TEST_BUFF_HASTA,
    name: 'Bendición Hasta Fase Test',
    type: 'Mística',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 1 },
    efectos: [{
      tipo: 'hechizo',
      efecto: 'buff',
      stats: { ATQ: 2, RES: 0 },
      objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' },
      duracion: 'hasta_fase',
      duracionFase: 'choque',
      duracionControlador: 'propio',
      texto: 'Tu Campeón gana +2 ATQ hasta tu próximo Choque.',
    }],
  },
  {
    id: TEST_TRIGGER_PAGO,
    name: 'Trigger con Pago Test',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 2, poder: 2, resistencia: 2 },
    efectos: [{
      tipo: 'pasivo',
      trigger: 'inicio_alba',
      efecto: 'buff',
      stats: { ATQ: 1, RES: 0 },
      objetivo: { tipo: 'self', zona: 'campo' },
      duracion: 'permanente',
      costo: { tipo: 'eter', cantidad: 2 },
      texto: 'Al inicio de tu Alba, puedes pagar 2 Éter: gana +1 ATQ.',
    }],
  } as unknown as AnyCard,
])

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
    fase: 'forja' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conInstancias(s: GameState, mapa: Record<string, { cardId: string; owner?: PlayerId; extra?: Record<string, unknown> }>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(
        Object.entries(mapa).map(([id, { cardId, owner = 'A', extra }]) => [
          id,
          { cardInstanceId: id, cardId, owner, ...(extra ?? {}) },
        ]),
      ),
    },
  }
}

/** Campeón de `owner` en campo[slot]. */
function conCampeon(s: GameState, cardId: string, owner: PlayerId, slot: number): { s: GameState; id: string } {
  const id = `camp-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

/** Vínculos de `owner` en 4A-4F (boca abajo = vivos salvo que extra diga lo contrario). */
function conVinculos(s: GameState, owner: PlayerId, ids: string[], bocaArriba = false): GameState {
  let out = conInstancias(
    s,
    Object.fromEntries(ids.map((id) => [id, { cardId: VINCULO, owner, extra: { bocaArriba } }])),
  )
  const slots: (string | null)[] = [null, null, null, null, null, null]
  ids.forEach((id, i) => { slots[i] = id })
  out = {
    ...out,
    players: { ...out.players, [owner]: { ...out.players[owner], vinculos: slots } },
  }
  return out
}

/** Instancias en la MANO de `owner` + éteres en su Reserva. */
function conMano(s: GameState, owner: PlayerId, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner }])))
  return {
    ...conInst,
    players: { ...conInst.players, [owner]: { ...conInst.players[owner], mano: [...conInst.players[owner].mano, ...Object.keys(mapa)] } },
  }
}

function conEteres(s: GameState, owner: PlayerId, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${ETER_ORDEN}-${owner}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId: ETER_ORDEN, owner }]))),
      players: { ...s.players, [owner]: { ...s.players[owner], eterReserva: [...s.players[owner].eterReserva, ...ids] } },
    },
    ids,
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

describe('B2 — objetivo tipo vinculo en targetResolver (doctrina Capa 2)', () => {
  it("'destruye 1 Vínculo del rival' resuelve: D1 entre los Vínculos VIVOS y destruye", () => {
    const ctx = crearCtx()
    // B tiene 3 Vínculos vivos (boca abajo) + 1 campeón que NO debe ser objetivo
    let s = conVinculos(estadoMinimo(), 'B', ['v-b1', 'v-b2', 'v-b3'])
    const camp = conCampeon(s, 'TEST-TRIGGER-PAGO', 'B', 0)
    s = camp.s
    s = conMano(s, 'A', { 'dest-1': TEST_DESTRUYE })
    const eter = conEteres(s, 'A', 1)
    s = eter.s

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'dest-1', slot: 0, eterIds: [eter.ids[0]] }, ctx)

    // D1: opciones = SOLO los Vínculos vivos de B (no su campeón, no sus zonas)
    expect(s.objetivosPendientes?.length).toBe(1)
    const opciones = s.objetivosPendientes![0].opciones
    expect(opciones).toEqual(expect.arrayContaining(['v-b1', 'v-b2', 'v-b3']))
    expect(opciones).not.toContain(camp.id)
    expect(opciones).toHaveLength(3)

    // Elegir v-b2 → destrucción del Vínculo (§5.5: bocaArriba + evento)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'v-b2' }, ctx)
    expect(s.instances['v-b2'].bocaArriba).toBe(true)
    expect(ctx.events.some((e) => e.type === 'destruccion' && 'cardInstanceId' in e && e.cardInstanceId === 'v-b2')).toBe(true)
    // Los otros dos siguen vivos
    expect(s.instances['v-b1'].bocaArriba).not.toBe(true)
    expect(s.instances['v-b3'].bocaArriba).not.toBe(true)
  })

  it('sin Vínculos vivos del controlador pedido → resolveTargets vacío (fizzle)', () => {
    // Solo Vínculos DESTRUIDOS (bocaArriba) → no son objetivo
    const s = conVinculos(estadoMinimo(), 'B', ['v-destruido'], true)
    const objs = resolveTargets(s, { tipo: 'vinculo', controlador: 'rival', zona: 'campo' }, 'A')
    expect(objs).toEqual([])
  })
})

describe('B5 — controladorDestino decide la zona de QUIÉN', () => {
  it("SIN controladorDestino (default 'dueno'): el Éter vuelve a la zona de SU DUEÑO", () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    // Éter pagado de B (el rival)
    const pagadoB = ['e-b1']
    s = conInstancias(s, { 'e-b1': { cardId: ETER_ORDEN, owner: 'B' } })
    s = {
      ...s,
      players: { ...s.players, B: { ...s.players.B, eterPagado: pagadoB } },
    }
    s = conMano(s, 'A', { 'mov-1': TEST_MOVER_DUENO })
    const eterA = conEteres(s, 'A', 1)
    s = eterA.s

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'mov-1', slot: 0, eterIds: [eterA.ids[0]] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'e-b1' }, ctx)

    // Default = DUÉÑO del Éter (FB-017/FB-027) — NO hay transferencia
    expect(s.players.B.eterReserva).toContain('e-b1')
    expect(s.players.B.eterPagado).not.toContain('e-b1')
    expect(s.players.A.eterReserva).not.toContain('e-b1')
  })

  it("controladorDestino 'propio': el Éter del rival TRANSFIERE a tu Reserva (DS-017 'a tu Reserva')", () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    const pagadoB = ['e-b2']
    s = conInstancias(s, { 'e-b2': { cardId: ETER_ORDEN, owner: 'B' } })
    s = {
      ...s,
      players: { ...s.players, B: { ...s.players.B, eterPagado: pagadoB } },
    }
    s = conMano(s, 'A', { 'mov-2': TEST_MOVER_TUYO })
    const eterA = conEteres(s, 'A', 1)
    s = eterA.s

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'mov-2', slot: 0, eterIds: [eterA.ids[0]] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'e-b2' }, ctx)

    // 'propio' = TRANSFIERE al que lanza (B5) — invariante global lo permite
    expect(s.players.A.eterReserva).toContain('e-b2')
    expect(s.players.B.eterPagado).not.toContain('e-b2')
    expect(s.players.B.eterReserva).not.toContain('e-b2')
  })

  it("controladorDestino 'rival': mi Éter va a la zona del RIVAL", () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    s = conMano(s, 'A', { 'mov-3': TEST_MOVER_RIVAL })
    const eterA = conEteres(s, 'A', 2)
    s = eterA.s

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'mov-3', slot: 0, eterIds: [eterA.ids[0]] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eterA.ids[1] }, ctx)

    expect(s.players.B.eterPagado).toContain(eterA.ids[1])
    expect(s.players.A.eterReserva).not.toContain(eterA.ids[1])
    expect(s.players.A.eterPagado).not.toContain(eterA.ids[1])
  })
})

describe('B6 — duracion hasta_fase expira al entrar la fase del dueño', () => {
  it('buff hasta_fase: vive hasta la fase+dueño correctos y expira con purgarHastaFase', () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    const camp = conCampeon(s, 'TEST-TRIGGER-PAGO', 'A', 0)
    s = camp.s
    s = conMano(s, 'A', { 'buff-1': TEST_BUFF_HASTA })
    const eter = conEteres(s, 'A', 1)
    s = eter.s

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'buff-1', slot: 0, eterIds: [eter.ids[0]] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: camp.id }, ctx)

    // +2 ATQ aplicado con expira 'hasta-fase' / fase 'choque' / dueño A
    expect(statsDe(s, camp.id).poder).toBe(4)
    const mods = s.instances[camp.id].modificadores ?? []
    const mod = mods.find((m) => m.valor === 2)
    expect(mod).toMatchObject({ expira: 'hasta-fase', expiraFase: 'choque', expiraFaseJugador: 'A' })

    // Entrar Otras fases/jugadores NO lo purgan
    purgarHastaFase(s, 'ocaso', 'A')
    purgarHastaFase(s, 'choque', 'B')
    expect(s.instances[camp.id].modificadores).toContainEqual(expect.objectContaining({ valor: 2 }))

    // Entrar el Choque del dueño A → purga
    purgarHastaFase(s, 'choque', 'A')
    expect(s.instances[camp.id].modificadores ?? []).toHaveLength(0)
    expect(statsDe(s, camp.id).poder).toBe(2)
  })

  it('DS-028 (Vínculo): Indestructible hasta la próxima Forja del RIVAL — sobrevive al Ocaso propio', () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    const camp = conCampeon(s, 'TEST-TRIGGER-PAGO', 'A', 0)
    s = camp.s
    // Vínculo DESTRUIDO de A (bocaArriba) → su efecto inicio_alba está vigente (§5.5)
    s = conVinculos(s, 'A', ['v-a1'], true)
    // Mazo con cartas para que el Alba no deck-outee
    s = conInstancias(s, { 'mazo-a0': { cardId: ETER_ORDEN, owner: 'A' }, 'mazo-a1': { cardId: ETER_ORDEN, owner: 'A' } })
    s = { ...s, players: { ...s.players, A: { ...s.players.A, mazo: ['mazo-a0', 'mazo-a1'] } } }

    resolverAlba(s, ctx, 'A')

    // D1: el grant es por elección (fromTrigger fuerza pendiente) → elegir
    expect(s.objetivosPendientes?.length).toBe(1)
    expect(s.objetivosPendientes![0].opciones).toContain(camp.id)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: camp.id }, ctx)

    // DS-028 otorga Indestructible 'hasta la próxima Forja del rival' → dueño = B
    expect(keywordsDe(s, camp.id)).toContain('Indestructible')
    const registro = s.instances[camp.id].keywordsHastaFase ?? []
    expect(registro).toEqual([{ keyword: 'Indestructible', fase: 'forja', jugador: 'B' }])

    // Ocaso propio / Choque propio NO lo purgan (sobrevive hasta la Forja de B)
    purgarHastaFase(s, 'ocaso', 'A')
    purgarHastaFase(s, 'forja', 'A')
    expect(keywordsDe(s, camp.id)).toContain('Indestructible')

    // Al ENTRAR la Forja del turno de B → expira
    purgarHastaFase(s, 'forja', 'B')
    expect(keywordsDe(s, camp.id)).not.toContain('Indestructible')
    expect(s.instances[camp.id].keywordsHastaFase ?? []).toHaveLength(0)
  })
})

describe('B8 — el costo eter de efectos trigger-eados SE COBRA', () => {
  function setupTrigger(conFondos: boolean): { s: GameState; champId: string; eterIds: string[] } {
    const camp = conCampeon(estadoMinimo(), TEST_TRIGGER_PAGO, 'A', 0)
    const eter = conEteres(camp.s, 'A', conFondos ? 3 : 1)
    return { s: eter.s, champId: camp.id, eterIds: eter.ids }
  }

  it('con fondos: cobra 2 Éter (Reserva → 1A) y resuelve el buff', () => {
    const { s, champId, eterIds } = setupTrigger(true)
    const ctx = crearCtx()

    dispararTrigger(s, ctx, 'al-inicio-alba', 'A', [champId])

    // Cobrado: 2 Éteres de Reserva → Pagado (1A)
    expect(s.players.A.eterReserva).toEqual([eterIds[2]])
    expect(s.players.A.eterPagado).toEqual([eterIds[0], eterIds[1]])
    expect(ctx.events.some((e) => e.type === 'eter_pagado' && e.costo === 2)).toBe(true)
    // Efecto resuelto
    expect(statsDe(s, champId).poder).toBe(3)
  })

  it('SIN fondos suficientes: fizzled — ni cobra ni resuelve', () => {
    const { s, champId, eterIds } = setupTrigger(false) // solo 1 Éter, costo 2
    const ctx = crearCtx()

    dispararTrigger(s, ctx, 'al-inicio-alba', 'A', [champId])

    expect(s.players.A.eterReserva).toEqual(eterIds) // intacto
    expect(s.players.A.eterPagado).toEqual([])
    expect(ctx.events.some((e) => e.type === 'eter_pagado')).toBe(false)
    expect(statsDe(s, champId).poder).toBe(2) // sin buff
  })
})
