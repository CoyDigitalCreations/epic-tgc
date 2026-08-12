import { esCampeon, getCardMeta } from './cards'
import type { CardInstance, Ctx, ExpiraModificador, GameState, PlayerId } from './types'

/**
 * Infraestructura de efectos (change 3, ADR-20..22): registro → dispatch.
 *
 * - `registrarEfecto(trigger, cardId, fn)` registra handlers por (trigger, cardId).
 * - `dispararTrigger` recolecta las instancias relevantes (explícitas vía
 *   `instancias` o por zona en el campo del jugador) y ejecuta los handlers en
 *   orden DETERMINISTA (cardInstanceId asc) sobre el CLON (patrón ADR-5).
 * - `statsDe`/`keywordsDe` son la ÚNICA consulta de stats: base del meta +
 *   override de instancia (poder?/resistencia?, patrón keywords) + Σ de
 *   `modificadores` (ADR-22). combat.ts las consume (regresión C1).
 * - Las purgas por expiración (ADR-22) se disparan desde las transiciones de
 *   fase: 'ocaso' y keywordsTemporales en choque→ocaso (actions.ts), 'alba-dueño'
 *   en la Alba del dueño (phases.ts).
 *
 * Combate = 0 extracciones RNG (contrato 89 intacto); los efectos tampoco
 * consumen RNG salvo que el handler lo pida explícitamente vía ctx.
 */

/** Triggers del dispatch (F1, ADR-20). 'continuo' NO es un trigger: las auras viven en statsDe. */
export type TriggerEfecto =
  | 'al-invocar'
  | 'al-atacar'
  | 'al-matar-en-combate'
  | 'al-inicio-alba'
  | 'al-inicio-choque'
  | 'al-pagar-eter'
  | 'al-jugar-mistica'
  | 'al-ser-destruido-vinculo'
  | 'al-resolver-cadena'
  | 'activable'

/** Payload de contexto del dispatch (C2+ lo puebla; C1 usa solo `jugador`). */
export interface PayloadEfecto {
  jugador: PlayerId
  objetivoId?: string
  contextoUso?: string
  killerId?: string
  victimaId?: string
  extra?: Record<string, unknown>
}

/** Handler puro sobre el clon: (s, ctx, instancia, payload). */
export type HandlerEfecto = (s: GameState, ctx: Ctx, inst: CardInstance, payload: PayloadEfecto) => void

const registro = new Map<TriggerEfecto, Map<string, HandlerEfecto>>()

/** Registra el handler de un efecto para (trigger, cardId); reemplaza si existe. */
export function registrarEfecto(trigger: TriggerEfecto, cardId: string, fn: HandlerEfecto): void {
  let porCarta = registro.get(trigger)
  if (!porCarta) {
    porCarta = new Map()
    registro.set(trigger, porCarta)
  }
  porCarta.set(cardId, fn)
}

/** SOLO PARA TESTS: vacía el registro global entre suites (ADR-5 no comparte estado). */
export function limpiarRegistroEfectos(): void {
  registro.clear()
}

/** Instancias en el campo del jugador (2B-2F, 3A-3C, 3D-3F, 4A-4F), orden estable. */
function instanciasEnCampo(s: GameState, jugador: PlayerId): string[] {
  const p = s.players[jugador]
  return [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate,
    ...p.vinculos,
  ].filter((id): id is string => id !== null)
}

/**
 * Dispara un trigger: ejecuta los handlers registrados en orden determinista
 * (cardInstanceId asc). Con `instancias` explícitas usa esas; sin ellas,
 * recolecta por zona el campo del jugador (los triggers de contexto específico
 * —al-invocar, al-matar-en-combate…— SIEMPRE pasan instancias desde C2+).
 */
