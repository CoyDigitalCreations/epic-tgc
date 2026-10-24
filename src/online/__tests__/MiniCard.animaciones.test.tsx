import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardInstance } from '../game'
import { AnimacionActivaContext } from '../animacion/contexto'
import { MiniCard } from '../components/MiniCard'

const inst = (extra: Partial<CardInstance> = {}): CardInstance => ({
  cardInstanceId: 'x',
  cardId: 'FB-010',
  owner: 'A',
  ...extra,
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MiniCard: revelar una carta en su sitio', () => {
  it('al pasar de boca abajo a boca arriba muestra el dorso girando y la cara entrando; luego se limpia', () => {
    const { container, rerender } = render(<MiniCard inst={inst()} bocaAbajo />)
    expect(container.querySelector('.anim-revelar-dorso')).toBeNull()

    rerender(<MiniCard inst={inst()} bocaAbajo={false} />)
    expect(container.querySelector('.anim-revelar-dorso')).not.toBeNull()
    expect(container.querySelector('.anim-revelar-frente')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(container.querySelector('.anim-revelar-dorso')).toBeNull()
    expect(container.querySelector('.anim-revelar-frente')).toBeNull()
  })

  it('una carta que nace boca arriba no se "revela"', () => {
    const { container } = render(<MiniCard inst={inst()} />)
    expect(container.querySelector('.anim-revelar-dorso')).toBeNull()
  })

  it('con la animación apagada la cara aparece sin giro', () => {
    const ui = (bocaAbajo: boolean) => (
      <AnimacionActivaContext.Provider value={false}>
        <MiniCard inst={inst()} bocaAbajo={bocaAbajo} />
      </AnimacionActivaContext.Provider>
    )
    const { container, rerender } = render(ui(true))
    rerender(ui(false))
    expect(container.querySelector('.anim-revelar-dorso')).toBeNull()
  })
})

describe('MiniCard: agotar y enderezar en el campo', () => {
  const giro = (c: HTMLElement) => c.querySelector<HTMLElement>('.anim-giro')

  it('la carta de campo gira sobre su centro con transición al agotarse', () => {
    const { container, rerender } = render(<MiniCard inst={inst()} rotarSiAgotado />)
    expect(giro(container)?.style.transform).toContain('rotate(0deg)')

    rerender(<MiniCard inst={inst({ agotado: true })} rotarSiAgotado />)
    expect(giro(container)?.style.transform).toContain('rotate(-90deg)')

    rerender(<MiniCard inst={inst({ agotado: false })} rotarSiAgotado />)
    expect(giro(container)?.style.transform).toContain('rotate(0deg)')
  })

  it('sin la transición cuando la animación está apagada', () => {
    const { container } = render(
      <AnimacionActivaContext.Provider value={false}>
        <MiniCard inst={inst({ agotado: true })} rotarSiAgotado />
      </AnimacionActivaContext.Provider>,
    )
    expect(giro(container)).toBeNull()
    expect(container.querySelector('[style*="rotate(-90deg)"]')).not.toBeNull()
  })

  it('fuera del campo (sin rotarSiAgotado) la carta nunca gira', () => {
    const { container } = render(<MiniCard inst={inst({ agotado: true })} />)
    expect(container.querySelector('[style*="rotate(-90deg)"]')).toBeNull()
    expect(container.querySelector('.anim-giro')).toBeNull()
  })
})
