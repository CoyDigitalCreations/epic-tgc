import type { AnyCard } from '../../../shared/types'

/** Expande diseños a copias según limiteCopias (mazo jugable de 61 cardIds). */
export function expandirMazo(cards: AnyCard[]): string[] {
  return cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))
}

/**
 * Fisher-Yates de REFERENCIA (contrato de consumo RNG del design §6).
 * Replica el algoritmo documentado para verificar el orden de extracciones
 * sin depender de la implementación del motor (spec R4, esc. Orden estable).
 */
export function fisherYatesReferencia<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}
