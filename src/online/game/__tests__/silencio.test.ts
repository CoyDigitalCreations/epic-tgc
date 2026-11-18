// @vitest-environment node
/**
 * Silencio (set estándar) — Arcana que se CARGA de Éter y lo gasta para negar Místicas del rival.
 *
 *  «Puedes bloquear hasta un máximo de 3 Éter (Max. 3) sobre esta carta. Una vez por turno, cuando el rival juegue una Mística,
 *   devuelve 1 Éter bloqueado de esta carta a tu Reserva, niega la activación de su efecto. Cuando esta carta no tenga Éter
 *   bloqueado, envíala al Cementerio.»
 *
 * Mecánica nueva que ejercita: coste `libera_eter_propio` (cantidad = capacidad de carga; cada uso libera 1 a la Reserva), la
 * negación de la Mística que dispara el observador (aún no es opener cuando corre el trigger) y «sin Éter → Cementerio».
 * La carta es un fixture con el mismo JSON que tendrá la del seed.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { getCardMeta, registrarCartas } from '../cards'
import { statsDe } from '../efectos'
import { getValidActions } from '../validActions'
import { generateEffectText } from '../../../forge/components/EffectList'
import { validateCard } from '../../../forge/utils/validation'
import type { AnyCard, EfectoData } from '../../../shared/types'
import type { Ctx, GameState } from '../types'
import { aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia, PR } from './helpers/cartasPrueba'

const SILENCIO = 'TEST-SILENCIO'

const CARTA_SILENCIO = {
  id: SILENCIO,
  name: 'Silencio (fixture)',
  type: 'Arcana',
  rarity: 'Rara',
  keywords: [],
  flavorText: '',
  paqueteId: 'test',
  limiteCopias: '2',
  createdAt: '2026-11-17T00:00:00.000Z',
  updatedAt: '2026-11-17T00:00:00.000Z',
  stats: { cost: 3 },
  efectos: [
    {
      tipo: 'hechizo',
      trigger: 'cuando_juegas_mistica',
      controladorTrigger: 'rival',
      costo: { tipo: 'libera_eter_propio', cantidad: 3 },
      activacion: 'una_por_turno',
      efecto: 'negar',
      tipoNegacion: 'activacion',
      objetivo: { tipo: 'campeon_del_trigger', controlador: 'rival', zona: 'campo' },
      texto: 'Puedes bloquear hasta un máximo de 3 Éter (Max. 3) sobre esta carta. Una vez por turno, cuando el rival juegue una Mística, devuelve 1 Éter bloqueado de esta carta a tu Reserva, niega la activación de su efecto. Cuando esta carta no tenga Éter bloqueado, envíala al Cementerio.',
    },
  ],
} as unknown as AnyCard

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([CARTA_SILENCIO])
})

/** A tiene Silencio en juego y `n` Éter en la Reserva; B tiene una Mística (Fugaz: +2 ATQ a un Campeón propio) y su Campeón. */
function escena(n = 4): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A', 6); conMazo(s, 'B', 6)
  conArcana(s, 'A', 'sil', SILENCIO, 0, { bocaArriba: false })
  conEteres(s, 'A', n)
  conCampeon(s, 'B', 'b0', PR.PEON, 0)
  conMano(s, 'B', 'fug', PR.FUGAZ)
  conMano(s, 'B', 'fug2', PR.FUGAZ)
  conEteres(s, 'B', 2)
  return s
}

/** Carga `n` Éter en Silencio con la acción de siempre (bloquear_eter), turno de A. */
function cargar(s: GameState, ctx: Ctx, n: number): GameState {
  let est = s
  for (let i = 0; i < n; i++) {
    const a = getValidActions(est, 'A').find((x) => x.type === 'bloquear_eter' && x.targetInstanceId === 'sil')
    expect(a, `bloqueo #${i + 1} ofrecido`).toBeDefined()
    est = aplicar(est, a!, ctx)
  }
  return est
}

/** Turno del rival: juega Fugaz sobre su Campeón (elige el objetivo) y devuelve el estado resultante. */
function rivalJuegaMistica(s: GameState, ctx: Ctx, carta = 'fug'): GameState {
  const est = structuredClone(s)
  est.turno = 'B'
  const pago = est.players.B.eterReserva.slice(0, 1)
  let r = aplicar(est, { type: 'jugar_mistica', cardInstanceId: carta, slot: carta === 'fug' ? 0 : 1, eterIds: pago } as never, ctx)
  if (r.declaracionEnEleccion || r.objetivosPendientes?.length) r = aplicar(r, { type: 'elegir_objetivo', objetivoId: 'b0' } as never, ctx)
  return r
}

