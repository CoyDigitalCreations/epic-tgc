// @vitest-environment node
/**
 * Gatillos de los Éteres «al pagar» (FB-002/003/004/006, DS-004/005/007) y de los de Reserva «al inicio del Choque» (DS-003),
 * con las cartas REALES y lo que dicen HOY. Sustituye a 10 tests de `eteres.test.ts` que eran `expect(true).toBe(true)`
 * (pasaban siempre) y cuyos títulos describían diseños viejos (p. ej. FB-002 «en reserva», cuando hoy es un Éter de pago).
 * DS-005 («para invocar… ese Campeón») usa el objetivo `invocado` y el contexto de pago `invocar`.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { aplicarPago } from '../payments'
import { keywordsDe, statsDe, purgarEfectosTemporales, purgarKeywordsTemporales } from '../efectos'
import { getCardMeta } from '../cards'
import { getValidActions } from '../validActions'
import type { Ctx, GameState } from '../types'
import { PR, aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

/** A paga con el Éter `cardId` (en su Reserva) por una carta cualquiera; devuelve el estado tras disparar los gatillos. */
function pagarCon(cardIdEter: string, preparar?: (s: GameState) => void): { s: GameState; ctx: Ctx; eter: string } {
  const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
  const [eter] = conEteres(s, 'A', 1, cardIdEter)
  preparar?.(s)
  const ctx = crearCtx()
  aplicarPago(s, ctx, 'A', [eter], PR.PEON, { tipo: 'jugar' })
  return { s, ctx, eter }
}
const elegir = (s: GameState, ctx: Ctx, objetivoId: string) => aplicar(s, { type: 'elegir_objetivo', objetivoId }, ctx)

describe('Éteres «Cuando pagues esta carta» (tipo pago)', () => {
  it('FB-003: roba 1 carta de tu mazo', () => {
    const { s } = pagarCon('FB-003')
    expect(s.players.A.mano).toHaveLength(1)
    expect(s.players.A.mazo).toHaveLength(3)
  })
  it('FB-004: un Campeón que controles gana 2 de RES hasta el final del turno', () => {
    const { s: s0, ctx } = pagarCon('FB-004', (e) => { conCampeon(e, 'A', 'c', PR.PEON, 0) })
    const base = statsDe(s0, 'c').resistencia
    const s = elegir(s0, ctx, 'c')
    expect(statsDe(s, 'c').resistencia).toBe(base + 2)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'c').resistencia).toBe(base)
  })
  it('FB-002: un Campeón que controles gana Vigor hasta el final del turno', () => {
    const { s: s0, ctx } = pagarCon('FB-002', (e) => { conCampeon(e, 'A', 'c', PR.PEON, 0) })
    expect(keywordsDe(s0, 'c')).not.toContain('Vigor')
    const s = elegir(s0, ctx, 'c')
    expect(keywordsDe(s, 'c')).toContain('Vigor')
    purgarKeywordsTemporales(s) // las keywords temporales no viven en `modificadores`: las limpia su propia purga del Ocaso
    expect(keywordsDe(s, 'c')).not.toContain('Vigor')
  })
  it('FB-006: devuelve 1 Éter (a tu elección) de la zona de pago a tu Reserva', () => {
    let previo = ''
    const { s: s0, ctx } = pagarCon('FB-006', (e) => {
      const [p] = conEteres(e, 'A', 1); previo = p
      e.players.A.eterReserva = e.players.A.eterReserva.filter((x) => x !== p); e.players.A.eterPagado.push(p) // ya pagado antes
    })
    expect(s0.objetivosPendientes?.[0].opciones).toContain(previo) // elige entre TODOS los pagados
    const s = elegir(s0, ctx, previo)
    expect(s.players.A.eterReserva).toEqual([previo])
    expect(s.players.A.eterPagado).toHaveLength(1) // queda solo el FB-006 recién pagado
  })
  it('DS-007: mueve 1 Éter (a elección) de la Reserva del rival a la zona de pago del rival', () => {
    const { s: s0, ctx } = pagarCon('DS-007', (e) => { conEteres(e, 'B', 2) })
    expect(s0.objetivosPendientes?.[0].opciones).toEqual(['eter-B-0', 'eter-B-1'])
    const s = elegir(s0, ctx, 'eter-B-1')
    expect(s.players.B.eterReserva).toEqual(['eter-B-0'])
    expect(s.players.B.eterPagado).toEqual(['eter-B-1'])
    expect(s.players.A.eterPagado).toHaveLength(1) // el suyo no se toca
  })
  it('DS-004: el rival pierde 1 carta de su mano al azar', () => {
    const { s } = pagarCon('DS-004', (e) => { conMano(e, 'B', 'm1', PR.PEON); conMano(e, 'B', 'm2', PR.PEON) })
    expect(s.players.B.mano).toHaveLength(1)
    expect(s.players.B.cementerio).toHaveLength(1)
  })
  it('sin Campeón propio al que dárselo, un gatillo de Campeón no hace nada (y no rompe)', () => {
    const { s } = pagarCon('FB-004')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.players.A.eterPagado).toHaveLength(1) // el pago sí se hizo
  })
  it('cross-facción: el gatillo dispara aunque el Éter sea de otra facción que la carta que se paga', () => {
    // FB-003 es de Orden y aquí se paga una carta de Caos (DS-011). Cada Éter aporta 1 sea cual sea su facción; DS-011 cuesta 2,
    // así que se pagan dos (el coste es exacto, sin sobrepago). El gatillo roba igual (uno por cada Éter con gatillo).
    const s = escenaVacia('forja'); conMazo(s, 'A', 4)
    const eteres = conEteres(s, 'A', 2, 'FB-003')
    aplicarPago(s, crearCtx(), 'A', eteres, 'DS-011', { tipo: 'jugar' })
    expect(s.players.A.eterPagado).toHaveLength(2) // el pago fue válido (si no, no habría gatillos)
    expect(s.players.A.mano).toHaveLength(2)
  })
})

