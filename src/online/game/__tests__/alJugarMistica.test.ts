// @vitest-environment node
/**
 * F5d-3 — cableado de `al-jugar-mistica` (movimientos.ts: ejecutarJugarMistica y resolverEfectosArtefacto).
 * El trigger YA no se dispara al declarar: se APILA encima del opener (resuelve antes que el hechizo),
 * su dueño elige el objetivo antes de abrir la ventana (patrón F5d-1) y emite `trigger_apilado` UNA vez
 * al apilar (decisión 10a). Usa el set de prueba PR-xxx (helpers/cartasPrueba.ts) y la sintética
 * TEST-AVISO-DOBLE (Mística con trigger + hechizo sin trigger, ambos sobre Campeones propios, para
 * observar el ORDEN de resolución con los modificadores de un mismo objetivo).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual } from '../validActions'
import { cadenaActiva } from '../chain'
import { ordenResolucion } from '../triggers'
import { verificarInvariantes, verificarZonaUnica } from '../invariants'
import { etersParaPagar } from '../payments'
import { registrarCartas } from '../cards'
import { botTonto } from '../bot'
import type { AnyCard } from '../../../shared/types'
import type { Action } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  PR, CARTAS_PRUEBA, cargarCartasPrueba, crearCtx, crearPartidaPrueba, escenaVacia, aplicar, conMano, conEteres, conMazo,
  conCampeon, conMistica,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
  // Sintética: PR-045 (trigger al_jugar_mistica) + un hechizo SIN trigger sobre el mismo tipo de objetivo
  // (Campeón propio): los dos se distinguen por el valor de su modificador (-1 el trigger, -3 el hechizo).
  const aviso = CARTAS_PRUEBA.find((c) => c.id === PR.AVISO)! as unknown as { efectos: Array<Record<string, unknown>> }
  const base = aviso.efectos[0]
  const doble = {
    ...(CARTAS_PRUEBA.find((c) => c.id === PR.AVISO)!),
    id: 'TEST-AVISO-DOBLE',
    name: 'Aviso Doble de Prueba',
    efectos: [
      { ...base, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, stats: { ATQ: 1, RES: 0 }, texto: 'Al jugar esta Mística, un Campeón propio pierde 1 de ATQ, hasta el final del turno.' },
      { ...base, trigger: undefined, objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, stats: { ATQ: 3, RES: 0 }, texto: 'Un Campeón propio pierde 3 de ATQ, hasta el final del turno.' },
    ],
  }
  registrarCartas([doble] as unknown as AnyCard[])
})

/* ───────────────────────── Utilidades ───────────────────────── */

const pasar = { type: 'pasar_prioridad' } as const
const elegir = (objetivoId: string): Action => ({ type: 'elegir_objetivo', objetivoId })
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, pasar, ctx), pasar, ctx)
const valores = (s: GameState, id: string) => (s.instances[id].modificadores ?? []).map((m) => m.valor)
const triggersApiladosDe = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'trigger_apilado')

function escena(): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/** Juega una Mística de la mano de A con su pago; devuelve el estado tras la acción. */
function jugar(s0: GameState, ctx: Ctx, id: string, cardId: string): GameState {
  conMano(s0, 'A', id, cardId)
  const pago = conEteres(s0, 'A', 1)
  return aplicar(s0, { type: 'jugar_mistica', cardInstanceId: id, slot: 0, eterIds: pago }, ctx)
}

/* ───────────────────────── Objetivo y cadena ───────────────────────── */

