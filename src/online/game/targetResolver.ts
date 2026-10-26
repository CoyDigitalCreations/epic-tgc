/**
 * Target Resolution System
 *
 * Resolves targets from ObjetivoEfecto structure. Handles all target types,
 * controllers, zones, and filters defined in the structured effect system.
 */
import { getCardMeta, esCampeon, esMistica, esArcana } from './cards'
import { statsDe } from './efectos'
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
  fuenteId?: string,
): string[] {
  const { tipo, controlador, zona, filtros } = objetivo

  // 1. Get base targets by zone and controller
  const baseTargets = getTargetsByZone(s, tipo, zona, controlador, jugador, fuenteId)

  // Protector rule (D3): if rival has a Protector, only Protectors are valid targets
  // for enemy champion targeting effects
  if (controlador === 'rival' && tipo === 'campeon' && zona === 'campo') {
    const rival: PlayerId = jugador === 'A' ? 'B' : 'A'
    const rivalChamps = s.players[rival].campo.campeones.filter((id): id is string => id !== null)
    const hasProtector = rivalChamps.some((id) => {
      const inst = s.instances[id]
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
      return meta !== null && esCampeon(meta) && meta.keywords?.includes('Protector')
    })
    if (hasProtector) {
      return rivalChamps.filter((id) => {
        const inst = s.instances[id]
        const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
        return meta !== null && esCampeon(meta) && meta.keywords?.includes('Protector')
      })
    }
  }

  // 2. Apply filters
  const filtered = applyFilters(s, baseTargets, filtros)

  // 3. Handle ranking selection
  if (filtros?.seleccionar) {
    return selectByRanking(s, filtered, filtros.seleccionar)
  }

  return filtered
}

/**
 * ¿La carta es del tipo que pide el objetivo? Zonas fuera del campo (Cementerio, Exilio, mano, mazo): ahí el campo
 * donde vive la carta no dice su tipo, así que se mira la carta. `carta` y `mano` aceptan cualquiera.
 */
function coincideTipo(s: GameState, id: string, tipo: ObjetivoEfecto['tipo']): boolean {
  if (tipo === 'carta' || tipo === 'mano') return true
  const cardId = s.instances[id]?.cardId
  const meta = cardId ? getCardMeta(cardId) : null
  if (!meta) return false
  if (tipo === 'campeon') return esCampeon(meta)
  if (tipo === 'mistica') return esMistica(meta)
  if (tipo === 'arcana') return esArcana(meta)
  if (tipo === 'mistica_arcana') return esMistica(meta) || esArcana(meta)
  if (tipo === 'eter') return meta.type === 'Éter'
  return true
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
  fuenteId?: string,
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

  // Special case: equipped_champion — el Campeón al que está equipado el Artefacto FUENTE
  // (`equipadoA` vive en el Artefacto y apunta al Campeón); sin fuente o sin equipar no hay objetivo
  if (tipo === 'equipped_champion') {
    const equipadoA = fuenteId ? s.instances[fuenteId]?.equipadoA : undefined
    if (!equipadoA) return []
    const enCampo = [...s.players.A.campo.campeones, ...s.players.B.campo.campeones].includes(equipadoA)
    return enCampo ? [equipadoA] : []
  }

  // Special case: rival_hand
  if (tipo === 'rival_hand') {
    return [rival] // Return rival player ID as special target
  }

  // B2 (obs 1860 — doctrina Capa 2): VÍNCULOS (4A-4F) — viven en p.vinculos,
  // no en campo; solo los VIVOS (boca abajo) son objetivo (los destruidos
  // están bocaArriba y ya resolvieron su efecto). 'destruye 1 Vínculo' etc.
  // resuelven aquí → destruirCarta ejecuta la destrucción del Vínculo (§5.5).
  if (tipo === 'vinculo') {
    const res: string[] = []
    for (const player of playersToCheck) {
      res.push(
        ...s.players[player].vinculos.filter((id): id is string => {
          if (!id) return false
          const v = s.instances[id]
          return !!v && v.bocaArriba !== true
        }),
      )
    }
    return res
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
        targets.push(...p.cementerio.filter((id): id is string => id !== null && coincideTipo(s, id, tipo)))
        break
      }

      case 'exilio': {
        targets.push(...p.exilio.filter((id): id is string => id !== null && coincideTipo(s, id, tipo)))
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
        targets.push(...p.mano.filter((id): id is string => id !== null && coincideTipo(s, id, tipo)))
        break
      }

      case 'mazo': {
        // For tutor effects — return card IDs from deck, filtered by tipo
        targets.push(...p.mazo.filter((id): id is string => id !== null && coincideTipo(s, id, tipo)))
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

    // ATQ/RES filters (for champions). Dos lecturas, ambas explícitas en la carta:
    //  - atqMax / resMax: el valor ORIGINAL (impreso en la carta, sin buffs ni debuffs).
    //  - atqActualMax / resActualMax: el valor ACTUAL (statsDe: con buffs, debuffs y auras).
    if (esCampeon(meta)) {
      if (filtros.atqMax !== undefined) {
        if (!meta.stats || meta.stats.poder > filtros.atqMax) return false
      }
      if (filtros.resMax !== undefined) {
        if (!meta.stats || meta.stats.resistencia > filtros.resMax) return false
      }
      if (filtros.atqMin !== undefined) {
        if (!meta.stats || meta.stats.poder < filtros.atqMin) return false
      }
      if (filtros.resMin !== undefined) {
        if (!meta.stats || meta.stats.resistencia < filtros.resMin) return false
      }
      if (filtros.atqActualMax !== undefined && statsDe(s, id).poder > filtros.atqActualMax) return false
      if (filtros.resActualMax !== undefined && statsDe(s, id).resistencia > filtros.resActualMax) return false
      if (filtros.atqActualMin !== undefined && statsDe(s, id).poder < filtros.atqActualMin) return false
      if (filtros.resActualMin !== undefined && statsDe(s, id).resistencia < filtros.resActualMin) return false
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
      const keywords = (meta.keywords ?? []) as string[]
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
  seleccionar: { stat: 'poder' | 'resistencia' | 'coste'; orden: 'mayor' | 'menor'; valor?: 'original' | 'actual' },
): string[] {
  const actual = seleccionar.valor === 'actual'
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
    } else if (metaA && metaB && esCampeon(metaA) && esCampeon(metaB)) {
      // original = impreso en la carta; actual = statsDe (buffs, debuffs y auras)
      const valorDe = (id: string, meta: typeof metaA): number => {
        if (actual) return seleccionar.stat === 'poder' ? statsDe(s, id).poder : statsDe(s, id).resistencia
        return (seleccionar.stat === 'poder' ? meta.stats?.poder : meta.stats?.resistencia) ?? 0
      }
      valueA = valorDe(a, metaA)
      valueB = valorDe(b, metaB)
    }

    return seleccionar.orden === 'mayor' ? valueB - valueA : valueA - valueB
  })

  // Return top target
  return [sorted[0]]
}