import type { AnyCard } from '../types'

export function exportCollectionToJson(cards: AnyCard[]): void {
  const json = JSON.stringify(cards, null, 2)
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
