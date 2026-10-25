import { esCampeon, faccionesCompartidas, getCardMeta, type AnyCard } from './cards'
import type { CardInstance, Ctx, ExpiraModificador, GameState, PlayerId } from './types'
import { interpretEffect } from './effectInterpreter'
import { parejasBloqueoOpcion } from './habilidades'
import { resolveTargets } from './targetResolver'
import { purgarReglasHastaFase, purgarReglasTemporales } from './reglasTemporales'
import type { CondicionEfecto, EfectoData } from '../../shared/types'

/**
 * Infraestructura de efectos (change 3, ADR-20..22): registro → dispatch.
 *
 * - `registrarEfecto(trigger, cardId, fn)` registra handlers por (trigger, cardId)
 *   para infraestructura de dispatch (tests, features del engine).
 * - `dispararTrigger` recolecta las instancias relevantes y ejecuta los handlers
 *   en orden DETERMINISTA sobre el CLON (patrón ADR-5).
 * - `statsDe`/`keywordsDe` son la ÚNICA consulta de stats: base del meta +
 *   override de instancia + Σ de `modificadores` (ADR-22) + Σ de
 *   `modificadoresJSONDe` (Fase 1: auras derivadas del JSON).
 * - Las purgas por expiración (ADR-22) se disparan desde las transiciones de
 *   fase: 'ocaso' en choque→ocaso (partida.ts), 'alba-dueño' en la Alba
 *   del dueño (phases.ts).
 *
 * FASE 1 — Modificadores continuos desde el JSON:
 * Las auras (campo/reserva/bloqueo + efectoComandante) se DERIVAN leyendo
 * efectos[] de las fuentes en el estado — sin handlers por cardId. Cualquier
 * carta con configuración válida en Card-Maker produce auras.
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
  | 'al-bloquear-eter'
  | 'activable'

/** Payload de contexto del dispatch (C2+ lo puebla; C1 usa solo `jugador`). */
export interface PayloadEfecto {
  jugador: PlayerId
  objetivoId?: string
  contextoUso?: string
  killerId?: string
  victimaId?: string
  fromTrigger?: boolean
  /** B8: el dispatch viene de dispararTrigger → si el efecto tiene costo
   * tipo 'eter', se COBRA al resolverse (Reserva → 1A). Sin fondos → fizzled.
   * Solo lo pone dispararTrigger — los caminos de acción (activar_habilidad,
   * jugar_mistica, etc.) ya cobraron su pago aparte. */
  cobrarCosto?: boolean
  /** F5b: declaración de un opener — interpretEffect solo ARMA la elección de
   * objetivo (marcando el pendiente con `opener`) y NO ejecuta el efecto. */
  declararOpener?: { efectoIdx: number }
  /** F5e: dispararTrigger en modo DECLARACIÓN — arma la elección de objetivo de los efectos
   * que matchean (marcada con su índice en efectos[], como declararOpener) y NO ejecuta
   * nada; tampoco corre los handlers genéricos ni por cardId. */
  declarar?: boolean
  /** F5e: objetivos ya elegidos al declarar, por índice en efectos[]; dispararTrigger se los
   * pasa a cada efecto como contextoUso 'objetivo-elegido'. */
  objetivosElegidos?: Record<number, string>
  /** F5e: resolución de una respuesta de la pila — la elección de objetivos ya ocurrió al
   * responder: un efecto que aún necesitaría elegir se pierde en vez de armar un pendiente. */
  sinEleccion?: boolean
  /** F5e: al resolver con objetivo ya elegido, éste debe seguir siendo un objetivo válido
   * del efecto; si ya no lo es (salió del campo, etc.) el efecto se pierde. F5h: interpretEffect
   * revalida SIEMPRE en modo resolución; el flag se conserva por compatibilidad y ya no cambia nada. */
  revalidarObjetivo?: boolean
  extra?: Record<string, unknown>
}

/** Handler puro sobre el clon: (s, ctx, instancia, payload). */
export type HandlerEfecto = (s: GameState, ctx: Ctx, inst: CardInstance, payload: PayloadEfecto) => void

const registro = new Map<TriggerEfecto, Map<string, HandlerEfecto>>()

/* ──────────────────────────────────────────────────────────────────────────
   MODIFICADORES CONTINUOS DESDE EL JSON (Fase 1)
   Estado derivado: statsDe/keywordsDe computan auras leyendo efectos[] +
   efectoComandante de las fuentes en el estado. Sin handlers por cardId.
   ────────────────────────────────────────────────────────────────────────── */

/** ¿El efecto produce stats/keywords (aura candidata)? */
function esEfectoStat(efecto: EfectoData): boolean {
  return efecto.efecto === 'buff' || efecto.efecto === 'debuff' || efecto.efecto === 'grant_keyword'
}

/** Aura de zona: pasivo/reserva/bloqueo SIN trigger de evento (o trigger 'ninguno'). */
export function esAuraZona(efecto: EfectoData): boolean {
  if (!esEfectoStat(efecto)) return false
  const sinTriggerDeEvento = efecto.trigger === undefined || efecto.trigger === 'ninguno'
  return (efecto.tipo === 'pasivo' || efecto.tipo === 'reserva' || efecto.tipo === 'bloqueo') && sinTriggerDeEvento
}

/**
 * Aura condicional: "gana X mientras ese Éter esté bloqueado".
 * Solo cuenta como aura cuando el objetivo es self o todos_campeones_propios
 * Y el efecto NO se ejecuta por activación (tipo disparo/continuo van al
 * interpreter al activar — p.ej. Ragnar continuo grant_keyword a UN campeón,
 * Korr disparo buff — para no duplicar el modificador).
 */