describe('DS-005 «Cuando pagues esta carta para invocar un Campeón, ese Campeón gana 1 de ATQ hasta el final del próximo turno»', () => {
  // perezosos: las cartas de prueba se registran en el beforeAll, después de declarar el describe
  const costePeon = () => getCardMeta(PR.PEON)!.stats.cost
  const poderPeon = () => getCardMeta(PR.PEON)!.stats.poder

  /** A invoca al Peón `nuevo` pagando con el Éter DS-005 + los Éteres genéricos que falten; `otro` es un Campeón propio ya en el campo. */
  function invocarPagandoConDS005(): { s: GameState; ctx: Ctx } {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'otro', PR.PEON, 1)
    conMano(s, 'A', 'nuevo', PR.PEON)
    const [ds005] = conEteres(s, 'A', 1, 'DS-005')
    const resto = conEteres(s, 'A', costePeon() - 1)
    const ctx = crearCtx()
    return { s: aplicar(s, { type: 'jugar_campeon', cardInstanceId: 'nuevo', slot: 0, eterIds: [ds005, ...resto], sacrificios: [] }, ctx), ctx }
  }

  it('al INVOCAR, ESE Campeón gana 1 de ATQ (sin elegir) y lo conserva al entrar al campo; otro Campeón propio no', () => {
    const { s } = invocarPagandoConDS005()
    expect(s.players.A.campo.campeones[0]).toBe('nuevo') // la invocación se hizo
    expect(s.objetivosPendientes ?? []).toEqual([])      // no hay elección: el objetivo es implícito
    expect(statsDe(s, 'nuevo').poder).toBe(poderPeon() + 1)
    expect(statsDe(s, 'otro').poder).toBe(poderPeon())
  })
  it('dura «hasta el final del próximo turno»: sobrevive al primer Ocaso y se va en el segundo', () => {
    const { s } = invocarPagandoConDS005()
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'nuevo').poder).toBe(poderPeon() + 1)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'nuevo').poder).toBe(poderPeon())
  })
  it('al pagar para otra cosa (jugar una carta), NO dispara: ni elección ni bono', () => {
    const { s } = pagarCon('DS-005', (e) => { conCampeon(e, 'A', 'c', PR.PEON, 0) })
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(statsDe(s, 'c').poder).toBe(poderPeon())
  })
})

describe('DS-003 (Reserva) «Al inicio de tu Choque, si está en tu Reserva, un Campeón que controlas gana Carga hasta el final del turno»', () => {
  function alChoque(conCampeonPropio: boolean): { s: GameState; ctx: Ctx } {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conEteres(s, 'A', 1, 'DS-003')
    if (conCampeonPropio) conCampeon(s, 'A', 'c', PR.PEON, 0)
    const ctx = crearCtx()
    return { s: aplicar(s, getValidActions(s, 'A').find((a) => a.type === 'pasar_turno')!, ctx), ctx } // Forja → Choque
  }
  it('al empezar el Choque, un Campeón propio gana Carga; se va en el Ocaso', () => {
    const { s: s0, ctx } = alChoque(true)
    expect(s0.fase).toBe('choque')
    const s = elegir(s0, ctx, 'c')
    expect(keywordsDe(s, 'c')).toContain('Carga')
    purgarKeywordsTemporales(s)
    expect(keywordsDe(s, 'c')).not.toContain('Carga')
  })
  it('sin Campeón propio: no hace nada', () => {
    const { s } = alChoque(false)
    expect(s.fase).toBe('choque')
    expect(s.objetivosPendientes ?? []).toEqual([])
  })
})
