import { esCampeon, getCardMeta, type AnyCard } from './cards'
import { enviarAlCementerio } from './replacements'
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
 * C2 (change 3): auras por zona (reserva 2A / bloqueo 1B-1F) se registran con
 * `registrarAuraReserva` / `registrarAuraBloqueo` y se suman en `statsDe` y
 * `keywordsDe` vía `aurasDe`. Los mods de aura expiran 'permanente'; las
 * keywords de aura son extra (no temporales).
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
  | 'al-ser-enviado-al-cementerio'
  | 'al-ser-destruido-vinculo'
  | 'al-resolver-cadena'
  | 'al-activar-habilidad'
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

/** Aura de reserva: fn(inst, meta, championOwner, eterOwner) → { poder?, resistencia?, keywords?[] } | null. */
export type AuraReservaFn = (
  inst: CardInstance,
  meta: AnyCard,
  championOwner: PlayerId,
  eterOwner: PlayerId,
) => { poder?: number; resistencia?: number; keywords?: string[] } | null
/** Aura de bloqueo: fn(inst, meta) → { poder?, resistencia?, keywords?[] } | null. */
export type AuraBloqueoFn = (
  inst: CardInstance,
  meta: AnyCard,
) => { poder?: number; resistencia?: number; keywords?: string[] } | null

const aurasReserva = new Map<string, AuraReservaFn>()
const aurasBloqueo = new Map<string, AuraBloqueoFn>()

/** Aura de campo (D6): fn(s, fuente, objetivo) → { atq?, res? } | null. Decide
 * por par (fuente, objetivo); admite objetivo === fuente (self-buff). Las
 * auras de campo son PURAS (no emiten eventos ni mutan): viven en statsDe. */
export type AuraCampoFn = (s: GameState, fuente: string, objetivo: string) => { atq?: number; res?: number } | null

const aurasCampo = new Map<string, AuraCampoFn>()

/** true si hay un aura de campo registrada para este cardId (para foco "rojo"). */
export function hasAuraCampoRegistrada(cardId: string): boolean {
  return aurasCampo.has(cardId)
}

/** Registra un aura de campo para un Campeón (D6): fuentes en el campo del
 * mismo jugador que el objetivo ("otros campeones que controles"). */
export function registrarAuraCampo(cardId: string, fn: AuraCampoFn): void {
  aurasCampo.set(cardId, fn)
}

/** Registra un aura para Éter en Reserva (2A). La fn recibe la instancia del Éter y su meta. */
export function registrarAuraReserva(cardId: string, fn: AuraReservaFn): void {
  aurasReserva.set(cardId, fn)
}

/** Registra un aura para Éter bloqueado (1B-1F). La fn recibe la instancia del Éter y su meta. */
export function registrarAuraBloqueo(cardId: string, fn: AuraBloqueoFn): void {
  aurasBloqueo.set(cardId, fn)
}

/** Resultado de auras aplicables a una instancia (Campeón u otra). */
export interface AurasAplicadas {
  reserva: Array<{ poder?: number; resistencia?: number; keywords?: string[] }>
  bloqueo: Array<{ poder?: number; resistencia?: number; keywords?: string[] }>
  /** Auras de campo (D6): ya normalizadas a poder/resistencia (Σ aditivo). */
  campo: Array<{ poder?: number; resistencia?: number }>
}

/**
 * Devuelve las auras que aplican a `inst` (normalmente un Campeón):
 * - reserva: Éteres en eterReserva de AMBOS jugadores (algunas afectan al rival)
 * - bloqueo: Éteres en inst.eterBloqueado del Campeón
 * Los mods de aura expiran 'permanente'; las keywords son extra (no temporales).
 */
