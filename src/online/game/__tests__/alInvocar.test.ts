// @vitest-environment node
/**
 * F5d-4 — cableado de `al-invocar` (movimientos.ts: ejecutarJugarCampeon).
 * El trigger YA no se dispara al invocar: se APILA. La invocación no tiene opener propio, así que la ventana
 * (declaración tipo 'invocacion', con Presteza de mano pagable en el gate) existe por sus triggers. Su dueño
 * elige el objetivo antes de abrirla (patrón F5d-1) y `trigger_apilado` se emite UNA vez al apilar (decisión 10a).
 * Usa el set de prueba PR-xxx (helpers/cartasPrueba.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual } from '../validActions'
import { cadenaActiva } from '../chain'
import { verificarInvariantes, verificarZonaUnica } from '../invariants'
import { etersParaPagar } from '../payments'
import { botTonto } from '../bot'
import type { Action } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  PR, cargarCartasPrueba, crearCtx, crearPartidaPrueba, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
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

/** A invoca `cardId` (id 'her') en `slot` pagando `coste` Éter exactos; devuelve el estado tras la acción. */
function invocar(s0: GameState, ctx: Ctx, cardId: string, slot = 0, coste = 2): GameState {
  conMano(s0, 'A', 'her', cardId)
  const pago = conEteres(s0, 'A', coste)
  return aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'her', slot, eterIds: pago, sacrificios: [] }, ctx)
}

/** Dos Peones rivales y una Presteza de mano pagable de B: la ventana SÍ se abre. */
function conRival(s: GameState): void {
  conCampeon(s, 'B', 'b0', PR.PEON, 0)
  conCampeon(s, 'B', 'b1', PR.PEON, 1)
  conMano(s, 'B', 'pre', PR.PRESTEZA_ROBA)
  conEteres(s, 'B', 1)
}

/* ───────────────────────── Objetivo y cadena ───────────────────────── */

