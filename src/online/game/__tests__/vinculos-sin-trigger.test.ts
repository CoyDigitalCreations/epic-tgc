// @vitest-environment node
/**
 * Fase 3d — Vínculos sin trigger (FB-030, DS-030, DS-026, DS-027).
 *
 * Diseño aprobado por el usuario (JSON actualizado por Card-Maker):
 * - FB-030 + DS-030: AURA CONTINUA (duracion='mientras_en_campo') — vínculos
 *   siempre en campo = permanente. FB-030 debuffa rival mayor RES (-3/-3);
 *   DS-030 buffa propio menor RES (+4 RES).
 * - DS-026: trigger inicio_alba + 1_por_turno — patrón FB-025 (cero engine work).
 * - DS-027: trigger inicio_choque + controladorTrigger:'rival' — firea EN el
 *   choque del RIVAL; necesita dispatch de vínculos rivales (partida.ts).
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { statsDe, dispararTrigger } from '../efectos'
import { getCardMeta } from '../cards'
import type { Ctx, GameState, PlayerId } from '../types'

const FB030 = 'FB-030' // Vínculo debuff rival mayor RES -3/-3, mientras_en_campo
const DS030 = 'DS-030' // Vínculo buff propio menor RES +4, mientras_en_campo
const DS026 = 'DS-026' // Vínculo rival_discard, inicio_alba, 1_por_turno
const DS027 = 'DS-027' // Vínculo mover éter rival, inicio_choque, controladorTrigger rival
const CAMPEON = 'FB-011' // Vaela 5/3
const ETER_ORDEN = 'FB-001'

function estadoMinimo(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 7,
    fase: 'forja' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function conInstancias(s: GameState, mapa: Record<string, { cardId: string; owner?: PlayerId; extra?: Record<string, unknown> }>): GameState {
  return {
    ...s,
    instances: {
      ...s.instances,
      ...Object.fromEntries(
        Object.entries(mapa).map(([id, { cardId, owner = 'A', extra }]) => [
          id,
          { cardInstanceId: id, cardId, owner, ...(extra ?? {}) },
        ]),
      ),
    },
  }
}

function conCampeon(s: GameState, cardId: string, owner: PlayerId, slot: number, extra?: Record<string, unknown>): { s: GameState; id: string } {
  const id = `camp-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner, extra } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

function conVinculo(s: GameState, cardId: string, owner: PlayerId, slot: number): { s: GameState; id: string } {
  const id = `vinc-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          vinculos: s.players[owner].vinculos.map((c, i) => (i === slot ? id : c)),
        },
      },
    },
    id,
  }
}

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return { next: () => n++, emit: (e) => { events.push(e) }, events }
}

describe('FB-030 Lamento de la Primogénita — aura vínculo (Fase 3d)', () => {
  /**
   * "El Campeón con mayor RES que controla el rival pierde 3 de ATQ y 3 de RES,
   * mientras esta carta esté en el campo."
   * Aura: debuff -3/-3 al campeón rival de MAYOR RES. Vaela base 5/3.
   * Con otro campeón rival de mayor RES, Vaela NO recibe el debuff.
   */

  it('debuff -3/-3 al único campeón rival (mayor RES por default)', () => {
    const conCamp = conCampeon(estadoMinimo(), CAMPEON, 'B', 0) // Vaela 5/3 rival
    const conVinc = conVinculo(conCamp.s, FB030, 'A', 0) // vínculo de A
    // Vaela es el único campeón de B → es el de mayor RES → -3/-3 → 2/0
    expect(statsDe(conVinc.s, conCamp.id)).toEqual({ poder: 2, resistencia: 0 })
  })

  it('NO debuffa si hay otro campeón rival de MAYOR RES', () => {
    // Camp0: Vaela 5/3; Camp1: campeón con RES mayor (usar extra para simular stats altos)
    const conCamp0 = conCampeon(estadoMinimo(), CAMPEON, 'B', 0) // Vaela 5/3
    const conCamp1 = conCampeon(conCamp0.s, CAMPEON, 'B', 1, { resistencia: 10 }) // RES 10 override
    const conVinc = conVinculo(conCamp1.s, FB030, 'A', 0)
    // El de mayor RES es camp1 (10) → él recibe el debuff; Vaela queda intacta
    expect(statsDe(conVinc.s, conCamp0.id)).toEqual({ poder: 5, resistencia: 3 }) // Vaela sin debuff
    // camp1 con override resistencia 10 + debuff -3 → 7 (poder base 5 - 3 = 2)
    expect(statsDe(conVinc.s, conCamp1.id).resistencia).toBe(7)
  })

  it('el campeón PROPIO no recibe el debuff (controlador rival)', () => {
    const conCampPropio = conCampeon(estadoMinimo(), CAMPEON, 'A', 0) // propio de A
    const conCampRival = conCampeon(conCampPropio.s, CAMPEON, 'B', 0) // rival
    const conVinc = conVinculo(conCampRival.s, FB030, 'A', 0)
    // Propio de A: sin debuff (5/3)
    expect(statsDe(conVinc.s, conCampPropio.id)).toEqual({ poder: 5, resistencia: 3 })
    // Rival de A (único de B): con debuff (2/0)
    expect(statsDe(conVinc.s, conCampRival.id)).toEqual({ poder: 2, resistencia: 0 })
  })
})

