/**
 * Esencia, Rol y Facción VIGENTES de un Campeón (F9e, `change_type`).
 *
 * La carta trae los suyos impresos; un `change_type` los SUSTITUYE mientras dure (el Rol y la Facción pasan a ser solo
 * el nuevo valor). El motor debe consultarlos SIEMPRE por aquí y nunca leer `meta.esencia / roles / facciones` de una
 * carta en juego: así un efecto que dependa de la Facción (filtros, sacrificios, Comandante) ve la
 * Facción de ahora, no la impresa. Módulo hoja: solo lee el catálogo y el estado.
 */
import { ESENCIAS, type Esencia, type Faccion, type Rol } from '../../shared/types'
import { getCardMeta } from './cards'
import type { CambioAtributo, GameState, PlayerId } from './types'

/** Último cambio vigente del atributo para esa instancia (el más reciente gana), o undefined si nadie lo cambió. */
function ultimoCambio(s: GameState, instId: string, atributo: 'esencia' | 'rol' | 'faccion'): CambioAtributo | undefined {
  const lista = s.cambiosAtributo
  if (!lista?.length) return undefined
  for (let i = lista.length - 1; i >= 0; i--) {
    const c = lista[i]
    if (c.instId !== instId || c.atributo !== atributo) continue
    // Un cambio ligado a un Éter bloqueado (MU-004) solo vale mientras ese Éter siga bloqueado sobre el Campeón
    if (c.mientrasEter && !(s.instances[instId]?.eterBloqueado ?? []).includes(c.mientrasEter)) continue
    return c
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

/* ───────────── «Misma Esencia» (Mutación) ───────────── */

/** Quién controla al Campeón: el jugador en cuyo campo está, o undefined si no está en ningún campo. */
export function controladorDeCampeon(s: GameState, instId: string): PlayerId | undefined {
  for (const j of ['A', 'B'] as PlayerId[]) if (s.players[j].campo.campeones.includes(instId)) return j
  return undefined
}

/** Cuántos Campeones de cada Esencia (vigente) controla `jugador`. */
export function conteoPorEsencia(s: GameState, jugador: PlayerId): Map<Esencia, number> {
  const cuenta = new Map<Esencia, number>()
  for (const id of s.players[jugador].campo.campeones) {
    if (!id) continue
    const e = esenciaDe(s, id)
    if (e) cuenta.set(e, (cuenta.get(e) ?? 0) + 1)
  }
  return cuenta
}

/**
 * La Esencia que cumple «controlas `minimo` o más Campeones de una misma Esencia», o undefined si ninguna. Si varias la cumplen
 * (ej. 3 Bestias y 3 Magos con mínimo 3), gana la que más Campeones tiene y, en empate, la primera del catálogo (decisión de
 * motor: el efecto no pregunta cuál).
 */
export function esenciaQueCumple(s: GameState, jugador: PlayerId, minimo: number): Esencia | undefined {
  const cuenta = conteoPorEsencia(s, jugador)
  let mejor: Esencia | undefined
  for (const e of ESENCIAS) {
    const c = cuenta.get(e) ?? 0
    if (c >= minimo && (mejor === undefined || c > (cuenta.get(mejor) ?? 0))) mejor = e
  }
  return mejor
}

/** ¿`jugador` cumple el requisito de campo `misma_esencia` (N o más Campeones de una misma Esencia)? */
export function requisitoCampoCumple(s: GameState, jugador: PlayerId, requisito: { tipo: 'misma_esencia'; minimo: number } | undefined): boolean {
  if (!requisito) return true
  return esenciaQueCumple(s, jugador, requisito.minimo) !== undefined
}

/** ¿El Campeón comparte Esencia con OTRO Campeón que controla su mismo controlador? */
export function comparteEsenciaConOtro(s: GameState, instId: string): boolean {
  const controlador = controladorDeCampeon(s, instId)
  const esencia = esenciaDe(s, instId)
  if (!controlador || !esencia) return false
  return s.players[controlador].campo.campeones.some((id) => !!id && id !== instId && esenciaDe(s, id) === esencia)
}
