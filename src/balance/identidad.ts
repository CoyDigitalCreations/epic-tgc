import { CONFIG_V1 } from './config'
import type { CartaBalance, ConfigBalance, EfectoBalance, MazoId } from './tipos'

export type ClaseIdentidad = 'identidad' | 'neutral' | 'fuera'

export interface ResumenIdentidad {
  identidad: number
  neutral: number
  fuera: number
  total: number
  /** identidad / total × 100, con un decimal; 0 si el mazo no tiene efectos. */
  porcentaje: number
}

function otroMazo(mazo: MazoId): MazoId {
  return mazo === 'estasis' ? 'disonancia' : 'estasis'
}

/**
 * Clase de un verbo para un mazo:
 * - identidad: está en la lista de identidad del mazo;
 * - fuera: es identidad del mazo rival y no del propio ni neutral;
 * - neutral: todo lo demás, incluidos los verbos que la config no conoce.
 */
export function clasificarVerbo(verbo: string, mazo: MazoId, cfg: ConfigBalance = CONFIG_V1): ClaseIdentidad {
  const propio = cfg.identidad[mazo]
  if (propio.identidad.includes(verbo)) return 'identidad'
  if (propio.neutral.includes(verbo)) return 'neutral'
  return cfg.identidad[otroMazo(mazo)].identidad.includes(verbo) ? 'fuera' : 'neutral'
}

/**
 * Clase de un efecto. Se clasifica por su verbo, o por los verbos de sus
 * tramos si no tiene verbo propio. Con varios verbos gana la identidad;
 * si no hay ninguna, lo fuera de identidad; si no, neutral.
 */
export function clasificarEfecto(e: EfectoBalance, mazo: MazoId, cfg: ConfigBalance = CONFIG_V1): ClaseIdentidad {
  const verbos = e.verbo !== null ? [e.verbo] : e.verbosTramos
  const clases = verbos.map((v) => clasificarVerbo(v, mazo, cfg))
  if (clases.includes('identidad')) return 'identidad'
  if (clases.includes('fuera')) return 'fuera'
  return 'neutral'
}

/** Cuenta los efectos de las cartas de un mazo por clase y calcula el porcentaje de identidad. */
export function resumenIdentidad(
  cartas: readonly CartaBalance[],
  mazo: MazoId,
  cfg: ConfigBalance = CONFIG_V1,
): ResumenIdentidad {
  const cuenta: Record<ClaseIdentidad, number> = { identidad: 0, neutral: 0, fuera: 0 }
  for (const c of cartas) {
    for (const e of c.efectos) cuenta[clasificarEfecto(e, mazo, cfg)]++
  }
  const total = cuenta.identidad + cuenta.neutral + cuenta.fuera
  const porcentaje = total === 0 ? 0 : Math.round((cuenta.identidad / total) * 100 * 10) / 10
  return { ...cuenta, total, porcentaje }
}
