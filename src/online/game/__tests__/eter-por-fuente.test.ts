// @vitest-environment node
/**
 * Fase 2 — Éter POR FUENTE: modelo de filiación del Éter bloqueado.
 *
 * - Etiquetado: bloqueadoPorEfecto `${fuente}#${indiceEfecto}` + pagadoPor
 *   en TODOS los caminos de bloqueo (bloquear_eter, activar_habilidad).
 * - (b) Límites contra la FUENTE del efecto, no "primer costo de la carta".
 * - (e) Umbrales/tramos cuentan SOLO Éter de su fuente (el ajeno no suma).
 * - (d) reagrupar selectivo (solo el Éter del efecto con reagrupar) y fin de
 *   steal cuando la fuente queda SIN Éter (≥1 de cualquier fuente lo sostiene).
 * - (f) Liberación POR PAGADOR: cada Éter vuelve a quien lo pagó.
 *
 * Fallback documentado (eter.ts): Éter SIN tag cuenta como propio de
 * cualquier fuente — los tests que arman estados a mano siguen verdes.
 */
import { describe, it, expect } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { bloquearEter, validarBloqueo } from '../payments'
import { dispararUmbralBloqueo, reagruparEfectosBloqueoAlba } from '../effectInterpreter'
import { liberarEterBloqueado } from '../replacements'
import { ejecutarActivarHabilidad } from '../habilidades'
import { claveEfecto, evaluarFinSteal, eterDeEfecto } from '../eter'
import { efectoBloqueoAccion, getCardMeta, registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import { getValidActions } from '../validActions'
import type { Ctx, GameState, PlayerId } from '../types'

const FB010 = 'FB-010' // Aurora: disparo destroy(eter:2) + continuo steal bloqueo_fijo:4 (reagrupar alba)
const FB011 = 'FB-011' // Vaela 5/3 — campeón "genérico" (víctima de steal)
const FB015 = 'FB-015' // Elena: continuo double_attack, bloqueo_fijo 3 (efecto[0])
const FB016 = 'FB-016' // Cassandra: continuo eter_bloqueado:4 con tramos [2 toggle, 4 fix]
// Ninguna carta real usa ya un DISPARO que bloquea Éter (todo lo que bloquea Éter es continuo; DS-017 Vorlag
// paga Éter). El motor conserva el patrón "Bloqueado" vía activar_habilidad: se cubre con una carta sintética.
const DISPARO_BLOQUEADO = 'TEST-DISPARO-BLOQUEADO'
const ETER_ORDEN = 'FB-001'

registrarCartas([{
  id: DISPARO_BLOQUEADO,
  name: 'Disparo Bloqueado Test',
  type: 'Campeón',
  rarity: 'Común',
  keywords: [],
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
  stats: { cost: 2, poder: 2, resistencia: 2 },
  efectos: [{
    tipo: 'disparo',
    efecto: 'mover',
    objetivo: { tipo: 'eter', controlador: 'rival', zona: 'pagado', zonaDestino: 'reserva' },
    stats: { ATQ: 0, RES: 0 },
    costo: { tipo: 'bloqueo_fijo', cantidad: 2 },
    duracion: 'mientras_ester_bloqueado',
    texto: 'Bloquea 2 Éter, mueve 1 Éter del rival de la zona de pago a la Reserva de su dueño, mientras ese Éter esté bloqueado.',
  }],
} as unknown as AnyCard])

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

function conInstancias(
  s: GameState,
  mapa: Record<string, { cardId: string; owner?: PlayerId; extra?: Record<string, unknown> }>,
): GameState {
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

/** Campeón de `dueno` en campo[slot] de SU dueño. Devuelve su instance id. */
function conCampeonEnCampo(
  s: GameState,
  cardId: string,
  slot: number,
  dueno: PlayerId = 'A',
): { s: GameState; id: string } {
  const id = `camp-${cardId}-${slot}`
  const p = s.players[dueno]
  return {
    s: {
      ...conInstancias(s, { [id]: { cardId, owner: dueno } }),
      players: {
        ...s.players,
        [dueno]: {
          ...p,
          campo: { ...p.campo, campeones: p.campo.campeones.map((c, i) => (i === slot ? id : c)) },
        },
      },
    },
    id,
  }
}

/** Éteres dueño A en Reserva 2A. */
function conEteres(s: GameState, n: number, cardId: string = ETER_ORDEN): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    s: {
      ...conInstancias(s, Object.fromEntries(ids.map((id) => [id, { cardId, owner: 'A' }]))),
      players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
    },
    ids,
  }
}

