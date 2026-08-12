// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { visibleState } from '../visibleState'
import type { GameState, PlayerId } from '../types'

const ETER_ORDEN = 'FB-001'
const CAMPEON = 'FB-011'
const MISTICA = 'FB-019'
const ARCANA = 'FB-023'
const VINCULO = 'FB-029'

/** Estado sintético con TODAS las zonas pobladas para A y B (ids únicos por zona). */
function estadoPoblado(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [id + '-d1'],
    cementerio: [id + '-c1'],
    exilio: [id + '-e1'],
    eterReserva: [id + '-er1'],
    eterPagado: [id + '-ep1'],
    campo: {
      campeones: [null, id + '-cam1', null, null, null],
      misticasTacticas: [id + '-mis1', null, null],
      arcanasCombate: [id + '-arc1', null, null],
    },
    vinculos: [id + '-vin1', null, null, null, null, null],
    mulliganUsado: true,
  })
  const s: GameState = {
    version: 1,
    seed: 42,
    fase: 'forja',
    turno: 'A',
    primerJugador: 'A',
    primerTurno: true,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
  for (const p of ['A', 'B'] as PlayerId[]) {
    const ids: Record<string, string> = {
      [`${p}-d1`]: CAMPEON,
      [`${p}-m1`]: CAMPEON,
      [`${p}-m2`]: MISTICA,
      [`${p}-c1`]: CAMPEON,
      [`${p}-e1`]: CAMPEON,
      [`${p}-er1`]: ETER_ORDEN,
      [`${p}-ep1`]: ETER_ORDEN,
      [`${p}-cam1`]: CAMPEON,
      [`${p}-mis1`]: MISTICA,
      [`${p}-arc1`]: ARCANA,
      [`${p}-vin1`]: VINCULO,
    }
    for (const [id, cardId] of Object.entries(ids)) {
      s.instances[id] = { cardInstanceId: id, cardId, owner: p }
    }
    s.players[p].mano = [`${p}-m1`, `${p}-m2`]
  }
  return s
}

describe('visibleState (6.2)', () => {
  it('mano propia y zonas boca arriba visibles; mano rival, mazos, Arcanas y Vínculos rivales opacos', () => {
    const s = estadoPoblado()
    const v = visibleState(s, 'A')

    // Mano propia: visibles
    expect(v.instances['A-m1'].cardId).toBe(CAMPEON)
    expect(v.instances['A-m2'].cardId).toBe(MISTICA)
    // Mano rival: opaca (cardId null, solo conteo)
    expect(v.players.B.mano).toHaveLength(2)
    expect(v.instances['B-m1'].cardId).toBeNull()
    expect(v.instances['B-m2'].cardId).toBeNull()
    // Mazos: opacos para ambos (3G boca abajo)
    expect(v.instances['A-d1'].cardId).toBeNull()
    expect(v.instances['B-d1'].cardId).toBeNull()
    // Arcanas propias visibles; rivales ocultas
    expect(v.instances['A-arc1'].cardId).toBe(ARCANA)
    expect(v.instances['B-arc1'].cardId).toBeNull()
    // Vínculos propios visibles; rivales ocultos
    expect(v.instances['A-vin1'].cardId).toBe(VINCULO)
    expect(v.instances['B-vin1'].cardId).toBeNull()
    // Campeones, Místicas, Éteres, Cementerio y Exilio: visibles ambos
    expect(v.instances['B-cam1'].cardId).toBe(CAMPEON)
    expect(v.instances['B-mis1'].cardId).toBe(MISTICA)
    expect(v.instances['B-er1'].cardId).toBe(ETER_ORDEN)
    expect(v.instances['B-ep1'].cardId).toBe(ETER_ORDEN)
    expect(v.instances['B-c1'].cardId).toBe(CAMPEON)
    expect(v.instances['B-e1'].cardId).toBe(CAMPEON)
  })

  it('es simétrico: desde B, la mano de A queda opaca', () => {
    const v = visibleState(estadoPoblado(), 'B')
    expect(v.instances['A-m1'].cardId).toBeNull()
    expect(v.instances['B-m1'].cardId).toBe(CAMPEON)
    expect(v.instances['A-arc1'].cardId).toBeNull()
    expect(v.instances['B-arc1'].cardId).toBe(ARCANA)
  })

  it('NO muta el estado original', () => {
    const s = estadoPoblado()
    const v = visibleState(s, 'A')
    expect(v).not.toBe(s)
    expect(s.instances['B-m1'].cardId).toBe(CAMPEON) // original intacto
    expect(s.players.B.mano).toHaveLength(2)
    expect(s.instances['B-arc1'].cardId).toBe(ARCANA)
  })

  it('el id del mazo propio se preserva en la zona pero su cardId se oculta (orden del 3G secreto)', () => {
    const v = visibleState(estadoPoblado(), 'A')
    expect(v.players.A.mazo[0]).toBe('A-d1')
    expect(v.instances['A-d1'].cardId).toBeNull() // mazo propio opaco también
  })

  it('Vínculos rivales destruidos por Ruptura (bocaArriba) son visibles (L911)', () => {
    const s = estadoPoblado()
    s.instances['B-vin1'].bocaArriba = true // destruido: permanece en slot pero recordatorio visible
    const v = visibleState(s, 'A')
    expect(v.instances['B-vin1'].cardId).toBe(VINCULO)
  })

  it('las cartas de la pila de la cadena son visibles a ambos (6.2)', () => {
    const s = estadoPoblado()
    s.fase = 'choque'
    s.combate = {
      paso: 'resolucion',
      atacantes: [],
      bloqueos: {},
      rupturaDisponible: false,
      rupturaUsadaEsteTurno: true,
      cadena: { pila: ['B-arc1'], prioridad: 'B', pasesConsecutivos: 0 },
    }
    const v = visibleState(s, 'A')
    expect(v.instances['B-arc1'].cardId).toBe(ARCANA) // Arcana rival en la pila → visible
  })
})
