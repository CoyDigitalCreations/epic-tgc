/**
 * Robo de cartas — módulo hoja SIN dependencias de otros módulos del motor
 * (evita el ciclo phases → effectInterpreter → phases: el robo por EFECTO
 * necesita la misma derrota por mazo vacío que el robo de Alba, manual §13.2:
 * "Cuando deba robar de su Mazo Principal y no queden cartas, pierde en el
 * momento de intentar robar" — sin importar el origen del robo).
 */
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Roba la carta del tope del mazo y devuelve true. Mazo vacío → `mazo_agotado`, el jugador queda MARCADO
 * (`mazosAgotados`) y devuelve false: quien itere (robar N) debe parar. F6: la derrota NO se confirma aquí sino al
 * terminar de resolver lo pendiente (finPartida.ts, manual §13: si ambos jugadores quedan derrotados, empate).
 */
export function robarCarta(s: GameState, ctx: Ctx, jugador: PlayerId): boolean {
  const p = s.players[jugador]
  const tope = p.mazo.shift()
  if (tope === undefined) {
    ctx.emit({ type: 'mazo_agotado', jugador })
    if (!s.mazosAgotados?.includes(jugador)) s.mazosAgotados = [...(s.mazosAgotados ?? []), jugador]
    return false
  }
  p.mano.push(tope)
  ctx.emit({ type: 'carta_robada', jugador, cardInstanceId: tope })
  return true
}
