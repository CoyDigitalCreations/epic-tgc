/**
 * Robo de cartas — módulo hoja SIN dependencias de otros módulos del motor
 * (evita el ciclo phases → effectInterpreter → phases: el robo por EFECTO
 * necesita la misma derrota por mazo vacío que el robo de Alba, manual §13.2:
 * "Cuando deba robar de su Mazo Principal y no queden cartas, pierde en el
 * momento de intentar robar" — sin importar el origen del robo).
 */
import type { Ctx, GameState, PlayerId } from './types'

/** Roba la carta del tope del mazo; mazo vacío → mazo_agotado + partida_terminada. */
export function robarCarta(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]
  const tope = p.mazo.shift()
  if (tope === undefined) {
    ctx.emit({ type: 'mazo_agotado', jugador })
    const ganador: PlayerId = jugador === 'A' ? 'B' : 'A'
    s.fase = 'terminada'
    s.ganador = ganador
    s.motivo = 'mazo_vacio'
    ctx.emit({ type: 'partida_terminada', ganador, motivo: 'mazo_vacio' })
    return
  }
  p.mano.push(tope)
  ctx.emit({ type: 'carta_robada', jugador, cardInstanceId: tope })
}
