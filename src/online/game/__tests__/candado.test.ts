// @vitest-environment node
/**
 * F5g — condición de Arcana = "candado y llave", `controlador: rival`, `equipped_champion` y fizzle de Artefactos.
 *
 *  1. La condición de una Arcana con trigger inicio_alba / inicio_choque se evalúa AL OCURRIR ese momento (el Alba / el
 *     Choque de su CONTROLADOR): cumplida -> habilitada y puede activarse en cualquier momento posterior; se conserva
 *     aunque la condición deje de cumplirse; se re-evalúa en la siguiente ocurrencia. Las demás (trigger `activacion`...)
 *     se evalúan en vivo. Además rige "no el turno en que se coloca" (entradaEsteTurno).
 *  2. `objetivo.controlador: 'rival'` cuenta a los Campeones del RIVAL (FB-024).
 *  3. El objetivo `equipped_champion` resuelve al Campeón al que está equipado el Artefacto que usa el efecto.
 *  4. Un Artefacto jugado/activado como respuesta cuyo Campeón desaparece antes de resolver pierde su efecto, va al
 *     Cementerio una sola vez, sale de la pila y deja el Éter pagado en la zona de pago.
 * Usa las cartas reales FB-023 / FB-024 / DS-032 y el set de prueba PR-xxx (helpers/cartasPrueba.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { motivoArcanaNoActivable, cadenaActiva } from '../chain'
import { condicionCumple, evaluarCandadosArcanas, statsDe } from '../efectos'
import { etersParaPagar } from '../payments'
import { resolveTargets } from '../targetResolver'
import { destruirCarta } from '../replacements'
import { visibleState } from '../visibleState'
import { botTonto } from '../bot'
import { getCardMeta } from '../cards'
import { createInitialState } from '../initialState'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'
import type { Ctx, GameState, PlayerId } from '../types'
import type { CondicionEfecto } from '../../../shared/types'
import {
  PR, cargarCartasPrueba, mazoPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
  conArcana, inst,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
})

const pago = (s: GameState, j: PlayerId, cardId: string) => etersParaPagar(s, j, cardId)!
const pasar = (s: GameState, ctx: Ctx, veces: number) => {
  for (let i = 0; i < veces; i++) s = aplicar(s, { type: 'pasar_turno' }, ctx)
  return s
}
/** Ids que aparecen en más de una zona (o dos veces en la misma): estado inconsistente. */
function zonasDuplicadas(s: GameState): string[] {
  const cuenta = new Map<string, number>()
  for (const j of ['A', 'B'] as PlayerId[]) {
    const p = s.players[j]
    const ids = [...p.mano, ...p.mazo, ...p.cementerio, ...p.exilio, ...p.eterReserva, ...p.eterPagado, ...p.campo.campeones, ...p.campo.misticasTacticas, ...p.campo.arcanasCombate, ...p.vinculos]
    for (const id of ids) if (id) cuenta.set(id, (cuenta.get(id) ?? 0) + 1)
  }
  return [...cuenta].filter(([, n]) => n > 1).map(([id]) => id)
}
const evs = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)

function escena(turno: PlayerId = 'A'): GameState {
  const s = escenaVacia('forja')
  s.turno = turno
  conMazo(s, 'A', 8)
  conMazo(s, 'B', 8)
  return s
}

/** Campeón PR-010 con `n` Éteres bloqueados (instancias reales, para que el Alba no los toque). */
function conBloqueados(s: GameState, owner: PlayerId, id: string, slot: number, n = 1): string {
  conCampeon(s, owner, id, PR.PEON, slot)
  const eb = Array.from({ length: n }, (_, i) => inst(s, `${id}-eb${i}`, PR.ETER, owner))
  s.instances[id].eterBloqueado = eb
  return id
}

/** FB-023 (inicio_alba, 2 Campeones propios con Éter bloqueado) colocada en un turno ANTERIOR, lista para el Alba de A. */
function escenaFB023(): GameState {
  const s = escena('A')
  conBloqueados(s, 'A', 'c1', 0)
  conBloqueados(s, 'A', 'c2', 1)
  conArcana(s, 'A', 'arc', 'FB-023', 0)
  conEteres(s, 'A', 2)
  conCampeon(s, 'B', 'b0', PR.PEON, 0)
  return s
}

