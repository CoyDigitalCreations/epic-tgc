import { simularAjustes } from './ajuste'
import type { Ajuste } from './ajuste'
import type { AnyCard } from '../shared/types'
import { CONFIG_V1 } from './config'
import { evaluarEfectoPorCoste } from './efectoPorCoste'
import { clasificarEfecto, clasificarVerbo } from './identidad'
import type { ClaseIdentidad } from './identidad'
import { letalidad, poolLetalidad, techosDelPool } from './letalidad'
import type { Letalidad } from './letalidad'
import { semaforoDe } from './metricas'
import type { Semaforo } from './metricas'
import { componentesDeEfecto, poderDeCarta } from './poderEfecto'
import { efectosComandante } from '../shared/efectoComandante'
import type { ComponentesEfecto, PoderKeyword } from './poderEfecto'
import { evaluarConImpuesto } from './presupuesto'
import { evaluarTabu } from './tabu'
import type { EvaluacionTabu } from './tabu'
import type { CartaBalance, ConfigBalance, EvaluacionPresupuesto } from './tipos'

/** Estado de un stat dentro del análisis. `Semaforo` y `semaforoDe` no cambian: este tipo vive solo aquí. */
export type SemaforoStat = 'verde' | 'amarillo' | 'rojo' | 'bajo' | 'exenta'

export type EstadoAnalisis = 'excede' | 'bajo-banda' | 'en-limite' | 'dentro' | 'exenta' | 'sin-semaforo'

export interface MargenStat {
  stat: 'atq' | 'res' | 'suma'
  valor: number
  /** Tope individual, o suma objetivo (ya con impuesto) en `suma`. */
  tope: number
  /** Mínimo de la suma con impuesto; null en ATQ, RES y exentas. */
  minimo: number | null
  /** tope − valor (negativo = se pasa). */
  holgura: number
  estado: SemaforoStat
  /** Texto visible del estado (no solo color). */
  texto: string
  /** Cuánto se puede subir sin pasar el presupuesto; null en exentas. */
  puedeSubir: number | null
  /** ATQ o RES más altos del pool de letalidad; null en la suma. */
  techoPool: number | null
  /** Subir `pasoSubida` pasaría el techo del pool: solo un aviso, no cambia `puedeSubir`. */
  superaTecho: boolean
  /** Rivales extra que mata (ATQ) o que dejan de matarla (RES) al subir un paso; null en la suma. */
  ganancia: { mata: number; loMatan: number } | null
}

export interface ContextoAnalisis {
  pool: CartaBalance[]
  techos: { atq: number; res: number }
  ajustes: Map<string, Ajuste>
}

export interface DesgloseEfecto {
  indice: number
  texto: string | null
  esComandante: boolean
  verbo: string | null
  sinVerbo: boolean
  clase: ClaseIdentidad | null
  componentes: ComponentesEfecto
}

export interface DesglosePoder {
  efectos: DesgloseEfecto[]
  keywords: PoderKeyword[]
  totalBruto: number
  indice: number
  esperado: number | null
  holgura: number | null
}

export type { EvaluacionPresupuesto, Letalidad }

/** Redondeo a 2 decimales: evita que el ruido flotante cambie un estado al comparar. */
const redondear = (n: number): number => Math.round(n * 100) / 100

const TEXTO_ESTADO: Record<SemaforoStat, string> = {
  verde: 'Dentro del rango',
  amarillo: 'Cerca del tope',
  rojo: 'Excede el tope',
  bajo: 'Bajo banda: puede subir',
  exenta: 'Exenta: tope propio',
}

/** ATQ y RES solo tienen tope (no hay mínimo por stat): rojo, amarillo o verde, nunca «bajo». */
function estadoPorTope(holgura: number, cfg: ConfigBalance): SemaforoStat {
  if (holgura < 0) return 'rojo'
  return holgura <= cfg.analisis.cercaDelTope ? 'amarillo' : 'verde'
}

function margen(base: Omit<MargenStat, 'texto' | 'techoPool' | 'superaTecho' | 'ganancia'>): MargenStat {
  return { ...base, texto: TEXTO_ESTADO[base.estado], techoPool: null, superaTecho: false, ganancia: null }
}

