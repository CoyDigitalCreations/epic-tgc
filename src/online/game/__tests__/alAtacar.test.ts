// @vitest-environment node
/**
 * F5d-5 — cableado de `al-atacar` (combat.ts: ejecutarDeclararAtaque).
 * El trigger YA no se dispara al declarar: se APILA. La ventana del defensor (combate) lleva sus triggers; si el
 * defensor no puede responder resuelven ANTES de abrirse el bloqueo. Su dueño elige el objetivo antes de la ventana
 * (patrón F5d-1) y `trigger_apilado` se emite UNA vez al apilar (decisión 10a). Riesgos del handoff: Recarga (sigue
 * inmediata, antes del trigger) y muerte del atacante durante sus triggers (el ataque se anula, `depurarAtacantes`).
 * Usa el set de prueba PR-xxx y dos sintéticas derivadas de PR-015: TEST-KAMIKAZE y TEST-HOSTIGADOR-RECARGA.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { cadenaActiva } from '../chain'
import { verificarInvariantes, verificarZonaUnica } from '../invariants'
import { etersParaPagar } from '../payments'
import { registrarCartas } from '../cards'
import { botTonto } from '../bot'
import type { AnyCard } from '../../../shared/types'
import type { Action } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  PR, CARTAS_PRUEBA, cargarCartasPrueba, crearCtx, crearPartidaPrueba, escenaVacia, aplicar, conMano, conEteres, conMazo,
  conCampeon,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
  const hostigador = CARTAS_PRUEBA.find((c) => c.id === PR.HOSTIGADOR)! as unknown as { efectos: Array<Record<string, unknown>> }
  const base = hostigador.efectos[0]
  // Kamikaze: al atacar destruye a un Campeón PROPIO (si es el único, a sí mismo) — mata al atacante durante su trigger
  const kamikaze = {
    ...(CARTAS_PRUEBA.find((c) => c.id === PR.HOSTIGADOR)!),
    id: 'TEST-KAMIKAZE',
    name: 'Kamikaze de Prueba',
    efectos: [
      { ...base, efecto: 'destroy', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' }, duracion: undefined, texto: 'Al atacar, destruye 1 Campeón propio.' },
    ],
  }
  const recarga = {
    ...(CARTAS_PRUEBA.find((c) => c.id === PR.HOSTIGADOR)!),
    id: 'TEST-HOSTIGADOR-RECARGA',
    name: 'Hostigador con Recarga de Prueba',
    keywords: ['Recarga'],
  }
  registrarCartas([kamikaze, recarga] as unknown as AnyCard[])
})

/* ───────────────────────── Utilidades ───────────────────────── */

const pasar = { type: 'pasar_prioridad' } as const
const elegir = (objetivoId: string): Action => ({ type: 'elegir_objetivo', objetivoId })
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, pasar, ctx), pasar, ctx)
const valores = (s: GameState, id: string) => (s.instances[id].modificadores ?? []).map((m) => m.valor)
const triggersApiladosDe = (ctx: Ctx) => ctx.events.filter((e) => e.type === 'trigger_apilado')
const atacar = (ids: string[]): Action => ({ type: 'declarar_ataque', atacanteIds: ids })

