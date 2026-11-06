// @vitest-environment node
/**
 * Los Éteres «Cuando pagues esta carta» deben dispararse en TODOS los caminos que pagan Éter, no solo al jugar una carta.
 * Bug: pagar con ellos el coste de la HABILIDAD de un Campeón (`activar_habilidad`, Disparo con coste `eter:2`) movía el Éter a la
 * zona de pago pero NO disparaba su gatillo (`habilidadPago.ts` no llamaba a `dispararAlPagarEter`). FB-003 «Éter de la Sangre
 * Eterna» (roba 1 carta) no robaba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import type { GameState } from '../types'
import { AURORA_CLASICA, registrarAuroraClasica } from './helpers/auroraClasica'
import { PR, aplicar, cargarCartasPrueba, conCampeon, conEteres, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
  registrarAuroraClasica()
})

/** A controla a Aurora (Disparo que cuesta 2 Éter) y tiene en su Reserva `gatillo` (el Éter «al pagar») + un Éter común. */
function escena(gatillo: string): { s: GameState; ids: [string, string] } {
  const s = escenaVacia('forja')
  conMazo(s, 'A', 4)
  conMazo(s, 'B', 4)
  conCampeon(s, 'A', 'aurora-1', AURORA_CLASICA, 0)
  conCampeon(s, 'B', 'rival-1', 'FB-011', 0)
  const [g] = conEteres(s, 'A', 1, gatillo)
  const [otro] = conEteres(s, 'A', 1, PR.ETER)
  return { s, ids: [g, otro] }
}

const activar = (ids: [string, string]): Action => ({ type: 'activar_habilidad', cardInstanceId: 'aurora-1', eterIds: ids })

describe('Éter «al pagar» pagado como parte del coste de una habilidad', () => {
  it('FB-003 (Sangre Eterna): al activar la habilidad de un Campeón roba 1 carta', () => {
    const { s, ids } = escena('FB-003')
    const r = applyAction(s, activar(ids), crearCtx())
    if (!r.ok) throw new Error(`activar_habilidad falló: ${r.error}`)
    expect(r.state.players.A.eterPagado).toEqual(expect.arrayContaining(ids)) // el Éter se pagó…
    expect(r.state.players.A.mano).toHaveLength(1) // …y su gatillo robó 1
    expect(r.state.players.A.mazo).toHaveLength(3)
  })

  it('el gatillo se dispara una sola vez por Éter (no se duplica con el coste)', () => {
    const { s, ids } = escena('FB-003')
    const ctx = crearCtx()
    const r = applyAction(s, activar(ids), ctx)
    if (!r.ok) throw new Error(r.error)
    expect(ctx.events.filter((e) => e.type === 'eter_pagado')).toHaveLength(1)
    expect(r.state.players.A.mano).toHaveLength(1)
  })

  it('FB-006 (scry con elección): abre su elección al pagar la habilidad, se resuelve y la partida sigue', () => {
    const { s, ids } = escena('FB-006')
    const ctx = crearCtx()
    const s1 = aplicar(s, activar(ids), ctx)
    const tope = s1.players.A.mazo[0]
    expect(s1.scryPendientes?.[0]).toMatchObject({ jugador: 'A', mazoDe: 'A', cartas: [tope] })
    // Mientras la elección está abierta solo A puede actuar, y la jugada que ofrece el motor es ordenar el mazo
    expect(getValidActions(s1, 'A').some((a) => a.type === 'ordenar_mazo')).toBe(true)
    expect(getValidActions(s1, 'B').some((a) => a.type === 'ordenar_mazo')).toBe(false)
    const s2 = aplicar(s1, { type: 'ordenar_mazo', arriba: [], fondo: [tope] }, ctx)
    expect(s2.players.A.mazo.at(-1)).toBe(tope)
    expect(s2.scryPendientes).toBeUndefined()
    expect(s2.fase).toBe('forja')
    expect(s2.players.A.eterPagado).toEqual(expect.arrayContaining(ids)) // el coste de la habilidad se mantuvo
    expect(s2.instances['aurora-1'].agotado).toBe(true) // Paga y Agota (§5.2, §8.3a)
  })

  it('PR-009 (elegir un Éter pagado): el objetivo se elige entre los pagados y devuelve el Éter a la Reserva', () => {
    const { s, ids } = escena(PR.ETER_RETORNO)
    const ctx = crearCtx()
    const s1 = aplicar(s, activar(ids), ctx)
    const opciones = s1.objetivosPendientes?.[0].opciones ?? []
    expect(opciones.length).toBeGreaterThan(0)
    const elegido = ids[1] // devuelve el Éter común recién pagado
    expect(opciones).toContain(elegido)
    const s2 = aplicar(s1, { type: 'elegir_objetivo', objetivoId: elegido }, ctx)
    expect(s2.players.A.eterReserva).toContain(elegido)
    expect(s2.players.A.eterPagado).not.toContain(elegido)
  })

  it('un Éter SIN gatillo no cambia nada: activar la habilidad sigue siendo solo el pago', () => {
    const { s, ids } = escena(PR.ETER)
    const ctx = crearCtx()
    const s1 = aplicar(s, activar(ids), ctx)
    expect(s1.players.A.mano).toHaveLength(0)
    expect(s1.players.A.eterPagado).toHaveLength(2)
    expect(s1.objetivosPendientes).toBeUndefined()
    expect(s1.scryPendientes).toBeUndefined()
  })

  it('BLOQUEAR Éter no es pagarlo: el gatillo «Cuando pagues» no se dispara al bloquear (comportamiento intencional)', () => {
    const s = escenaVacia('forja')
    conMazo(s, 'A', 4)
    conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'aurora-1', AURORA_CLASICA, 0)
    conCampeon(s, 'B', 'rival-1', 'FB-011', 0)
    const [sangre] = conEteres(s, 'A', 1, 'FB-003')
    conEteres(s, 'A', 3, PR.ETER)
    const bloquear = getValidActions(s, 'A').find((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'aurora-1')
    if (!bloquear || bloquear.type !== 'bloquear_eter') throw new Error('Aurora no ofrece bloquear_eter')
    const s1 = aplicar(s, { ...bloquear, eterIds: [sangre, ...bloquear.eterIds.filter((x) => x !== sangre).slice(0, 3)] }, crearCtx())
    expect(s1.instances['aurora-1'].eterBloqueado).toContain(sangre)
    expect(s1.players.A.mano).toHaveLength(0)
  })
})
