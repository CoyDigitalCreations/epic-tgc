// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ganadorPpt, pptDecidir, pptInicial, pptJugar, pptVista, JUGADAS_PPT } from '../ppt'
import type { PptEstado } from '../ppt'
import { createInitialState } from '../initialState'
import { MAZOS } from '../../mazos'

const ok = (r: ReturnType<typeof pptJugar>): PptEstado => {
  if (!r.ok) throw new Error(r.error)
  return r.ppt
}

describe('ganadorPpt', () => {
  it('piedra > tijera > papel > piedra, y el mismo gesto empata', () => {
    expect(ganadorPpt('piedra', 'tijera')).toBe('A')
    expect(ganadorPpt('tijera', 'papel')).toBe('A')
    expect(ganadorPpt('papel', 'piedra')).toBe('A')
    expect(ganadorPpt('tijera', 'piedra')).toBe('B')
    expect(ganadorPpt('papel', 'tijera')).toBe('B')
    expect(ganadorPpt('piedra', 'papel')).toBe('B')
    for (const j of JUGADAS_PPT) expect(ganadorPpt(j, j)).toBe('empate')
  })
})

describe('pptJugar', () => {
  it('con una sola jugada la ronda queda abierta', () => {
    const p = ok(pptJugar(null, 'A', 'piedra'))
    expect(p.jugadas).toEqual({ A: 'piedra' })
    expect(p.ganador).toBeUndefined()
  })

  it('el resultado no depende de quién juega primero', () => {
    const aLuegoB = ok(pptJugar(ok(pptJugar(null, 'A', 'papel')), 'B', 'piedra'))
    const bLuegoA = ok(pptJugar(ok(pptJugar(null, 'B', 'piedra')), 'A', 'papel'))
    expect(aLuegoB.ganador).toBe('A')
    expect(bLuegoA.ganador).toBe('A')
    expect(aLuegoB.ultima).toEqual(bLuegoA.ultima)
  })

  it('un empate abre la ronda siguiente, limpia las jugadas y revela la anterior', () => {
    const p = ok(pptJugar(ok(pptJugar(null, 'A', 'tijera')), 'B', 'tijera'))
    expect(p.ganador).toBeUndefined()
    expect(p.ronda).toBe(2)
    expect(p.jugadas).toEqual({})
    expect(p.ultima).toEqual({ ronda: 1, A: 'tijera', B: 'tijera' })
  })

  it('tras empatar se puede volver a jugar y ganar', () => {
    const empate = ok(pptJugar(ok(pptJugar(null, 'A', 'papel')), 'B', 'papel'))
    const final = ok(pptJugar(ok(pptJugar(empate, 'A', 'piedra')), 'B', 'papel'))
    expect(final.ganador).toBe('B')
    expect(final.ultima).toEqual({ ronda: 2, A: 'piedra', B: 'papel' })
  })

  it('rechaza una jugada inválida, repetir en la misma ronda y jugar con ganador ya decidido', () => {
    expect(pptJugar(null, 'A', 'lagarto').ok).toBe(false)
    const una = ok(pptJugar(null, 'A', 'piedra'))
    expect(pptJugar(una, 'A', 'papel')).toMatchObject({ ok: false })
    const resuelta = ok(pptJugar(una, 'B', 'tijera'))
    expect(pptJugar(resuelta, 'A', 'papel')).toMatchObject({ ok: false })
  })

  it('cada cambio sube rev (el servidor lo usa como compare-and-set)', () => {
    const a = ok(pptJugar(null, 'A', 'piedra'))
    const b = ok(pptJugar(a, 'B', 'papel'))
    expect([pptInicial().rev, a.rev, b.rev]).toEqual([0, 1, 2])
  })
})

describe('pptDecidir', () => {
  const conGanadorA = () => ok(pptJugar(ok(pptJugar(null, 'A', 'piedra')), 'B', 'tijera'))

  it('el ganador puede empezar o ceder', () => {
    expect(ok(pptDecidir(conGanadorA(), 'A', true)).primerJugador).toBe('A')
    expect(ok(pptDecidir(conGanadorA(), 'A', false)).primerJugador).toBe('B')
  })

  it('solo decide el ganador, solo una vez y solo con ganador', () => {
    expect(pptDecidir(conGanadorA(), 'B', true)).toMatchObject({ ok: false })
    expect(pptDecidir(pptInicial(), 'A', true)).toMatchObject({ ok: false })
    expect(pptDecidir(null, 'A', true)).toMatchObject({ ok: false })
    expect(pptDecidir(conGanadorA(), 'A', 'si')).toMatchObject({ ok: false })
    const decidido = ok(pptDecidir(conGanadorA(), 'A', true))
    expect(pptDecidir(decidido, 'A', false)).toMatchObject({ ok: false })
  })
})

describe('pptVista: lo que sale hacia el cliente', () => {
  it('nunca incluye la jugada pendiente del rival, solo que ya eligió', () => {
    const p = ok(pptJugar(null, 'A', 'piedra'))
    const vistaB = pptVista(p, 'B')
    expect(vistaB.rivalListo).toBe(true)
    expect(vistaB.miJugada).toBeUndefined()
    expect(JSON.stringify(vistaB)).not.toContain('piedra')
    const vistaA = pptVista(p, 'A')
    expect(vistaA.miJugada).toBe('piedra')
    expect(vistaA.rivalListo).toBe(false)
  })

  it('una ronda resuelta sí se revela a ambos', () => {
    const p = ok(pptJugar(ok(pptJugar(null, 'A', 'piedra')), 'B', 'tijera'))
    for (const j of ['A', 'B'] as const) {
      expect(pptVista(p, j).ultima).toEqual({ ronda: 1, A: 'piedra', B: 'tijera' })
      expect(pptVista(p, j).ganador).toBe('A')
    }
  })

  it('sin ppt devuelve la ronda 1 vacía', () => {
    expect(pptVista(null, 'A')).toEqual({ ronda: 1, rivalListo: false })
  })
})

describe('SetupOptions.primerJugador', () => {
  const [a, b] = MAZOS.map((m) => m.cardIds)

  it('fija quién empieza sin desplazar la secuencia aleatoria', () => {
    const base = createInitialState(a, b, 7)
    const forzadoA = createInitialState(a, b, 7, { primerJugador: 'A' })
    const forzadoB = createInitialState(a, b, 7, { primerJugador: 'B' })
    expect(forzadoA.state.primerJugador).toBe('A')
    expect(forzadoB.state.primerJugador).toBe('B')
    // misma cantidad de extracciones y mismo reparto de cartas: solo cambia quién empieza
    expect(forzadoA.ctx.draws).toBe(base.ctx.draws)
    expect(forzadoB.ctx.draws).toBe(base.ctx.draws)
    expect({ ...forzadoB.state, primerJugador: base.state.primerJugador }).toEqual(base.state)
  })

  it('sin la opción conserva la moneda de siempre', () => {
    expect(createInitialState(a, b, 7).state.primerJugador).toBe(createInitialState(a, b, 7, {}).state.primerJugador)
  })
})