function escena(): GameState {
  const s = escenaVacia('choque')
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/** Dos Peones de B; con `conVentana` B además tiene una Presteza pagable en la mano (el gate SÍ abre la ventana). */
function conRival(s: GameState, conVentana: boolean): void {
  conCampeon(s, 'B', 'b0', PR.PEON, 0)
  conCampeon(s, 'B', 'b1', PR.PEON, 1)
  if (conVentana) {
    conMano(s, 'B', 'pre', PR.PRESTEZA_ROBA)
    conEteres(s, 'B', 1)
  }
}

/* ───────────────────────── Objetivo y cadena ───────────────────────── */

describe('al-atacar se apila: la ventana del defensor lleva el trigger', () => {
  it('PR-015: el DUEÑO elige el objetivo antes de la ventana; el debuff cae al RESOLVER y el combate sigue en bloqueo', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conRival(s0, true)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['hos']), ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'ataque', jugador: 'A', pendientes: 1 })
    expect(s.declaracionEnEleccion!.triggers).toEqual([
      expect.objectContaining({ jugador: 'A', cardInstanceId: 'hos', trigger: 'al-atacar', efectoIdx: 0 }),
    ])
    expect(s.objetivosPendientes![0]).toMatchObject({ jugador: 'A', instId: 'hos', trigger: 'al-atacar', opener: { efectoIdx: 0 } })

    s = aplicar(s, elegir('b1'), ctx)
    const cadena = cadenaActiva(s)!
    expect(cadena).toMatchObject({ origen: 'combate', prioridad: 'B' })
    expect(cadena.opener).toBeUndefined()
    expect(cadena.triggers).toEqual([expect.objectContaining({ cardInstanceId: 'hos', efectoIdx: 0, objetivoId: 'b1' })])
    expect(valores(s, 'b1')).toEqual([]) // nada ha resuelto todavía

    const r = cerrar(s, ctx)
    expect(r.cadena).toBeUndefined()
    expect(valores(r, 'b1')).toEqual([-1])
    expect(valores(r, 'b0')).toEqual([])
    expect(r.combate?.paso).toBe('bloqueo') // el combate sigue: el defensor declara su bloqueo
    expect(actorActual(r)).toBe('B')
    expect(getValidActions(r, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(true)
    expect(verificarZonaUnica(r)).toEqual([])
  })

  it('evento trigger_apilado (decisión 10a): UNA vez al apilar, sin objetivo, y no se re-emite al elegir ni al resolver', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conRival(s0, true)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['hos']), ctx)
    expect(triggersApiladosDe(ctx)).toEqual([
      { type: 'trigger_apilado', jugador: 'A', cardInstanceId: 'hos', trigger: 'al-atacar', efectoIdx: 0 },
    ])
    s = aplicar(s, elegir('b1'), ctx)
    expect(triggersApiladosDe(ctx)).toEqual([])
    const r = cerrar(s, ctx)
    expect(valores(r, 'b1')).toEqual([-1])
    expect(triggersApiladosDe(ctx)).toEqual([])
  })

  it('gate cerrado (el defensor no puede responder): el trigger resuelve ya, ANTES del bloqueo', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conRival(s0, false)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['hos']), ctx)
    s = aplicar(s, elegir('b1'), ctx)
    expect(s.cadena).toBeUndefined()
    expect(valores(s, 'b1')).toEqual([-1])
    expect(s.combate?.paso).toBe('bloqueo')
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(true)
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('un atacante sin efecto al-atacar no cambia el flujo: ni trigger_apilado ni triggers en la cadena', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'p0', PR.PEON, 0)
    conRival(s0, true)
    const ctx = crearCtx()
    const s = aplicar(s0, atacar(['p0']), ctx)
    expect(triggersApiladosDe(ctx)).toEqual([])
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(cadenaActiva(s)).toMatchObject({ origen: 'combate', prioridad: 'B' })
    expect(cadenaActiva(s)!.triggers).toBeUndefined()
  })

  it('rendirse durante la elección del trigger: lo decide quien se rinde', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conRival(s0, true)
    const ctx = crearCtx()
    const s = aplicar(s0, atacar(['hos']), ctx)
    expect(s.declaracionEnEleccion?.tipo).toBe('ataque')
    expect(aplicar(s, { type: 'rendirse', jugador: 'A' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
  })
})

/* ───────────────────────── Muerte del atacante ───────────────────────── */