export function esAuraCondicionada(efecto: EfectoData): boolean {
  if (efecto.tipo === 'disparo' || efecto.tipo === 'continuo') return false
  if (efecto.duracion !== 'mientras_ester_bloqueado') return false
  if (!esEfectoStat(efecto)) return false
  const t = efecto.objetivo?.tipo
  return t === 'todos_campeones_propios' || t === 'self'
}

/**
 * Aura de artefacto equipado (Fase 3a — FB-020): hechizo buff/debuff con
 * buffPerBlockedEther + costo-bloqueado + objetivo equipped_champion.
 * "el Campeón equipado con esta carta gana X por cada Éter bloqueado [en esta carta]".
 * El buff es DERIVADO: escala con fuente.eterBloqueado, sin evento de activación.
 */
export function esAuraEquipada(efecto: EfectoData): boolean {
  if (efecto.efecto !== 'buff' && efecto.efecto !== 'debuff') return false
  if (!efecto.buffPerBlockedEther) return false
  if (efecto.costo?.tipo !== 'eter_bloqueado' && efecto.costo?.tipo !== 'bloqueo_fijo') return false
  return efecto.objetivo?.tipo === 'equipped_champion'
}

/**
 * Aura de Vínculo (Fase 3d — FB-030, DS-030): tipo 'vinculo' + efecto stat +
 * duracion 'mientras_en_campo' + sin trigger. "vínculos siempre en el campo
 * → permanente" (diseño del usuario). Aura derivada via modificadoresJSONDe.
 */
export function esAuraVinculo(efecto: EfectoData): boolean {
  if (efecto.tipo !== 'vinculo') return false
  if (!esEfectoStat(efecto)) return false
  if (efecto.duracion !== 'mientras_en_campo') return false
  return efecto.trigger === undefined || efecto.trigger === null
}

/**
 * Stats base + modificadores temporales (SIN auras JSON) — para ranking
 * en evaluarAura (seleccionar filter). Evita recursión
 * statsDe↔modificadoresJSONDe. V1: ranking por stats imprimibles.
 */
function statsBaseDe(s: GameState, id: string): { poder: number; resistencia: number } {
  const inst = s.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  const esCamp = !!meta && esCampeon(meta)
  const stats = esCamp ? (meta as { stats?: { poder?: number; resistencia?: number } }).stats : undefined
  let poder = inst?.poder ?? stats?.poder ?? 0
  let resistencia = inst?.resistencia ?? stats?.resistencia ?? 0
  for (const m of inst?.modificadores ?? []) {
    if (m.stat === 'poder') poder += m.valor
    else resistencia += m.valor
  }
  return { poder, resistencia }
}

/**
 * ¿El copy de FB-022 está ACTIVO? (Fase 3c — Último Refugio).
 * Estado derivado: copyTargetId + ≥1 Éter bloqueado + target en campo.
 * "copia el efecto... mientras ese Éter esté bloqueado" (§7.7 / manual).
 * Patrón modificadoresJSONDe — sin cleanup; si el target sale, copyActivo=false.
 */
export function copyActivo(s: GameState, id: string): boolean {
  const inst = s.instances[id]
  if (!inst?.copyTargetId || (inst.eterBloqueado?.length ?? 0) === 0) return false
  const targetId = inst.copyTargetId
  const target = s.instances[targetId]
  if (!target?.cardId) return false
  const p = s.players[target.owner]
  return (
    p.campo.campeones.includes(targetId) ||
    p.campo.misticasTacticas.includes(targetId) ||
    p.campo.arcanasCombate.includes(targetId)
  )
}

/** Modificadores continuos computados para una instancia. */
export interface ModificadoresJSON {
  poder: number
  resistencia: number
  keywords: string[]
}

type OrigenAura = 'campo' | 'reserva' | 'bloqueo' | 'vinculo'

interface CandidatoAura {
  inst: CardInstance
  meta: AnyCard
  esComandante: boolean
  origen: OrigenAura
}

/**
 * Evalúa si un efecto continuo aplica a `objetivoId` dado el contexto de la
 * fuente, y calcula los modificadores resultantes. null = no aplica.
 *
 * REGLAS DEL EFECTO COMANDANTE (manual §10):
 * 1. INMUTABLE: no puede ser negado, copiado ni afectado por ningún efecto.
 *    Es un aura derivada del JSON — no pasa por la cadena de prioridad ni por
 *    championNegado ni por copy. Si el comandante sale del campo, el aura
 *    termina (patrón estado derivado).
 * 2. SOLO MISMA FACCIÓN: afecta únicamente a campeones de la misma facción
 *    que el comandante y que controla el jugador. Aurora (Orden) NO buffea
 *    campeones Caos propios.
 */
