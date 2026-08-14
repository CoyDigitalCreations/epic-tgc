import type { AnyCard, Paquete } from '../../shared/types'
import { conArteEmbebido } from './export-json'

/** Formato de export/import de un paquete personalizado. */
export interface PaqueteExport {
  paquete: Paquete
  cards: AnyCard[]
}

/**
 * Serializa un paquete para exportar: filtra las cartas de la colección
 * que tienen ese paqueteId y re-embebe el arte (IndexedDB) como data URL.
 */
export async function serializePaquete(
  paquete: Paquete,
  cards: AnyCard[],
): Promise<PaqueteExport> {
  const cartasDelPaquete = cards.filter((c) => c.paqueteId === paquete.id)
  return { paquete, cards: await conArteEmbebido(cartasDelPaquete) }
}

/** Descarga el paquete como JSON: { paquete, cards } con el arte embebido. */
export async function exportPaqueteToJson(
  paquete: Paquete,
  cards: AnyCard[],
): Promise<void> {
  const data = await serializePaquete(paquete, cards)
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${paquete.id}.paquete.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Lee un JSON de paquete exportado. Valida el shape:
 * `{ paquete: { id, nombre, ... }, cards: AnyCard[] }`.
 */
export function importPaqueteFromJson(file: File): Promise<PaqueteExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const paquete = data?.paquete
        if (
          !paquete ||
          typeof paquete.id !== 'string' ||
          typeof paquete.nombre !== 'string' ||
          !Array.isArray(data.cards)
        ) {
          reject(
            new Error('JSON de paquete inválido: se esperaba { paquete, cards }'),
          )
          return
        }
        resolve(data as PaqueteExport)
      } catch {
        reject(new Error('Archivo JSON inválido'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}
