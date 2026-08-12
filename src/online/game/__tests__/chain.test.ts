// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { visibleState } from '../visibleState'
import type { GameEvent } from '../events'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// FB-011 Vaela 5/3 Carga · FB-014 Isolde 3/7 Protector · FB-019 (Mística) ·
// FB-021 Marcha de las Primeras (Táctica) · FB-023 El Reino Perdido (Arcana) ·
// FB-024 Filo del Éter Primigenio (Combate)
const VAELA = 'FB-011'
const ISOLDE = 'FB-014'
const MISTICA = 'FB-019'
const TACTICA = 'FB-021'
const ARCANA = 'FB-023'
const COMBATE = 'FB-024'

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

interface OpcionesCarta {
  owner?: PlayerId
  entradaEsteTurno?: boolean
  bocaArriba?: boolean
}

/** Carta de `owner` en el campo: Campeón (2B-2F) o Táctica/Mística (3A-3C) o Arcana/Combate (3D-3F). */
function conCarta(
  s: GameState,
  cardId: string,
  grupo: 'campeones' | 'misticasTacticas' | 'arcanasCombate',
  slot: number,
  opts: OpcionesCarta = {},
): { s: GameState; id: string } {
  const owner = opts.owner ?? 'A'
  const id = `c-${cardId}-${grupo}-${slot}`
  const inst: Record<string, unknown> = { cardInstanceId: id, cardId, owner }
  if (opts.entradaEsteTurno !== undefined) inst.entradaEsteTurno = opts.entradaEsteTurno
  if (opts.bocaArriba !== undefined) inst.bocaArriba = opts.bocaArriba
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: inst },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            [grupo]: s.players[owner].campo[grupo].map((c, i) => (i === slot ? id : c)),
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

/** Ctx que cuenta extracciones RNG (cadena = 0 extracciones, contrato 89). */
function ctxContador(): { ctx: Ctx; llamadas: () => number } {
  const events: GameEvent[] = []
  let n = 0
  return {
    ctx: { next: () => { n++; return 0 }, emit: (e) => { events.push(e) }, events },
    llamadas: () => n,
  }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const tiposDe = (s: GameState, p: PlayerId): string[] => getValidActions(s, p).map((a) => a.type)

describe('cadena 9.6 — apertura y prioridad (ADR-12)', () => {
  it('el DEFENSOR tiene prioridad al abrir tras declarar_ataque (L1181), paso queda en bloqueo', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const conT = conCarta(a.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const s = aplicar(conT.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)

    expect(s.combate?.paso).toBe('bloqueo') // el auto-avance 9.3 queda diferido
    expect(s.combate?.cadena).toBeDefined()
    expect(s.combate?.cadena?.prioridad).toBe('B')
    expect(s.combate?.cadena?.pila).toEqual([])
    expect(s.combate?.cadena?.pasesConsecutivos).toBe(0)
  })

  it('apertura CONDICIONAL: sin respondibles del defensor NO se abre y el flujo sigue (auto-avance 9.3)', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const s = aplicar(a.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)

    expect(s.combate?.cadena).toBeUndefined()
    expect(s.combate?.paso).toBe('resolucion') // sin bloqueadores ni cadena
  })

  it('la cadena CONGELA el turno: ni declarar_bloqueo del defensor ni pasar_turno del activo mientras abierta', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const conDef = conCarta(a.s, ISOLDE, 'campeones', 0, { owner: 'B' }) // enderezado: paso bloqueo
    const conT = conCarta(conDef.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const s = aplicar(conT.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)

    expect(s.combate?.cadena?.prioridad).toBe('B')
    expect(tiposDe(s, 'B')).not.toContain('declarar_bloqueo') // paso 'bloqueo' pero congelado
    expect(tiposDe(s, 'A')).not.toContain('pasar_turno')
    expect(tiposDe(s, 'A')).not.toContain('declarar_ataque')
    expect(applyAction(s, { type: 'pasar_turno' }, ctx).ok).toBe(false)
  })

  it('solo en Choque: en Forja no hay cadena y responder/pasar son rechazadas', () => {
    const ctx = crearCtx()
    const s = { ...estadoMinimo(), fase: 'forja' as const }
    expect(applyAction(s, { type: 'pasar_prioridad' }, ctx).ok).toBe(false)
    expect(applyAction(s, { type: 'responder_cadena', cardInstanceId: 'x' }, ctx).ok).toBe(false)
  })
})

