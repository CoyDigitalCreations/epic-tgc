// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  destruirCarta, verificarDerrotaVinculos,
  buscarFuentePreventDestroy, ejecutarResponderPrevenicion, validarResponderPrevenicion,
} from '../replacements'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { registrarCartas } from '../cards'
import { elegirPrevenicion } from '../botStrategies'
import type { Action } from '../actions'
import type { AnyCard } from '../../../shared/types/cards'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del catálogo (fuente de verdad: seed/PrimerColeccionEfectos.json):
// FB-011 Vaela 5/3 (sin keywords anti-destrucción) · FB-025 Primer Juramento (Vínculo Orden)
// FB-018 Rowena, Vínculo Eterno — prevent_destroy + cuando_vinculo_seria_destruido + exile_self
const VAELA = 'FB-011'
const VINCULO = 'FB-025'
const ROWENA = 'FB-018'

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

function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId, opts: { keywords?: string[]; eterBloqueado?: string[] } = {}): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}`
  const inst: Record<string, unknown> = { cardInstanceId: id, cardId, owner }
  if (opts.keywords !== undefined) inst.keywords = opts.keywords
  if (opts.eterBloqueado !== undefined) inst.eterBloqueado = opts.eterBloqueado
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: inst },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: { ...s.players[owner].campo, campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)) },
        },
      },
    },
    id,
  }
}

function conVinculo(s: GameState, slot: number, owner: PlayerId): { s: GameState; id: string } {
  const id = `vin-${slot}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId: VINCULO, owner } },
      players: {
        ...s.players,
        [owner]: { ...s.players[owner], vinculos: s.players[owner].vinculos.map((c, i) => (i === slot ? id : c)) },
      },
    },
    id,
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

describe('destruirCarta por causa (ADR-15)', () => {
  it('Campeón sin keywords: causa combate → carta_muerta + destruccion, Éter bloqueado → 1A, y va a 2G', () => {
    const ctx = crearCtx()
    const c = conCampeon(estadoMinimo(), VAELA, 0, 'A', { eterBloqueado: ['et1'] })

    destruirCarta(c.s, ctx, c.id, 'combate')
    expect(ctx.events).toContainEqual({ type: 'carta_muerta', cardInstanceId: c.id, jugador: 'A', causa: 'combate' })
    expect(ctx.events).toContainEqual({ type: 'destruccion', cardInstanceId: c.id, jugador: 'A', causa: 'combate' })
    expect(ctx.events.some((e) => e.type === 'destruccion_prevenida')).toBe(false)
    expect(c.s.players.A.cementerio).toContain(c.id) // → 2G
    expect(c.s.players.A.eterPagado).toContain('et1') // Éter del muerto → 1A
    expect(c.s.instances[c.id].eterBloqueado).toBeUndefined()
  })

  it('Indestructible previene SOLO causa combate (L1209); causa efecto lo destruye (L1210)', () => {
    const ctx = crearCtx()
    const c = conCampeon(estadoMinimo(), VAELA, 0, 'A', { keywords: ['Indestructible'] })

    destruirCarta(c.s, ctx, c.id, 'combate') // prevenido
    expect(ctx.events).toContainEqual({ type: 'destruccion_prevenida', cardInstanceId: c.id, jugador: 'A', causa: 'combate' })
    expect(ctx.events.some((e) => e.type === 'carta_muerta')).toBe(false)
    expect(c.s.players.A.campo.campeones).toContain(c.id) // sin movimiento

    const ctx2 = crearCtx()
    destruirCarta(c.s, ctx2, c.id, 'efecto') // Indestructible NO cubre 'efecto'
    expect(ctx2.events.some((e) => e.type === 'destruccion_prevenida')).toBe(false)
    expect(ctx2.events).toContainEqual({ type: 'carta_muerta', cardInstanceId: c.id, jugador: 'A', causa: 'efecto' })
  })

  it('Inmortal previene SOLO causa efecto (L1210); causa combate lo destruye', () => {
    const ctx = crearCtx()
    const c = conCampeon(estadoMinimo(), VAELA, 0, 'A', { keywords: ['Inmortal'] })

    destruirCarta(c.s, ctx, c.id, 'efecto') // prevenido
    expect(ctx.events).toContainEqual({ type: 'destruccion_prevenida', cardInstanceId: c.id, jugador: 'A', causa: 'efecto' })
    expect(c.s.players.A.campo.campeones).toContain(c.id)

    const ctx2 = crearCtx()
    destruirCarta(c.s, ctx2, c.id, 'combate') // Inmortal NO cubre 'combate'
    expect(ctx2.events.some((e) => e.type === 'destruccion_prevenida')).toBe(false)
    expect(ctx2.events).toContainEqual({ type: 'carta_muerta', cardInstanceId: c.id, jugador: 'A', causa: 'combate' })
  })

  it('Vínculo destruido: bocaArriba=true, NO va a 2G, SOLO destruccion (sin carta_muerta)', () => {
    const ctx = crearCtx()
    const v = conVinculo(estadoMinimo(), 2, 'B')

    destruirCarta(v.s, ctx, v.id, 'ruptura')
    expect(ctx.events).toContainEqual({ type: 'destruccion', cardInstanceId: v.id, jugador: 'B', causa: 'ruptura' })
    expect(ctx.events.some((e) => e.type === 'carta_muerta')).toBe(false)
    expect(v.s.players.B.vinculos[2]).toBe(v.id) // permanece en su slot (L848)
    expect(v.s.instances[v.id].bocaArriba).toBe(true)
    expect(v.s.players.B.cementerio).toEqual([])
  })
})