describe('al-invocar se apila: la ventana existe por el trigger (sin opener)', () => {
  it('PR-013: el DUEÑO elige el objetivo antes de abrir la ventana; el debuff cae al RESOLVER', () => {
    const s0 = escena()
    conRival(s0)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    // la ventana ESPERA: primero se elige el objetivo del trigger (declaración F5d-1)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'invocacion', cardInstanceId: 'her', pendientes: 1 })
    expect(s.declaracionEnEleccion!.triggers).toEqual([
      expect.objectContaining({ jugador: 'A', cardInstanceId: 'her', trigger: 'al-invocar', efectoIdx: 0 }),
    ])
    expect(s.objetivosPendientes![0]).toMatchObject({ jugador: 'A', instId: 'her', trigger: 'al-invocar', opener: { efectoIdx: 0 } })

    s = aplicar(s, elegir('b1'), ctx)
    const cadena = cadenaActiva(s)!
    expect(cadena).toMatchObject({ origen: 'global', prioridad: 'B' })
    expect(cadena.opener).toBeUndefined() // la invocación no tiene opener propio
    expect(cadena.triggers).toEqual([expect.objectContaining({ cardInstanceId: 'her', efectoIdx: 0, objetivoId: 'b1' })])
    expect(valores(s, 'b1')).toEqual([]) // nada ha resuelto todavía

    const r = cerrar(s, ctx)
    expect(r.cadena).toBeUndefined()
    expect(valores(r, 'b1')).toEqual([-2])
    expect(valores(r, 'b0')).toEqual([])
    expect(r.players.A.campo.campeones[0]).toBe('her') // el Campeón sigue en su slot
    expect(verificarZonaUnica(r)).toEqual([])
  })

  it('evento trigger_apilado (decisión 10a): UNA vez al apilar, sin objetivo, y no se re-emite al elegir ni al resolver', () => {
    const s0 = escena()
    conRival(s0)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    expect(triggersApiladosDe(ctx)).toEqual([
      { type: 'trigger_apilado', jugador: 'A', cardInstanceId: 'her', trigger: 'al-invocar', efectoIdx: 0 },
    ])
    s = aplicar(s, elegir('b1'), ctx)
    expect(triggersApiladosDe(ctx)).toEqual([]) // elegir no vuelve a emitir (ctx.events = buffer de la última acción)
    const r = cerrar(s, ctx)
    expect(valores(r, 'b1')).toEqual([-2])
    expect(triggersApiladosDe(ctx)).toEqual([])
  })

  it('gate cerrado (el rival no puede responder): elegir resuelve el trigger de inmediato', () => {
    const s0 = escena()
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'invocacion', pendientes: 1 })
    s = aplicar(s, elegir('b1'), ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(valores(s, 'b1')).toEqual([-2])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('PR-014 (objetivo propio): las opciones incluyen al recién invocado y el efecto cae al resolver', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'a1', PR.PEON, 0)
    conRival(s0)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_ALIADO, 2)
    expect([...s.objetivosPendientes![0].opciones].sort()).toEqual(['a1', 'her'])
    s = aplicar(s, elegir('her'), ctx) // el Campeón puede elegirse a sí mismo
    expect(valores(s, 'her')).toEqual([])
    const r = cerrar(s, ctx)
    expect(valores(r, 'her')).toEqual([2]) // PR-014 es un BUFF (+2 ATQ) sobre un Campeón propio
    expect(verificarZonaUnica(r)).toEqual([])
  })

  it('una carta sin efecto al-invocar no cambia el flujo: ni trigger_apilado ni triggers en la cadena', () => {
    const s0 = escena()
    conRival(s0)
    const ctx = crearCtx()
    const s = invocar(s0, ctx, PR.PEON, 0, 1) // el Peón cuesta 1: el motor rechaza el sobrepago
    expect(triggersApiladosDe(ctx)).toEqual([])
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(cadenaActiva(s)).toMatchObject({ origen: 'global', prioridad: 'B' })
    expect(cadenaActiva(s)!.triggers).toBeUndefined()
  })

  it('rendirse durante la elección del trigger: lo decide quien se rinde', () => {
    const s0 = escena()
    conRival(s0)
    const ctx = crearCtx()
    const s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    expect(s.declaracionEnEleccion?.tipo).toBe('invocacion')
    expect(aplicar(s, { type: 'rendirse', jugador: 'A' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
  })
})

/* ───────────────────────── Decisión 2 y fizzle ───────────────────────── */

describe('decisión 2: la fuente fuera del campo pierde el trigger', () => {
  it('una Fugaz del rival destruye al Campeón invocado antes de resolver: el trigger se pierde sin efectos parciales', () => {
    const s0 = escena()
    conRival(s0)
    conMano(s0, 'B', 'fug', PR.FUGAZ_DEMOLEDORA)
    conEteres(s0, 'B', 3)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    s = aplicar(s, elegir('b1'), ctx)
    expect(cadenaActiva(s)!.triggers).toHaveLength(1)
    // B responde con la Fugaz desde la mano contra el Campeón recién invocado (elige su objetivo al responder)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'fug', eterIds: etersParaPagar(s, 'B', PR.FUGAZ_DEMOLEDORA)! }, ctx)
    s = aplicar(s, elegir('her'), ctx)
    expect(s.cadena).toBeUndefined() // la Fugaz cierra la pila: resolvió todo en LIFO
    expect(s.players.A.campo.campeones).not.toContain('her')
    expect(s.players.A.cementerio).toContain('her')
    expect(valores(s, 'b1')).toEqual([]) // el trigger se perdió: sin debuff
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('el objetivo desaparece entre la elección y la resolución: fizzle, el Campeón invocado no se toca', () => {
    const s0 = escena()
    conRival(s0)
    const ctx = crearCtx()
    let s = invocar(s0, ctx, PR.HERALDO_HOSTIL)
    s = aplicar(s, elegir('b1'), ctx)
    const fuera = structuredClone(s)
    fuera.players.B.campo.campeones[1] = null
    fuera.players.B.cementerio.push('b1')
    const r = cerrar(fuera, ctx)
    expect(valores(r, 'b1')).toEqual([])
    expect(valores(r, 'b0')).toEqual([])
    expect(r.players.A.campo.campeones[0]).toBe('her')
    expect(verificarZonaUnica(r)).toEqual([])
  })
})

/* ───────────────────────── Simulaciones con el cableado real ───────────────────────── */

describe('simulaciones con bots (mazos PR): al-invocar apilado sin freeze ni zonas rotas', () => {
  it('seeds del handoff: zona única e invariantes por paso, y se apila al menos un al-invocar', () => {
    let alInvocar = 0
    for (const seed of [66099, 66676, 1, 2, 3, 7, 42, 12345]) {
      const { state, ctx } = crearPartidaPrueba(seed)
      let s = state
      for (let i = 0; i < 700 && s.fase !== 'terminada'; i++) {
        const actor = actorActual(s)
        if (!actor) break
        const accion = botTonto(s, actor)
        if (!accion) throw new Error(`seed ${seed}: freeze en iteración ${i} (fase ${s.fase}, cadena ${!!s.cadena}, decl ${s.declaracionEnEleccion?.tipo})`)
        const r = applyAction(s, accion, ctx)
        if (!r.ok) throw new Error(`seed ${seed}: ${accion.type} falló: ${r.error}`)
        s = r.state
        alInvocar += ctx.events.filter((e) => e.type === 'trigger_apilado' && e.trigger === 'al-invocar').length
        expect(verificarZonaUnica(s), `seed ${seed} iter ${i} (${accion.type})`).toEqual([])
      }
      expect(verificarInvariantes(s), `seed ${seed} final`).toEqual([])
    }
    expect(alInvocar).toBeGreaterThan(0)
  })
})
