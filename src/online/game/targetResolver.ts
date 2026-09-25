/**
 * Target Resolution System
 *
 * Resolves targets from ObjetivoEfecto structure. Handles all target types,
 * controllers, zones, and filters defined in the structured effect system.
 */
import { getCardMeta, esCampeon, esMistica, esArcana, esEter } from './cards'
import type { AnyCard } from '../../shared/types'
import type { GameState, PlayerId } from './types'
import type { ObjetivoEfecto, FiltroObjetivo } from '../../shared/types/cards'

/**
 * Resolve targets from ObjetivoEfecto structure.
 * Returns valid target IDs based on tipo, controlador, zona, and filtros.
 */
export function resolveTargets(
  s: GameState,
  objetivo: ObjetivoEfecto,
  jugador: PlayerId,
): string[] {
  const { tipo, controlador, zona, filtros } = objetivo

  // 1. Get base targets by zone and controller
  const baseTargets = getTargetsByZone(s, tipo, zona, controlador, jugador)

  // 2. Apply filters
  const filtered = applyFilters(s, baseTargets, filtros)

  // 3. Handle ranking selection
  if (filtros?.seleccionar) {
    return selectByRanking(s, filtered, filtros.seleccionar)
  }

  return filtered
}

/**
 * Get targets by zone and controller.
 */
function getTargetsByZone(
  s: GameState,
  tipo: ObjetivoEfecto['tipo'],
  zona: ObjetivoEfecto['zona'],
  controlador: ObjetivoEfecto['controlador'],
  jugador: PlayerId,
): string[] {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  // Determine which players to check based on controller
  const playersToCheck: PlayerId[] =
    controlador === 'ambos' ? ['A', 'B'] :
    controlador === 'rival' ? [rival] :
    controlador === 'ninguno' ? [] :
    [jugador] // 'propio'

  // Special case: self
  if (tipo === 'self') {
    // Self is always the card itself — caller must handle
    return []
  }

  // Special case: todos_campeones_propios/rivales
  if (tipo === 'todos_campeones_propios') {
    return s.players[jugador].campo.campeones.filter((id): id is string => id !== null)
  }
  if (tipo === 'todos_campeones_rivales') {
    return s.players[rival].campo.campeones.filter((id): id is string => id !== null)
  }

  // Special case: equipped_champion
  if (tipo === 'equipped_champion') {
    // Find champions that have equipment
    const allChampions = [
      ...s.players.A.campo.campeones,
      ...s.players.B.campo.campeones,
    ].filter((id): id is string => id !== null)

    return allChampions.filter((id) => {
      const inst = s.instances[id]
      return inst?.equipadoA !== undefined
    })
  }

  // Special case: rival_hand
  if (tipo === 'rival_hand') {
    return [rival] // Return rival player ID as special target
  }

  // Get targets from zone
  const targets: string[] = []

  for (const player of playersToCheck) {
    const p = s.players[player]

    switch (zona) {
      case 'campo': {
        // Champions on field
        if (tipo === 'campeon' || tipo === 'carta' || tipo === 'mano') {
          targets.push(...p.campo.campeones.filter((id): id is string => id !== null))
        }
        // Mystics on field
        if (tipo === 'mistica' || tipo === 'mistica_arcana' || tipo === 'carta') {
          targets.push(...p.campo.misticasTacticas.filter((id): id is string => id !== null))
        }
        // Arcanas on field
        if (tipo === 'arcana' || tipo === 'mistica_arcana' || tipo === 'carta') {
          targets.push(...p.campo.arcanasCombate.filter((id): id is string => id !== null))
        }
        break
      }

      case 'cementerio': {
        targets.push(...p.cementerio.filter((id): id is string => id !== null))
        break
      }

      case 'exilio': {
        targets.push(...p.exilio.filter((id): id is string => id !== null))
        break
      }

      case 'reserva': {
        // Ether in reserve
        if (tipo === 'eter') {
          targets.push(...p.eterReserva.filter((id): id is string => id !== null))
        }
        break
      }

      case 'pagado': {
        // Ether in paid zone
        if (tipo === 'eter') {
          targets.push(...p.eterPagado.filter((id): id is string => id !== null))
        }
        break
      }

      case 'bloqueado': {
        // Ether blocked on champions
        if (tipo === 'eter') {
          for (const champId of p.campo.campeones) {
            if (champId === null) continue
            const inst = s.instances[champId]
            if (inst?.eterBloqueado) {
              targets.push(...inst.eterBloqueado)
            }
          }
        }
        break
      }

      case 'mano': {
        targets.push(...p.mano.filter((id): id is string => id !== null))
        break
      }

      case 'mazo': {
        // For tutor effects — return card IDs from deck
        targets.push(...p.mazo.filter((id): id is string => id !== null))
        break
      }
    }
  }

  return targets
}

