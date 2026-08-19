// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { dispararTrigger, limpiarRegistroEfectos, registrarEfecto } from '../efectos'
import { destruirCarta } from '../replacements'
import { registrarEfectos } from '../index'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas reales del paquete (paquetes.ts):
// Change 4 (mazo 45): FB-031 Campeón cost 2 · DS-031 Campeón cost 2 ·
// FB-032 Mística cost 2 · DS-032 Arcana cost 3 · DS-033 Mística cost 3.
// De apoyo: FB-010 Aurora 9/9 (cost 4) · FB-011 Vaela 5/3 (cost 2) ·
// DS-011 Kael 5/3 (cost 2) · DS-001 Ragnar 9/9 Soberano (cost 4) ·
// FB-012 Mira Transmutar · FB-024 Combate · FB-001 Éter Orden ·
// DS-002 Éter Caos · FB-002 Éter Vigor · DS-004 Éter descarte rival.
const FB031 = 'FB-031' // "Al ser enviada al Cementerio desde cualquier zona: agrega de tu mazo a tu mano 1 carta Campeón de coste 2 o menos."
const DS031 = 'DS-031' // idem FB-031
const FB032 = 'FB-032' // Mística: "Agrega de tu mazo a tu mano 1 carta de coste 2 o menos."
const DS032 = 'DS-032' // Arcana: "Al inicio de tu Choque, si controlas 2 o más Campeones con Éter bloqueado: agrega de tu mazo a tu mano 1 carta de coste 3 o menos."
const DS033 = 'DS-033' // Mística: "Agrega de tu mazo a tu mano 1 carta Campeón."
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const KAEL = 'DS-011'
const RAGNAR = 'DS-001'
const MIRA = 'FB-012' // 4/4 Transmutar
const COMBATE = 'FB-024'
const ETER_ORDEN = 'FB-001'
const ETER_CAOS = 'DS-002'
const FB002 = 'FB-002' // Éter Vigor (inicio-choque)
const DS004 = 'DS-004' // Éter: "el rival pierde 1 carta de su mano al azar"

/** Estado mínimo de combate: fase choque, turno A. */
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
    fase: 'choque' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Campeón de `owner` en el campo (slot 2B-2F); devuelve el estado y el id. */
function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
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

/** Arcana de `owner` en el campo (3D-3F); devuelve el estado y el id. */
function conArcana(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `a-${cardId}-${slot}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
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

/** Éter en reserva (2A) del `owner`; devuelve estado y id. */
function conEterReserva(s: GameState, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `e-${cardId}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          eterReserva: [...s.players[owner].eterReserva, id],
        },
      },
    },
    id,
  }
}

/** `n` Éteres del cardId en la Reserva 2A de A (ids únicos); devuelve el estado y los ids. */
function conEteres(s: GameState, cardId: string, n: number): { s: GameState; ids: string[] } {
  const ids = Array.from({ length: n }, (_, i) => `${cardId}-${i}`)
  return {
    s: {
      ...s,
      instances: {
        ...s.instances,
        ...Object.fromEntries(ids.map((id) => [id, { cardInstanceId: id, cardId, owner: 'A' }])),
      },
      players: { ...s.players, A: { ...s.players.A, eterReserva: [...s.players.A.eterReserva, ...ids] } },
    },
    ids,
  }
}