describe('al-jugar-mistica se apila encima del opener', () => {
  it('PR-045: el DUEÑO elige el objetivo del trigger antes de abrir la ventana y el trigger queda en la cadena', () => {
    const s0 = escena()
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    conMistica(s0, 'B', 'bm', PR.AVISO, 0) // B puede responder: la ventana se abre
    const ctx = crearCtx()
    let s = jugar(s0, ctx, 'avi', PR.AVISO)
    // la ventana ESPERA: primero se elige el objetivo del trigger (declaración F5d-1)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener', pendientes: 1 })
    expect(s.declaracionEnEleccion!.triggers).toEqual([
      expect.objectContaining({ jugador: 'A', cardInstanceId: 'avi', trigger: 'al-jugar-mistica', efectoIdx: 0 }),
    ])
    expect(s.objetivosPendientes![0]).toMatchObject({ jugador: 'A', instId: 'avi', trigger: 'al-jugar-mistica', opener: { efectoIdx: 0 } })
    s = aplicar(s, elegir('b0'), ctx) // el dueño (A) elige
    const cadena = cadenaActiva(s)!
    expect(cadena.opener?.cardInstanceId).toBe('avi')
    expect(cadena.triggers).toEqual([expect.objectContaining({ cardInstanceId: 'avi', efectoIdx: 0, objetivoId: 'b0' })])
    expect(valores(s, 'b0')).toEqual([]) // nada ha resuelto todavía
    const r = cerrar(s, ctx)
    expect(valores(r, 'b0')).toEqual([-1]) // el trigger resuelve con el objetivo elegido
    expect(r.players.A.cementerio).toContain('avi') // la Mística de un solo uso va al Cementerio al resolver
    expect(verificarZonaUnica(r)).toEqual([])
  })

  it('evento trigger_apilado (decisión 10a): se emite UNA vez al apilar, sin objetivo, y no se re-emite al resolver', () => {
    const s0 = escena()
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMistica(s0, 'B', 'bm', PR.AVISO, 0) // la ventana se abre
    const ctx = crearCtx()
    let s = jugar(s0, ctx, 'avi', PR.AVISO)
    expect(triggersApiladosDe(ctx)).toEqual([
      { type: 'trigger_apilado', jugador: 'A', cardInstanceId: 'avi', trigger: 'al-jugar-mistica', efectoIdx: 0 },
    ])
    s = aplicar(s, elegir('b0'), ctx)
    expect(triggersApiladosDe(ctx)).toEqual([]) // elegir no vuelve a emitir
    const r = cerrar(s, ctx)
    expect(valores(r, 'b0')).toEqual([-1])
    // ctx.events es buffer de la ÚLTIMA acción (core.ts): la resolución no re-emite el trigger
    expect(triggersApiladosDe(ctx)).toEqual([])
    expect(verificarZonaUnica(r)).toEqual([])
  })

  it('rendirse durante la elección del trigger: lo decide quien se rinde', () => {
    const s0 = escena()
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const ctx = crearCtx()
    const s = jugar(s0, ctx, 'avi', PR.AVISO)
    expect(s.declaracionEnEleccion?.tipo).toBe('opener')
    expect(aplicar(s, { type: 'rendirse', jugador: 'A' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
    const s2 = jugar(escena(), crearCtx(), 'avi2', PR.AVISO)
    expect(aplicar(s2, { type: 'rendirse', jugador: 'B' }, crearCtx())).toMatchObject({ fase: 'terminada', ganador: 'A' })
  })
})

/* ───────────────────────── Orden de resolución ───────────────────────── */

describe('orden LIFO: respuestas → trigger → opener', () => {
  it('sin respondedores (gate cerrado) resuelve de inmediato y EN EL MISMO ORDEN: trigger antes que el hechizo', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = jugar(s0, ctx, 'avi2', 'TEST-AVISO-DOBLE')
    // elecciones de la acción: primero el hechizo del opener (efectoIdx 1), luego el trigger (efectoIdx 0)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener', pendientes: 2 })
    expect(s.objetivosPendientes!.map((p) => [p.instId, p.opener])).toEqual([
      ['avi2', { efectoIdx: 1 }],
      ['avi2', { efectoIdx: 0 }],
    ])
    s = aplicar(s, elegir('a0'), ctx) // hechizo del opener
    s = aplicar(s, elegir('a0'), ctx) // trigger
    expect(s.cadena).toBeUndefined() // gate cerrado: nadie respondió, resolvió ya
    // el trigger (-1) resolvió ANTES que el hechizo del opener (-3): el orden de los modificadores lo prueba
    expect(valores(s, 'a0')).toEqual([-1, -3])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('con ventana: respuesta arriba, trigger en medio, opener al final (mismo objetivo, orden de modificadores)', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
    conEteres(s0, 'B', 1) // la Presteza de B es respondible: la ventana se abre
    const ctx = crearCtx()
    let s = jugar(s0, ctx, 'avi2', 'TEST-AVISO-DOBLE')
    s = aplicar(s, elegir('a0'), ctx) // hechizo del opener
    s = aplicar(s, elegir('a0'), ctx) // trigger
    expect(cadenaActiva(s)!.opener?.cardInstanceId).toBe('avi2')
    expect(cadenaActiva(s)!.prioridad).toBe('B') // el rival responde primero
    expect(valores(s, 'a0')).toEqual([]) // nada resolvió todavía
    // B responde con la Presteza (elige su objetivo al responder) y ambos pasan
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s, 'B', PR.PRESTEZA_DEBIL)! }, ctx)
    s = aplicar(s, elegir('a0'), ctx)
    expect(ordenResolucion(cadenaActiva(s)!).map((p) => ('trigger' in p ? p.trigger.cardInstanceId : p.respuesta))).toEqual(['resp', 'avi2'])
    s = cerrar(s, ctx)
    // respuesta (-2), luego el trigger (-1), al final el hechizo del opener (-3)
    expect(valores(s, 'a0')).toEqual([-2, -1, -3])
    expect(s.players.A.cementerio).toContain('avi2') // el opener resuelve ÚLTIMO (va al Cementerio al final)
    expect(verificarZonaUnica(s)).toEqual([])
  })
})

