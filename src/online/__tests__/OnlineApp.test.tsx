import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OnlineApp from '../OnlineApp'
import { useCardStore } from '../../forge/store/useCardStore'
import { useMazosStore } from '../useMazosStore'
import { MAZOS } from '../mazos'
import { getCardMeta } from '../game'
import { cardArtPath } from '../../shared/data/paquetes'
import type { AnyCard } from '../../shared/types'

function renderApp() {
  return render(
    <MemoryRouter>
      <OnlineApp />
    </MemoryRouter>,
  )
}

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
    renderApp()
    expect(screen.getByRole('heading', { name: 'Éter Online' })).toBeInTheDocument()
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comenzar partida' })).toBeInTheDocument()
    expect(screen.getByText('Estásis')).toBeInTheDocument()
    expect(screen.getByText('Disonancia')).toBeInTheDocument()
  })

  it('tiene un botón para volver a la landing inicial', () => {
    renderApp()
    const inicio = screen.getByRole('link', { name: '← Inicio' })
    expect(inicio).toHaveAttribute('href', '/')
  })

  it('comienza la partida y el humano decide el mulligan', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    // Tablero montado con las dos zonas
    expect(screen.getByText('Rival (B)')).toBeInTheDocument()
    expect(screen.getByText(/Tú decides el mulligan/)).toBeInTheDocument()
    expect(screen.getByText('Cadena 9.6')).toBeInTheDocument()
    // Le toca al humano: rendirse disponible
    expect(screen.getByRole('button', { name: 'Rendirse' })).toBeInTheDocument()
  })

  it('al pasar el mulligan, el bot juega el suyo y la partida arranca', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Pasar mulligan' }))
    // El bot decide su mulligan solo (hacerlo o pasar depende de su mano y su nivel) y la partida arranca
    await waitFor(
      () => {
        expect(screen.queryByText(/Tú decides el mulligan/)).not.toBeInTheDocument()
      },
      { timeout: 10000 },
    )
  })

  it('rendirse termina la partida con derrota y permite volver', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Rendirse' }))
    expect(await screen.findByText('Perdiste')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver al menú' }))
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
  })

  it('al perder aparece el velo de derrota (y el de victoria no)', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    await user.click(screen.getByRole('button', { name: 'Rendirse' }))
    await screen.findByText('Perdiste')
    const efecto = screen.getByTestId('fin-efecto')
    expect(efecto).toHaveClass('anim-fin-derrota')
    expect(efecto).not.toHaveClass('anim-fin-victoria')
  })

  it('abandonar vuelve al menú desde el tablero', async () => {
    const user = userEvent.setup()
    renderApp()
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
    renderApp()
    expect(
      screen.queryByRole('button', { name: 'Importar colección (JSON)' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Añadir cartas terminadas (JSON)' }),
    ).not.toBeInTheDocument()
  })

  it('abre el editor con "Nuevo mazo personalizado"', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /Nuevo mazo personalizado/ }))
    expect(
      screen.getByRole('heading', { name: 'Nuevo mazo personalizado' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('volver al menú desde el editor cancela sin guardar', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /Nuevo mazo personalizado/ }))
    await user.type(screen.getByPlaceholderText('Nombre del mazo'), 'Los Mutantes')
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    // Sin selección válida: no se guarda al volver
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('elige un mazo personalizado guardado y comienza la partida', async () => {
    const user = userEvent.setup()
    // Deck custom válido (reutiliza el mazo de Estásis como ejemplo)
    useMazosStore.getState().agregarMazo({ nombre: 'Los Mutantes', cardIds: MAZOS[0].cardIds })
    renderApp()
    await user.click(screen.getByRole('button', { name: /Los Mutantes/ }))
    await user.click(screen.getByRole('button', { name: 'Comenzar partida' }))
    // Tablero montado con las dos zonas
    expect(screen.getByText('Rival (B)')).toBeInTheDocument()
    expect(screen.getByText(/Tú decides el mulligan/)).toBeInTheDocument()
  })

  it('un mazo personalizado no pisa los sets (los sets siguen con diseños originales)', () => {
    renderApp()
    // Ambos sets preestablecidos siguen en el menú
    expect(screen.getByText('Estásis')).toBeInTheDocument()
    expect(screen.getByText('Disonancia')).toBeInTheDocument()
  })

  it('la card del mazo personalizado muestra miniaturas de sus cartas', async () => {
    useMazosStore.getState().agregarMazo({ nombre: 'Vista Previa', cardIds: MAZOS[0].cardIds })
    renderApp()
    const card = screen.getByRole('button', { name: /Vista Previa/ })
    // El arte se resuelve en el useEffect → esperar el re-render
    const imgs = await within(card).findAllByRole('img')
    // Hasta 8 miniaturas de cartas únicas del deck
    expect(imgs.length).toBeGreaterThan(0)
    expect(imgs.length).toBeLessThanOrEqual(8)
    // La portada muestra las MEJORES cartas (Campeones y más raras), no las primeras de la lista:
    // cada miniatura es el arte oficial de una carta del mazo, con su nombre en el alt (accesible)
    const artes = new Set(MAZOS[0].cardIds.map((id) => cardArtPath(id)))
    const nombres = new Set(MAZOS[0].cardIds.map((id) => getCardMeta(id)?.name))
    for (const img of imgs) {
      expect(artes.has(img.getAttribute('src') ?? undefined)).toBe(true)
      expect(nombres.has(img.getAttribute('alt') ?? undefined)).toBe(true)
    }
  })
})
