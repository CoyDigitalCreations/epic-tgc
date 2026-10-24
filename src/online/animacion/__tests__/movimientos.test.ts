import { describe, expect, it } from 'vitest'
import { applyAction, createInitialState, visibleState } from '../../game'
import type { GameState } from '../../game'
import { MAZOS } from '../../mazos'
import { diffMovimientos, estiloDe, mostrandoFrente, ubicaciones } from '../movimientos'
import type { Movimiento } from '../movimientos'

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

  it('pagar Éter (Reserva → pago) es un movimiento', () => {
    const prev = partidaEnForja()
    const next = structuredClone(prev)
    const eter = next.players.A.eterReserva.shift()!
    next.players.A.eterPagado.push(eter)

    expect(diffMovimientos(prev, next)).toEqual([
      { cardInstanceId: eter, de: { jugador: 'A', zona: '2A' }, a: { jugador: 'A', zona: '1A' } },
    ])
  })

  it('bloquear Éter: el destino lleva la carta que lo sostiene', () => {
    const prev = partidaEnForja()
    const campeon = prev.players.A.mano[0]!
    prev.players.A.mano.shift()
    prev.players.A.campo.campeones[0] = campeon
    const next = structuredClone(prev)
    const eter = next.players.A.eterReserva.shift()!
    next.instances[campeon] = { ...next.instances[campeon], eterBloqueado: [eter] }

    expect(diffMovimientos(prev, next)).toEqual([
      { cardInstanceId: eter, de: { jugador: 'A', zona: '2A' }, a: { jugador: 'A', zona: 'bloqueado', sobre: campeon } },
    ])
  })

  it('el Éter que vuelve a la Reserva (reagrupar, devolver) NO vuela: es un pulso aparte', () => {
    const prev = partidaEnForja()
    const eter = prev.players.A.eterReserva.shift()!
    prev.players.A.eterPagado.push(eter)
    const next = structuredClone(prev)
    next.players.A.eterPagado.pop()
    next.players.A.eterReserva.push(eter)

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

describe('estiloDe', () => {
  const mov = (de: string | null, a: string): Movimiento => ({
    cardInstanceId: 'x',
    de: de ? { jugador: 'A', zona: de as never } : null,
    a: { jugador: 'A', zona: a as never },
  })

  it('campo → cementerio es destrucción (campeón, mística, arcana y vínculo)', () => {
    for (const de of ['2B', '2F', '3A', '3C', '3D', '3F', '4A', '4F']) {
      expect(estiloDe(mov(de, '2G'))).toBe('destruccion')
    }
  })

  it('descartar de la mano o moler el mazo NO es destrucción', () => {
    expect(estiloDe(mov('mano', '2G'))).toBe('normal')
    expect(estiloDe(mov('3G', '2G'))).toBe('normal')
  })

  it('cualquier carta que termina en 1G es exilio (desde campo, mano o cementerio)', () => {
    for (const de of ['2B', 'mano', '2G', '3G']) {
      expect(estiloDe(mov(de, '1G'))).toBe('exilio')
    }
  })

  it('Éter: pagar y bloquear usan el estilo corto del Éter', () => {
    expect(estiloDe(mov('2A', '1A'))).toBe('eter')
    expect(estiloDe(mov('2A', 'bloqueado'))).toBe('eter')
    expect(estiloDe(mov('1A', 'bloqueado'))).toBe('eter')
  })

  it('el resto (robar, invocar, colocar) vuela normal', () => {
    expect(estiloDe(mov('3G', 'mano'))).toBe('normal')
    expect(estiloDe(mov('mano', '2C'))).toBe('normal')
    expect(estiloDe(mov('2B', 'mano'))).toBe('normal')
  })
})
