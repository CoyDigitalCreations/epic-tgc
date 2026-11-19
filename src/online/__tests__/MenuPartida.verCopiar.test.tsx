import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { MenuPartida } from '../MenuPartida'
import type { MenuProps } from '../MenuPartida'
import { MAZOS } from '../mazos'
import { MAX_MAZOS } from '../useMazosStore'

function renderMenu(over: Partial<MenuProps> = {}) {
  const props: MenuProps = {
    mazoHumano: { tipo: 'set', id: 'estasis' },
    onMazo: vi.fn(),
    mazosPersonalizados: [],
    onNuevoMazo: vi.fn(),
    onEditarMazo: vi.fn(),
    onVerMazo: vi.fn(),
    onCopiarMazo: vi.fn(),
    seed: 7,
    onSeed: vi.fn(),
    dificultad: 'medio',
    onDificultad: vi.fn(),
    onEmpezar: vi.fn(),
    ...over,
  }
  render(
    <MemoryRouter>
      <MenuPartida {...props} />
    </MemoryRouter>,
  )
  return props
}

const propio = (i: number) => ({ id: `mazo-${i}`, nombre: `Mazo ${i}`, cardIds: MAZOS[0].cardIds })

describe('MenuPartida: ver y copiar mazos oficiales', () => {
  it('cada set oficial ofrece Ver y Copiar, y cada botón actúa sobre SU mazo', async () => {
    const user = userEvent.setup()
    const props = renderMenu()
    expect(screen.getAllByRole('button', { name: 'Ver' })).toHaveLength(MAZOS.length)
    expect(screen.getAllByRole('button', { name: 'Copiar' })).toHaveLength(MAZOS.length)
    await user.click(screen.getAllByRole('button', { name: 'Ver' })[1])
    expect(props.onVerMazo).toHaveBeenCalledWith(MAZOS[1])
    await user.click(screen.getAllByRole('button', { name: 'Copiar' })[2])
    expect(props.onCopiarMazo).toHaveBeenCalledWith(MAZOS[2])
  })

  it('ver o copiar no cambia el mazo elegido', async () => {
    const user = userEvent.setup()
    const props = renderMenu()
    await user.click(screen.getAllByRole('button', { name: 'Ver' })[3])
    expect(props.onMazo).not.toHaveBeenCalled()
  })

  it('los mazos personalizados solo se editan: no tienen Ver ni Copiar propios', () => {
    renderMenu({ mazosPersonalizados: [propio(1)] })
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver' })).toHaveLength(MAZOS.length)
    expect(screen.getAllByRole('button', { name: 'Copiar' })).toHaveLength(MAZOS.length)
  })

  it('con el tope de mazos personalizados, Copiar queda deshabilitado con el motivo (Ver sigue disponible)', () => {
    renderMenu({ mazosPersonalizados: Array.from({ length: MAX_MAZOS }, (_, i) => propio(i)) })
    for (const boton of screen.getAllByRole('button', { name: 'Copiar' })) {
      expect(boton).toBeDisabled()
      expect(boton).toHaveAttribute('title', expect.stringContaining(`${MAX_MAZOS} mazos personalizados`))
    }
    for (const boton of screen.getAllByRole('button', { name: 'Ver' })) expect(boton).toBeEnabled()
  })

  it('sin los handlers no se ofrecen los botones (compatibilidad con quien no los pasa)', () => {
    renderMenu({ onVerMazo: undefined, onCopiarMazo: undefined })
    expect(screen.queryByRole('button', { name: 'Ver' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()
  })
})
