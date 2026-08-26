import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../shared/data/paquetes'
import type { AnyCard } from '../../shared/types'

/** Quita el arte embebido (imageUrl + hasImage). El resto de la carta queda intacto. */
function sinArte(card: AnyCard): AnyCard {
  if (!card.imageUrl && !card.hasImage) return card
  const { imageUrl: _imageUrl, hasImage: _hasImage, ...datos } = card
  void _imageUrl
  void _hasImage
  return datos as AnyCard
}

/**
 * Genera el JSON actualizado de todas las cartas desde paquetes.ts.
 * El usuario puede importar este JSON en el Card Maker.
 * Las imágenes se mantienen en IndexedDB (asociadas por cardId).
 */
export function generarJSONActualizado(): void {
  const todasLasCartas: AnyCard[] = [...ESTASIS_CARDS, ...DISONANCIA_CARDS]
  const json = JSON.stringify(todasLasCartas, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'Coleccion-EstasisDisonancia.json'
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta cartas actuales del Card Maker SIN arte (solo metadata).
 * Útil para compartir/editar cartas sin peso de imágenes.
 */
export function exportarSinArte(cards: AnyCard[], nombreArchivo = 'cartas-sin-arte'): void {
  const exportadas = cards.map(sinArte)
  const json = JSON.stringify(exportadas, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const nombreLimpio = nombreArchivo.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '') || 'cartas-sin-arte'
  link.download = `${nombreLimpio}.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
