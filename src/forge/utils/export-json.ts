import type { AnyCard } from '../../shared/types'
import { getCardImage } from './image-store'

export async function exportCollectionToJson(cards: AnyCard[]): Promise<void> {
  // Images live in IndexedDB, not in the persisted cards — embed them back
  // into the exported JSON so a backup keeps the art. Cards with a static
  // path (/cartas/*.png) keep their path as-is: the art is versioned in
  // public/ and the path stays valid everywhere.
  const exported = await Promise.all(
    cards.map(async (card) => {
      if (!card.hasImage) return card
      const dataUrl = await getCardImage(card.id)
      return dataUrl ? { ...card, imageUrl: dataUrl } : card
    }),
  )
  const json = JSON.stringify(exported, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `coleccion-eter.json`
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
