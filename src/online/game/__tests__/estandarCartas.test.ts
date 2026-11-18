// @vitest-environment node
/**
 * Set estándar (ST-xxx): cada carta con su JSON REAL del seed contra el motor. Lo que dice el texto es lo que debe ocurrir.
 * (Silencio tiene su propio archivo: silencio.test.ts.)
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { aplicarPago, bloquearEter } from '../payments'
import { keywordsDe, purgarEfectosTemporales, purgarKeywordsTemporales, statsDe } from '../efectos'
import { destruirCarta } from '../replacements'
import { getValidActions } from '../validActions'
import type { Ctx, GameState } from '../types'
import {
  PR, aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, conMistica, conVinculo, crearCtx, enCementerio, escenaVacia,
} from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

/** Resuelve lo pendiente (elecciones y ventanas) eligiendo `objetivos` en orden; pasa prioridad cuando no hay nada que elegir. */
function resolver(s: GameState, ctx: Ctx, objetivos: string[] = []): GameState {
  let est = s
  const cola = [...objetivos]
  for (let i = 0; i < 16 && (est.cadena || est.objetivosPendientes?.length || est.declaracionEnEleccion); i++) {
    const actor = est.cadena?.prioridad ?? est.objetivosPendientes?.[0]?.jugador ?? est.turno
    const acciones = getValidActions(est, actor)
    const el = acciones.find((a) => a.type === 'elegir_objetivo' && (cola.length === 0 || a.objetivoId === cola[0]))
    if (el) { est = aplicar(est, el, ctx); cola.shift(); continue }
    const pasar = acciones.find((a) => a.type === 'pasar_prioridad')
    if (!pasar) break
    est = aplicar(est, pasar, ctx)
  }
  return est
}

function escena(fase: GameState['fase'] = 'forja'): GameState {
  const s = escenaVacia(fase)
  conMazo(s, 'A', 8); conMazo(s, 'B', 8)
  return s
}

/** A juega la Mística `cardId` (coste `coste`) desde su mano y resuelve eligiendo `objetivos`. */
function jugarMistica(s0: GameState, cardId: string, coste: number, objetivos: string[] = []): { s: GameState; ctx: Ctx } {
  const ctx = crearCtx()
  conMano(s0, 'A', 'm', cardId)
  const pago = conEteres(s0, 'A', coste)
  const s = resolver(aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'm', slot: 0, eterIds: pago } as never, ctx), ctx, objetivos)
  return { s, ctx }
}

/** A paga con el Éter `cardId` por una carta cualquiera y resuelve lo que dispare. */
function pagarCon(cardId: string, preparar?: (s: GameState) => void, objetivos: string[] = []): { s: GameState; ctx: Ctx; eter: string } {
  const s0 = escena()
  const [eter] = conEteres(s0, 'A', 1, cardId)
  preparar?.(s0)
  const ctx = crearCtx()
  aplicarPago(s0, ctx, 'A', [eter], PR.PEON, { tipo: 'jugar' })
  return { s: resolver(s0, ctx, objetivos), ctx, eter }
}

const pasarTurno = (s: GameState, ctx: Ctx) => aplicar(s, getValidActions(s, s.turno).find((a) => a.type === 'pasar_turno')!, ctx)

/* ═════════════════════════════════ ÉTER ═════════════════════════════════ */

