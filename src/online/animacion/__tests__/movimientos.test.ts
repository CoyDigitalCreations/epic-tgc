import { describe, expect, it } from 'vitest'
import { applyAction, createInitialState, visibleState } from '../../game'
import type { GameState } from '../../game'
import { MAZOS } from '../../mazos'
import { diffMovimientos, mostrandoFrente, ubicaciones } from '../movimientos'

/** Crea la partida y pasa los dos mulligans: llega a Forja. */
function partidaEnForja(seed = 42): GameState {
  const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, seed)
  let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
  s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
  return s
}

describe('diffMovimientos', () => {
  it('sin cambios no hay movimientos', () => {
    const s = partidaEnForja()
    expect(diffMovimientos(s, structuredClone(s))).toEqual([])
  })

  it('mano → campo: una carta que se invoca', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const id = next.players.A.mano.shift()!
    next.players.A.campo.campeones[1] = id

    expect(diffMovimientos(prev, next)).toEqual([
      { cardInstanceId: id, de: { jugador: 'A', zona: 'mano' }, a: { jugador: 'A', zona: '2C' } },
    ])
  })

  it('mazo → mano: robar (el motor no emite salida/entrada, el diff sí lo ve)', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const id = next.players.B.mazo.shift()!
    next.players.B.mano.push(id)

    expect(diffMovimientos(prev, next)).toEqual([
      { cardInstanceId: id, de: { jugador: 'B', zona: '3G' }, a: { jugador: 'B', zona: 'mano' } },
    ])
  })

  it('campo → cementerio: una carta que muere', () => {
    const base = partidaEnForja()
    const prev = structuredClone(base)
    const id = prev.players.A.mano.shift()!
    prev.players.A.campo.campeones[0] = id
    const next = structuredClone(prev)
    next.players.A.campo.campeones[0] = null
    next.players.A.cementerio.push(id)

    expect(diffMovimientos(prev, next)).toEqual([
      { cardInstanceId: id, de: { jugador: 'A', zona: '2B' }, a: { jugador: 'A', zona: '2G' } },
    ])
  })

  it('Arcana colocada: mano → 3D', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const id = next.players.A.mano.shift()!
    next.players.A.campo.arcanasCombate[0] = id

    const [mov] = diffMovimientos(prev, next)
    expect(mov?.a).toEqual({ jugador: 'A', zona: '3D' })
  })

  it('el Éter (Reserva, pagado, bloqueado) no se anima todavía', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const eter = next.players.A.eterReserva.shift()!
    next.players.A.eterPagado.push(eter)

    expect(diffMovimientos(prev, next)).toEqual([])
  })

  it('en la vista del rival, robar es un movimiento con ids pero sin cardId (no filtra la carta)', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const id = next.players.B.mazo.shift()!
    next.players.B.mano.push(id)

    const vPrev = visibleState(prev, 'A')
    const vNext = visibleState(next, 'A')
    const movs = diffMovimientos(vPrev, vNext)

    expect(movs).toHaveLength(1)
    expect(movs[0]?.cardInstanceId).toBe(id)
    expect(vNext.instances[id]?.cardId).toBeNull()
  })
})

describe('ubicaciones', () => {
  it('ubica el mazo en 3G y la mano en mano', () => {
    const s = partidaEnForja()
    const ub = ubicaciones(s)
    const enMano = s.players.A.mano[0]!
    const enMazo = s.players.A.mazo[0]!
    expect(ub.get(enMano)).toEqual({ jugador: 'A', zona: 'mano' })
    expect(ub.get(enMazo)).toEqual({ jugador: 'A', zona: '3G' })
  })
})

describe('mostrandoFrente', () => {
  const inst = (over: Partial<{ cardId: string | null; bocaArriba: boolean }> = {}) => ({
    cardInstanceId: 'x',
    cardId: 'FB-001' as string | null,
    owner: 'A' as const,
    ...over,
  })

  it('carta oculta (cardId null) siempre de dorso', () => {
    expect(mostrandoFrente(inst({ cardId: null }), '2B')).toBe(false)
  })

  it('mano y campo: de frente', () => {
    expect(mostrandoFrente(inst(), 'mano')).toBe(true)
    expect(mostrandoFrente(inst(), '2B')).toBe(true)
    expect(mostrandoFrente(inst(), '3A')).toBe(true)
  })

  it('Arcana y Vínculo propios: dorso hasta bocaArriba aunque el dueño conozca el cardId', () => {
    expect(mostrandoFrente(inst(), '3D')).toBe(false)
    expect(mostrandoFrente(inst(), '4A')).toBe(false)
    expect(mostrandoFrente(inst({ bocaArriba: true }), '4A')).toBe(true)
  })
})