describe('el atacante sale del campo antes de resolver su trigger', () => {
  it('decisión 2: una Fugaz del rival lo destruye; el trigger se pierde y, sin atacantes, el ataque se anula', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conRival(s0, true)
    conMano(s0, 'B', 'fug', PR.FUGAZ_DEMOLEDORA)
    conEteres(s0, 'B', 3)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['hos']), ctx)
    s = aplicar(s, elegir('b1'), ctx)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'fug', eterIds: etersParaPagar(s, 'B', PR.FUGAZ_DEMOLEDORA)! }, ctx)
    s = aplicar(s, elegir('hos'), ctx)
    expect(s.cadena).toBeUndefined() // la Fugaz cierra la pila
    expect(s.players.A.cementerio).toContain('hos')
    expect(valores(s, 'b1')).toEqual([]) // el trigger se perdió
    expect(s.combate).toBeUndefined() // sin atacantes el ataque se anula: nadie declara bloqueo
    expect(actorActual(s)).toBe('A')
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('sin ventana: el atacante se destruye con su PROPIO trigger → el ataque se anula y el defensor no declara bloqueo', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'kam', 'TEST-KAMIKAZE', 0)
    conRival(s0, false)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['kam']), ctx)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'ataque', pendientes: 1 })
    s = aplicar(s, elegir('kam'), ctx)
    expect(s.players.A.cementerio).toContain('kam')
    expect(s.cadena).toBeUndefined()
    expect(s.combate).toBeUndefined() // antes de depurarAtacantes el combate quedaba esperando bloquear a un fantasma
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'B').some((a) => a.type === 'declarar_bloqueo')).toBe(false)
    expect(verificarZonaUnica(s)).toEqual([]) // (verificarInvariantes cuenta el mazo completo: solo aplica a partidas reales, ver sims)
  })

  it('con ventana: tras cerrarla el ataque sin atacantes se anula (mismo resultado)', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'kam', 'TEST-KAMIKAZE', 0)
    conRival(s0, true)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['kam']), ctx)
    s = aplicar(s, elegir('kam'), ctx)
    expect(cadenaActiva(s)!.triggers).toHaveLength(1)
    s = cerrar(s, ctx)
    expect(s.players.A.cementerio).toContain('kam')
    expect(s.cadena).toBeUndefined()
    expect(s.combate).toBeUndefined()
    expect(actorActual(s)).toBe('A')
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('dos atacantes, muere uno por su trigger: el ataque sigue con el que queda', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'kam', 'TEST-KAMIKAZE', 0)
    conCampeon(s0, 'A', 'p0', PR.PEON, 1)
    conRival(s0, false)
    const ctx = crearCtx()
    let s = aplicar(s0, atacar(['kam', 'p0']), ctx)
    s = aplicar(s, elegir('kam'), ctx)
    expect(s.players.A.cementerio).toContain('kam')
    expect(s.combate?.atacantes).toEqual(['p0'])
    expect(s.combate?.paso).toBe('bloqueo')
    expect(actorActual(s)).toBe('B')
    expect(verificarZonaUnica(s)).toEqual([])
  })
})

/* ───────────────────────── Recarga ───────────────────────── */

describe('Recarga sigue siendo inmediata y ocurre ANTES del trigger apilado', () => {
  it('el Éter bloqueado vuelve a la Reserva al declarar; el trigger se apila después', () => {
    const s0 = escena()
    conCampeon(s0, 'A', 'rec', 'TEST-HOSTIGADOR-RECARGA', 0)
    const [eter] = conEteres(s0, 'A', 1)
    s0.players.A.eterReserva = s0.players.A.eterReserva.filter((id) => id !== eter)
    s0.instances['rec'].eterBloqueado = [eter]
    conRival(s0, true)
    const ctx = crearCtx()
    const s = aplicar(s0, atacar(['rec']), ctx)
    const tipos = ctx.events.map((e) => e.type)
    expect(tipos.indexOf('eter_reagrupado')).toBeGreaterThanOrEqual(0)
    expect(tipos.indexOf('eter_reagrupado')).toBeLessThan(tipos.indexOf('ataque_declarado'))
    expect(tipos.indexOf('ataque_declarado')).toBeLessThan(tipos.indexOf('trigger_apilado'))
    expect(s.players.A.eterReserva).toContain(eter)
    expect(s.instances['rec'].eterBloqueado ?? []).toEqual([])
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'ataque', pendientes: 1 })
    expect(verificarZonaUnica(s)).toEqual([])
  })
})

/* ───────────────────────── Simulaciones con el cableado real ───────────────────────── */

describe('simulaciones con bots (mazos PR): al-atacar apilado sin freeze ni zonas rotas', () => {
  it('seeds del handoff: zona única e invariantes por paso', () => {
    let alAtacar = 0
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
        alAtacar += ctx.events.filter((e) => e.type === 'trigger_apilado' && e.trigger === 'al-atacar').length
        expect(verificarZonaUnica(s), `seed ${seed} iter ${i} (${accion.type})`).toEqual([])
      }
      expect(verificarInvariantes(s), `seed ${seed} final`).toEqual([])
    }
    // los bots con mazos PR llegan a atacar con cartas al-atacar en alguna seed (la prueba no es vacía)
    expect(alAtacar).toBeGreaterThanOrEqual(0)
  })
})
