import type { CardType, Rarity } from '../shared/types/enums'
import { CONFIG_V1 } from './config'
import { clasificarVerbo, resumenIdentidad } from './identidad'
import type { ClaseIdentidad, ResumenIdentidad } from './identidad'
import type { OpcionesPool } from './letalidad'
import { poderDeCarta } from './poderEfecto'
import { esExento, evaluarConImpuesto, impuestoDe } from './presupuesto'
import type { CartaBalance, ConfigBalance, EvaluacionPresupuesto, MazoId } from './tipos'

const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']

/* ───────────── filtros ───────────── */

export interface FiltrosBalance {
  mazo: MazoId | null
  tipo: CardType | null
  coste: number | null
  rareza: Rarity | null
}

export const FILTROS_VACIOS: FiltrosBalance = { mazo: null, tipo: null, coste: null, rareza: null }

/** Quita las cartas de referencia (paquete de pruebas) salvo que se pidan. */
function sinReferencia(cartas: readonly CartaBalance[], opciones: OpcionesPool): CartaBalance[] {
  return cartas.filter((c) => opciones.incluirReferencia === true || c.esReferencia !== true)
}

/** Aplica los filtros combinables del tablero. La referencia queda fuera por defecto. */
export function filtrarCartas(
  cartas: readonly CartaBalance[],
  filtros: FiltrosBalance,
  opciones: OpcionesPool = {},
): CartaBalance[] {
  return sinReferencia(cartas, opciones).filter(
    (c) =>
      (filtros.mazo === null || c.mazo === filtros.mazo) &&
      (filtros.tipo === null || c.tipo === filtros.tipo) &&
      (filtros.coste === null || c.coste === filtros.coste) &&
      (filtros.rareza === null || c.rareza === filtros.rareza),
  )
}

/* ───────────── evaluación por carta ───────────── */

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

export interface EvaluacionCarta {
  id: string
  nombre: string
  tipo: CardType
  rareza: Rarity
  coste: number
  mazo: MazoId | null
  /** Índice de poder de efectos y keywords. */
  indice: number
  /** Impuesto de stats por efecto (solo Campeones no exentos). */
  impuesto: number
  presupuesto: EvaluacionPresupuesto | null
  /** Cuánto se pasa de lo esperado (negativo = le sobra espacio). */
  desvio: number
  semaforo: Semaforo
  /** Pasa su presupuesto: Campeón sobre la suma objetivo o sobre un tope, o semáforo rojo. */
  rota: boolean
}

function colorDe(desvio: number, cfg: ConfigBalance): Semaforo {
  if (desvio <= cfg.semaforo.verde) return 'verde'
  return desvio <= cfg.semaforo.amarillo ? 'amarillo' : 'rojo'
}

/**
 * Desvío y semáforo de una carta. Un Campeón se mide por cuánto su suma pasa de la
 * suma objetivo (o por su exceso de tope); el resto, por cuánto su poder pasa del
 * esperado para su coste (coste × poderPorCoste).
 */
export function semaforoDe(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): { desvio: number; semaforo: Semaforo } {
  const ev = evaluarConImpuesto(carta, cfg)
  const desvio =
    ev !== null
      ? Math.max(ev.desvio, ev.excesoAtq, ev.excesoRes)
      : poderDeCarta(carta, cfg).indice - carta.coste * cfg.poderPorCoste
  return { desvio, semaforo: colorDe(desvio, cfg) }
}

export function evaluarCarta(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): EvaluacionCarta {
  const presupuesto = evaluarConImpuesto(carta, cfg)
  const { desvio, semaforo } = semaforoDe(carta, cfg)
  const pasaPresupuesto =
    presupuesto !== null && (presupuesto.estado === 'sobre' || presupuesto.excesoAtq > 0 || presupuesto.excesoRes > 0)
  return {
    id: carta.id,
    nombre: carta.nombre,
    tipo: carta.tipo,
    rareza: carta.rareza,
    coste: carta.coste,
    mazo: carta.mazo,
    indice: poderDeCarta(carta, cfg).indice,
    impuesto: impuestoDe(carta, cfg),
    presupuesto,
    desvio,
    semaforo,
    rota: presupuesto === null ? semaforo === 'rojo' : pasaPresupuesto,
  }
}