describe('candado y llave: inicio_alba (FB-023)', () => {
  it('nace cerrado; el Alba del OTRO jugador no lo evalúa; el Alba de su controlador lo abre; se activa en cualquier fase', () => {
    const ctx = crearCtx()
    let s = escenaFB023()
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).not.toBeNull() // nunca evaluada
    s = pasar(s, ctx, 3) // forja -> choque -> ocaso -> Alba de B
    expect(s.turno).toBe('B')
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined() // el Alba de B no es la de su controlador
    s = pasar(s, ctx, 3) // Alba de A
    expect(s.turno).toBe('A')
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    // NO solo en el Alba: ya en la Forja y también en el Choque
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).toBeNull()
    s = pasar(s, ctx, 1)
    expect(s.fase).toBe('choque')
    const r = applyAction(s, { type: 'activar_arcana', cardInstanceId: 'arc', slot: 0, eterIds: pago(s, 'A', 'FB-023') }, ctx)
    expect(r.ok).toBe(true)
  })

  it('se conserva si pierdo un Campeón a media vuelta, se deshabilita en el SIGUIENTE Alba y se rehabilita después', () => {
    const ctx = crearCtx()
    let s = pasar(escenaFB023(), ctx, 6) // Alba de A: habilitada
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    // el rival destruye un Campeón con Éter bloqueado: la condición ya no se cumple EN VIVO, pero el candado sigue abierto
    destruirCarta(s, ctx, 'c2', 'efecto')
    expect(condicionCumple(s, (getCardMeta('FB-023') as { condicion?: CondicionEfecto }).condicion, 'A')).not.toBeNull()
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).toBeNull()
    // sigue abierto durante el turno del rival...
    s = pasar(s, ctx, 3)
    expect(s.turno).toBe('B')
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    // ...hasta el siguiente Alba de A: ya solo hay 1 -> deshabilitada
    s = pasar(s, ctx, 3)
    expect(s.turno).toBe('A')
    expect(s.instances['arc'].condicionHabilitada).toBe(false)
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).not.toBeNull()
    // un Campeón nuevo con Éter bloqueado: sigue cerrada hasta el Alba posterior
    conBloqueados(s, 'A', 'c3', 1)
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).not.toBeNull()
    s = pasar(s, ctx, 6)
    expect(s.turno).toBe('A')
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).toBeNull()
  })

  it('una Arcana colocada este turno no se habilita: su primer candado es el primer Alba posterior', () => {
    const ctx = crearCtx()
    const s0 = escena('A')
    conBloqueados(s0, 'A', 'c1', 0)
    conBloqueados(s0, 'A', 'c2', 1)
    conMano(s0, 'A', 'arc', 'FB-023')
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    let s = aplicar(s0, { type: 'colocar_arcana', cardInstanceId: 'arc', slot: 0 }, ctx)
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
    // aunque se evalúe un inicio de Alba con la carta recién colocada, no se habilita
    const copia = structuredClone(s)
    evaluarCandadosArcanas(copia, 'inicio_alba', 'A')
    expect(copia.instances['arc'].condicionHabilitada).toBeUndefined()
    s = pasar(s, ctx, 3) // Alba de B
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).not.toBeNull()
    s = pasar(s, ctx, 3) // Alba de A (turno N+2): el primer trigger posterior
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
  })

  it('volver a colocar la Arcana limpia el candado anterior; salir del campo también', () => {
    const ctx = crearCtx()
    const s0 = escenaFB023()
    s0.instances['arc'].condicionHabilitada = true
    destruirCarta(s0, ctx, 'c1', 'efecto') // el candado no depende de los Campeones
    expect(s0.instances['arc'].condicionHabilitada).toBe(true)
    // la Arcana sale del campo (a la mano, p. ej.) y se vuelve a colocar: candado nuevo
    s0.players.A.campo.arcanasCombate[0] = null
    s0.players.A.mano.push('arc')
    delete s0.instances['arc'].bocaArriba
    const s = aplicar(s0, { type: 'colocar_arcana', cardInstanceId: 'arc', slot: 0 }, ctx)
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
  })

  it('al irse al Cementerio el candado se borra', () => {
    const ctx = crearCtx()
    const s = escenaFB023()
    s.instances['arc'].condicionHabilitada = true
    s.players.A.campo.arcanasCombate[0] = 'arc'
    // moverAlCementerio vía destrucción por enviarAlCementerio
    return import('../replacements').then(({ enviarAlCementerio }) => {
      enviarAlCementerio(s, ctx, 'arc')
      expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
      expect(s.players.A.cementerio).toContain('arc')
    })
  })

  it('el estado del candado no se filtra al rival (visibleState) pero el dueño lo ve', () => {
    const s = escenaFB023()
    s.instances['arc'].condicionHabilitada = true
    expect(visibleState(s, 'B').instances['arc']).toMatchObject({ cardId: null })
    expect(visibleState(s, 'B').instances['arc'].condicionHabilitada).toBeUndefined()
    expect(visibleState(s, 'A').instances['arc'].condicionHabilitada).toBe(true)
  })
})