/* ───────────────────────── Regla de la fuente ───────────────────────── */

describe('decisión 2: la fuente fuera del campo pierde el trigger', () => {
  it('la Mística sale del campo antes de resolver: el trigger se pierde sin efectos parciales', () => {
    const s0 = escena()
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMistica(s0, 'B', 'bm', PR.AVISO, 0) // la ventana se abre
    const ctx = crearCtx()
    let s = jugar(s0, ctx, 'avi', PR.AVISO)
    s = aplicar(s, elegir('b0'), ctx)
    expect(cadenaActiva(s)!.triggers).toHaveLength(1)
    // la fuente (el opener) sale del campo antes de que la cadena se resuelva
    const fuera = structuredClone(s)
    fuera.players.A.campo.misticasTacticas[0] = null
    fuera.players.A.cementerio.push('avi')
    const r = cerrar(fuera, ctx)
    expect(valores(r, 'b0')).toEqual([]) // el trigger se perdió (F5d-3: el opener ya NO salva a su fuente)
    expect(r.players.A.cementerio).toEqual(['avi']) // sin doble envío al Cementerio
    expect(verificarZonaUnica(r)).toEqual([])
  })
})

/* ───────────────────────── Simulaciones con el cableado real ───────────────────────── */

/** Juega una partida real con bots (mazos PR) y devuelve cuántos triggers apiló el cableado de producción. */
function simularConCableado(seed: number, maxIter = 700): { apilados: number; iteraciones: number } {
  const { state, ctx } = crearPartidaPrueba(seed)
  let s = state
  let apilados = 0
  let i = 0
  for (; i < maxIter && s.fase !== 'terminada'; i++) {
    const actor = actorActual(s)
    if (!actor) break
    const accion = botTonto(s, actor)
    if (!accion) throw new Error(`seed ${seed}: freeze en iteración ${i} (fase ${s.fase}, cadena ${!!s.cadena}, decl ${s.declaracionEnEleccion?.tipo})`)
    const r = applyAction(s, accion, ctx)
    if (!r.ok) throw new Error(`seed ${seed}: ${accion.type} falló: ${r.error}`)
    s = r.state
    apilados += triggersApiladosDe(ctx).length // ctx.events es buffer de la acción recién aplicada
    expect(verificarZonaUnica(s), `seed ${seed} iter ${i} (${accion.type})`).toEqual([])
    expect(s.profundidadTriggers, `seed ${seed} iter ${i}`).toBeUndefined()
    // F5d-3 es la ÚNICA fase cableada todavía: en producción solo al-jugar-mistica se apila
    for (const t of s.cadena?.triggers ?? []) expect(t.trigger, `seed ${seed} iter ${i}`).toBe('al-jugar-mistica')
    for (const t of s.declaracionEnEleccion?.triggers ?? []) expect(t.trigger, `seed ${seed} iter ${i}`).toBe('al-jugar-mistica')
    if (i % 25 === 0) expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  }
  expect(verificarInvariantes(s), `seed ${seed} final`).toEqual([])
  return { apilados, iteraciones: i }
}

describe('simulaciones con el cableado real (seeds del handoff)', () => {
  for (const seed of [66099, 66676, 1, 2, 3, 7, 42, 12345]) {
    it(`seed ${seed}: sin freeze, zona única por paso y solo triggers de al-jugar-mistica`, () => {
      const r = simularConCableado(seed)
      expect(r.iteraciones).toBeGreaterThan(20)
    })
  }

  it('el cableado se ejercita en alguna seed (la prueba no es vacía)', () => {
    const total = [66099, 66676, 1, 2, 3, 7, 42, 12345].reduce((n, seed) => n + simularConCableado(seed).apilados, 0)
    expect(total).toBeGreaterThan(0)
  })
})
