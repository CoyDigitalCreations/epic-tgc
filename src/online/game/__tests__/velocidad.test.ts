// @vitest-environment node
/**
 * F5f — "la velocidad manda". Reglas aprobadas por el usuario tras F5e:
 *  1. Una Arcana solo se activa (activar_arcana Y responder_cadena) si CUMPLE su condición y NO es del turno en que
 *     se colocó (sí desde el turno siguiente: el del rival o cualquiera posterior, incluso el propio).
 *  2. La FUGAZ se juega como respuesta desde la mano y resuelve sin respuesta del rival.
 *  3. Manda la velocidad (normal < Presteza < Fugaz), no el tipo de carta ni si permanece en mesa: Artefactos con
 *     Presteza (Mística desde la mano, Arcana desde el campo) participan como respuesta.
 *  4. UNA sola regla de elegibilidad (chain.ts motivoNoResponde) para respondiblesDe, respuestasDeMano,
 *     validarResponderCadena, validarJugarRespuesta, getValidActions y el gate de apertura.
 * Usa el set de prueba PR-xxx (helpers/cartasPrueba.ts) y, para FB-024, la carta real.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { cadenaActiva, respondiblesDe, respuestasDeMano, validarJugarRespuesta, validarResponderCadena } from '../chain'
import { etersParaPagar } from '../payments'
import { statsDe } from '../efectos'
import { botTonto } from '../bot'
import { createInitialState } from '../initialState'
import { verificarZonaUnica } from '../invariants'
import type { Action } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  PR, cargarCartasPrueba, mazoPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
  conMistica, conArcana,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
})

const evs = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)
const idxEv = (ctx: Ctx, tipo: string, f: (e: any) => boolean = () => true) => ctx.events.findIndex((e) => e.type === tipo && f(e))
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const tipos = (s: GameState, j: 'A' | 'B') => getValidActions(s, j).map((a) => a.type)
const pagoDe = (s: GameState, j: 'A' | 'B', cardId: string) => etersParaPagar(s, j, cardId)!
const pasarTurno = (s: GameState, ctx: Ctx, veces = 3) => {
  for (let i = 0; i < veces; i++) s = aplicar(s, { type: 'pasar_turno' }, ctx)
  return s
}

function base(fase: GameState['fase'] = 'forja'): GameState {
  const s = escenaVacia(fase)
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/**
 * A juega `opener` (de su mano, con sus Éteres) en su Forja; `objetivo` es el objetivo que elige (si pide). Queda abierta la
 * ventana con la prioridad de B. Devuelve el estado y el ctx. `extra` arma la escena antes de jugar.
 */
function abre(opener: string, objetivo: string | null, extra: (s: GameState) => void): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conMano(s0, 'A', 'op', opener)
  conEteres(s0, 'A', 3) // 1 de sobra para que A también pueda responder con una carta barata
  conCampeon(s0, 'A', 'a0', PR.PEON, 0)
  extra(s0)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'op', slot: 0, eterIds: pagoDe(s0, 'A', opener) }, ctx)
  if (objetivo) s = aplicar(s, { type: 'elegir_objetivo', objetivoId: objetivo }, ctx)
  return { s, ctx }
}

/* ───────────────────── 1. Condición de la Arcana y turno de colocación ───────────────────── */

