import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MenuPartida } from '../MenuPartida'
import type { MenuProps } from '../MenuPartida'
import { MAZOS } from '../mazos'

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

const mazoPropio = { id: 'los-mutantes', nombre: 'Los Mutantes', cardIds: MAZOS[0].cardIds }

describe('MenuPartida: elegir mazo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('marca el mazo elegido (aria-pressed) y muestra la composición de cada set', () => {
    renderMenu({ mazoHumano: { tipo: 'set', id: 'disonancia' } })
    expect(screen.getByRole('button', { name: /Disonancia/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Estásis/ })).toHaveAttribute('aria-pressed', 'false')
    // 15 Éter + 45 Principal + 6 Vínculos = 66 (manual §3.1)
    expect(screen.getAllByText(/66 cartas · Éter 15 · Principal 45 · Vínculos 6/)).toHaveLength(2)
  })

  it('el clic en un set lo elige', async () => {
    const user = userEvent.setup()
    const props = renderMenu()
    await user.click(screen.getByRole('button', { name: /Disonancia/ }))
    expect(props.onMazo).toHaveBeenCalledWith({ tipo: 'set', id: 'disonancia' })
  })

  it('un mazo personalizado se elige y se edita por separado', async () => {
    const user = userEvent.setup()
    const props = renderMenu({ mazosPersonalizados: [mazoPropio] })

    await user.click(screen.getByRole('button', { name: /Los Mutantes/ }))
    expect(props.onMazo).toHaveBeenCalledWith({ tipo: 'custom', id: 'los-mutantes' })
    expect(props.onEditarMazo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(props.onEditarMazo).toHaveBeenCalledWith(mazoPropio)
  })

  it('los sets oficiales no se pueden editar', () => {
    renderMenu()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('"Nuevo mazo personalizado" abre el editor', async () => {
    const user = userEvent.setup()
    const props = renderMenu()
    await user.click(screen.getByRole('button', { name: /Nuevo mazo personalizado/ }))
    expect(props.onNuevoMazo).toHaveBeenCalledTimes(1)
  })
})

describe('MenuPartida: rival, dificultad y semilla', () => {
  afterEach(() => vi.restoreAllMocks())

  it('con un set oficial el rival es el OTRO set', () => {
    renderMenu({ mazoHumano: { tipo: 'set', id: 'estasis' } })
    expect(screen.getByText('Rival: Disonancia')).toBeInTheDocument()
  })

  it('con el otro set el rival se invierte', () => {
    renderMenu({ mazoHumano: { tipo: 'set', id: 'disonancia' } })
    expect(screen.getByText('Rival: Estásis')).toBeInTheDocument()
  })

  it('con mazo personalizado el rival sale de la semilla (par/impar) y se avisa', () => {
    // seed % 2: 7 → Disonancia (MAZOS[1])
    renderMenu({ mazoHumano: { tipo: 'custom', id: 'los-mutantes' }, mazosPersonalizados: [mazoPropio], seed: 7 })
    expect(screen.getByText(`Rival: ${MAZOS[1].nombre}`)).toBeInTheDocument()
    expect(screen.getByText(/el bot elige su set según la semilla/)).toBeInTheDocument()
  })

  it('con mazo personalizado y semilla par el rival es el otro set', () => {
    renderMenu({ mazoHumano: { tipo: 'custom', id: 'los-mutantes' }, mazosPersonalizados: [mazoPropio], seed: 8 })
    expect(screen.getByText(`Rival: ${MAZOS[0].nombre}`)).toBeInTheDocument()
  })

  it('la dificultad elegida está marcada y el clic cambia la dificultad', async () => {
    const user = userEvent.setup()
    const props = renderMenu({ dificultad: 'medio' })
    expect(screen.getByRole('button', { name: /Medio/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Difícil/ })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: /Difícil/ }))
    expect(props.onDificultad).toHaveBeenCalledWith('dificil')
  })

  it('"Aleatoria" genera una semilla nueva', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const user = userEvent.setup()
    const props = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Aleatoria' }))
    expect(props.onSeed).toHaveBeenCalledWith(50_000)
  })

  it('editar la semilla a mano la informa como número', async () => {
    const user = userEvent.setup()
    const props = renderMenu({ seed: 0 })
    await user.type(screen.getByRole('spinbutton', { name: 'Seed' }), '5')
    expect(props.onSeed).toHaveBeenLastCalledWith(5)
  })
})

describe('MenuPartida: acciones', () => {
  it('"Comenzar partida" arranca la partida', async () => {
    const user = userEvent.setup()
    const props = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    expect(props.onEmpezar).toHaveBeenCalledTimes(1)
  })

  it('tiene los enlaces a Inicio y al lobby de amigos', () => {
    renderMenu()
    expect(screen.getByRole('link', { name: '← Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Abrir lobby' })).toHaveAttribute('href', '/epiconline/amigos')
  })
})
