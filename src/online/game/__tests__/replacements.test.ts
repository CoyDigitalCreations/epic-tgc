// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { destruirCarta, reemplazosRegistrados, verificarDerrotaVinculos } from '../replacements'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// FB-011 Vaela 5/3 (sin keywords anti-destrucción) · FB-025 Primer Juramento (Vínculo Orden)
const VAELA = 'FB-011'
const VINCULO = 'FB-025'

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

  it('registro de reemplazos VACÍO y consultable (ni Rowena FB-018 ni Último Refugio registrados)', () => {
    expect(reemplazosRegistrados()).toEqual([])
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