/**
 * Apply filters to target list.
 */
function applyFilters(
  s: GameState,
  targets: string[],
  filtros?: FiltroObjetivo,
): string[] {
  if (!filtros || Object.keys(filtros).length === 0) return targets

  return targets.filter((id) => {
    const inst = s.instances[id]
    if (!inst) return false
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) return false

    // Faction filter
    if (filtros.faccion) {
      const card = meta as AnyCard
      if ('facciones' in card && !card.facciones?.includes(filtros.faccion)) {
        return false
      }
    }

    // Essence filter
    if (filtros.esencia) {
      const card = meta as AnyCard
      if ('esencia' in card && card.esencia !== filtros.esencia) {
        return false
      }
    }

    // Role filter
    if (filtros.rol) {
      const card = meta as AnyCard
      if ('roles' in card && !card.roles?.includes(filtros.rol)) {
        return false
      }
    }

    // Cost filters
    if (filtros.costeMin !== undefined) {
      if (!meta.stats || meta.stats.cost < filtros.costeMin) return false
    }
    if (filtros.costeMax !== undefined) {
      if (!meta.stats || meta.stats.cost > filtros.costeMax) return false
    }

    // ATQ/RES filters (for champions)
    if (esCampeon(meta)) {
      if (filtros.atqMax !== undefined) {
        if (!meta.stats || meta.stats.poder > filtros.atqMax) return false
      }
      if (filtros.resMax !== undefined) {
        if (!meta.stats || meta.stats.resistencia > filtros.resMax) return false
      }
    }

    // Exhausted filter
    if (filtros.agotado !== undefined) {
      if (inst.agotado !== filtros.agotado) return false
    }

    // Has blocked ether filter
    if (filtros.conEterBloqueado !== undefined) {
      const hasBlocked = (inst.eterBloqueado?.length ?? 0) > 0
      if (hasBlocked !== filtros.conEterBloqueado) return false
    }

    // Can receive blocked ether filter
    if (filtros.puedeBloquearEter !== undefined) {
      // Champions can receive blocked ether by default
      if (!esCampeon(meta)) return false
    }

    // Equipped filter
    if (filtros.equipado !== undefined) {
      const isEquipped = inst.equipadoA !== undefined
      if (isEquipped !== filtros.equipado) return false
    }

    // Keyword filter
    if (filtros.keyword) {
      const keywords = meta.keywords ?? []
      if (!keywords.includes(filtros.keyword)) return false
    }

    // Ability category filter
    if (filtros.catHabilidad) {
      const card = meta as AnyCard
      if ('catHabilidad' in card && !card.catHabilidad?.includes(filtros.catHabilidad)) {
        return false
      }
    }

    return true
  })
}

/**
 * Select targets by ranking (e.g., highest ATQ, lowest RES).
 */
function selectByRanking(
  s: GameState,
  targets: string[],
  seleccionar: { stat: 'poder' | 'resistencia' | 'coste'; orden: 'mayor' | 'menor' },
): string[] {
  if (targets.length === 0) return []

  // Sort targets by stat
  const sorted = [...targets].sort((a, b) => {
    const metaA = s.instances[a]?.cardId ? getCardMeta(s.instances[a]!.cardId!) : null
    const metaB = s.instances[b]?.cardId ? getCardMeta(s.instances[b]!.cardId!) : null

    let valueA = 0
    let valueB = 0

    if (seleccionar.stat === 'coste') {
      valueA = metaA?.stats?.cost ?? 0
      valueB = metaB?.stats?.cost ?? 0
    } else if (esCampeon(metaA) && esCampeon(metaB)) {
      valueA = seleccionar.stat === 'poder' ? (metaA.stats?.poder ?? 0) : (metaA.stats?.resistencia ?? 0)
      valueB = seleccionar.stat === 'poder' ? (metaB.stats?.poder ?? 0) : (metaB.stats?.resistencia ?? 0)
    }

    return seleccionar.orden === 'mayor' ? valueB - valueA : valueA - valueB
  })

  // Return top target
  return [sorted[0]]
}