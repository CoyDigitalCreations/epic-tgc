import { describe, expect, it } from 'vitest'
import {
  ESCALA_FILA_ETER,
  RELACION_CARTA,
  RESERVA_ETIQUETA_CAMPEON,
  calcularAnchoCarta,
  esViewportCompacto,
} from '../useAnchoTablero'

describe('calcularAnchoCarta', () => {
  it('portátil 1440×900: la mesa mide ~1085×715 y la carta queda en 74 px (limita el ancho)', () => {
    // alto permitiría ((715-56)/2-54)/3.655 ≈ 75; el ancho (7 columnas + Vínculos + panel lateral + aire) permite (1085-116)/12.95 ≈ 74
    expect(calcularAnchoCarta(1085, 715)).toBe(74)
  })

  it('pantalla 1920×1080: la mesa mide ~1565×874 y la carta crece a 97 px (limita el alto)', () => {
    expect(calcularAnchoCarta(1565, 874)).toBe(97)
  })

  it('con una mesa angosta limita el ANCHO', () => {
    // (700 - 116) / 12.946 ≈ 45.1: el alto sobraría
    expect(calcularAnchoCarta(700, 2000)).toBe(45)
  })

  it('con una mesa baja limita el ALTO', () => {
    // ((600 - 56) / 2 - 54) / 3.655 ≈ 59.6: el ancho sobraría
    expect(calcularAnchoCarta(3000, 600)).toBe(59)
  })

  it('más espacio nunca achica la carta', () => {
    let anterior = 0
    for (let alto = 500; alto <= 1200; alto += 50) {
      const ancho = calcularAnchoCarta(1600, alto)
      expect(ancho).toBeGreaterThanOrEqual(anterior)
      anterior = ancho
    }
  })

  it('los dos campos caben dentro del recuadro de la mesa y lo dejan casi sin holgura', () => {
    // Alto real de un tablero: 3 filas + 2 separaciones (12) + padding del recuadro (8) + la etiqueta reservada
    const fijoTablero = 12 + 8 + RESERVA_ETIQUETA_CAMPEON
    // Franja central (44) + padding de la mesa (8) + borde (2)
    const fijoMesa = 44 + 8 + 2
    // Hasta 1000 px de alto la carta no topa con el máximo (130 px), que dejaría holgura de sobra a propósito
    for (let alto = 640; alto <= 1000; alto += 20) {
      const cw = calcularAnchoCarta(1900, alto)
      const tablero = cw * (ESCALA_FILA_ETER + 2) * RELACION_CARTA + fijoTablero
      const holgura = alto - (2 * tablero + fijoMesa)
      expect(holgura, `alto ${alto}`).toBeGreaterThanOrEqual(0)
      // Sobra a lo sumo lo que se pierde al redondear la carta hacia abajo (2 tableros) + la holgura reservada
      expect(holgura, `alto ${alto}`).toBeLessThan(2 * (ESCALA_FILA_ETER + 2) * RELACION_CARTA + 8)
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
