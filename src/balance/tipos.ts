import type { CardType, Keyword, Rarity, Rol } from '../shared/types/enums'

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
    /** Peso de cada keyword; se suma una vez por keyword propia y, si la concede un efecto, por el multiplicador de objetivo. */
    keyword: Record<Keyword, number>
    /** Resta de poder según el tipo de costo del efecto. */
    costo: Record<string, number>
    /** Tope del descuento por costo de un efecto, como fracción de su poder bruto (0.5 = nunca resta más de la mitad). */
    topeCostoProporcion: number
    /** Peso por defecto cuando falta el trigger, o el verbo o la duración no se conocen. */
    fallback: number
  }
  /**
   * Impuesto de stats por efecto, forma «franquicia»: solo se paga lo que el índice
   * de poder pasa de `umbral`, a razón de `puntosPorPoder` por punto, con tope `maxImpuesto`.
   */
  impuesto: { umbral: number; puntosPorPoder: number; maxImpuesto: number }
  /** Formato de la exportación JSON. */
  exportacion: { sangria: number }
  /** Umbrales de la métrica de letalidad. */
  letalidad: { dominanteMata: number; dominanteLoMatan: number }
  /** Mapa verbo -> identidad por mazo; «fuera de identidad» es la identidad del mazo rival; lo que no aparece en ninguno es neutral. */
  identidad: Record<MazoId, { identidad: string[]; neutral: string[] }>
  semaforo: { verde: number; amarillo: number }
  /** Poder esperado de una carta que no es Campeón = coste * este valor. */
  poderPorCoste: number
  /**
   * Overrides explícitos del coste mínimo por verbo. Si un verbo aparece aquí, gana sobre
   * la fórmula por defecto ceil(peso del verbo en `poder.verbo`).
   */
  costeMinimoVerbo: Record<string, number>
  /**
   * Tipos de carta exentos del coste mínimo por verbo (p. ej. los Éteres, que cuestan 1 por diseño y
   * no pueden costar más). NO exime del tope de efecto por coste (coste × poderPorCoste).
   */
  costeMinimoExento: { tipos: string[] }
  /** Análisis de carta: cuánto se sube un stat al evaluar «puede subir» y cuándo se avisa «cerca del tope». */
  analisis: { pasoSubida: number; cercaDelTope: number }
  /** Índice de tabú: qué reglas del manual rompe cada efecto y cuánto tabú permite cada coste. Eje independiente del poder. */
  tabu: ConfigTabu
}

/** Una infracción del catálogo de tabú: su nivel (0-3) y la regla del manual que rompe, en texto corto. */
export interface ReglaTabu {
  nivel: number
  regla: string
}

/**
 * Catálogo de tabú. Las claves salen del seed: `verbo` (campo `efecto`), `regla` (`reglaEnumerada` y `regla.id`),
 * `opcion` (banderas como `sinPagarCosto`) y `keyword`. `contexto` afina un verbo según sobre qué actúa.
 */
export interface ConfigTabu {
  /** Niveles de la escala, de menor a mayor: 0 no rompe nada, 3 rompe un invariante del motor. */
  niveles: number[]
  verbo: Record<string, ReglaTabu>
  contexto: Record<string, ReglaTabu>
  regla: Record<string, ReglaTabu>
  opcion: Record<string, ReglaTabu>
  keyword: Record<Keyword, ReglaTabu>
  /** Puntos de tabú máximos que permite cada coste (a mayor tabú, mayor coste). */
  tabuMaxPorCoste: Record<number, number>
  /**
   * Bono de tabú por déficit de stats: un Campeón con menos ATQ+RES de los que su coste permite puede romper más reglas.
   * `bono = min(bonoMax, déficit × bonoPorDeficit)`, con déficit = sumaMax de su coste − impuesto de efecto − (ATQ+RES).
   */
  bonoPorDeficit: number
  /** Tope del bono de tabú por déficit de stats. */
  bonoMax: number
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
  /** `buffPerBlockedEther` del efecto: el buff cuenta una vez por cada Éter bloqueado, hasta `costoCantidad`. */
  buffPorEterBloqueado?: boolean
  activacion: string | null
  /** Keywords que concede el efecto (grant_keyword, también por tramo). */
  keywordsConcedidas: string[]
  esComandante: boolean
  /** `reglaEnumerada` del efecto (solo `modificar_regla`); solo se rellena cuando existe. */
  reglaEnumerada?: string
  /** Id de la regla del catálogo REGLAS que modifica (`regla.id`); solo cuando existe. */
  reglaCatalogo?: string
  /** `objetivo.controlador` (quién controla lo que el efecto toca); solo cuando existe. */
  objetivoControlador?: string
  /** `objetivo.controladorDestino` (a quién va lo movido); solo cuando existe. */
  controladorDestino?: string
  /** `activar_disparo` sin pagar el costo del Disparo. */
  sinPagarCosto?: boolean
  /** `activar_disparo` sin agotar al Campeón. */
  sinAgotar?: boolean
  /** Alcance del reagrupe del efecto (`todo` = todo el Éter bloqueado en la carta); solo cuando existe. */
  reagruparAlcance?: string
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
  /** Keywords impresas en la carta (no las que concede). */
  keywords: string[]
  efectos: EfectoBalance[]
  /**
   * true en las cartas del paquete de pruebas (referencia opcional). Por defecto quedan
   * fuera de métricas, pool de letalidad, ajuste y exportación.
   */
  esReferencia?: boolean
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
