import { CONFIG_V1 } from './config'
import { poderDeCarta } from './poderEfecto'
import { tabuDeCarta } from './tabu'
import type { BandaCoste, CartaBalance, ConfigBalance, EvaluacionPresupuesto, EstadoSuma } from './tipos'

/** Sacrificios que exige el rol de la carta (Soberano 1, Emperador 2; 0 en el resto). Misma regla que `sacrificiosRequeridos` del motor. */
export function sacrificiosDe(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): number {
  return carta.roles.reduce((n, r) => Math.max(n, cfg.elite.sacrificiosPorRol[r] ?? 0), 0)
}

/** ¿Es Única (1 copia)? */
export function esUnica(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): boolean {
  return cfg.elite.rarezasUnica.includes(carta.rareza)
}

/**
 * Un Campeón ÉLITE es Soberano, Emperador o Única. NO está exento de nada: tiene el mismo chequeo de stats, de impuesto de efecto y de tabú
 * que los demás, solo que con un presupuesto mayor (ver `ConfigBalance.elite`).
 */
export function esElite(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): boolean {
  return carta.tipo === 'Campeón' && (sacrificiosDe(carta, cfg) > 0 || esUnica(carta, cfg))
}

/**
 * Presupuesto de stats de un Campeón: la banda de su coste y, si es élite, ampliada por sus sacrificios y por ser Única.
 *   suma máxima = banda.sumaMax + bonoStatsSacrificio × sacrificios + bonoStatsUnica (si es Única)
 *   ATQ y RES máximos = proporcionTope × suma máxima
 * Una élite no tiene piso (sumaMin 0): puede gastar poco en stats y el resto en efectos o tabú. El coste 0 se trata como coste 1.
 * null si el coste no tiene banda.
 */
export function bandaDe(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): BandaCoste | null {
  if (!esElite(carta, cfg)) return cfg.bandas[carta.coste] ?? null
  const base = cfg.bandas[Math.max(1, carta.coste)]
  if (base === undefined) return null
  const sumaMax = base.sumaMax + sacrificiosDe(carta, cfg) * cfg.elite.bonoStatsSacrificio + (esUnica(carta, cfg) ? cfg.elite.bonoStatsUnica : 0)
  const tope = Math.round(sumaMax * cfg.elite.proporcionTope)
  return { sumaMin: 0, sumaMax, topeAtq: tope, topeRes: tope }
}

/**
 * Tabú máximo que da el coste de la carta (sin el bono por stats sin gastar): el de su coste y, si es élite, más lo de sus sacrificios y su rareza.
 * null con coste 0 (Vínculos) o sin fila en la tabla; una élite de coste 0 usa el coste 1.
 */
export function tabuMaxBase(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): number | null {
  const elite = esElite(carta, cfg)
  const coste = elite ? Math.max(1, carta.coste) : carta.coste
  if (coste < 1) return null
  const base = cfg.tabu.tabuMaxPorCoste[coste]
  if (base === undefined) return null
  if (!elite) return base
  return base + sacrificiosDe(carta, cfg) * cfg.elite.bonoTabuSacrificio + (esUnica(carta, cfg) ? cfg.elite.bonoTabuUnica : 0)
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
  const banda = bandaDe(carta, cfg)
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
    elite: esElite(carta, cfg),
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
 * permitida de un Campeón. Lo pagan TODOS, también las élites (Soberano, Emperador,
 * Única), que cobran contra su presupuesto mayor. Es una franquicia continua: solo se
 * paga lo que el índice pasa del umbral (sin escalón) y SIN tope, porque un tope
 * sería una exención disfrazada. Se redondea a un decimal.
 */
export function impuestoDe(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): number {
  if (carta.tipo !== 'Campeón') return 0
  const exceso = Math.max(0, poderDeCarta(carta, cfg).indice - cfg.impuesto.umbral)
  return Math.round(exceso * cfg.impuesto.puntosPorPoder * 10) / 10
}

/**
 * Bono de tabú por déficit de stats: cuántos puntos extra de tabú gana un Campeón que está por debajo de lo que su coste permite.
 * Solo Campeones con banda; 0 en los demás casos. Las élites también lo reciben, contra su presupuesto de suma mayor. Se redondea a un
 * decimal y no pasa de `bonoMax`. El déficit descuenta el impuesto de efecto para no pagar dos veces los mismos puntos de stats.
 */
export function bonoDeTabu(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): number {
  if (carta.tipo !== 'Campeón' || carta.stats === null) return 0
  const banda = bandaDe(carta, cfg)
  if (banda === null) return 0
  const deficit = Math.max(0, banda.sumaMax - impuestoDe(carta, cfg) - (carta.stats.atq + carta.stats.res))
  return Math.min(cfg.tabu.bonoMax, Math.round(deficit * cfg.tabu.bonoPorDeficit * 10) / 10)
}

/** Una carta «usa su bono» cuando rompe más reglas de las que su coste permite por sí solo: sus stats bajos son un trato deliberado. */
function usaBonoDeTabu(carta: CartaBalance, cfg: ConfigBalance): boolean {
  const base = tabuMaxBase(carta, cfg)
  return base !== null && bonoDeTabu(carta, cfg) > 0 && tabuDeCarta(carta, cfg).puntos > base
}

/**
 * Evalúa el presupuesto de un Campeón aplicando su impuesto de efecto (objetivoSuma = sumaMax - impuesto).
 * Una suma por debajo del mínimo NO es alarma si la carta usa su bono de tabú: cambió stats por efecto a propósito.
 */
export function evaluarConImpuesto(
  carta: CartaBalance,
  cfg: ConfigBalance = CONFIG_V1,
): EvaluacionPresupuesto | null {
  const ev = evaluarPresupuesto(carta, cfg, impuestoDe(carta, cfg))
  if (ev !== null && ev.estado === 'bajo' && usaBonoDeTabu(carta, cfg)) {
    return { ...ev, estado: 'dentro', fueraDeBanda: ev.excesoAtq > 0 || ev.excesoRes > 0 }
  }
  return ev
}