/** Éter FÍSICAMENTE en la carta pero etiquetado con OTRA fuente (simula multi-efecto). */
function conEterAjeno(s: GameState, cardInstanceId: string, n: number, claveAjena: string): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `ajeno-${i}`)
  const conInsts = conInstancias(
    s,
    Object.fromEntries(ids.map((id) => [id, { cardId: ETER_ORDEN, owner: 'A', extra: { bloqueadoPorEfecto: claveAjena, pagadoPor: 'A' as PlayerId } }])),
  )
  const inst = conInsts.instances[cardInstanceId]
  return {
    s: {
      ...conInsts,
      instances: {
        ...conInsts.instances,
        [cardInstanceId]: { ...inst, eterBloqueado: [...(inst.eterBloqueado ?? []), ...ids] },
      },
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

describe('Fase 2 — etiquetado: toda fuente de bloqueo filia el Éter', () => {
  it('bloquear_eter etiqueta cada Éter con fuente/efecto y PAGADOR', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, FB015, 0)
    s = camp.s
    const e = conEteres(s, 3)
    s = e.s

    const meta = getCardMeta(FB015)!
    const fuente = efectoBloqueoAccion(meta)!
    expect(fuente.indice).toBe(0)
    const clave = claveEfecto(camp.id, fuente.indice)

    s = aplicar(s, { type: 'bloquear_eter', eterIds: e.ids, targetInstanceId: camp.id }, crearCtx())

    for (const id of e.ids) {
      expect(s.instances[id].bloqueadoPorEfecto).toBe(clave)
      expect(s.instances[id].pagadoPor).toBe('A')
    }
    expect(s.instances[camp.id].eterBloqueado).toEqual(e.ids)
  })

  it('activar_habilidad (patrón Bloqueado, disparo sintético) también etiqueta', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, DISPARO_BLOQUEADO, 0)
    s = camp.s
    const e = conEteres(s, 2)
    s = e.s
    // Objetivo del "mover": un Éter pagado del rival (evita resolver sin targets)
    s = {
      ...s,
      players: { ...s.players, B: { ...s.players.B, eterPagado: ['e-rival'] } },
      instances: { ...s.instances, 'e-rival': { cardInstanceId: 'e-rival', cardId: ETER_ORDEN, owner: 'B' } },
    }

    const ctx = crearCtx()
    ejecutarActivarHabilidad(
      s,
      { type: 'activar_habilidad', cardInstanceId: camp.id, eterIds: e.ids },
      ctx,
    )

    const clave = claveEfecto(camp.id, 0) // disparo en índice 0
    for (const id of e.ids) {
      expect(s.instances[id].bloqueadoPorEfecto).toBe(clave)
      expect(s.instances[id].pagadoPor).toBe('A')
    }
    expect(s.instances[camp.id].eterBloqueado).toEqual(e.ids)
  })
})

describe('Fase 2 (b) — límites validados contra la FUENTE del efecto', () => {
  it('el Éter de OTRA fuente NO cuenta para el límite de esta acción', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, FB015, 0) // bloqueo_fijo:3
    s = camp.s
    // 1 Éter físico de otra fuente ya en la carta (contaría en el modelo viejo)
    const ajeno = conEterAjeno(s, camp.id, 1, claveEfecto('otra-carta', 0))
    s = ajeno.s
    const e = conEteres(s, 3)
    s = e.s

    // Modelo viejo: actuales=1 → total 4 ≠ 3 → RECHAZABA. Ahora: 0 + 3 = 3 ✓
    expect(validarBloqueo(s, 'A', e.ids, camp.id)).toBeNull()

    // bloquearEter muta en sitio y devuelve null si fue válido (o el motivo)
    expect(bloquearEter(s, crearCtx(), 'A', e.ids, camp.id)).toBeNull()
    // Físicamente 4 en la carta, pero SOLO 3 de esta fuente
    expect(s.instances[camp.id].eterBloqueado).toHaveLength(4)
    const fuente = efectoBloqueoAccion(getCardMeta(FB015)!)!
    expect(eterDeEfecto(s, camp.id, fuente.indice)).toHaveLength(3)
    expect(eterDeEfecto(s, camp.id, fuente.indice)).not.toContain(ajeno.ids[0])
  })
})