describe('responder_cadena (9.6) — pila, orden inverso y consumo', () => {
  it('ejemplo del manual: orden INVERSO — el Combate se resuelve primero (→ 2G), la Táctica permanece y el atacante sigue AGOTADO (L1194)', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    // B con Táctica respondible + A con Combate en mesa
    const b = conCarta(a.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const c = conCarta(b.s, COMBATE, 'arcanasCombate', 0)
    const s1 = aplicar(c.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    expect(s1.combate?.cadena?.prioridad).toBe('B')

    // B activa la Táctica → pila [tácticaB], prioridad → A
    const s2 = aplicar(s1, { type: 'responder_cadena', cardInstanceId: b.id }, ctx)
    expect(s2.combate?.cadena?.pila).toEqual([b.id])
    expect(s2.combate?.cadena?.prioridad).toBe('A')

    // A responde con el Combate → pila [tácticaB, combateA], prioridad → B
    const s3 = aplicar(s2, { type: 'responder_cadena', cardInstanceId: c.id }, ctx)
    expect(s3.combate?.cadena?.pila).toEqual([b.id, c.id])

    // B pasa (1) → A pasa (2) → resolución en ORDEN INVERSO
    const s4 = aplicar(s3, { type: 'pasar_prioridad' }, ctx)
    expect(s4.combate?.cadena?.pasesConsecutivos).toBe(1)
    const s5 = aplicar(s4, { type: 'pasar_prioridad' }, ctx)

    // El Combate (última activación) se resuelve PRIMERO → 2G de A, slot libre
    expect(s5.players.A.cementerio).toContain(c.id)
    expect(s5.players.A.campo.arcanasCombate[0]).toBeNull()
    // La Táctica PERMANECE en mesa
    expect(s5.players.B.campo.misticasTacticas[0]).toBe(b.id)
    expect(s5.combate?.cadena).toBeUndefined() // cadena cerrada
    // El agotamiento se pagó al declarar: Vaela sigue agotada y ya atacó
    expect(s5.instances[a.id].agotado).toBe(true)
    expect(s5.instances[a.id].atacoEsteTurno).toBe(true)
  })

  it('Arcana: al responder se REVELA (bocaArriba) y al resolver va a 2G liberando el slot', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const arcB = conCarta(a.s, ARCANA, 'arcanasCombate', 0, { owner: 'B' })
    const s1 = aplicar(arcB.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)

    const s2 = aplicar(s1, { type: 'responder_cadena', cardInstanceId: arcB.id }, ctx)
    expect(s2.instances[arcB.id].bocaArriba).toBe(true) // revelada al activarse

    const s3 = aplicar(s2, { type: 'pasar_prioridad' }, ctx) // B pasa
    const s4 = aplicar(s3, { type: 'pasar_prioridad' }, ctx) // A pasa → resolución
    expect(s4.players.B.cementerio).toContain(arcB.id)
    expect(s4.players.B.campo.arcanasCombate[0]).toBeNull()
  })

  it('no elegibles: Mística NO responde; Táctica/Arcana recién colocadas (§5.5) NO; Combate recién colocado SÍ', () => {
    const ctx = crearCtx()
    // (a) Mística del defensor: no abre la cadena
    const conM = conCarta(estadoMinimo(), MISTICA, 'misticasTacticas', 0, { owner: 'B' })
    const a1 = conCarta(conM.s, VAELA, 'campeones', 0)
    const r1 = applyAction(a1.s, { type: 'declarar_ataque', atacanteIds: [a1.id] }, ctx)
    if (!r1.ok) throw new Error(r1.error)
    expect(r1.state.combate?.cadena).toBeUndefined()

    // (b) tras el bloqueo, el atacante A con Táctica/Combate recién colocados:
    //     la Táctica está en activación diferida, el Combate responde siempre
    const s0 = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const conB = conCarta(s0.s, ISOLDE, 'campeones', 0, { owner: 'B' })
    const conT = conCarta(conB.s, TACTICA, 'misticasTacticas', 0, { entradaEsteTurno: true })
    const conCb = conCarta(conT.s, COMBATE, 'arcanasCombate', 0, { entradaEsteTurno: true })
    const r2 = applyAction(conCb.s, { type: 'declarar_ataque', atacanteIds: [s0.id] }, ctx)
    if (!r2.ok) throw new Error(r2.error)
    expect(r2.state.combate?.cadena).toBeUndefined() // B (defensor) sin respondibles

    const r3 = applyAction(r2.state, { type: 'declarar_bloqueo', asignaciones: { [s0.id]: conB.id } }, ctx)
    if (!r3.ok) throw new Error(r3.error)
    expect(r3.state.combate?.cadena?.prioridad).toBe('A')

    const respuestas = getValidActions(r3.state, 'A').filter((x) => x.type === 'responder_cadena')
    expect(respuestas).toHaveLength(1)
    if (respuestas[0]?.type === 'responder_cadena') {
      expect(respuestas[0].cardInstanceId).toBe(conCb.id) // el Combate, NO la Táctica
    }
  })

  it('0 extracciones RNG durante la cadena (contrato 89 intacto)', () => {
    const { ctx, llamadas } = ctxContador()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const b = conCarta(a.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const c = conCarta(b.s, COMBATE, 'arcanasCombate', 0)
    let s = aplicar(c.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: b.id }, ctx)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: c.id }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    aplicar(s, { type: 'pasar_prioridad' }, ctx)
    expect(llamadas()).toBe(0)
  })
})

