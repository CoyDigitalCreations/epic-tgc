// @vitest-environment node
/**
 * F5d-2 — infraestructura de triggers apilados (triggers.ts). Nadie la llama todavía en producción
 * (los sitios de llamada son F5d-3..5): aquí se ejercita con un "hook de test" que apila triggers a mano,
 * y se comprueba que el juego real no cambió. Usa el set de prueba PR-xxx (helpers/cartasPrueba.ts) y
 * cartas sintéticas TEST-*.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { cadenaActiva, declararOpener, marcarInicioAccion } from '../chain'
import { dispararTrigger, statsDe, triggersQueMatchean } from '../efectos'
import {
  MAX_PROFUNDIDAD_TRIGGERS, TRIGGERS_APILABLES, apilarTriggers, construirTriggers, esTriggerApilable, ordenResolucion,
  ordenarTriggers,
} from '../triggers'
import { visibleState } from '../visibleState'
import { botTonto } from '../bot'
import { verificarInvariantes, verificarZonaUnica } from '../invariants'
import { etersParaPagar } from '../payments'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../../../shared/types'
import type { Action } from '../actions'
import type { CadenaState, Ctx, GameState, TriggerApilado } from '../types'
import {
  PR, CARTAS_PRUEBA, cargarCartasPrueba, crearCtx, crearPartidaPrueba, escenaVacia, aplicar, conMano, conEteres, conMazo,
  conCampeon, conMistica, conArcana, conVinculo,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
  // Sintéticas: un Campeón con `condicion` sobre su propio trigger y una Arcana con un efecto sin elección
  const heraldo = CARTAS_PRUEBA.find((c) => c.id === PR.HERALDO_HOSTIL)!
  const arcana = CARTAS_PRUEBA.find((c) => c.id === PR.TRAMPA)!
  const condicionada = {
    ...heraldo,
    id: 'TEST-COND',
    condicion: {
      trigger: 'al_invocar',
      condiciones: [{ tipo: 'rival_controla_minimo', cantidad: 2, objetivo: { tipo: 'campeon', controlador: 'rival' } }],
    },
  }
  const arcanaRoba = {
    ...arcana,
    id: 'TEST-ARC',
    condicion: undefined,
    efectos: [{
      tipo: 'pasivo', efecto: 'draw', trigger: 'al_atacar', texto: 'roba 1',
      objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' }, stats: { ATQ: 0, RES: 0 },
    }],
  }
  const arcanaDebuff = { ...arcanaRoba, id: 'TEST-ARC2', efectos: [{ ...arcanaRoba.efectos[0], efecto: 'debuff', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' }, stats: { ATQ: 1, RES: 0 }, duracion: 'turno' }] }
  registrarCartas([condicionada, arcanaRoba, arcanaDebuff] as unknown as AnyCard[])
})

/* ───────────────────────── Utilidades ───────────────────────── */

const pasar = { type: 'pasar_prioridad' } as const
const elegir = (objetivoId: string): Action => ({ type: 'elegir_objetivo', objetivoId })
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, pasar, ctx), pasar, ctx)
const valores = (s: GameState, id: string) => (s.instances[id].modificadores ?? []).map((m) => m.valor)

function escena(): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/** A: a0 Peón, ha Heraldo Aliado (al invocar: +ATQ a un propio). B: b0 Peón, hb Hostigador (al atacar: -ATQ a un rival). */
function mesa(conRespondible = true): GameState {
  const s = escena()
  conCampeon(s, 'A', 'a0', PR.PEON, 0)
  conCampeon(s, 'A', 'ha', PR.HERALDO_ALIADO, 1)
  conCampeon(s, 'B', 'b0', PR.PEON, 0)
  conCampeon(s, 'B', 'hb', PR.HOSTIGADOR, 1)
  // una Mística de B en el campo desde turnos anteriores: puede responder (la ventana abre)
  if (conRespondible) conMistica(s, 'B', 'bm', PR.AVISO, 0)
  return s
}

/** Los triggers de la mesa: el de B (hb, al atacar) va PRIMERO en la lista a propósito: el motor reordena. */
const listaMesa = (s: GameState): TriggerApilado[] => [
  ...construirTriggers(s, 'al-atacar', 'B', ['hb']),
  ...construirTriggers(s, 'al-invocar', 'A', ['ha']),
]

/** Apila los triggers de la mesa y elige objetivos: A elige para `ha`, B elige para `hb`. */
function apilado(s0: GameState, objetivoA = 'a0', objetivoB = 'a0'): { s: GameState; ctx: Ctx } {
  const ctx = crearCtx()
  let s = structuredClone(s0)
  apilarTriggers(s, ctx, listaMesa(s))
  s = aplicar(s, elegir(objetivoA), ctx)
  s = aplicar(s, elegir(objetivoB), ctx)
  return { s, ctx }
}

/* ───────────────────────── triggersQueMatchean ───────────────────────── */

