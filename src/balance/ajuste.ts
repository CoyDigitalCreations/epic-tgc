import { CONFIG_V1 } from './config'
import { clasificarVerbo } from './identidad'
import { letalidad, poolLetalidad, techosDelPool } from './letalidad'
import type { Letalidad, OpcionesPool } from './letalidad'
import { evaluarConImpuesto } from './presupuesto'
import type { BandaCoste, CartaBalance, ConfigBalance, EvaluacionPresupuesto } from './tipos'

/** Stats de un Campeón con los nombres del JSON de exportación. */
export interface StatsAjuste {
  poder: number
  resistencia: number
}

export interface Ajuste {
  id: string
  nombre: string
  antes: StatsAjuste
  despues: StatsAjuste
  /** Por qué se propone el cambio, en español neutro. */
  motivo: string
  /** Verbos de efectos fuera de identidad: solo se marcan, la v1 no los reescribe. */
  fueraDeIdentidad: string[]
  /** El stat nuevo pasa el máximo que hoy existe en el pool de letalidad. */
  superaTecho: boolean
  avisos: string[]
  letalidadAntes: Letalidad | null
  /** Contra el pool tal como está hoy en el seed. */
  letalidadDespues: Letalidad | null
  /** Contra el pool con TODOS los ajustes aplicados. */
  letalidadDespuesTodos: Letalidad | null
}

export interface MarcaIdentidad {
  id: string
  verbos: string[]
}

export interface ResultadoAjuste {
  /** Solo Campeones fuera de banda, en el orden de entrada. */
  ajustes: Ajuste[]
  /** Todas las cartas con efectos fuera de identidad, estén o no ajustadas. */
  fueraDeIdentidad: MarcaIdentidad[]
  /** ATQ y RES más altos del pool de letalidad. */
  techos: { atq: number; res: number }
  avisos: string[]
}

export interface OpcionesAjuste extends OpcionesPool {}

/** Suma entera a la que se lleva un Campeón fuera de banda: la más cercana que queda dentro. */
function sumaObjetivo(ev: EvaluacionPresupuesto): number {
  const maximo = Math.floor(ev.objetivoSuma)
  if (ev.estado === 'bajo') return Math.min(Math.ceil(Math.max(0, ev.banda.sumaMin - ev.impuesto)), maximo)
  if (ev.estado === 'sobre') return maximo
  return ev.suma
}

/**
 * Reparte `objetivo` conservando el perfil ofensivo/defensivo (proporción ATQ:RES).
 * Si el redondeo queda exactamente a la mitad gana la RES (que es el stat más caro).
 * Luego aplica los topes individuales moviendo el excedente al otro stat.
 */
function repartir(atq: number, res: number, objetivo: number, banda: BandaCoste): StatsAjuste {
  const base = atq + res
  const ideal = base === 0 ? objetivo / (1 + 1) : (objetivo * atq) / base
  const piso = Math.floor(ideal)
  const resto = ideal - piso
  let nuevoAtq = Math.min(objetivo, resto > 1 - resto ? piso + 1 : piso)
  let nuevaRes = objetivo - nuevoAtq

  if (nuevoAtq > banda.topeAtq) {
    nuevaRes += nuevoAtq - banda.topeAtq
    nuevoAtq = banda.topeAtq
  }
  if (nuevaRes > banda.topeRes) {
    nuevoAtq = Math.min(banda.topeAtq, nuevoAtq + nuevaRes - banda.topeRes)
    nuevaRes = banda.topeRes
  }
  return { poder: nuevoAtq, resistencia: nuevaRes }
}

function motivoDe(ev: EvaluacionPresupuesto, coste: number, despues: StatsAjuste): string {
  const nuevaSuma = despues.poder + despues.resistencia
  const topes: string[] = []
  if (ev.excesoAtq > 0) topes.push(`ATQ ${ev.atq} pasa el tope de ${ev.banda.topeAtq}`)
  if (ev.excesoRes > 0) topes.push(`RES ${ev.res} pasa el tope de ${ev.banda.topeRes}`)
  const tope = topes.length > 0 ? ` (${topes.join(' y ')})` : ''

  if (ev.estado === 'bajo') {
    return `La suma ${ev.suma} está por debajo del mínimo para coste ${coste}${tope}; se sube a ${nuevaSuma} conservando su perfil ofensivo y defensivo.`
  }
  if (ev.estado === 'sobre') {
    const efecto = ev.impuesto > 0 ? ` (el máximo de la banda baja a ${ev.objetivoSuma} por el impuesto de su efecto)` : ''
    return `La suma ${ev.suma} pasa el máximo permitido para coste ${coste}${efecto}${tope}; se baja a ${nuevaSuma} conservando su perfil ofensivo y defensivo.`
  }
  return `La suma ${ev.suma} está en banda para coste ${coste}, pero ${topes.join(' y ')}; se mueve el excedente al otro stat y la suma queda en ${nuevaSuma}.`
}

