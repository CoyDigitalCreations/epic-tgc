import { CONFIG_V1 } from './config'
import { poderDeCarta } from './poderEfecto'
import type { BandaCoste, CartaBalance, ConfigBalance, EvaluacionPresupuesto, EstadoSuma } from './tipos'

/** Un Campeón está exento de la banda por coste si su rol o su rareza lo indica. */
export function esExento(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): boolean {
  const { rolesExentos, rarezasExentas } = cfg.excepciones
  return carta.roles.some((r) => rolesExentos.includes(r)) || rarezasExentas.includes(carta.rareza)
}

function bandaDe(carta: CartaBalance, exento: boolean, cfg: ConfigBalance): BandaCoste | null {
  if (exento) {
    const { suma, atq, res } = cfg.excepciones.tope
    return { sumaMin: 0, sumaMax: suma, topeAtq: atq, topeRes: res }
  }
  return cfg.bandas[carta.coste] ?? null
}

/**
 * Compara los stats de un Campeón con el presupuesto de su coste.
 * Devuelve null si la carta no es Campeón, no tiene stats o su coste no tiene banda.
 * `impuesto` es lo que los efectos le restan a la suma permitida (0 por defecto).
 */
export function evaluarPresupuesto(
  carta: CartaBalance,
  cfg: ConfigBalance = CONFIG_V1,
  impuesto = 0,
): EvaluacionPresupuesto | null {
  if (carta.tipo !== 'Campeón' || carta.stats === null) return null
  const exento = esExento(carta, cfg)
  const banda = bandaDe(carta, exento, cfg)
  if (banda === null) return null

  const { atq, res } = carta.stats
  const suma = atq + res
  const objetivoSuma = Math.max(0, banda.sumaMax - impuesto)
  const minimo = Math.max(0, banda.sumaMin - impuesto)
  const desvio = suma - objetivoSuma
  const estado: EstadoSuma = suma < minimo ? 'bajo' : suma > objetivoSuma ? 'sobre' : 'dentro'
  const excesoAtq = Math.max(0, atq - banda.topeAtq)
  const excesoRes = Math.max(0, res - banda.topeRes)

  return {
    atq,
    res,
    suma,
    puntos: atq * cfg.pesos.atq + res * cfg.pesos.res,
    banda,
    exento,
    impuesto,
    objetivoSuma,
    desvio,
    estado,
    excesoAtq,
    excesoRes,
    fueraDeBanda: estado !== 'dentro' || excesoAtq > 0 || excesoRes > 0,
  }
}

/**
 * Impuesto de stats por efecto: lo que el índice de poder le resta a la suma
 * permitida de un Campeón. Solo lo pagan los Campeones con banda por coste:
 * los exentos (Únicas, Soberanos, Emperadores) ya pagan su poder con el
 * sacrificio de Campeones, así que no se les descuenta nada, aunque su índice
 * sea alto. Se redondea a un decimal y no pasa de `maxImpuesto`.
 */
export function impuestoDe(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): number {
  if (carta.tipo !== 'Campeón' || esExento(carta, cfg)) return 0
  const crudo = poderDeCarta(carta, cfg).indice * cfg.impuesto.puntosPorPoder
  return Math.min(cfg.impuesto.maxImpuesto, Math.round(crudo * 10) / 10)
}

/** Evalúa el presupuesto de un Campeón aplicando su impuesto de efecto (objetivoSuma = sumaMax - impuesto). */
export function evaluarConImpuesto(
  carta: CartaBalance,
  cfg: ConfigBalance = CONFIG_V1,
): EvaluacionPresupuesto | null {
  return evaluarPresupuesto(carta, cfg, impuestoDe(carta, cfg))
}
