// @vitest-environment node
/**
 * §5.3: una Mística resuelve su efecto y va al Cementerio, «salvo que su propio efecto indique que va al Exilio».
 * Ese efecto es `exile` sobre la propia carta (objetivo `self`): funciona jugada desde la mano como Mística normal
 * (resuelve desde su slot) y como RESPUESTA desde la mano (resuelve fuera de toda zona, en la pila).
 * Cartas SINTÉTICAS («Dummy») sobre el set de prueba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { etersParaPagar } from '../payments'
import type { AnyCard } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'
import {
  PR, cargarCartasPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
} from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
/** Mística de un solo uso: roba 1 y luego se exilia a sí misma. */
const mistica = (id: string, keywords: string[], extra: Record<string, unknown> = {}): AnyCard =>
  ({
    ...base, id, name: id, type: 'Mística', keywords, facciones: ['Mutación'], stats: { cost: 1 },
    efectos: [
      { tipo: 'hechizo', efecto: 'draw', cantidad: 1, objetivo: { tipo: 'self' } },
      { tipo: 'hechizo', efecto: 'exile', objetivo: { tipo: 'self' } },
    ],
    ...extra,
  }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    mistica('T-EXI', []),
    mistica('T-EXI-RESP', ['Presteza']),
    mistica('T-EXI-INEX', ['Inexiliable']),
    // control: igual pero SIN el efecto de exilio
    mistica('T-NORMAL', [], { efectos: [{ tipo: 'hechizo', efecto: 'draw', cantidad: 1, objetivo: { tipo: 'self' } }] }),
  ])
})

const pagoDe = (s: GameState, j: PlayerId, cardId: string) => etersParaPagar(s, j, cardId)!
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const eventos = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)

function base0(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A'); conMazo(s, 'B'); return s
}
/** A juega `cardId` desde la mano (sin respuesta posible: B sin Éter ni cartas). */
function jugarMistica(cardId: string): { s: GameState; ctx: Ctx } {
  const s0 = base0()
  conMano(s0, 'A', 'm', cardId)
  const pago = conEteres(s0, 'A', 1)
  const ctx = crearCtx()
  const s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'm', slot: 0, eterIds: pago }, ctx)
  return { s, ctx }
}

describe('Mística que va al Exilio tras resolver (jugada normal)', () => {
  it('control: sin el efecto de exilio va al Cementerio', () => {
    const { s } = jugarMistica('T-NORMAL')
    expect(s.players.A.cementerio).toContain('m')
    expect(s.players.A.exilio).not.toContain('m')
  })
  it('con el efecto de exilio: resuelve sus otros efectos, libera el slot y se queda en el Exilio (no en el Cementerio)', () => {
    const { s, ctx } = jugarMistica('T-EXI')
    expect(s.players.A.exilio).toContain('m')
    expect(s.players.A.cementerio).not.toContain('m')
    expect(s.players.A.campo.misticasTacticas[0]).toBeNull()
    expect(eventos(ctx, 'carta_robada')).toHaveLength(1) // el robo anterior al exilio sí ocurrió
    expect(eventos(ctx, 'carta_exiliada')).toHaveLength(1)
  })
  it('INEXILIABLE: la carta no se exilia y va al Cementerio como cualquier Mística', () => {
    const { s, ctx } = jugarMistica('T-EXI-INEX')
    expect(s.players.A.exilio).not.toContain('m')
    expect(s.players.A.cementerio).toContain('m')
    expect(eventos(ctx, 'exilio_prevenido')).toHaveLength(1)
  })
})

/** A juega Rayo sobre b0; B responde desde la mano con `cardId` (Presteza). */
function responderDesdeMano(cardId: string): { s: GameState; ctx: Ctx } {
  const s0 = base0()
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conMano(s0, 'B', 'resp', cardId)
  conEteres(s0, 'B', 1)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
  s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: pagoDe(s, 'B', cardId) }, ctx)
  return { s: cerrar(s, ctx), ctx }
}

describe('Mística que va al Exilio tras resolver (respondida desde la mano)', () => {
  it('se queda en el Exilio, una sola vez, y no pasa por el Cementerio', () => {
    const { s, ctx } = responderDesdeMano('T-EXI-RESP')
    expect(s.players.B.exilio).toEqual(['resp'])
    expect(s.players.B.cementerio).not.toContain('resp')
    expect(eventos(ctx, 'carta_exiliada').filter((e) => 'cardInstanceId' in e && e.cardInstanceId === 'resp')).toHaveLength(1)
  })
})
