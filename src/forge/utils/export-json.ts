import type { AnyCard } from '../../shared/types'
import { getCardImage } from './image-store'

/** Re-embebe el arte (IndexedDB) en las cartas para el export (shared con export-paquete). */
export async function conArteEmbebido(cards: AnyCard[]): Promise<AnyCard[]> {
  return Promise.all(
    cards.map(async (card) => {
      if (!card.hasImage) return card
      const dataUrl = await getCardImage(card.id)
      return dataUrl ? { ...card, imageUrl: dataUrl } : card
    }),
  )
}

export async function exportCollectionToJson(
  cards: AnyCard[],
  nombreArchivo = 'coleccion-eter',
): Promise<void> {
  // Images live in IndexedDB, not in the persisted cards — embed them back
  // into the exported JSON so a backup keeps the art. Cards with a static
  // path (/cartas/*.png) keep their path as-is: the art is versioned in
  // public/ and the path stays valid everywhere.
  const exported = await conArteEmbebido(cards)
  const json = JSON.stringify(exported, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const nombreLimpio = nombreArchivo.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '') || 'coleccion-eter'
  link.download = `${nombreLimpio}.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

export function importCollectionFromJson(file: File): Promise<AnyCard[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve(data as AnyCard[])
      } catch {
        reject(new Error('Archivo JSON inválido'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}

/** Quita el arte embebido (imageUrl + hasImage). El resto de la carta queda intacto. */
function sinArte(card: AnyCard): AnyCard {
  if (!card.imageUrl && !card.hasImage) return card
  const { imageUrl: _imageUrl, hasImage: _hasImage, ...datos } = card
  void _imageUrl
  void _hasImage
  return datos as AnyCard
}

/**
 * Importa cartas TERMINADAS: extrae TODO de cada carta menos el arte.
 *
 * El JSON exportado desde Éter Forge embebe el arte como data URL base64
 * (coleccion-eter.json puede pesar MBs). Esta variante descarta imageUrl y
 * hasImage: el arte de las cartas terminadas ya vive en IndexedDB o en las
 * rutas estáticas /cartas/*.png, así que el import queda liviano y los datos
 * (stats, texto, taxonomía) se fusionan sin pisar imágenes existentes.
 */
export function importCardDataFromJson(file: File): Promise<AnyCard[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AnyCard[]
        resolve(data.map(sinArte))
      } catch {
        reject(new Error('Archivo JSON inválido'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