function evaluarAura(
  s: GameState,
  efecto: EfectoData,
  fuente: CardInstance,
  esComandante: boolean,
  objetivoId: string,
  objetivoInst: CardInstance,
  origen: OrigenAura,
): { poder?: number; resistencia?: number; keywords?: string[] } | null {
  const objetivo = efecto.objetivo
  if (!objetivo) return null

  const mismoDueno = fuente.owner === objetivoInst.owner

  // ¿Aplica el objetivo del JSON a esta instancia?
  let aplica = false
  let excluirSelf = false

  switch (objetivo.tipo) {
    case 'self':
      aplica = objetivoId === fuente.cardInstanceId
      break
    case 'todos_campeones_propios':
      aplica = mismoDueno
      // EfectoComandante: solo afecta campeones de la MISMA FACCIÓN que el
      // comandante (manual §10 — "Todos tus Campeones de [facción]").
      // Aurora (Orden) NO buffea campeones Caos, aunque sean tuyos.
      if (esComandante && aplica) {
        const fuenteMeta = fuente.cardId ? getCardMeta(fuente.cardId) : null
        const objetivoMeta = objetivoInst.cardId ? getCardMeta(objetivoInst.cardId) : null
        if (fuenteMeta && objetivoMeta && 'facciones' in fuenteMeta && 'facciones' in objetivoMeta) {
          aplica = faccionesCompartidas(fuenteMeta.facciones, objetivoMeta.facciones)
        }
      }
      // Convención del motor (por semántica del JSON, no por cardId):
      // - efectoComandante → INCLUYE self ("Todos tus Campeones ganan…")
      // - aura condicional (mientras_ester_bloqueado) → INCLUYE self
      //   ("los Campeones que controlas ganen… mientras esté bloqueado")
      // - aura de zona estática (pasivo/reserva/bloqueo sin trigger) → EXCLUYE self
      //   ("Los OTROS Campeones que controlas ganan…")
      excluirSelf = !esComandante && origen === 'campo' && esAuraZona(efecto) && !esAuraCondicionada(efecto)
      break
    case 'campeon':
      if (objetivo.controlador === 'propio') aplica = mismoDueno
      else if (objetivo.controlador === 'rival') aplica = !mismoDueno
      else aplica = true
      // Fase 3d: filtro seleccionar (mayor/menor stat) — el aura aplica SOLO
      // al campeón que matchea el ranking del pool elegible.
      if (aplica && objetivo.filtros?.seleccionar) {
        const { stat, orden } = objetivo.filtros.seleccionar
        const pool: string[] = []
        for (const j of ['A', 'B'] as PlayerId[]) {
          const esDuenoFiltro = objetivo.controlador === 'propio' ? j === fuente.owner : objetivo.controlador === 'rival' ? j !== fuente.owner : true
          if (!esDuenoFiltro) continue
          for (const cid of s.players[j].campo.campeones) {
            if (cid) pool.push(cid)
          }
        }
        if (pool.length === 0) return null
        let mejorId = pool[0]
        let mejorVal = stat === 'poder' ? statsBaseDe(s, pool[0]).poder : statsBaseDe(s, pool[0]).resistencia
        for (const cid of pool.slice(1)) {
          const val = stat === 'poder' ? statsBaseDe(s, cid).poder : statsBaseDe(s, cid).resistencia
          if (orden === 'mayor' ? val > mejorVal : val < mejorVal) {
            mejorId = cid
            mejorVal = val
          }
        }
        if (mejorId !== objetivoId) return null
      }
      break
    case 'equipped_champion':
      // Fase 3a (FB-020): aura de artefacto equipado — la fuente (Mística/Arcana)
      // debe estar equipada al target y ser del mismo dueño.
      aplica = mismoDueno && fuente.equipadoA === objetivoId
      break
    default:
      return null
  }

  if (!aplica) return null
  if (excluirSelf && objetivoId === fuente.cardInstanceId) return null

  // Guardas por origen
  if (origen === 'reserva') {
    // El Éter debe estar en la Reserva de su dueño
    if (!s.players[fuente.owner].eterReserva.includes(fuente.cardInstanceId)) return null
    // controlador del objetivo respecto al DUEÑO DEL ÉTER
    if (objetivo.controlador === 'rival' && objetivoInst.owner === fuente.owner) return null
    if (objetivo.controlador === 'propio' && objetivoInst.owner !== fuente.owner) return null
  }

  if (origen === 'bloqueo') {
    // El Éter debe estar bloqueado SOBRE esta instancia (anfitrión)
    if (!(objetivoInst.eterBloqueado ?? []).includes(fuente.cardInstanceId)) return null
  }

  if (efecto.duracion === 'mientras_ester_bloqueado' && origen !== 'bloqueo') {
    // Aura condicional: la FUENTE debe tener éter bloqueado actualmente
    if ((fuente.eterBloqueado?.length ?? 0) === 0) return null
  }

  // Escala buffPerBlockedEther (auras pasivas): +stats por Éter bloqueado.
  // Fase 3a (FB-020): cuando el objetivo es equipped_champion, la fuente ES el
  // artefacto equipado — se cuenta el Éter bloqueado EN LA FUENTE (no en rivales).
  // Comportamiento existente (Marek): cuenta éter bloqueado de campeones RIVALES.
  let escala = 1
  if (efecto.buffPerBlockedEther) {
    if (objetivo.tipo === 'equipped_champion') {
      const bloqueadosFuente = fuente.eterBloqueado?.length ?? 0
      if (bloqueadosFuente === 0) return null
      escala = efecto.cantidadMax !== undefined ? Math.min(bloqueadosFuente, efecto.cantidadMax) : bloqueadosFuente
    } else {
      const rival = objetivoInst.owner === 'A' ? 'B' : 'A'
      const bloqueadosRival = s.players[rival].campo.campeones
        .filter((cId): cId is string => cId !== null)
        .reduce((acc, cId) => acc + (s.instances[cId]?.eterBloqueado?.length ?? 0), 0)
      if (bloqueadosRival === 0) return null
      escala = efecto.cantidadMax !== undefined ? Math.min(bloqueadosRival, efecto.cantidadMax) : bloqueadosRival
    }
  }

  const signo = efecto.efecto === 'debuff' && !statsDebuffYaNegativos(efecto) ? -1 : 1
  const resultado: { poder?: number; resistencia?: number; keywords?: string[] } = {}

  if (efecto.stats?.ATQ) resultado.poder = efecto.stats.ATQ * signo * escala
  if (efecto.stats?.RES) resultado.resistencia = efecto.stats.RES * signo * escala
  if (efecto.efecto === 'grant_keyword' && efecto.keyword) {
    resultado.keywords = [efecto.keyword]
  }

  return resultado
}

