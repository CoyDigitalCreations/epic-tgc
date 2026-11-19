import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OnlineApp from '../OnlineApp'
import { useCardStore } from '../../forge/store/useCardStore'
import { MAX_MAZOS, useMazosStore } from '../useMazosStore'
import { MAZOS } from '../mazos'

function renderApp() {
  return render(
    <MemoryRouter>
      <OnlineApp />
    </MemoryRouter>,
  )
}

function limpiar() {
  useMazosStore.setState({ mazosPersonalizados: [] })
  localStorage.removeItem('epic-tgc-mazos-personalizados')
  useCardStore.getState().clearCards()
  localStorage.removeItem('epic-tgc-collection')
}

describe('OnlineApp: ver y copiar un mazo oficial', () => {
  beforeEach(limpiar)
  afterEach(() => {
    limpiar()
    vi.restoreAllMocks()
  })

  it('Ver abre la lista en solo lectura y Volver regresa al menú', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Ver' })[0])
    expect(screen.getByRole('heading', { name: 'Mazo oficial: Estásis' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar mazo' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
  })

  it('Copiar desde la tarjeta abre el editor con las 66 cartas y se guarda como mazo NUEVO sin tocar el oficial', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    const original = [...MAZOS[0].cardIds]
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Copiar' })[0])
    expect(screen.getByRole('heading', { name: 'Nuevo mazo personalizado' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nombre del mazo')).toHaveValue('Estásis (copia)')
    await user.click(screen.getByRole('button', { name: 'Guardar mazo' }))
    const guardados = useMazosStore.getState().mazosPersonalizados
    expect(guardados).toHaveLength(1)
    expect(guardados[0].nombre).toBe('Estásis (copia)')
    expect([...guardados[0].cardIds].sort()).toEqual([...original].sort())
    // Es una copia independiente: el mazo oficial no cambia
    expect(MAZOS[0].cardIds).toEqual(original)
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
  })

  it('Copiar desde la vista de solo lectura lleva al mismo editor', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Ver' })[1])
    await user.click(screen.getByRole('button', { name: 'Copiar a mis mazos' }))
    expect(screen.getByRole('heading', { name: 'Nuevo mazo personalizado' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nombre del mazo')).toHaveValue('Disonancia (copia)')
  })

  it('cancelar la copia no guarda nada', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getAllByRole('button', { name: 'Copiar' })[0])
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(useMazosStore.getState().mazosPersonalizados).toHaveLength(0)
    expect(screen.getByText('Nueva partida')).toBeInTheDocument()
  })

  it('con el tope de mazos no se puede copiar, ni desde la tarjeta ni desde la vista', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    useMazosStore.setState({
      mazosPersonalizados: Array.from({ length: MAX_MAZOS }, (_, i) => ({ id: `mazo-${i}`, nombre: `Mazo ${i}`, cardIds: MAZOS[0].cardIds })),
    })
    renderApp()
    for (const boton of screen.getAllByRole('button', { name: 'Copiar' })) expect(boton).toBeDisabled()
    await user.click(screen.getAllByRole('button', { name: 'Ver' })[0])
    expect(screen.getByRole('button', { name: 'Copiar a mis mazos' })).toBeDisabled()
    expect(screen.getByText(/Ya tienes 5 mazos personalizados/)).toBeInTheDocument()
  })
})
