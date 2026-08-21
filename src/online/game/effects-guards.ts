/**
 * Guards de resolución de efectos (perfeccionamiento-tablero):
 * registro declarativo de requisitos por cardId, consumido por
 * generarAccionesForja y validadores para bloquear activaciones
 * cuyo efecto no puede resolverse con el estado actual.
 *
 * Arcana conditions (§5.4): antes de activar una Arcana con `condicion`,
 * se verifica que la condición se cumpla en el estado actual.
 */
import type { GameState, PlayerId } from './types'

export type RequisitoFn = (s: GameState, jugador: PlayerId) => string | null

const requisitos = new Map<string, RequisitoFn>()

export function registrarRequisito(cardId: string, fn: RequisitoFn): void {
  requisitos.set(cardId, fn)
}

/** Devuelve null si el efecto puede resolverse, o un string de error si no. */
export function validarRequisito(s: GameState, jugador: PlayerId, cardId: string): string | null {
  const fn = requisitos.get(cardId)
  return fn ? fn(s, jugador) : null
}

/** Cuenta campeones en campo que tienen ≥1 Éter bloqueado. */
function campeonesConEterBloqueado(s: GameState, jugador: PlayerId): number {
  return s.players[jugador].campo.campeones.filter((id): id is string => {
    if (id === null) return false
    const inst = s.instances[id]
    return !!inst && (inst.eterBloqueado?.length ?? 0) > 0
  }).length
}

/** Cuenta campeones en campo del jugador. */
function campeonesEnCampo(s: GameState, jugador: PlayerId): number {
  return s.players[jugador].campo.campeones.filter((id): id is string => id !== null).length
}

/** Registra los guards de condiciones de Arcanas (§5.4). */
export function registrarGuardsArcanas(): void {
  // FB-023 El Reino Perdido: "Al inicio del Choque, si controlas 2 o más Campeones con Éter bloqueado."
  registrarRequisito('FB-023', (s, jugador) => {
    const count = campeonesConEterBloqueado(s, jugador)
    if (count < 2) return 'se requieren 2 o más Campeones con Éter bloqueado'
    return null
  })

  // DS-024 Golpe del Nudo: "Mientras controles 2 o más Campeones."
  registrarRequisito('DS-024', (s, jugador) => {
    const count = campeonesEnCampo(s, jugador)
    if (count < 2) return 'se requieren 2 o más Campeones en campo'
    return null
  })

  // DS-032 El Nudo Desata: "Al inicio del Choque, si el rival controla 2 o más Campeones con Éter bloqueado."
  registrarRequisito('DS-032', (s, jugador) => {
    const rival = jugador === 'A' ? 'B' : 'A'
    const count = campeonesConEterBloqueado(s, rival)
    if (count < 2) return 'el rival no tiene 2 o más Campeones con Éter bloqueado'
    return null
  })

  // DS-033: "Al inicio del Choque, si controlas 2 o más Campeones con Éter bloqueado."
  registrarRequisito('DS-033', (s, jugador) => {
    const count = campeonesConEterBloqueado(s, jugador)
    if (count < 2) return 'se requieren 2 o más Campeones con Éter bloqueado'
    return null
  })
}