describe('Arcana: solo se activa (y responde) si cumple su condición (F5f)', () => {
  it('activar_arcana: sin su condición (PR-060 exige ≥1 carta en mano) se rechaza y no se ofrece; cumplida, sí', () => {
    const s0 = base()
    conArcana(s0, 'A', 'pacto', PR.PACTO, 0)
    conEteres(s0, 'A', 2)
    const accion: Action = { type: 'activar_arcana', cardInstanceId: 'pacto', slot: 0, eterIds: pagoDe(s0, 'A', PR.PACTO) }
    const ctx = crearCtx()
    expect(applyAction(s0, accion, ctx).ok).toBe(false)
    expect(tipos(s0, 'A')).not.toContain('activar_arcana')
    conMano(s0, 'A', 'relleno', PR.PEON)
    expect(applyAction(s0, accion, ctx).ok).toBe(true)
    expect(tipos(s0, 'A')).toContain('activar_arcana')
  })

  it('responder: con la condición sin cumplir no es respondible, no se ofrece, se rechaza y no cuenta para abrir la ventana; cumplida, sí', () => {
    const preparar = (conCartaEnMano: boolean) =>
      abre(PR.RAYO, 'b0', (s0) => {
        conCampeon(s0, 'B', 'b0', PR.PEON, 0)
        conArcana(s0, 'B', 'pacto', PR.PACTO, 0)
        conEteres(s0, 'B', 2)
        if (conCartaEnMano) conMano(s0, 'B', 'relleno', PR.PEON)
      })
    const sin = preparar(false)
    expect(sin.s.cadena).toBeUndefined() // gate cerrado: el rival no tiene cómo responder
    expect(sin.s.players.B.campo.campeones[0]).toBeNull() // el Rayo resolvió sin ventana

    const con = preparar(true)
    expect(respondiblesDe(con.s, 'B')).toEqual(['pacto'])
    expect(tipos(con.s, 'B')).toContain('responder_cadena')
    // si la condición deja de cumplirse con la ventana abierta, la Arcana deja de ser respondible y se rechaza
    const roto = structuredClone(con.s)
    roto.players.B.mano = []
    expect(respondiblesDe(roto, 'B')).toEqual([])
    expect(validarResponderCadena(roto, 'pacto')).not.toBeNull()
    expect(applyAction(roto, { type: 'responder_cadena', cardInstanceId: 'pacto' }, con.ctx).ok).toBe(false)
    expect(tipos(roto, 'B')).toEqual(['rendirse', 'pasar_prioridad'])
  })

  it('la condición se evalúa para QUIEN responde (rival_controla_minimo de PR-062: necesita un Campeón rival)', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conArcana(s0, 'B', 'tr', PR.TRAMPA, 0)
    conEteres(s0, 'B', 2)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(respondiblesDe(s, 'B')).toEqual(['tr']) // B ve un Campeón rival (a0)
    const sinRival = structuredClone(s)
    sinRival.players.A.campo.campeones[0] = null
    expect(respondiblesDe(sinRival, 'B')).toEqual([])
  })
})

describe('Arcana recién colocada: no activa ni responde el mismo turno; sí desde el turno siguiente (F5f, §5.4)', () => {
  /** A coloca el Pacto en su Forja; B tiene un Rayo y Éter para jugarlo contra a0 en SU turno. */
  function escena(): { s: GameState; ctx: Ctx } {
    const s0 = base()
    conMano(s0, 'A', 'pacto', PR.PACTO)
    conMano(s0, 'A', 'relleno', PR.PEON) // condición de PR-060 cumplida
    conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conMano(s0, 'B', 'rayo', PR.RAYO)
    conEteres(s0, 'B', 2)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'colocar_arcana', cardInstanceId: 'pacto', slot: 0 }, ctx)
    return { s, ctx }
  }

  it('el mismo turno en que se coloca: ni activar_arcana ni respondible', () => {
    const { s, ctx } = escena()
    expect(s.instances['pacto'].entradaEsteTurno).toBe(true)
    expect(applyAction(s, { type: 'activar_arcana', cardInstanceId: 'pacto', slot: 0, eterIds: pagoDe(s, 'A', PR.PACTO) }, ctx).ok).toBe(false)
    expect(tipos(s, 'A')).not.toContain('activar_arcana')
    expect(respondiblesDe(s, 'A')).toEqual([])
    expect(validarResponderCadena({ ...s, cadena: { origen: 'global', pila: [], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' } }, 'pacto')).not.toBeNull()
  })

  it('en el turno del OPONENTE ya responde (la bandera caduca al terminar el turno en que se colocó)', () => {
    const { s: s1, ctx } = escena()
    let s = pasarTurno(s1, ctx) // forja → choque → ocaso → turno de B
    expect(s.turno).toBe('B')
    expect(s.instances['pacto'].entradaEsteTurno).toBeUndefined()
    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pagoDe(s, 'B', PR.RAYO) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(s.cadena?.prioridad).toBe('A')
    expect(respondiblesDe(s, 'A')).toEqual(['pacto'])
    expect(tipos(s, 'A')).toContain('responder_cadena')
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'pacto' }, ctx)
    expect(s.cadena?.pila).toEqual(['pacto'])
  })

  it('en el turno siguiente PROPIO la activa con activar_arcana (y responde si el oponente abre una cadena)', () => {
    const { s: s1, ctx } = escena()
    let s = pasarTurno(s1, ctx) // turno de B
    s = pasarTurno(s, ctx) // turno de A otra vez
    expect(s.turno).toBe('A')
    expect(tipos(s, 'A')).toContain('activar_arcana')
    expect(applyAction(s, { type: 'activar_arcana', cardInstanceId: 'pacto', slot: 0, eterIds: pagoDe(s, 'A', PR.PACTO) }, ctx).ok).toBe(true)
  })
})

