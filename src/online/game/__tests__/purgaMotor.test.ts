// @vitest-environment node
/**
 * Purga, fase 2 del motor — cartas REALES del seed (PU-xxx):
 *  - verbos nuevos: `quitar_buffs`, `igualar_stats_al_menor`, `mill`, `draw_discard`.
 *  - Idris (PU-010): su Comandante reacciona a Místicas y Arcanas (ya NO es un aura permanente) y su Continuo quita incrementos por Éter.
 *  - PU-036 (Lamento de Idris): los Campeones del rival no reciben incrementos de RES.
 *  - observadores («cuando juegues / el rival juegue una Mística»), `causaEnvio`, `costeMaxDeReferencia` y el coste de exiliar del Cementerio.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { statsDe, purgarEfectosTemporales } from '../efectos'
import { aplicarMod } from '../efectos'
import { interpretEffect } from '../effectInterpreter'
import { dispararObservadoresJugada } from '../observadores'
import { destruirCarta, enviarAlCementerio } from '../replacements'
import { registrarCartas, getCardMeta } from '../cards'
import type { AnyCard } from '../cards'
import { getValidActions } from '../validActions'
import type { EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, conVinculo, crearCtx, enCementerio, escenaVacia, PR } from './helpers/cartasPrueba'

const IDRIS = 'PU-010'

const campeon = (id: string, coste: number, atq: number, res: number, efectos: unknown[] = []) => ({
  id, name: id, type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', paqueteId: 'test', limiteCopias: '3',
  facciones: ['Purga'], esencia: 'Humano', roles: ['Normal'], stats: { cost: coste, poder: atq, resistencia: res }, efectos,
}) as unknown as AnyCard

const T_PURGA = 'TEST-PU-PURGA'
const T_CARO = 'TEST-PU-CARO'
const T_BARATO = 'TEST-PU-BARATO'

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([campeon(T_PURGA, 2, 2, 2), campeon(T_CARO, 4, 4, 4), campeon(T_BARATO, 1, 1, 1)])
})

/** El efecto `indice` de una carta real del seed. */
const efectoDe = (cardId: string, indice = 0): EfectoData => {
  const meta = getCardMeta(cardId) as AnyCard & { efectos: EfectoData[] }
  return meta.efectos[indice]
}

function lanzar(s: GameState, cardId: string, objetivoId?: string, indice = 0, jugador: 'A' | 'B' = 'A'): GameState {
  const clon = structuredClone(s)
  const fuente = `fuente-${cardId}`
  clon.instances[fuente] ??= { cardInstanceId: fuente, cardId, owner: jugador }
  interpretEffect(clon, crearCtx(), clon.instances[fuente], efectoDe(cardId, indice), {
    jugador, ...(objetivoId ? { contextoUso: 'objetivo-elegido', objetivoId } : {}),
  })
  return clon
}

describe('quitar_buffs (PU-022 Amonestación)', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'B', 'rival', T_CARO, 0)
    return s
  }

  it('el Campeón pierde sus incrementos de ATQ y RES, pero conserva sus decrementos', () => {
    let s = escena()
    aplicarMod(s.instances.rival ? s : s, 'rival', 'poder', 3, 'ocaso')
    aplicarMod(s, 'rival', 'resistencia', -1, 'ocaso')
    expect(statsDe(s, 'rival')).toEqual({ poder: 7, resistencia: 3 })
    s = lanzar(s, 'PU-022', 'rival')
    expect(statsDe(s, 'rival')).toEqual({ poder: 4, resistencia: 3 }) // sin el +3, con el -1
  })

  it('termina al final del turno: los incrementos vuelven (no se pierden para siempre)', () => {
    let s = escena()
    aplicarMod(s, 'rival', 'poder', 3, 'permanente')
    s = lanzar(s, 'PU-022', 'rival')
    expect(statsDe(s, 'rival').poder).toBe(4)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'rival').poder).toBe(7)
  })

  it('también anula los incrementos que da un aura (el +1 ATQ de un Vínculo roto)', () => {
    let s = escena()
    conVinculo(s, 'B', 'v', 'FB-030', 0, true) // aura de Vínculo del clásico
    const antes = statsDe(s, 'rival')
    s = lanzar(s, 'PU-022', 'rival')
    const despues = statsDe(s, 'rival')
    expect(despues.poder).toBeLessThanOrEqual(antes.poder)
    expect(despues.resistencia).toBeLessThanOrEqual(antes.resistencia)
  })
})