describe('triggersQueMatchean: el filtro de dispararTrigger, extraído y puro', () => {
  it('devuelve (instancia, efecto, efectoIdx) de los efectos que matchean, sin mutar el estado', () => {
    const s = mesa()
    const antes = structuredClone(s)
    const m = triggersQueMatchean(s, 'al-invocar', 'A', ['ha'])
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ efectoIdx: 0 })
    expect(m[0].inst.cardInstanceId).toBe('ha')
    expect(m[0].efecto.trigger).toBe('al_invocar')
    expect(s).toEqual(antes)
    // otro trigger, otra carta sin efectos, id inexistente: nada
    expect(triggersQueMatchean(s, 'al-atacar', 'A', ['ha'])).toEqual([])
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['a0', 'zzz'])).toEqual([])
  })

  it('recorre las instancias en orden estable (ids ordenados)', () => {
    const s = escena()
    conCampeon(s, 'A', 'z1', PR.HERALDO_ALIADO, 0)
    conCampeon(s, 'A', 'a1', PR.HERALDO_ALIADO, 1)
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['z1', 'a1']).map((m) => m.inst.cardInstanceId)).toEqual(['a1', 'z1'])
  })

  it('Vínculo boca abajo no tiene efectos vigentes (§5.5); destruido (boca arriba) sí', () => {
    const s = escena()
    conVinculo(s, 'A', 'v0', PR.VINC_RETORNO, 0, false)
    expect(triggersQueMatchean(s, 'al-inicio-alba', 'A', ['v0'])).toEqual([])
    s.instances['v0'].bocaArriba = true
    expect(triggersQueMatchean(s, 'al-inicio-alba', 'A', ['v0'])).toHaveLength(1)
  })

  it('la condicion JSON cuyo trigger es el disparado se evalúa con el jugador dado', () => {
    const s = escena()
    conCampeon(s, 'A', 'c0', 'TEST-COND', 0)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['c0'])).toEqual([]) // el rival controla 1 < 2
    conCampeon(s, 'B', 'b1', PR.PEON, 1)
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['c0'])).toHaveLength(1)
  })

  it("'al-bloquear-eter' (umbral) no matchea efectos con trigger propio; un trigger interno sin equivalente JSON sí matchea los efectos sin trigger", () => {
    const s = escena()
    conCampeon(s, 'A', 'ha', PR.HERALDO_ALIADO, 0)
    expect(triggersQueMatchean(s, 'al-bloquear-eter', 'A', ['ha'])).toEqual([])
    conCampeon(s, 'A', 'rc', PR.ROMPECADENAS, 1)
    expect(triggersQueMatchean(s, 'activable', 'A', ['ha'])).toEqual([])
  })

  it('devuelve TODOS los efectos con match (el camino inmediato sigue usando solo el primero)', () => {
    const s = escena()
    const base = CARTAS_PRUEBA.find((c) => c.id === PR.HERALDO_ALIADO)! as unknown as { efectos: Record<string, unknown>[] }
    const doble = { ...base, id: 'TEST-DOBLE', efectos: [base.efectos[0], { ...base.efectos[0], efecto: 'debuff', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' } }] }
    registrarCartas([doble] as unknown as AnyCard[])
    conCampeon(s, 'A', 'd0', 'TEST-DOBLE', 0)
    conCampeon(s, 'A', 'a1', PR.PEON, 1)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['d0']).map((m) => m.efectoIdx)).toEqual([0, 1])
    // inmediato: solo el primero arma su pendiente
    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', ['d0'])
    expect(s.objetivosPendientes).toHaveLength(1)
    expect(s.objetivosPendientes![0].opciones.sort()).toEqual(['a1', 'd0'])
    // apilado: una entrada por efecto, ordenadas por efectoIdx
    expect(construirTriggers(s, 'al-invocar', 'A', ['d0']).map((t) => t.efectoIdx)).toEqual([0, 1])
  })

  it('dispararTrigger conserva su comportamiento: pendiente de objetivo con las mismas opciones y marca de trigger', () => {
    const s = mesa()
    dispararTrigger(s, crearCtx(), 'al-invocar', 'A', ['ha'])
    expect(s.objetivosPendientes).toEqual([{ jugador: 'A', instId: 'ha', trigger: 'al-invocar', opciones: ['a0', 'ha'] }])
  })
})

/* ───────────────────────── Lista central y construcción ───────────────────────── */