describe('Silencio: el texto de efecto lo genera el Card-Maker (regenerar:textos)', () => {
  it('generateEffectText reproduce la redacción aprobada', () => {
    const efecto = (CARTA_SILENCIO as unknown as { efectos: EfectoData[] }).efectos[0]
    expect(generateEffectText(efecto)).toBe(efecto.texto)
  })

  it('validateCard acepta la carta (el Card-Maker la deja guardar)', () => {
    expect(validateCard(CARTA_SILENCIO).filter((e) => e.field === 'efectos')).toEqual([])
  })
})

describe('Silencio: la carta real del seed (ST-030) es la que prueban estos escenarios', () => {
  it('mismo efecto, coste, rareza y tope de copias que el fixture', () => {
    const real = getCardMeta('ST-030') as unknown as { type: string; rarity: string; limiteCopias: string; stats: { cost: number }; efectos: EfectoData[] }
    const fixture = CARTA_SILENCIO as unknown as typeof real
    expect(real.type).toBe(fixture.type)
    expect(real.rarity).toBe(fixture.rarity)
    expect(real.limiteCopias).toBe(fixture.limiteCopias)
    expect(real.stats.cost).toBe(fixture.stats.cost)
    expect(real.efectos).toEqual(fixture.efectos)
  })
})

describe('Silencio: carga de Éter (hasta 3)', () => {
  it('se ofrece bloquear Éter sobre la carta y el tope es 3', () => {
    const ctx = crearCtx()
    const s = cargar(escena(5), ctx, 3)
    expect(s.instances.sil.eterBloqueado).toHaveLength(3)
    expect(getValidActions(s, 'A').some((x) => x.type === 'bloquear_eter' && x.targetInstanceId === 'sil')).toBe(false)
  })
})

describe('Silencio: negación de la Mística del rival', () => {
  it('niega la Mística (su efecto no ocurre), devuelve 1 Éter a la Reserva y el pago del rival no se reembolsa', () => {
    const ctx = crearCtx()
    const s0 = cargar(escena(4), ctx, 2)
    const reservaAntes = s0.players.A.eterReserva.length
    const r = rivalJuegaMistica(s0, ctx)
    expect(statsDe(r, 'b0').poder).toBe(2) // Fugaz (+2 ATQ) negada: sigue en 2
    expect(r.instances.sil.eterBloqueado).toHaveLength(1)
    expect(r.players.A.eterReserva.length).toBe(reservaAntes + 1)
    expect(r.players.B.eterPagado.length).toBe(1) // el pago no se devuelve
    expect(r.players.B.cementerio).toContain('fug') // la Mística se consume igual
  })

  it('una vez por turno: la segunda Mística del mismo turno resuelve normal', () => {
    const ctx = crearCtx()
    const s0 = cargar(escena(4), ctx, 3)
    let r = rivalJuegaMistica(s0, ctx, 'fug')
    expect(statsDe(r, 'b0').poder).toBe(2)
    r = rivalJuegaMistica(r, ctx, 'fug2')
    expect(statsDe(r, 'b0').poder).toBe(4) // la segunda no se niega
    expect(r.instances.sil.eterBloqueado).toHaveLength(2)
  })

  it('sin Éter bloqueado no niega nada', () => {
    const ctx = crearCtx()
    const r = rivalJuegaMistica(escena(4), ctx)
    expect(statsDe(r, 'b0').poder).toBe(4)
  })

  it('no reacciona a las Místicas de su propio dueño', () => {
    const ctx = crearCtx()
    const s0 = cargar(escena(4), ctx, 2)
    conMano(s0, 'A', 'propia', PR.FUGAZ)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const pago = s0.players.A.eterReserva.slice(0, 1)
    let r = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'propia', slot: 0, eterIds: pago } as never, ctx)
    if (r.declaracionEnEleccion || r.objetivosPendientes?.length) r = aplicar(r, { type: 'elegir_objetivo', objetivoId: 'a0' } as never, ctx)
    expect(statsDe(r, 'a0').poder).toBe(4)
    expect(r.instances.sil.eterBloqueado).toHaveLength(2)
  })
})

describe('Silencio: sin Éter bloqueado va al Cementerio', () => {
  it('al gastar el último Éter, Silencio se envía al Cementerio', () => {
    const ctx = crearCtx()
    const s0 = cargar(escena(4), ctx, 1)
    const r = rivalJuegaMistica(s0, ctx)
    expect(statsDe(r, 'b0').poder).toBe(2)
    expect(r.players.A.cementerio).toContain('sil')
    expect(r.players.A.campo.arcanasCombate[0]).toBeNull()
  })
})

// applyAction se importa para que el fixture falle en alto si el motor rechaza una acción inesperada
void applyAction
