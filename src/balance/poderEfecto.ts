import { CONFIG_V1 } from './config'
import type { CartaBalance, ConfigBalance, EfectoBalance } from './tipos'

/** Poder de un efecto, con lo que aporta una keyword concedida por separado. */
export interface PoderEfecto {
  verbo: string | null
  sinVerbo: boolean
  /** Poder total del efecto (incluye `keywords` y el costo, que resta). */
  poder: number
  /** Parte del poder que viene de keywords concedidas (grant_keyword). */
  keywords: number
}

export interface PoderKeyword {
  keyword: string
  peso: number
}

export interface PoderCarta {
  /** Suma de efectos y keywords propias, nunca negativa. */
  indice: number
  efectos: PoderEfecto[]
  /** Keywords impresas en la carta con su peso. */
  keywords: PoderKeyword[]
}

function pesoKeyword(keyword: string, cfg: ConfigBalance): number {
  return (cfg.poder.keyword as Record<string, number>)[keyword] ?? cfg.poder.fallback
}

function pesoDe(tabla: Record<string, number>, clave: string | null, cfg: ConfigBalance): number {
  return clave === null ? cfg.poder.fallback : (tabla[clave] ?? cfg.poder.fallback)
}

/** Peso base: el verbo principal, o la suma de los verbos de los tramos. */
function baseDe(e: EfectoBalance, cfg: ConfigBalance): number {
  if (e.verbo !== null) return pesoDe(cfg.poder.verbo, e.verbo, cfg)
  return e.verbosTramos.reduce((n, v) => n + pesoDe(cfg.poder.verbo, v, cfg), 0)
}

/** Cada factor del poder de un efecto; `poder` es exactamente lo que devuelve `poderDeEfecto`. */
export interface ComponentesEfecto {
  base: number
  tipo: number
  trigger: number
  activacion: number
  duracion: number
  objetivo: number
  /** tipo × trigger × activación × duración × objetivo (1 si el efecto no tiene verbo). */
  multiplicador: number
  /** Keywords concedidas ya multiplicadas por el objetivo. */
  keywords: number
  /** Costo del efecto (resta). */
  costo: number
  poder: number
}

export function componentesDeEfecto(e: EfectoBalance, cfg: ConfigBalance = CONFIG_V1): ComponentesEfecto {
  if (e.sinVerbo) {
    return { base: 0, tipo: 0, trigger: 0, activacion: 0, duracion: 0, objetivo: 0, multiplicador: 1, keywords: 0, costo: 0, poder: 0 }
  }

  const objetivo = e.objetivoTipo === null ? 1 : (cfg.poder.objetivo[e.objetivoTipo] ?? 1)
  const activacion = e.activacion === null ? 1 : pesoDe(cfg.poder.activacion, e.activacion, cfg)
  const duracion = e.duracion === null ? 1 : pesoDe(cfg.poder.duracion, e.duracion, cfg)
  const tipo = pesoDe(cfg.poder.tipo, e.tipo, cfg)
  const trigger = pesoDe(cfg.poder.trigger, e.trigger, cfg)
  // El orden de los productos es el de siempre: así la igualdad en flotante es exacta.
  const multiplicador = tipo * trigger * activacion * duracion * objetivo

  const keywords = e.keywordsConcedidas.reduce((n, k) => n + pesoKeyword(k, cfg), 0) * objetivo
  const costo = e.costoTipo === null ? 0 : (cfg.poder.costo[e.costoTipo] ?? 0) * Math.max(1, e.costoCantidad)
  const base = baseDe(e, cfg)

  return { base, tipo, trigger, activacion, duracion, objetivo, multiplicador, keywords, costo, poder: base * multiplicador + keywords + costo }
}

/**
 * poder = base × tipo × trigger × activación × duración × objetivo
 *         + (keywords concedidas × objetivo) + costo
 *
 * Un trigger, tipo o duración que la config no conoce pesa `poder.fallback`.
 * Sin activación o sin duración declaradas no hay multiplicador.
 */
export function poderDeEfecto(e: EfectoBalance, cfg: ConfigBalance = CONFIG_V1): PoderEfecto {
  const c = componentesDeEfecto(e, cfg)
  return { verbo: e.verbo, sinVerbo: e.sinVerbo, poder: c.poder, keywords: c.keywords }
}

/**
 * Índice de poder de una carta: efectos (incluido el de Comandante, que es un
 * efecto real de la carta) más las keywords impresas. No baja de 0.
 */
export function poderDeCarta(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): PoderCarta {
  const efectos = carta.efectos.map((e) => poderDeEfecto(e, cfg))
  const keywords = carta.keywords.map((keyword) => ({ keyword, peso: pesoKeyword(keyword, cfg) }))
  const total = efectos.reduce((n, e) => n + e.poder, 0) + keywords.reduce((n, k) => n + k.peso, 0)
  return { indice: Math.max(0, total), efectos, keywords }
}
