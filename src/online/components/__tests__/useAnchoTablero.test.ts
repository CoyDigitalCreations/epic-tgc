import { describe, expect, it } from 'vitest'
import { calcularAnchoCarta, esViewportCompacto } from '../useAnchoTablero'

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

describe('modo compacto (celular / tablet en horizontal)', () => {
  it('el escritorio NO es compacto: portátiles, monitores y ventanas bajas razonables', () => {
    for (const [ancho, alto] of [[1440, 900], [1920, 1080], [1366, 657], [1280, 720], [1180, 820], [1100, 600]]) {
      expect(esViewportCompacto(ancho, alto), `${ancho}×${alto}`).toBe(false)
    }
  })

  it('celulares y tablets en horizontal SÍ son compactos', () => {
    for (const [ancho, alto] of [[667, 375], [740, 360], [844, 390], [932, 430], [960, 600], [1024, 768], [1099, 900], [1366, 599]]) {
      expect(esViewportCompacto(ancho, alto), `${ancho}×${alto}`).toBe(true)
    }
  })

  it('sin la bandera compacto el cálculo es EXACTAMENTE el del escritorio', () => {
    for (const [ancho, alto] of [[1085, 715], [1565, 874], [700, 2000], [3000, 600], [100, 100]]) {
      expect(calcularAnchoCarta(ancho, alto, false)).toBe(calcularAnchoCarta(ancho, alto))
    }
  })

  it('iPhone 14 horizontal (mesa ~836×295): la carta queda en 29 px (limita el alto)', () => {
    // ((295 - 38) / 2 - 22) / 3.655 ≈ 29.1; el ancho permitiría (836 - 148) / 11.05 ≈ 62
    expect(calcularAnchoCarta(836, 295, true)).toBe(29)
  })

  it('iPhone SE horizontal (mesa ~659×282): la carta queda en 27 px', () => {
    expect(calcularAnchoCarta(659, 282, true)).toBe(27)
  })

  it('tablet 1024×768 (mesa ~1016×632): la carta sube a 75 px frente a ~43 px con el lateral fijo', () => {
    expect(calcularAnchoCarta(1016, 632, true)).toBe(75)
    expect(calcularAnchoCarta(1016, 632, true)).toBeGreaterThan(calcularAnchoCarta(1016 - 320 - 12, 632))
  })

  it('en compacto se acota entre 24 y 130 px', () => {
    expect(calcularAnchoCarta(100, 100, true)).toBe(24)
    expect(calcularAnchoCarta(5000, 5000, true)).toBe(130)
  })
})
