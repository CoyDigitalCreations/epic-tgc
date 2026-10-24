import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardInstance } from '../../game/types'
import { CapaAnuncios } from '../CapaAnuncios'

const montadas: HTMLElement[] = []

const instancias: Record<string, CardInstance> = {
  mia: { cardInstanceId: 'mia', cardId: 'FB-010', owner: 'A' },
  suya: { cardInstanceId: 'suya', cardId: 'FB-016', owner: 'B' },
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { left: 60, top: 45, width: 80, height: 110, right: 140, bottom: 155, x: 60, y: 45, toJSON: () => ({}) }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  montadas.splice(0).forEach((c) => c.remove())
})

describe('CapaAnuncios', () => {
  it('banner propio: muestra el texto del anuncio', () => {
    render(<CapaAnuncios activa instancias={instancias} entradas={[{ tipo: 'banner', texto: 'Tu turno', jugador: 'A', key: 1 }]} />)
    expect(screen.getByTestId('banner-turno')).toHaveTextContent('Tu turno')
    expect(screen.getByTestId('banner-turno')).toHaveClass('text-amber-200')
  })

  it('banner del rival: otro color', () => {
    render(<CapaAnuncios activa instancias={instancias} entradas={[{ tipo: 'banner', texto: 'Turno del rival', jugador: 'B', key: 1 }]} />)
    expect(screen.getByTestId('banner-turno')).toHaveClass('text-red-200')
  })

  it('si hay varios banners a la vez, solo se dibuja el último', () => {
    render(
      <CapaAnuncios
        activa
        instancias={instancias}
        entradas={[
          { tipo: 'banner', texto: 'Fase de Choque', jugador: 'A', key: 1 },
          { tipo: 'banner', texto: 'Fase de Ocaso', jugador: 'A', key: 2 },
        ]}
      />,
    )
    expect(screen.getAllByTestId('banner-turno')).toHaveLength(1)
    expect(screen.getByTestId('banner-turno')).toHaveTextContent('Fase de Ocaso')
  })

  it('activación del rival: carta ampliada con su nombre', () => {
    render(<CapaAnuncios activa instancias={instancias} entradas={[{ tipo: 'activacion', cardInstanceId: 'suya', jugador: 'B', key: 1 }]} />)
    expect(screen.getByTestId('activacion-rival')).toHaveTextContent('El rival activa:')
    expect(screen.queryByTestId('anillo-activacion')).not.toBeInTheDocument()
  })

  it('activación propia: anillo sobre la carta en su sitio, sin carta ampliada', () => {
    const celda = document.createElement('div')
    celda.dataset.zona = '2B'
    const el = document.createElement('div')
    el.dataset.inst = 'mia'
    celda.appendChild(el)
    document.body.appendChild(celda)
    montadas.push(celda)

    render(<CapaAnuncios activa instancias={instancias} entradas={[{ tipo: 'activacion', cardInstanceId: 'mia', jugador: 'A', key: 1 }]} />)
    const anillo = screen.getByTestId('anillo-activacion')
    expect(anillo.querySelectorAll('circle')).toHaveLength(2)
    expect(anillo.querySelector('circle')?.getAttribute('cx')).toBe('100')
    expect(screen.queryByTestId('activacion-rival')).not.toBeInTheDocument()
  })

  it('con la animación apagada no dibuja nada', () => {
    render(<CapaAnuncios activa={false} instancias={instancias} entradas={[{ tipo: 'banner', texto: 'Tu turno', jugador: 'A', key: 1 }]} />)
    expect(screen.queryByTestId('capa-anuncios')).not.toBeInTheDocument()
  })

  it('ignora los tipos que no son anuncios', () => {
    render(<CapaAnuncios activa instancias={instancias} entradas={[{ tipo: 'glow', key: 1 }, { tipo: 'choque', key: 2 }]} />)
    expect(screen.queryByTestId('capa-anuncios')).not.toBeInTheDocument()
  })
})