describe('Fase 2 (e) — umbrales y tramos cuentan SOLO Éter de su fuente', () => {
  it('FB-016: 2 Éteres ajenos + 2 propios → solo el tramo 2 dispara (NO el 4)', () => {
    let s = estadoMinimo()
    const cass = conCampeonEnCampo(s, FB016, 0)
    s = cass.s
    const rival = conCampeonEnCampo(s, FB011, 0, 'B') // target de toggle_exhaust
    s = rival.s
    // 2 físicos de otra fuente: total físico = 4 (alcanzaría el tramo 4 en el modelo viejo)
    const ajeno = conEterAjeno(s, cass.id, 2, claveEfecto('otra-carta', 0))
    s = ajeno.s
    const e = conEteres(s, 2)
    s = e.s

    s = aplicar(s, { type: 'bloquear_eter', eterIds: e.ids, targetInstanceId: cass.id }, crearCtx())

    // Propios = 2 → tramo 2 ✓; tramo 4 NO (los ajenos no suman para esta fuente)
    expect(s.instances[cass.id].tramosDisparados).toEqual([2])
    expect(s.instances[cass.id].eterBloqueado).toHaveLength(4)
  })

  it('dispararUmbralBloqueo directo: solo ajenos en la carta → NINGÚN tramo', () => {
    let s = estadoMinimo()
    const cass = conCampeonEnCampo(s, FB016, 0)
    s = cass.s
    const rival = conCampeonEnCampo(s, FB011, 0, 'B')
    s = rival.s
    s = conEterAjeno(s, cass.id, 3, claveEfecto('otra-carta', 0)).s // 3 físicos < umbral 4... pero > umbral 2

    dispararUmbralBloqueo(s, crearCtx(), cass.id)

    expect(s.instances[cass.id].tramosDisparados).toBeUndefined()
  })
})

describe('Fase 2 (d) — reagrupar selectivo y fin de steal por Éter total', () => {
  it('reagruparEfectosBloqueoAlba libera SOLO el Éter de su efecto (el ajeno permanece)', () => {
    let s = estadoMinimo()
    const aur = conCampeonEnCampo(s, FB010, 0)
    s = aur.s
    const fuente = efectoBloqueoAccion(getCardMeta(FB010)!)!
    expect(fuente.indice).toBe(1) // el steal continuo (efecto[1]) — el disparo es costo 'eter', no bloqueo
    const propios = ['au-0', 'au-1']
    s = conInstancias(s, Object.fromEntries(propios.map((id) => [id, { cardId: ETER_ORDEN, owner: 'A' }])))
    s = {
      ...s,
      players: { ...s.players, A: { ...s.players.A, eterReserva: [] } },
      instances: {
        ...s.instances,
        [aur.id]: {
          ...s.instances[aur.id],
          eterBloqueado: propios,
        },
      },
    }
    for (const id of propios) {
      s.instances[id].bloqueadoPorEfecto = claveEfecto(aur.id, fuente.indice)
      s.instances[id].pagadoPor = 'A'
    }
    const ajeno = conEterAjeno(s, aur.id, 1, claveEfecto('otra-carta', 0))
    s = ajeno.s

    const reservaAntes = s.players.A.eterReserva.length
    reagruparEfectosBloqueoAlba(s, crearCtx(), 'A')

    // Los propios vuelven a la Reserva de A; el ajeno sigue en la carta
    expect(s.players.A.eterReserva).toHaveLength(reservaAntes + 2)
    expect(s.players.A.eterReserva).toEqual(expect.arrayContaining(propios))
    expect(s.instances[aur.id].eterBloqueado).toEqual(ajeno.ids)
    expect(s.instances[ajeno.ids[0]].bloqueadoPorEfecto).toBe(claveEfecto('otra-carta', 0))
  })

  it('evaluarFinSteal: ≥1 Éter de CUALQUIER fuente sostiene el steal; 0 lo termina', () => {
    let s = estadoMinimo()
    const aur = conCampeonEnCampo(s, FB010, 0)
    s = aur.s
    // Víctima robada: física en el campo del ladrón (A), dueño original B
    const victim = conCampeonEnCampo(s, FB011, 1)
    s = victim.s
    s = {
      ...s,
      instances: {
        ...s.instances,
        [victim.id]: { ...s.instances[victim.id], owner: 'B', stolenBy: aur.id },
      },
    }
    // La fuente tiene 1 Éter — pero de OTRA fuente (cualquier fuente sostiene el steal)
    const ajeno = conEterAjeno(s, aur.id, 1, claveEfecto('otra-carta', 0))
    s = ajeno.s
    const ctx = crearCtx()

    evaluarFinSteal(s, ctx, aur.id)
    // Sigue robado: la fuente tiene ≥1 Éter
    expect(s.instances[victim.id].stolenBy).toBe(aur.id)
    expect(s.players.A.campo.campeones).toContain(victim.id)

    // Último Éter fuera → el steal TERMINA y el campeón vuelve a B
    delete s.instances[aur.id].eterBloqueado
    evaluarFinSteal(s, ctx, aur.id)
    expect(s.instances[victim.id].stolenBy).toBeUndefined()
    expect(s.players.B.campo.campeones).toContain(victim.id)
    expect(s.players.A.campo.campeones).not.toContain(victim.id)
  })
})

