import { CONFIG_V1 } from './config'
import type { OpcionesPool } from './letalidad'
import { bonoDeTabu, esExento } from './presupuesto'

export { bonoDeTabu }
import type { CartaBalance, ConfigBalance, EfectoBalance, MazoId, ReglaTabu } from './tipos'

/**
 * ÍNDICE DE TABÚ: cuántas reglas del manual rompe una carta. Es un EJE NUEVO e independiente del poder, de los stats y
 * del semáforo: nada de lo que se calcula aquí cambia ninguna otra cifra del tablero.
 *
 * Escala (la fija el diseño; los niveles de cada efecto viven en `CONFIG_V1.tabu`):
 *   0  no rompe ninguna regla del manual.
 *   1  cambia una regla que ya tiene hueco previsto (el manual o el catálogo REGLAS del motor ya nombran la excepción).
 *   2  rompe una regla escrita del manual, sin excepción nombrada.
 *   3  rompe un invariante del motor (p. ej. «el Éter nunca va al Cementerio ni al Exilio»).
 *
 * Cómo se agrega (decisión): cada efecto de la carta (también el de Comandante) aporta las «infracciones» que declara su verbo,
 * su regla, sus opciones y las keywords que concede; la carta tiene además sus keywords impresas. Cada infracción DISTINTA
 * cuenta una sola vez por carta (dos efectos que rompen la misma regla no suman dos veces).
 *   puntos   = suma de los niveles de las infracciones distintas (una carta que rompe varias reglas puntúa más).
 *   nivelMax = el nivel más alto de sus infracciones (la regla más grave que toca).
 */

export interface DetalleTabu {
  /** Clave de la infracción con su categoría: `verbo:steal_ether`, `regla:olvido_rival`, `opcion:sin_pagar_costo`... */
  efecto: string
  nivel: number
  /** La regla del manual que rompe (texto corto), tal como la declara la config. */
  regla: string
}

export interface TabuCarta {
  puntos: number
  nivelMax: number
  /** Todas las infracciones distintas de la carta, de mayor a menor nivel (las de nivel 0 son las que se clasificaron sin romper nada). */
  detalle: DetalleTabu[]
  /** Claves que la config no conoce (un efecto nuevo sin clasificar). Se tratan como nivel 0 y se avisan. */
  sinClasificar: string[]
}

type Categoria = 'verbo' | 'contexto' | 'regla' | 'opcion' | 'keyword'

const SIN_CLASIFICAR = 'Sin clasificar en la config'

/** Busca una clave `categoria:id` en la tabla de la config; null si no está clasificada. */
export function reglaDeTabu(clave: string, cfg: ConfigBalance = CONFIG_V1): ReglaTabu | null {
  const corte = clave.indexOf(':')
  const categoria = clave.slice(0, corte) as Categoria
  const id = clave.slice(corte + 1)
  const tabla = cfg.tabu[categoria] as Record<string, ReglaTabu> | undefined
  return tabla?.[id] ?? null
}

/** Nombre legible de una clave: sin la categoría (`regla:olvido_rival` → `olvido_rival`). */
export function nombreDeInfraccion(clave: string): string {
  return clave.slice(clave.indexOf(':') + 1)
}

/** Casos en que el mismo verbo rompe una regla distinta según sobre qué actúa. Devuelve la clave de `contexto`, o null. */
function contextoDe(e: EfectoBalance): string | null {
  if (e.verbo === 'mover' && e.objetivoTipo === 'eter' && (e.objetivoControlador === 'rival' || e.objetivoControlador === 'ambos')) {
    return 'contexto:mover_eter_ajeno'
  }
  if (e.verbo === 'recuperar_mano' && e.controladorDestino === 'dueno') return 'contexto:recuperar_mano_al_dueno'
  return null
}

/**
 * Infracciones de UN efecto. El verbo aporta una (la de su contexto, si la hay, sustituye a la del verbo); `modificar_regla` es solo
 * el vehículo y aporta la regla que modifica; las opciones que rompen una regla y las keywords concedidas suman la suya.
 */
export function clavesDeEfecto(e: EfectoBalance): string[] {
  const claves: string[] = []
  if (e.verbo === 'modificar_regla') {
    const regla = e.reglaEnumerada ?? e.reglaCatalogo
    claves.push(regla === undefined ? 'verbo:modificar_regla' : `regla:${regla}`)
  } else if (e.verbo !== null) {
    claves.push(contextoDe(e) ?? `verbo:${e.verbo}`)
  } else {
    for (const v of e.verbosTramos) claves.push(`verbo:${v}`)
  }
  if (e.sinPagarCosto === true) claves.push('opcion:sin_pagar_costo')
  // «Sin agotarlo» es la misma regla que `disparo_sin_agotar` (el Disparo no agota): se cuenta una sola vez.
  if (e.sinAgotar === true) claves.push('regla:disparo_sin_agotar')
  if (e.reagruparAlcance === 'todo') claves.push('opcion:reagrupar_todo')
  for (const k of e.keywordsConcedidas) claves.push(`keyword:${k}`)
  return claves
}

