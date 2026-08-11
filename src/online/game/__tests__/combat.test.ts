// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// FB-011 Vaela 5/3 Carga · FB-015 Elena 5/4 Recarga · FB-016 Cassandra 3/5 (sin keywords) ·
// FB-014 Isolde 3/7 Protector · FB-018 Rowena 3/6 (sin keywords)
const VAELA = 'FB-011' // Carga 5/3
const ELENA = 'FB-015' // Recarga 5/4
const CASSANDRA = 'FB-016' // sin keywords 3/5
const ISOLDE = 'FB-014' // Protector 3/7
const ROWENA = 'FB-018' // sin keywords 3/6

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
    primerTurno: false, // el primer turno NO ataca (§8.6); los tests lo apagan salvo el explícito
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

interface OpcionesCampeon {
  owner?: PlayerId
  agotado?: boolean
  /** Invocado/colocado este turno (invocación cansada, L1090; activación diferida §5.5). */
  entradaEsteTurno?: boolean
  keywords?: string[]
  poder?: number
  resistencia?: number
  eterBloqueado?: string[]
}

/** Campeón de `owner` en el campo (slot dado, 2B-2F). Devuelve el estado y el id. */
function conCampeon(s: GameState, cardId: string, slot: number, opts: OpcionesCampeon = {}): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}`
  const inst: Record<string, unknown> = {
    cardInstanceId: id,
    cardId,
    owner: opts.owner ?? 'A',
  }
  if (opts.agotado !== undefined) inst.agotado = opts.agotado
  if (opts.entradaEsteTurno !== undefined) inst.entradaEsteTurno = opts.entradaEsteTurno
  if (opts.keywords !== undefined) inst.keywords = opts.keywords
  if (opts.poder !== undefined) inst.poder = opts.poder
  if (opts.resistencia !== undefined) inst.resistencia = opts.resistencia
  if (opts.eterBloqueado !== undefined) inst.eterBloqueado = opts.eterBloqueado
  const owner = opts.owner ?? 'A'
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

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

const tiposDe = (s: GameState, p: PlayerId): string[] => getValidActions(s, p).map((a) => a.type)

describe('sub-máquina de combate en Choque (9.1, ADR-11)', () => {
  it('combate vacío: pasar_turno es válida, sin eventos de combate, y avanza a Ocaso', () => {
    const ctx = crearCtx()
    const s = estadoMinimo()
    expect(tiposDe(s, 'A')).toContain('pasar_turno')
    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(true)
    expect(r.state.fase).toBe('ocaso')
    expect(r.events.some((e) => e.type === 'ataque_declarado' || e.type === 'bloqueo_declarado')).toBe(false)
  })

  it('el combate se crea con la PRIMERA declarar_ataque (paso bloqueo, ADR-11)', () => {
    const ctx = crearCtx()
    const c0 = conCampeon(estadoMinimo(), VAELA, 0)
    const c1 = conCampeon(c0.s, ROWENA, 1)
    // B con un enderezado evita el auto-avance (9.3): el paso queda en bloqueo
    const conDef = conCampeon(c1.s, ISOLDE, 0, { owner: 'B' })
    const s = aplicar(conDef.s, { type: 'declarar_ataque', atacanteIds: [c0.id, c1.id] }, ctx)

    expect(s.combate?.paso).toBe('bloqueo')
    expect(s.combate?.atacantes).toEqual([c0.id, c1.id])
    expect(s.combate?.bloqueos).toEqual({})
    expect(s.combate?.rupturaDisponible).toBe(true)
    expect(s.combate?.rupturaUsadaEsteTurno).toBe(false)
    expect(ctx.events).toEqual([
      { type: 'ataque_declarado', jugador: 'A', atacanteIds: [c0.id, c1.id] },
    ])
  })

  it('pasar_turno queda GATED mientras el combate está pendiente (no en getValidActions)', () => {
    const ctx = crearCtx()
    const c0 = conCampeon(estadoMinimo(), VAELA, 0)
    // B con un enderezado: el combate queda en paso bloqueo (resolución pendiente)
    const conDef = conCampeon(c0.s, ISOLDE, 0, { owner: 'B' })
    const s = aplicar(conDef.s, { type: 'declarar_ataque', atacanteIds: [c0.id] }, ctx)

    expect(tiposDe(s, 'A')).not.toContain('pasar_turno')
    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(false)
  })

  it('el combate se limpia (undefined) al salir de Choque hacia Ocaso (limpieza defensiva)', () => {
    // Paso 'resolución' alcanzado sin bloqueadores: el combate no bloquea el pase
    const ctx = crearCtx()
    const c0 = conCampeon(estadoMinimo(), VAELA, 0)
    const s = aplicar(c0.s, { type: 'declarar_ataque', atacanteIds: [c0.id] }, ctx)
    expect(s.combate?.paso).toBe('resolucion') // B sin enderezados → auto-avance (9.3)

    const r = applyAction(s, { type: 'pasar_turno' }, ctx)
    expect(r.ok).toBe(true)
    expect(r.state.fase).toBe('ocaso')
    expect(r.state.combate).toBeUndefined()
  })
})

describe('declarar_ataque (9.2)', () => {
  it('múltiple: agota AL DECLARAR, emite ataque_declarado con todos los ids y el defensor es el rival', () => {
    const ctx = crearCtx()
    const c0 = conCampeon(estadoMinimo(), VAELA, 0)
    const c1 = conCampeon(c0.s, ROWENA, 1)
    const s = aplicar(c1.s, { type: 'declarar_ataque', atacanteIds: [c0.id, c1.id] }, ctx)

    expect(s.instances[c0.id].agotado).toBe(true)
    expect(s.instances[c1.id].agotado).toBe(true)
    const e = ctx.events.find((ev) => ev.type === 'ataque_declarado')
    expect(e).toEqual({ type: 'ataque_declarado', jugador: 'A', atacanteIds: [c0.id, c1.id] })
  })

  it('rechaza atacantes que no son del jugador activo (B ataca durante el turno de A)', () => {
    const ctx = crearCtx()
    const cB = conCampeon(estadoMinimo(), VAELA, 0, { owner: 'B' })
    const r = applyAction(cB.s, { type: 'declarar_ataque', atacanteIds: [cB.id] }, ctx)
    expect(r.ok).toBe(false)
  })

  it('primerTurno: nadie ataca en su primer turno (§8.6) — la acción no está en getValidActions', () => {
    const ctx = crearCtx()
    const c0 = conCampeon({ ...estadoMinimo(), primerTurno: true }, VAELA, 0)
    expect(tiposDe(c0.s, 'A')).not.toContain('declarar_ataque')
    expect(applyAction(c0.s, { type: 'declarar_ataque', atacanteIds: [c0.id] }, ctx).ok).toBe(false)
  })

  it('invocación cansada (agotado este turno) NO ataca; con keyword Carga SÍ (L1090/L1207)', () => {
    const ctx = crearCtx()
    // Cassandra invocada este turno sin Carga: no hay ningún elegible → sin declarar_ataque
    const cansada = conCampeon(estadoMinimo(), CASSANDRA, 0, { agotado: true, entradaEsteTurno: true })
    expect(tiposDe(cansada.s, 'A')).not.toContain('declarar_ataque')
    expect(applyAction(cansada.s, { type: 'declarar_ataque', atacanteIds: [cansada.id] }, ctx).ok).toBe(false)

    // Vaela (Carga) invocada este turno SÍ es elegible y puede atacar
    const carga = conCampeon(estadoMinimo(), VAELA, 0, { agotado: true, entradaEsteTurno: true })
    expect(tiposDe(carga.s, 'A')).toContain('declarar_ataque')
    const s = aplicar(carga.s, { type: 'declarar_ataque', atacanteIds: [carga.id] }, ctx)
    expect(s.instances[carga.id].agotado).toBe(true)
  })

  it('Vigor: el atacante NO se agota al declarar (L1208)', () => {
    const ctx = crearCtx()
    // Override aditivo: no existe carta Vigor en paquetes.ts (data sin la keyword)
    const vigor = conCampeon(estadoMinimo(), VAELA, 0, { keywords: ['Vigor'] })
    const s = aplicar(vigor.s, { type: 'declarar_ataque', atacanteIds: [vigor.id] }, ctx)

    expect(s.instances[vigor.id].agotado).toBeUndefined()
    expect(s.combate?.atacantes).toEqual([vigor.id])
  })

  it('Recarga: al atacar, 1 Éter bloqueado del atacante vuelve a la Reserva 2A (L1211, eter_reagrupado)', () => {
    const ctx = crearCtx()
    const conEter = conCampeon(estadoMinimo(), ELENA, 0, { eterBloqueado: ['et1'] })
    const s = aplicar(conEter.s, { type: 'declarar_ataque', atacanteIds: [conEter.id] }, ctx)

    expect(s.instances[conEter.id].eterBloqueado).toEqual([])
    expect(s.players.A.eterReserva).toContain('et1')
    expect(ctx.events).toContainEqual({ type: 'eter_reagrupado', jugador: 'A', eterIds: ['et1'] })
  })
})

describe('declarar_bloqueo (9.3, forzoso)', () => {
  /**
   * A declara ataques (slots 0..n). `defensa` (opcional) coloca campeones de B
   * ANTES de declarar: con un enderezado en mesa el paso queda en 'bloqueo'
   * (sin él, el auto-avance 9.3 salta a 'resolucion' y no hay bloqueo posible).
   * El id de cada campeón es determinista: `c-${cardId}-${slot}` (conCampeon).
   */
  function conAtaque(ids: string[], defensa?: (s: GameState) => GameState): { s: GameState; atacantes: string[]; ctx: Ctx } {
    const ctx = crearCtx()
    let s = estadoMinimo()
    const idsAtacantes: string[] = []
    ids.forEach((cardId, slot) => {
      const c = conCampeon(s, cardId, slot)
      s = c.s
      idsAtacantes.push(c.id)
    })
    if (defensa) s = defensa(s)
    const r = applyAction(s, { type: 'declarar_ataque', atacanteIds: idsAtacantes }, ctx)
    if (!r.ok) throw new Error(`declarar_ataque falló: ${r.error}`)
    return { s: r.state, atacantes: idsAtacantes, ctx }
  }

  it('ej.2: con 1 bloqueador disponible no se puede dejar el ataque sin bloquear (forzoso)', () => {
    // Isolde (B) en mesa ANTES de declarar: el paso queda en bloqueo (9.3)
    const { s, atacantes, ctx } = conAtaque([VAELA], (st) => conCampeon(st, ISOLDE, 0, { owner: 'B' }).s)
    const defensor = `c-${ISOLDE}-0`

    // el DEFENSOR (B) es el actor en paso bloqueo
    const bloqueos = getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')
    expect(bloqueos).toHaveLength(1)
    if (bloqueos[0]?.type === 'declarar_bloqueo') {
      expect(bloqueos[0].asignaciones).toEqual({ [atacantes[0]]: defensor })
    }
    // no hay variante "no bloquear": la única acción asigna al único disponible
    const r = aplicar(s, bloqueos[0] as Action, ctx)
    expect(r.combate?.bloqueos).toEqual({ [atacantes[0]]: defensor })
  })

  it('ej.6: 3 atacantes y 1 bloqueador → k = mín(1,3) = 1; 2 ataques quedan sin bloquear', () => {
    const { s, atacantes, ctx } = conAtaque([VAELA, ROWENA, CASSANDRA], (st) => conCampeon(st, ISOLDE, 0, { owner: 'B' }).s)
    const defensor = `c-${ISOLDE}-0`

    const bloqueos = getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')
    expect(bloqueos).toHaveLength(1)
    if (bloqueos[0]?.type === 'declarar_bloqueo') {
      expect(Object.keys(bloqueos[0].asignaciones)).toHaveLength(1)
      expect(bloqueos[0].asignaciones[atacantes[0]]).toBe(defensor)
    }
    const r = aplicar(s, bloqueos[0] as Action, ctx)
    expect(Object.keys(r.combate?.bloqueos ?? {})).toHaveLength(1)
    expect(r.combate?.rupturaDisponible).toBe(true) // 2 sin bloquear
  })

  it('bloquear NO agota al bloqueador (L1098)', () => {
    const { s, atacantes, ctx } = conAtaque([VAELA], (st) => conCampeon(st, ISOLDE, 0, { owner: 'B' }).s)
    const defensor = `c-${ISOLDE}-0`
    const bloqueos = getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')
    const r = aplicar(s, bloqueos[0] as Action, ctx)
    expect(r.instances[defensor].agotado).toBeUndefined()
    expect(Object.keys(r.combate?.bloqueos ?? {})).toContain(atacantes[0])
  })

  it('no elegibles: bloqueador agotado o ya asignado no entra en la asignación forzada', () => {
    // B con 2 campeones ANTES de declarar: agotado (no disponible) + enderezado.
    // A usa Cassandra en slot 1 (no Rowena) para no colisionar ids con B (2B-2F).
    const { s, atacantes, ctx } = conAtaque([VAELA, CASSANDRA], (st) => {
      const agotado = conCampeon(st, ISOLDE, 0, { owner: 'B', agotado: true })
      return conCampeon(agotado.s, ROWENA, 1, { owner: 'B' }).s
    })
    const listo = `c-${ROWENA}-1`

    const bloqueos = getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')
    expect(bloqueos).toHaveLength(1)
    if (bloqueos[0]?.type === 'declarar_bloqueo') {
      // solo el enderezado puede bloquear; k = mín(1, 2) = 1 → un solo par
      expect(Object.values(bloqueos[0].asignaciones)).toEqual([listo])
    }
    const r = aplicar(s, bloqueos[0] as Action, ctx)
    expect(Object.keys(r.combate?.bloqueos ?? {})).toHaveLength(1)
  })

  it('0 bloqueadores disponibles → auto-avance a resolución SIN evento bloqueo_declarado', () => {
    const ctx = crearCtx()
    const c0 = conCampeon(estadoMinimo(), VAELA, 0)
    const r = applyAction(c0.s, { type: 'declarar_ataque', atacanteIds: [c0.id] }, ctx)
    expect(r.ok).toBe(true)
    expect(r.state.combate?.paso).toBe('resolucion')
    expect(r.events.some((e) => e.type === 'bloqueo_declarado')).toBe(false)
  })

  it('rechaza asignar un bloqueador agotado o un atacante inexistente', () => {
    // B: 1 enderezado (evita el auto-avance) + 1 agotado (el que se intenta asignar)
    const { s, atacantes } = conAtaque([VAELA, CASSANDRA], (st) => {
      const listo = conCampeon(st, ISOLDE, 0, { owner: 'B' })
      return conCampeon(listo.s, ROWENA, 1, { owner: 'B', agotado: true }).s
    })
    const agotadoId = `c-${ROWENA}-1`
    const ctx = crearCtx()
    expect(
      applyAction(s, { type: 'declarar_bloqueo', asignaciones: { [atacantes[0]]: agotadoId } }, ctx).ok,
    ).toBe(false)
    expect(
      applyAction(s, { type: 'declarar_bloqueo', asignaciones: { 'no-existe': agotadoId } }, ctx).ok,
    ).toBe(false)
  })
})