/** Instancia de `cardId` agregada al MAZO de `owner`; devuelve el estado (id derivado). */
function conCartaEnMazo(s: GameState, id: string, cardId: string, owner: PlayerId = 'A'): GameState {
  return {
    ...s,
    instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
    players: { ...s.players, [owner]: { ...s.players[owner], mazo: [...s.players[owner].mazo, id] } },
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

// Registrar handlers reales antes de cada test (los probes de cada test
// reemplazan SOLO el par (trigger, cardId) que registran, patrón campeones.test.ts).
beforeEach(() => {
  limpiarRegistroEfectos()
  registrarEfectos()
})

describe('soporte C5 (dependencia mazo 45): dispatch al-ser-enviado-al-cementerio en los 6 puntos de entrada', () => {
  it('1. destruirCarta (causa efecto): la carta muere → dispara con jugador = dueño y la instancia', () => {
    let s = estadoMinimo()
    const { s: s1, id: fb031 } = conCampeon(s, FB031, 0, 'A')
    s = s1

    const disparos: Array<{ jugador: string; inst: string }> = []
    registrarEfecto('al-ser-enviado-al-cementerio', FB031, (_st, _ctx, inst, payload) => {
      disparos.push({ jugador: payload.jugador, inst: inst.cardInstanceId })
    })

    const ctx = crearCtx()
    const destruida = destruirCarta(s, ctx, fb031, 'efecto')
    expect(destruida).toBe(true)
    expect(disparos).toEqual([{ jugador: 'A', inst: fb031 }])
    expect(s.players.A.cementerio).toContain(fb031)
  })

  it('2. resolución de cadena 9.6: Combate consumido → 2G → dispara con el dueño', () => {
    let s = estadoMinimo() // choque, turno A
    const combateId = 'combate-1'
    s.instances[combateId] = { cardInstanceId: combateId, cardId: COMBATE, owner: 'B' }
    s.players.B.campo.arcanasCombate[0] = combateId
    s.combate = {
      paso: 'bloqueo',
      atacantes: [],
      bloqueos: {},
      rupturaDisponible: false,
      rupturaUsadaEsteTurno: false,
      cadena: { pila: [combateId], prioridad: 'A', pasesConsecutivos: 0 },
    }

    const disparos: Array<{ jugador: string; inst: string }> = []
    registrarEfecto('al-ser-enviado-al-cementerio', COMBATE, (_st, _ctx, inst, payload) => {
      disparos.push({ jugador: payload.jugador, inst: inst.cardInstanceId })
    })

    const ctx = crearCtx()
    // 2 pases consecutivos cierran la cadena y resuelven la pila en orden inverso
    const r1 = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    const r2 = aplicar(r1, { type: 'pasar_prioridad' }, ctx)
    expect(disparos).toEqual([{ jugador: 'B', inst: combateId }])
    expect(r2.players.B.cementerio).toContain(combateId)
  })

  it('3. descarte de Ocaso: mano → 2G → dispara', () => {
    let s = estadoMinimo()
    s.fase = 'ocaso'
    const fb031 = 'c-fb031-mano'
    s.instances[fb031] = { cardInstanceId: fb031, cardId: FB031, owner: 'A' }
    s.players.A.mano = [fb031]

    const disparos: string[] = []
    registrarEfecto('al-ser-enviado-al-cementerio', FB031, (_st, _ctx, inst) => disparos.push(inst.cardInstanceId))

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'descartar_carta', cardInstanceIds: [fb031] }, ctx)
    expect(disparos).toEqual([fb031])
    expect(r.players.A.cementerio).toContain(fb031)
    expect(ctx.events).toContainEqual({ type: 'carta_descartada', jugador: 'A', cardInstanceIds: [fb031] })
  })

  it('4. sacrificio Soberano al invocar: el sacrificado → 2G → dispara', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    // DS-031 (Caos) en campo slot 0: se sacrifica al invocar Ragnar (Soberano, 1 sacrificio)
    const { s: s1, id: ds031 } = conCampeon(s, DS031, 0, 'A')
    s = s1
    const ragnar = 'ragnar-mano'
    s.instances[ragnar] = { cardInstanceId: ragnar, cardId: RAGNAR, owner: 'A' }
    s.players.A.mano = [ragnar]
    const { s: s2, ids } = conEteres(s, ETER_CAOS, 4) // Ragnar cuesta 4
    s = s2

    const disparos: string[] = []
    registrarEfecto('al-ser-enviado-al-cementerio', DS031, (_st, _ctx, inst) => disparos.push(inst.cardInstanceId))

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'jugar_campeon', cardInstanceId: ragnar, slot: 1, eterIds: ids, sacrificios: [ds031] }, ctx)
    expect(disparos).toEqual([ds031])
    expect(r.players.A.cementerio).toContain(ds031)
    expect(r.players.A.campo.campeones[1]).toBe(ragnar)
  })

  // TODO: Transmutar eliminado — pendiente rediseño de Cristal Huérfano
  // it('5. auto-sacrificio de Transmutar: Mira → 2G → dispara', () => { ... })

  it('6. DS-004 (descarte al azar de la mano del rival): la carta descartada → 2G → dispara', () => {
    let s = estadoMinimo()
    // DS-004 lo paga A; la mano del RIVAL (B) contiene FB-031 del dueño B.
    const ds004 = 'e-ds004'
    s.instances[ds004] = { cardInstanceId: ds004, cardId: DS004, owner: 'A' }
    const fb031B = 'fb031-mano-B'
    s.instances[fb031B] = { cardInstanceId: fb031B, cardId: FB031, owner: 'B' }
    s.players.B.mano = [fb031B]

    const disparos: Array<{ jugador: string; inst: string }> = []
    registrarEfecto('al-ser-enviado-al-cementerio', FB031, (_st, _ctx, inst, payload) => {
      disparos.push({ jugador: payload.jugador, inst: inst.cardInstanceId })
    })

    const ctx = crearCtx() // ctx.next() = 0 → descarta el índice 0 de la mano de B
    dispararTrigger(s, ctx, 'al-pagar-eter', 'A', [ds004])
    expect(disparos).toEqual([{ jugador: 'B', inst: fb031B }])
    expect(s.players.B.cementerio).toContain(fb031B)
    expect(ctx.events).toContainEqual({ type: 'carta_descartada', jugador: 'B', cardInstanceIds: [fb031B] })
  })
})