/* ───────────────────────────── 2. Fugaz desde la mano ───────────────────────────── */

describe('Fugaz como respuesta desde la mano: resuelve sin ventana para el rival (F5f, manual §10)', () => {
  it('responde a una jugada normal: se paga, elige su objetivo al responder, la pila cierra al instante y resuelve LIFO (antes que el opener)', () => {
    const { s: s1, ctx } = abre(PR.RAYO, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMano(s0, 'B', 'fug', PR.FUGAZ)
      conEteres(s0, 'B', 1)
    })
    expect(respuestasDeMano(s1, 'B')).toEqual(['fug'])
    const jugar = getValidActions(s1, 'B').find((a) => a.type === 'jugar_respuesta')
    expect(jugar).toEqual({ type: 'jugar_respuesta', cardInstanceId: 'fug', eterIds: pagoDe(s1, 'B', PR.FUGAZ) })
    let s = aplicar(s1, jugar!, ctx)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta', jugador: 'B' }) // elige el campeón a potenciar
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    // sin ventana para el rival: la pila ya se cerró y el Rayo (opener) resolvió DESPUÉS de la Fugaz
    expect(s.cadena).toBeUndefined()
    expect(evs(ctx, 'respuesta_encadenada')).toHaveLength(1)
    expect(idxEv(ctx, 'destruccion', (e) => e.cardInstanceId === 'b0')).toBeGreaterThan(-1)
    expect(s.players.B.cementerio).toEqual(expect.arrayContaining(['fug', 'b0']))
    expect(s.players.A.cementerio).toContain('op')
    expect(tipos(s, 'A')).toContain('pasar_turno') // A recupera su turno sin pasar prioridad forzada
  })

  it('responde a una Presteza apilada y también al opener Presteza; tras la Fugaz el rival no recibe prioridad', () => {
    // opener Presteza (A) → Fugaz de B
    const { s: s1, ctx } = abre(PR.PRESTEZA_DEBIL, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMano(s0, 'B', 'fug', PR.FUGAZ)
      conMano(s0, 'B', 'manoNormal', PR.PEON)
      conEteres(s0, 'B', 2)
    })
    expect(respuestasDeMano(s1, 'B')).toEqual(['fug']) // la Fugaz sí; el Campeón normal de la mano no
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'fug', eterIds: pagoDe(s1, 'B', PR.FUGAZ) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.cadena).toBeUndefined()

    // opener normal → Presteza de B (de la mano) → Fugaz de A (de la mano) cierra todo sin dar prioridad a B
    const { s: t1, ctx: ctxT } = abre(PR.RAYO, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMano(s0, 'B', 'pre', PR.PRESTEZA_ROBA)
      conEteres(s0, 'B', 1)
      conMano(s0, 'A', 'fugA', PR.FUGAZ)
    })
    // el estado de A: la Fugaz de A no puede jugarse mientras la prioridad es de B
    const conPresteza = aplicar(t1, { type: 'jugar_respuesta', cardInstanceId: 'pre', eterIds: pagoDe(t1, 'B', PR.PRESTEZA_ROBA) }, ctxT)
    expect(conPresteza.cadena).toMatchObject({ pila: ['pre'], prioridad: 'A', velocidadActual: 'presteza' })
    // A tiene un Éter libre (3 en total, 2 gastados por el Rayo)
    expect(respuestasDeMano(conPresteza, 'A')).toEqual(['fugA'])
    let u = aplicar(conPresteza, { type: 'jugar_respuesta', cardInstanceId: 'fugA', eterIds: pagoDe(conPresteza, 'A', PR.FUGAZ) }, ctxT)
    u = aplicar(u, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctxT)
    expect(u.cadena).toBeUndefined() // B nunca recibió prioridad para responder a la Fugaz
    expect(statsDe(u, 'a0').poder).toBe(4) // Fugaz: +2 a a0
    expect(u.players.B.cementerio).toContain('pre') // la Presteza de B (debajo) también resolvió
  })

  it('Fugaz con negar (PR-056): niega el opener al instante; el objetivo sobrevive y el pago no se devuelve', () => {
    const { s: s1, ctx } = abre(PR.RAYO, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMano(s0, 'B', 'veto', PR.VETO_FUGAZ)
      conEteres(s0, 'B', 2)
    })
    const s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'veto', eterIds: pagoDe(s1, 'B', PR.VETO_FUGAZ) }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(evs(ctx, 'activacion_negada')).toHaveLength(1)
    expect(s.players.B.campo.campeones[0]).toBe('b0')
    expect(s.players.A.eterPagado).toHaveLength(2)
    expect(s.players.B.cementerio).toContain('veto')
  })

  it('la Presteza (de la mano o del campo) no responde a una Fugaz; una Fugaz en el tope no admite respuestas de nadie', () => {
    const { s: s1 } = abre(PR.RAYO, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMistica(s0, 'B', 'preCampo', PR.PRESTEZA_ROBA, 1)
      conMano(s0, 'B', 'preMano', PR.PRESTEZA_ROBA)
      conMano(s0, 'B', 'fugMano', PR.FUGAZ)
      conEteres(s0, 'B', 3)
    })
    expect([...respondiblesDe(s1, 'B')].sort()).toEqual(['preCampo'])
    expect([...respuestasDeMano(s1, 'B')].sort()).toEqual(['fugMano', 'preMano'])
    const s = structuredClone(s1)
    s.cadena!.pila.push('fugMano') // estado "Fugaz en el tope" armado a mano (jugarla la cierra al instante)
    expect(respondiblesDe(s, 'B')).toEqual([])
    expect(respuestasDeMano(s, 'B')).toEqual([])
    expect(respondiblesDe(s, 'A')).toEqual([])
    expect(validarJugarRespuesta(s, 'preMano', pagoDe(s, 'B', PR.PRESTEZA_ROBA))).not.toBeNull()
    expect(validarJugarRespuesta(s, 'fugMano', pagoDe(s, 'B', PR.FUGAZ))).not.toBeNull()
  })

  it('una carta NORMAL no se juega desde la mano como respuesta (ni siquiera con Éter)', () => {
    const { s } = abre(PR.RAYO, 'b0', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conMano(s0, 'B', 'raya', PR.RAYO)
      conEteres(s0, 'B', 3)
      conMano(s0, 'B', 'x', PR.FUGAZ)
    })
    expect(respuestasDeMano(s, 'B')).toEqual(['x'])
    expect(validarJugarRespuesta(s, 'raya', pagoDe(s, 'B', PR.RAYO))).not.toBeNull()
  })
})