/**
 * Márgenes de ATQ, RES y suma de un Campeón contra su presupuesto (con impuesto).
 * Devuelve [] si la carta no tiene stats o presupuesto. Los exentos se miden contra su tope propio.
 */
export function margenesDeStats(carta: CartaBalance, ctx: ContextoAnalisis, cfg: ConfigBalance = CONFIG_V1): MargenStat[] {
  const ev = evaluarConImpuesto(carta, cfg)
  if (ev === null) return []

  const holguraSuma = redondear(ev.objetivoSuma - ev.suma)
  const libreSuma = Math.floor(holguraSuma)
  const minimoSuma = ev.exento ? null : redondear(Math.max(0, ev.banda.sumaMin - ev.impuesto))

  const paso = cfg.analisis.pasoSubida
  const actual = letalidad(carta, ctx.pool, cfg)
  const subiendo = (stat: 'atq' | 'res') =>
    carta.stats === null ? null : letalidad({ ...carta, stats: { ...carta.stats, [stat]: carta.stats[stat] + paso } }, ctx.pool, cfg)

  const deStat = (stat: 'atq' | 'res', valor: number, tope: number): MargenStat => {
    const holgura = redondear(tope - valor)
    const despues = subiendo(stat)
    const techoPool = ctx.techos[stat]
    const ganancia =
      actual === null || despues === null
        ? null
        : stat === 'atq'
          ? { mata: despues.mata - actual.mata, loMatan: 0 }
          : { mata: 0, loMatan: actual.loMatan - despues.loMatan }
    return {
      ...margen({
      stat,
      valor,
      tope,
      minimo: null,
      holgura,
      estado: ev.exento ? 'exenta' : estadoPorTope(holgura, cfg),
      puedeSubir: ev.exento ? null : Math.max(0, Math.min(Math.floor(holgura), libreSuma)),
      }),
      techoPool,
      superaTecho: valor + paso > techoPool,
      ganancia,
    }
  }

  let estadoSuma: SemaforoStat
  if (ev.exento) estadoSuma = 'exenta'
  else if (holguraSuma < 0) estadoSuma = 'rojo'
  else if (minimoSuma !== null && ev.suma < minimoSuma) estadoSuma = 'bajo'
  else estadoSuma = holguraSuma <= cfg.analisis.cercaDelTope ? 'amarillo' : 'verde'

  return [
    deStat('atq', ev.atq, ev.banda.topeAtq),
    deStat('res', ev.res, ev.banda.topeRes),
    margen({
      stat: 'suma',
      valor: ev.suma,
      tope: ev.objetivoSuma,
      minimo: minimoSuma,
      holgura: holguraSuma,
      estado: estadoSuma,
      puedeSubir: ev.exento ? null : Math.max(0, libreSuma),
    }),
  ]
}

export interface EstadoGeneral {
  estado: EstadoAnalisis
  etiqueta: string
}

/**
 * Poder de una carta efecto por efecto y keyword por keyword. `textos` va alineado por
 * índice con `carta.efectos` (el Comandante, al final); un texto que falta queda en null.
 */
export function desgloseDePoder(carta: CartaBalance, textos: readonly (string | null)[], cfg: ConfigBalance = CONFIG_V1): DesglosePoder {
  const efectos = carta.efectos.map((e, i): DesgloseEfecto => ({
    indice: i,
    texto: textos[i] ?? null,
    esComandante: e.esComandante,
    verbo: e.verbo,
    sinVerbo: e.sinVerbo,
    clase: carta.mazo === null ? null : clasificarEfecto(e, carta.mazo, cfg),
    componentes: componentesDeEfecto(e, cfg),
  }))
  const { indice, keywords } = poderDeCarta(carta, cfg)
  const totalBruto = efectos.reduce((n, e) => n + e.componentes.poder, 0) + keywords.reduce((n, k) => n + k.peso, 0)

  // Sin stats ni presupuesto por coste se compara contra el poder esperado; Vínculos y coste 0 no tienen con qué.
  const comparable = evaluarConImpuesto(carta, cfg) === null && carta.tipo !== 'Vínculo' && carta.coste > 0
  const esperado = comparable ? carta.coste * cfg.poderPorCoste : null
  return { efectos, keywords, totalBruto, indice, esperado, holgura: esperado === null ? null : redondear(esperado - indice) }
}