describe('soporte C5 (dependencia mazo 45): mecánica TUTOR (D1 interactivo)', () => {
  it('FB-031 al morir arma el pendiente con SOLO Campeones de coste ≤ 2 del propio mazo', () => {
    let s = estadoMinimo()
    const { s: s1, id: fb031 } = conCampeon(s, FB031, 0, 'A')
    s = s1
    s = conCartaEnMazo(s, 'm-fb031', FB031, 'A') // Campeón cost 2 ✓
    s = conCartaEnMazo(s, 'm-ds031', DS031, 'A') // Campeón cost 2 ✓
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // Campeón cost 4 ✗
    s = conCartaEnMazo(s, 'm-fb032', FB032, 'A') // Mística cost 2 ✗ (no es Campeón)

    const ctx = crearCtx()
    destruirCarta(s, ctx, fb031, 'efecto')
    expect(s.objetivosPendientes).toEqual([
      { jugador: 'A', instId: fb031, trigger: 'al-ser-enviado-al-cementerio', opciones: ['m-fb031', 'm-ds031'] },
    ])
  })

  it('FB-031 sin cartas que cumplan en el mazo → NO arma pendiente', () => {
    let s = estadoMinimo()
    const { s: s1, id: fb031 } = conCampeon(s, FB031, 0, 'A')
    s = s1
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // Campeón cost 4 → no cumple

    const ctx = crearCtx()
    destruirCarta(s, ctx, fb031, 'efecto')
    expect(s.objetivosPendientes).toBeUndefined()
  })

  it('elegir_objetivo resuelve: mazo → mano + evento carta_robada (sin eventos nuevos)', () => {
    let s = estadoMinimo()
    const { s: s1, id: fb031 } = conCampeon(s, FB031, 0, 'A')
    s = s1
    s = conCartaEnMazo(s, 'm-ds031', DS031, 'A')

    const ctx = crearCtx()
    destruirCarta(s, ctx, fb031, 'efecto')
    expect(s.objetivosPendientes![0].opciones).toEqual(['m-ds031'])

    const r = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'm-ds031' }, ctx)
    expect(r.players.A.mazo).toEqual([])
    expect(r.players.A.mano).toEqual(['m-ds031'])
    expect(ctx.events).toContainEqual({ type: 'carta_robada', jugador: 'A', cardInstanceId: 'm-ds031' })
    expect(r.objetivosPendientes).toHaveLength(0)
  })

  it('DS-031: mismo filtro (Campeón ≤ 2) con su propio registro', () => {
    let s = estadoMinimo()
    const { s: s1, id: ds031 } = conCampeon(s, DS031, 0, 'A')
    s = s1
    s = conCartaEnMazo(s, 'm-fb031', FB031, 'A')
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // ✗

    const ctx = crearCtx()
    destruirCarta(s, ctx, ds031, 'efecto')
    expect(s.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: ds031,
      trigger: 'al-ser-enviado-al-cementerio',
      opciones: ['m-fb031'],
    })
  })

  it('FB-032 (Mística) al jugarse arma el pendiente con CUALQUIER carta de coste ≤ 2 y resuelve', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const mistica = 'mistica-mano'
    s.instances[mistica] = { cardInstanceId: mistica, cardId: FB032, owner: 'A' }
    s.players.A.mano = [mistica]
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 2) // FB-032 cuesta 2
    s = s2
    s = conCartaEnMazo(s, 'm-fb031', FB031, 'A') // Campeón cost 2 ✓
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // cost 4 ✗
    s = conCartaEnMazo(s, 'm-fb032', FB032, 'A') // Mística cost 2 ✓
    s = conCartaEnMazo(s, 'm-ds032', DS032, 'A') // Arcana cost 3 ✗

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'jugar_mistica', cardInstanceId: mistica, slot: 0, eterIds: ids }, ctx)
    expect(r.objetivosPendientes).toEqual([
      { jugador: 'A', instId: mistica, trigger: 'al-jugar-mistica', opciones: ['m-fb031', 'm-fb032'] },
    ])

    const r2 = aplicar(r, { type: 'elegir_objetivo', objetivoId: 'm-fb032' }, ctx)
    expect(r2.players.A.mazo).toEqual(['m-fb031', 'm-aurora', 'm-ds032']) // m-fb031 no fue elegido → permanece
    expect(r2.players.A.mano).toEqual(['m-fb032'])
    expect(ctx.events).toContainEqual({ type: 'carta_robada', jugador: 'A', cardInstanceId: 'm-fb032' })
  })

  it('DS-033 (Mística) al jugarse arma el pendiente con Campeones SIN límite de coste', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const mistica = 'ds033-mano'
    s.instances[mistica] = { cardInstanceId: mistica, cardId: DS033, owner: 'A' }
    s.players.A.mano = [mistica]
    const { s: s2, ids } = conEteres(s, ETER_CAOS, 3) // DS-033 cuesta 3
    s = s2
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // Campeón cost 4 ✓ (sin límite)
    s = conCartaEnMazo(s, 'm-fb032', FB032, 'A') // Mística ✗

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'jugar_mistica', cardInstanceId: mistica, slot: 0, eterIds: ids }, ctx)
    expect(r.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: mistica,
      trigger: 'al-jugar-mistica',
      opciones: ['m-aurora'],
    })
  })

  it('DS-032 (Arcana): al-inicio-choque NO arma sin la condición (2+ Campeones con Éter bloqueado)', () => {
    let s = estadoMinimo()
    const { s: s1, id: arcana } = conArcana(s, DS032, 0, 'A')
    s = s1
    const { s: s2, id: champ1 } = conCampeon(s, VAELA, 0, 'A')
    s = { ...s2, instances: { ...s2.instances, [champ1]: { ...s2.instances[champ1], eterBloqueado: ['eb1'] } } }
    s = conCartaEnMazo(s, 'm-fb031', FB031, 'A')
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A')

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-inicio-choque', 'A', [arcana])
    expect(s.objetivosPendientes).toBeUndefined()
  })

  it('DS-032 (Arcana): al-inicio-choque CON la condición arma con cartas de coste ≤ 3', () => {
    let s = estadoMinimo()
    const { s: s1, id: arcana } = conArcana(s, DS032, 0, 'A')
    s = s1
    const { s: s2, id: champ1 } = conCampeon(s, VAELA, 0, 'A')
    s = { ...s2, instances: { ...s2.instances, [champ1]: { ...s2.instances[champ1], eterBloqueado: ['eb1'] } } }
    const { s: s3, id: champ2 } = conCampeon(s, KAEL, 1, 'A')
    s = { ...s3, instances: { ...s3.instances, [champ2]: { ...s3.instances[champ2], eterBloqueado: ['eb2'] } } }
    s = conCartaEnMazo(s, 'm-fb031', FB031, 'A') // cost 2 ✓
    s = conCartaEnMazo(s, 'm-fb032', FB032, 'A') // cost 2 ✓
    s = conCartaEnMazo(s, 'm-aurora', AURORA, 'A') // cost 4 ✗

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-inicio-choque', 'A', [arcana])
    expect(s.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: arcana,
      trigger: 'al-inicio-choque',
      opciones: ['m-fb031', 'm-fb032'],
    })

    const r = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'm-fb032' }, ctx)
    expect(r.players.A.mazo).toEqual(['m-fb031', 'm-aurora']) // m-fb031 no fue elegido → permanece
    expect(r.players.A.mano).toEqual(['m-fb032'])
  })
})

