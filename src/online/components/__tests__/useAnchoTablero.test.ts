import { describe, expect, it } from 'vitest'
import { calcularAnchoCarta } from '../useAnchoTablero'

describe('calcularAnchoCarta', () => {
  it('portátil 1440×900: la mesa mide ~1085×715 y la carta queda en 75 px (limita el ancho)', () => {
    // alto permitiría 83 px; el ancho (7 columnas + Vínculos + panel lateral) permite (1085-104)/12.95 ≈ 75
    expect(calcularAnchoCarta(1085, 715)).toBe(75)
  })

  it('pantalla 1920×1080: la mesa mide ~1565×874 y la carta crece a 105 px (limita el alto)', () => {
    expect(calcularAnchoCarta(1565, 874)).toBe(105)
  })

  it('con una mesa angosta limita el ANCHO', () => {
    // (700 - 104) / 12.946 ≈ 46: el alto sobraría
    expect(calcularAnchoCarta(700, 2000)).toBe(46)
  })

  it('con una mesa baja limita el ALTO', () => {
    // ((600 - 66) / 2 - 20) / 3.655 ≈ 67.6: el ancho sobraría
    expect(calcularAnchoCarta(3000, 600)).toBe(67)
  })

  it('más espacio nunca achica la carta', () => {
    let anterior = 0
    for (let alto = 500; alto <= 1200; alto += 50) {
      const ancho = calcularAnchoCarta(1600, alto)
      expect(ancho).toBeGreaterThanOrEqual(anterior)
      anterior = ancho
    }
  })

  it('se acota entre 40 y 130 px', () => {
    expect(calcularAnchoCarta(100, 100)).toBe(40)
    expect(calcularAnchoCarta(5000, 5000)).toBe(130)
  })
})
