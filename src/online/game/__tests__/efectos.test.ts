// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { createInitialState } from '../initialState'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import type { Ctx, GameState, PlayerId } from '../types'
import { expandirMazo } from './helpers'
import {
  registrarEfecto,
  limpiarRegistroEfectos,
  dispararTrigger,
  statsDe,
  keywordsDe,
  aplicarMod,
  otorgarKeyword,
  purgarEfectosTemporales,
} from '../efectos'

// Cartas reales del catálogo (fuente de verdad: seed/PrimerColeccionEfectos.json):
// FB-010 Aurora · FB-011 Vaela (hoy: al_matar_en_combate/mover) · DS-011 Kael (pasivo/al_atacar/debuff)
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const KAEL = 'DS-011' // pasivo / al_atacar / debuff −1 ATQ al rival
const ISOLDE = 'FB-014'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

/** Estado mínimo de combate (patrón combat.test.ts): fase choque, turno A. */
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

/** Campeón de `owner` en el campo (slot 2B-2F); devuelve el estado y el id. */
function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
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

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

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

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const rivalDe = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A')

describe('registro y dispatch de efectos (F1, ADR-20)', () => {
  afterEach(() => limpiarRegistroEfectos())

  // ─── CardId-specific dispatch path (registrarEfecto) ───
  // These test the dispatch infrastructure for cards WITHOUT matching JSON effects.

  it('dispararTrigger ejecuta el handler registrado para (trigger, cardId) con ctx', () => {
    const ctx = crearCtx()
    const { s, id } = conCampeon(estadoMinimo(), AURORA, 0)
    // Use a custom trigger that doesn't match any JSON effect
    registrarEfecto('custom-dispatch-test' as any, AURORA, (st, c, inst) => {
      expect(c).toBe(ctx)
      inst.keywords = [...(inst.keywords ?? []), 'Prueba']
    })
    dispararTrigger(s, ctx, 'custom-dispatch-test' as any, 'A', [id])
    expect(s.instances[id].keywords).toContain('Prueba')
  })

  it('sin handler registrado → no-op (no lanza, no muta)', () => {
    const ctx = crearCtx()
    const { s, id } = conCampeon(estadoMinimo(), AURORA, 0)
    const antes = JSON.stringify(s)
    dispararTrigger(s, ctx, 'al-invocar', 'A', [id])
    expect(JSON.stringify(s)).toBe(antes)
  })

  it('orden determinista: cardInstanceId asc aunque se pasen desordenadas', () => {
    const ctx = crearCtx()
    let s = estadoMinimo()
    const orden: string[] = []
    const { s: s1, id: id1 } = conCampeon(s, AURORA, 0)
    s = s1
    const { s: s2, id: id2 } = conCampeon(s, VAELA, 1)
    s = s2
    // Use custom triggers that don't match JSON effects
    registrarEfecto('custom-order-1' as any, AURORA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    registrarEfecto('custom-order-2' as any, VAELA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    // Register both on same custom trigger
    registrarEfecto('custom-order-test' as any, AURORA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    registrarEfecto('custom-order-test' as any, VAELA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    dispararTrigger(s, ctx, 'custom-order-test' as any, 'A', [id2, id1]) // desordenadas
    expect(orden).toEqual([id1, id2])
  })

  // ─── JSON interpreter path (efectos[] + interpretEffect) ───
  // These test that the JSON interpreter handles effects from paquetes.ts.

  it('JSON path: dispararTrigger ejecuta interpretEffect cuando hay JSON effect matching', () => {
    const ctx = crearCtx()
    // DS-011 (Kael) JSON effect: pasivo / trigger='al_atacar' / efecto='debuff' (−1 ATQ al rival)
    let s = estadoMinimo()
    const { s: s1, id: kael } = conCampeon(s, KAEL, 0, 'A')
    s = s1
    const { s: s2, id: rival } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const poderAntes = statsDe(s, rival).poder

    // Fire al-atacar trigger — JSON interpreter creates D1 pending (debuff needs targeting)
    dispararTrigger(s, ctx, 'al-atacar', 'A', [kael])

    // D1 pattern: pending objective created, player must choose target
    expect(s.objetivosPendientes).toBeDefined()
    expect(s.objetivosPendientes![0].opciones).toEqual([rival])

    // Resolve the pending: player chooses the rival champion
    const r = applyAction(s, { type: 'elegir_objetivo', objetivoId: rival }, ctx)
    expect(r.ok).toBe(true)
    if (r.ok) {
      // Now the effect executes: rival's champion loses 1 ATQ (debuff from JSON)
      expect(statsDe(r.state, rival).poder).toBe(poderAntes - 1)
    }
  })

  it('JSON path: tutor effect creates pending objective from mazo', () => {
    const ctx = crearCtx()
    // DS-031 (FB-031 equivalent) has tutor effect with trigger='al_ser_enviado_al_cementerio'
    let s = estadoMinimo()
    const { s: s1, id: ds031 } = conCampeon(s, 'DS-031', 0, 'A')
    s = s1
    // Add cards to mazo
    s = {
      ...s,
      instances: {
        ...s.instances,
        'm-vaela': { cardInstanceId: 'm-vaela', cardId: 'FB-011', owner: 'A' },
        'm-aurora': { cardInstanceId: 'm-aurora', cardId: 'FB-010', owner: 'A' },
      },
      players: {
        ...s.players,
        A: { ...s.players.A, mazo: ['m-vaela', 'm-aurora'] },
      },
    }

    // Fire al-ser-enviado-al-cementerio — JSON interpreter should create pending
    dispararTrigger(s, ctx, 'al-ser-enviado-al-cementerio', 'A', [ds031])

    // Should have pending objective with only Vaela (cost ≤ 2 champion)
    expect(s.objetivosPendientes).toBeDefined()
    expect(s.objetivosPendientes![0].opciones).toEqual(['m-vaela'])
  })
})

describe('statsDe y keywordsDe (ADR-20)', () => {
  it('statsDe = base meta + override de instancia (poder?/resistencia?)', () => {
    const { s, id } = conCampeon(estadoMinimo(), VAELA, 0) // Vaela 5/3
    expect(statsDe(s, id)).toEqual({ poder: 5, resistencia: 3 })
    const conOverride = {
      ...s,
      instances: { ...s.instances, [id]: { ...s.instances[id], poder: 7, resistencia: 1 } },
    }
    expect(statsDe(conOverride, id)).toEqual({ poder: 7, resistencia: 1 })
  })

  it('statsDe suma los modificadores (Σ aditivo, ADR-22)', () => {
    const { s, id } = conCampeon(estadoMinimo(), VAELA, 0) // 5/3
    aplicarMod(s, id, 'poder', 2, 'ocaso')
    aplicarMod(s, id, 'resistencia', -1, 'permanente')
    expect(statsDe(s, id)).toEqual({ poder: 7, resistencia: 2 })
  })

  it('keywordsDe = data + inst.keywords + inst.keywordsTemporales', () => {
    const { s, id } = conCampeon(estadoMinimo(), ISOLDE, 0) // Protector en data
    const conKw = {
      ...s,
      instances: { ...s.instances, [id]: { ...s.instances[id], keywords: ['Vigor'], keywordsTemporales: ['Carga'] } },
    }
    const kws = keywordsDe(conKw, id)
    expect(kws).toContain('Protector')
    expect(kws).toContain('Vigor')
    expect(kws).toContain('Carga')
  })
})

describe('regresión: combat usa statsDe (C1.3)', () => {
  it('un modificador de resistencia cambia el resultado de la resolución', () => {
    const ctx = crearCtx()
    const { s: s1, id: vaela } = conCampeon(estadoMinimo(), VAELA, 0, 'A') // 5/3
    const { s: s2, id: isolde } = conCampeon(s1, ISOLDE, 0, 'B') // 3/7
    let s = s2
    // Sin modificador: Vaela (RES 3) muere ante Isolde (PODER 3 ≥ 3).
    // Con +3 RES (5/6): 3 < 6 → Vaela sobrevive; y 5 < 7 → Isolde sobrevive.
    aplicarMod(s, vaela, 'resistencia', 3, 'permanente')
    s = aplicar(s, { type: 'declarar_ataque', atacanteIds: [vaela] }, ctx)
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { [vaela]: isolde } }, ctx)
    expect(s.players.A.campo.campeones).toContain(vaela)
    expect(s.players.B.campo.campeones).toContain(isolde)
    expect(s.instances[vaela]).toBeDefined()
    expect(s.instances[isolde]).toBeDefined()
  })
})

describe('purgas por expiración (ADR-22)', () => {
  it('purgarEfectosTemporales filtra por expira y jugador', () => {
    const { s, id } = conCampeon(estadoMinimo(), VAELA, 0)
    aplicarMod(s, id, 'poder', 2, 'ocaso')
    aplicarMod(s, id, 'poder', 3, 'alba-dueño')
    aplicarMod(s, id, 'poder', 4, 'permanente')
    purgarEfectosTemporales(s, 'ocaso')
    expect(s.instances[id].modificadores.map((m) => m.expira)).toEqual(['alba-dueño', 'permanente'])
    purgarEfectosTemporales(s, 'alba-dueño', 'A')
    expect(s.instances[id].modificadores.map((m) => m.expira)).toEqual(['permanente'])
  })

  it("'ocaso' se purga en la transición choque→ocaso; 'permanente' persiste", () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const campeonId = state.players[a].mano[0]
    let s: GameState = {
      ...state,
      instances: { ...state.instances, [campeonId]: { ...state.instances[campeonId] } },
      players: {
        ...state.players,
        [a]: { ...state.players[a], campo: { ...state.players[a].campo, campeones: [campeonId, null, null, null, null] } },
      },
    }
    aplicarMod(s, campeonId, 'poder', 2, 'ocaso')
    aplicarMod(s, campeonId, 'resistencia', 1, 'permanente')
    expect(s.instances[campeonId].modificadores).toHaveLength(2)

    // Forja → Choque → Ocaso: purga 'ocaso', persiste 'permanente'
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('ocaso')
    expect(s.instances[campeonId].modificadores).toEqual([{ stat: 'resistencia', valor: 1, expira: 'permanente' }])
  })

  it("'alba-dueño' se purga en la Alba del DUEÑO (no en la del rival)", () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const b = rivalDe(a)
    const campeonId = state.players[a].mano[0]
    let s: GameState = {
      ...state,
      instances: { ...state.instances, [campeonId]: { ...state.instances[campeonId] } },
      players: {
        ...state.players,
        [a]: { ...state.players[a], campo: { ...state.players[a].campo, campeones: [campeonId, null, null, null, null] } },
      },
    }
    aplicarMod(s, campeonId, 'poder', 2, 'alba-dueño')
    expect(s.instances[campeonId].modificadores).toHaveLength(1)

    // A juega su turno completo → Alba de B: el mod de A sigue (no es su Alba)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(b)
    expect(s.instances[campeonId].modificadores).toHaveLength(1)

    // B juega su turno completo → Alba de A: se purga 'alba-dueño'
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe(a)
    expect(s.instances[campeonId].modificadores).toEqual([])
  })

  it('keywordsTemporales se limpian en ocaso; keywords permanentes persisten', () => {
    const { state, ctx } = partidaIniciada(123)
    const a = state.turno
    const campeonId = state.players[a].mano[0]
    let s: GameState = {
      ...state,
      instances: { ...state.instances, [campeonId]: { ...state.instances[campeonId] } },
      players: {
        ...state.players,
        [a]: { ...state.players[a], campo: { ...state.players[a].campo, campeones: [campeonId, null, null, null, null] } },
      },
    }
    otorgarKeyword(s, campeonId, 'Vigor', true) // temporal
    otorgarKeyword(s, campeonId, 'Inmortal', false) // permanente
    expect(s.instances[campeonId].keywordsTemporales).toEqual(['Vigor'])
    expect(s.instances[campeonId].keywords).toEqual(['Inmortal'])

    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    s = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('ocaso')
    expect(s.instances[campeonId].keywordsTemporales).toEqual([])
    expect(s.instances[campeonId].keywords).toEqual(['Inmortal'])
  })
})
