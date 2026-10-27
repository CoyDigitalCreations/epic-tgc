/**
 * Esencia, Rol y Facción VIGENTES de un Campeón (F9e, `change_type`).
 *
 * La carta trae los suyos impresos; un `change_type` los SUSTITUYE mientras dure (el Rol y la Facción pasan a ser solo
 * el nuevo valor). El motor debe consultarlos SIEMPRE por aquí y nunca leer `meta.esencia / roles / facciones` de una
 * carta en juego: así un efecto que dependa de la Facción (filtros, sacrificios, Comandante, Éter compatible) ve la
 * Facción de ahora, no la impresa. Módulo hoja: solo lee el catálogo y el estado.
 */
import type { Esencia, Faccion, Rol } from '../../shared/types'
import { getCardMeta } from './cards'
import type { CambioAtributo, GameState } from './types'

/** Último cambio vigente del atributo para esa instancia (el más reciente gana), o undefined si nadie lo cambió. */
function ultimoCambio(s: GameState, instId: string, atributo: 'esencia' | 'rol' | 'faccion'): CambioAtributo | undefined {
  const lista = s.cambiosAtributo
  if (!lista?.length) return undefined
  for (let i = lista.length - 1; i >= 0; i--) {
    if (lista[i].instId === instId && lista[i].atributo === atributo) return lista[i]
  }
  return undefined
}

function cambioDe(s: GameState, instId: string, atributo: 'esencia' | 'rol' | 'faccion'): string | undefined {
  return ultimoCambio(s, instId, atributo)?.valor
}

function metaDe(s: GameState, instId: string) {
  const cardId = s.instances[instId]?.cardId
  return cardId ? getCardMeta(cardId) : null
}

export function esenciaDe(s: GameState, instId: string): Esencia | undefined {
  const cambio = cambioDe(s, instId, 'esencia')
  if (cambio) return cambio as Esencia
  const meta = metaDe(s, instId)
  return meta && 'esencia' in meta ? meta.esencia : undefined
}

export function rolesDe(s: GameState, instId: string): Rol[] | undefined {
  const cambio = cambioDe(s, instId, 'rol')
  if (cambio) return [cambio as Rol]
  const meta = metaDe(s, instId)
  return meta && 'roles' in meta ? meta.roles : undefined
}

export function faccionesDe(s: GameState, instId: string): Faccion[] | undefined {
  const cambio = ultimoCambio(s, instId, 'faccion')
  // Una copia de un Campeón con varias Facciones trae la lista completa (`valores`); change_type, una sola
  if (cambio) return (cambio.valores ?? [cambio.valor]) as Faccion[]
  const meta = metaDe(s, instId)
  return meta && 'facciones' in meta ? meta.facciones : undefined
}
