import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectorDorsoBot } from '../SelectorDorsoBot'

describe('SelectorDorsoBot', () => {
  it('ofrece Auto y los 5 reversos, con el elegido marcado', () => {
    render(<SelectorDorsoBot valor={2} onCambiar={vi.fn()} />)
    const opciones = screen.getAllByRole('radio')
    expect(opciones.map((o) => o.getAttribute('aria-label'))).toEqual(['Auto', 'Retícula del Eje', 'Escamas', 'Marea', 'Cielo estrellado', 'Panal'])
    expect(screen.getByRole('radio', { name: 'Marea' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Marea', { selector: 'p' })).toBeInTheDocument()
  })

  it('con «auto» explica qué significa', () => {
    render(<SelectorDorsoBot valor="auto" onCambiar={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/distinto al tuyo/)).toBeInTheDocument()
  })

  it('reporta lo elegido: «auto» o el índice del reverso', async () => {
    const onCambiar = vi.fn()
    render(<SelectorDorsoBot valor={0} onCambiar={onCambiar} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Auto' }))
    expect(onCambiar).toHaveBeenLastCalledWith('auto')
    await userEvent.click(screen.getByRole('radio', { name: 'Escamas' }))
    expect(onCambiar).toHaveBeenLastCalledWith(1)
  })
})
