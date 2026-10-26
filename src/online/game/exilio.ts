/**
 * Punto de control único del Exilio (F7).
 *
 * Toda carta que vaya a entrar al Exilio por un efecto (exiliar, tutor con destino Exilio, mover Éter al
 * Exilio, costo "exiliar esta carta") pregunta aquí ANTES de salir de su zona. La respuesta sale de la regla
 * `puedeSerExiliada` (reglas.ts): la keyword INEXILIABLE (§10) o una modificación temporal la vuelven falsa.
 * Así una carta nueva con Exilio, o una nueva forma de prohibirlo, no tiene que tocar a cada ejecutor.
 *
 * Es el equivalente de la protección de Inmortal/Indestructible en `destruirCarta`: la carta se queda donde
 * está, intacta, y se avisa con `exilio_prevenido`.
 */
import { reglaBool } from './reglas'
import type { Ctx, GameState } from './types'

/** ¿Puede esta carta ser exiliada ahora? No emite nada (para elegibilidad de costos y fuentes). */
export function esExiliable(s: GameState, cardInstanceId: string): boolean {
  return reglaBool(s, 'puedeSerExiliada', { instId: cardInstanceId })
}

/**
 * Autoriza el exilio de una carta. `true`: sigue con el movimiento. `false`: la carta no se mueve y,
 * si existe, se avisa con `exilio_prevenido` (una instancia inexistente devuelve `false` sin aviso).
 */
export function permitirExilio(s: GameState, ctx: Ctx, cardInstanceId: string): boolean {
  const inst = s.instances[cardInstanceId]
  if (!inst) return false
  if (esExiliable(s, cardInstanceId)) return true
  ctx.emit({ type: 'exilio_prevenido', cardInstanceId, jugador: inst.owner })
  return false
}
