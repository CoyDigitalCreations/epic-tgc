/**
 * Generic Effect Interpreter
 *
 * Reads EfectoData structure and executes effects in the game engine.
 * Makes the engine data-driven — new cards only need EfectoData definition.
 */
import { getCardMeta, esCampeon } from './cards'
import { resolveTargets } from './targetResolver'
import { aplicarMod, otorgarKeyword } from './efectos'
import { enviarAlCementerio } from './replacements'
import type { AnyCard, EfectoData } from '../../shared/types'
import type { CardInstance, Ctx, GameState, PlayerId } from './types'
import type { PayloadEfecto } from './efectos'

/**
 * Interpret and execute an effect from EfectoData structure.
 */
export function interpretEffect(
  s: GameState,
  ctx: Ctx,
  inst: CardInstance,
  efectoData: EfectoData,
  payload: PayloadEfecto,
): void {
  const { efecto, objetivo, stats, cantidad, keyword, duracion, costo } = efectoData
  const jugador = payload.jugador

  // 1. Validate cost if present
  if (costo && costo.tipo !== 'ninguno') {
    if (!validateCost(s, jugador, costo, inst)) {
      return // Cost not met
    }
  }

  // 2. Resolve targets
  let targetIds: string[] = []
  if (objetivo) {
    if (objetivo.tipo === 'self') {
      targetIds = [inst.cardInstanceId]
    } else {
      targetIds = resolveTargets(s, objetivo, jugador)
    }
  }

  // 3. Execute effect based on efecto type
  switch (efecto) {
    case 'buff':
    case 'debuff':
      executeBuffDebuff(s, targetIds, stats, duracion, efectoData.buffPerBlockedEther, inst)
      break

    case 'destroy':
      executeDestroy(s, ctx, targetIds)
      break

    case 'exile':
      executeExile(s, ctx, targetIds)
      break

    case 'draw':
      executeDraw(s, ctx, jugador, cantidad ?? 1)
      break

    case 'grant_keyword':
      executeGrantKeyword(s, targetIds, keyword, duracion)
      break

    case 'return_hand':
      executeReturnHand(s, ctx, targetIds)
      break

    case 'steal_champion':
      executeStealChampion(s, ctx, targetIds, jugador, inst)
      break

    case 'steal_ether':
      executeStealEther(s, ctx, targetIds, jugador)
      break

    case 'free_ether':
      executeFreeEther(s, ctx, targetIds, jugador)
      break

    case 'return_ether':
      executeReturnEther(s, ctx, targetIds, objetivo?.zonaDestino)
      break

    case 'mover':
      executeMover(s, ctx, targetIds, objetivo?.zonaDestino)
      break

    case 'toggle_exhaust':
      executeToggleExhaust(s, targetIds)
      break

    case 'tutor':
      // Tutor is handled specially — shows options to player
      break

    case 'rival_discard':
      executeRivalDiscard(s, ctx, jugador, cantidad ?? 1)
      break

    case 'double_attack':
      // Double attack is handled by combat system
      break

    case 'block_ether':
      // Block ether is handled by payment system
      break

    case 'negar':
      // Negation is handled by chain system
      break

    case 'copy':
      // Copy is handled by chain system
      break

    // ... other effect types
  }
}

/**
 * Validate if cost is met.
 */
function validateCost(
  s: GameState,
  jugador: PlayerId,
  costo: NonNullable<EfectoData['costo']>,
  inst: CardInstance,
): boolean {
  const p = s.players[jugador]

  switch (costo.tipo) {
    case 'eter':
      // Check if player has enough ether in reserve
      return p.eterReserva.length >= (costo.cantidad ?? 1)

    case 'eter_bloqueado':
      // Check if player has enough blocked ether
      let totalBlocked = 0
      for (const champId of p.campo.campeones) {
        if (champId === null) continue
        const inst = s.instances[champId]
        totalBlocked += inst?.eterBloqueado?.length ?? 0
      }
      return totalBlocked >= (costo.cantidad ?? 1)

    case 'bloqueo_fijo':
      // Fixed block cost — always valid if player has ether
      return p.eterReserva.length >= (costo.cantidad ?? 1)

    case 'exhaust':
      // Exhaust self — check if not already exhausted
      return !inst?.agotado

    case 'exile_self':
      // Exile self — always valid
      return true

    case 'cemetery_self':
      // Send self to cemetery — always valid
      return true

    default:
      return true
  }
}