describe('sexto Vínculo y derrota por vínculos (ADR-16)', () => {
  it('destruir el último Vínculo vivo: hook NO-OP resuelto (flag anti-bucle) ANTES de partida_terminada(ganador, motivo=vinculos)', () => {
    const ctx = crearCtx()
    const v = conVinculo(estadoMinimo(), 3, 'B') // B queda con 0 Vivos

    destruirCarta(v.s, ctx, v.id, 'ruptura')
    expect(ctx.events[ctx.events.length - 1]).toEqual({ type: 'partida_terminada', ganador: 'A', motivo: 'vinculos' })
    expect(v.s.fase).toBe('terminada')
    expect(v.s.ganador).toBe('A')
    expect(v.s.motivo).toBe('vinculos')
    expect(v.s.sextoVinculoResuelto).toBe(true)
  })

  it('destruir un Vínculo con Vivos restantes: NO derrota, NO activa el sexto Vínculo', () => {
    const ctx = crearCtx()
    const v1 = conVinculo(estadoMinimo(), 2, 'B')
    const v2 = conVinculo(v1.s, 4, 'B')

    destruirCarta(v2.s, ctx, v2.id, 'ruptura')
    expect(ctx.events.some((e) => e.type === 'partida_terminada')).toBe(false)
    expect(v2.s.sextoVinculoResuelto).toBeUndefined()
  })

  it('verificarDerrotaVinculos directo: dueño con 0 Vivos → partida_terminada(ganador=rival, motivo=vinculos)', () => {
    const ctx = crearCtx()
    const s: GameState = { ...estadoMinimo(), players: { ...estadoMinimo().players, B: { ...estadoMinimo().players.B, vinculos: [null, null, null, null, null, null] } } }

    verificarDerrotaVinculos(s, ctx, 'B')
    expect(ctx.events).toEqual([{ type: 'partida_terminada', ganador: 'A', motivo: 'vinculos' }])
    expect(s.fase).toBe('terminada')
    expect(s.ganador).toBe('A')
    expect(s.motivo).toBe('vinculos')
  })

  it('verificarDerrotaVinculos: dueño con ≥1 Vivo → sin derrota', () => {
    const ctx = crearCtx()
    const v = conVinculo(estadoMinimo(), 0, 'B')

    verificarDerrotaVinculos(v.s, ctx, 'B')
    expect(ctx.events).toEqual([])
    expect(v.s.fase).toBe('choque')
  })
})

