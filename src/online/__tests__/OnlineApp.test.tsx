import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OnlineApp from '../OnlineApp'
import { useCardStore } from '../../forge/store/useCardStore'
import type { AnyCard } from '../../shared/types'

describe('OnlineApp', () => {
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

describe('OnlineApp — añadir cartas terminadas (datos sin arte)', () => {
  const carta: AnyCard = {
    id: 'terminada-1',
    name: 'Heraldo del Alba',
    type: 'Campeón',
    rarity: 'Rara',
    keywords: [],
    flavorText: 'Anuncia el primer rayo.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    stats: { cost: 2, poder: 3, resistencia: 3 },
  }

  beforeEach(() => {
    localStorage.removeItem('epic-tgc-collection')
    useCardStore.getState().clearCards()
  })

  afterEach(() => {
    localStorage.removeItem('epic-tgc-collection')
    useCardStore.getState().clearCards()
    vi.restoreAllMocks()
  })

  it('muestra el botón para añadir cartas terminadas en el menú', () => {
    render(<OnlineApp />)
    expect(
      screen.getByRole('button', { name: 'Añadir cartas terminadas (JSON)' }),
    ).toBeInTheDocument()
  })

  it('importa los datos de la carta terminada descartando el arte embebido', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    const conArte = { ...carta, imageUrl: 'data:image/webp;base64,XXXX', hasImage: true }
    const file = new File([JSON.stringify([conArte])], 'terminadas.json', {
      type: 'application/json',
    })

    const { container } = render(<OnlineApp />)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    expect(input).not.toBeNull()

    await user.upload(input, file)

    await waitFor(() => {
      expect(useCardStore.getState().cards.length).toBe(1)
    })
    const guardada = useCardStore.getState().cards[0]
    // Datos importados intactos
    expect(guardada.id).toBe('terminada-1')
    expect(guardada.name).toBe('Heraldo del Alba')
    expect(guardada.stats).toEqual({ cost: 2, poder: 3, resistencia: 3 })
    // El arte embebido se descartó: ni inline ni hasImage
    expect(guardada.imageUrl).toBeUndefined()
    expect(guardada.hasImage).toBeUndefined()
    expect(useCardStore.getState().cards.some((c) => c.imageUrl)).toBe(false)
  })

  it('reemplaza la carta existente por id y conserva su arte (hasImage)', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    useCardStore.getState().loadCards([{ ...carta, hasImage: true }])

    const { container } = render(<OnlineApp />)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement
    await user.upload(
      input,
      new File([JSON.stringify([{ ...carta, stats: { cost: 3, poder: 4, resistencia: 4 } }])], 'v2.json', {
        type: 'application/json',
      }),
    )

    await waitFor(() => {
      expect(useCardStore.getState().cards[0]?.stats).toEqual({ cost: 3, poder: 4, resistencia: 4 })
    })
    const guardada = useCardStore.getState().cards[0]
    expect(guardada.name).toBe('Heraldo del Alba')
    // El arte pre-existente (IndexedDB) se conserva aunque el JSON no lo traiga
    expect(guardada.hasImage).toBe(true)
    expect(guardada.imageUrl).toBeUndefined()
  })
})
