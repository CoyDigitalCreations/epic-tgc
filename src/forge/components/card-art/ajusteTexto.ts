/**
 * Ajuste de texto del pergamino de la carta: devuelve el mayor tamaño de fuente (px) con el que
 * `textos` caben en un cuadro de `ancho × alto`. Es una ESTIMACIÓN determinista (sin medir el DOM):
 * así RenderCarta sigue siendo un render puro y el PNG exportado sale igual en cualquier navegador.
 *
 * Modelo: ancho medio de carácter ≈ `anchoChar × fuente` (Inter 500 ≈ 0.52), con un margen por el
 * corte de palabras; cada párrafo ocupa ceil(líneas) × interlineado, más la separación entre párrafos.
 */
export interface OpcionesAjuste {
  min: number
  max: number
  /** Interlineado (múltiplo del tamaño de fuente). */
  interlineado?: number
  /** Separación vertical entre párrafos, en px. */
  separacion?: number
  /** Ancho medio de un carácter como fracción del tamaño de fuente. */
  anchoChar?: number
}

export function lineasEstimadas(texto: string, fuente: number, ancho: number, anchoChar = 0.52): number {
  const porLinea = Math.max(1, Math.floor(ancho / (fuente * anchoChar * 1.06)))
  return Math.max(1, Math.ceil(texto.length / porLinea))
}

export function tamanoQueEntra(textos: string[], ancho: number, alto: number, opciones: OpcionesAjuste): number {
  const { min, max, interlineado = 1.32, separacion = 8, anchoChar = 0.52 } = opciones
  if (textos.length === 0) return max
  for (let fuente = max; fuente > min; fuente -= 0.5) {
    const lineas = textos.reduce((suma, t) => suma + lineasEstimadas(t, fuente, ancho, anchoChar), 0)
    const altoTotal = lineas * fuente * interlineado + (textos.length - 1) * separacion
    if (altoTotal <= alto) return fuente
  }
  return min
}