describe('triggers apilables', () => {
  it('lista central: los que nacen de una acción de jugador', () => {
    expect([...TRIGGERS_APILABLES]).toEqual(['al-invocar', 'al-atacar', 'al-jugar-mistica', 'al-activar-habilidad'])
    for (const t of ['al-matar-en-combate', 'al-inicio-alba', 'al-inicio-choque', 'al-pagar-eter', 'al-ser-enviado-al-cementerio',
      'al-ser-destruido-vinculo', 'al-resolver-cadena', 'al-bloquear-eter'] as const) {
      expect(esTriggerApilable(t), t).toBe(false)
    }
  })

  it('construirTriggers: una entrada por efecto con match, payload solo con datos serializables; los no apilables dan []', () => {
    const s = mesa()
    expect(construirTriggers(s, 'al-invocar', 'A', ['ha', 'a0'], { contextoUso: 'invocar' })).toEqual([
      { jugador: 'A', cardInstanceId: 'ha', trigger: 'al-invocar', efectoIdx: 0, payload: { contextoUso: 'invocar' } },
    ])
    expect(construirTriggers(s, 'al-inicio-alba', 'A', ['ha'])).toEqual([])
    expect(JSON.parse(JSON.stringify(construirTriggers(s, 'al-atacar', 'B', ['hb'])))).toEqual(construirTriggers(s, 'al-atacar', 'B', ['hb']))
  })

  it('apilarTriggers ignora las entradas de triggers no apilables (siguen inmediatos) y de cartas inexistentes', () => {
    const s = mesa()
    const ctx = crearCtx()
    apilarTriggers(s, ctx, [
      { jugador: 'A', cardInstanceId: 'ha', trigger: 'al-matar-en-combate', efectoIdx: 0 },
      { jugador: 'A', cardInstanceId: 'fantasma', trigger: 'al-invocar', efectoIdx: 0 },
    ])
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toBeUndefined()
    expect(s.objetivosPendientes ?? []).toEqual([])
  })

  it('ordenarTriggers: estable, el del jugador activo primero y el del rival después', () => {
    const s = mesa()
    const l: TriggerApilado[] = [
      { jugador: 'B', cardInstanceId: 'x1', trigger: 'al-invocar', efectoIdx: 0 },
      { jugador: 'A', cardInstanceId: 'x2', trigger: 'al-invocar', efectoIdx: 0 },
      { jugador: 'B', cardInstanceId: 'x3', trigger: 'al-invocar', efectoIdx: 0 },
      { jugador: 'A', cardInstanceId: 'x4', trigger: 'al-invocar', efectoIdx: 0 },
    ]
    expect(ordenarTriggers(s, l).map((t) => t.cardInstanceId)).toEqual(['x2', 'x4', 'x1', 'x3'])
    s.turno = 'B'
    expect(ordenarTriggers(s, l).map((t) => t.cardInstanceId)).toEqual(['x1', 'x3', 'x2', 'x4'])
  })
})

/* ───────────────────────── Elección de objetivos al apilar ───────────────────────── */

describe('objetivos al apilar: el DUEÑO del trigger elige (rival incluido) antes de abrir la ventana', () => {
  it('declaración tipo triggers: activo primero; el actor sigue al elector; solo se puede elegir o rendirse', () => {
    const ctx = crearCtx()
    const s = mesa()
    apilarTriggers(s, ctx, listaMesa(s))
    expect(s.cadena).toBeUndefined() // la ventana espera
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'triggers', jugador: 'A', pendientes: 2 })
    expect(s.declaracionEnEleccion!.triggers!.map((t) => t.jugador)).toEqual(['A', 'B'])
    expect(s.objetivosPendientes!.map((p) => [p.jugador, p.instId, p.opener])).toEqual([
      ['A', 'ha', { efectoIdx: 0 }],
      ['B', 'hb', { efectoIdx: 0 }],
    ])
    expect(actorActual(s)).toBe('A')
    expect(getValidActions(s, 'A').map((a) => a.type).sort()).toEqual(['elegir_objetivo', 'elegir_objetivo', 'rendirse'])
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
    for (const accion of [pasar, { type: 'pasar_turno' }, { type: 'responder_cadena', cardInstanceId: 'bm' }] as Action[]) {
      expect(applyAction(s, accion, ctx).ok, accion.type).toBe(false)
    }
    // A elige el suyo; ahora le toca elegir AL RIVAL (dueño de su trigger), A queda congelado
    const s1 = aplicar(s, elegir('a0'), ctx)
    expect(s1.declaracionEnEleccion).toMatchObject({ pendientes: 1 })
    expect(s1.declaracionEnEleccion!.triggers![0].objetivoId).toBe('a0')
    expect(actorActual(s1)).toBe('B')
    expect(getValidActions(s1, 'A').map((a) => a.type)).toEqual(['rendirse'])
    expect(getValidActions(s1, 'B').filter((a) => a.type === 'elegir_objetivo')).toHaveLength(2) // a0 y ha
    expect(verificarZonaUnica(s1)).toEqual([])
  })

  it('al elegir el último se abre la ventana: prioridad del rival, triggers en la cadena con su objetivo', () => {
    const { s } = apilado(mesa())
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.objetivosPendientes ?? []).toEqual([])
    const cadena = cadenaActiva(s)!
    expect(cadena.origen).toBe('global')
    expect(cadena.prioridad).toBe('B') // el rival del activo responde primero
    expect(cadena.pila).toEqual([])
    expect(cadena.triggers!.map((t) => [t.jugador, t.cardInstanceId, t.objetivoId])).toEqual([['A', 'ha', 'a0'], ['B', 'hb', 'a0']])
    expect(actorActual(s)).toBe('B')
    // nada se aplicó todavía
    expect(valores(s, 'a0')).toEqual([])
  })

  it('el trigger del RIVAL lo elige el rival al armarse (H4): el dueño es el elector aunque no sea su turno', () => {
    const s = escena()
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    conCampeon(s, 'B', 'hb2', PR.HERALDO_ALIADO, 1)
    const ctx = crearCtx()
    apilarTriggers(s, ctx, construirTriggers(s, 'al-invocar', 'B', ['hb2']))
    expect(s.declaracionEnEleccion!.triggers!.map((t) => t.jugador)).toEqual(['B'])
    expect(actorActual(s)).toBe('B') // el DUEÑO elige aunque no sea el turno
    expect(getValidActions(s, 'A').map((a) => a.type)).toEqual(['rendirse'])
    const s1 = aplicar(s, elegir('hb2'), ctx)
    expect(s1.declaracionEnEleccion).toBeUndefined()
    expect(valores(s1, 'hb2')).toEqual([2]) // gate cerrado (A sin respondibles): resolvió ya con el objetivo que eligió el rival
  })

  it('rendirse durante la elección: lo decide quien se rinde (también el elector rival)', () => {
    const ctx = crearCtx()
    const s = mesa()
    apilarTriggers(s, ctx, listaMesa(s))
    const s1 = aplicar(s, elegir('a0'), ctx) // ahora elige B
    expect(aplicar(s1, { type: 'rendirse', jugador: 'B' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'A', motivo: 'rendicion' })
    expect(aplicar(s, { type: 'rendirse', jugador: 'A' }, crearCtx())).toMatchObject({ fase: 'terminada', ganador: 'B' })
  })

  it('el bot (pausado, solo evita freezes) elige por el dueño del pendiente', () => {
    const ctx = crearCtx()
    const s = mesa()
    apilarTriggers(s, ctx, listaMesa(s))
    expect(botTonto(s, 'B')).toBeNull()
    expect(botTonto(s, 'A')?.type).toBe('elegir_objetivo')
    const s1 = aplicar(s, botTonto(s, 'A')!, ctx)
    expect(botTonto(s1, 'A')).toBeNull()
    expect(botTonto(s1, 'B')?.type).toBe('elegir_objetivo')
  })

  it('visibleState: el trigger apilado de una Arcana ya volteada es público; sin trigger sigue oculta', () => {
    const s = escena()
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    conArcana(s, 'B', 'arc', 'TEST-ARC', 0, { bocaArriba: true })
    conArcana(s, 'B', 'arc2', 'TEST-ARC', 1)
    conMistica(s, 'B', 'bm', PR.AVISO, 0)
    expect(visibleState(s, 'A').instances['arc'].cardId).toBeNull()
    const ctx = crearCtx()
    // el trigger de B (rival del turno) con ventana abierta: la fuente se ve, la otra Arcana sigue oculta
    apilarTriggers(s, ctx, construirTriggers(s, 'al-atacar', 'B', ['arc']))
    expect(s.cadena?.triggers).toHaveLength(1)
    const v = visibleState(s, 'A')
    expect(v.instances['arc'].cardId).toBe('TEST-ARC')
    expect(v.instances['arc2'].cardId).toBeNull()
    expect(v.cadena?.triggers).toHaveLength(1)
    // y mientras se eligen objetivos (declaración) la fuente ya es pública
    const e = escena()
    conCampeon(e, 'A', 'a0', PR.PEON, 0)
    conArcana(e, 'B', 'arc', 'TEST-ARC2', 0)
    apilarTriggers(e, ctx, construirTriggers(e, 'al-atacar', 'B', ['arc']))
    expect(e.declaracionEnEleccion?.tipo).toBe('triggers')
    expect(visibleState(e, 'A').instances['arc'].cardId).toBe('TEST-ARC2')
    expect(visibleState(e, 'A').declaracionEnEleccion?.triggers).toHaveLength(1)
  })
})

