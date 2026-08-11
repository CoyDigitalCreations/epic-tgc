/**
 * Reemplazos de Campeones y Éter (ADR-17).
 *
 * Hogar de los helpers de "sacar un Campeón del campo" y de liberación de
 * Éter bloqueado. En C2 solo contiene `liberarEterBloqueado` (usado por el
 * sacrificio al jugar un Soberano/Emperador); en C3 crece con
 * `destruirCarta`, `registrarReemplazo`, `moverAlCementerio`, el sexto
 * Vínculo y la derrota.
 */
import type { Ctx, GameState } from './types'

/**
 * Libera el Éter bloqueado de una instancia que SALE del campo (ADR-17).
 *
 * Destino:
 * - '2A' — sacrificio de Soberano/Emperador: el Éter vuelve a la Reserva
 *   INMEDIATO (glosario L1351-1352; manual 7.2 L937). Fix del gap #1223:
 *   antes el Éter quedaba atascado en la instancia que iba a 2G.
 * - '1A' — muerte en combate (C3): el Éter vuelve a Éter Pagado y se
 *   reagrupa en el próximo Alba (ADR-14), silencioso.
 *
 * Es silencioso: no emite eventos; el reagrupado del 1A lo cubre
 * `eter_reagrupado` en el Alba.
 */
export function liberarEterBloqueado(s: GameState, _ctx: Ctx, cardInstanceId: string, destino: '1A' | '2A'): void {
  const inst = s.instances[cardInstanceId]
  if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) return
  const eteres = inst.eterBloqueado
  inst.eterBloqueado = []
  const p = s.players[inst.owner]
  if (destino === '2A') {
    p.eterReserva.push(...eteres)
  } else {
    p.eterPagado.push(...eteres)
  }
}