/**
 * Execute buff/debuff effect.
 */
function executeBuffDebuff(
  s: GameState,
  targetIds: string[],
  stats: EfectoData['stats'],
  duracion: EfectoData['duracion'],
  buffPerBlockedEther: boolean | undefined,
  inst: CardInstance,
): void {
  if (!stats) return

  // Calculate modifier expiration
  const expira = duracion === 'permanente' ? 'permanente' :
                 duracion === 'turno' ? 'turno' :
                 duracion === '1_por_turno' ? 'fase' :
                 duracion === 'mientras_en_campo' ? 'permanente' :
                 'fase'

  for (const targetId of targetIds) {
    let atqDelta = stats.ATQ ?? 0
    let resDelta = stats.RES ?? 0

    // Handle buffPerBlockedEther
    if (buffPerBlockedEther) {
      const targetInst = s.instances[targetId]
      const blockedCount = targetInst?.eterBloqueado?.length ?? 0
      atqDelta *= blockedCount
      resDelta *= blockedCount
    }

    if (atqDelta !== 0) {
      aplicarMod(s, targetId, 'poder', atqDelta, expira)
    }
    if (resDelta !== 0) {
      aplicarMod(s, targetId, 'resistencia', resDelta, expira)
    }
  }
}

/**
 * Execute destroy effect.
 */
function executeDestroy(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    enviarAlCementerio(s, ctx, targetId)
  }
}

/**
 * Execute exile effect.
 */
function executeExile(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    // Find which zone the card is in and remove it
    const owner = inst.owner
    const p = s.players[owner]

    // Remove from cemetery
    const cemIdx = p.cementerio.indexOf(targetId)
    if (cemIdx !== -1) {
      p.cementerio.splice(cemIdx, 1)
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from field
    const campoIdx = p.campo.campeones.indexOf(targetId)
    if (campoIdx !== -1) {
      p.campo.campeones[campoIdx] = null
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from mystics
    const mistIdx = p.campo.misticasTacticas.indexOf(targetId)
    if (mistIdx !== -1) {
      p.campo.misticasTacticas[mistIdx] = null
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from arcanas
    const arcIdx = p.campo.arcanasCombate.indexOf(targetId)
    if (arcIdx !== -1) {
      p.campo.arcanasCombate[arcIdx] = null
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }
  }
}

/**
 * Execute draw effect.
 */
function executeDraw(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  cantidad: number,
): void {
  const p = s.players[jugador]

  for (let i = 0; i < cantidad; i++) {
    if (p.mazo.length === 0) break

    const cardId = p.mazo.shift()!
    p.mano.push(cardId)
    ctx.emit({ type: 'carta_robada', cardInstanceId: cardId, jugador })
  }
}

/**
 * Execute grant_keyword effect.
 */
function executeGrantKeyword(
  s: GameState,
  targetIds: string[],
  keyword: string | undefined,
  duracion: EfectoData['duracion'],
): void {
  if (!keyword) return

  const temporal = duracion !== 'permanente'

  for (const targetId of targetIds) {
    otorgarKeyword(s, targetId, keyword, temporal)
  }
}

/**
 * Execute return_hand effect.
 */
function executeReturnHand(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    const p = s.players[owner]

    // Remove from current zone
    const removed = removeFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    // Add to hand
    p.mano.push(targetId)
    ctx.emit({ type: 'carta_devuelta_a_mano', cardInstanceId: targetId, jugador: owner })
  }
}

/**
 * Execute steal_champion effect.
 */
function executeStealChampion(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
  inst: CardInstance,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  for (const targetId of targetIds) {
    const targetInst = s.instances[targetId]
    if (!targetInst) continue

    // Find in rival's field
    const rivalCampo = s.players[rival].campo.campeones
    const idx = rivalCampo.indexOf(targetId)
    if (idx === -1) continue

    // Remove from rival's field
    rivalCampo[idx] = null

    // Add to player's field
    const playerCampo = s.players[jugador].campo.campeones
    const slotLibre = playerCampo.indexOf(null)
    if (slotLibre === -1) continue

    playerCampo[slotLibre] = targetId
    targetInst.stolenBy = inst.cardInstanceId

    ctx.emit({ type: 'campeon_robado', cardInstanceId: targetId, jugador, rival })
  }
}

/**
 * Execute steal_ether effect.
 */
function executeStealEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  for (const targetId of targetIds) {
    // Remove from rival's ether
    const rivalP = s.players[rival]
    const idx = rivalP.eterReserva.indexOf(targetId)
    if (idx !== -1) {
      rivalP.eterReserva.splice(idx, 1)
      s.players[jugador].eterReserva.push(targetId)
      ctx.emit({ type: 'eter_robarado', cardInstanceId: targetId, jugador, rival })
    }
  }
}

