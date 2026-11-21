import { CONFIG_V1 } from './config'
import { poderDeCarta } from './poderEfecto'
import { esElite, sacrificiosDe } from './presupuesto'
import type { CartaBalance, ConfigBalance } from './tipos'

export interface VerboBajoCosto {
  verbo: string
  costeMinimo: number
}

export interface EvaluacionEfectoPorCoste {
  /** Tope del índice de efecto = coste × poderPorCoste; null con coste 0. */
  indiceMax: number | null
  indice: number
  /** Cuánto pasa el índice del tope (0 si no lo pasa o si no hay tope). */
  excesoIndice: number
  /** Verbos de la carta cuyo coste mínimo es mayor que su coste efectivo (`costeVerbo`). */
  verbosBajoCosto: VerboBajoCosto[]
  /** Coste contra el que se compara el coste mínimo de cada verbo: el de la carta y, si es élite, más lo que valen sus sacrificios. */
  costeVerbo: number
  /**
   * Soberano, Emperador o Única. NO se eximen del presupuesto: su poder de efecto se cobra en el presupuesto de stats (impuesto sin tope)
   * y en el de tabú, que son los que de verdad lo acotan. Solo se les omite el tope plano `coste × poderPorCoste`, que no sabe de sacrificios.
   */
  elite: boolean
  /** El tope de efecto por coste aplica a esta carta (cualquier tipo que no sea élite, con coste >= 1). */
  aplicaTope: boolean
  /** true si no incumple nada (o si no tiene coste). */
  ok: boolean
}

/** Redondeo a 2 decimales: evita que el ruido flotante cambie una comparación. */
const redondear = (n: number): number => Math.round(n * 100) / 100

/** Coste mínimo de un verbo: el override de la config, o ceil(peso del verbo). */
export function costeMinimoDeVerbo(verbo: string, cfg: ConfigBalance = CONFIG_V1): number {
  const override = cfg.costeMinimoVerbo[verbo]
  if (override !== undefined) return override
  return Math.ceil(cfg.poder.verbo[verbo] ?? cfg.poder.fallback)
}

/** Verbos distintos de la carta (principales, de tramos y de comandante), en orden de aparición. */
function verbosDeCarta(carta: CartaBalance): string[] {
  const verbos = carta.efectos.flatMap((e) => (e.verbo !== null ? [e.verbo] : e.verbosTramos))
  return [...new Set(verbos)]
}

/**
 * Tope de efecto por coste y coste mínimo por verbo.
 *   indiceMax = coste × poderPorCoste. Es ESTRICTO (sin la tolerancia del semáforo) y aplica a
 *   todos los tipos de carta que no son élite: falla si el índice pasa el tope.
 *   Un verbo exige coste >= costeMinimoVerbo[verbo] ?? ceil(poder.verbo[verbo]).
 * Coste 0 se omite (siempre ok). Una élite no tiene el tope plano (su poder se cobra en el presupuesto de stats y de tabú), pero sí el coste mínimo por verbo,
 * contra su coste efectivo: sus sacrificios cuentan como coste (`elite.costeEquivalenteSacrificio` cada uno).
 */
export function evaluarEfectoPorCoste(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): EvaluacionEfectoPorCoste {
  const indice = redondear(poderDeCarta(carta, cfg).indice)
  const elite = esElite(carta, cfg)

  if (carta.coste < 1) {
    return { indiceMax: null, indice, excesoIndice: 0, verbosBajoCosto: [], costeVerbo: carta.coste, elite, aplicaTope: false, ok: true }
  }

  const indiceMax = carta.coste * cfg.poderPorCoste
  const excesoIndice = redondear(Math.max(0, indice - indiceMax))
  const costeVerbo = elite ? carta.coste + sacrificiosDe(carta, cfg) * cfg.elite.costeEquivalenteSacrificio : carta.coste
  const exentoCosteMinimo = cfg.costeMinimoExento.tipos.includes(carta.tipo)
  const verbosBajoCosto = exentoCosteMinimo
    ? []
    : verbosDeCarta(carta)
        .map((verbo) => ({ verbo, costeMinimo: costeMinimoDeVerbo(verbo, cfg) }))
        .filter((v) => costeVerbo < v.costeMinimo)
  const aplicaTope = !elite

  const incumple = (aplicaTope && excesoIndice > 0) || verbosBajoCosto.length > 0
  return { indiceMax, indice, excesoIndice, verbosBajoCosto, costeVerbo, elite, aplicaTope, ok: !incumple }
}

/**
 * Motivo corto de por qué una carta no pasa el chequeo; null si pasa. Si falla por varias
 * causas se unen con «; ». Una carta sin coste nunca tiene motivo.
 */
export function motivoEfectoPorCoste(ev: EvaluacionEfectoPorCoste): string | null {
  if (ev.ok || ev.indiceMax === null) return null
  const motivos: string[] = []
  if (ev.aplicaTope && ev.excesoIndice > 0) motivos.push(`índice ${ev.indice} > tope ${ev.indiceMax}`)
  for (const v of ev.verbosBajoCosto) motivos.push(`verbo ${v.verbo} pide coste ${v.costeMinimo}`)
  return motivos.join('; ')
}