/* ───────────────── 3. Artefactos: la velocidad manda, no que permanezcan en mesa ───────────────── */

describe('Mística ARTEFACTO con Presteza jugada como respuesta desde la mano (F5f)', () => {
  function conArtefacto(extra?: (s: GameState) => void): { s: GameState; ctx: Ctx } {
    return abre(PR.RAYO, 'b1', (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conCampeon(s0, 'B', 'b1', PR.PEON, 1)
      conMano(s0, 'B', 'art', PR.ARTEFACTO_VELOZ)
      conEteres(s0, 'B', 1)
      extra?.(s0)
    })
  }

  it('es jugable como respuesta aunque permanezca en mesa; la elección del Campeón a equipar va ANTES de entrar a la pila', () => {
    const { s: s1, ctx } = conArtefacto()
    expect(respuestasDeMano(s1, 'B')).toEqual(['art'])
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'art', eterIds: pagoDe(s1, 'B', PR.ARTEFACTO_VELOZ) }, ctx)
    // ya pagó y tomó su slot (jugar_mistica), pero aún NO está en la pila: B elige a quién se equipa
    expect(s.players.B.mano).not.toContain('art')
    expect(s.players.B.campo.misticasTacticas).toContain('art')
    expect(s.cadena?.pila).toEqual([])
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta', jugador: 'B', pendientes: 1 })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'art', equipar: true, opciones: ['b0', 'b1'] })
    expect(actorActual(s)).toBe('B')
    expect(getValidActions(s, 'B').map((a) => a.type).sort()).toEqual(['elegir_objetivo', 'elegir_objetivo', 'rendirse'])
    expect(tipos(s, 'A')).toEqual(['rendirse'])
    expect(applyAction(s, { type: 'pasar_prioridad' }, ctx).ok).toBe(false)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.instances['art'].equipadoA).toBe('b0')
    expect(s.cadena).toMatchObject({ pila: ['art'], prioridad: 'A', respuestas: { art: { jugador: 'B', origen: 'mano' } } })
    expect(s.declaracionEnEleccion).toBeUndefined()
  })

  it('al resolver: su efecto va antes que el opener (LIFO) y el Artefacto PERMANECE equipado en su slot (no va al Cementerio)', () => {
    const { s: s1, ctx } = conArtefacto()
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'art', eterIds: pagoDe(s1, 'B', PR.ARTEFACTO_VELOZ) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    const manoAntes = s.players.B.mano.length
    s = cerrar(s, ctx)
    expect(s.players.B.mano.length).toBe(manoAntes + 1) // roba 1
    expect(idxEv(ctx, 'carta_robada', (e) => e.jugador === 'B')).toBeLessThan(idxEv(ctx, 'destruccion', (e) => e.cardInstanceId === 'b1'))
    expect(s.players.B.campo.misticasTacticas).toContain('art')
    expect(s.players.B.cementerio).not.toContain('art')
    expect(s.instances['art'].equipadoA).toBe('b0')
    expect(s.players.B.cementerio).toContain('b1') // el Rayo resolvió último
  })

  it('no es jugable sin Campeón propio al que equiparse ni sin slot libre en 3A-3C', () => {
    const sinCampeon = abre(PR.RAYO, 'b9', (s0) => {
      conMano(s0, 'B', 'art', PR.ARTEFACTO_VELOZ)
      conEteres(s0, 'B', 1)
      conCampeon(s0, 'B', 'b9', PR.PEON, 0)
    })
    // B tiene un Campeón: sí; ahora se lo quitamos con la ventana abierta
    expect(respuestasDeMano(sinCampeon.s, 'B')).toEqual(['art'])
    const roto = structuredClone(sinCampeon.s)
    roto.players.B.campo.campeones[0] = null
    expect(respuestasDeMano(roto, 'B')).toEqual([])
    expect(validarJugarRespuesta(roto, 'art', pagoDe(roto, 'B', PR.ARTEFACTO_VELOZ))).not.toBeNull()

    const lleno = conArtefacto((s0) => {
      conMistica(s0, 'B', 'm0', PR.RAYO, 0)
      conMistica(s0, 'B', 'm1', PR.RAYO, 1)
      conMistica(s0, 'B', 'm2', PR.RAYO, 2)
    })
    expect(respuestasDeMano(lleno.s, 'B')).not.toContain('art')
    expect(validarJugarRespuesta(lleno.s, 'art', pagoDe(lleno.s, 'B', PR.ARTEFACTO_VELOZ))).not.toBeNull()
  })

  it('rendirse durante la elección del equipo lo decide quien se rinde', () => {
    const { s: s1, ctx } = conArtefacto()
    const s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'art', eterIds: pagoDe(s1, 'B', PR.ARTEFACTO_VELOZ) }, ctx)
    expect(aplicar(s, { type: 'rendirse', jugador: 'B' }, ctx)).toMatchObject({ fase: 'terminada', ganador: 'A' })
    expect(aplicar(s, { type: 'rendirse', jugador: 'A' }, crearCtx())).toMatchObject({ fase: 'terminada', ganador: 'B' })
  })
})