/**
 * Execute free_ether effect.
 */
function executeFreeEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
): void {
  for (const targetId of targetIds) {
    // Remove from paid zone
    const p = s.players[jugador]
    const idx = p.eterPagado.indexOf(targetId)
    if (idx !== -1) {
      p.eterPagado.splice(idx, 1)
      p.eterReserva.push(targetId)
      ctx.emit({ type: 'eter_liberado', cardInstanceId: targetId, jugador })
    }
  }
}

/**
 * Execute return_ether effect.
 */
function executeReturnEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    const p = s.players[owner]

    // Remove from current zone (paid or blocked)
    const paidIdx = p.eterPagado.indexOf(targetId)
    if (paidIdx !== -1) {
      p.eterPagado.splice(paidIdx, 1)
    }

    // Add to destination zone
    if (zonaDestino === 'reserva') {
      p.eterReserva.push(targetId)
      ctx.emit({ type: 'eter_devuelto', cardInstanceId: targetId, destino: 'reserva', jugador: owner })
    }
  }
}

/**
 * Execute mover effect.
 */
function executeMover(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
): void {
  // Mover is similar to return_ether but more generic
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    const p = s.players[owner]

    // Remove from current zone
    const paidIdx = p.eterPagado.indexOf(targetId)
    if (paidIdx !== -1) {
      p.eterPagado.splice(paidIdx, 1)
    }

    // Add to destination zone
    if (zonaDestino === 'pagado') {
      p.eterPagado.push(targetId)
      ctx.emit({ type: 'eter_movido', cardInstanceId: targetId, destino: 'pagado', jugador: owner })
    } else if (zonaDestino === 'reserva') {
      p.eterReserva.push(targetId)
      ctx.emit({ type: 'eter_movido', cardInstanceId: targetId, destino: 'reserva', jugador: owner })
    }
  }
}

/**
 * Execute toggle_exhaust effect.
 */
function executeToggleExhaust(
  s: GameState,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    inst.agotado = !inst.agotado
  }
}

/**
 * Execute rival_discard effect.
 */
function executeRivalDiscard(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  cantidad: number,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'
  const p = s.players[rival]

  for (let i = 0; i < cantidad; i++) {
    if (p.mano.length === 0) break

    // Random discard
    const idx = Math.floor(Math.random() * p.mano.length)
    const cardId = p.mano.splice(idx, 1)[0]
    p.cementerio.push(cardId)
    ctx.emit({ type: 'carta_descartada', cardInstanceId: cardId, jugador: rival })
  }
}

/**
 * Remove card from current zone.
 */
function removeFromCurrentZone(
  s: GameState,
  targetId: string,
  owner: PlayerId,
): boolean {
  const p = s.players[owner]

  // Remove from cemetery
  const cemIdx = p.cementerio.indexOf(targetId)
  if (cemIdx !== -1) {
    p.cementerio.splice(cemIdx, 1)
    return true
  }

  // Remove from field
  const campoIdx = p.campo.campeones.indexOf(targetId)
  if (campoIdx !== -1) {
    p.campo.campeones[campoIdx] = null
    return true
  }

  // Remove from mystics
  const mistIdx = p.campo.misticasTacticas.indexOf(targetId)
  if (mistIdx !== -1) {
    p.campo.misticasTacticas[mistIdx] = null
    return true
  }

  // Remove from arcanas
  const arcIdx = p.campo.arcanasCombate.indexOf(targetId)
  if (arcIdx !== -1) {
    p.campo.arcanasCombate[arcIdx] = null
    return true
  }

  // Remove from exile
  const exiIdx = p.exilio.indexOf(targetId)
  if (exiIdx !== -1) {
    p.exilio.splice(exiIdx, 1)
    return true
  }

  return false
}