// ═══════════════════════════════════════════════════════════════════
// prevent_destroy (Fase 2c) — checkpoint de elección data-driven
// Tests genéricos por tipo: sintético + FB-018 Rowena real.
// ═══════════════════════════════════════════════════════════════════

describe('prevent_destroy (Fase 2c) — checkpoint de elección data-driven', () => {
  const PREVENT = 'TEST-PREVENT'
  registrarCartas([{
    id: PREVENT,
    name: 'Prevent Test',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 3, poder: 3, resistencia: 6 },
    efectos: [{
      tipo: 'pasivo',
      efecto: 'prevent_destroy',
      trigger: 'cuando_vinculo_seria_destruido',
      objetivo: { tipo: 'vinculo', controlador: 'propio', zona: 'campo' },
      costo: { tipo: 'exile_self' },
      texto: 'Cuando un Vínculo que controles fuera a ser destruido, puedes enviar esta carta a tu exilio, previniendo la destrucción.',
    }],
  } as unknown as AnyCard])

  /** Vínculo vivo de `owner` + fuente PREVENT en campo de `owner` (si hay). */
  function conEscena(owner: PlayerId, conFuente: boolean): { s: GameState; fuenteId: string; victimId: string } {
    let s = estadoMinimo()
    const v = conVinculo(s, 0, owner)
    s = v.s
    let fuenteId = 'sin-fuente'
    if (conFuente) {
      const f = conCampeon(s, PREVENT, 0, owner)
      s = f.s
      fuenteId = f.id
    }
    return { s, fuenteId, victimId: v.id }
  }

  it('scan data-driven: FB-018 Rowena real es fuente elegible; Vaela no', () => {
    let s = estadoMinimo()
    const rowena = conCampeon(s, ROWENA, 0, 'A')
    expect(buscarFuentePreventDestroy(rowena.s, 'A')).toBe(rowena.id)
    expect(buscarFuentePreventDestroy(rowena.s, 'B')).toBeNull()

    let s2 = estadoMinimo()
    const vaela = conCampeon(s2, VAELA, 0, 'A')
    expect(buscarFuentePreventDestroy(vaela.s, 'A')).toBeNull()
  })

  it('con fuente en campo: destruirCarta DIFIERE la muerte (pending, sin destruccion)', () => {
    const { s, fuenteId, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    const destruida = destruirCarta(s, ctx, victimId, 'efecto')

    expect(destruida).toBe(false)
    expect(s.instances[victimId].destruccionPendiente).toBe(true)
    expect(s.instances[victimId].bocaArriba).toBeFalsy()
    expect(s.preventivosPendientes).toEqual([
      { jugador: 'A', fuenteId, victimId, causa: 'efecto' },
    ])
    expect(ctx.events).toContainEqual({
      type: 'prevenicion_pendiente', victimId, fuenteId, jugador: 'A', causa: 'efecto',
    })
    expect(ctx.events.filter((e) => e.type === 'destruccion')).toHaveLength(0)
  })

  it('responder prevenir=true: fuente al exilio, víctima viva, destruccion_prevenida', () => {
    const { s, fuenteId, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')

    ejecutarResponderPrevenicion(s, ctx, 'A', true)

    expect(s.preventivosPendientes).toEqual([])
    expect(s.players.A.exilio).toContain(fuenteId)
    expect(s.players.A.campo.campeones).not.toContain(fuenteId)
    expect(s.instances[victimId].destruccionPendiente).toBeUndefined()
    expect(s.instances[victimId].bocaArriba).toBeFalsy()
    expect(s.players.A.vinculos).toContain(victimId)
    expect(ctx.events).toContainEqual({ type: 'carta_exiliada', cardInstanceId: fuenteId, jugador: 'A' })
    expect(ctx.events).toContainEqual({
      type: 'destruccion_prevenida', cardInstanceId: victimId, jugador: 'A', causa: 'efecto',
    })
  })

  it('responder prevenir=false: la destrucción diferida se ejecuta ahora', () => {
    const { s, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')

    ejecutarResponderPrevenicion(s, ctx, 'A', false)

    expect(s.preventivosPendientes).toEqual([])
    expect(s.instances[victimId].bocaArriba).toBe(true)
    expect(s.instances[victimId].destruccionPendiente).toBeUndefined()
    expect(ctx.events).toContainEqual({
      type: 'destruccion', cardInstanceId: victimId, jugador: 'A', causa: 'efecto',
    })
  })

  it('sin fuente elegible: destrucción directa (sin pending)', () => {
    const { s, victimId } = conEscena('A', false)
    const ctx = crearCtx()
    const destruida = destruirCarta(s, ctx, victimId, 'combate')

    expect(destruida).toBe(true)
    expect(s.preventivosPendientes ?? []).toEqual([])
    expect(s.instances[victimId].bocaArriba).toBe(true)
  })

  it('prevenir=true pero la fuente ya no está en campo: se ejecuta la destrucción', () => {
    const { s, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')
    // Simular que la fuente murió/salió entre el pending y la respuesta
    const fuenteId = s.preventivosPendientes![0].fuenteId
    s.players.A.campo.campeones = s.players.A.campo.campeones.map((c) => (c === fuenteId ? null : c))

    ejecutarResponderPrevenicion(s, ctx, 'A', true)

    expect(s.instances[victimId].bocaArriba).toBe(true)
    expect(ctx.events).toContainEqual({
      type: 'destruccion', cardInstanceId: victimId, jugador: 'A', causa: 'efecto',
    })
  })

  it('prevenir el ÚLTIMO vínculo vivo evita la derrota por vínculos', () => {
    const { s, fuenteId, victimId } = conEscena('A', true) // UN solo vínculo vivo
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')
    ejecutarResponderPrevenicion(s, ctx, 'A', true)

    expect(s.fase).toBe('choque') // no terminó
    expect(s.ganador).toBeUndefined()
    expect(s.players.A.vinculos.filter((v) => v && !s.instances[v]?.bocaArriba)).toHaveLength(1)
    expect(s.players.A.exilio).toContain(fuenteId)
  })

  it('declinar el último vínculo vivo SÍ produce derrota por vínculos', () => {
    const { s, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')
    ejecutarResponderPrevenicion(s, ctx, 'A', false)

    expect(s.fase).toBe('terminada')
    expect(s.ganador).toBe('B')
    expect(s.motivo).toBe('vinculos')
  })

  it('checkpoint: getValidActions solo da responder_prevenicion al elegido; el resto queda congelado', () => {
    const { s, victimId } = conEscena('A', true)
    const ctx = crearCtx()
    destruirCarta(s, ctx, victimId, 'efecto')

    const accionesA = getValidActions(s, 'A')
    expect(accionesA).toEqual([
      { type: 'responder_prevenicion', prevenir: true },
      { type: 'responder_prevenicion', prevenir: false },
    ])
    expect(getValidActions(s, 'B')).toEqual([])

    // Otras acciones del elegido son rechazadas por el checkpoint
    const r = applyAction(s, { type: 'pasar_turno' } as Action, ctx)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('prevenicion')

    // validarResponderPrevenicion
    expect(validarResponderPrevenicion(s, 'A')).toBeNull()
    expect(validarResponderPrevenicion(s, 'B')).toContain('no es tu turno')
  })

  it('heurística del bot: prevenir solo si es el último vínculo vivo', () => {
    const { s: sUno } = conEscena('A', true) // 1 vínculo vivo → prevenir
    expect(elegirPrevenicion(sUno, 'A')).toBe(true)

    let s = estadoMinimo()
    const v0 = conVinculo(s, 0, 'A')
    const v1 = conVinculo(v0.s, 1, 'A')
    s = v1.s
    expect(elegirPrevenicion(s, 'A')).toBe(false) // 2 vínculos vivos → conservar fuente
  })
})
