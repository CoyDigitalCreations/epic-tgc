import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../shared/data/paquetes'
import type { AnyCard } from '../../shared/types'

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