/**
 * Normalización de signo (Fase 3e — convención estandarizada): el JSON emite
 * magnitudes POSITIVAS para debuffs ("pierde X" → stats.ATQ: X). DS-002 se
 * corrigió de ATQ:-1 a ATQ:1. Este check tolera negativos residuales (dato
 * corrupto / export Card-Maker viejo) para no convertir un debuff en buff.
 */
function statsDebuffYaNegativos(efecto: EfectoData): boolean {
  const atq = efecto.stats?.ATQ ?? 0
  const res = efecto.stats?.RES ?? 0
  return atq < 0 || (atq === 0 && res < 0)
}

/**
 * Modificadores continuos derivados del JSON (Fase 1) para la instancia `id`.
 * Escanea: fuentes en el campo del controlador (campeones + místicas + arcanas),
 * Éteres en Reserva de ambos jugadores, y Éteres bloqueados sobre la instancia.
 */
export function modificadoresJSONDe(s: GameState, id: string): ModificadoresJSON {
  const vacio: ModificadoresJSON = { poder: 0, resistencia: 0, keywords: [] }
  const inst = s.instances[id]
  if (!inst) return vacio
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
  if (!meta || !esCampeon(meta)) return vacio

  const owner = inst.owner
  const candidatos: CandidatoAura[] = []

  // 1. Fuentes en el CAMPO del controlador del objetivo
  //    (D6: "que controles" — el controlador, no el owner: robo de control)
  const campo = s.players[owner].campo
  const fuentesCampo = [
    ...campo.campeones,
    ...campo.misticasTacticas,
    ...campo.arcanasCombate,
  ].filter((x): x is string => x !== null)

  for (const fuenteId of fuentesCampo) {
    const fuenteInst = s.instances[fuenteId]
    if (!fuenteInst?.cardId) continue
    const fuenteMeta = getCardMeta(fuenteInst.cardId)
    if (!fuenteMeta) continue

    if (fuenteMeta.type === 'Campeón' && fuenteMeta.efectoComandante) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: true, origen: 'campo' })
    }
    if ('efectos' in fuenteMeta && fuenteMeta.efectos?.some((e) => esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: false, origen: 'campo' })
    }
  }

  // 2. Éteres en RESERVA de AMBOS jugadores (algunas auras afectan al rival)
  for (const eterOwner of ['A', 'B'] as PlayerId[]) {
    for (const eterId of s.players[eterOwner].eterReserva) {
      const eterInst = s.instances[eterId]
      if (!eterInst?.cardId) continue
      const eterMeta = getCardMeta(eterInst.cardId)
      if (!eterMeta) continue
      if ('efectos' in eterMeta && eterMeta.efectos?.some((e) => e.tipo === 'reserva' && esAuraZona(e))) {
        candidatos.push({ inst: eterInst, meta: eterMeta, esComandante: false, origen: 'reserva' })
      }
    }
  }

  // 3. Éteres BLOQUEADOS sobre esta instancia (anfitrión)
  for (const eterId of inst.eterBloqueado ?? []) {
    const eterInst = s.instances[eterId]
    if (!eterInst?.cardId) continue
    const eterMeta = getCardMeta(eterInst.cardId)
    if (!eterMeta) continue
    if ('efectos' in eterMeta && eterMeta.efectos?.some((e) => e.tipo === 'bloqueo' && esAuraZona(e))) {
      candidatos.push({ inst: eterInst, meta: eterMeta, esComandante: false, origen: 'bloqueo' })
    }
  }

  // 4. Vínculos de AMBOS jugadores (Fase 3d — FB-030/DS-030): aura mientras_en_campo.
  //    §5.5 manual: SOLO vínculos DESTRUIDOS (bocaArriba) tienen efectos vigentes.
  //    Los boca-abajo son solo vida. Los destruidos permanecen boca arriba y
  //    sus auras se acumulan.
  for (const vincOwner of ['A', 'B'] as PlayerId[]) {
    for (const vincId of s.players[vincOwner].vinculos) {
      if (!vincId) continue
      const vincInst = s.instances[vincId]
      if (!vincInst?.cardId) continue
      if (vincInst.bocaArriba !== true) continue // §5.5: boca-abajo = sin efectos
      const vincMeta = getCardMeta(vincInst.cardId)
      if (!vincMeta) continue
      if ('efectos' in vincMeta && vincMeta.efectos?.some((e) => esAuraVinculo(e))) {
        candidatos.push({ inst: vincInst, meta: vincMeta, esComandante: false, origen: 'vinculo' })
      }
    }
  }

  let poder = 0
  let resistencia = 0
  const keywords: string[] = []

  for (const c of candidatos) {
    const efectos: EfectoData[] = []
    if (c.esComandante && c.meta.type === 'Campeón' && c.meta.efectoComandante) {
      efectos.push(c.meta.efectoComandante)
    }
    if ('efectos' in c.meta && c.meta.efectos) {
      for (const e of c.meta.efectos) {
        if (c.origen === 'reserva' && e.tipo === 'reserva' && esAuraZona(e)) efectos.push(e)
        else if (c.origen === 'bloqueo' && e.tipo === 'bloqueo' && esAuraZona(e)) efectos.push(e)
        else if (c.origen === 'vinculo' && e.tipo === 'vinculo' && esAuraVinculo(e)) efectos.push(e)
        else if (c.origen === 'campo' && (esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) efectos.push(e)
      }
    }

    for (const efecto of efectos) {
      const resultado = evaluarAura(s, efecto, c.inst, c.esComandante, id, inst, c.origen)
      if (!resultado) continue
      poder += resultado.poder ?? 0
      resistencia += resultado.resistencia ?? 0
      if (resultado.keywords) keywords.push(...resultado.keywords)
    }
  }

  return { poder, resistencia, keywords: [...new Set(keywords)] }
}

