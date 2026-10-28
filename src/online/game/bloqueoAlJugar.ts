/**
 * Bloqueo AL JUGAR (Último Refugio, FB-022): una Mística cuyo hechizo se paga con «Bloquea N Éter» no se juega primero y se
 * bloquea después a voluntad: el bloqueo es parte de jugarla. La acción (`jugar_mistica` / `jugar_respuesta`) lleva los Éteres
 * a bloquear en `bloqueoEterIds`, se validan junto con el pago y se bloquean en cuanto la carta entra al campo, antes de que
 * se elija su objetivo y se abra la ventana. Además solo se puede jugar si el rival controla una Mística o Arcana que copiar.
 *
 * Alcance: Místicas que NO son Artefacto. Un Artefacto equipable ya tiene su propio flujo (equipar primero, bloquear después).
 */
import type { AnyCard } from './cards'
import { esArtefactoEquipable, esMistica } from './cards'
import { bloquearEter } from './payments'
import type { Ctx, GameState, PlayerId } from './types'

/** El hechizo de COPIA con «Bloquea N Éter» que exige bloquear al jugar la Mística (N exacto), o null si la carta no es de este tipo. */
export function bloqueoAlJugar(meta: AnyCard | null | undefined): { cantidad: number } | null {
  if (!meta || !esMistica(meta) || esArtefactoEquipable(meta) || !('efectos' in meta) || !meta.efectos) return null
  const efecto = meta.efectos.find((e) => e.tipo === 'hechizo' && e.efecto === 'copy' && e.costo?.tipo === 'bloqueo_fijo' && (e.costo.cantidad ?? 0) > 0)
  return efecto ? { cantidad: efecto.costo!.cantidad! } : null
}

/** ¿El rival controla alguna Mística o Arcana (boca arriba o abajo) que copiar? */
function hayCartaQueCopiar(state: GameState, jugador: PlayerId): boolean {
  const rival = state.players[jugador === 'A' ? 'B' : 'A']
  return [...rival.campo.misticasTacticas, ...rival.campo.arcanasCombate].some((id) => id !== null)
}

/**
 * Los Éteres que el motor propone bloquear al jugar `meta` pagando con `eterIdsPago`: los primeros N de la Reserva que no se
 * usan para pagar. `undefined` = la carta no bloquea al jugarse; `null` = no se puede jugar (nada que copiar o no alcanza el Éter).
 */
export function bloqueoParaJugar(state: GameState, jugador: PlayerId, meta: AnyCard, eterIdsPago: readonly string[]): string[] | null | undefined {
  const requisito = bloqueoAlJugar(meta)
  if (!requisito) return undefined
  if (!hayCartaQueCopiar(state, jugador)) return null
  const libres = state.players[jugador].eterReserva.filter((id) => !eterIdsPago.includes(id))
  return libres.length >= requisito.cantidad ? libres.slice(0, requisito.cantidad) : null
}

/** Motivo de rechazo del bloqueo que acompaña a jugar `meta` (null = válido). Una carta sin este bloqueo no admite `bloqueoEterIds`. */
export function motivoBloqueoAlJugar(
  state: GameState,
  jugador: PlayerId,
  meta: AnyCard,
  eterIdsPago: readonly string[],
  bloqueoEterIds: readonly string[] | undefined,
): string | null {
  const requisito = bloqueoAlJugar(meta)
  const ids = bloqueoEterIds ?? []
  if (!requisito) return ids.length > 0 ? `${meta.name} no bloquea Éter al jugarse` : null
  if (!hayCartaQueCopiar(state, jugador)) return `${meta.name} solo se juega si el rival controla una Mística o Arcana que copiar`
  if (ids.length !== requisito.cantidad) {
    return `${meta.name} bloquea exactamente ${requisito.cantidad} Éter(es) al jugarse (indicaste ${ids.length})`
  }
  const reserva = state.players[jugador].eterReserva
  if (new Set(ids).size !== ids.length) return 'éteres repetidos en el bloqueo'
  for (const id of ids) {
    if (!reserva.includes(id)) return `el Éter ${id} a bloquear no está en tu Reserva`
    if (eterIdsPago.includes(id)) return 'un Éter no puede pagar y bloquear a la vez'
  }
  return null
}

/** Bloquea los Éteres sobre la Mística ya colocada en el campo (la validación de `bloquearEter` ya los comprobó con el resto de la acción). */
export function aplicarBloqueoAlJugar(s: GameState, ctx: Ctx, jugador: PlayerId, cardInstanceId: string, bloqueoEterIds: readonly string[] | undefined): void {
  if (!bloqueoEterIds || bloqueoEterIds.length === 0) return
  bloquearEter(s, ctx, jugador, [...bloqueoEterIds], cardInstanceId)
}
