// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida } from '../bot'
import { visibleState } from '../visibleState'
import { expandirMazo } from './helpers'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('determinismo e2e (5.9)', () => {
  it('mismo seed → mismo estado (deep-equal) y misma secuencia de eventos', () => {
    const a = simularPartida(deckA, deckB, 123)
    const b = simularPartida(deckA, deckB, 123)
    expect(JSON.stringify(a.estado)).toBe(JSON.stringify(b.estado))
    expect(JSON.stringify(a.eventos)).toBe(JSON.stringify(b.eventos))
    expect(a.turnos).toBe(b.turnos)
  })

  it('seeds distintos → trayectorias distintas (no trivial)', () => {
    const a = simularPartida(deckA, deckB, 123)
    const b = simularPartida(deckA, deckB, 456)
    expect(JSON.stringify(a.estado)).not.toBe(JSON.stringify(b.estado))
  })

  it('el estado es JSON-serializable: round-trip JSON preserva el estado y la visión', () => {
    const { estado } = simularPartida(deckA, deckB, 7)
    const copia = JSON.parse(JSON.stringify(estado)) as typeof estado
    expect(JSON.stringify(copia)).toBe(JSON.stringify(estado))

    const vis = visibleState(estado, 'A')
    const visCopia = JSON.parse(JSON.stringify(vis))
    expect(JSON.stringify(visCopia)).toBe(JSON.stringify(vis))
  })
})