describe('Fase 2 (f) — la liberación devuelve el Éter a SU pagador', () => {
  it('liberarEterBloqueado agrupa por pagadoPor y limpia la filiación', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, FB015, 0)
    s = camp.s
    const e = conEteres(s, 3)
    s = e.s
    expect(bloquearEter(s, crearCtx(), 'A', e.ids, camp.id)).toBeNull()
    // Un Éter pagado por B (estado resultante de robo/reagrupa mixto)
    s.instances[e.ids[2]].pagadoPor = 'B'

    liberarEterBloqueado(s, crearCtx(), camp.id, '1A')

    expect(s.instances[camp.id].eterBloqueado).toBeUndefined()
    expect(s.players.A.eterPagado).toEqual([e.ids[0], e.ids[1]])
    expect(s.players.B.eterPagado).toEqual([e.ids[2]])
    for (const id of e.ids) {
      expect(s.instances[id].bloqueadoPorEfecto).toBeUndefined()
      expect(s.instances[id].pagadoPor).toBeUndefined()
    }
  })
})

describe('Fase 2 (c) — costo.origen "pagado": bloqueo desde la zona 1A', () => {
  const PAGADO = 'TEST-BLOQUEO-PAGADO'
  registrarCartas([{
    id: PAGADO,
    name: 'Bloqueo Pagado Test',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    paqueteId: 'test',
    limiteCopias: '1',
    stats: { cost: 2, poder: 1, resistencia: 1 },
    efectos: [{
      tipo: 'continuo',
      efecto: 'double_attack',
      duracion: 'mientras_ester_bloqueado',
      objetivo: { tipo: 'self', zona: 'campo' },
      costo: { tipo: 'bloqueo_fijo', cantidad: 2, origen: 'pagado' },
      texto: 'Bloquea 2 Éter desde la zona de éter pagado, mientras ese Éter esté bloqueado.',
    }],
  } as unknown as AnyCard])

  /** Mueve éteres de Reserva 2A → Éter Pagado 1A (estado previo al bloqueo). */
  function pagarEteres(s: GameState, ids: string[]): GameState {
    return {
      ...s,
      players: {
        ...s.players,
        A: {
          ...s.players.A,
          eterReserva: s.players.A.eterReserva.filter((id) => !ids.includes(id)),
          eterPagado: [...s.players.A.eterPagado, ...ids],
        },
      },
    }
  }

  it('validarBloqueo exige el Éter en 1A — en Reserva lo rechaza', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, PAGADO, 0)
    s = camp.s
    const e = conEteres(s, 2) // en Reserva (zona INCORRECTA para este costo)
    s = e.s

    const err = validarBloqueo(s, 'A', e.ids, camp.id)
    expect(err).toContain('Éter Pagado (1A)')

    s = pagarEteres(s, e.ids)
    expect(validarBloqueo(s, 'A', e.ids, camp.id)).toBeNull()
  })

  it('bloquear_eter consume desde 1A y deja la Reserva intacta', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, PAGADO, 0)
    s = camp.s
    const e = conEteres(s, 2)
    s = pagarEteres(e.s, e.ids)

    s = aplicar(s, { type: 'bloquear_eter', eterIds: e.ids, targetInstanceId: camp.id }, crearCtx())

    expect(s.instances[camp.id].eterBloqueado).toEqual(e.ids)
    expect(s.players.A.eterPagado).toEqual([])
    expect(s.players.A.eterReserva).toEqual([])
    // Etiquetado igual que cualquier bloqueo (filiación no cambia con el origen)
    const fuente = efectoBloqueoAccion(getCardMeta(PAGADO)!)!
    expect(s.instances[e.ids[0]].bloqueadoPorEfecto).toBe(claveEfecto(camp.id, fuente.indice))
    expect(s.instances[e.ids[0]].pagadoPor).toBe('A')
  })

  it('validActions solo ofrece bloquear_eter cuando la zona origen está poblada', () => {
    let s = estadoMinimo()
    const camp = conCampeonEnCampo(s, PAGADO, 0)
    s = camp.s
    const e = conEteres(s, 2) // en Reserva: NO debe ofrecer la acción
    s = e.s

    const sinOrigen = getValidActions(s, 'A').filter(
      (a) => a.type === 'bloquear_eter' && a.targetInstanceId === camp.id,
    )
    expect(sinOrigen).toHaveLength(0)

    s = pagarEteres(s, e.ids)
    const conOrigen = getValidActions(s, 'A').filter(
      (a) => a.type === 'bloquear_eter' && a.targetInstanceId === camp.id,
    )
    expect(conOrigen).toHaveLength(1)
    expect(conOrigen[0].type === 'bloquear_eter' && conOrigen[0].eterIds).toEqual(e.ids)
  })
})
