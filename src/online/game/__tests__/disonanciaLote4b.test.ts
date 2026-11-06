// @vitest-environment node
/**
 * Lote 4B del motor de Disonancia — cartas REALES del seed:
 *  - N2 · Peaje (Comandante de Ragnar DS-010, regla `costeBloqueo`): para bloquear a los Campeones de su controlador, el rival paga
 *    N Éter por cada bloqueador (pago normal a la zona de pago); sin Éter propio el Campeón no cuenta para el bloqueo forzoso.
 *  - R2 · «Al inicio del Choque del rival» en un Campeón (Vorlag DS-017).
 *  - R3 · Reglas que da el efecto de bloqueo de un Éter a su anfitrión (DS-008 imbloqueable, DS-009 Tirador).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { bloqueosMaximos, costePeajeBloqueo } from '../combat'
import { keywordsDe } from '../efectos'
import { reglaBool, reglaNumero } from '../reglas'
import { getValidActions } from '../validActions'
import { enviarAlCementerio, zonaDeCementerio } from '../replacements'
import type { Ctx, GameState } from '../types'
import { PR, aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia, inst } from './helpers/cartasPrueba'

beforeAll(() => { cargarCartasPrueba() })

/* ═══════════════════════════ N2 · Peaje de Ragnar ═══════════════════════════ */

/**
 * A (controla a Ragnar y, opcionalmente, a más atacantes) ataca a B en el Choque. B tiene `bloqueadores` Peones enderezados y
 * `eteres` Éteres propios en la Reserva. Devuelve el estado YA con el ataque declarado.
 */