describe('candado y llave: inicio_choque (DS-032) y Arcanas sin trigger de candado', () => {
  /** DS-032: inicio_choque, 2 Campeones propios con Éter bloqueado. */
  function escenaDS032(turno: PlayerId, enMano: boolean): GameState {
    const s = escena(turno)
    conBloqueados(s, 'A', 'c1', 0)
    conBloqueados(s, 'A', 'c2', 1)
    if (enMano) conMano(s, 'A', 'arc', 'DS-032')
    else conArcana(s, 'A', 'arc', 'DS-032', 0)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    return s
  }

  it('solo el Choque de su controlador lo evalúa (el Choque del rival no)', () => {
    const ctx = crearCtx()
    let s = escenaDS032('B', false)
    s = pasar(s, ctx, 1) // Choque de B
    expect(s.fase).toBe('choque')
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
    s = pasar(s, ctx, 2) // ocaso de B -> Alba/Forja de A
    expect(s.turno).toBe('A')
    expect(s.fase).toBe('forja')
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined() // el Alba de A no es el trigger de esta Arcana
    s = pasar(s, ctx, 1) // Choque de A
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).toBeNull()
  })

  it('colocada este turno no evalúa en el Choque del mismo turno; sí en el siguiente Choque propio', () => {
    const ctx = crearCtx()
    let s = aplicar(escenaDS032('A', true), { type: 'colocar_arcana', cardInstanceId: 'arc', slot: 0 }, ctx)
    s = pasar(s, ctx, 1) // Choque de A, mismo turno de colocación
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
    s = pasar(s, ctx, 3) // ocaso de A -> Forja de B -> Choque de B
    expect(s.turno).toBe('B')
    expect(s.fase).toBe('choque')
    expect(s.instances['arc'].condicionHabilitada).toBeUndefined()
    s = pasar(s, ctx, 2) // ocaso de B -> Alba/Forja de A
    s = pasar(s, ctx, 1) // Choque de A
    expect(s.instances['arc'].condicionHabilitada).toBe(true)
  })

  it('una Arcana con trigger `activacion` (PR-060) se evalúa EN VIVO: no hay candado', () => {
    const s = escena('A')
    conArcana(s, 'A', 'pacto', PR.PACTO, 0)
    expect(motivoArcanaNoActivable(s, 'A', 'pacto')).not.toBeNull() // exige >=1 carta en mano
    conMano(s, 'A', 'rel', PR.PEON)
    expect(motivoArcanaNoActivable(s, 'A', 'pacto')).toBeNull()
    s.players.A.mano = []
    expect(motivoArcanaNoActivable(s, 'A', 'pacto')).not.toBeNull() // en vivo: no conserva nada
    for (const trig of ['inicio_alba', 'inicio_choque'] as const) {
      evaluarCandadosArcanas(s, trig, 'A')
      expect(s.instances['pacto'].condicionHabilitada).toBeUndefined()
    }
  })
})

