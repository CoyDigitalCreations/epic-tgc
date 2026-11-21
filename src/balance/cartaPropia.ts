import type { AnyCard } from '../shared/types'
import { analizarCarta, textosDeEfectos } from './analisisCarta'
import type { AnalisisCarta, ContextoAnalisis } from './analisisCarta'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { limitesDeCarta } from './limitesCarta'
import type { LimiteCarta } from './limitesCarta'
import type { CartaBalance, ConfigBalance } from './tipos'

/** Una carta del Card-Maker ya medida contra el balance. */
export interface CartaPropiaAnalizada {
  carta: CartaBalance
  analisis: AnalisisCarta
  /** Cada presupuesto e índice de la carta, con lo que usa y lo que puede. */
  limites: LimiteCarta[]
  /** Datos que le faltan o que el balanceador no conoce (keyword o duración desconocidas, efecto sin verbo...). */
  avisos: string[]
}

/**
 * Contexto sin pool: la carta se mide solo contra SUS presupuestos (stats, impuesto de efecto, tabú, efecto por coste), no contra las demás.
 * Así no hay letalidad ni ajuste propuesto, que solo tienen sentido contra el pool completo del Tablero.
 */
const CONTEXTO_SIN_POOL: ContextoAnalisis = { pool: [], techos: { atq: 0, res: 0 }, ajustes: new Map() }

/**
 * Mide una carta del Card-Maker (`AnyCard`) con el mismo balanceador del Tablero. Pura y sin dependencias de la interfaz: no lanza
 * con una carta a medio hacer (lo que falte queda en `avisos` y se mide con los valores por defecto).
 */
export function analizarCartaPropia(card: AnyCard, cfg: ConfigBalance = CONFIG_V1): CartaPropiaAnalizada {
  const carga = cargarCartas([card], cfg)
  const carta = carga.cartas[0]
  return {
    carta,
    analisis: analizarCarta(carta, CONTEXTO_SIN_POOL, textosDeEfectos(card), cfg),
    limites: limitesDeCarta(carta, cfg),
    avisos: carga.avisos,
  }
}