function ataqueConPeaje(opts: { atacantes?: number; bloqueadores?: number; eteres?: number; ragnar?: boolean; ctx?: Ctx }): { s: GameState; ctx: Ctx } {
  const { atacantes = 1, bloqueadores = 1, eteres = 2, ragnar = true } = opts
  const ctx = opts.ctx ?? crearCtx()
  const s = escenaVacia('choque'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
  if (ragnar) conCampeon(s, 'A', 'ragnar', 'DS-010', 4)
  for (let i = 0; i < atacantes; i++) conCampeon(s, 'A', `a${i}`, PR.PEON, i)
  for (let i = 0; i < bloqueadores; i++) conCampeon(s, 'B', `b${i}`, PR.PEON, i)
  if (eteres > 0) conEteres(s, 'B', eteres)
  const ids = Array.from({ length: atacantes }, (_, i) => `a${i}`)
  return { s: aplicar(s, { type: 'declarar_ataque', atacanteIds: ids }, ctx), ctx }
}
const bloqueos = (s: GameState) => getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')

describe('N2 · Peaje (Ragnar DS-010): bloquear cuesta 1 Éter por Campeón', () => {
  it('la regla de Ragnar es costeBloqueo = 1 para el RIVAL de su controlador y 0 para el propio', () => {
    const s = escenaVacia('choque'); conCampeon(s, 'A', 'ragnar', 'DS-010', 0)
    expect(reglaNumero(s, 'costeBloqueo', { jugador: 'B' })).toBe(1)
    expect(reglaNumero(s, 'costeBloqueo', { jugador: 'A' })).toBe(0)
  })

  it('con Éter suficiente paga 1 Éter (Reserva → zona de pago) y bloquea', () => {
    const { s: s0, ctx } = ataqueConPeaje({ eteres: 2 })
    expect(s0.combate?.paso).toBe('bloqueo')
    expect(costePeajeBloqueo(s0)).toBe(1)
    const opciones = bloqueos(s0)
    expect(opciones[0]).toEqual({ type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } })
    const ctx2 = crearCtx()
    const s = aplicar(s0, opciones[0], ctx2)
    expect(s.combate?.bloqueos ?? {}).toEqual({ a0: 'b0' })
    expect(s.players.B.eterReserva).toEqual(['eter-B-1'])
    expect(s.players.B.eterPagado).toEqual(['eter-B-0'])
    expect(ctx2.events.map((e) => e.type)).toContain('eter_pagado')
    void ctx
  })

  it('sin Éter no puede pagar: el Campeón no cuenta para el bloqueo forzoso y el ataque queda sin bloquear (Ruptura)', () => {
    const { s } = ataqueConPeaje({ eteres: 0 })
    expect(bloqueosMaximos(s)).toBe(0)
    expect(s.combate?.paso).toBe('resolucion') // se auto-avanzó, no se pide bloqueo
    expect(s.combate?.bloqueos).toEqual({})
    expect(s.combate?.rupturaDisponible).toBe(true)
    expect(bloqueos(s)).toEqual([])
  })

  it('sin la regla (Ragnar fuera del campo) el bloqueo vuelve a ser forzoso y gratis aunque no haya Éter', () => {
    const { s } = ataqueConPeaje({ eteres: 0, ragnar: false })
    expect(costePeajeBloqueo(s)).toBe(0)
    expect(s.combate?.paso).toBe('bloqueo')
    const [forzosa, ...otras] = bloqueos(s)
    expect(forzosa).toEqual({ type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } })
    expect(otras).toEqual([]) // sin Peaje no hay opción de no bloquear
    const s2 = aplicar(s, forzosa, crearCtx())
    expect(s2.combate?.bloqueos).toEqual({ a0: 'b0' })
    expect(s2.players.B.eterPagado).toEqual([])
  })

  it('se apaga si Ragnar sale del campo a mitad del turno', () => {
    const { s } = ataqueConPeaje({ eteres: 2 })
    s.players.A.campo.campeones[4] = null
    expect(costePeajeBloqueo(s)).toBe(0)
  })

  it('con 2 bloqueadores paga 2 Éter (1 por cada uno)', () => {
    const { s: s0 } = ataqueConPeaje({ atacantes: 2, bloqueadores: 2, eteres: 3 })
    expect(bloqueosMaximos(s0)).toBe(2)
    const s = aplicar(s0, bloqueos(s0)[0], crearCtx())
    expect(Object.keys(s.combate?.bloqueos ?? {})).toHaveLength(2)
    expect(s.players.B.eterReserva).toHaveLength(1)
    expect(s.players.B.eterPagado).toHaveLength(2)
  })

  it('con Éter solo para 1 de 2 bloqueos, el bloqueo máximo baja a 1 y el otro ataque queda sin bloquear', () => {
    const { s: s0 } = ataqueConPeaje({ atacantes: 2, bloqueadores: 2, eteres: 1 })
    expect(bloqueosMaximos(s0)).toBe(1)
    const maximales = bloqueos(s0).filter((a) => a.type === 'declarar_bloqueo' && Object.keys(a.asignaciones).length > 0)
    expect(maximales.length).toBeGreaterThan(0)
    for (const a of maximales) if (a.type === 'declarar_bloqueo') expect(Object.keys(a.asignaciones)).toHaveLength(1)
    const s = aplicar(s0, maximales[0], crearCtx())
    expect(Object.keys(s.combate?.bloqueos ?? {})).toHaveLength(1)
    expect(s.combate?.rupturaDisponible).toBe(true)
    expect(s.players.B.eterReserva).toHaveLength(0)
  })

  it('el defensor también puede NO pagar: declarar_bloqueo vacío no cobra nada y deja el ataque sin bloquear', () => {
    const { s: s0 } = ataqueConPeaje({ eteres: 2 })
    const vacia = bloqueos(s0).find((a) => a.type === 'declarar_bloqueo' && Object.keys(a.asignaciones).length === 0)
    expect(vacia).toBeDefined()
    const s = aplicar(s0, vacia!, crearCtx())
    expect(s.combate?.bloqueos).toEqual({})
    expect(s.combate?.rupturaDisponible).toBe(true)
    expect(s.players.B.eterReserva).toHaveLength(2)
    expect(s.players.B.eterPagado).toHaveLength(0)
  })

  it('el motor rechaza un bloqueo que el defensor no alcanza a pagar', () => {
    const { s } = ataqueConPeaje({ atacantes: 2, bloqueadores: 2, eteres: 1 })
    const r = applyAction(s, { type: 'declarar_bloqueo', asignaciones: { a0: 'b0', a1: 'b1' } }, crearCtx())
    expect(r.ok).toBe(false)
  })

  it('el Éter ARREBATADO (de otro dueño) no sirve para pagar el Peaje', () => {
    const ctx = crearCtx()
    const s = escenaVacia('choque'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 4); conCampeon(s, 'A', 'a0', PR.PEON, 0); conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conEteres(s, 'A', 2)
    s.players.B.eterReserva.push(...s.players.A.eterReserva.splice(0)) // A es el dueño; B los tiene arrebatados
    const e = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(e.players.B.eterReserva).toHaveLength(2)
    expect(bloqueosMaximos(e)).toBe(0)
    expect(e.combate?.paso).toBe('resolucion')
  })

  it('no afecta al propio controlador: si defiende el que controla a Ragnar, bloquea gratis y forzoso', () => {
    const ctx = crearCtx()
    const s = escenaVacia('choque'); s.turno = 'B'; conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 4); conCampeon(s, 'B', 'b0', PR.PEON, 0)
    const e = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['b0'] }, ctx)
    expect(costePeajeBloqueo(e)).toBe(0)
    expect(e.combate?.paso).toBe('bloqueo')
    const acciones = getValidActions(e, 'A').filter((a) => a.type === 'declarar_bloqueo')
    expect(acciones).toEqual([{ type: 'declarar_bloqueo', asignaciones: { b0: 'ragnar' } }])
  })

  it('el pago del Peaje dispara los «al pagar» del Éter que se gasta (pago normal)', () => {
    const ctx = crearCtx()
    const s = escenaVacia('choque'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'ragnar', 'DS-010', 4); conCampeon(s, 'A', 'a0', PR.PEON, 0); conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conEteres(s, 'B', 1, PR.ETER_ROBA) // «al pagarlo, roba 1»
    const manoAntes = s.players.B.mano.length
    const e = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    const f = aplicar(e, bloqueos(e)[0], crearCtx())
    expect(f.players.B.eterPagado).toEqual(['eter-B-0'])
    expect(f.players.B.mano.length).toBe(manoAntes + 1)
  })
})