describe('objetivo.controlador: rival cuenta a los Campeones del rival (FB-024)', () => {
  it('FB-024 (controlar_minimo 2, controlador rival): cuenta los Campeones del RIVAL, no los propios', () => {
    const condicion = (getCardMeta('FB-024') as { condicion?: CondicionEfecto }).condicion
    const s = escena('A')
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    conCampeon(s, 'A', 'a1', PR.PEON, 1)
    conCampeon(s, 'A', 'a2', PR.PEON, 2)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    expect(condicionCumple(s, condicion, 'A')).not.toBeNull() // el rival (B) solo tiene 1
    expect(condicionCumple(s, condicion, 'B')).toBeNull() // el rival de B (A) tiene 3
    conCampeon(s, 'B', 'b1', PR.PEON, 1)
    expect(condicionCumple(s, condicion, 'A')).toBeNull()
    s.players.A.campo.campeones = [null, null, null, null, null]
    expect(condicionCumple(s, condicion, 'B')).not.toBeNull()
    expect(condicionCumple(s, condicion, 'A')).toBeNull() // los de B siguen siendo 2
  })

  it('FB-024 se habilita en el Alba de su controlador contando los Campeones del rival', () => {
    const s = escena('A')
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conCampeon(s, 'B', 'b1', PR.PEON, 1)
    conCampeon(s, 'A', 'a0', PR.PEON, 0)
    conArcana(s, 'A', 'filo', 'FB-024', 0)
    evaluarCandadosArcanas(s, 'inicio_alba', 'A')
    expect(s.instances['filo'].condicionHabilitada).toBe(true)
    s.players.B.campo.campeones[1] = null
    evaluarCandadosArcanas(s, 'inicio_alba', 'A')
    expect(s.instances['filo'].condicionHabilitada).toBe(false)
  })

  it('las condiciones `propio` y rival_* siguen contando a quien decían (FB-023, DS-023)', () => {
    const s = escena('A')
    conBloqueados(s, 'A', 'c1', 0)
    conBloqueados(s, 'A', 'c2', 1)
    conBloqueados(s, 'B', 'b0', 0)
    expect(condicionCumple(s, (getCardMeta('FB-023') as { condicion?: CondicionEfecto }).condicion, 'A')).toBeNull()
    expect(condicionCumple(s, (getCardMeta('FB-023') as { condicion?: CondicionEfecto }).condicion, 'B')).not.toBeNull()
    const ds023 = (getCardMeta('DS-023') as { condicion?: CondicionEfecto }).condicion // rival con >=3 Campeones con Éter
    expect(condicionCumple(s, ds023, 'B')).not.toBeNull() // A tiene 2
    conBloqueados(s, 'A', 'c3', 2)
    expect(condicionCumple(s, ds023, 'B')).toBeNull()
  })
})

describe('equipped_champion resuelve al Campeón equipado (bug de targetResolver)', () => {
  const objetivo = { tipo: 'equipped_champion', controlador: 'propio', zona: 'campo' } as const

  it('resolveTargets: el Campeón al que apunta equipadoA del Artefacto fuente; sin fuente, sin equipar o fuera del campo, nada', () => {
    const s = escena('B')
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conCampeon(s, 'B', 'b1', PR.PEON, 1)
    conArcana(s, 'B', 'filo', 'FB-024', 0)
    expect(resolveTargets(s, objetivo, 'B', 'filo')).toEqual([])
    s.instances['filo'].equipadoA = 'b1'
    expect(resolveTargets(s, objetivo, 'B', 'filo')).toEqual(['b1'])
    expect(resolveTargets(s, objetivo, 'B')).toEqual([])
    s.players.B.campo.campeones[1] = null
    expect(resolveTargets(s, objetivo, 'B', 'filo')).toEqual([])
  })

  it('FB-024 real respondiendo: el buff +2 ATQ cae sobre el Campeón elegido al equipar y la Arcana permanece', () => {
    const s0 = escena('A')
    conMano(s0, 'A', 'op', PR.RAYO)
    conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'A', 'a1', PR.PEON, 1)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    conArcana(s0, 'B', 'filo', 'FB-024', 0, { condicionHabilitada: true })
    conEteres(s0, 'B', 2)
    const base = statsDe(s0, 'b0').poder
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'op', slot: 0, eterIds: pago(s0, 'A', PR.RAYO) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'filo' }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // equipa a b0
    expect(s.instances['filo'].equipadoA).toBe('b0')
    expect(s.objetivosPendientes ?? []).toHaveLength(0) // el Campeón equipado es implícito: sin elección extra
    s = aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'b0').poder).toBe(base + 2)
    expect(s.players.B.campo.arcanasCombate[0]).toBe('filo')
  })
})