describe('Éter estándar', () => {
  it('ST-001 Olvido: al pagarlo exilia 1 carta del Cementerio del rival (a elección)', () => {
    const { s } = pagarCon('ST-001', (e) => { enCementerio(e, 'B', 'x1', PR.PEON); enCementerio(e, 'B', 'x2', PR.PEON) }, ['x2'])
    expect(s.players.B.exilio).toEqual(['x2'])
    expect(s.players.B.cementerio).toEqual(['x1'])
  })

  it('ST-002 Impulso: un Campeón propio gana 1 de ATQ y 1 de RES hasta el final del turno', () => {
    const base = escena(); conCampeon(base, 'A', 'c', PR.PEON, 0)
    const antes = statsDe(base, 'c')
    const { s } = pagarCon('ST-002', (e) => { conCampeon(e, 'A', 'c', PR.PEON, 0) }, ['c'])
    expect(statsDe(s, 'c').poder).toBe(antes.poder + 1)
    expect(statsDe(s, 'c').resistencia).toBe(antes.resistencia + 1)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'c')).toEqual(antes)
  })

  it('ST-003 Baluarte: mientras está bloqueado, el Campeón que lo tiene gana Indestructible', () => {
    const s = escena(); conCampeon(s, 'A', 'c', PR.PEON, 0)
    const [eter] = conEteres(s, 'A', 1, 'ST-003')
    expect(keywordsDe(s, 'c')).not.toContain('Indestructible')
    expect(bloquearEter(s, crearCtx(), 'A', [eter], 'c')).toBeNull()
    expect(keywordsDe(s, 'c')).toContain('Indestructible')
  })

  it('ST-004 Umbral: en la Reserva, al inicio de tu Choque un Campeón propio gana 1 de ATQ', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'c', PR.PEON, 0); conEteres(s0, 'A', 1, 'ST-004')
    const antes = statsDe(s0, 'c').poder
    const ctx = crearCtx()
    const s = resolver(pasarTurno(s0, ctx), ctx, ['c'])
    expect(s.fase).toBe('choque')
    expect(statsDe(s, 'c').poder).toBe(antes + 1)
  })

  it('ST-005 Desgaste: un Campeón del rival pierde 1 de ATQ y 1 de RES hasta el final del turno', () => {
    const base = escena(); conCampeon(base, 'B', 'b', PR.PEON, 0)
    const antes = statsDe(base, 'b')
    const { s } = pagarCon('ST-005', (e) => { conCampeon(e, 'B', 'b', PR.PEON, 0) }, ['b'])
    expect(statsDe(s, 'b').poder).toBe(antes.poder - 1)
    expect(statsDe(s, 'b').resistencia).toBe(antes.resistencia - 1)
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'b')).toEqual(antes)
  })

  it('el Éter estándar de pago NO roba cartas (solo Sangre Eterna roba)', () => {
    for (const id of ['ST-001', 'ST-002', 'ST-005']) {
      const { s } = pagarCon(id, (e) => { conCampeon(e, 'A', 'c', PR.PEON, 0); conCampeon(e, 'B', 'b', PR.PEON, 0) }, ['c'])
      expect(s.players.A.mano, id).toHaveLength(0)
    }
  })
})

/* ═══════════════════════════════ MÍSTICAS ═══════════════════════════════ */

describe('Místicas estándar', () => {
  it('ST-020 Desmantelar: destruye 1 Mística o Arcana del rival', () => {
    const s0 = escena(); conMistica(s0, 'B', 'bm', PR.RAYO, 0); conArcana(s0, 'B', 'ba', PR.PACTO, 0)
    const { s } = jugarMistica(s0, 'ST-020', 2, ['ba'])
    expect(s.players.B.cementerio).toContain('ba')
    expect(s.players.B.campo.arcanasCombate[0]).toBeNull()
    expect(s.players.B.campo.misticasTacticas[0]).toBe('bm') // solo se destruye 1
    expect(s.players.A.cementerio).toContain('m')
  })

  it('ST-021 Golpe Seco: destruye un Campeón rival de ATQ 4 o menos, y no se puede apuntar a uno de ATQ 5', () => {
    const s0 = escena(); conCampeon(s0, 'B', 'chico', PR.PEON, 0); conCampeon(s0, 'B', 'grande', 'FB-011', 1) // Vaela 5/2
    const ctx = crearCtx(); conMano(s0, 'A', 'm', 'ST-021')
    const pago = conEteres(s0, 'A', 3)
    const s1 = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'm', slot: 0, eterIds: pago } as never, ctx)
    const opciones = s1.declaracionEnEleccion || s1.objetivosPendientes?.length ? (s1.objetivosPendientes?.[0]?.opciones ?? []) : []
    expect(opciones).toContain('chico')
    expect(opciones).not.toContain('grande')
    const s = resolver(s1, ctx, ['chico'])
    expect(s.players.B.cementerio).toContain('chico')
    expect(s.players.B.campo.campeones[1]).toBe('grande')
  })

  it('ST-022 Resguardo: un Campeón propio gana Indestructible hasta el final del turno (y se juega como respuesta: Presteza)', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'c', PR.PEON, 0)
    const { s } = jugarMistica(s0, 'ST-022', 2, ['c'])
    expect(keywordsDe(s, 'c')).toContain('Indestructible')
    purgarKeywordsTemporales(s)
    expect(keywordsDe(s, 'c')).not.toContain('Indestructible')
  })

  it('ST-023 Segundo Aliento: invoca de tu Cementerio un Campeón de coste 3 o menos (uno de coste 4 no es elegible)', () => {
    const s0 = escena(); enCementerio(s0, 'A', 'barato', PR.PEON); enCementerio(s0, 'A', 'caro', 'FB-018') // Rowena, coste 4
    const ctx = crearCtx(); conMano(s0, 'A', 'm', 'ST-023')
    const pago = conEteres(s0, 'A', 3)
    const s1 = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'm', slot: 0, eterIds: pago } as never, ctx)
    const opciones = s1.objetivosPendientes?.[0]?.opciones ?? []
    expect(opciones).toContain('barato')
    expect(opciones).not.toContain('caro')
    const s = resolver(s1, ctx, ['barato'])
    expect(s.players.A.campo.campeones).toContain('barato')
    expect(s.players.A.cementerio).not.toContain('barato')
    expect(s.players.A.cementerio).toContain('caro')
  })

  it('ST-024 Cambio de Rumbo: roba 2 cartas y descarta 1 (a elección): la mano termina con 1 carta más que sin la Mística', () => {
    const s0 = escena(); conMano(s0, 'A', 'otra', PR.PEON)
    const { s } = jugarMistica(s0, 'ST-024', 2, ['otra'])
    expect(s.players.A.mano).toHaveLength(2) // otra + 2 robadas − 1 descartada
    expect(s.players.A.cementerio).toContain('otra')
    expect(s.players.A.mazo).toHaveLength(6)
  })
})

