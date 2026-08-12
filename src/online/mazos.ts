import { ESTASIS_CARDS, DISONANCIA_CARDS, getPaquete } from '../shared/data/paquetes'
import type { AnyCard } from '../shared/types'
import { getCardMeta } from './game/cards'

/** Expande diseños a copias según limiteCopias (mazo jugable de 61 cardIds). */
function expandirMazo(cards: AnyCard[]): string[] {
  return cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))
}

export interface MazoJugable {
  id: 'estasis' | 'disonancia'
  nombre: string
  color: string
  /** 61 cardIds (15 Éter + 40 Principal + 6 Vínculos) — listo para createInitialState. */
  cardIds: string[]
}

/** Mazos disponibles para el modo vs bot. El humano elige uno; el bot usa el otro. */
export const MAZOS: MazoJugable[] = [
  {
    id: 'estasis',
    nombre: getPaquete('estasis')?.nombre ?? 'Estásis',
    color: getPaquete('estasis')?.color ?? '#e5e7eb',
    cardIds: expandirMazo(ESTASIS_CARDS),
  },
  {
    id: 'disonancia',
    nombre: getPaquete('disonancia')?.nombre ?? 'Disonancia',
    color: getPaquete('disonancia')?.color ?? '#3b82f6',
    cardIds: expandirMazo(DISONANCIA_CARDS),
  },
]

export const mazoPorId = (id: string): MazoJugable | undefined => MAZOS.find((m) => m.id === id)

/* ─────────────────────────────────────────────
   Mazos con la colección de la forja.

   La colección guarda cartas creadas/importadas en Éter Forge con el MISMO
   nombre que el diseño del paquete (el usuario las rediseña y exporta con el
   mismo nombre). Armar el mazo desde la colección reemplaza cada diseño por
   su versión personalizada (match case-insensitive por nombre y MISMO type:
   solo se reemplaza 1:1, la distribución 15/40/6 del paquete se conserva).
   ───────────────────────────────────────────── */

export interface MazoConColeccion {
  mazo: MazoJugable
  /** Cuántas cartas del mazo fueron reemplazadas por versiones de la colección. */
  reemplazadas: number
}

/** Índice nombre→carta de la colección, para match por nombre + type. */
function indiceColeccion(coleccion: AnyCard[]): Map<string, AnyCard> {
  const idx = new Map<string, AnyCard>()
  for (const c of coleccion) {
    if (!c?.name) continue
    const clave = c.name.trim().toLowerCase()
    if (!idx.has(clave)) idx.set(clave, c)
  }
  return idx
}

/**
 * Arma el mazo del paquete reemplazando cada diseño por su versión de la
 * colección (si existe con el mismo nombre y type). Los ids custom se usan
 * tal cual: el catálogo debe tenerlas registradas (registrarCartas) para que
 * getCardMeta las resuelva durante la partida.
 */
export function armarMazoConColeccion(
  paquete: MazoJugable,
  coleccion: AnyCard[],
): MazoConColeccion {
  const porNombre = indiceColeccion(coleccion)
  let reemplazadas = 0
  const cardIds = paquete.cardIds.map((id) => {
    const meta = getCardMeta(id)
    if (!meta) return id
    const custom = porNombre.get(meta.name.trim().toLowerCase())
    if (custom && custom.type === meta.type) {
      reemplazadas += 1
      return custom.id
    }
    return id
  })
  return { mazo: { ...paquete, cardIds }, reemplazadas }
}