/** Verbos de efectos que son identidad del mazo rival, sin repetir. */
function verbosFuera(carta: CartaBalance, cfg: ConfigBalance): string[] {
  if (carta.mazo === null) return []
  const mazo = carta.mazo
  const verbos = carta.efectos.flatMap((e) => (e.verbo !== null ? [e.verbo] : e.verbosTramos))
  return [...new Set(verbos.filter((v) => clasificarVerbo(v, mazo, cfg) === 'fuera'))]
}

function conStats(carta: CartaBalance, stats: StatsAjuste): CartaBalance {
  return { ...carta, stats: { atq: stats.poder, res: stats.resistencia } }
}

/**
 * Simula el ajuste de stats de los Campeones fuera de banda. Es pura: no muta las
 * cartas ni el seed. La v1 solo propone stats; los efectos fuera de identidad se
 * marcan, no se reescriben.
 */
export function simularAjustes(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesAjuste = {},
): ResultadoAjuste {
  const consideradas = cartas.filter((c) => opciones.incluirReferencia === true || c.esReferencia !== true)
  const pool = poolLetalidad(consideradas, cfg, opciones)
  const techos = techosDelPool(pool)

  const propuestas = new Map<string, StatsAjuste>()
  const base: { carta: CartaBalance; ev: EvaluacionPresupuesto; despues: StatsAjuste }[] = []
  for (const carta of consideradas) {
    const ev = evaluarConImpuesto(carta, cfg)
    if (ev === null || !ev.fueraDeBanda) continue
    const despues = repartir(ev.atq, ev.res, sumaObjetivo(ev), ev.banda)
    propuestas.set(carta.id, despues)
    base.push({ carta, ev, despues })
  }

  const poolDespues = pool.map((c) => {
    const p = propuestas.get(c.id)
    return p === undefined ? c : conStats(c, p)
  })

  const avisos: string[] = []
  const ajustes = base.map(({ carta, ev, despues }): Ajuste => {
    const letalidadDespues = letalidad(conStats(carta, despues), pool, cfg)
    const superaTecho = despues.poder > techos.atq || despues.resistencia > techos.res
    const avisosCarta: string[] = []
    if (despues.poder > techos.atq) {
      const mata = letalidadDespues === null ? '' : ` y mataría a ${letalidadDespues.mata} de ${letalidadDespues.total} rivales`
      avisosCarta.push(`ATQ ${despues.poder} pasa el ATQ máximo del pool (${techos.atq})${mata}`)
    }
    if (despues.resistencia > techos.res) {
      avisosCarta.push(`RES ${despues.resistencia} pasa la RES máxima del pool (${techos.res})`)
    }
    for (const a of avisosCarta) avisos.push(`${carta.id}: ${a}`)
    return {
      id: carta.id,
      nombre: carta.nombre,
      antes: { poder: ev.atq, resistencia: ev.res },
      despues,
      motivo: motivoDe(ev, carta.coste, despues),
      fueraDeIdentidad: verbosFuera(carta, cfg),
      superaTecho,
      avisos: avisosCarta,
      letalidadAntes: letalidad(carta, pool, cfg),
      letalidadDespues,
      letalidadDespuesTodos: letalidad(conStats(carta, despues), poolDespues, cfg),
    }
  })

  const fueraDeIdentidad = consideradas
    .map((c) => ({ id: c.id, verbos: verbosFuera(c, cfg) }))
    .filter((m) => m.verbos.length > 0)

  return { ajustes, fueraDeIdentidad, techos, avisos }
}

/** Devuelve cartas nuevas con los stats ajustados; las originales no se tocan. */
export function aplicarAjustes(cartas: readonly CartaBalance[], ajustes: readonly Ajuste[]): CartaBalance[] {
  const porId = new Map(ajustes.map((a) => [a.id, a.despues]))
  return cartas.map((c) => {
    const nuevo = porId.get(c.id)
    return nuevo === undefined ? c : conStats(c, nuevo)
  })
}
