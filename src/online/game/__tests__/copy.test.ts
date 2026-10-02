// @vitest-environment node
/**
 * Fase 3c — copy (FB-022 Último Refugio).
 *
 * "Puedes bloquear hasta un máximo de 3 Éter (Max. 3), copia el efecto de
 * hechizo, el efecto continuo y la recompensa de una Mística o Arcana que
 * controla el rival, mientras ese Éter esté bloqueado."
 *
 * Diseño híbrido (aprobado): B primario (continuo/pasivo = aura derivada
 * via modificadoresJSONDe) + A extensible (eventos copy = one-shot en
 * transición 0→≥1 bloqueado, patrón FB-032) + hook Presteza documentado.
 *
 * Cartas: FB-022 Último Refugio (Mística Fugaz, copy, eter_bloqueado:3) ·
 * DS-021 El Nudo Aprieta (Mística hechizo buff — target de copy) ·
 * FB-023 El Reino Perdido (Arcana recompensa draw — target arcana_recompensa) ·
 * FB-016 Cassandra (Campeón — receptor de auras) · FB-001 Éter Orden.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { copyActivo } from '../efectos'
import { statsDe } from '../efectos'
import { bloquearEter } from '../payments'
import { liberarEterBloqueado } from '../replacements'
import type { Ctx, GameState, PlayerId } from '../types'

const FB022 = 'FB-022' // Mística Fugaz, copy, eter_bloqueado:3
const DS021 = 'DS-021' // Mística hechizo buff — target de copy mistica_hechizo
const FB023 = 'FB-023' // Arcana recompensa draw — target arcana_recompensa
const CASSANDRA = 'FB-016' // Campeón receptor de auras
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

function conCampeon(s: GameState, cardId: string, owner: PlayerId, slot: number): { s: GameState; id: string } {
  const id = `camp-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner } }),
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

function conMistica(s: GameState, cardId: string, owner: PlayerId, slot: number, extra?: Record<string, unknown>): { s: GameState; id: string } {
  const id = `mist-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner, extra } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            misticasTacticas: s.players[owner].campo.misticasTacticas.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

function conArcana(s: GameState, cardId: string, owner: PlayerId, slot: number, extra?: Record<string, unknown>): { s: GameState; id: string } {
  const id = `arc-${cardId}-${owner}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner, extra } }),
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            arcanasCombate: s.players[owner].campo.arcanasCombate.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

function conMano(s: GameState, owner: PlayerId, mapa: Record<string, string>): GameState {
  const conInst = conInstancias(s, Object.fromEntries(Object.entries(mapa).map(([id, cardId]) => [id, { cardId, owner }])))
  return {
    ...conInst,
    players: { ...conInst.players, [owner]: { ...conInst.players[owner], mano: [...conInst.players[owner].mano, ...Object.keys(mapa)] } },
  }
}

function conEteres(s: GameState, owner: PlayerId, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${owner}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner }]))),
      players: { ...s.players, [owner]: { ...s.players[owner], eterReserva: [...s.players[owner].eterReserva, ...ids] } },
    },
    ids,
  }
}

function crearCtx(): Ctx {
  let n = 0
  const events: Ctx['events'] = []
  return { next: () => n++, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

describe('copyActivo — estado derivado (Fase 3c)', () => {
  it('true: copyTargetId + ≥1 éter bloqueado + target en campo', () => {
    const conMistTarget = conMistica(estadoMinimo(), DS021, 'B', 0)
    const conFB022 = conMistica(conMistTarget.s, FB022, 'A', 0, {
      copyTargetId: conMistTarget.id,
      eterBloqueado: ['e-0'],
    })
    // Registrar instancia del éter bloqueado
    const s = conInstancias(conFB022.s, { 'e-0': { cardId: ETER_ORDEN, owner: 'A' } })
    expect(copyActivo(s, conFB022.id)).toBe(true)
  })

  it('false: sin éter bloqueado', () => {
    const conMistTarget = conMistica(estadoMinimo(), DS021, 'B', 0)
    const conFB022 = conMistica(conMistTarget.s, FB022, 'A', 0, {
      copyTargetId: conMistTarget.id,
    })
    expect(copyActivo(conFB022.s, conFB022.id)).toBe(false)
  })

  it('false: sin copyTargetId', () => {
    const conFB022 = conMistica(estadoMinimo(), FB022, 'A', 0, {
      eterBloqueado: ['e-0'],
    })
    const s = conInstancias(conFB022.s, { 'e-0': { cardId: ETER_ORDEN, owner: 'A' } })
    expect(copyActivo(s, conFB022.id)).toBe(false)
  })

  it('false: target salió del campo', () => {
    const conFB022 = conMistica(estadoMinimo(), FB022, 'A', 0, {
      copyTargetId: 'mist-fuera',
      eterBloqueado: ['e-0'],
    })
    const s = conInstancias(conFB022.s, {
      'e-0': { cardId: ETER_ORDEN, owner: 'A' },
      'mist-fuera': { cardId: DS021, owner: 'B' }, // instancia existe pero FUERA del campo
    })
    expect(copyActivo(s, conFB022.id)).toBe(false)
  })
})

describe('flujo integral jugar FB-022 (Fase 3c)', () => {
  it('al jugar FB-022 → D1 elige target → copyTargetId seteado', () => {
    const ctx = crearCtx()
    const conTarget = conMistica(estadoMinimo(), DS021, 'B', 0)
    let s = conMano(conTarget.s, 'A', { fb022: FB022 })
    const { s: sEteres, ids } = conEteres(s, 'A', ETER_ORDEN, 3)
    s = sEteres

    s = aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'fb022', slot: 0, eterIds: ids }, ctx)

    // D1 pendiente (fromTrigger=true fuerza elección)
    expect(s.objetivosPendientes?.length).toBe(1)
    expect(s.objetivosPendientes![0].opciones).toContain(conTarget.id)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: conTarget.id }, ctx)

    const fb022Inst = Object.values(s.instances).find((i) => i?.cardId === FB022)
    expect(fb022Inst?.copyTargetId).toBe(conTarget.id)
    // Sin éter bloqueado todavía → copy NO activo
    expect(copyActivo(s, fb022Inst!.cardInstanceId)).toBe(false)
  })

  it('bloquear éter en FB-022 con target → copyActivo true', () => {
    const ctx = crearCtx()
    const conTarget = conMistica(estadoMinimo(), DS021, 'B', 0)
    const conFB022 = conMistica(conTarget.s, FB022, 'A', 0, { copyTargetId: conTarget.id })
    const { s: sEteres, ids } = conEteres(conFB022.s, 'A', ETER_ORDEN, 1)

    const s = aplicar(sEteres, { type: 'bloquear_eter', eterIds: [ids[0]], targetInstanceId: conFB022.id }, ctx)
    expect(copyActivo(s, conFB022.id)).toBe(true)
  })

  it('liberar éter → copyActivo false; flag one-shot limpiado', () => {
    const ctx = crearCtx()
    const conTarget = conMistica(estadoMinimo(), DS021, 'B', 0)
    const conFB022 = conMistica(conTarget.s, FB022, 'A', 0, {
      copyTargetId: conTarget.id,
      copyOneShotDisparado: true,
    })
    const s0 = conInstancias(conFB022.s, { 'e-0': { cardId: ETER_ORDEN, owner: 'A' } })
    const s: GameState = {
      ...s0,
      instances: {
        ...s0.instances,
        [conFB022.id]: { ...s0.instances[conFB022.id], eterBloqueado: ['e-0'] },
      },
    }
    expect(copyActivo(s, conFB022.id)).toBe(true)

    liberarEterBloqueado(s, ctx, conFB022.id, '1A')
    expect(copyActivo(s, conFB022.id)).toBe(false)
    expect(s.instances[conFB022.id].copyOneShotDisparado).toBeUndefined()
  })
})
