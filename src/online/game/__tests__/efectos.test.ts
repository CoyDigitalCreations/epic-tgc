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

// Cartas reales del paquete (paquetes.ts):
// FB-010 Aurora · FB-011 Vaela 5/3 Carga · FB-014 Isolde 3/7 Protector
const AURORA = 'FB-010'
const VAELA = 'FB-011' // 5/3 Carga
const ISOLDE = 'FB-014' // 3/7 Protector

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

  it('dispararTrigger ejecuta el handler registrado para (trigger, cardId) con ctx', () => {
    const ctx = crearCtx()
    const { s, id } = conCampeon(estadoMinimo(), AURORA, 0)
    registrarEfecto('al-invocar', AURORA, (st, c, inst) => {
      expect(c).toBe(ctx)
      inst.keywords = [...(inst.keywords ?? []), 'Prueba']
    })
    dispararTrigger(s, ctx, 'al-invocar', 'A', [id])
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
    registrarEfecto('al-invocar', AURORA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    registrarEfecto('al-invocar', VAELA, (_st, _c, inst) => orden.push(inst.cardInstanceId))
    dispararTrigger(s, ctx, 'al-invocar', 'A', [id2, id1]) // desordenadas
    expect(orden).toEqual([id1, id2])
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