/* ═══════════════════════════════ ARCANAS ═══════════════════════════════ */

describe('Arcanas estándar', () => {
  it('ST-031 Memoria del Campo: cuando un Campeón tuyo va al Cementerio, bloquea 1 Éter y roba 1 (una vez por turno)', () => {
    const s = escena(); conArcana(s, 'A', 'arc', 'ST-031', 0, { bocaArriba: false })
    conCampeon(s, 'A', 'c1', PR.PEON, 0); conCampeon(s, 'A', 'c2', PR.PEON, 1); conEteres(s, 'A', 3)
    const ctx = crearCtx()
    destruirCarta(s, ctx, 'c1', 'efecto')
    expect(s.players.A.mano).toHaveLength(1)
    expect(s.instances.arc.eterBloqueado).toHaveLength(1)
    destruirCarta(s, ctx, 'c2', 'efecto')
    expect(s.players.A.mano).toHaveLength(1) // una vez por turno
  })

  it('ST-032 Parapeto: cuando el rival ataca, bloquea 2 Éter y un Campeón tuyo gana 2 de RES hasta el final del turno', () => {
    const s0 = escena('choque'); s0.turno = 'B'
    conArcana(s0, 'A', 'arc', 'ST-032', 0, { bocaArriba: false }); conCampeon(s0, 'A', 'a0', PR.PEON, 0); conEteres(s0, 'A', 3)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const antes = statsDe(s0, 'a0').resistencia
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['b0'] } as never, ctx)
    s = resolver(s, ctx, ['a0'])
    expect(statsDe(s, 'a0').resistencia).toBe(antes + 2)
    expect(s.instances.arc.eterBloqueado).toHaveLength(2)
  })

  it('ST-033 Ímpetu: todos tus Campeones ganan 1 de ATQ hasta el final del turno', () => {
    const s0 = escena(); conArcana(s0, 'A', 'arc', 'ST-033', 0, { bocaArriba: false })
    conCampeon(s0, 'A', 'c1', PR.PEON, 0); conCampeon(s0, 'A', 'c2', PR.PEON, 1); conCampeon(s0, 'B', 'b', PR.PEON, 0)
    const antes = statsDe(s0, 'c1').poder
    const pago = conEteres(s0, 'A', 2)
    const ctx = crearCtx()
    const s = resolver(aplicar(s0, { type: 'activar_arcana', cardInstanceId: 'arc', slot: 0, eterIds: pago } as never, ctx), ctx)
    expect(statsDe(s, 'c1').poder).toBe(antes + 1)
    expect(statsDe(s, 'c2').poder).toBe(antes + 1)
    expect(statsDe(s, 'b').poder).toBe(antes) // el rival no
    purgarEfectosTemporales(s, 'ocaso')
    expect(statsDe(s, 'c1').poder).toBe(antes)
  })

  it('ST-034 Coraza: el Campeón equipado gana 2 de RES mientras la lleve', () => {
    const s0 = escena(); conArcana(s0, 'A', 'arc', 'ST-034', 0, { bocaArriba: false }); conCampeon(s0, 'A', 'c', PR.PEON, 0)
    const antes = statsDe(s0, 'c').resistencia
    const pago = conEteres(s0, 'A', 2)
    const ctx = crearCtx()
    let s = resolver(aplicar(s0, { type: 'activar_arcana', cardInstanceId: 'arc', slot: 0, eterIds: pago } as never, ctx), ctx)
    const eq = getValidActions(s, 'A').find((x) => x.type === 'equipar_artefacto')
    if (eq) s = aplicar(s, eq, ctx)
    expect(s.instances.arc.equipadoA).toBe('c')
    expect(statsDe(s, 'c').resistencia).toBe(antes + 2)
  })
})