const ETIQUETA_ESTADO: Record<EstadoAnalisis, string> = {
  excede: 'Excede el presupuesto',
  'bajo-banda': TEXTO_ESTADO.bajo,
  'en-limite': 'En el límite del presupuesto',
  dentro: 'Dentro del presupuesto',
  exenta: 'Exenta del presupuesto por coste',
  'sin-semaforo': 'Sin semáforo',
}

const COLOR_A_ESTADO: Record<Semaforo, EstadoAnalisis> = { verde: 'dentro', amarillo: 'en-limite', rojo: 'excede' }

/**
 * Estado general: rojo en algún stat excede; luego bajo banda, en el límite, exenta o dentro. Sin stats,
 * el color de `semaforoDe`. Una carta que no pasa el chequeo de efecto por coste nunca queda en un
 * estado favorable: sube a «excede» (la razón visible sale de `razonesDeCarta`).
 */
export function estadoDeCarta(
  carta: CartaBalance,
  margenes: readonly MargenStat[],
  desglose: DesglosePoder,
  cfg: ConfigBalance = CONFIG_V1,
): EstadoGeneral {
  const base = estadoBase(carta, margenes, desglose, cfg)
  if (base.estado === 'excede' || evaluarEfectoPorCoste(carta, cfg).ok) return base
  return { estado: 'excede', etiqueta: ETIQUETA_ESTADO.excede }
}

function estadoBase(
  carta: CartaBalance,
  margenes: readonly MargenStat[],
  desglose: DesglosePoder,
  cfg: ConfigBalance = CONFIG_V1,
): EstadoGeneral {
  const con = (estado: EstadoAnalisis): EstadoGeneral => ({ estado, etiqueta: ETIQUETA_ESTADO[estado] })
  if (margenes.length > 0) {
    const estados = margenes.map((m) => m.estado)
    if (estados.includes('rojo')) return con('excede')
    if (estados.includes('bajo')) return con('bajo-banda')
    if (estados.includes('amarillo')) return con('en-limite')
    return con(estados.includes('exenta') ? 'exenta' : 'dentro')
  }
  if (desglose.esperado === null) return con('sin-semaforo')
  return con(COLOR_A_ESTADO[semaforoDe(carta, cfg).semaforo])
}

/**
 * Lo caro del análisis, calculado una sola vez para todas las cartas: pool de letalidad,
 * techos y ajustes propuestos. Solo cuenta las publicadas: la referencia nunca entra.
 */
export function contextoDeAnalisis(publicadas: readonly CartaBalance[], cfg: ConfigBalance = CONFIG_V1): ContextoAnalisis {
  const propias = publicadas.filter((c) => c.esReferencia !== true)
  const pool = poolLetalidad(propias, cfg)
  const { ajustes } = simularAjustes(propias, cfg)
  return { pool, techos: techosDelPool(pool), ajustes: new Map(ajustes.map((a) => [a.id, a])) }
}

/** Textos de los efectos de una carta, en el mismo orden que `CartaBalance.efectos`: el Comandante va al final. */
export function textosDeEfectos(card: AnyCard | undefined): (string | null)[] {
  if (card === undefined) return []
  const textos = (card.efectos ?? []).map((e) => e.texto ?? null)
  if (card.type === 'Campeón') for (const e of efectosComandante(card.efectoComandante)) textos.push(e.texto ?? null)
  return textos
}

export interface Razon {
  nivel: 'error' | 'aviso' | 'info'
  texto: string
}

const NOMBRE_STAT: Record<MargenStat['stat'], string> = { atq: 'ATQ', res: 'RES', suma: 'suma' }
const decimal = (n: number): string => n.toFixed(1)

