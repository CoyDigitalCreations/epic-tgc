import type { CardInstance, GameState, PlayerId } from '../game'
import type { Zona } from '../game/types'

/**
 * Detección de movimientos de cartas por DIFF de dos vistas (FLIP: First/Last).
 *
 * No depende de los eventos del motor: robar emite solo `carta_robada` y varias
 * rutas (muerte en combate, efectos) no emiten el par salida/entrada. Comparar
 * dónde estaba cada instancia contra dónde está ahora cubre TODOS los casos,
 * incluso movimientos que se agreguen mañana al motor, y funciona igual con
 * snapshots (online). Opera sobre la VISTA (visibleState): las cartas ocultas
 * llegan con cardId null, así que la animación nunca filtra información.
 */

/** Zona de partida + 'bloqueado' (Éter sobre una carta, 1B-1F / 3A-3F). */
export type ZonaMov = Zona | 'bloqueado'

export interface Ubicacion {
  jugador: PlayerId
  zona: ZonaMov
  /** Solo 'bloqueado': la carta (Campeón, Artefacto) que sostiene el Éter. */
  sobre?: string
}

export interface Movimiento {
  cardInstanceId: string
  /** Ubicación anterior (null si la instancia no existía en la vista previa). */
  de: Ubicacion | null
  a: Ubicacion
}

/** Si un diff trae más movimientos que esto es un reseteo (mulligan…), no se anima. */
export const MAX_MOVIMIENTOS = 8

/**
 * Con destino en la Reserva (2A) NO hay vuelo: reagrupar en el Alba mueve hasta 15 Éteres y
 * devolver/liberar vuelve uno a uno. Eso se resuelve con un pulso en la Reserva (usePartida),
 * no con cartas volando. Pagar (→ 1A) y bloquear (→ carta) sí vuelan.
 */
const DESTINOS_SIN_VUELO: ReadonlySet<ZonaMov> = new Set<ZonaMov>(['2A'])

/** Cómo se dibuja el viaje de una carta (cada estilo es una variante del mismo fantasma). */
export type EstiloVuelo = 'normal' | 'eter' | 'destruccion' | 'exilio'

const ZONA_DE_CAMPO = /^(2[B-F]|3[A-F]|4[A-F])$/

/**
 * - exilio: cualquier carta que termina en 1G (se desvanece en el vacío).
 * - destruccion: del campo al cementerio (sacudón, destello y caída). Descartar de la mano o
 *   moler el mazo NO son destrucciones: vuelan normal.
 * - eter: Reserva, pago y bloqueo (vuelo corto, sin giro).
 */
export function estiloDe(mov: Movimiento): EstiloVuelo {
  if (mov.a.zona === '1G') return 'exilio'
  if (mov.a.zona === '2G' && mov.de && ZONA_DE_CAMPO.test(mov.de.zona)) return 'destruccion'
  const zonas = [mov.de?.zona, mov.a.zona]
  if (zonas.some((z) => z === '2A' || z === '1A' || z === 'bloqueado')) return 'eter'
  return 'normal'
}

/** Mapa instancia → ubicación actual para TODAS las cartas con zona conocida. */
export function ubicaciones(s: GameState): Map<string, Ubicacion> {
  const mapa = new Map<string, Ubicacion>()
  for (const jugador of ['A', 'B'] as PlayerId[]) {
    const p = s.players[jugador]
    const poner = (ids: readonly (string | null)[], zona: (i: number) => ZonaMov) => {
      ids.forEach((id, i) => {
        if (id) mapa.set(id, { jugador, zona: zona(i) })
      })
    }
    const letra = (base: string, i: number) => String.fromCharCode(base.charCodeAt(0) + i)
    poner(p.mano, () => 'mano')
    poner(p.mazo, () => '3G')
    poner(p.cementerio, () => '2G')
    poner(p.exilio, () => '1G')
    poner(p.eterReserva, () => '2A')
    poner(p.eterPagado, () => '1A')
    poner(p.campo.campeones, (i) => `2${letra('B', i)}` as ZonaMov)
    poner(p.campo.misticasTacticas, (i) => `3${letra('A', i)}` as ZonaMov)
    poner(p.campo.arcanasCombate, (i) => `3${letra('D', i)}` as ZonaMov)
    poner(p.vinculos, (i) => `4${letra('A', i)}` as ZonaMov)
  }
  // Éter bloqueado: vive en la instancia que lo sostiene
  for (const inst of Object.values(s.instances)) {
    for (const id of inst.eterBloqueado ?? []) {
      mapa.set(id, { jugador: s.instances[id]?.owner ?? inst.owner, zona: 'bloqueado', sobre: inst.cardInstanceId })
    }
  }
  return mapa
}

/** Cartas que cambiaron de zona entre `prev` y `next` (sin los Éteres que vuelven a la Reserva). */
export function diffMovimientos(prev: GameState, next: GameState): Movimiento[] {
  const antes = ubicaciones(prev)
  const despues = ubicaciones(next)
  const movimientos: Movimiento[] = []
  for (const [cardInstanceId, a] of despues) {
    const de = antes.get(cardInstanceId) ?? null
    if (de && de.jugador === a.jugador && de.zona === a.zona && de.sobre === a.sobre) continue
    if (DESTINOS_SIN_VUELO.has(a.zona)) continue
    movimientos.push({ cardInstanceId, de, a })
  }
  return movimientos
}

/**
 * ¿La carta se ve de FRENTE en esa zona, desde la vista de quien mira?
 * cardId null = oculta (dorso). Arcanas (3D-3F) y Vínculos (4A-4F) propios
 * están boca abajo hasta que `bocaArriba`, aunque su dueño conozca el cardId.
 */
export function mostrandoFrente(inst: CardInstance | undefined, zona: ZonaMov): boolean {
  if (!inst || inst.cardId === null) return false
  const bocaAbajoPorZona = (zona[0] === '3' && 'DEF'.includes(zona[1] ?? '')) || zona[0] === '4'
  return bocaAbajoPorZona ? inst.bocaArriba === true : true
}