export function aurasDe(s: GameState, id: string): AurasAplicadas {
  const inst = s.instances[id]
  if (!inst) return { reserva: [], bloqueo: [], campo: [] }
  const championOwner = inst.owner
  const metaInst = inst.cardId ? getCardMeta(inst.cardId) : null
  const esCampeonInst = metaInst ? esCampeon(metaInst) : false
  if (!esCampeonInst) return { reserva: [], bloqueo: [], campo: [] }

  // Auras de reserva: Éteres en 2A de AMBOS jugadores
  const reservaAuras: AurasAplicadas['reserva'] = []
  for (const eterOwner of ['A', 'B'] as PlayerId[]) {
    for (const eterId of s.players[eterOwner].eterReserva) {
      const eterInst = s.instances[eterId]
      const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
      if (!eterMeta) continue
      const fn = aurasReserva.get(eterMeta.id)
      if (fn) {
        // La aura decide si aplica a este campeón (recibe eterOwner y championOwner)
        const resultado = fn(eterInst, eterMeta, championOwner, eterOwner)
        if (resultado?.poder !== undefined && resultado !== null) reservaAuras.push(resultado)
      }
    }
  }

  // Auras de bloqueo: Éteres en eterBloqueado del Campeón (solo anfitrión)
  const bloqueoAuras: AurasAplicadas['bloqueo'] = []
  for (const eterId of inst.eterBloqueado ?? []) {
    const eterInst = s.instances[eterId]
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
    if (!eterMeta) continue
    const fn = aurasBloqueo.get(eterMeta.id)
    if (fn) {
      const result = fn(eterInst, eterMeta)
      if (result !== null) bloqueoAuras.push(result)
    }
  }

  // Auras de campo (D6): fuentes en el campo donde está `id` (el CONTROLADOR,
  // no el owner: D2 robo de control mueve la instancia). Los textos dicen
  // "que controles" → solo el campo propio del objetivo.
  // Escanea campeones + Místicas/Arcanas (Artefactos equipados).
  const campoAuras: AurasAplicadas['campo'] = []
  const campoDelObjetivo = (['A', 'B'] as PlayerId[]).find((j) => s.players[j].campo.campeones.includes(id))
  if (campoDelObjetivo) {
    const fuentesCampo = [
      ...s.players[campoDelObjetivo].campo.campeones,
      ...s.players[campoDelObjetivo].campo.misticasTacticas,
      ...s.players[campoDelObjetivo].campo.arcanasCombate,
    ]
    for (const fuenteId of fuentesCampo) {
      if (fuenteId === null) continue
      const fuenteInst = s.instances[fuenteId]
      const fuenteMeta = fuenteInst?.cardId ? getCardMeta(fuenteInst.cardId) : null
      if (!fuenteInst || !fuenteMeta) continue

      // Auras de campo registradas (DS-014 Thane, FB-021 Marcha, DS-021 Nudo, etc.)
      const fnCampo = aurasCampo.get(fuenteMeta.id)
      if (fnCampo) {
        const resultado = fnCampo(s, fuenteId, id)
        if (resultado !== null) {
          campoAuras.push({ poder: resultado.atq, resistencia: resultado.res })
        }
      }

      // Habilidades activas "Bloqueado" (FB-016 Cassandra, DS-016 Korr):
      // si la fuente tiene éteres bloqueados y tiene efectoDisparo con 'bloqueado',
      // aplica un aura a TODOS los campeones que controla el dueño de la fuente.
      const fuenteOwner = fuenteInst.owner
      if (
        fuenteMeta.efectoDisparo?.includes('bloqueado') &&
        (fuenteInst.eterBloqueado?.length ?? 0) > 0
      ) {
        // Cassandra (FB-016): +1 RES a todos los que controla
        if (fuenteMeta.id === 'FB-016') {
          campoAuras.push({ resistencia: 1 })
        }
        // Korr (DS-016): +1 ATQ a todos los que controla
        if (fuenteMeta.id === 'DS-016') {
          campoAuras.push({ poder: 1 })
        }
      }
    }
  }

  return { reserva: reservaAuras, bloqueo: bloqueoAuras, campo: campoAuras }
}

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
  payloadExtra?: Partial<PayloadEfecto>,
): void {
  const porCarta = registro.get(trigger)
  if (!porCarta) return
  const ids = instancias ?? instanciasEnCampo(s, jugador)
  const orden = [...ids].sort()
  const payload: PayloadEfecto = { jugador, ...payloadExtra }
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
 * (poder?/resistencia?) + Σ de modificadores + Σ de auras (reserva + bloqueo).
 * ÚNICA consulta de stats del motor. No-Campeones → { poder: 0, resistencia: 0 }.
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
  // Auras: reserva (2A) + bloqueo (1B-1F) — expiran 'permanente'
  const auras = aurasDe(s, id)
  for (const a of auras.reserva) {
    if (a.poder) poder += a.poder
    if (a.resistencia) resistencia += a.resistencia
  }
  for (const a of auras.bloqueo) {
    if (a.poder) poder += a.poder
    if (a.resistencia) resistencia += a.resistencia
  }
  for (const a of auras.campo) {
    if (a.poder) poder += a.poder
    if (a.resistencia) resistencia += a.resistencia
  }
  // ATQ y RES no pueden ser negativos (mínimo 0)
  return { poder: Math.max(0, poder), resistencia: Math.max(0, resistencia) }
}

/**
 * Keywords efectivas: data del meta + inst.keywords (permanentes) +
 * inst.keywordsTemporales (ADR-22) + keywords de auras (reserva + bloqueo).
 * Superset de la keywordsDe local de combat (regresión C1: misma semántica pre-auras).
 */