/** Cita los efectos que pagan impuesto, con su texto cuando se conoce. */
function citaDeEfectos(desglose: DesglosePoder): string {
  return desglose.efectos
    .filter((e) => e.componentes.poder > 0)
    .map((e) => `«${e.texto ?? e.verbo ?? 'efecto sin texto'}» (poder ${decimal(e.componentes.poder)})`)
    .join('; ')
}

/** Cómo cambia cada stat en el ajuste exploratorio: de ahí sale «qué stat causa el exceso». */
function razonesDeAjuste(m: MargenStat, ajuste: Ajuste): Razon | null {
  if (m.stat === 'suma') return null
  const antes = m.stat === 'atq' ? ajuste.antes.poder : ajuste.antes.resistencia
  const despues = m.stat === 'atq' ? ajuste.despues.poder : ajuste.despues.resistencia
  if (antes === despues) return null
  const nombre = NOMBRE_STAT[m.stat]
  const verbo = despues < antes ? 'baja' : 'sube'
  return { nivel: 'info', texto: `El ajuste exploratorio ${verbo} ${nombre} de ${antes} a ${despues}; ahí está el origen de la diferencia con el presupuesto.` }
}

/**
 * Frases en español neutro de México que explican por qué una carta se sale de rango.
 * Una carta dentro de rango o exenta no tiene razones. El «qué stat causa el exceso» se lee
 * del `Ajuste` de `simularAjustes` (después − antes por stat); aquí no se repite su lógica.
 */
export function razonesDeCarta(
  carta: CartaBalance,
  margenes: readonly MargenStat[],
  desglose: DesglosePoder,
  ajuste: Ajuste | null,
  _ctx: ContextoAnalisis,
  cfg: ConfigBalance = CONFIG_V1,
): Razon[] {
  const razones: Razon[] = []

  if (margenes.length === 0) {
    const { estado } = estadoBase(carta, margenes, desglose, cfg)
    if (estado === 'sin-semaforo') razones.push({ nivel: 'info', texto: 'Sin coste: no hay poder esperado comparable.' })
    if ((estado === 'excede' || estado === 'en-limite') && desglose.esperado !== null) {
      const texto = `Su poder ${decimal(desglose.indice)} ${estado === 'excede' ? 'pasa el' : 'está en el límite del'} poder esperado ${decimal(desglose.esperado)} (coste ${carta.coste} por ${cfg.poderPorCoste}).`
      razones.push({ nivel: estado === 'excede' ? 'error' : 'aviso', texto })
    }
    return [...razones, ...razonesDeEfectoPorCoste(carta, cfg)]
  }

  const ev = evaluarConImpuesto(carta, cfg)
  for (const m of margenes) {
    const nombre = NOMBRE_STAT[m.stat]
    if (m.estado === 'verde' || m.estado === 'exenta') continue
    if (m.estado === 'rojo') {
      const texto =
        m.stat === 'suma'
          ? `La suma ${m.valor} pasa el máximo de ${m.tope}${ev !== null && ev.impuesto > 0 ? ` (la banda de coste ${carta.coste} llega a ${ev.banda.sumaMax}, pero el impuesto de efecto ${decimal(ev.impuesto)} lo baja)` : ''}.`
          : `${nombre} ${m.valor} pasa el tope de ${m.tope} para coste ${carta.coste} (exceso ${redondear(-m.holgura)}).`
      razones.push({ nivel: 'error', texto })
    } else if (m.estado === 'bajo') {
      razones.push({ nivel: 'aviso', texto: `La suma ${m.valor} queda por debajo del mínimo de ${m.minimo ?? 0} para coste ${carta.coste}: puede subir hasta ${m.puedeSubir ?? 0}.` })
    } else {
      razones.push({ nivel: 'info', texto: `${nombre} ${m.valor} está a ${m.holgura} de su límite de ${m.tope}: cerca del tope.` })
    }
    const deAjuste = ajuste === null ? null : razonesDeAjuste(m, ajuste)
    if (deAjuste !== null) razones.push(deAjuste)
  }

  if (ev !== null && ev.impuesto > 0 && margenes.some((m) => m.estado === 'rojo')) {
    razones.push({
      nivel: 'info',
      texto: `El poder ${decimal(desglose.indice)} de sus efectos cobra un impuesto de ${decimal(ev.impuesto)} a la suma máxima: ${citaDeEfectos(desglose)}.`,
    })
  }
  return [...razones, ...razonesDeEfectoPorCoste(carta, cfg)]
}