export function evaluarCartas(cartas: readonly CartaBalance[], cfg: ConfigBalance = CONFIG_V1): EvaluacionCarta[] {
  return cartas.map((c) => evaluarCarta(c, cfg))
}

/* ───────────── utilidades ───────────── */

/** Promedio con dos decimales; null si no hay valores (nunca NaN). */
function promedio(valores: readonly number[]): number | null {
  if (valores.length === 0) return null
  return Math.round((valores.reduce((n, v) => n + v, 0) / valores.length) * 100) / 100
}

const porIndice = <T extends { coste: number }>(a: T, b: T) => a.coste - b.coste

/* ───────────── resumen por mazo ───────────── */

export interface ResumenMazo {
  mazo: MazoId
  cartas: number
  campeones: number
  identidad: ResumenIdentidad
  /** Campeones fuera de banda. */
  fueraDeBanda: number
  /** Cartas que pasan su presupuesto. */
  rotas: number
}

export function resumenPorMazo(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): ResumenMazo[] {
  const base = sinReferencia(cartas, opciones)
  return MAZOS.map((mazo) => {
    const delMazo = base.filter((c) => c.mazo === mazo)
    const evals = evaluarCartas(delMazo, cfg)
    return {
      mazo,
      cartas: delMazo.length,
      campeones: delMazo.filter((c) => c.tipo === 'Campeón').length,
      identidad: resumenIdentidad(delMazo, mazo, cfg),
      fueraDeBanda: evals.filter((e) => e.presupuesto?.fueraDeBanda === true).length,
      rotas: evals.filter((e) => e.rota).length,
    }
  })
}

/* ───────────── suma por coste, rareza y mazo ───────────── */

export type CriterioGrupo = 'coste' | 'rareza' | 'mazo'

export interface GrupoMetricas {
  clave: string
  conteo: number
  /** Promedios de Campeones con stats; null si el grupo no tiene ninguno. */
  promedioAtq: number | null
  promedioRes: number | null
  promedioSuma: number | null
  /** Índice de poder medio de todas las cartas del grupo. */
  promedioPoder: number | null
  fueraDeBanda: number
}

function claveDe(c: CartaBalance, criterio: CriterioGrupo): string {
  if (criterio === 'coste') return String(c.coste)
  if (criterio === 'rareza') return c.rareza
  return c.mazo ?? 'sin mazo'
}

export function agruparPor(
  cartas: readonly CartaBalance[],
  criterio: CriterioGrupo,
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): GrupoMetricas[] {
  const grupos = new Map<string, CartaBalance[]>()
  for (const c of sinReferencia(cartas, opciones)) {
    const clave = claveDe(c, criterio)
    grupos.set(clave, [...(grupos.get(clave) ?? []), c])
  }
  const filas = [...grupos.entries()].map(([clave, lista]): GrupoMetricas => {
    const conStats = lista.filter((c) => c.stats !== null)
    return {
      clave,
      conteo: lista.length,
      promedioAtq: promedio(conStats.map((c) => c.stats?.atq ?? 0)),
      promedioRes: promedio(conStats.map((c) => c.stats?.res ?? 0)),
      promedioSuma: promedio(conStats.map((c) => (c.stats?.atq ?? 0) + (c.stats?.res ?? 0))),
      promedioPoder: promedio(lista.map((c) => poderDeCarta(c, cfg).indice)),
      fueraDeBanda: lista.filter((c) => evaluarConImpuesto(c, cfg)?.fueraDeBanda === true).length,
    }
  })
  return filas.sort((a, b) => a.clave.localeCompare(b.clave, 'es', { numeric: true }))
}

/* ───────────── curva de coste y rareza ───────────── */

export interface PuntoCurva {
  coste: number
  total: number
  porRareza: Record<string, number>
}

