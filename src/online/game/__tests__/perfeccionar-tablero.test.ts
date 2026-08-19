// @vitest-environment node
/**
 * Tests del motor para perfeccionamiento-tablero:
 * - FB-024 handler + requisito de resolución
 * - statsComparativos + focosState
 * - validarRequisito integration
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { applyAction } from '../actions'
import { getValidActions } from '../validActions'
import { statsComparativos, focosState } from '../stats'
import { validarRequisito, registrarRequisito } from '../effects-guards'
import { limpiarRegistroEfectos, statsDe } from '../efectos'
import { registrarEfectos } from '../index'
import type { GameState, PlayerId } from '../types'

const COMBATE_FB024 = 'FB-024'
const AURORA = 'FB-010'
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
    campo: { campeones: [null, null, null, null, null] as (string | null)[], misticasTacticas: [null, null, null] as (string | null)[], arcanasCombate: [null, null, null] as (string | null)[] },
    vinculos: [null, null, null, null, null, null] as (string | null)[],
    mulliganUsado: true,
  })
  return {
    version: 1, seed: 7, fase: 'forja', turno: 'A', primerJugador: 'A', primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') }, instances: {},
  }
}

function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}-${owner}`
  return {
    s: { ...s, instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: { ...s.players, [owner]: { ...s.players[owner], campo: { ...s.players[owner].campo,
        campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)) } } } },
    id,
  }
}

function conEterReserva(s: GameState, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `e-${cardId}-${owner}`
  return {
    s: { ...s, instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: { ...s.players, [owner]: { ...s.players[owner], eterReserva: [...s.players[owner].eterReserva, id] } } },
    id,
  }
}

function conMano(s: GameState, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `m-${cardId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    s: { ...s, instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: { ...s.players, [owner]: { ...s.players[owner], mano: [...s.players[owner].mano, id] } } },
    id,
  }
}

beforeEach(() => {
  limpiarRegistroEfectos()
  registrarEfectos()
})

// TODO: Phase 3 eliminará colocar_combate del motor
// describe('FB-024 handler', () => {
//   it('no ofrece colocar_combate FB-024 si no hay Campeón propio', () => { ... })
//   it('ofrece colocar_combate FB-024 si hay Campeón propio', () => { ... })
//   it('FB-024 aplica +2 ATQ al campeón elegido', () => { ... })
// })

describe('validarRequisito', () => {
  it('devuelve null si no hay requisito registrado', () => {
    const s = estadoMinimo()
    expect(validarRequisito(s, 'A', 'FB-099')).toBeNull()
  })

  it('devuelve error si el requisito no se cumple', () => {
    registrarRequisito('TEST-CARD', () => 'no se puede')
    const s = estadoMinimo()
    expect(validarRequisito(s, 'A', 'TEST-CARD')).toBe('no se puede')
  })

  it('devuelve null si el requisito se cumple', () => {
    registrarRequisito('TEST-CARD', () => null)
    const s = estadoMinimo()
    expect(validarRequisito(s, 'A', 'TEST-CARD')).toBeNull()
  })
})

describe('statsComparativos', () => {
  it('devuelve null si no es un Campeón', () => {
    let s = estadoMinimo()
    const r = conEterReserva(s, ETER_ORDEN); s = r.s
    expect(statsComparativos(s, r.id)).toBeNull()
  })

  it('muestra amarillo cuando stats = base', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    const result = statsComparativos(s, c.id)
    expect(result).not.toBeNull()
    expect(result!.atq.color).toBe('amarillo')
    expect(result!.res.color).toBe('amarillo')
  })

  it('muestra verde cuando ATQ > base', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    s.instances[c.id].modificadores = [{ stat: 'poder', valor: 1, expira: 'ocaso' }]
    const result = statsComparativos(s, c.id)
    expect(result!.atq.actual).toBe(10) // Aurora base 9 + 1
    expect(result!.atq.color).toBe('verde')
  })

  it('muestra rojo cuando RES < base', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    s.instances[c.id].modificadores = [{ stat: 'resistencia', valor: -1, expira: 'ocaso' }]
    const result = statsComparativos(s, c.id)
    expect(result!.res.actual).toBe(8) // Aurora base 9 - 1
    expect(result!.res.color).toBe('rojo')
  })
})

describe('focosState', () => {
  it('gris-gris cuando no hay efectos', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    const result = focosState(s, c.id)
    expect(result).not.toBeNull()
    expect(result!.continuo).toBe('gris')
    expect(result!.temporal).toBe('gris')
  })

  it('temporal verde cuando hay mod temporal', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    s.instances[c.id].modificadores = [{ stat: 'poder', valor: 1, expira: 'ocaso' }]
    const result = focosState(s, c.id)
    expect(result!.temporal).toBe('verde')
  })

  it('temporal verde cuando hay keywordsTemporales', () => {
    let s = estadoMinimo()
    const c = conCampeon(s, AURORA, 0); s = c.s
    s.instances[c.id].keywordsTemporales = ['Vigor']
    const result = focosState(s, c.id)
    expect(result!.temporal).toBe('verde')
  })

  it('devuelve null si no es Campeón', () => {
    let s = estadoMinimo()
    const r = conEterReserva(s, ETER_ORDEN); s = r.s
    expect(focosState(s, r.id)).toBeNull()
  })
})