/* ═══════════════════════════════ VÍNCULOS ═══════════════════════════════
 * §5.5: solo un Vínculo DESTRUIDO (boca arriba) tiene efecto vigente. */

/** Escena con un Vínculo VIVO de A (boca abajo) en el slot 5: sin él, al romperse el de la prueba A quedaría sin vidas y la partida terminaría. */
function escenaVinculos(fase: GameState['fase'] = 'forja'): GameState {
  const s = escena(fase)
  conVinculo(s, 'A', 'vivo', PR.VINC_RETORNO, 5, false)
  return s
}

describe('Vínculos estándar (rotos)', () => {
  it('ST-040 Primer Lazo: al inicio de tu Alba miras la carta superior y puedes enviarla al fondo', () => {
    const s0 = escenaVinculos('ocaso'); s0.turno = 'B'; conVinculo(s0, 'A', 'v', 'ST-040', 0, true)
    const ctx = crearCtx()
    const tope = s0.players.A.mazo[0]
    let s = aplicar(s0, { type: 'pasar_turno' }, ctx)
    expect(s.scryPendientes?.[0]).toMatchObject({ jugador: 'A', mazoDe: 'A', cartas: [tope] })
    s = aplicar(s, { type: 'ordenar_mazo', arriba: [], fondo: [tope] } as never, ctx)
    expect(s.players.A.mazo.at(-1)).toBe(tope)
    expect(s.players.A.mano).not.toContain(tope)
  })

  it('ST-040 boca abajo no hace nada', () => {
    const s0 = escenaVinculos('ocaso'); s0.turno = 'B'; conVinculo(s0, 'A', 'v', 'ST-040', 0, false)
    const s = aplicar(s0, { type: 'pasar_turno' }, crearCtx())
    expect(s.scryPendientes ?? []).toEqual([])
  })

  it('ST-041 Rescoldo: al inicio del Choque del rival, endereza 1 Campeón agotado tuyo (vuelve a poder bloquear)', () => {
    const s0 = escenaVinculos(); s0.turno = 'B'
    conVinculo(s0, 'A', 'v', 'ST-041', 0, true); conCampeon(s0, 'A', 'c', PR.PEON, 0, { agotado: true })
    const ctx = crearCtx()
    const s = resolver(pasarTurno(s0, ctx), ctx, ['c'])
    expect(s.fase).toBe('choque')
    expect(s.instances.c.agotado).toBeFalsy()
  })

  it('ST-041 Rescoldo: en el Choque propio no dispara (es «del rival»)', () => {
    const s0 = escenaVinculos(); conVinculo(s0, 'A', 'v', 'ST-041', 0, true); conCampeon(s0, 'A', 'c', PR.PEON, 0, { agotado: true })
    const s = pasarTurno(s0, crearCtx())
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.instances.c.agotado).toBe(true)
  })

  it('ST-042 Guardia de Vigilia: al inicio de la Alba del rival, un Campeón tuyo gana Indestructible hasta el final del turno', () => {
    const s0 = escenaVinculos('ocaso'); conVinculo(s0, 'A', 'v', 'ST-042', 0, true); conCampeon(s0, 'A', 'c', PR.PEON, 0)
    const ctx = crearCtx()
    const s = resolver(aplicar(s0, { type: 'pasar_turno' }, ctx), ctx, ['c'])
    expect(s.turno).toBe('B')
    expect(keywordsDe(s, 'c')).toContain('Indestructible')
  })

  it('ST-043 Hilo Tenso: al inicio del Choque del rival, un Campeón del rival pierde 2 de ATQ hasta el final del turno', () => {
    const s0 = escenaVinculos(); s0.turno = 'B'
    conVinculo(s0, 'A', 'v', 'ST-043', 0, true); conCampeon(s0, 'B', 'b', 'FB-011', 0) // Vaela 5/2
    const antes = statsDe(s0, 'b').poder
    const ctx = crearCtx()
    const s = resolver(pasarTurno(s0, ctx), ctx, ['b'])
    expect(statsDe(s, 'b').poder).toBe(antes - 2)
  })

  it('ST-044 Cimiento: el Campeón con mayor ATQ del rival pierde 1 de ATQ mientras esté en el campo', () => {
    const s = escenaVinculos(); conVinculo(s, 'A', 'v', 'ST-044', 0, true)
    conCampeon(s, 'B', 'grande', 'FB-011', 0); conCampeon(s, 'B', 'chico', PR.PEON, 1) // Vaela 5/2 y Peón
    expect(statsDe(s, 'grande').poder).toBe(4)
    expect(statsDe(s, 'chico').poder).toBe(2)
    s.players.A.vinculos[0] = null // sale del campo: el aura se va
    expect(statsDe(s, 'grande').poder).toBe(5)
  })
})