describe('Arcana ARTEFACTO / permanente con Presteza en el campo responde (F5f)', () => {
  /** B tiene la Arcana `arcana` boca abajo (colocada en un turno anterior) y Campeones; A abre con `opener`. */
  function conFilo(arcana: string, opener: string, extra?: (s: GameState) => void): { s: GameState; ctx: Ctx } {
    return abre(opener, opener === PR.RAYO ? 'b1' : null, (s0) => {
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      conCampeon(s0, 'B', 'b1', PR.PEON, 1)
      conArcana(s0, 'B', 'filo', arcana, 0)
      conEteres(s0, 'B', 2)
      extra?.(s0)
    })
  }

  it('PR-063 responde a una jugada normal y a una Presteza: equipa al responder (antes de la pila), resuelve primero y PERMANECE equipada', () => {
    const { s: s1, ctx } = conFilo(PR.FILO_ARCANA, PR.RAYO)
    expect(respondiblesDe(s1, 'B')).toEqual(['filo'])
    expect(tipos(s1, 'B')).toContain('responder_cadena')
    let s = aplicar(s1, { type: 'responder_cadena', cardInstanceId: 'filo' }, ctx)
    expect(s.instances['filo'].bocaArriba).toBe(true)
    expect(s.players.B.eterPagado).toHaveLength(2)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'filo', equipar: true, opciones: ['b0', 'b1'] })
    expect(s.cadena?.pila).toEqual([])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.instances['filo'].equipadoA).toBe('b0')
    expect(s.cadena?.pila).toEqual(['filo'])
    const mano = s.players.B.mano.length
    s = cerrar(s, ctx)
    expect(s.players.B.mano.length).toBe(mano + 1)
    expect(s.players.B.campo.arcanasCombate[0]).toBe('filo') // Artefacto: no se consume
    expect(s.players.B.cementerio).not.toContain('filo')
    expect(s.instances['filo']).toMatchObject({ bocaArriba: true, equipadoA: 'b0' })

    // a un opener Presteza también responde (tiene Presteza); PR-042 pide objetivo: se elige antes de abrir la ventana
    const p = conFilo(PR.FILO_ARCANA, PR.PRESTEZA_DEBIL)
    const ventana = p.s.declaracionEnEleccion ? aplicar(p.s, { type: 'elegir_objetivo', objetivoId: 'b0' }, p.ctx) : p.s
    expect(respondiblesDe(ventana, 'B')).toEqual(['filo'])
  })

  it('una Arcana de velocidad normal no responde a un opener Presteza, y un Artefacto sin Campeón propio no es respondible', () => {
    // sin Presteza: PR-060 (normal) frente a opener Presteza
    const { s } = conFilo(PR.PACTO, PR.PRESTEZA_DEBIL, (s0) => {
      conMano(s0, 'B', 'relleno', PR.PEON)
    })
    const ventana = s.declaracionEnEleccion ? aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, crearCtx()) : s
    expect(ventana.cadena).toBeUndefined() // gate cerrado: la Arcana normal no cuenta ante una Presteza, la jugada resolvió sin ventana
    expect(ventana.players.B.campo.arcanasCombate[0]).toBe('filo')
    // Artefacto equipable sin Campeón propio
    const { s: s2 } = conFilo(PR.FILO_ARCANA, PR.RAYO)
    const sinCampeon = structuredClone(s2)
    sinCampeon.players.B.campo.campeones = [null, null, null, null, null]
    expect(respondiblesDe(sinCampeon, 'B')).toEqual([])
  })

  it('FB-024 (carta real, Arcana Artefacto + Presteza) participa como respuesta: la velocidad manda, no que sea permanente', () => {
    // F5g: la condición de FB-024 (controlar_minimo 2, controlador rival; trigger inicio_alba) cuenta los Campeones del RIVAL
    // y es un candado: A (el rival de B) tiene dos Campeones y el Alba de B ya habilitó la Arcana
    const { s } = conFilo('FB-024', PR.RAYO, (s0) => {
      conCampeon(s0, 'A', 'a1', PR.PEON, 1)
      s0.instances['filo'].condicionHabilitada = true
    })
    expect(respondiblesDe(s, 'B')).toEqual(['filo'])
    const sinPago = structuredClone(s)
    sinPago.players.B.eterReserva = []
    expect(respondiblesDe(sinPago, 'B')).toEqual([]) // coste 2 sin Éter
  })
})