describe('igualar_stats_al_menor (PU-017 La Balanza)', () => {
  it('ATQ y RES se igualan al menor de los dos, hasta el final del turno', () => {
    const s0 = escenaVacia('forja'); conCampeon(s0, 'B', 'duro', T_CARO, 0) // 4/4
    aplicarMod(s0, 'duro', 'poder', 3, 'permanente') // 7/4
    const s = lanzar(s0, 'PU-017', 'duro')
    expect(statsDe(s, 'duro')).toEqual({ poder: 4, resistencia: 4 })
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'duro')).toEqual({ poder: 7, resistencia: 4 })
  })
})

describe('mill (PU-004) y draw_discard (PU-005)', () => {
  it('mill: la carta de arriba del mazo va al Cementerio', () => {
    const s0 = escenaVacia('forja'); const mazo = conMazo(s0, 'A', 3)
    const s = lanzar(s0, 'PU-004')
    expect(s.players.A.cementerio).toEqual([mazo[0]])
    expect(s.players.A.mazo).toEqual([mazo[1], mazo[2]])
  })

  it('mill con el mazo vacío no hace nada ni rompe', () => {
    const s = lanzar(escenaVacia('forja'), 'PU-004')
    expect(s.players.A.cementerio).toEqual([])
  })

  it('draw_discard: roba 1 y el jugador ELIGE qué carta de su mano descarta', () => {
    const s0 = escenaVacia('forja'); conMazo(s0, 'A', 3); conMano(s0, 'A', 'a', PR.PEON); conMano(s0, 'A', 'b', PR.PEON)
    let s = lanzar(s0, 'PU-005')
    expect(s.players.A.mano).toHaveLength(3) // robó
    const p = s.objetivosPendientes?.[0]
    expect(p?.descartar).toBe(true)
    expect(p?.opciones).toEqual(expect.arrayContaining(['a', 'b']))
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b' }, crearCtx())
    expect(s.players.A.mano).not.toContain('b')
    expect(s.players.A.cementerio).toContain('b')
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
  })
})

describe('Idris (PU-010): Comandante con triggers y Continuo por Éter', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conCampeon(s, 'A', 'idris', IDRIS, 0)
    conCampeon(s, 'A', 'p1', T_PURGA, 1)
    conCampeon(s, 'A', 'otro', 'FB-012', 2) // facción distinta (Orden): el Comandante no lo alcanza
    return s
  }

  it('el Comandante YA NO es un aura permanente: sin Mística jugada, nadie recibe el +1 ATQ', () => {
    const s = escena()
    expect(statsDe(s, 'p1').poder).toBe(2)
    expect(statsDe(s, 'idris').poder).toBe(3)
  })

  it('al jugar una Mística, los Campeones de Purga ganan +1 ATQ hasta el final del turno (y solo los de su facción)', () => {
    const s = escena()
    const base = statsDe(s, 'otro').poder
    dispararObservadoresJugada(s, crearCtx(), 'cuando-juegas-mistica', 'A', 'm')
    expect(statsDe(s, 'p1').poder).toBe(3)
    expect(statsDe(s, 'idris').poder).toBe(4)
    expect(statsDe(s, 'otro').poder).toBe(base)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'p1').poder).toBe(2)
  })

  it('con una Arcana activada también (y se acumula con la Mística)', () => {
    const s = escena()
    dispararObservadoresJugada(s, crearCtx(), 'cuando-juegas-mistica', 'A', 'm')
    dispararObservadoresJugada(s, crearCtx(), 'cuando-activas-arcana', 'A', 'a')
    expect(statsDe(s, 'p1').poder).toBe(4)
  })

  it('NO reacciona cuando es el RIVAL quien juega la Mística', () => {
    const s = escena()
    dispararObservadoresJugada(s, crearCtx(), 'cuando-juegas-mistica', 'B', 'm')
    expect(statsDe(s, 'p1').poder).toBe(2)
  })

  it('jugar una Mística de verdad (acción jugar_mistica) dispara el Comandante', () => {
    let s = escena(); conEteres(s, 'A', 4)
    conMano(s, 'A', 'ind', 'PU-024') // Indulto: coste 2
    const jugar = getValidActions(s, 'A').find((a) => a.type === 'jugar_mistica' && a.cardInstanceId === 'ind')
    expect(jugar).toBeDefined()
    s = aplicar(s, jugar!, crearCtx())
    expect(statsDe(s, 'p1').poder).toBe(3)
  })

  it('PU-028 (Registro del Tribunal): al jugar una Mística bloquea 1 Éter y roba 1, una vez por turno', () => {
    const s = escena(); conEteres(s, 'A', 4); conArcana(s, 'A', 'reg', 'PU-028', 0)
    const mano0 = s.players.A.mano.length
    dispararObservadoresJugada(s, crearCtx(), 'cuando-juegas-mistica', 'A', 'm')
    expect(s.players.A.mano.length).toBe(mano0 + 1)
    dispararObservadoresJugada(s, crearCtx(), 'cuando-juegas-mistica', 'A', 'm2')
    expect(s.players.A.mano.length).toBe(mano0 + 1)
  })

  it('el Continuo: cada Éter bloqueado suma un Campeón rival que pierde sus incrementos mientras ese Éter siga bloqueado', () => {
    let s = escena(); conEteres(s, 'A', 4)
    conCampeon(s, 'B', 'r1', T_CARO, 0); conCampeon(s, 'B', 'r2', T_CARO, 1)
    aplicarMod(s, 'r1', 'poder', 3, 'permanente'); aplicarMod(s, 'r2', 'poder', 3, 'permanente')
    const eteres = s.players.A.eterReserva.slice(0, 2)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: [eteres[0]], targetInstanceId: 'idris', efectoIdx: 1 }, crearCtx())
    expect(s.objetivosPendientes).toHaveLength(1)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'r1' }, crearCtx())
    expect(statsDe(s, 'r1').poder).toBe(4) // perdió el +3
    expect(statsDe(s, 'r2').poder).toBe(7) // todavía no es objetivo
    // un segundo Éter = un segundo Campeón
    s = aplicar(s, { type: 'bloquear_eter', eterIds: [eteres[1]], targetInstanceId: 'idris', efectoIdx: 1 }, crearCtx())
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'r2' }, crearCtx())
    expect(statsDe(s, 'r2').poder).toBe(4)
  })
})

