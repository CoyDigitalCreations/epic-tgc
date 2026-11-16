import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { MenuPartida } from '../MenuPartida'
import type { MenuProps } from '../MenuPartida'

function renderMenu(over: Partial<MenuProps> = {}) {
  const props: MenuProps = {
    mazoHumano: { tipo: 'set', id: 'estasis' },
    onMazo: vi.fn(),
    mazosPersonalizados: [],
    onNuevoMazo: vi.fn(),
    onEditarMazo: vi.fn(),
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

describe('MenuPartida: acceso al Perfil y reverso del rival', () => {
  it('el encabezado enlaza al Perfil (donde se elige tu reverso) sin quitar «← Inicio»', () => {
    renderMenu()
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/epiconline/perfil')
    expect(screen.getByRole('link', { name: '← Inicio' })).toHaveAttribute('href', '/')
  })

  it('sin onDorsoBot no se ofrece el selector del reverso del rival', () => {
    renderMenu()
    expect(screen.queryByRole('radiogroup', { name: 'Reverso del rival' })).not.toBeInTheDocument()
  })

  it('con onDorsoBot ofrece Auto y los 5 reversos, y avisa de la elección', async () => {
    const user = userEvent.setup()
    const props = renderMenu({ dorsoBot: 'auto', onDorsoBot: vi.fn() })
    const grupo = screen.getByRole('radiogroup', { name: 'Reverso del rival' })
    expect(grupo.querySelectorAll('[role="radio"]')).toHaveLength(6)
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Panal' }))
    expect(props.onDorsoBot).toHaveBeenCalledWith(4)
  })
})
