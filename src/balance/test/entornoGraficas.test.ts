import { afterEach, describe, expect, it } from 'vitest'
import { instalarEntornoGraficas, ANCHO_PRUEBA, ALTO_PRUEBA } from './entornoGraficas'

describe('entornoGraficas', () => {
  let limpiar: (() => void) | undefined
  afterEach(() => limpiar?.())

  it('instala ResizeObserver y un tamaño fijo para jsdom, y lo deshace al limpiar', () => {
    const antes = globalThis.ResizeObserver
    limpiar = instalarEntornoGraficas()
    expect(typeof globalThis.ResizeObserver).toBe('function')
    const caja = document.createElement('div').getBoundingClientRect()
    expect(caja.width).toBe(ANCHO_PRUEBA)
    expect(caja.height).toBe(ALTO_PRUEBA)
    expect(() => new globalThis.ResizeObserver(() => {}).observe(document.body)).not.toThrow()
    limpiar()
    limpiar = undefined
    expect(globalThis.ResizeObserver).toBe(antes)
    expect(document.createElement('div').getBoundingClientRect().width).not.toBe(ANCHO_PRUEBA)
  })
})