/* ───────────────────────── Resolución LIFO ───────────────────────── */

describe('resolución LIFO: respuestas → triggers (el del rival primero) → opener', () => {
  it('sin respondedores (gate cerrado): resuelven de inmediato, en el mismo orden (rival primero)', () => {
    const { s, ctx } = apilado(mesa(false))
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(valores(s, 'a0')).toEqual([-1, 2]) // primero el del rival (-1), luego el del activo (+2)
    expect(verificarZonaUnica(s)).toEqual([])
    expect(ctx.events.length).toBeGreaterThanOrEqual(0)
  })

  it('con ventana: ambos pasan y resuelven en orden inverso al de apilado', () => {
    const { s: s1, ctx } = apilado(mesa())
    expect(ordenResolucion(s1.cadena!).map((p) => ('trigger' in p ? p.trigger.cardInstanceId : p.respuesta))).toEqual(['hb', 'ha'])
    const s = cerrar(s1, ctx)
    expect(s.cadena).toBeUndefined()
    expect(valores(s, 'a0')).toEqual([-1, 2])
    expect(s.profundidadTriggers).toBeUndefined() // el contador transitorio nunca queda en el estado
    expect(verificarZonaUnica(s)).toEqual([])
  })

  /** A juega Rayo (opener sobre b0) con sus dos triggers; B tiene una Presteza para responder. */
  function conOpener(respuestaB: string, eteresB: number): { s: GameState; ctx: Ctx } {
    const s0 = mesa(false)
    conMistica(s0, 'A', 'rayo', PR.RAYO, 0, { entradaEsteTurno: true })
    conMano(s0, 'B', 'resp', respuestaB)
    conEteres(s0, 'B', eteresB)
    const ctx = crearCtx()
    const s = structuredClone(s0)
    declararOpener(s, ctx, { tipo: 'mistica', jugador: 'A', cardInstanceId: 'rayo' }, marcarInicioAccion(s), listaMesa(s))
    // orden de elección: el opener (Rayo) y luego los triggers, activo primero
    expect(s.objetivosPendientes!.map((p) => [p.jugador, p.instId])).toEqual([['A', 'rayo'], ['A', 'ha'], ['B', 'hb']])
    let t = aplicar(s, elegir('b0'), ctx)
    t = aplicar(t, elegir('a0'), ctx)
    t = aplicar(t, elegir('a0'), ctx)
    return { s: t, ctx }
  }

  it('respuestas arriba, triggers en medio (rival primero), opener al final', () => {
    const { s: s0, ctx } = conOpener(PR.PRESTEZA_DEBIL, 1)
    expect(s0.cadena!.opener?.cardInstanceId).toBe('rayo')
    expect(s0.cadena!.prioridad).toBe('B')
    // B responde con la Presteza (elige su objetivo al responder); luego ambos pasan
    let s = aplicar(s0, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s0, 'B', PR.PRESTEZA_DEBIL)! }, ctx)
    s = aplicar(s, elegir('a0'), ctx)
    expect(ordenResolucion(s.cadena!).map((p) => ('trigger' in p ? p.trigger.cardInstanceId : p.respuesta))).toEqual(['resp', 'hb', 'ha'])
    s = cerrar(s, ctx)
    expect(valores(s, 'a0')).toEqual([-2, -1, 2]) // respuesta, trigger del rival, trigger del activo
    expect(s.players.B.cementerio).toContain('b0') // y al final el opener: Rayo destruye a b0
    expect(s.players.A.cementerio).toContain('rayo')
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('los triggers NO se niegan: Marcha niega el opener (Rayo), no los triggers', () => {
    const { s: s0, ctx } = conOpener(PR.MARCHA, 2)
    let s = aplicar(s0, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s0, 'B', PR.MARCHA)! }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined() // negar no tiene objetivo que elegir
    s = cerrar(s, ctx)
    expect(s.cadena).toBeUndefined()
    expect(ctx.events.some((e) => e.type === 'activacion_negada')).toBe(true)
    expect(s.players.B.campo.campeones).toContain('b0') // Rayo negado: b0 sigue vivo
    expect(valores(s, 'a0')).toEqual([-1, 2]) // los dos triggers resolvieron igual
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('sin ventana (gate cerrado) el trigger resuelve ANTES que el opener', () => {
    const s0 = mesa(false)
    conMistica(s0, 'A', 'rayo', PR.RAYO, 0, { entradaEsteTurno: true })
    const ctx = crearCtx()
    const s = structuredClone(s0)
    declararOpener(s, ctx, { tipo: 'mistica', jugador: 'A', cardInstanceId: 'rayo' }, marcarInicioAccion(s), listaMesa(s))
    let t = aplicar(s, elegir('b0'), ctx)
    t = aplicar(t, elegir('a0'), ctx)
    t = aplicar(t, elegir('a0'), ctx)
    expect(t.cadena).toBeUndefined()
    expect(valores(t, 'a0')).toEqual([-1, 2])
    expect(t.players.B.cementerio).toContain('b0')
    expect(t.players.A.cementerio).toContain('rayo')
  })

  it('trigger apilado con la cadena ya abierta (`sobre`): queda encima de la respuesta que lo provocó', () => {
    const s0 = mesa(false)
    conMistica(s0, 'A', 'rayo', PR.RAYO, 0, { entradaEsteTurno: true })
    conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = structuredClone(s0)
    declararOpener(s, ctx, { tipo: 'mistica', jugador: 'A', cardInstanceId: 'rayo' }, marcarInicioAccion(s))
    s = aplicar(s, elegir('b0'), ctx)
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s, 'B', PR.PRESTEZA_DEBIL)! }, ctx)
    s = aplicar(s, elegir('a0'), ctx)
    expect(s.cadena!.pila).toEqual(['resp'])
    // mientras la cadena está abierta, una acción de A provoca un trigger: se suma encima de la respuesta
    apilarTriggers(s, ctx, construirTriggers(s, 'al-invocar', 'A', ['ha']))
    s = aplicar(s, elegir('a0'), ctx)
    expect(s.cadena!.triggers).toEqual([expect.objectContaining({ cardInstanceId: 'ha', sobre: 'resp', objetivoId: 'a0' })])
    expect(s.cadena!.pasesConsecutivos).toBe(0)
    expect(ordenResolucion(s.cadena!).map((p) => ('trigger' in p ? p.trigger.cardInstanceId : p.respuesta))).toEqual(['ha', 'resp'])
    s = cerrar(s, ctx)
    expect(valores(s, 'a0')).toEqual([2, -2]) // el trigger (+2) resuelve antes que la respuesta (-2) que está debajo
  })

  it('ordenResolucion: el trigger sin `sobre` (o con su respuesta ya fuera de la pila) va debajo de todas las respuestas', () => {
    const cadena: CadenaState = {
      origen: 'global', pila: ['r1', 'r2'], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja',
      triggers: [
        { jugador: 'A', cardInstanceId: 't0', trigger: 'al-invocar', efectoIdx: 0 },
        { jugador: 'B', cardInstanceId: 't1', trigger: 'al-invocar', efectoIdx: 0, sobre: 'r1' },
        { jugador: 'A', cardInstanceId: 't2', trigger: 'al-invocar', efectoIdx: 0, sobre: 'fuera' },
      ],
    }
    const ids = ordenResolucion(cadena).map((p) => ('trigger' in p ? p.trigger.cardInstanceId : p.respuesta))
    expect(ids).toEqual(['r2', 't1', 'r1', 't2', 't0'])
  })

  it('estados persistidos SIN `triggers` se siguen leyendo: el orden es el de la pila en reversa', () => {
    const cadena = { origen: 'global', pila: ['x', 'y'], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' } as CadenaState
    expect(ordenResolucion(cadena)).toEqual([{ respuesta: 'y' }, { respuesta: 'x' }])
    const { s: s1, ctx } = apilado(mesa())
    const viaJson = JSON.parse(JSON.stringify(s1)) as GameState // lo que viaja a Supabase y vuelve
    expect(viaJson).toEqual(s1)
    expect(valores(cerrar(viaJson, ctx), 'a0')).toEqual([-1, 2])
    const sinCampo = structuredClone(s1)
    delete sinCampo.cadena!.triggers
    expect(valores(cerrar(sinCampo, ctx), 'a0')).toEqual([])
  })
})