describe('pasar_prioridad y cierre (L1183)', () => {
  it('un pase NO resuelve; una respuesta tras un pase RESETEA pasesConsecutivos; dos pases resuelven', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    // B con DOS tácticas respondibles (slots 0 y 1): tras pasar A, B responde la segunda
    const b0 = conCarta(a.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const b1 = conCarta(b0.s, TACTICA, 'misticasTacticas', 1, { owner: 'B' })
    let s = aplicar(b1.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: b0.id }, ctx) // B responde → A
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // A pasa (1) → B
    expect(s.combate?.cadena?.pasesConsecutivos).toBe(1)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: b1.id }, ctx) // B responde → reset → A
    expect(s.combate?.cadena?.pasesConsecutivos).toBe(0)
    expect(s.combate?.cadena?.pila).toEqual([b0.id, b1.id])
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // A pasa (1) → B
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx) // B pasa (2) → resolución
    expect(s.combate?.cadena).toBeUndefined()
    // Ambas Tácticas permanecen (3A-3C) — la última activación (b1) se resuelve primero
    expect(s.players.B.campo.misticasTacticas[0]).toBe(b0.id)
    expect(s.players.B.campo.misticasTacticas[1]).toBe(b1.id)
  })

  it('la cadena se abre tras declarar_bloqueo con prioridad del ATACANTE (L1182)', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const conDef = conCarta(a.s, ISOLDE, 'campeones', 0, { owner: 'B' })
    const combateA = conCarta(conDef.s, COMBATE, 'arcanasCombate', 0) // A con Combate en mesa
    const s1 = aplicar(combateA.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    expect(s1.combate?.cadena).toBeUndefined() // B sin respondibles: no se abre tras el ataque

    const s2 = aplicar(s1, { type: 'declarar_bloqueo', asignaciones: { [a.id]: conDef.id } }, ctx)
    expect(s2.combate?.cadena).toBeDefined()
    expect(s2.combate?.cadena?.prioridad).toBe('A') // el ATACANTE responde tras el bloqueo
    expect(tiposDe(s2, 'A')).toContain('pasar_prioridad')
  })

  it('validaciones: responder carta ajena/sin prioridad o no respondible; pasar/responder sin cadena', () => {
    const ctx = crearCtx()
    // Sin cadena
    expect(applyAction(estadoMinimo(), { type: 'pasar_prioridad' }, ctx).ok).toBe(false)
    expect(applyAction(estadoMinimo(), { type: 'responder_cadena', cardInstanceId: 'x' }, ctx).ok).toBe(false)

    // Con cadena: B tiene prioridad; A intenta responder con SU Combate → rechazado
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const b = conCarta(a.s, TACTICA, 'misticasTacticas', 0, { owner: 'B' })
    const combateA = conCarta(b.s, COMBATE, 'arcanasCombate', 0)
    const s1 = aplicar(combateA.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    expect(applyAction(s1, { type: 'responder_cadena', cardInstanceId: combateA.id }, ctx).ok).toBe(false)

    // Responder la Táctica de B (con prioridad de B) SÍ es válido
    expect(applyAction(s1, { type: 'responder_cadena', cardInstanceId: b.id }, ctx).ok).toBe(true)
  })
})

describe('visibleState con cadena (6.2)', () => {
  it('la Arcana rival en la pila de la cadena es visible para el atacante', () => {
    const ctx = crearCtx()
    const a = conCarta(estadoMinimo(), VAELA, 'campeones', 0)
    const arcB = conCarta(a.s, ARCANA, 'arcanasCombate', 0, { owner: 'B' })
    const s1 = aplicar(arcB.s, { type: 'declarar_ataque', atacanteIds: [a.id] }, ctx)
    const s2 = aplicar(s1, { type: 'responder_cadena', cardInstanceId: arcB.id }, ctx)

    const visA = visibleState(s2, 'A') // el RIVAL ve la Arcana respondida
    expect(visA.instances[arcB.id].cardId).toBe(ARCANA)
  })
})
