import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonPantallaCompleta } from './BotonPantallaCompleta'

const montar = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <BotonPantallaCompleta />
    </MemoryRouter>,
  )

function soportar(valor: boolean) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: valor, configurable: true })
}

describe('BotonPantallaCompleta', () => {
  afterEach(() => {
    // jsdom no define estas propiedades: se dejan como estaban
    delete (document as unknown as Record<string, unknown>).fullscreenEnabled
  })

  it('aparece en el Card-Maker y en el juego online', () => {
    soportar(true)
    for (const ruta of ['/card-maker', '/epiconline', '/epiconline/amigos']) {
      const { unmount } = montar(ruta)
      expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeTruthy()
      unmount()
    }
  })

  it('no aparece en la portada ni donde el navegador no lo soporta', () => {
    soportar(true)
    const { unmount } = montar('/')
    expect(screen.queryByRole('button')).toBeNull()
    unmount()
    soportar(false)
    montar('/card-maker')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('al pulsarlo pide la pantalla completa del documento', () => {
    soportar(true)
    const pedir = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = pedir
    montar('/card-maker')
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }))
    expect(pedir).toHaveBeenCalledTimes(1)
  })
})