describe('soporte C5: dispatch al-jugar-mistica', () => {
  it('applyAction(jugar_mistica) dispara el handler registrado con la instancia jugada', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const mistica = 'mistica-1'
    s.instances[mistica] = { cardInstanceId: mistica, cardId: FB032, owner: 'A' }
    s.players.A.mano = [mistica]
    const { s: s2, ids } = conEteres(s, ETER_ORDEN, 2)
    s = s2

    const llamadas: string[] = []
    registrarEfecto('al-jugar-mistica', FB032, (_st, _ctx, inst) => llamadas.push(inst.cardInstanceId))

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'jugar_mistica', cardInstanceId: mistica, slot: 0, eterIds: ids }, ctx)
    expect(llamadas).toEqual([mistica])
    expect(r.players.A.campo.misticasTacticas[0]).toBe(mistica)
    expect(ctx.events).toContainEqual({ type: 'carta_invocada', cardInstanceId: mistica, tipo: 'Mística', slot: 0 })
  })
})

describe('soporte C5: dispatch al-inicio-choque con Arcanas propias', () => {
  it('pasar_turno (forja→choque) dispara con Éteres Y Arcanas propias en campo', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: arcana } = conArcana(s, DS032, 0, 'A')
    s = s1
    const { s: s2, id: fb002 } = conEterReserva(s, FB002, 'A')
    s = s2

    const arcanas: string[] = []
    const eteres: string[] = []
    registrarEfecto('al-inicio-choque', DS032, (_st, _ctx, inst) => arcanas.push(inst.cardInstanceId))
    registrarEfecto('al-inicio-choque', FB002, (_st, _ctx, inst) => eteres.push(inst.cardInstanceId))

    const ctx = crearCtx()
    const r = aplicar(s, { type: 'pasar_turno' }, ctx)
    expect(arcanas).toEqual([arcana])
    expect(eteres).toEqual([fb002])
    expect(r.fase).toBe('choque')
  })
})