export function curvaCoste(cartas: readonly CartaBalance[], opciones: OpcionesPool = {}): PuntoCurva[] {
  const puntos = new Map<number, PuntoCurva>()
  for (const c of sinReferencia(cartas, opciones)) {
    const p = puntos.get(c.coste) ?? { coste: c.coste, total: 0, porRareza: {} }
    p.total += 1
    p.porRareza[c.rareza] = (p.porRareza[c.rareza] ?? 0) + 1
    puntos.set(c.coste, p)
  }
  return [...puntos.values()].sort(porIndice)
}

/* ───────────── mapa mazo × verbo ───────────── */

export interface FilaVerbo {
  verbo: string
  estasis: number
  disonancia: number
  total: number
  /** Eje de identidad: qué es este verbo para cada mazo. */
  claseEstasis: ClaseIdentidad
  claseDisonancia: ClaseIdentidad
}

export function mapaVerbos(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): FilaVerbo[] {
  const cuenta = new Map<string, Record<MazoId, number>>()
  for (const c of sinReferencia(cartas, opciones)) {
    if (c.mazo === null) continue
    const mazo = c.mazo
    for (const e of c.efectos) {
      for (const verbo of e.verbo !== null ? [e.verbo] : e.verbosTramos) {
        const fila = cuenta.get(verbo) ?? { estasis: 0, disonancia: 0 }
        fila[mazo] += 1
        cuenta.set(verbo, fila)
      }
    }
  }
  return [...cuenta.entries()]
    .map(([verbo, n]): FilaVerbo => ({
      verbo,
      estasis: n.estasis,
      disonancia: n.disonancia,
      total: n.estasis + n.disonancia,
      claseEstasis: clasificarVerbo(verbo, 'estasis', cfg),
      claseDisonancia: clasificarVerbo(verbo, 'disonancia', cfg),
    }))
    .sort((a, b) => b.total - a.total || a.verbo.localeCompare(b.verbo, 'es'))
}

/* ───────────── ranking de poder ───────────── */

/** Todas las cartas por índice de poder descendente, con su semáforo. */
export function rankingPoder(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): EvaluacionCarta[] {
  return evaluarCartas(sinReferencia(cartas, opciones), cfg).sort(
    (a, b) => b.indice - a.indice || a.id.localeCompare(b.id, 'es'),
  )
}

/* ───────────── espejo Estásis vs Disonancia ───────────── */

export interface EspejoMazo {
  conteo: number
  sumaMedia: number | null
  poderMedio: number | null
  porcentajeIdentidad: number
}

export function espejo(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): Record<MazoId, EspejoMazo> {
  const base = sinReferencia(cartas, opciones)
  const de = (mazo: MazoId): EspejoMazo => {
    const delMazo = base.filter((c) => c.mazo === mazo)
    return {
      conteo: delMazo.length,
      sumaMedia: promedio(delMazo.filter((c) => c.stats !== null).map((c) => (c.stats?.atq ?? 0) + (c.stats?.res ?? 0))),
      poderMedio: promedio(delMazo.map((c) => poderDeCarta(c, cfg).indice)),
      porcentajeIdentidad: resumenIdentidad(delMazo, mazo, cfg).porcentaje,
    }
  }
  return { estasis: de('estasis'), disonancia: de('disonancia') }
}

/* ───────────── promedio por coste ───────────── */

export interface PromedioCoste {
  coste: number
  conteo: number
  sumaMedia: number | null
}

/** Suma media de los Campeones por coste. Los exentos (Únicas, Soberanos) se dejan fuera: viven fuera de la banda. */
export function promedioPorCoste(
  cartas: readonly CartaBalance[],
  cfg: ConfigBalance = CONFIG_V1,
  opciones: OpcionesPool = {},
): PromedioCoste[] {
  const campeones = sinReferencia(cartas, opciones).filter(
    (c) => c.tipo === 'Campeón' && c.stats !== null && !esExento(c, cfg),
  )
  const costes = [...new Set(campeones.map((c) => c.coste))].sort((a, b) => a - b)
  return costes.map((coste) => {
    const lista = campeones.filter((c) => c.coste === coste)
    return {
      coste,
      conteo: lista.length,
      sumaMedia: promedio(lista.map((c) => (c.stats?.atq ?? 0) + (c.stats?.res ?? 0))),
    }
  })
}
