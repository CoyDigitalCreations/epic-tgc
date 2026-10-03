// @vitest-environment node
/**
 * Fase 3a — Bloqueo de Éter en Artefactos (manual §7.7).
 *
 * "BLOQUEADO EN MÍSTICA/ARCANA: El Éter pagado para una Mística o Arcana con
 * efecto CONTINUO queda bloqueado, colocado EN HORIZONTAL sobre la carta
 * (3A-3F), mientras el efecto esté activo." — manual §7.7 L911/943-944
 *
 * Tests genéricos por TIPO (mecánica de bloqueo) + cartas reales del JSON:
 * FB-020 Lamento de las Casas — Mística Artefacto, hechizo buff, eter_bloqueado:3
 * FB-022 Último Refugio — Mística Fugaz, hechizo copy, eter_bloqueado:3
 * FB-032 Rito del Alba — Mística Artefacto, hechizo invocar_y_equipar, bloqueo_fijo:4
 * FB-019 Mística SIN costo bloqueado (rechazo)
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { bloquearEter, validarBloqueo, reagruparEter } from '../payments'
import { statsDe } from '../efectos'
import { dispararUmbralBloqueo, reagruparEfectosBloqueoAlba } from '../effectInterpreter'
import { destruirCarta, liberarEterBloqueado } from '../replacements'
import { resolverAlba } from '../phases'
import type { Ctx, GameState, PlayerId } from '../types'

const FB020 = 'FB-020' // Mística Artefacto, eter_bloqueado:3, buffPerBlockedEther
const FB022 = 'FB-022' // Mística Fugaz, eter_bloqueado:3, copy mientras_ester_bloqueado
const FB032 = 'FB-032' // Mística Artefacto, bloqueo_fijo:4, invocar_y_equipar
const MISTICA_SIN_BLOQUEO = 'FB-019' // Mística sin costo bloqueado
const ETER_ORDEN = 'FB-001'
const CAMPEON = 'FB-011' // Vaela 5/3 — sin habilidad de bloqueo
const CAMPEON_BLOQUEO = 'FB-016' // Cassandra: continuo con bloqueo_fijo

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

/** Mística de A en misticasTacticas[slot]. Devuelve su instance id. */
function conMisticaEnCampo(s: GameState, cardId: string, slot: number): { s: GameState; id: string } {
  const id = `mist-${cardId}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner: 'A' } }),
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          campo: {
            ...s.players.A.campo,
            misticasTacticas: s.players.A.campo.misticasTacticas.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

/** Campeón de A en campo[slot]. Devuelve su instance id. */
function conCampeonEnCampo(s: GameState, cardId: string, slot: number): { s: GameState; id: string } {
  const id = `camp-${cardId}-${slot}`
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner: 'A' } }),
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          campo: {
            ...s.players.A.campo,
            campeones: s.players.A.campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

/** Éteres dueño A en Reserva 2A. */
function conEteres(s: GameState, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner: 'A' }]))),
      players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
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

describe('bloqueo de Éter en Artefactos — mecánica genérica (Fase 3a)', () => {
  it('Mística con costo-bloqueado acepta bloquear_eter: 2A → inst.eterBloqueado + evento', () => {
    const ctx = crearCtx()
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    const { s, ids } = conEteres(conCampo.s, ETER_ORDEN, 1)
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids, targetInstanceId: conCampo.id }, ctx)

    expect(s2.instances[conCampo.id].eterBloqueado).toEqual(ids)
    expect(s2.players.A.eterReserva).toHaveLength(0)
    expect(ctx.events).toEqual([
      { type: 'eter_bloqueado', jugador: 'A', eterIds: ids, campeonId: conCampo.id },
    ])
  })

  it('Mística sin costo-bloqueado rechaza bloquear_eter (no cambia estado)', () => {
    const ctx = crearCtx()
    const conCampo = conMisticaEnCampo(estadoMinimo(), MISTICA_SIN_BLOQUEO, 0)
    const { s, ids } = conEteres(conCampo.s, ETER_ORDEN, 1)
    const error = bloquearEter(s, ctx, 'A', ids, conCampo.id)

    expect(error).toBeTruthy()
    expect(s.instances[conCampo.id].eterBloqueado).toBeUndefined()
    expect(s.players.A.eterReserva).toHaveLength(1)
    expect(ctx.events).toEqual([])
  })

  it('capacidad máxima: acepta hasta costo.cantidad, rechaza el exceso', () => {
    // FB-022: eter_bloqueado cantidad 3 → máximo 3
    const ctx = crearCtx()
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    let { s, ids } = conEteres(conCampo.s, ETER_ORDEN, 4)

    // Bloquear 2 → OK (quedan 2 en reserva)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 2), targetInstanceId: conCampo.id }, ctx)
    expect(s.instances[conCampo.id].eterBloqueado).toHaveLength(2)

    // Bloquear 1 más → OK (total 3 = máximo)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: [ids[2]], targetInstanceId: conCampo.id }, ctx)
    expect(s.instances[conCampo.id].eterBloqueado).toHaveLength(3)

    // Bloquear 1 más → RECHAZADO (4 > 3)
    const error = bloquearEter(s, ctx, 'A', [ids[3]], conCampo.id)
    expect(error).toMatch(/máximo/)
    expect(s.instances[conCampo.id].eterBloqueado).toHaveLength(3)
  })

  it('rechaza Éter que no está en la Reserva', () => {
    const ctx = crearCtx()
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 1)
    // Éter registrado pero fuera de la Reserva
    const sConFuera = conInstancias(s, { 'fuera-1': { cardId: ETER_ORDEN, owner: 'A' } })
    const error = bloquearEter(sConFuera, ctx, 'A', ['fuera-1'], conCampo.id)
    expect(error).toMatch(/Reserva/)
  })

  it('rechaza Éter ya bloqueado en OTRA carta del jugador (check defensivo)', () => {
    const ctx = crearCtx()
    const conMist = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    const conMist2 = conMisticaEnCampo(conMist.s, FB020, 1)
    const { s, ids } = conEteres(conMist2.s, ETER_ORDEN, 1)

    // Estado inconsistente defensivo: éter EN Reserva Y bloqueado en FB-022
    // (el check "ya está bloqueado en otra carta" debe atraparlo antes que
    // el flujo normal donde el éter sale de la Reserva al bloquearse)
    const sInconsistente: GameState = {
      ...s,
      instances: {
        ...s.instances,
        [conMist.id]: { ...s.instances[conMist.id], eterBloqueado: ids },
      },
    }
    const error = bloquearEter(sInconsistente, ctx, 'A', ids, conMist2.id)
    expect(error).toMatch(/ya está bloqueado/)
    expect(sInconsistente.instances[conMist2.id].eterBloqueado).toBeUndefined()
  })

  it('validarBloqueo es read-only: no muta el estado', () => {
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    const { s, ids } = conEteres(conCampo.s, ETER_ORDEN, 1)
    const antes = JSON.parse(JSON.stringify(s))
    const error = validarBloqueo(s, 'A', ids, conCampo.id)
    expect(error).toBeNull()
    expect(s).toEqual(antes)
  })
})

describe('bloqueo en Artefactos — getValidActions (Fase 3a)', () => {
  it('genera bloquear_eter para Mística con costo-bloqueado en campo', () => {
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB022, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 2)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos.length).toBeGreaterThan(0)
    // Todas las acciones de bloqueo apuntan a la Mística
    for (const b of bloqueos) {
      if (b.type === 'bloquear_eter') expect(b.targetInstanceId).toBe(conCampo.id)
    }
  })

  it('NO genera bloquear_eter para Mística sin costo-bloqueado', () => {
    const conCampo = conMisticaEnCampo(estadoMinimo(), MISTICA_SIN_BLOQUEO, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 2)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(0)
  })

  it('genera bloquear_eter para FB-032 (bloqueo_fijo:4) como acción EXACTA', () => {
    const conCampo = conMisticaEnCampo(estadoMinimo(), FB032, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 6)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    // bloqueo_fijo → UNA acción con los 4 Éteres exactos (no 4 acciones sueltas)
    expect(bloqueos).toHaveLength(1)
    if (bloqueos[0]?.type === 'bloquear_eter') {
      expect(bloqueos[0].eterIds).toHaveLength(4)
    }
  })

  it('NO genera el path hardcodeado stale de FB-022 (activar_habilidad con eterIds vacíos)', () => {
    // Setup: Campeón en campo + FB-022 equipada + campeones en cementerio coste ≤3
    // El path stale (validActions.ts) generaba activar_habilidad con eterIds: []
    // cuando FB-022 estaba equipada — describe el DISEÑO VIEJO de la carta.
    const conCamp = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    let s = conInstancias(conCamp.s, {
      'fb022-eq': { cardId: FB022, owner: 'A', extra: { equipadoA: conCamp.id } },
    })
    // Cementerio con campeones de coste ≤ 3
    s = conInstancias(s, {
      'cementerio-cam1': { cardId: CAMPEON, owner: 'A' },
      'cementerio-cam2': { cardId: CAMPEON, owner: 'A' },
    })
    s = {
      ...s,
      players: {
        ...s.players,
        A: { ...s.players.A, cementerio: ['cementerio-cam1', 'cementerio-cam2'] },
      },
    }

    const acciones = getValidActions(s, 'A')
    const activacionesVacias = acciones.filter(
      (a) => a.type === 'activar_habilidad' && a.eterIds.length === 0,
    )
    expect(activacionesVacias).toHaveLength(0)
  })
})

describe('bloqueo en Artefactos — regresión Campeones (Fase 3a)', () => {
  it('Campeón con habilidad "bloqueado" sigue generando bloquear_eter (exacto)', () => {
    // FB-016 Cassandra: bloqueo_fijo:4 → necesita 4 Éteres para generar la acción
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON_BLOQUEO, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 4)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(1)
    if (bloqueos[0]?.type === 'bloquear_eter') {
      expect(bloqueos[0].targetInstanceId).toBe(conCampo.id)
      expect(bloqueos[0].eterIds).toHaveLength(4)
    }
  })

  it('Campeón sin habilidad de bloqueo NO genera bloquear_eter', () => {
    const conCampo = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const { s } = conEteres(conCampo.s, ETER_ORDEN, 1)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    expect(bloqueos).toHaveLength(0)
  })

  it('Campeón y Mística conviven: cada uno recibe bloqueo en su target', () => {
    const ctx = crearCtx()
    // FB-016 Cassandra (fijo 4) + FB-022 (flexible 3) → 4+ Éteres
    const conCamp = conCampeonEnCampo(estadoMinimo(), CAMPEON_BLOQUEO, 0)
    const conMist = conMisticaEnCampo(conCamp.s, FB022, 0)
    const { s } = conEteres(conMist.s, ETER_ORDEN, 5)

    const bloqueos = getValidActions(s, 'A').filter((a) => a.type === 'bloquear_eter')
    const targets = bloqueos.map((b) => (b.type === 'bloquear_eter' ? b.targetInstanceId : ''))
    expect(targets).toContain(conCamp.id)
    expect(targets).toContain(conMist.id)

    // Bloquear exacto en el campeón (4) — sale de la Reserva
    const accCamp = bloqueos.find((b) => b.type === 'bloquear_eter' && b.targetInstanceId === conCamp.id)!
    const s2 = aplicar(s, accCamp, ctx)
    expect(s2.instances[conCamp.id].eterBloqueado).toHaveLength(4)

    // Regenerar acciones (la Reserva cambió) y bloquear en la mística
    const bloqueos2 = getValidActions(s2, 'A').filter((a) => a.type === 'bloquear_eter')
    const accMist = bloqueos2.find((b) => b.type === 'bloquear_eter' && b.targetInstanceId === conMist.id)!
    const s3 = aplicar(s2, accMist, ctx)
    expect(s3.instances[conMist.id].eterBloqueado).toHaveLength(1)
  })
})

describe('FB-020 Lamento de las Casas — aura derivada (Fase 3a Phase C)', () => {
  /**
   * FB-020: "Puedes bloquear hasta un máximo de 3 Éter (Max. 3), el Campeón
   * equipado con esta carta gana 2 de ATQ por cada Éter bloqueado."
   * Efecto: hechizo buff, buffPerBlockedEther, objetivo equipped_champion propio.
   * El buff es DERIVADO: +2 × (éter bloqueado EN LA MÍSTICA).
   * FB-011 Vaela base: 5 ATQ / 3 RES.
   */

  /** Setup: Campeón + FB-020 equipada, con N éteres bloqueados en la Mística. */
  function conFB020Equipada(bloqueados: number): { s: GameState; champId: string; mistId: string } {
    const conCamp = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const conMist = conMisticaEnCampo(conCamp.s, FB020, 0)
    const eterIds = Array.from({ length: bloqueados }, (_, i) => `e-blq-${i}`)
    const s: GameState = {
      ...conMist.s,
      instances: {
        ...conMist.s.instances,
        // FB-020 equipada al campeón
        [conMist.id]: {
          ...conMist.s.instances[conMist.id],
          equipadoA: conCamp.id,
          eterBloqueado: eterIds,
        },
        // Instancias de éter bloqueado (referenciadas desde eterBloqueado)
        ...Object.fromEntries(eterIds.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' as PlayerId }])),
      },
    }
    return { s, champId: conCamp.id, mistId: conMist.id }
  }

  it('0 éter bloqueado: stats base del campeón (sin buff)', () => {
    const { s, champId } = conFB020Equipada(0)
    expect(statsDe(s, champId)).toEqual({ poder: 5, resistencia: 3 })
  })

  it('1 éter bloqueado: +2 ATQ (5→7), RES sin cambio', () => {
    const { s, champId } = conFB020Equipada(1)
    expect(statsDe(s, champId)).toEqual({ poder: 7, resistencia: 3 })
  })

  it('2 éteres bloqueados: +4 ATQ (5→9)', () => {
    const { s, champId } = conFB020Equipada(2)
    expect(statsDe(s, champId)).toEqual({ poder: 9, resistencia: 3 })
  })

  it('3 éteres bloqueados (máximo): +6 ATQ (5→11)', () => {
    const { s, champId } = conFB020Equipada(3)
    expect(statsDe(s, champId)).toEqual({ poder: 11, resistencia: 3 })
  })

  it('FB-020 en campo SIN equipar: no aplica buff a ningún campeón', () => {
    const conCamp = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const conMist = conMisticaEnCampo(conCamp.s, FB020, 0)
    const s: GameState = {
      ...conMist.s,
      instances: {
        ...conMist.s.instances,
        [conMist.id]: {
          ...conMist.s.instances[conMist.id],
          eterBloqueado: ['e-blq-0'],
        },
        'e-blq-0': { cardInstanceId: 'e-blq-0', cardId: ETER_ORDEN, owner: 'A' },
      },
    }
    // El campeón NO tiene equipadoA apuntando a FB-020 → sin buff
    expect(statsDe(s, conCamp.id)).toEqual({ poder: 5, resistencia: 3 })
  })

  it('buff aplica SOLO al campeón equipado, no a otros', () => {
    // Dos campeones: champ0 con FB-020 equipada, champ1 sin equipar
    const conCamp0 = conCampeonEnCampo(estadoMinimo(), CAMPEON, 0)
    const conCamp1 = conCampeonEnCampo(conCamp0.s, CAMPEON, 1)
    const conMist = conMisticaEnCampo(conCamp1.s, FB020, 0)
    const s: GameState = {
      ...conMist.s,
      instances: {
        ...conMist.s.instances,
        [conMist.id]: {
          ...conMist.s.instances[conMist.id],
          equipadoA: conCamp0.id,
          eterBloqueado: ['e-blq-0'],
        },
        'e-blq-0': { cardInstanceId: 'e-blq-0', cardId: ETER_ORDEN, owner: 'A' },
      },
    }
    expect(statsDe(s, conCamp0.id)).toEqual({ poder: 7, resistencia: 3 }) // equipado: +2
    expect(statsDe(s, conCamp1.id)).toEqual({ poder: 5, resistencia: 3 }) // sin equipar: base
  })
})

describe('FB-032 Rito del Alba — one-shot invocar_y_equipar (Fase 3a Phase D)', () => {
  /**
   * FB-032: "Bloquea 4 Éter, invoca un Campeón del Exilio de su dueño y equipa
   * esta carta a ese Campeón, mientras ese Éter esté bloqueado."
   * Efecto: hechizo invocar_y_equipar, costo bloqueo_fijo:4,
   * duracion mientras_ester_bloqueado, zonaOrigen exilio.
   * One-shot: al alcanzar 4 bloqueados → invoca + equipa. El equip dura
   * mientras el Éter esté bloqueado.
   */

  /** Setup: FB-032 en campo + campeón en exilio + N éteres en reserva. */
  function conFB032Setup(eters: number): { s: GameState; fb032Id: string; campeonExilioId: string; ids: string[] } {
    const conMist = conMisticaEnCampo(estadoMinimo(), FB032, 0)
    const campeonExilioId = 'camp-exilio-1'
    const ids = Array.from({ length: eters }, (_, i) => `e-${i}`)
    const s: GameState = {
      ...conMist.s,
      instances: {
        ...conMist.s.instances,
        [campeonExilioId]: { cardInstanceId: campeonExilioId, cardId: CAMPEON, owner: 'A' as PlayerId },
        ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' as PlayerId }])),
      },
      players: {
        ...conMist.s.players,
        A: {
          ...conMist.s.players.A,
          exilio: [campeonExilioId],
          eterReserva: ids,
        },
      },
    }
    return { s, fb032Id: conMist.id, campeonExilioId, ids }
  }

  it('bloqueo_fijo rechaza monto INCOMPLETO (no es "hasta")', () => {
    const ctx = crearCtx()
    let { s, fb032Id, ids } = conFB032Setup(4)
    // FB-032 es bloqueo_fijo:4 → 3 Éteres NO son válidos
    const error = bloquearEter(s, ctx, 'A', ids.slice(0, 3), fb032Id)
    expect(error).toMatch(/exactamente/)
    expect(s.instances[fb032Id].eterBloqueado).toBeUndefined()
  })

  it('bloqueo_fijo: bloquear los 4 exactos alcanza umbral → invoca y equipa', () => {
    const ctx = crearCtx()
    let { s, fb032Id, campeonExilioId, ids } = conFB032Setup(4)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: fb032Id }, ctx)
    expect(s.players.A.campo.campeones).toContain(campeonExilioId)
    expect(s.instances[campeonExilioId].agotado).toBe(true)
    expect(s.players.A.exilio).toHaveLength(0)
    expect(s.instances[fb032Id].equipadoA).toBe(campeonExilioId)
    expect(s.instances[fb032Id].eterBloqueado).toHaveLength(4)
  })

  it('no re-dispara mientras el flag esté activo (sin liberación)', () => {
    const ctx = crearCtx()
    let { s, fb032Id, ids } = conFB032Setup(4)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: fb032Id }, ctx)
    const campeonesTrasDisparo = s.players.A.campo.campeones.filter(Boolean).length
    expect(campeonesTrasDisparo).toBe(1)
    // Llamar dispararUmbralBloqueo directamente: flag activo → no-op
    dispararUmbralBloqueo(s, ctx, fb032Id)
    expect(s.players.A.campo.campeones.filter(Boolean)).toHaveLength(campeonesTrasDisparo)
  })

  it('tras liberar el Éter (flag limpiado), re-bloquear exacto RE-DISPARA', () => {
    const ctx = crearCtx()
    const conMist = conMisticaEnCampo(estadoMinimo(), FB032, 0)
    const champ1 = 'camp-exilio-1'
    const champ2 = 'camp-exilio-2'
    const ids = Array.from({ length: 8 }, (_, i) => `e-${i}`)
    let s: GameState = {
      ...conMist.s,
      instances: {
        ...conMist.s.instances,
        [champ1]: { cardInstanceId: champ1, cardId: CAMPEON, owner: 'A' as PlayerId },
        [champ2]: { cardInstanceId: champ2, cardId: CAMPEON, owner: 'A' as PlayerId },
        ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' as PlayerId }])),
      },
      players: {
        ...conMist.s.players,
        A: { ...conMist.s.players.A, exilio: [champ1, champ2], eterReserva: ids },
      },
    }
    const fb032Id = conMist.id

    // Primer disparo: bloquear 4 exactos → champ1 invocado
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: fb032Id }, ctx)
    expect(s.players.A.campo.campeones).toContain(champ1)
    expect(s.instances[fb032Id].efectoUmbralDisparado).toBe(true)

    // Liberar Éter → flag limpiado
    liberarEterBloqueado(s, ctx, fb032Id, '1A')
    expect(s.instances[fb032Id].efectoUmbralDisparado).toBeUndefined()

    // Re-bloquear 4 exactos → RE-DISPARA (champ2 invocado)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(4, 8), targetInstanceId: fb032Id }, ctx)
    expect(s.players.A.campo.campeones).toContain(champ2)
    expect(s.instances[fb032Id].equipadoA).toBe(champ2)
  })

  it('alba: el Éter permanece bloqueado en FB-032 (no se reagrupa)', () => {
    const ctx = crearCtx()
    let { s, fb032Id, ids } = conFB032Setup(4)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: fb032Id }, ctx)
    // Simular alba: reagruparEter mueve 1A→2A; el bloqueado NO está en 1A
    s = { ...s, players: { ...s.players, A: { ...s.players.A, eterPagado: ['pagado-x'] } } }
    reagruparEter(s, ctx, 'A')
    expect(s.instances[fb032Id].eterBloqueado).toHaveLength(4) // permanece
    expect(s.players.A.eterReserva).toContain('pagado-x') // lo pagado sí reagrupa
  })

  it('destruir FB-032 libera el Éter a 1A; el campeón invocado permanece en campo', () => {
    const ctx = crearCtx()
    let { s, fb032Id, campeonExilioId, ids } = conFB032Setup(4)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: fb032Id }, ctx)
    destruirCarta(s, ctx, fb032Id, 'efecto')
    // Éter liberado a 1A (pagado)
    expect(s.instances[fb032Id]?.eterBloqueado).toBeUndefined()
    expect(s.players.A.eterPagado).toEqual(expect.arrayContaining(ids))
    // Campeón invocado sigue en campo
    expect(s.players.A.campo.campeones).toContain(campeonExilioId)
  })
})

describe('Aurora FB-010 — steal_champion vía bloqueo_fijo', () => {
  const AURORA = 'FB-010'
  const RIVAL = 'FB-011' // Vaela — campeón rival

  function setupAurora(): { s: GameState; auroraId: string; rivalId: string; ids: string[] } {
    const base = estadoMinimo()
    const auroraId = 'aurora-1'
    const rivalId = 'rival-1'
    const ids = Array.from({ length: 6 }, (_, i) => `ea-${i}`)
    const s: GameState = {
      ...base,
      instances: {
        [auroraId]: { cardInstanceId: auroraId, cardId: AURORA, owner: 'A' },
        [rivalId]: { cardInstanceId: rivalId, cardId: RIVAL, owner: 'B' },
        ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId: ETER_ORDEN, owner: 'A' }])),
      },
      players: {
        ...base.players,
        A: {
          ...base.players.A,
          campo: { ...base.players.A.campo, campeones: [auroraId, null, null, null, null] },
          eterReserva: ids,
        },
        B: {
          ...base.players.B,
          campo: { ...base.players.B.campo, campeones: [rivalId, null, null, null, null] },
        },
      },
    }
    return { s, auroraId, rivalId, ids }
  }

  it('bloqueo_fijo de Aurora exige exactamente 4 (rechaza 2)', () => {
    const ctx = crearCtx()
    const { s, auroraId, ids } = setupAurora()
    const error = bloquearEter(s, ctx, 'A', ids.slice(0, 2), auroraId)
    expect(error).toMatch(/exactamente 4/)
  })

  it('al bloquear 4 exactos → arma pendiente steal_champion (D1)', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    const s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    expect(s2.instances[auroraId].eterBloqueado).toHaveLength(4)
    expect(s2.instances[auroraId].efectoUmbralDisparado).toBe(true)
    // Pendiente D1: jugador elige qué campeón rival robar
    expect(s2.objetivosPendientes).toBeDefined()
    expect(s2.objetivosPendientes![0].opciones).toContain(rivalId)
    expect(s2.objetivosPendientes![0].jugador).toBe('A')
  })

  it('al elegir el objetivo → roba el campeón (agotado, dueño original)', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: rivalId }, ctx)
    expect(s2.players.A.campo.campeones).toContain(rivalId)
    expect(s2.players.B.campo.campeones[0]).toBeNull()
    expect(s2.instances[rivalId].agotado).toBe(true)
    expect(s2.instances[rivalId].stolenBy).toBe(auroraId)
    // Dueño original se conserva (control prestado)
    expect(s2.instances[rivalId].owner).toBe('B')
  })

  it('al liberar el Éter de Aurora → el campeón robado regresa al rival', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: rivalId }, ctx)
    expect(s2.players.A.campo.campeones).toContain(rivalId)

    liberarEterBloqueado(s2, ctx, auroraId, '1A')
    expect(s2.players.B.campo.campeones).toContain(rivalId)
    expect(s2.players.A.campo.campeones).not.toContain(rivalId)
    expect(s2.instances[rivalId].stolenBy).toBeUndefined()
  })

  it('Alba propia: reagrupa el Éter del efecto steal a la Reserva + retorno del robado', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: rivalId }, ctx)
    expect(s2.instances[auroraId].eterBloqueado).toHaveLength(4)
    expect(s2.players.A.campo.campeones).toContain(rivalId)

    // Simular Alba de A (dueño de Aurora)
    const antesReserva = s2.players.A.eterReserva.length
    resolverAlba(s2, ctx, 'A')

    // Éter del efecto → Reserva (NO solo 1A)
    expect(s2.instances[auroraId].eterBloqueado).toBeUndefined()
    expect(s2.players.A.eterReserva.length).toBe(antesReserva + 4)
    // Aurora puede volver a bloquear (sin bloqueo activo)
    expect(s2.instances[auroraId].efectoUmbralDisparado).toBeUndefined()
    // Campeón robado regresa al rival (tenía slot libre)
    expect(s2.players.B.campo.campeones).toContain(rivalId)
    expect(s2.players.A.campo.campeones).not.toContain(rivalId)
    expect(s2.instances[rivalId].stolenBy).toBeUndefined()
  })

  it('Alba propia: si el rival está LLENO, el campeón robado se queda controlado', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    // B empieza con 5 campeones (campo lleno). Robamos el de slot 0.
    const extras = ['b-full-1', 'b-full-2', 'b-full-3', 'b-full-4']
    const extra: GameState = {
      ...s,
      instances: {
        ...s.instances,
        ...Object.fromEntries(extras.map((id) => [id, { cardInstanceId: id, cardId: RIVAL, owner: 'B' as PlayerId }])),
      },
      players: {
        ...s.players,
        B: {
          ...s.players.B,
          campo: { ...s.players.B.campo, campeones: [rivalId, ...extras] },
        },
      },
    }
    let s2 = aplicar(extra, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: rivalId }, ctx)
    // Tras el robo: A tiene el robado; B quedó con 4 (slot 0 libre)...
    // ¡OJO! El robo QUITA al rival de B → B queda con slot libre.
    // Para simular "rival lleno AL MOMENTO del reagrupar", llenamos DESPUÉS del robo.
    extras.forEach((id, i) => {
      s2 = {
        ...s2,
        instances: { ...s2.instances, [id]: { ...s2.instances[id], owner: 'B' } },
        players: {
          ...s2.players,
          B: {
            ...s2.players.B,
            campo: {
              ...s2.players.B.campo,
              campeones: s2.players.B.campo.campeones.map((c, idx) =>
                c === null && idx < extras.length ? extras[idx] : c,
              ),
            },
          },
        },
      }
    })
    // Verificar: B lleno (5), A tiene el robado
    expect(s2.players.B.campo.campeones.filter(Boolean)).toHaveLength(5)
    expect(s2.players.A.campo.campeones).toContain(rivalId)

    const reservaAntes = s2.players.A.eterReserva.length
    resolverAlba(s2, ctx, 'A')

    // Éter reagrupado
    expect(s2.instances[auroraId].eterBloqueado).toBeUndefined()
    expect(s2.players.A.eterReserva.length).toBe(reservaAntes + 4)
    // Rival lleno al reagrupar → el campeón SE QUEDA con A
    expect(s2.players.A.campo.campeones).toContain(rivalId)
    expect(s2.players.B.campo.campeones).not.toContain(rivalId)
  })

  it('Alba propia: campeón destruido mientras robado → no regresa', () => {
    const ctx = crearCtx()
    const { s, auroraId, rivalId, ids } = setupAurora()
    let s2 = aplicar(s, { type: 'bloquear_eter', eterIds: ids.slice(0, 4), targetInstanceId: auroraId }, ctx)
    s2 = aplicar(s2, { type: 'elegir_objetivo', objetivoId: rivalId }, ctx)
    // Destruir el campeón robado (está en campo de A)
    destruirCarta(s2, ctx, rivalId, 'efecto')
    expect(s2.players.A.campo.campeones).not.toContain(rivalId)

    resolverAlba(s2, ctx, 'A')
    // No regresa al campo de B (fue destruido)
    expect(s2.players.B.campo.campeones).not.toContain(rivalId)
    expect(s2.instances[rivalId]?.stolenBy).toBeUndefined()
  })
})