/* ═══════════════════════════ R2 · Choque del rival en Campeones ═══════════════════════════ */

describe('R2 · Vorlag (DS-017): al inicio del Choque del RIVAL mueve hasta 2 Éter de su Reserva a su zona de pago', () => {
  const escena = (vorlagDe: 'A' | 'B' | null, eteresRival: number): GameState => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    if (vorlagDe) conCampeon(s, vorlagDe, 'vorlag', 'DS-017', 0)
    conEteres(s, 'A', eteresRival)
    return s
  }
  it('si Vorlag es de B, en el Choque de A mueve 2 de los Éter de A a la zona de pago de A', () => {
    const s = aplicar(escena('B', 4), { type: 'pasar_turno' }, crearCtx())
    expect(s.fase).toBe('choque')
    expect(s.players.A.eterReserva).toHaveLength(2)
    expect(s.players.A.eterPagado).toHaveLength(2)
  })
  it('mueve «hasta» 2: con 1 solo Éter mueve 1', () => {
    const s = aplicar(escena('B', 1), { type: 'pasar_turno' }, crearCtx())
    expect(s.players.A.eterReserva).toHaveLength(0)
    expect(s.players.A.eterPagado).toHaveLength(1)
  })
  it('NO dispara en el Choque propio: si Vorlag es de A, los Éter de A quedan donde están', () => {
    const s = aplicar(escena('A', 4), { type: 'pasar_turno' }, crearCtx())
    expect(s.players.A.eterReserva).toHaveLength(4)
    expect(s.players.A.eterPagado).toHaveLength(0)
  })
  it('NO dispara si Vorlag no está en el campo', () => {
    const s = aplicar(escena(null, 4), { type: 'pasar_turno' }, crearCtx())
    expect(s.players.A.eterReserva).toHaveLength(4)
    expect(s.players.A.eterPagado).toHaveLength(0)
  })
  it('en el Choque de B (su propio turno) tampoco: dispara solo en el turno del rival de su controlador', () => {
    let s = escena('B', 4)
    s.turno = 'B'
    conEteres(s, 'B', 3)
    s = aplicar(s, { type: 'pasar_turno' }, crearCtx())
    expect(s.players.A.eterReserva).toHaveLength(4)
    expect(s.players.B.eterReserva).toHaveLength(3)
  })
})

/* ═══════════════════════════ R3 · Reglas desde el efecto de bloqueo de un Éter ═══════════════════════════ */

/** Bloquea `eterCardId` (de `dueno`) sobre el Campeón `anfitrion` de A, sin pasar por el coste (estado ya resultante). */
function conEterBloqueado(s: GameState, anfitrion: string, id: string, eterCardId: string, dueno: 'A' | 'B' = 'A'): void {
  inst(s, id, eterCardId, dueno)
  s.instances[anfitrion].eterBloqueado = [...(s.instances[anfitrion].eterBloqueado ?? []), id]
}

