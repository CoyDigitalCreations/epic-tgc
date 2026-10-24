import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CapaCombate } from '../CapaCombate'

const montadas: HTMLElement[] = []

/** jsdom mide todo en 0: cada carta de prueba lleva su rect en data-rect="x,y". */
function carta(id: string, x: number, y: number) {
  const celda = document.createElement('div')
  celda.dataset.zona = '2B'
  const el = document.createElement('div')
  el.dataset.inst = id
  el.dataset.rect = `${x},${y}`
  celda.appendChild(el)
  document.body.appendChild(celda)
  montadas.push(celda)
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const [x, y] = ((this as HTMLElement).dataset.rect ?? '0,0').split(',').map(Number)
    return { left: x - 40, top: y - 55, width: 80, height: 110, right: x + 40, bottom: y + 55, x: x - 40, y: y - 55, toJSON: () => ({}) }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  montadas.splice(0).forEach((c) => c.remove())
})

describe('CapaCombate', () => {
  it('choque: dos trazos (atacante y bloqueador) que se encuentran en el medio, con destello', () => {
    carta('atk', 100, 500)
    carta('blk', 300, 100)
    render(<CapaCombate activa entradas={[{ tipo: 'choque', atacantes: ['atk'], cardInstanceId: 'blk', key: 1 }]} />)

    const capa = screen.getByTestId('capa-combate')
    const trazos = capa.querySelectorAll('line')
    expect(trazos).toHaveLength(2)
    // Ambos terminan en el punto medio (200, 300)
    for (const t of trazos) {
      expect(t.getAttribute('x2')).toBe('200')
      expect(t.getAttribute('y2')).toBe('300')
    }
    expect(capa.querySelectorAll('circle').length).toBeGreaterThan(0)
  })

  it('ruptura: un trazo del atacante al Vínculo, con el impacto sobre el Vínculo', () => {
    carta('atk', 100, 500)
    carta('vin', 400, 80)
    render(<CapaCombate activa entradas={[{ tipo: 'ruptura', atacantes: ['atk'], cardInstanceId: 'vin', key: 2 }]} />)

    const capa = screen.getByTestId('capa-combate')
    const trazos = capa.querySelectorAll('line')
    expect(trazos).toHaveLength(1)
    expect(trazos[0].getAttribute('x2')).toBe('400')
    expect(trazos[0].getAttribute('y2')).toBe('80')
    expect(capa.querySelector('circle')?.getAttribute('cx')).toBe('400')
  })

  it('con la animación apagada no dibuja nada', () => {
    carta('atk', 100, 500)
    carta('blk', 300, 100)
    render(<CapaCombate activa={false} entradas={[{ tipo: 'choque', atacantes: ['atk'], cardInstanceId: 'blk', key: 1 }]} />)
    expect(screen.queryByTestId('capa-combate')).not.toBeInTheDocument()
  })

  it('ignora los tipos que no son de combate (glow, attack)', () => {
    render(<CapaCombate activa entradas={[{ tipo: 'glow', key: 1 }, { tipo: 'attack', atacantes: ['atk'], key: 2 }]} />)
    expect(screen.queryByTestId('capa-combate')).not.toBeInTheDocument()
  })

  it('si una carta no está en pantalla, ese golpe no se dibuja (sin romper)', () => {
    carta('atk', 100, 500)
    render(<CapaCombate activa entradas={[{ tipo: 'choque', atacantes: ['atk'], cardInstanceId: 'fantasma', key: 1 }]} />)
    expect(screen.getByTestId('capa-combate').querySelectorAll('line')).toHaveLength(0)
  })
})