/**
 * true si la carta otorga modificadores continuos a otros desde el JSON
 * (aura de campo / efectoComandante / aura condicional). Derivado del JSON —
 * sin registro por cardId. Para foco "rojo" en la UI.
 */
export function hasAuraCampoRegistrada(cardId: string): boolean {
  const meta = getCardMeta(cardId)
  if (!meta) return false
  if (meta.type === 'Campeón' && meta.efectoComandante) return true
  if (!('efectos' in meta) || !meta.efectos) return false
  return meta.efectos.some((e) => esAuraZona(e) || esAuraCondicionada(e))
}

/**
 * Evalúa la condicion JSON de una carta (§5.4 — Arcanas u otros).
 * ÚNICA fuente de validación de condiciones — reemplaza guards hardcodeados.
 * Devuelve null si se cumple, o mensaje de error si no.
 */
export function condicionCumple(
  s: GameState,
  condicion: CondicionEfecto | undefined,
  jugador: PlayerId,
): string | null {
  if (!condicion || typeof condicion !== 'object' || !('trigger' in condicion)) return null

  for (const cond of condicion.condiciones ?? []) {
    // A QUIÉN se cuenta: los tipos rival_* siempre al rival; si no, manda `objetivo.controlador`
    // (F5g: 'rival' cuenta al rival aunque el tipo sea controlar_*); sin él, controladorTrigger.
    const checkRival =
      cond.tipo === 'rival_controla_minimo' ||
      cond.tipo === 'rival_controla_maximo' ||
      (cond.objetivo?.controlador !== undefined
        ? cond.objetivo.controlador === 'rival'
        : condicion.controladorTrigger === 'rival')
    const j: PlayerId = checkRival ? (jugador === 'A' ? 'B' : 'A') : jugador
    const min = cond.cantidad ?? cond.objetivo?.cantidad ?? 1

    if (cond.tipo === 'controlar_maximo' || cond.tipo === 'rival_controla_maximo') {
      const count = s.players[j].campo.campeones.filter((id) => id !== null).length
      if (count > min) return `máximo ${min} Campeones en campo`
    } else if (cond.tipo === 'tener_mano_maximo') {
      if (s.players[j].mano.length > min) return `máximo ${min} cartas en mano`
    } else if (cond.tipo === 'tener_mano_minimo') {
      if (s.players[j].mano.length < min) return `se requieren ${min} cartas en mano`
    } else if (cond.tipo === 'tener_eter_pagado') {
      if (s.players[j].eterPagado.length < min) return `se requieren ${min} Éteres pagados`
    } else if (cond.tipo === 'tener_eter_bloqueado' || cond.objetivo?.tipo === 'campeon_con_eter') {
      const count = s.players[j].campo.campeones.filter(
        (id) => id !== null && (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1,
      ).length
      if (count < min) return `se requieren ${min} o más Campeones con Éter bloqueado`
    } else if (cond.tipo === 'controlar_minimo' || cond.tipo === 'rival_controla_minimo') {
      // Honrar filtros.objetivo.filtros (p.ej. conEterBloqueado en Arcanas)
      const conEter = cond.objetivo?.filtros?.conEterBloqueado === true
      const count = s.players[j].campo.campeones.filter(
        (id) => id !== null && (!conEter || (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1),
      ).length
      if (count < min) {
        return conEter
          ? `se requieren ${min} o más Campeones con Éter bloqueado`
          : `se requieren ${min} o más Campeones en campo`
      }
    }
  }
  return null
}

/** Triggers con los que la condición de una Arcana es un CANDADO latcheado (F5g); el resto se evalúa en vivo. */
const TRIGGERS_CANDADO = ['inicio_alba', 'inicio_choque'] as const
type TriggerCandado = (typeof TRIGGERS_CANDADO)[number]

/** ¿La condición de esta carta se evalúa como candado (se habilita en su trigger) en vez de en vivo? */
export function condicionEsCandado(condicion: CondicionEfecto | undefined): boolean {
  return !!condicion && typeof condicion === 'object' && (TRIGGERS_CANDADO as readonly string[]).includes(condicion.trigger)
}

/**
 * Candado y llave (F5g): al ocurrir `trigger` para el jugador `activo` (empieza su Alba / su Choque), cada Arcana
 * boca abajo cuyo `condicion.trigger` coincide evalúa su condición y guarda el resultado en
 * `condicionHabilitada`: cumplida → habilitada (puede activarse en CUALQUIER momento posterior aunque la
 * condición deje de cumplirse); no cumplida → deshabilitada hasta una ocurrencia posterior que la cumpla.
 * El trigger es del controlador de la Arcana (`controladorTrigger: 'rival'` = el del rival). Una Arcana colocada
 * este turno (`entradaEsteTurno`, §5.4) no evalúa: su primer candado es el primer trigger posterior.
 */
export function evaluarCandadosArcanas(s: GameState, trigger: TriggerCandado, activo: PlayerId): void {
  for (const dueno of ['A', 'B'] as PlayerId[]) {
    for (const id of s.players[dueno].campo.arcanasCombate) {
      const inst = id ? s.instances[id] : undefined
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
      if (!id || !inst || !meta || meta.type !== 'Arcana' || inst.bocaArriba || inst.entradaEsteTurno) continue
      const condicion = (meta as { condicion?: CondicionEfecto }).condicion
      if (!condicion || typeof condicion !== 'object' || condicion.trigger !== trigger) continue
      const duenoDelTrigger: PlayerId = condicion.controladorTrigger === 'rival' ? (dueno === 'A' ? 'B' : 'A') : dueno
      if (duenoDelTrigger !== activo) continue
      inst.condicionHabilitada = condicionCumple(s, condicion, dueno) === null
    }
  }
}

/**
 * ¿Hay al menos una pareja Campeón-propio + Éter-en-Reserva que el bloqueo acepte de verdad?
 * Requisito para ofrecer una opción de bloqueo Pasivo/1A: misma fuente que la elección
 * (`parejasBloqueoOpcion`), así nunca se ofrece una opción que no se puede ejecutar
 * (p.ej. solo Campeones de bloqueo fijo, que no aceptan 1 Éter suelto).
 */
export function hayParejaBloqueo(s: GameState, jugador: PlayerId): boolean {
  return parejasBloqueoOpcion(s, jugador).length > 0
}

/**
 * Pasivo 1A (FB-005/DS-006): carta de Éter con un efecto `pago/block_ether` SIN trigger. Mientras está
 * en la zona de pago (1A), su dueño puede bloquear 1 Éter de su Reserva sobre un Campeón (una vez por
 * turno por carta). Es una habilidad del turno (§8.3a: cualquier fase menos Alba), no un evento del Alba.
 */
export function pasivosBloqueo1A(s: GameState, jugador: PlayerId): string[] {
  return s.players[jugador].eterPagado.filter((id) => {
    const inst = s.instances[id]
    if (!inst || inst.opcionUsadaEsteTurno) return false
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null
    if (!meta || !('efectos' in meta) || !meta.efectos) return false
    return meta.efectos.some((e) => e.efecto === 'block_ether' && !e.trigger && e.tipo === 'pago')
  })
}

/**
 * Crea una opción de bloqueo (opcionesPendientes + elegir_opcion):
 * "una vez por turno puedes bloquear 1 Éter de tu Reserva sobre un Campeón sin agotarlo".
 * Data-driven: lo llama effectInterpreter (case block_ether — p.ej. vínculos con trigger de Alba).
 * El Pasivo 1A de las cartas de Éter NO pasa por aquí: ver pasivosBloqueo1A.
 */
export function crearOpcionBloqueo(s: GameState, jugador: PlayerId, fuenteInstanceId: string): boolean {
  const inst = s.instances[fuenteInstanceId]
  if (!inst) return false
  if (inst.opcionUsadaEsteTurno) return false
  if (!hayParejaBloqueo(s, jugador)) return false
  s.opcionesPendientes = [...(s.opcionesPendientes ?? []), { jugador, eterId: fuenteInstanceId }]
  return true
}

/**
 * ¿La instancia tiene doble ataque ACTIVO? (Fase 2b — FB-015 Elena)
 * Semántica data-driven: efecto double_attack en efectos[] con duracion
 * 'mientras_ester_bloqueado' + la instancia tiene Éter bloqueado actualmente
 * (el "ese Éter" del texto = el costo que pagó al activar).
 */
export function tieneDoubleAttackActivo(s: GameState, id: string): boolean {
  const inst = s.instances[id]
  if (!inst?.cardId || (inst.eterBloqueado?.length ?? 0) === 0) return false
  const meta = getCardMeta(inst.cardId)
  if (!meta || !('efectos' in meta) || !meta.efectos) return false
  return meta.efectos.some(
    (e) => e.efecto === 'double_attack' && e.duracion === 'mientras_ester_bloqueado',
  )
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
export function instanciasEnCampo(s: GameState, jugador: PlayerId): string[] {
  const p = s.players[jugador]
  return [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate,
    ...p.vinculos,
  ].filter((id): id is string => id !== null)
}

/** Handler genérico por tipo de efecto (no por cardId). */
type HandlerGenerico = (s: GameState, ctx: Ctx, inst: CardInstance, payload: PayloadEfecto) => void
const registroGenerico = new Map<string, HandlerGenerico>()

/** Registra un handler genérico para un tipo de efecto (ej: invocar_y_equipar). */
export function registrarEfectoGenerico(efectoTipo: string, fn: HandlerGenerico): void {
  registroGenerico.set(efectoTipo, fn)
}

/** Trigger interno → trigger del JSON (efecto.trigger). 'al-bloquear-eter' y 'activable' no tienen equivalente. */
const TRIGGER_A_JSON: Readonly<Record<string, string>> = {
  'al-invocar': 'al_invocar',
  'al-atacar': 'al_atacar',
  'al-matar-en-combate': 'al_matar_en_combate',
  'al-inicio-alba': 'inicio_alba',
  'al-inicio-choque': 'inicio_choque',
  'al-pagar-eter': 'al_pagar_eter',
  'al-jugar-mistica': 'al_jugar_mistica',
  'al-ser-enviado-al-cementerio': 'al_ser_enviado_al_cementerio',
  'al-ser-destruido-vinculo': 'al_ser_destruido_vinculo',
  'al-resolver-cadena': 'al_resolver_cadena',
  'al-activar-habilidad': 'al_activar_habilidad',
}

/** Efecto de efectos[] que matchea un trigger interno (con su índice), tal como lo ven dispararTrigger y el apilado. */
export interface TriggerMatch {
  inst: CardInstance
  efecto: EfectoData
  efectoIdx: number
}

/**
 * Efectos del JSON que se disparan con `trigger` en las instancias `ids` (F5d-2, función PURA: no muta
 * nada). Es el filtro de dispararTrigger extraído tal cual, y la fuente de verdad también para armar,
 * apilar y revalidar triggers apilados:
 * - Vínculos BOCA ABAJO no tienen efectos vigentes (§5.5).
 * - Si la carta tiene `condicion` JSON cuyo trigger es el disparado, `condicionCumple` (con `jugador`) debe pasar.
 * - Match por trigger JSON; 'al-bloquear-eter' (umbral Aurora) solo matchea efectos SIN trigger con costo
 *   de bloqueo. Un trigger interno sin equivalente JSON (p. ej. 'activable') matchea los efectos sin trigger.
 * Devuelve TODOS los efectos con match, por instancia en orden estable (ids ordenados) y luego por
 * efectoIdx. Los handlers por cardId / genéricos (registrarEfecto*) son opacos y quedan fuera.
 */
export function triggersQueMatchean(s: GameState, trigger: TriggerEfecto, jugador: PlayerId, ids: readonly string[]): TriggerMatch[] {
  const res: TriggerMatch[] = []
  const efectoTrigger = TRIGGER_A_JSON[trigger]
  for (const id of [...ids].sort()) {
    const inst = s.instances[id]
    const cardId = inst?.cardId
    if (!inst || !cardId) continue
    const meta = getCardMeta(cardId)
    if (!meta || !('efectos' in meta)) continue
    if (meta.type === 'Vínculo' && inst.bocaArriba !== true) continue
    // CONDITION CHECK: si la carta tiene condicion JSON cuyo trigger matchea
    // el disparado, evaluar condiciones (§5.4) — data-driven, sin guards.
    if ('condicion' in meta) {
      const condicion = (meta as AnyCard & { condicion?: CondicionEfecto | string }).condicion
      if (condicion && typeof condicion === 'object' && 'trigger' in condicion) {
        if (efectoTrigger === condicion.trigger && condicionCumple(s, condicion, jugador) !== null) continue
      }
    }
    const efectos = meta.efectos as EfectoData[] | undefined
    if (!efectos || !Array.isArray(efectos)) continue
    efectos.forEach((efecto, efectoIdx) => {
      // Match por trigger JSON. 'al-bloquear-eter' (re-dispatch de umbral
      // Aurora steal_champion) SOLO matchea efectos sin trigger propios
      // con costo de bloqueo — nunca otros efectos triggerless (destroy, etc.).
      const esUmbral = trigger === 'al-bloquear-eter'
      const matchea = esUmbral
        ? !efecto.trigger &&
          (efecto.costo?.tipo === 'bloqueo_fijo' || efecto.costo?.tipo === 'eter_bloqueado') &&
          !!efecto.efecto
        : efecto.trigger === efectoTrigger && !!efecto.efecto
      if (matchea) res.push({ inst, efecto, efectoIdx })
    })
  }
  return res
}

/**
 * Dispara un trigger: ejecuta los efectos desde efectos[] del JSON (prioritario),
 * luego handlers genéricos, y finalmente handlers por cardId (dispatch infra).
 *
 * El JSON interpreter es la ÚNICA fuente de verdad para efectos de cartas.
 * Los handlers por cardId sirven para: infraestructura de dispatch (tests),
 * features del engine (auras, Pasivo 1A, block_ether), y cartas sin JSON.
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
  const ids = instancias ?? instanciasEnCampo(s, jugador)
  const orden = [...ids].sort()
  // cobrarCosto (B8): el dispatch de trigger COBRA el costo tipo 'eter' del
  // efecto al resolverse (interpretEffect) — antes solo se validaba (o nada).
  const payload: PayloadEfecto = { jugador, fromTrigger: true, cobrarCosto: true, ...payloadExtra }

  for (const id of orden) {
    const inst = s.instances[id]
    const cardId = inst?.cardId
    if (!inst || !cardId) continue

    let handled = false

    // 1. PRIORIDAD: JSON interpreter — lee efectos[] de la carta
    const meta = getCardMeta(cardId)
    // §5.5 manual: Vínculos BOCA ABAJO (vivos) NO tienen efectos vigentes.
    // Solo los DESTRUIDOS (bocaArriba) firean/auras. Garantía de motor,
    // no solo de los call sites (phases.ts/partida.ts).
    if (meta && meta.type === 'Vínculo' && inst.bocaArriba !== true) continue
    // F5d-2: el filtro (condición, trigger, Vínculo boca abajo) vive en triggersQueMatchean, evaluado
    // POR instancia y en el momento (un efecto anterior pudo cambiar el estado). Camino inmediato:
    // solo el PRIMER efecto con match de la carta (el apilado las separa en entradas por efectoIdx).
    const primero = triggersQueMatchean(s, trigger, payload.jugador, [id])[0]
    if (primero) {
      const { efecto, efectoIdx } = primero
      // D1 pattern: snapshot pending objectives before interpreter
      const pendientesAntes = s.objetivosPendientes?.length ?? 0
      // F5e: declaración (arma la elección marcada con el índice del efecto) o
      // resolución con el objetivo elegido al declarar
      const objetivoElegido = payload.objetivosElegidos?.[efectoIdx]
      interpretEffect(s, ctx, inst, efecto, {
        ...payload,
        ...(payload.declarar ? { declararOpener: { efectoIdx } } : {}),
        ...(objetivoElegido ? { contextoUso: 'objetivo-elegido', objetivoId: objetivoElegido } : {}),
      })
      const pendientesDespues = s.objetivosPendientes?.length ?? 0

      // If interpreter created a pending objective → D1 pattern worked
      if (pendientesDespues > pendientesAntes) {
        handled = true
      }
      // If no pending, check if effect needs targeting
      else {
        const needsTargeting = ['steal_champion', 'toggle_exhaust', 'destroy',
          'return_ether', 'mover', 'copy', 'tutor', 'block_ether'].includes(efecto.efecto!)
        if (needsTargeting) {
          const targetIds = efecto.objetivo
            ? resolveTargets(s, efecto.objetivo, payload.jugador, id)
            : []
          if (targetIds.length > 0) {
            handled = true
          }
        } else {
          handled = true
        }
      }
    }

    if (handled) continue
    // F5e: declarar solo arma elecciones del JSON; los handlers de abajo ejecutan efectos
    if (payload.declarar) continue

    // 2. Handler genérico por tipo de efecto (invocar_y_equipar)
    // Skip if there's a cardId-specific handler — cardId takes precedence
    const hasCardHandler = porCarta?.has(cardId) ?? false
    if (!hasCardHandler) {
      for (const [efectoTipo, genericFn] of registroGenerico) {
        if (!meta || !('efectos' in meta) || !meta.efectos) continue
        const tieneEfecto = meta.efectos.some((e) => e.efecto === efectoTipo)
        if (tieneEfecto) {
          genericFn(s, ctx, inst, payload)
          handled = true
          break
        }
      }
    }

    if (handled) continue

    // 3. CardId-specific handler — dispatch infrastructure.
    // The JSON interpreter is the PRIMARY source of truth for card effects.
    // This path fires when the card has NO JSON effect matching the current trigger.
    // Serves: test handlers, engine features (block_ether Pasivo, auras), and
    // cards without JSON structured effects.
    const fn = porCarta?.get(cardId)
    if (fn) {
      fn(s, ctx, inst, payload)
    }
  }
}

/**
 * Stats efectivos (ADR-20/22): base del meta + override de instancia
 * (poder?/resistencia?) + Σ de modificadores + Σ de modificadoresJSONDe
 * (auras derivadas del JSON: campo/reserva/bloqueo + efectoComandante).
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
  // Modificadores continuos desde el JSON (Fase 1): auras de campo/reserva/
  // bloqueo + efectoComandante, derivados de efectos[] — sin handlers.
  const mods = modificadoresJSONDe(s, id)
  poder += mods.poder
  resistencia += mods.resistencia
  // ATQ y RES no pueden ser negativos (mínimo 0)
  return { poder: Math.max(0, poder), resistencia: Math.max(0, resistencia) }
}

/**
 * Keywords efectivas: data del meta + inst.keywords (permanentes) +
 * inst.keywordsTemporales (ADR-22) + keywords de modificadoresJSONDe
 * (auras de bloqueo/reserva/comandante derivadas del JSON).
 * Superset de la keywordsDe local de combat (regresión C1).
 */
export function keywordsDe(s: GameState, id: string): readonly string[] {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  // F5e (H10): keywords del meta de CUALQUIER tipo de carta (Presteza/Fugaz de Místicas y Arcanas
  // definen su velocidad en la cadena); Éter y Vínculo no tienen keywords
  const deData = meta && 'keywords' in meta && meta.keywords ? meta.keywords : []
  const mods = modificadoresJSONDe(s, id)
  // keywordsHastaFase (B6): viven en su propia lista (NO en keywordsTemporales,
  // para sobrevivir al Ocaso hasta la fase objetivo) — purgarHastaFase las retira.
  const hastaFase = (inst?.keywordsHastaFase ?? []).map((k) => k.keyword)
  return [...new Set([...deData, ...(inst?.keywords ?? []), ...(inst?.keywordsTemporales ?? []), ...hastaFase, ...mods.keywords])]
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
  /** B6: metadatos de expiración para expira='hasta-fase'. */
  hastaFase?: { fase: 'alba' | 'forja' | 'choque' | 'ocaso'; jugador: PlayerId },
): void {
  const inst = s.instances[id]
  if (!inst) return
  inst.modificadores = [
    ...(inst.modificadores ?? []),
    { stat, valor, expira, turnosRestantes, ...(hastaFase ? { expiraFase: hastaFase.fase, expiraFaseJugador: hastaFase.jugador } : {}) },
  ]
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
export function purgarEfectosTemporales(s: GameState, expira: ExpiraModificador, jugador?: PlayerId, _ctx?: Ctx): void {
  purgarReglasTemporales(s, expira, jugador)
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
/**
 * B6 (hasta_fase): purga modificadores y keywords con duración 'hasta_fase'
 * al ENTRAR `fase` con `s.turno === jugadorDueño` (la fase es DE ese jugador).
 * Se llama en cada transición de fase (partida.ts) y en el Alba (phases.ts).
 */
export function purgarHastaFase(s: GameState, fase: 'alba' | 'forja' | 'choque' | 'ocaso', turno: PlayerId): void {
  purgarReglasHastaFase(s, fase, turno)
  for (const inst of Object.values(s.instances)) {
    if (inst.modificadores?.length) {
      const quedan = inst.modificadores.filter(
        (m) => !(m.expira === 'hasta-fase' && m.expiraFase === fase && m.expiraFaseJugador === turno),
      )
      if (quedan.length !== inst.modificadores.length) inst.modificadores = quedan
    }
    if (inst.keywordsHastaFase?.length) {
      const expiradas = inst.keywordsHastaFase.filter((k) => k.fase === fase && k.jugador === turno)
      if (expiradas.length > 0) {
        for (const k of expiradas) {
          inst.keywordsTemporales = (inst.keywordsTemporales ?? []).filter((x) => x !== k.keyword)
        }
        const quedan = inst.keywordsHastaFase.filter((k) => !(k.fase === fase && k.jugador === turno))
        if (quedan.length > 0) inst.keywordsHastaFase = quedan
        else delete inst.keywordsHastaFase
      }
    }
  }
}

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
