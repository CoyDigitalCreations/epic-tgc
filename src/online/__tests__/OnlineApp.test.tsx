import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OnlineApp from '../OnlineApp'
import { useCardStore } from '../../forge/store/useCardStore'
import { useMazosStore } from '../useMazosStore'
import { MAZOS } from '../mazos'
import type { AnyCard } from '../../shared/types'

describe('OnlineApp', () => {
  beforeEach(() => {
    useMazosStore.setState({ mazosPersonalizados: [] })
    localStorage.removeItem('epic-tgc-mazos-personalizados')
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
  })

  afterEach(() => {
    useMazosStore.setState({ mazosPersonalizados: [] })
    localStorage.removeItem('epic-tgc-mazos-personalizados')
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
    vi.restoreAllMocks()
  })

  it('muestra el menú con los mazos y el botón de comenzar', () => {
    render(<OnlineApp />)
    expect(screen.getByRole('heading', { name: 'Éter Online' })).toBeInTheDocument()
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
    expect(screen.getByText('Estásis')).toBeInTheDocument()
    expect(screen.getByText('Disonancia')).toBeInTheDocument()
  })

  it('comienza la partida y el humano decide el mulligan', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    // Tablero montado con las dos zonas
    expect(screen.getByText('Rival (B)')).toBeInTheDocument()
    expect(screen.getByText(/Vos decidís el mulligan/)).toBeInTheDocument()
    expect(screen.getByText('Cadena 9.6')).toBeInTheDocument()
    // Le toca al humano: rendirse disponible
    expect(screen.getByRole('button', { name: 'Rendirse' })).toBeInTheDocument()
  })

  it('al pasar el mulligan, el bot juega el suyo y la partida arranca', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Pasar mulligan' }))
    // El bot juega su mulligan solo y la partida arranca
    await waitFor(
      () => {
        expect(screen.getByText(/B hace mulligan/)).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
    expect(screen.queryByText(/Vos decidís el mulligan/)).not.toBeInTheDocument()
  })

  it('rendirse termina la partida con derrota y permite volver', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Rendirse' }))
    expect(await screen.findByText('Perdiste')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver al menú' }))
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
  })

  it('abandonar vuelve al menú desde el tablero', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Abandonar' }))
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
  })
})

describe('OnlineApp — mazo personalizado', () => {
  beforeEach(() => {
    useMazosStore.setState({ mazosPersonalizados: [] })
    localStorage.removeItem('epic-tgc-mazos-personalizados')
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
  })

  afterEach(() => {
    useMazosStore.setState({ mazosPersonalizados: [] })
    localStorage.removeItem('epic-tgc-mazos-personalizados')
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
  })

  it('ya no ofrece importar colección ni añadir cartas terminadas', () => {
    render(<OnlineApp />)
    expect(
      screen.queryByRole('button', { name: 'Importar colección (JSON)' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Añadir cartas terminadas (JSON)' }),
    ).not.toBeInTheDocument()
  })

  it('abre el editor con "Nuevo mazo personalizado"', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: /Nuevo mazo personalizado/ }))
    expect(
      screen.getByRole('heading', { name: 'Nuevo mazo personalizado' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al menú' })).toBeInTheDocument()
  })

  it('volver al menú desde el editor cancela sin guardar', async () => {
    const user = userEvent.setup()
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: /Nuevo mazo personalizado/ }))
    await user.type(screen.getByLabelText('Nombre del mazo'), 'Los Mutantes')
    await user.click(screen.getByRole('button', { name: 'Volver al menú' }))
    // Sin selección válida: no se guarda al volver
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('elige un mazo personalizado guardado y comienza la partida', async () => {
    const user = userEvent.setup()
    // Deck custom válido (reutiliza el mazo de Estásis como ejemplo)
    useMazosStore.getState().agregarMazo({ nombre: 'Los Mutantes', cardIds: MAZOS[0].cardIds })
    render(<OnlineApp />)
    await user.click(screen.getByRole('button', { name: /Los Mutantes/ }))
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    // Tablero montado con las dos zonas
    expect(screen.getByText('Rival (B)')).toBeInTheDocument()
    expect(screen.getByText(/Vos decidís el mulligan/)).toBeInTheDocument()
  })

  it('un mazo personalizado no pisa los sets (los sets siguen con diseños originales)', () => {
    render(<OnlineApp />)
    // Ambos sets preestablecidos siguen en el menú
    expect(screen.getByText('Estásis')).toBeInTheDocument()
    expect(screen.getByText('Disonancia')).toBeInTheDocument()
  })
})
