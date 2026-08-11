/**
 * PRNG determinístico compartido (capability `game-rng`).
 *
 * Extracción 1:1 de src/forge/components/card-art/CardFrame.tsx (L10-29):
 * misma implementación, misma secuencia por seed. Convención del proyecto:
 * NUNCA usar Math.random — todo azar del motor se deriva de este stream.
 */

/** Hash determinístico (djb2): deriva el patrón de runas de cada variante */
export function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** PRNG determinístico (mulberry32) — nunca usa Math.random */
export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