describe('DS-030 Grito del Primogénito — aura vínculo buff propio (Fase 3d)', () => {
  /**
   * "El Campeón con menor RES gana 4 de RES, mientras esta carta esté en el campo."
   * Aura: buff +4 RES al campeón PROPIO de MENOR RES. Vaela base 5/3.
   */

  it('buff +4 RES al único campeón propio (menor RES por default)', () => {
    const conCamp = conCampeon(estadoMinimo(), CAMPEON, 'A', 0) // Vaela 5/3 propio
    const conVinc = conVinculo(conCamp.s, DS030, 'A', 0)
    // Vaela única → menor RES → +4 → 5/7
    expect(statsDe(conVinc.s, conCamp.id)).toEqual({ poder: 5, resistencia: 7 })
  })

  it('NO buffa si hay otro campeón propio de MENOR RES', () => {
    const conCamp0 = conCampeon(estadoMinimo(), CAMPEON, 'A', 0) // Vaela 5/3
    const conCamp1 = conCampeon(conCamp0.s, CAMPEON, 'A', 1, { resistencia: 1 }) // RES 1 override
    const conVinc = conVinculo(conCamp1.s, DS030, 'A', 0)
    // El de menor RES es camp1 (1) → él recibe +4 → 5; Vaela queda 5/3
    expect(statsDe(conVinc.s, conCamp0.id)).toEqual({ poder: 5, resistencia: 3 }) // Vaela sin buff
    expect(statsDe(conVinc.s, conCamp1.id).resistencia).toBe(5) // 1 + 4
  })

  it('el campeón RIVAL no recibe el buff (controlador propio)', () => {
    const conCampPropio = conCampeon(estadoMinimo(), CAMPEON, 'A', 0)
    const conCampRival = conCampeon(conCampPropio.s, CAMPEON, 'B', 0)
    const conVinc = conVinculo(conCampRival.s, DS030, 'A', 0)
    // Rival de A: sin buff (5/3)
    expect(statsDe(conVinc.s, conCampRival.id)).toEqual({ poder: 5, resistencia: 3 })
    // Propio de A: con buff (5/7)
    expect(statsDe(conVinc.s, conCampPropio.id)).toEqual({ poder: 5, resistencia: 7 })
  })
})

describe('DS-026 Heredad de Caos — inicio_alba discard (Fase 3d)', () => {
  /**
   * "Al inicio de tu Alba, puedes descartar una carta de la mano del rival,
   * una vez por turno." trigger inicio_alba — patrón FB-025 existente.
   */

  it('al inicio_alba del dueño, rival_discard ejecuta (rival pierde carta)', () => {
    const ctx = crearCtx()
    const conVinc = conVinculo(estadoMinimo(), DS026, 'A', 0)
    // B (rival de A) tiene 2 cartas en mano
    const s0: GameState = {
      ...conVinc.s,
      players: {
        ...conVinc.s.players,
        B: { ...conVinc.s.players.B, mano: ['carta-x', 'carta-y'] },
      },
    }
    // Disparar inicio_alba para A (dueño del vínculo) — patrón phases.ts
    dispararTrigger(s0, ctx, 'al-inicio-alba', 'A', [conVinc.id])
    // El rival_discard es aleatorio (rival pierde 1 carta de mano)
    expect(s0.players.B.mano.length).toBe(1)
  })
})

describe('DS-027 Refugio del Nudo — inicio_choque controladorTrigger rival (Fase 3d)', () => {
  /**
   * "Al inicio del Choque del RIVAL, puedes mover hasta 2 Éter que controla el
   * rival de la Reserva a la zona de pago del rival, una vez por turno."
   * trigger inicio_choque + controladorTrigger: 'rival'.
   * Firea EN el choque del RIVAL (B) — el vínculo es de A.
   * Mueve Éter del rival del DUEÑO (A→rival=B): éter de B res→pagado de B.
   */

  it('al pasar turno a B (choque de B), el vínculo de A mueve éter de B', () => {
    const ctx = crearCtx()
    // A tiene DS-027; B tiene 2 éteres en Reserva
    const conVinc = conVinculo(estadoMinimo(), DS027, 'A', 0)
    const s0: GameState = {
      ...conVinc.s,
      fase: 'choque',
      turno: 'B',
      players: {
        ...conVinc.s.players,
        B: {
          ...conVinc.s.players.B,
          eterReserva: ['e-b-0', 'e-b-1', 'e-b-2'],
        },
      },
      instances: {
        ...conVinc.s.instances,
        'e-b-0': { cardInstanceId: 'e-b-0', cardId: ETER_ORDEN, owner: 'B' },
        'e-b-1': { cardInstanceId: 'e-b-1', cardId: ETER_ORDEN, owner: 'B' },
        'e-b-2': { cardInstanceId: 'e-b-2', cardId: ETER_ORDEN, owner: 'B' },
      },
    }
    // Verificar que el JSON tiene el trigger + controladorTrigger esperados
    const meta = getCardMeta(DS027)
    const tieneRivalTrigger = meta && 'efectos' in meta && meta.efectos?.some(
      (e) => e.trigger === 'inicio_choque' && e.controladorTrigger === 'rival',
    )
    expect(tieneRivalTrigger).toBe(true)

    // Dispatch: dispararTrigger con jugador=A (dueño del vínculo) para que
    // "rival" resuelva a B (el activo cuyo choque es)
    dispararTrigger(s0, ctx, 'al-inicio-choque', 'A', [conVinc.id])

    // B perdió 2 éteres de Reserva (movidos a pagado) — "hasta 2"
    expect(s0.players.B.eterReserva.length).toBe(1) // 3 - 2
    expect(s0.players.B.eterPagado.length).toBe(2)
  })
})