/* ───────────────────────── Reglas a, b, c ───────────────────────── */

describe('reglas de resolución: fuente, objetivo y costo', () => {
  it('(a) la fuente salió del campo antes de resolver: el trigger se pierde, el otro sigue', () => {
    const { s: s1, ctx } = apilado(mesa())
    const s0 = structuredClone(s1)
    s0.players.B.campo.campeones[1] = null // hb se va
    s0.players.B.cementerio.push('hb')
    const s = cerrar(s0, ctx)
    expect(valores(s, 'a0')).toEqual([2]) // solo el trigger de ha
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('(b) el objetivo elegido se revalida al resolver: si ya no es válido, fizzle sin efectos parciales', () => {
    const { s: s1, ctx } = apilado(mesa(), 'ha', 'a0')
    const s0 = structuredClone(s1)
    s0.players.A.campo.campeones[0] = null // a0 (objetivo del rival) sale del campo
    s0.players.A.cementerio.push('a0')
    const s = cerrar(s0, ctx)
    expect(valores(s, 'ha')).toEqual([2]) // el trigger de A (objetivo ha) sí
    expect(valores(s, 'a0')).toEqual([]) // el del rival se perdió: nada se aplicó al caído
    expect(s.players.A.cementerio).toEqual(['a0'])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('(b) el objetivo pasó a no ser candidato (zona/exilio): también fizzle', () => {
    const { s: s1, ctx } = apilado(mesa(), 'a0', 'a0')
    const s0 = structuredClone(s1)
    s0.players.A.campo.campeones[0] = null
    s0.players.A.exilio.push('a0')
    const s = cerrar(s0, ctx)
    expect(valores(s, 'a0')).toEqual([])
    expect(s.players.A.exilio).toEqual(['a0'])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  /** A (Rompecadenas al activar habilidad: paga 2 Éter, destruye una Mística rival) vs B con una Mística que puede responder. */
  function rompecadenas(): { s: GameState; ctx: Ctx } {
    const s0 = escena()
    conCampeon(s0, 'A', 'rc', PR.ROMPECADENAS, 0)
    conEteres(s0, 'A', 2)
    conMistica(s0, 'B', 'bm', PR.AVISO, 0)
    const ctx = crearCtx()
    let s = structuredClone(s0)
    apilarTriggers(s, ctx, construirTriggers(s, 'al-activar-habilidad', 'A', ['rc']))
    expect(s.declaracionEnEleccion).toBeDefined() // la Mística de B es la única opción pero se elige igual
    s = aplicar(s, elegir('bm'), ctx)
    expect(s.cadena!.triggers).toHaveLength(1)
    expect(s.players.A.eterReserva).toHaveLength(2) // el costo NO se cobró al apilar
    return { s, ctx }
  }

  it('(c) el costo de Éter se cobra AL RESOLVER: con fondos paga y el efecto ocurre', () => {
    const { s: s1, ctx } = rompecadenas()
    const s = cerrar(s1, ctx)
    expect(s.players.A.eterReserva).toHaveLength(0)
    expect(s.players.A.eterPagado).toHaveLength(2)
    expect(s.players.B.cementerio).toContain('bm')
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('(c) sin fondos al resolver: fizzle, no cobra nada y la Mística sigue', () => {
    const { s: s1, ctx } = rompecadenas()
    const s0 = structuredClone(s1)
    s0.players.A.cementerio.push(...s0.players.A.eterReserva.splice(0)) // gastó su Éter mientras tanto
    const s = cerrar(s0, ctx)
    expect(s.players.A.eterPagado).toHaveLength(0)
    expect(s.players.B.campo.misticasTacticas).toContain('bm')
    expect(s.players.B.cementerio).toEqual([])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('un efecto sin elección (roba 1) se ejecuta al resolver, sin pendientes', () => {
    const s = escena()
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    conArcana(s, 'B', 'arc', 'TEST-ARC', 0, { bocaArriba: true })
    conMistica(s, 'A', 'am', PR.AVISO, 0) // A puede responder: la ventana abre (el trigger es de B → prioridad del rival de A... ver abajo)
    const ctx = crearCtx()
    const manoAntes = s.players.B.mano.length
    s.turno = 'B' // el turno es de B: el rival es A
    apilarTriggers(s, ctx, construirTriggers(s, 'al-atacar', 'B', ['arc']))
    expect(s.declaracionEnEleccion).toBeUndefined() // nada que elegir
    expect(s.cadena?.triggers).toHaveLength(1)
    expect(s.cadena?.prioridad).toBe('A')
    expect(s.players.B.mano.length).toBe(manoAntes)
    const t = cerrar(s, ctx)
    expect(t.players.B.mano.length).toBe(manoAntes + 1)
  })
})

/* ───────────────────────── Decisión 10b: condicion al apilar ───────────────────────── */

describe('decisión 10b: la condicion se evalúa AL APILAR, no al resolver', () => {
  /** A: c0 TEST-COND (al invocar con `condicion`: el rival controla 2+). B: b0 y b1 Peones; bm Aviso para que la ventana abra. */
  function escenaCondicion(): GameState {
    const s = escena()
    conCampeon(s, 'A', 'c0', 'TEST-COND', 0)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conCampeon(s, 'B', 'b1', PR.PEON, 1)
    conMistica(s, 'B', 'bm', PR.AVISO, 0) // B puede responder: la ventana abre y el trigger queda en la cadena
    return s
  }

  it('sin cumplirse AL APILAR no hay trigger: construirTriggers da [], nadie abre ventana y el camino inmediato no dispara', () => {
    const s = escena()
    conCampeon(s, 'A', 'c0', 'TEST-COND', 0)
    conCampeon(s, 'B', 'b0', PR.PEON, 0) // el rival controla 1 < 2: la condicion NO se cumple
    const ctx = crearCtx()
    expect(triggersQueMatchean(s, 'al-invocar', 'A', ['c0'])).toEqual([])
    expect(construirTriggers(s, 'al-invocar', 'A', ['c0'])).toEqual([])
    apilarTriggers(s, ctx, construirTriggers(s, 'al-invocar', 'A', ['c0']))
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toBeUndefined()
    dispararTrigger(s, ctx, 'al-invocar', 'A', ['c0']) // el camino inmediato la evalúa AL DISPARAR (sin cambio)
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(valores(s, 'b0')).toEqual([])
  })

  it('NO se re-evalúa al resolver: cumplida al apilar, el efecto ocurre aunque deje de cumplirse', () => {
    const s = escenaCondicion()
    const ctx = crearCtx()
    expect(construirTriggers(s, 'al-invocar', 'A', ['c0'])).toHaveLength(1) // la condicion se cumple AL APILAR
    apilarTriggers(s, ctx, construirTriggers(s, 'al-invocar', 'A', ['c0']))
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'triggers', pendientes: 1 })
    let t = aplicar(s, elegir('b0'), ctx) // el dueño (A) elige el objetivo entre los Campeones rivales
    expect(t.cadena!.triggers).toEqual([expect.objectContaining({ cardInstanceId: 'c0', objetivoId: 'b0' })])
    // ANTES de resolver, el rival deja de controlar 2: si la condicion se re-evaluara, el trigger se perdería
    t = structuredClone(t)
    t.players.B.campo.campeones[1] = null
    t.players.B.cementerio.push('b1')
    expect(triggersQueMatchean(t, 'al-invocar', 'A', ['c0'])).toEqual([]) // la condicion ya no pasa…
    const r = cerrar(t, ctx)
    expect(valores(r, 'b0')).toEqual([-2]) // …pero el trigger ya estaba apilado: resuelve igual (debuff de 2)
    expect(valores(r, 'b1')).toEqual([])
    expect(verificarZonaUnica(r)).toEqual([])
  })
})

/* ───────────────────────── Decisión (g): anidados ───────────────────────── */

describe('trigger de acción generado durante una resolución (decisión g)', () => {
  it('con profundidadTriggers > 0 no abre ventana ni se apila: resuelve ya (LIFO), sus elecciones van a la cola', () => {
    const s = mesa()
    const ctx = crearCtx()
    s.profundidadTriggers = 1
    apilarTriggers(s, ctx, listaMesa(s))
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toBeUndefined()
    // como dispararTrigger: arman pendientes clásicos (rival primero)
    expect(s.objetivosPendientes!.map((p) => [p.jugador, p.instId])).toEqual([['B', 'hb'], ['A', 'ha']])
  })

  it('el tope de anidamiento descarta el trigger (sin recursión infinita)', () => {
    const s = mesa()
    s.profundidadTriggers = MAX_PROFUNDIDAD_TRIGGERS
    apilarTriggers(s, crearCtx(), listaMesa(s))
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(valores(s, 'a0')).toEqual([])
  })

  it('resolverPila marca la profundidad mientras resuelve y la limpia al terminar', () => {
    const { s: s1, ctx } = apilado(mesa())
    const s = cerrar(s1, ctx)
    expect('profundidadTriggers' in s).toBe(false)
  })
})

/* ───────────────────────── No regresión del juego real ───────────────────────── */

describe('no regresión del juego real (F5d-3: producción apila SOLO al-jugar-mistica)', () => {
  it('ningún módulo de producción llama a apilarTriggers (el apilado va por declararOpener)', () => {
    const dir = path.resolve(__dirname, '..')
    const productivos = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'triggers.ts' && f !== 'index.ts')
    for (const f of productivos) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      expect(/apilarTriggers\(/.test(src), `${f} llama a apilarTriggers`).toBe(false)
    }
  })

  it('simulaciones reales (bots) con mazos de prueba: solo triggers de al-jugar-mistica y sin profundidad', () => {
    for (const seed of [1, 2, 3, 42]) {
      const { state, ctx } = crearPartidaPrueba(seed)
      let s = state
      for (let i = 0; i < 400 && s.fase !== 'terminada'; i++) {
        const actor = actorActual(s)!
        const accion = botTonto(s, actor)
        if (!accion) throw new Error(`seed ${seed}: el bot no encontró acción (iter ${i})`)
        const r = applyAction(s, accion, ctx)
        if (!r.ok) throw new Error(`seed ${seed}: ${accion.type} falló: ${r.error}`)
        s = r.state
        // F5d-3 (regla aprobada): producción YA apila, pero solo al-jugar-mistica (F5d-4/5 pendientes):
        // antes este test exigía que NUNCA hubiera triggers en la cadena — eso contradice el cableado.
        for (const t of s.cadena?.triggers ?? []) expect(t.trigger, `seed ${seed} iter ${i}`).toBe('al-jugar-mistica')
        for (const t of s.declaracionEnEleccion?.triggers ?? []) expect(t.trigger, `seed ${seed} iter ${i}`).toBe('al-jugar-mistica')
        expect(s.profundidadTriggers, `seed ${seed} iter ${i}`).toBeUndefined()
      }
    }
  })
})

/* ───────────────────────── Simulaciones con apilado inyectado ───────────────────────── */

/**
 * Hook de test: cada `cada` iteraciones, con el juego en reposo (Forja, sin cadena ni elecciones, turno del
 * actor), apila los triggers de acción de TODOS los Campeones en mesa (las dos manos) y deja que los bots
 * elijan, respondan y pasen. Comprueba que no hay freeze, que cada estado es serializable y que la zona
 * es única; el estado final conserva las invariantes completas del mazo.
 */
function simularConApilado(seed: number, cada = 5, maxIter = 700): { apilados: number; terminada: boolean; iteraciones: number } {
  const { state, ctx } = crearPartidaPrueba(seed)
  let s = state
  let apilados = 0
  let i = 0
  for (; i < maxIter && s.fase !== 'terminada'; i++) {
    const reposo = s.fase === 'forja' && !s.cadena && !s.declaracionEnEleccion && !s.combate && !s.objetivosPendientes?.length &&
      !s.preventivosPendientes?.length && !s.opcionesPendientes?.length && !s.equiparPendiente && !s.efectosPendientes?.length
    if (reposo && i % cada === 3) {
      const c = structuredClone(s)
      const lista: TriggerApilado[] = []
      for (const j of ['A', 'B'] as const) {
        const ids = c.players[j].campo.campeones.filter((x): x is string => x !== null)
        for (const trigger of ['al-invocar', 'al-atacar'] as const) lista.push(...construirTriggers(c, trigger, j, ids))
      }
      if (lista.length > 0) {
        apilarTriggers(c, ctx, lista)
        apilados += lista.length
        s = c
        expect(verificarZonaUnica(s), `seed ${seed} iter ${i} tras apilar`).toEqual([])
      }
    }
    const actor = actorActual(s)
    if (!actor) break
    const accion = botTonto(s, actor)
    if (!accion) throw new Error(`seed ${seed}: freeze en iteración ${i} (actor ${actor}, fase ${s.fase}, cadena ${!!s.cadena}, decl ${s.declaracionEnEleccion?.tipo})`)
    const r = applyAction(s, accion, ctx)
    if (!r.ok) throw new Error(`seed ${seed}: ${accion.type} falló: ${r.error}`)
    s = r.state
    expect(verificarZonaUnica(s), `seed ${seed} iter ${i} (${accion.type})`).toEqual([])
    expect(s.profundidadTriggers).toBeUndefined()
    if (i % 25 === 0) expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  }
  expect(verificarInvariantes(s), `seed ${seed} final`).toEqual([])
  return { apilados, terminada: s.fase === 'terminada', iteraciones: i }
}

describe('simulaciones con apilado inyectado (hook de test sobre el flujo del bot)', () => {
  for (const seed of [66099, 66676, 1, 2, 3, 7, 42, 12345]) {
    it(`seed ${seed}: sin freeze, estados serializables y zona única`, () => {
      const r = simularConApilado(seed)
      expect(r.iteraciones).toBeGreaterThan(20)
      expect(r.apilados).toBeGreaterThanOrEqual(0)
    })
  }

  it('el hook sí apila triggers en alguna seed (la prueba no es vacía)', () => {
    const total = [1, 2, 3, 7].reduce((n, seed) => n + simularConApilado(seed).apilados, 0)
    expect(total).toBeGreaterThan(0)
  })
})
