import { hashStr, mulberry32 } from '../../shared/rng'
import type { GameEvent } from './events'
import type { Ctx } from './types'

export { hashStr, mulberry32 }

/**
 * Crea el contexto de ejecución de una partida: stream RNG único (la posición
 * = extracciones previas, contrato de reproducibilidad §6) + acumulador de
 * eventos. applyAction limpia ctx.events al inicio de cada acción (ADR-5).
 */
export function createCtx(seed: number): Ctx {
  const rand = mulberry32(seed)
  let eventos: GameEvent[] = []
  return {
    next: () => rand(),
    emit: (e: GameEvent) => {
      eventos.push(e)
    },
    get events() {
      return eventos
    },
  }
}

/**
 * Fisher-Yates sobre el stream único. Consume arr.length - 1 extracciones
 * (40 → 39; 6 → 5). Orden de consumo = contrato del design §6: no reordenar.
 */
export function shuffleFisherYates<T>(rng: Pick<Ctx, 'next'>, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}