/* ───────────────────── 4. Un único criterio: paridad oferta ↔ validadores ───────────────────── */

/** Compara, en un estado con la cadena abierta, lo que ofrece getValidActions con lo que aceptan los validadores. */
function verificarParidad(estado: GameState): number {
  const cadena = cadenaActiva(estado)
  if (!cadena || estado.declaracionEnEleccion || estado.preventivosPendientes?.length) return 0
  const actor = cadena.prioridad
  const ofrecidas = getValidActions(estado, actor)
  const responder = new Set(ofrecidas.filter((a) => a.type === 'responder_cadena').map((a) => (a as any).cardInstanceId as string))
  const jugar = new Set(ofrecidas.filter((a) => a.type === 'jugar_respuesta').map((a) => (a as any).cardInstanceId as string))
  const p = estado.players[actor]
  const candidatas = [...p.campo.campeones, ...p.campo.misticasTacticas, ...p.campo.arcanasCombate, ...p.mano].filter((x): x is string => !!x)
  for (const id of candidatas) {
    const validaResponder = validarResponderCadena(estado, id) === null
    expect(responder.has(id), `responder_cadena ${id}: oferta ${responder.has(id)} vs validador ${validaResponder}`).toBe(validaResponder)
    const cardId = estado.instances[id]?.cardId
    const pago = cardId ? etersParaPagar(estado, actor, cardId) : null
    const validaJugar = validarJugarRespuesta(estado, id, pago ?? []) === null
    expect(jugar.has(id), `jugar_respuesta ${id}: oferta ${jugar.has(id)} vs validador ${validaJugar}`).toBe(validaJugar)
    expect(respondiblesDe(estado, actor).includes(id)).toBe(validaResponder)
    expect(respuestasDeMano(estado, actor).includes(id)).toBe(jugar.has(id))
  }
  // y todo lo ofrecido, el motor lo acepta
  for (const a of ofrecidas) if (a.type === 'responder_cadena' || a.type === 'jugar_respuesta') {
    expect(applyAction(estado, a, crearCtx()).ok, `${a.type} ofrecida pero rechazada`).toBe(true)
  }
  return responder.size + jugar.size
}