export function dispararTrigger(
  s: GameState,
  ctx: Ctx,
  trigger: TriggerEfecto,
  jugador: PlayerId,
  instancias?: string[],
): void {
  const porCarta = registro.get(trigger)
  if (!porCarta) return
  const ids = instancias ?? instanciasEnCampo(s, jugador)
  const orden = [...ids].sort()
  const payload: PayloadEfecto = { jugador }
  for (const id of orden) {
    const inst = s.instances[id]
    const cardId = inst?.cardId
    if (!inst || !cardId) continue
    const fn = porCarta.get(cardId)
    if (!fn) continue
    fn(s, ctx, inst, payload)
  }
}

/**
 * Stats efectivos (ADR-20/22): base del meta + override de instancia
 * (poder?/resistencia?) + Σ de modificadores. ÚNICA consulta de stats del motor.
 * No-Campeones → { poder: 0, resistencia: 0 }.
 */
export function statsDe(s: GameState, id: string): { poder: number; resistencia: number } {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  const esCamp = !!meta && esCampeon(meta)
  let poder = inst?.poder ?? (esCamp && meta.stats ? meta.stats.poder : 0)
  let resistencia = inst?.resistencia ?? (esCamp && meta.stats ? meta.stats.resistencia : 0)
  for (const m of inst?.modificadores ?? []) {
    if (m.stat === 'poder') poder += m.valor
    else resistencia += m.valor
  }
  return { poder, resistencia }
}

/**
 * Keywords efectivas: data del meta + inst.keywords (permanentes) +
 * inst.keywordsTemporales (ADR-22). Superset de la keywordsDe local de combat
 * (regresión C1: misma semántica pre-auras).
 */
export function keywordsDe(s: GameState, id: string): readonly string[] {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  const deData = meta && esCampeon(meta) ? meta.keywords : []
  return [...new Set([...deData, ...(inst?.keywords ?? []), ...(inst?.keywordsTemporales ?? [])])]
}

/** Aplica un modificador aditivo de stats a una instancia (ADR-22). */
export function aplicarMod(
  s: GameState,
  id: string,
  stat: 'poder' | 'resistencia',
  valor: number,
  expira: ExpiraModificador,
): void {
  const inst = s.instances[id]
  if (!inst) return
  inst.modificadores = [...(inst.modificadores ?? []), { stat, valor, expira }]
}

/** Otorga una keyword a una instancia (temporal=true → expira en Ocaso, ADR-22). */
export function otorgarKeyword(s: GameState, id: string, kw: string, temporal = false): void {
  const inst = s.instances[id]
  if (!inst) return
  if (temporal) {
    inst.keywordsTemporales = [...new Set([...(inst.keywordsTemporales ?? []), kw])]
  } else {
    inst.keywords = [...new Set([...(inst.keywords ?? []), kw])]
  }
}

/**
 * Purga los modificadores con `expira` de las instancias en campo (jugador
 * omitido = AMBOS jugadores: los efectos 'ocaso' del turno en curso expiran
 * para todos al llegar el Ocaso).
 */
export function purgarEfectosTemporales(s: GameState, expira: ExpiraModificador, jugador?: PlayerId): void {
  const jugadores: PlayerId[] = jugador ? [jugador] : ['A', 'B']
  for (const j of jugadores) {
    for (const id of instanciasEnCampo(s, j)) {
      const inst = s.instances[id]
      if (!inst?.modificadores) continue
      const restantes = inst.modificadores.filter((m) => m.expira !== expira)
      inst.modificadores = restantes
    }
  }
}

/** Limpia las keywordsTemporales de TODOS los jugadores al llegar el Ocaso (ADR-22). */
export function purgarKeywordsTemporales(s: GameState): void {
  for (const j of ['A', 'B'] as PlayerId[]) {
    for (const id of instanciasEnCampo(s, j)) {
      const inst = s.instances[id]
      if (inst?.keywordsTemporales && inst.keywordsTemporales.length > 0) {
        inst.keywordsTemporales = []
      }
    }
  }
}