export function keywordsDe(s: GameState, id: string): readonly string[] {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  const deData = meta && esCampeon(meta) ? meta.keywords : []
  const auras = aurasDe(s, id)
  const auraKeywords: string[] = []
  for (const a of auras.reserva) if (a.keywords) auraKeywords.push(...a.keywords)
  for (const a of auras.bloqueo) if (a.keywords) auraKeywords.push(...a.keywords)
  return [...new Set([...deData, ...(inst?.keywords ?? []), ...(inst?.keywordsTemporales ?? []), ...auraKeywords])]
}

/**
 * Obtiene la velocidad de una carta para la cadena:
 * - 'fugaz': resuelve inmediatamente, sin respuesta
 * - 'presteza': solo puede ser respondida con PRESTEZA o FUGAZ
 * - 'normal': puede ser respondida con cualquier velocidad
 */
export function velocidadDe(s: GameState, id: string): 'fugaz' | 'presteza' | 'normal' {
  const kws = keywordsDe(s, id)
  if (kws.includes('Fugaz')) return 'fugaz'
  if (kws.includes('Presteza')) return 'presteza'
  return 'normal'
}

/**
 * Objetivos válidos para efectos que designan "un Campeón que controla el
 * rival" (D3, Protector): campeones no-null del jugador en su campo, en orden
 * de slot. Si el jugador controla ≥1 con keyword Protector (keywordsDe), se
 * retornan SOLO los Protectores ("Tus OTROS Campeones no pueden ser objetivo").
 * Regla GENERAL (no solo habilidades activas): se usa para armar `opciones`
 * de todo targeting dirigido al rival (Aurora, Ragnar, Vaela, Kael, C4).
 */
export function objetivosCampeonesValidos(state: GameState, jugador: PlayerId): string[] {
  const campeones = state.players[jugador].campo.campeones.filter((id): id is string => id !== null)
  const tieneProtector = campeones.some((id) => keywordsDe(state, id).includes('Protector'))
  if (!tieneProtector) return campeones
  return campeones.filter((id) => keywordsDe(state, id).includes('Protector'))
}

/** Aplica un modificador aditivo de stats a una instancia (ADR-22). */
export function aplicarMod(
  s: GameState,
  id: string,
  stat: 'poder' | 'resistencia',
  valor: number,
  expira: ExpiraModificador,
  turnosRestantes?: number,
): void {
  const inst = s.instances[id]
  if (!inst) return
  inst.modificadores = [...(inst.modificadores ?? []), { stat, valor, expira, turnosRestantes }]
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
 * Purga los modificadores temporales de las instancias en campo.
 *
 * Lógica:
 * - Si el modificador tiene `turnosRestantes` definido:
 *   - En Ocaso del DUEÑO: decrementa en 1. Si llega a 0, se purga.
 *   - En Alba del DUEÑO: se purga si `turnosRestantes` ≤ 0 (ya pasó su Ocaso).
 * - Si NO tiene `turnosRestantes`: se purga cuando `expira` coincide.
 *
 * Additionally: if expira='ocaso', decrementa `duracionTurnos` de Tácticas
 * en campo y las envía al cementerio cuando llegan a 0.
 *
 * `expira`: fase que dispara la purga.
 * `jugador`: si se pasa, solo purga para ese jugador.
 * `ctx`: opcional; se usa para emitir eventos y enviar Tácticas al cementerio.
 */
export function purgarEfectosTemporales(s: GameState, expira: ExpiraModificador, jugador?: PlayerId, ctx?: Ctx): void {
  const jugadores: PlayerId[] = jugador ? [jugador] : ['A', 'B']
  for (const j of jugadores) {
    for (const id of instanciasEnCampo(s, j)) {
      const inst = s.instances[id]
      if (!inst?.modificadores) continue

      if (expira === 'ocaso') {
        // En Ocaso: decrementar counter de mods con turnosRestantes
        const restantes = inst.modificadores
          .map((m) => {
            if (m.turnosRestantes !== undefined) {
              return { ...m, turnosRestantes: m.turnosRestantes - 1 }
            }
            return m
          })
          .filter((m) => {
            // Purgar si: turnosRestantes ≤ 0 O (sin counter Y expira coincide)
            if (m.turnosRestantes !== undefined) return m.turnosRestantes > 0
            return m.expira !== expira
          })
        inst.modificadores = restantes
      } else {
        // Para 'alba-dueño': purgar por expira normal (sin tocar counters)
        const restantes = inst.modificadores.filter((m) => m.expira !== expira)
        inst.modificadores = restantes
      }
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
