import type { CardType, Rarity, Rol } from '../shared/types/enums'

/** Mazos temáticos que mide el tablero (paqueteId del seed). */
export type MazoId = 'estasis' | 'disonancia'

/** Banda de presupuesto de stats para un coste. */
export interface BandaCoste {
  sumaMin: number
  sumaMax: number
  topeAtq: number
  topeRes: number
}

/** Umbrales de la excepción para Soberanos, Emperadores y Únicas. */
export interface TopeExcepcion {
  suma: number
  atq: number
  res: number
}

export interface ConfigBalance {
  /** Versión de la configuración; viaja en la exportación JSON. */
  version: string
  /** Peso de cada stat en los puntos de stats: la RES vale más (daño >= RES mata). */
  pesos: { atq: number; res: number }
  /** Bandas por coste del Campeón. */
  bandas: Record<number, BandaCoste>
  excepciones: {
    rolesExentos: Rol[]
    rarezasExentas: Rarity[]
    tope: TopeExcepcion
  }
  /** Pesos del índice de poder de los efectos. */
  poder: {
    verbo: Record<string, number>
    tipo: Record<string, number>
    trigger: Record<string, number>
    activacion: Record<string, number>
    duracion: Record<string, number>
    objetivo: Record<string, number>
    /** Resta de poder según el tipo de costo del efecto. */
    costo: Record<string, number>
    /** Peso por defecto cuando falta el trigger, o el verbo o la duración no se conocen. */
    fallback: number
  }
  impuesto: { puntosPorPoder: number; maxImpuesto: number }
  /** Mapa verbo -> identidad por mazo; lo que no aparece es «fuera de identidad». */
  identidad: Record<MazoId, { identidad: string[]; neutral: string[] }>
  semaforo: { verde: number; amarillo: number }
  /** Poder esperado de una carta que no es Campeón = coste * este valor. */
  poderPorCoste: number
}

/** Efecto normalizado del seed. */
export interface EfectoBalance {
  /** Verbo principal; null cuando el efecto no declara ninguno. */
  verbo: string | null
  /** true si no hay verbo ni tramos que lo suplan. */
  sinVerbo: boolean
  /** Verbos aportados por los tramos del efecto (p. ej. Cassandra). */
  verbosTramos: string[]
  tipo: string
  trigger: string | null
  objetivoTipo: string | null
  /** Duración tal cual viene en el seed (puede estar fuera de la unión de tipos). */
  duracion: string | null
  costoTipo: string | null
  costoCantidad: number
  activacion: string | null
  esComandante: boolean
}

export interface StatsCampeon {
  atq: number
  res: number
}

/** Carta del seed normalizada para el tablero. */
export interface CartaBalance {
  id: string
  nombre: string
  tipo: CardType
  rareza: Rarity
  coste: number
  mazo: MazoId | null
  roles: Rol[]
  /** Solo Campeones con poder y resistencia numéricos. */
  stats: StatsCampeon | null
  efectos: EfectoBalance[]
}

export type EstadoSuma = 'dentro' | 'bajo' | 'sobre'

/** Resultado de comparar los stats de un Campeón con su presupuesto. */
export interface EvaluacionPresupuesto {
  atq: number
  res: number
  /** ATQ + RES. */
  suma: number
  /** ATQ y RES ponderados con los pesos de la config. */
  puntos: number
  /** Banda aplicada: la del coste, o el tope propio si el Campeón está exento. */
  banda: BandaCoste
  exento: boolean
  /** Impuesto de efecto que se descontó de la banda. */
  impuesto: number
  /** Suma máxima permitida tras el impuesto. */
  objetivoSuma: number
  /** suma - objetivoSuma (positivo = se pasa, negativo = le sobra espacio). */
  desvio: number
  /** Posición de la suma respecto de la banda con impuesto. */
  estado: EstadoSuma
  /** Puntos de ATQ sobre el tope individual (0 si no lo excede). */
  excesoAtq: number
  excesoRes: number
  fueraDeBanda: boolean
}

export interface CargaBalance {
  cartas: CartaBalance[]
  estasis: CartaBalance[]
  disonancia: CartaBalance[]
  campeones: CartaBalance[]
  /** Total de efectos (lista `efectos` + comandantes). */
  totalEfectos: number
  /** Avisos de datos desconocidos o incompletos, en español. */
  avisos: string[]
}