describe('PU-036 (Lamento de Idris): los Campeones del rival no pueden recibir incrementos de RES', () => {
  it('con el Vínculo destruido, la RES del rival ignora los incrementos (el ATQ no) y la propia no cambia', () => {
    const s = escenaVacia('forja')
    conCampeon(s, 'B', 'rival', T_CARO, 0); conCampeon(s, 'A', 'mio', T_CARO, 0)
    for (const id of ['rival', 'mio']) { aplicarMod(s, id, 'resistencia', 2, 'permanente'); aplicarMod(s, id, 'poder', 2, 'permanente') }
    expect(statsDe(s, 'rival')).toEqual({ poder: 6, resistencia: 6 })
    conVinculo(s, 'A', 'lamento', 'PU-036', 0, false) // boca abajo: sin efecto vigente (§5.5)
    expect(statsDe(s, 'rival').resistencia).toBe(6)
    s.instances.lamento.bocaArriba = true // destruido: efecto vigente
    expect(statsDe(s, 'rival')).toEqual({ poder: 6, resistencia: 4 })
    expect(statsDe(s, 'mio')).toEqual({ poder: 6, resistencia: 6 })
  })

  it('un decremento de RES sigue valiendo', () => {
    const s = escenaVacia('forja')
    conCampeon(s, 'B', 'rival', T_CARO, 0)
    aplicarMod(s, 'rival', 'resistencia', -1, 'permanente')
    conVinculo(s, 'A', 'lamento', 'PU-036', 0, true)
    expect(statsDe(s, 'rival').resistencia).toBe(3)
  })
})

