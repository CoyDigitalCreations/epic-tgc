/**
 * Entorno de pruebas para gráficas de Recharts en jsdom.
 *
 * jsdom no implementa `ResizeObserver` y devuelve cajas de 0×0, así que
 * `ResponsiveContainer` no renderiza nada. Este helper simula ambos.
 *
 * Uso:
 *   let limpiar: () => void
 *   beforeEach(() => { limpiar = instalarEntornoGraficas() })
 *   afterEach(() => limpiar())
 *
 * Las pruebas deben aseverar sobre tablas, celdas y labels, no sobre el SVG.
 * Vive fuera de la guardia `sinConstantes` (solo revisa `src/balance/*.ts`).
 */
export const ANCHO_PRUEBA = 800
export const ALTO_PRUEBA = 400

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

export function instalarEntornoGraficas(): () => void {
  const observadorPrevio = globalThis.ResizeObserver
  const cajaPrevia = Element.prototype.getBoundingClientRect

  globalThis.ResizeObserver = ResizeObserverFalso as unknown as typeof ResizeObserver
  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: ANCHO_PRUEBA,
      bottom: ALTO_PRUEBA,
      width: ANCHO_PRUEBA,
      height: ALTO_PRUEBA,
      toJSON: () => ({}),
    } as DOMRect
  }

  return () => {
    globalThis.ResizeObserver = observadorPrevio
    Element.prototype.getBoundingClientRect = cajaPrevia
  }
}