describe('R3 · DS-008 «Éter del Primogénito»: el Campeón que lo tiene bloqueado no puede ser bloqueado', () => {
  it('sin el Éter, el Campeón puede ser bloqueado; con él bloqueado, no', () => {
    const s = escenaVacia('choque'); conCampeon(s, 'A', 'host', PR.PEON, 0); conCampeon(s, 'A', 'otro', PR.PEON, 1)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'host' })).toBe(true)
    conEterBloqueado(s, 'host', 'p1', 'DS-008')
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'host' })).toBe(false)
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'otro' })).toBe(true) // solo el anfitrión
  })
  it('si el Éter deja de estar bloqueado, el Campeón vuelve a poder ser bloqueado', () => {
    const s = escenaVacia('choque'); conCampeon(s, 'A', 'host', PR.PEON, 0)
    conEterBloqueado(s, 'host', 'p1', 'DS-008')
    s.instances.host.eterBloqueado = []
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'host' })).toBe(true)
  })
  it('un Éter ajeno (arrebatado) no cuenta aunque figure bloqueado', () => {
    const s = escenaVacia('choque'); conCampeon(s, 'A', 'host', PR.PEON, 0)
    conEterBloqueado(s, 'host', 'p1', 'DS-008', 'B')
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'host' })).toBe(true)
  })
  it('en combate: el atacante con DS-008 bloqueado no se asigna al bloqueo y queda sin bloquear (Ruptura)', () => {
    const ctx = crearCtx()
    const s = escenaVacia('choque'); conMazo(s, 'A', 3); conMazo(s, 'B', 3)
    conCampeon(s, 'A', 'host', PR.PEON, 0); conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conEterBloqueado(s, 'host', 'p1', 'DS-008')
    const e = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['host'] }, ctx)
    expect(e.combate?.paso).toBe('resolucion')
    expect(e.combate?.bloqueos).toEqual({})
    expect(e.combate?.rupturaDisponible).toBe(true)
  })
})

describe('R3 · DS-009 «Éter de la Ruptura»: el Campeón que lo tiene bloqueado gana Tirador', () => {
  it('gana la keyword Tirador solo mientras está bloqueado y solo el anfitrión', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'host', PR.PEON, 0); conCampeon(s, 'A', 'otro', PR.PEON, 1)
    expect(keywordsDe(s, 'host')).not.toContain('Tirador')
    conEterBloqueado(s, 'host', 'p1', 'DS-009')
    expect(keywordsDe(s, 'host')).toContain('Tirador')
    expect(keywordsDe(s, 'otro')).not.toContain('Tirador')
    s.instances.host.eterBloqueado = []
    expect(keywordsDe(s, 'host')).not.toContain('Tirador')
  })
  it('con Tirador el Disparo no agota (disparoAgota prohibida)', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'host', PR.PEON, 0)
    expect(reglaBool(s, 'disparoAgota', { instId: 'host' })).toBe(true)
    conEterBloqueado(s, 'host', 'p1', 'DS-009')
    expect(reglaBool(s, 'disparoAgota', { instId: 'host' })).toBe(false)
  })
  it('un Campeón con 2 Éteres bloqueados (DS-008 y DS-009) tiene ambos efectos', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'host', PR.PEON, 0)
    conEterBloqueado(s, 'host', 'p1', 'DS-008'); conEterBloqueado(s, 'host', 'p2', 'DS-009')
    expect(reglaBool(s, 'puedeSerBloqueado', { instId: 'host' })).toBe(false)
    expect(keywordsDe(s, 'host')).toContain('Tirador')
  })
  it('un Éter ajeno bloqueado no da Tirador', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'host', PR.PEON, 0)
    conEterBloqueado(s, 'host', 'p1', 'DS-009', 'B')
    expect(keywordsDe(s, 'host')).not.toContain('Tirador')
  })
})

/* ═══════════════════════════ Eventos de UI tras el Olvido ═══════════════════════════ */

describe('Olvido · la zona real de una carta enviada al Cementerio', () => {
  it('zonaDeCementerio es 2G normalmente y 1G cuando el Olvido de Ragnar la exilia', () => {
    const s = escenaVacia('forja'); conCampeon(s, 'B', 'b0', PR.PEON, 0); conCampeon(s, 'B', 'b1', PR.PEON, 1)
    enviarAlCementerio(s, crearCtx(), 'b0', 'campo')
    expect(zonaDeCementerio(s, 'b0')).toBe('2G')
    // Ragnar con 3 Éter bloqueados: las cartas de B que irían al Cementerio se exilian
    conCampeon(s, 'A', 'ragnar', 'DS-010', 0)
    conEteres(s, 'A', 3)
    const r = applyAction(s, { type: 'bloquear_eter', eterIds: ['eter-A-0', 'eter-A-1', 'eter-A-2'], targetInstanceId: 'ragnar', efectoIdx: 1 }, crearCtx())
    if (!r.ok) throw new Error(r.error)
    enviarAlCementerio(r.state, crearCtx(), 'b1', 'campo')
    expect(r.state.players.B.exilio).toContain('b1')
    expect(zonaDeCementerio(r.state, 'b1')).toBe('1G')
  })
})

void conMano