/** Razones del tope de efecto por coste y del coste mínimo por verbo. Una carta exenta no genera ninguna. */
function razonesDeEfectoPorCoste(carta: CartaBalance, cfg: ConfigBalance): Razon[] {
  const ev = evaluarEfectoPorCoste(carta, cfg)
  if (ev.exento || ev.indiceMax === null) return []
  const razones: Razon[] = []
  if (ev.aplicaTope && ev.excesoIndice > 0) {
    razones.push({
      nivel: 'error',
      texto: `Su índice de efecto ${decimal(ev.indice)} pasa el tope de efecto ${decimal(ev.indiceMax)} (coste ${carta.coste} × ${cfg.poderPorCoste}).`,
    })
  }
  for (const v of ev.verbosBajoCosto) {
    razones.push({ nivel: 'error', texto: `El verbo ${v.verbo} exige coste mínimo ${v.costeMinimo}, pero la carta cuesta ${carta.coste}.` })
  }
  return razones
}

export interface AnalisisCarta {
  id: string
  nombre: string
  esReferencia: boolean
  estado: EstadoAnalisis
  etiqueta: string
  /** «según CONFIG_V1 (borrador)»: los números dependen de la config. */
  config: string
  presupuesto: EvaluacionPresupuesto | null
  margenes: MargenStat[]
  desglose: DesglosePoder
  /** Índice de tabú contra el presupuesto de su coste: eje aparte, no cambia el estado ni las razones. */
  tabu: EvaluacionTabu
  letalidad: Letalidad | null
  ajuste: Ajuste | null
  etiquetaAjuste: string | null
  fueraDeIdentidad: string[]
  razones: Razon[]
}

/** Verbos de los efectos que son identidad del mazo rival (solo se marcan, no se reescriben). */
function verbosFueraDeIdentidad(carta: CartaBalance, cfg: ConfigBalance): string[] {
  if (carta.mazo === null) return []
  const mazo = carta.mazo
  const verbos = carta.efectos.flatMap((e) => (e.verbo !== null ? [e.verbo] : e.verbosTramos))
  return [...new Set(verbos.filter((v) => clasificarVerbo(v, mazo, cfg) === 'fuera'))]
}

/**
 * Análisis completo de una carta: márgenes por stat, estado, desglose del poder, letalidad,
 * ajuste exploratorio y razones. Pura: no muta la carta ni el contexto. `textos` va alineado
 * por índice con `carta.efectos` (ver `textosDeEfectos`). Una carta de referencia se analiza
 * contra el pool de las publicadas, sin ajuste y sin entrar al pool.
 */
export function analizarCarta(
  carta: CartaBalance,
  ctx: ContextoAnalisis,
  textos: readonly (string | null)[],
  cfg: ConfigBalance = CONFIG_V1,
): AnalisisCarta {
  const margenes = margenesDeStats(carta, ctx, cfg)
  const desglose = desgloseDePoder(carta, textos, cfg)
  const esReferencia = carta.esReferencia === true
  const ajuste = esReferencia ? null : (ctx.ajustes.get(carta.id) ?? null)
  const { estado, etiqueta } = estadoDeCarta(carta, margenes, desglose, cfg)
  return {
    id: carta.id,
    nombre: carta.nombre,
    esReferencia,
    estado,
    etiqueta,
    config: `según CONFIG_${cfg.version.toUpperCase()} (borrador)`,
    presupuesto: evaluarConImpuesto(carta, cfg),
    margenes,
    desglose,
    tabu: evaluarTabu(carta, cfg),
    letalidad: letalidad(carta, ctx.pool, cfg),
    ajuste,
    etiquetaAjuste: ajuste === null ? null : 'Exploratorio',
    fueraDeIdentidad: verbosFueraDeIdentidad(carta, cfg),
    razones: razonesDeCarta(carta, margenes, desglose, ajuste, ctx, cfg),
  }
}