describe('paridad: nunca se ofrece una respuesta que el validador rechace, ni al revés (F5f)', () => {
  it('escenas armadas: Presteza/Fugaz de mano, Artefactos, Arcanas con condición y velocidades mezcladas', () => {
    const escenas: GameState[] = []
    for (const opener of [PR.RAYO, PR.PRESTEZA_ROBA, PR.PRESTEZA_DEBIL]) {
      const { s } = abre(opener, opener === PR.PRESTEZA_ROBA ? null : 'b0', (s0) => {
        conCampeon(s0, 'B', 'b0', PR.PEON, 0)
        conCampeon(s0, 'B', 'b1', PR.REACTIVO, 1)
        conMistica(s0, 'B', 'eco', PR.ECO, 0)
        conMistica(s0, 'B', 'nor', PR.RAYO, 1)
        conArcana(s0, 'B', 'pacto', PR.PACTO, 0)
        conArcana(s0, 'B', 'filo', PR.FILO_ARCANA, 1)
        conMano(s0, 'B', 'relleno', PR.PEON)
        conMano(s0, 'B', 'fug', PR.FUGAZ)
        conMano(s0, 'B', 'pre', PR.PRESTEZA_ROBA)
        conMano(s0, 'B', 'art', PR.ARTEFACTO_VELOZ)
        conMano(s0, 'B', 'veto', PR.VETO_FUGAZ)
        conEteres(s0, 'B', 3)
      })
      escenas.push(s)
    }
    let ofrecidas = 0
    for (const e of escenas) ofrecidas += verificarParidad(e)
    expect(ofrecidas).toBeGreaterThan(10)
  })

  const seeds = [66099, 66676, 1, 2, 3, 7, 42, 12345]
  let respuestasTotales = 0
  let ofertasVerificadas = 0
  let equipos = 0
  let fugazCierres = 0
  it.each(seeds)('seed %i (set PR, bot respondón): sin freeze, paridad en cada ventana y acciones siempre aplicables', (seed) => {
    const { state, ctx } = createInitialState(mazoPrueba(), mazoPrueba(), seed)
    let estado = state
    for (let i = 0; i < 1500 && estado.fase !== 'terminada'; i++) {
      const actor = actorActual(estado) ?? estado.turno
      ofertasVerificadas += verificarParidad(estado)
      const acciones = getValidActions(estado, actor)
      const propia =
        acciones.find((a) => a.type === 'jugar_respuesta') ??
        acciones.find((a) => a.type === 'responder_cadena') ??
        null
      const accion = propia ?? botTonto(estado, actor)
      expect(accion, `sin acción para ${actor} en fase ${estado.fase} (iter ${i})`).not.toBeNull()
      if (accion!.type === 'responder_cadena' || accion!.type === 'jugar_respuesta') respuestasTotales++
      const r = applyAction(estado, accion!, ctx)
      expect(r.ok, `${accion!.type} rechazada: ${r.ok ? '' : r.error}`).toBe(true)
      if (!r.ok) return
      if (estado.objetivosPendientes?.[0]?.equipar && accion!.type === 'elegir_objetivo') equipos++
      if (cadenaActiva(estado) && !cadenaActiva(r.state) && (accion!.type === 'jugar_respuesta' || accion!.type === 'responder_cadena' || accion!.type === 'elegir_objetivo')) {
        if (ctx.events.some((e) => e.type === 'respuesta_encadenada')) fugazCierres++
      }
      estado = r.state
      expect(verificarZonaUnica(estado), `${seed}: iter ${i} tras ${JSON.stringify(accion)}`).toEqual([]) // F5h: una instancia, una zona
    }
  })

  it('el bot respondón ejercitó respuestas y la paridad no fue vacua', () => {
    expect(respuestasTotales).toBeGreaterThan(0)
    expect(ofertasVerificadas).toBeGreaterThan(0)
    expect(equipos).toBeGreaterThan(0) // eligió a qué Campeón equipar una respuesta Artefacto
    expect(fugazCierres).toBeGreaterThan(0) // una Fugaz cerró la pila al instante
  })
})