describe('fizzle: el Artefacto jugado como respuesta pierde a su Campeón antes de resolver (F5g)', () => {
  /**
   * A abre con el Rayo (b1). B responde con el Artefacto y elige equiparlo a b0. A responde con la Fugaz Demoledora
   * contra b0: la Fugaz resuelve primero (cierra la pila al instante) y el Artefacto ya no tiene receptor.
   */
  function hastaEquipado(tipo: 'mano' | 'arcana', arcanaId: string = PR.FILO_ARCANA): { s: GameState; ctx: Ctx } {
    const s0 = escena('A')
    conMano(s0, 'A', 'op', PR.RAYO)
    conMano(s0, 'A', 'fug', PR.FUGAZ_DEMOLEDORA)
    conEteres(s0, 'A', 3)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'A', 'a1', PR.PEON, 1)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    if (tipo === 'mano') conMano(s0, 'B', 'art', PR.ARTEFACTO_VELOZ)
    else conArcana(s0, 'B', 'art', arcanaId, 0, { condicionHabilitada: true })
    conEteres(s0, 'B', 2)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'op', slot: 0, eterIds: pago(s0, 'A', PR.RAYO) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    s =
      tipo === 'mano'
        ? aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'art', eterIds: pago(s, 'B', PR.ARTEFACTO_VELOZ) }, ctx)
        : aplicar(s, { type: 'responder_cadena', cardInstanceId: 'art' }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // se equipa a b0
    expect(s.instances['art'].equipadoA).toBe('b0')
    expect(cadenaActiva(s)?.pila).toEqual(['art'])
    return { s, ctx }
  }

  function fugazContraB0(s: GameState, ctx: Ctx): GameState {
    let r = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'fug', eterIds: pago(s, 'A', PR.FUGAZ_DEMOLEDORA) }, ctx)
    r = aplicar(r, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    return r
  }

  it('Mística Artefacto con Presteza desde la mano: la Fugaz destruye a b0; el Artefacto va UNA vez al Cementerio, su efecto se pierde y el Éter queda pagado', () => {
    const { s: s1, ctx } = hastaEquipado('mano')
    const manoB = s1.players.B.mano.length
    const mazoB = s1.players.B.mazo.length
    const s = fugazContraB0(s1, ctx)
    expect(s.cadena).toBeUndefined() // la Fugaz cerró la pila; sin freeze
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(s.players.B.cementerio.filter((x) => x === 'art')).toHaveLength(1)
    expect(s.players.B.campo.misticasTacticas).not.toContain('art')
    expect(s.players.B.campo.arcanasCombate).not.toContain('art')
    expect(s.players.B.mano).toHaveLength(manoB) // no robó: su efecto (draw) se perdió
    expect(s.players.B.mazo).toHaveLength(mazoB)
    expect(s.players.B.eterPagado).toHaveLength(1) // el pago de 1 queda en la zona de pago
    expect(s.instances['art'].equipadoA).toBeUndefined()
    expect(s.players.B.cementerio).toContain('b0') // la Fugaz destruyó a b0
    expect(s.players.B.cementerio).toContain('b1') // y el Rayo (opener) resolvió al final sobre b1
    expect(s.players.A.cementerio).toContain('fug')
    expect(zonasDuplicadas(s)).toEqual([])
  })

  it('Arcana Artefacto del campo con Presteza (PR-063) respondiendo: mismo fizzle, la Arcana va al Cementerio y no roba', () => {
    const { s: s1, ctx } = hastaEquipado('arcana')
    const manoB = s1.players.B.mano.length
    const s = fugazContraB0(s1, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.players.B.cementerio.filter((x) => x === 'art')).toHaveLength(1)
    expect(s.players.B.campo.arcanasCombate).not.toContain('art')
    expect(s.players.B.mano).toHaveLength(manoB)
    expect(s.players.B.eterPagado).toHaveLength(2) // PR-063 cuesta 2
    expect(evs(ctx, 'carta_robada').filter((e) => (e as { jugador?: PlayerId }).jugador === 'B')).toHaveLength(0)
    // el evento de salida usa la zona REAL de la Arcana (3D), no la de las Místicas
    expect(ctx.events).toContainEqual({ type: 'carta_salida_de_zona', cardInstanceId: 'art', zona: '3D', jugador: 'B' })
    expect(zonasDuplicadas(s)).toEqual([])
  })

  it('FB-024 real respondiendo (Arcana Artefacto + Presteza): mismo fizzle', () => {
    const { s: s1, ctx } = hastaEquipado('arcana', 'FB-024')
    const statsAntes = statsDe(s1, 'b1').poder
    const s = fugazContraB0(s1, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.players.B.cementerio.filter((x) => x === 'art')).toHaveLength(1)
    expect(s.players.B.campo.arcanasCombate).not.toContain('art')
    expect(s.players.B.eterPagado).toHaveLength(2)
    expect(statsAntes).toBe(statsDe(s, 'b1').poder) // ningún buff se aplicó a otro Campeón
    expect(zonasDuplicadas(s)).toEqual([])
  })

  it('si el Campeón se va SIN Fugaz con el Artefacto aún en la pila: sale de la pila, no queda duplicado y la cadena cierra sin freeze', () => {
    const { s: s1, ctx } = hastaEquipado('mano')
    const s = structuredClone(s1)
    destruirCarta(s, ctx, 'b0', 'efecto') // el Campeón desaparece con la respuesta todavía en la pila
    expect(cadenaActiva(s)?.pila).toEqual([]) // la respuesta salió de la pila al irse al Cementerio
    expect(s.players.B.cementerio.filter((x) => x === 'art')).toHaveLength(1)
    const cierre = aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
    expect(cierre.cadena).toBeUndefined()
    expect(cierre.players.B.cementerio.filter((x) => x === 'art')).toHaveLength(1)
    expect(cierre.players.B.mano).toHaveLength(0) // el draw del Artefacto no se resolvió
    expect(cierre.players.B.eterPagado).toHaveLength(1)
    expect(zonasDuplicadas(cierre)).toEqual([])
  })

  it('control: si el Campeón NO desaparece, el Artefacto resuelve su efecto y permanece en mesa', () => {
    const { s: s1, ctx } = hastaEquipado('mano')
    const mano = s1.players.B.mano.length
    const s = aplicar(aplicar(s1, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
    expect(s.players.B.mano).toHaveLength(mano + 1) // draw
    expect(s.players.B.campo.misticasTacticas).toContain('art')
    expect(s.players.B.cementerio).not.toContain('art')
  })
})

