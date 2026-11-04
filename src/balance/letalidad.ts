import { CONFIG_V1 } from './config'
import { esExento } from './presupuesto'
import type { CartaBalance, ConfigBalance } from './tipos'

/**
 * Letalidad: un Campeón muere si el daño recibido >= su Defensa (manual) y el daño
 * es simultáneo. Una carta «mata» a otra si su ATQ >= la RES de la otra.
 */
export interface Letalidad {
  id: string
  /** Rivales del pool, sin contar la propia carta. */
  total: number
  /** A cuántos del pool mata (ATQ propio >= RES del otro). */
  mata: number
  /** Cuántos del pool la matan (ATQ del otro >= RES propia). */
  loMatan: number
  pctMata: number
  pctLoMatan: number
  /** Mata a mucho y casi nadie la mata: umbrales en `config.letalidad`. */
  dominante: boolean
}

export interface OpcionesPool {
  /** Incluye las cartas de referencia (paquete de pruebas). Por defecto no. */
  incluirReferencia?: boolean
}

export interface MatrizLetalidad {
  ids: string[]
  /** celdas[i][j] = true si ids[i] mata a ids[j]; la diagonal es siempre false. */
  celdas: boolean[][]
}

export interface FilaUmbralRes {
  valor: number
  /** Cuántos del pool matan a un Campeón con esta RES. */
  loMatan: number
  pct: number
}

export interface FilaUmbralAtq {
  valor: number
  /** A cuántos del pool mata un Campeón con este ATQ. */
  mata: number
  pct: number
}

export interface UmbralesPorStat {
  atq: FilaUmbralAtq[]
  res: FilaUmbralRes[]
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100 * 10) / 10
}

/**
 * Pool de letalidad: Campeones con stats que NO están exentos (Únicas y Soberanos
 * viven fuera de la economía normal de combate). La referencia solo entra si se pide.
 */
export function poolLetalidad(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): CartaBalance[] {
  return cartas.filter(
    (c) =>
      c.tipo === 'Campeón' &&
      c.stats !== null &&
      !esExento(c, cfg) &&
      (opciones.incluirReferencia === true || c.esReferencia !== true),
  )
}

/** Letalidad de una carta contra un pool; null si no tiene stats. */
export function letalidad(
  carta: CartaBalance,
  pool: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
): Letalidad | null {
  if (carta.stats === null) return null
  const { atq, res } = carta.stats
  const otros = pool.filter((o) => o.id !== carta.id && o.stats !== null)
  const mata = otros.filter((o) => atq >= (o.stats?.res ?? 0)).length
  const loMatan = otros.filter((o) => (o.stats?.atq ?? 0) >= res).length
  const pctMata = pct(mata, otros.length)
  const pctLoMatan = pct(loMatan, otros.length)
  return {
    id: carta.id,
    total: otros.length,
    mata,
    loMatan,
    pctMata,
    pctLoMatan,
    dominante:
      otros.length > 0 && pctMata >= cfg.letalidad.dominanteMata && pctLoMatan <= cfg.letalidad.dominanteLoMatan,
  }
}

/** Quién mata a quién dentro del pool. */
export function matrizLetalidad(pool: readonly CartaBalance[]): MatrizLetalidad {
  const conStats = pool.filter((c) => c.stats !== null)
  return {
    ids: conStats.map((c) => c.id),
    celdas: conStats.map((a, i) =>
      conStats.map((b, j) => i !== j && (a.stats?.atq ?? 0) >= (b.stats?.res ?? 0)),
    ),
  }
}

/** ATQ y RES más altos del pool: más allá de ese techo subir un stat ya no mata a nadie más. */
export function techosDelPool(pool: readonly CartaBalance[]): { atq: number; res: number } {
  return pool.reduce(
    (t, c) => ({ atq: Math.max(t.atq, c.stats?.atq ?? 0), res: Math.max(t.res, c.stats?.res ?? 0) }),
    { atq: 0, res: 0 },
  )
}

/**
 * Para cada valor de RES, cuántos del pool matan a un Campeón con esa RES; para cada
 * valor de ATQ, a cuántos mata. Los valores que dan el mismo conteo son equivalentes:
 * ahí están los «escalones».
 */
export function umbralesPorStat(pool: readonly CartaBalance[]): UmbralesPorStat {
  const conStats = pool.filter((c) => c.stats !== null)
  if (conStats.length === 0) return { atq: [], res: [] }
  const techo = techosDelPool(conStats)
  const rango = (max: number) => Array.from({ length: max + 1 }, (_, v) => v)
  return {
    res: rango(techo.res).map((valor) => {
      const loMatan = conStats.filter((o) => (o.stats?.atq ?? 0) >= valor).length
      return { valor, loMatan, pct: pct(loMatan, conStats.length) }
    }),
    atq: rango(techo.atq).map((valor) => {
      const mata = conStats.filter((o) => valor >= (o.stats?.res ?? 0)).length
      return { valor, mata, pct: pct(mata, conStats.length) }
    }),
  }
}