describe('causaEnvio y costeMaxDeReferencia (Apelación PU-026, Pena Diferida PU-027)', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4); conEteres(s, 'A', 8)
    conCampeon(s, 'A', 'caido', T_CARO, 0) // coste 4
    return s
  }

  it('PU-027: al destruir un Campeón tuyo, destruye un rival de coste IGUAL O MENOR al suyo (elige entre esos)', () => {
    const s0 = escena(); conArcana(s0, 'A', 'pena', 'PU-027', 0)
    conCampeon(s0, 'B', 'barato', T_BARATO, 0); conCampeon(s0, 'B', 'igual', T_CARO, 1); conCampeon(s0, 'B', 'enorme', 'PU-017', 2) // coste 5
    const s = structuredClone(s0)
    destruirCarta(s, crearCtx(), 'caido', 'efecto')
    const p = s.objetivosPendientes?.[0]
    expect(p).toBeDefined()
    expect(p!.opciones.sort()).toEqual(['barato', 'igual'])
  })

  it('PU-027 también reacciona a la muerte en COMBATE', () => {
    const s0 = escena(); conArcana(s0, 'A', 'pena', 'PU-027', 0); conCampeon(s0, 'B', 'rival', T_BARATO, 0)
    const s = structuredClone(s0)
    destruirCarta(s, crearCtx(), 'caido', 'combate')
    expect(s.objetivosPendientes?.[0]?.opciones).toEqual(['rival'])
  })

  it('PU-027 NO se dispara si el Campeón llega al Cementerio por SACRIFICIO ni por descarte (causaEnvio: destrucción o combate)', () => {
    const base = escena(); conArcana(base, 'A', 'pena', 'PU-027', 0); conCampeon(base, 'B', 'rival', T_BARATO, 0)
    const sacrificado = structuredClone(base)
    sacrificado.players.A.campo.campeones[0] = null
    enviarAlCementerio(sacrificado, crearCtx(), 'caido', 'campo', 'sacrificio')
    expect(sacrificado.players.A.cementerio).toContain('caido')
    expect(sacrificado.objetivosPendientes ?? []).toHaveLength(0)
    const otra = structuredClone(base)
    otra.players.A.campo.campeones[0] = null
    enviarAlCementerio(otra, crearCtx(), 'caido', 'campo')
    expect(otra.objetivosPendientes ?? []).toHaveLength(0)
  })

  it('PU-030 (Cobro de Costas) sigue disparando con un Campeón RIVAL muerto: no lleva causaEnvio', () => {
    const s0 = escena(); conArcana(s0, 'A', 'cobro', 'PU-030', 0); conCampeon(s0, 'B', 'rival', T_BARATO, 0)
    const s = structuredClone(s0)
    destruirCarta(s, crearCtx(), 'rival', 'efecto')
    const bloqueados = Object.values(s.instances).filter((i) => i.bloqueadoPorEfecto?.startsWith('cobro#')).length
    expect(bloqueados).toBe(1)
  })
})

describe('coste de exiliar del Cementerio (PU-020 Sentencia Firme)', () => {
  function escena(enCem: [string, string][]): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 2)
    conCampeon(s, 'B', 'rival', T_CARO, 0)
    for (const [id, cardId] of enCem) enCementerio(s, 'A', id, cardId)
    return s
  }

  it('sin ningún Campeón en tu Cementerio el efecto NO ocurre', () => {
    const s = lanzar(escena([]), 'PU-020', 'rival')
    expect(s.players.B.campo.campeones[0]).toBe('rival')
  })

  it('con Campeones en el Cementerio exilia el de MENOR coste y destruye al objetivo', () => {
    const s = lanzar(escena([['caro', T_CARO], ['barato', T_BARATO]]), 'PU-020', 'rival')
    expect(s.players.A.exilio).toEqual(['barato'])
    expect(s.players.A.cementerio).toEqual(['caro'])
    expect(s.players.B.campo.campeones[0]).toBeNull()
  })
})

describe('PU-029 (Cadena de Custodia): al atacar el rival', () => {
  it('cuando el RIVAL ataca, la Arcana del defensor bloquea 2 Éter y le quita los incrementos a un Campeón rival', () => {
    const s0 = escenaVacia('choque'); s0.turno = 'B'; conMazo(s0, 'A', 3); conMazo(s0, 'B', 3)
    conCampeon(s0, 'B', 'atacante', T_CARO, 0)
    aplicarMod(s0, 'atacante', 'poder', 3, 'permanente')
    conEteres(s0, 'A', 4); conArcana(s0, 'A', 'cadena', 'PU-029', 0)
    const ataque = getValidActions(s0, 'B').find((a) => a.type === 'declarar_ataque')
    expect(ataque).toBeDefined()
    const r = applyAction(s0, ataque!, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const bloqueados = Object.values(r.state.instances).filter((i) => i.bloqueadoPorEfecto?.startsWith('cadena#')).length
    expect(bloqueados + (r.state.objetivosPendientes?.length ?? 0)).toBeGreaterThan(0)
  })

  it('NO se dispara cuando ataca su propio dueño', () => {
    const s0 = escenaVacia('choque'); conMazo(s0, 'A', 3); conMazo(s0, 'B', 3)
    conCampeon(s0, 'A', 'atacante', T_CARO, 0); conCampeon(s0, 'B', 'def', T_CARO, 0)
    conEteres(s0, 'A', 4); conArcana(s0, 'A', 'cadena', 'PU-029', 0)
    const ataque = getValidActions(s0, 'A').find((a) => a.type === 'declarar_ataque')
    const r = applyAction(s0, ataque!, crearCtx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.values(r.state.instances).some((i) => i.bloqueadoPorEfecto?.startsWith('cadena#'))).toBe(false)
  })
})