describe('simulación con varias seeds: el candado no introduce freezes ni estados inválidos', () => {
  const seeds = [66099, 66676, 1, 2, 3, 7, 42, 12345]
  const deckA = expandirMazo(ESTASIS_CARDS)
  const deckB = expandirMazo(DISONANCIA_CARDS)
  let habilitaciones = 0

  /**
   * Jugador "respondón": prefiere responder; cada acción debe ser aplicable. No se verifica 'un id, una zona' aquí:
   * la cola de pendientes obsoletos (F5d-1) puede destruir dos veces un objetivo viejo (hallazgo previo a F5g).
   */
  function simular(mazoA: string[], mazoB: string[], seed: number): void {
    const { state, ctx } = createInitialState(mazoA, mazoB, seed)
    let estado = state
    for (let i = 0; i < 1500 && estado.fase !== 'terminada'; i++) {
      const actor = actorActual(estado) ?? estado.turno
      const acciones = getValidActions(estado, actor)
      const propia =
        acciones.find((a) => a.type === 'responder_cadena') ?? acciones.find((a) => a.type === 'jugar_respuesta') ?? null
      const accion = propia ?? botTonto(estado, actor)
      expect(accion, `sin acción para ${actor} (iter ${i})`).not.toBeNull()
      const r = applyAction(estado, accion!, ctx)
      expect(r.ok, `${accion!.type} rechazada: ${r.ok ? '' : r.error}`).toBe(true)
      if (!r.ok) return
      estado = r.state
      for (const instancia of Object.values(estado.instances)) if (instancia.condicionHabilitada) habilitaciones++
    }
  }

  it.each(seeds)('seed %i (set PR): sin freeze y acciones siempre aplicables', (seed) => {
    simular(mazoPrueba(), mazoPrueba(), seed)
  })

  it.each(seeds)('seed %i (mazos reales Estasis vs Disonancia, con FB-023/FB-024/DS-023...): ídem', (seed) => {
    simular(deckA, deckB, seed)
  })

  it('el candado se ejercitó en las simulaciones con mazos reales', () => {
    expect(habilitaciones).toBeGreaterThan(0)
  })
})
