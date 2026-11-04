import type { AnyCard } from '../shared/types'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { poderDeCarta } from './poderEfecto'
import type { CartaBalance, ConfigBalance } from './tipos'
import type { CardType } from '../shared/types/enums'

export interface FilaRanking {
  id: string
  nombre: string
  tipo: CardType
  coste: number
  indice: number
}

/**
 * Carga el paquete de pruebas (seed/CartasPrueba.json) como conjunto de REFERENCIA:
 * cada carta sale marcada `esReferencia`. Por defecto el resto del módulo la deja
 * fuera de métricas, pool de letalidad, ajuste y exportación; solo entra si el
 * llamador lo pide. No muta la entrada ni escribe el JSON.
 */
export function cargarReferencia(cartasPrueba: readonly AnyCard[], cfg: ConfigBalance = CONFIG_V1): CartaBalance[] {
  return cargarCartas(cartasPrueba, cfg).cartas.map((c) => ({ ...c, esReferencia: true }))
}

/** Cartas ordenadas por índice de poder, de mayor a menor; el empate se rompe por id. */
export function rankingReferencia(cartas: readonly CartaBalance[], cfg: ConfigBalance = CONFIG_V1): FilaRanking[] {
  return cartas
    .map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, coste: c.coste, indice: poderDeCarta(c, cfg).indice }))
    .sort((a, b) => b.indice - a.indice || a.id.localeCompare(b.id, 'es'))
}