/** Índice de tabú de una carta (puntos, nivel máximo y detalle por infracción). Pura: no muta la carta. */
export function tabuDeCarta(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): TabuCarta {
  const claves = new Set<string>([...carta.efectos.flatMap(clavesDeEfecto), ...carta.keywords.map((k) => `keyword:${k}`)])
  const sinClasificar: string[] = []
  const detalle: DetalleTabu[] = [...claves].map((clave) => {
    const regla = reglaDeTabu(clave, cfg)
    if (regla === null) {
      sinClasificar.push(clave)
      return { efecto: clave, nivel: 0, regla: SIN_CLASIFICAR }
    }
    return { efecto: clave, nivel: regla.nivel, regla: regla.regla }
  })
  detalle.sort((a, b) => b.nivel - a.nivel)
  return {
    puntos: detalle.reduce((n, d) => n + d.nivel, 0),
    nivelMax: detalle.reduce((n, d) => Math.max(n, d.nivel), 0),
    detalle,
    sinClasificar,
  }
}

/* ───────────── presupuesto de tabú por coste ───────────── */

export type EstadoTabu = 'dentro' | 'en-limite' | 'excede' | 'exenta' | 'sin-presupuesto'

export interface EvaluacionTabu extends TabuCarta {
  /** Máximo de puntos de tabú que permite la carta (el de su coste más el bono por déficit de stats); null con coste 0 o sin fila en la tabla. */
  max: number | null
  /** Máximo que da solo su coste, sin el bono. */
  maxBase: number | null
  /** Bono de tabú por déficit de stats (0 si no tiene déficit, es exenta o no es Campeón). */
  bono: number
  /** Cuántos puntos pasa del máximo (0 si no lo pasa). */
  exceso: number
  estado: EstadoTabu
  /** Campeón con salvedad por sacrificio (Soberano, Emperador, Única): se reporta pero nunca excede. */
  exento: boolean
  /** Una carta exenta que, sin la exención, pasaría su presupuesto. Solo informativo. */
  excederiaSinExencion: boolean
}

export const ETIQUETA_ESTADO_TABU: Record<EstadoTabu, string> = {
  dentro: 'Dentro del presupuesto de tabú',
  'en-limite': 'En el límite del presupuesto de tabú',
  excede: 'Excede el presupuesto de tabú',
  exenta: 'Exenta del presupuesto de tabú',
  'sin-presupuesto': 'Sin presupuesto de tabú',
}

/**
 * «A mayor tabú, mayor coste»: la carta puede gastar hasta `tabuMaxPorCoste[coste]` puntos más su bono por déficit de stats.
 * Excede si pasa el máximo; en el límite si ya no puede sumar otro punto entero (con al menos 1 punto); dentro en otro caso. Mismas exenciones que el tope de efecto
 * por coste: un Campeón Soberano, Emperador o Única se reporta como «exenta» y nunca excede; coste 0 (Vínculos) no tiene veredicto.
 * Los Éteres NO se eximen: cuestan 1 y no pueden subir, así que todo lo que rompan lo pagan con su presupuesto de coste 1.
 */
export function evaluarTabu(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): EvaluacionTabu {
  const tabu = tabuDeCarta(carta, cfg)
  const maxBase = carta.coste < 1 ? null : (cfg.tabu.tabuMaxPorCoste[carta.coste] ?? null)
  const bono = maxBase === null ? 0 : bonoDeTabu(carta, cfg)
  const max = maxBase === null ? null : Math.round((maxBase + bono) * 10) / 10
  const exceso = max === null ? 0 : Math.max(0, tabu.puntos - max)
  const exento = carta.tipo === 'Campeón' && esExento(carta, cfg)
  let estado: EstadoTabu
  if (max === null) estado = 'sin-presupuesto'
  else if (exento) estado = 'exenta'
  else if (exceso > 0) estado = 'excede'
  else estado = tabu.puntos === Math.floor(max) && tabu.puntos > 0 ? 'en-limite' : 'dentro'
  return { ...tabu, max, maxBase, bono, exceso, estado, exento, excederiaSinExencion: exento && exceso > 0 }
}

/* ───────────── resumen por mazo ───────────── */

export interface ResumenTabuMazo {
  mazo: MazoId
  cartas: number
  /** Suma de los puntos de tabú de todas sus cartas. */
  total: number
  /** Tabú medio por carta (2 decimales); null sin cartas. */
  medio: number | null
  /** Cartas por nivel máximo (una entrada por cada nivel de la config, aunque sea 0). */
  porNivel: Record<number, number>
  /** Cartas que exceden su presupuesto de tabú. */
  excede: number
  enLimite: number
  /** Exentas que excederían sin la exención (informativo). */
  exentasQueExcederian: number
}

const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']

export function resumenTabuPorMazo(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): ResumenTabuMazo[] {
  const base = cartas.filter((c) => opciones.incluirReferencia === true || c.esReferencia !== true)
  return MAZOS.map((mazo) => {
    const evals = base.filter((c) => c.mazo === mazo).map((c) => evaluarTabu(c, cfg))
    const porNivel: Record<number, number> = Object.fromEntries(cfg.tabu.niveles.map((n) => [n, 0]))
    for (const ev of evals) porNivel[ev.nivelMax] = (porNivel[ev.nivelMax] ?? 0) + 1
    const total = evals.reduce((n, ev) => n + ev.puntos, 0)
    return {
      mazo,
      cartas: evals.length,
      total,
      medio: evals.length === 0 ? null : Math.round((total / evals.length) * 100) / 100,
      porNivel,
      excede: evals.filter((ev) => ev.estado === 'excede').length,
      enLimite: evals.filter((ev) => ev.estado === 'en-limite').length,
      exentasQueExcederian: evals.filter((ev) => ev.excederiaSinExencion).length,
    }
  })
}
