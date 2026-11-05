/**
 * Regeneración del campo `texto` de los efectos de las cartas del seed.
 *
 * REGLA DE ORO: el `texto` NUNCA se escribe a mano. Sale siempre de `generateEffectText` (Card-Maker) a partir de los campos
 * estructurados del efecto. Este módulo es puro (sin I/O): recibe las cartas y devuelve las cartas con el texto regenerado
 * y la lista de textos que cambiaron.
 */
import { generateEffectText } from '../../src/forge/components/EffectList'
import { efectosComandante } from '../../src/shared/efectoComandante'
import type { EfectoData } from '../../src/shared/types'

export type CartaJson = Record<string, unknown>

export interface CambioTexto {
  cardId: string
  /** Dónde vive el efecto: `efectos[0]`, `efectoComandante[1]`... */
  ruta: string
  antes: string | undefined
  despues: string
}

/** Todos los efectos de una carta con la ruta donde viven (efectos[] y efectoComandante, objeto o arreglo). */
export function efectosConRuta(carta: CartaJson): Array<{ ruta: string; efecto: EfectoData }> {
  const lista: Array<{ ruta: string; efecto: EfectoData }> = []
  const efectos = carta.efectos
  if (Array.isArray(efectos)) efectos.forEach((e, i) => lista.push({ ruta: `efectos[${i}]`, efecto: e as EfectoData }))
  const comandante = carta.efectoComandante as EfectoData | EfectoData[] | undefined
  if (Array.isArray(comandante)) comandante.forEach((e, i) => lista.push({ ruta: `efectoComandante[${i}]`, efecto: e }))
  else if (comandante) lista.push({ ruta: 'efectoComandante', efecto: efectosComandante(comandante)[0] })
  return lista
}

/**
 * Reescribe `texto` de cada efecto (mutando las cartas recibidas). Devuelve solo los textos que cambiaron.
 * Con `ids` solo toca esas cartas (el resto se queda como está); sin `ids`, todas.
 */
export function regenerarTextos(cartas: CartaJson[], ids?: ReadonlySet<string>): CambioTexto[] {
  const cambios: CambioTexto[] = []
  for (const carta of cartas) {
    if (ids && !ids.has(String(carta.id))) continue
    for (const { ruta, efecto } of efectosConRuta(carta)) {
      const despues = generateEffectText(efecto)
      if (efecto.texto !== despues) {
        cambios.push({ cardId: String(carta.id), ruta, antes: efecto.texto, despues })
        efecto.texto = despues
      }
    }
  }
  return cambios
}
