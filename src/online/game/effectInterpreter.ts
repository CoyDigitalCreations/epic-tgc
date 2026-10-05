/**
 * Generic Effect Interpreter
 *
 * Reads EfectoData structure and executes effects in the game engine.
 * Makes the engine data-driven — new cards only need EfectoData definition.
 */
import { resolveTargets } from './targetResolver'
import { aplicarMod, otorgarKeyword, crearOpcionBloqueo } from './efectos'
import { enviarAlCementerio, destruirCarta, liberarEterBloqueado } from './replacements'
import { esCampeon, getCardMeta } from './cards'
import type { EfectoData } from '../../shared/types'
import type { CardInstance, Ctx, GameState, PlayerId } from './types'
import type { PayloadEfecto } from './efectos'

/**
 * Interpret and execute an effect from EfectoData structure.
 * 
 * Two modes:
 * - Normal: resolve targets from JSON, execute effect
 * - Resolution: payload.contextoUso === 'objetivo-elegido' → use payload.objetivoId directly
 */
export function interpretEffect(
  s: GameState,
  ctx: Ctx,
  inst: CardInstance,
  efectoData: EfectoData,
  payload: PayloadEfecto,
): void {
  const { efecto, objetivo, costo } = efectoData
  const jugador = payload.jugador

  // RESOLUTION MODE: player already chose a target
  if (payload.contextoUso === 'objetivo-elegido' && payload.objetivoId) {
    // Pre-check at resolution time: can this effect actually be executed?
    if (!canExecuteEffect(s, efecto, jugador)) {
      return // can't execute (e.g., steal_champion with no free slot)
    }
    const targetIds = [payload.objetivoId]
    executeEffect(s, ctx, inst, efecto, targetIds, jugador, efectoData)
    return
  }

  // NORMAL MODE: resolve targets from JSON
  // Cost validation: skip for TRIGGERED effects and CONTINUO effects.
  // - Triggered effects resolve their cost at resolution time (player action).
  // - Continuo effects have cost already paid (blocking Éter) by ejecutarActivarHabilidad.
  // - Fase 3a/3c: costos eter_bloqueado/bloqueo_fijo se pagan vía bloquear_eter
  //   (acción SEPARADA posterior al jugar) — skip validación al interpret time
  //   (patrón continuo: el costo se paga después, no acá).
  // Only validate cost for DISPARO-style effects (no trigger, paid at activation).
  if (!efectoData.trigger && efectoData.tipo !== 'continuo' && costo && costo.tipo !== 'ninguno') {
    if (costo.tipo !== 'eter_bloqueado' && costo.tipo !== 'bloqueo_fijo') {
      if (!validateCost(s, jugador, costo, inst)) {
        return
      }
    }
  }

  // CONTEXTO USO CHECK: if the effect specifies contextoUso (e.g., 'invocar'),
  // only execute when the payload has the matching contextoUso.
  if (efectoData.contextoUso && efectoData.contextoUso !== 'ninguno') {
    if (payload.contextoUso !== efectoData.contextoUso) {
      return // wrong context — skip this effect
    }
  }

  // NOTE: Arcana conditions (CondicionEfecto) are checked by the guard system
  // (effects-guards.ts → validarRequisito) for action validation, NOT here.
  // The interpreter executes effects unconditionally when triggered.

  let targetIds: string[] = []
  if (objetivo) {
    if (objetivo.tipo === 'self') {
      targetIds = [inst.cardInstanceId]
    } else {
      // Merge top-level filtros with objetivo.filtros (top-level takes precedence)
      // EfectoData has filtros at root level AND ObjetivoEfecto has its own filtros
      let mergedObjetivo = efectoData.filtros
        ? { ...objetivo, filtros: { ...objetivo.filtros, ...efectoData.filtros } }
        : objetivo
      // Fase 3d: defaultear objetivo.zona desde zonaOrigen cuando el JSON no
      // incluye zona (tutor FB-031: re-export Card-Maker lo dropeó). resolveTargets
      // necesita zona para buscar; zonaOrigen es la fuente canónica del tutor.
      if (!mergedObjetivo.zona && efectoData.zonaOrigen) {
        mergedObjetivo = { ...mergedObjetivo, zona: efectoData.zonaOrigen }
      }
      targetIds = resolveTargets(s, mergedObjetivo, jugador)
    }
  }

  // D1 pattern: when called from dispararTrigger (fromTrigger=true), create pending
  // objective even with 1 target — player must explicitly choose.
  // EXCEPTION: seleccionar filter always returns exactly 1 target (automatic selection).
  // For direct calls (fromTrigger=false/undefined), execute directly when only 1 target.
  // Fase 3d: mover + esHasta auto-resuelve (sin D1 — "hasta N" determinista, sin
  // elección significativa; también evita pendientes no-turno con controladorTrigger:'rival').
  const isTriggered = payload.fromTrigger === true
  const autoResolver = efecto === 'mover' && efectoData.esHasta === true
  const mergedFiltros = efectoData.filtros
    ? { ...objetivo?.filtros, ...efectoData.filtros }
    : objetivo?.filtros
  const hasAutoSelect = mergedFiltros?.seleccionar != null
  const needsPending = isTriggered ? (targetIds.length > 0 && !hasAutoSelect) : (targetIds.length > 1)
  if (needsPlayerChoice(objetivo, efecto) && !autoResolver && needsPending) {
    // Pre-check: can this effect actually be executed?
    if (!canExecuteEffect(s, efecto, jugador)) {
      return // can't execute (e.g., steal_champion with no free slot)
    }
    s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
      jugador,
      instId: inst.cardInstanceId,
      trigger: toHyphenTrigger(efectoData.trigger) ?? umbralTrigger(efectoData) ?? 'ninguno',
      opciones: targetIds,
    }]
    return
  }

  // Single target or no choice needed → execute directly
  executeEffect(s, ctx, inst, efecto, targetIds, jugador, efectoData)
}

/**
 * Check if the effect target requires player choice (single selection from multiple).
 */
function needsPlayerChoice(objetivo: EfectoData['objetivo'], efecto?: EfectoData['efecto']): boolean {
  if (!objetivo) return false
  // Self and auto-targets don't need choice
  if (objetivo.tipo === 'self' || objetivo.tipo === 'todos_campeones_propios' || 
      objetivo.tipo === 'todos_campeones_rivales' || objetivo.tipo === 'rival_hand') {
    return false
  }
  // Effects that don't need player choice despite having a target
  // draw: draws from top of deck; rival_discard: random; block_ether/double_attack: handled by other systems
  // negar (Fase 3b) y copy (Fase 3c): SÍ necesitan elección (D1) — el jugador elige target
  // return_ether: automatic (target is rival's ether in a specific zone)
  if (efecto === 'draw' || efecto === 'rival_discard' || efecto === 'block_ether' ||
      efecto === 'double_attack') {
    return false
  }
  // All other target types need choice when there are multiple options
  return true
}

/**
 * Pre-check: can this effect actually be executed?
 * Returns false if the effect would silently fail (e.g., steal with no free slot).
 */
function canExecuteEffect(
  s: GameState,
  efecto: EfectoData['efecto'],
  jugador: PlayerId,
): boolean {
  if (efecto === 'steal_champion') {
    // Need at least one free slot in player's campo
    const playerCampo = s.players[jugador].campo.campeones
    return playerCampo.includes(null)
  }
  return true // other effects can always be attempted
}

/**
 * Convert JSON trigger names to hyphenated format for pending objectives.
 * JSON uses underscores (inicio_choque), game uses hyphens (al-inicio-choque).
 * Also maps JSON trigger names to internal trigger names.
 */
function toHyphenTrigger(trigger?: string): string | undefined {
  if (!trigger) return undefined
  // Map JSON triggers to internal trigger names used by the game engine
  const triggerMap: Record<string, string> = {
    'inicio_choque': 'al-inicio-choque',
    'inicio_alba': 'al-inicio-alba',
    'al_invocar': 'al-invocar',
    'al_atacar': 'al-atacar',
    'al_matar_en_combate': 'al-matar-en-combate',
    'al_pagar_eter': 'al-pagar-eter',
    'al_jugar_mistica': 'al-jugar-mistica',
    'al_ser_enviado_al_cementerio': 'al-ser-enviado-al-cementerio',
    'al_ser_destruido_vinculo': 'al-ser-destruido-vinculo',
    'al_resolver_cadena': 'al-resolver-cadena',
    'al_activar_habilidad': 'al-activar-habilidad',
  }
  return triggerMap[trigger] ?? trigger.replace(/_/g, '-')
}

/** Trigger interno para efectos de umbral bloqueo sin trigger JSON (Aurora steal_champion). */
function umbralTrigger(efectoData: EfectoData): string | undefined {
  if (efectoData.trigger) return undefined
  if (efectoData.costo?.tipo === 'bloqueo_fijo' || efectoData.costo?.tipo === 'eter_bloqueado') {
    return 'al-bloquear-eter'
  }
  return undefined
}

/**
 * Execute the actual effect with resolved target IDs.
 */
function executeEffect(
  s: GameState,
  ctx: Ctx,
  inst: CardInstance,
  efecto: EfectoData['efecto'],
  targetIds: string[],
  jugador: PlayerId,
  efectoData: EfectoData,
): void {
  const { stats, cantidad, keyword, duracion, objetivo } = efectoData

  switch (efecto) {
    case 'buff':
    case 'debuff':
      executeBuffDebuff(s, targetIds, stats, duracion, efectoData.buffPerBlockedEther, efecto, efectoData.duracionTurnos)
      break

    case 'destroy':
      executeDestroy(s, ctx, targetIds)
      break

    case 'exile':
      executeExile(s, ctx, targetIds)
      break

    case 'draw':
      executeDraw(s, ctx, jugador, cantidad ?? 1)
      break

    case 'grant_keyword':
      executeGrantKeyword(s, targetIds, keyword, duracion)
      break

    case 'return_hand':
      executeReturnHand(s, ctx, targetIds)
      break

    case 'steal_champion':
      executeStealChampion(s, ctx, targetIds, jugador, inst)
      break

    case 'steal_ether':
      executeStealEther(s, ctx, targetIds, jugador)
      break

    case 'free_ether':
      executeFreeEther(s, ctx, targetIds, jugador)
      break

    case 'return_ether':
      executeReturnEther(s, ctx, targetIds, objetivo?.zonaDestino, cantidad)
      break

    case 'mover':
      // Fase 3d: respeta cantidad (DS-027 "hasta 2") — mueve solo los primeros N
      executeMover(s, ctx, cantidad ? targetIds.slice(0, cantidad) : targetIds, objetivo?.zonaDestino)
      break

    case 'toggle_exhaust':
      executeToggleExhaust(s, targetIds)
      break

    case 'tutor':
      executeTutor(s, ctx, targetIds, jugador, efectoData)
      break

    case 'rival_discard':
      executeRivalDiscard(s, ctx, jugador, cantidad ?? 1)
      break

    case 'invocar_y_equipar':
      executeInvocarEquipar(s, ctx, inst, targetIds, jugador)
      break

    case 'block_ether':
      // Opción de bloqueo data-driven (Fase 2a): arma opcionesPendientes para
      // que el jugador bloquee 1 Éter sobre un Campeón compatible (Pasivo 1A
      // vía dispatch — p.ej. vínculos con trigger inicio_alba).
      crearOpcionBloqueo(s, jugador, inst.cardInstanceId)
      break

    case 'double_attack':
      // Double attack is handled by combat system
      break

    case 'negar':
      // Fase 3b: negar activación — almacena el target en la fuente (estado derivado).
      // La negación vive mientras la fuente esté en campo (championNegado scan).
      // tipoNegacion='activacion' gatea validarActivarHabilidad del target.
      if (targetIds.length > 0) {
        inst.negadoTargetId = targetIds[0]
      }
      break

    case 'copy':
      // Fase 3c: copy almacena el target en la fuente (estado derivado).
      // copyActivo: copyTargetId + ≥1 éter bloqueado + target en campo.
      // Resolución dispatch: continuo/pasivo → aura (modificadoresJSONDe, patrón 3a);
      // evento → one-shot en transición 0→≥1 (dispararCopyActivation).
      // Extensión Presteza futura: mover fire point del one-shot al chain.
      if (targetIds.length > 0) {
        inst.copyTargetId = targetIds[0]
      }
      break
  }
}

/**
 * Execute invocar_y_equipar: invoca un Campeón desde zonaOrigen al campo
 * (cansado) y equipa esta carta a ese Campeón (vinculadoA: si esta carta
 * sale, el campeón también). El armado de pendientes lo hace interpretEffect
 * vía resolveTargets (respeta filtros del JSON).
 */
function executeInvocarEquipar(
  s: GameState,
  ctx: Ctx,
  inst: CardInstance,
  targetIds: string[],
  jugador: PlayerId,
): void {
  if (targetIds.length === 0) return
  const objetivoId = targetIds[0]
  if (!invocarAlCampo(s, ctx, jugador, objetivoId)) return
  inst.equipadoA = objetivoId
  inst.vinculadoA = objetivoId
}

/** Invoca un campeón desde una zona del jugador al campo (cansado + entradaEsteTurno).
 * CHEQUEA slot libre ANTES de remover de la zona — sin eso, un slot lleno
 * orfana la carta (removida del cementerio/mano y nunca colocada). */
function invocarAlCampo(s: GameState, ctx: Ctx, jugador: PlayerId, campeonId: string): boolean {
  const p = s.players[jugador]
  const slotLibre = p.campo.campeones.indexOf(null)
  if (slotLibre === -1) return false
  const zonas: Array<{ arr: string[]; nombre: string }> = [
    { arr: p.cementerio, nombre: 'cementerio' },
    { arr: p.exilio, nombre: 'exilio' },
    { arr: p.mano, nombre: 'mano' },
    { arr: p.mazo, nombre: 'mazo' },
  ]
  for (const { arr } of zonas) {
    const idx = arr.indexOf(campeonId)
    if (idx !== -1) {
      arr.splice(idx, 1)
      p.campo.campeones[slotLibre] = campeonId
      s.instances[campeonId].agotado = true
      s.instances[campeonId].entradaEsteTurno = true
      ctx.emit({ type: 'carta_invocada', cardInstanceId: campeonId, tipo: 'Campeón', slot: slotLibre })
      return true
    }
  }
  return false
}

/**
 * Fase 3a Phase D: one-shot al alcanzar umbral de costo-bloqueado.
 * Después de bloquear Éter en una carta, chequea si algún efecto con costo
 * eter_bloqueado/bloqueo_fijo alcanzó su umbral y aún no disparó.
 * - invocar_y_equipar (FB-032): invoca el primer campeón de zonaOrigen + equipa.
 * - steal_champion (Aurora FB-010): arma D1 pendiente (o resuelve) para robar
 *   un Campeón rival mientras el Éter esté bloqueado.
 * Flag efectoUmbralDisparado evita re-disparo; liberarEterBloqueado lo limpia
 * (manual §7.7: el efecto se desactiva cuando el Éter se libera).
 */
export function dispararUmbralBloqueo(s: GameState, ctx: Ctx, targetInstanceId: string): void {
  const inst = s.instances[targetInstanceId]
  if (!inst?.cardId || inst.efectoUmbralDisparado) return
  const meta = getCardMeta(inst.cardId)
  if (!meta || !('efectos' in meta) || !meta.efectos) return
  const bloqueados = inst.eterBloqueado?.length ?? 0

  for (const efecto of meta.efectos) {
    const umbral = efecto.costo?.cantidad
    if (!umbral) continue
    if (efecto.costo?.tipo !== 'eter_bloqueado' && efecto.costo?.tipo !== 'bloqueo_fijo') continue
    if (bloqueados < umbral) continue

    // One-shot steal_champion (Aurora): no re-steal si ya controla uno robado por esta fuente
    if (efecto.efecto === 'steal_champion') {
      const yaRobo = Object.values(s.instances).some((i) => i.stolenBy === inst.cardInstanceId)
      if (yaRobo) continue
      if (!canExecuteSteal(s, inst.owner)) continue
      inst.efectoUmbralDisparado = true
      // D1: interpretEffect arma pendiente si hay opciones (incluso 1 — elección explícita)
      interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true })
      continue
    }

    // One-shot: efectos que ejecutan al alcanzar el umbral (no auras stat derivadas)
    if (efecto.efecto !== 'invocar_y_equipar') continue
    inst.efectoUmbralDisparado = true
    ejecutarInvocarEquiparUmbral(s, ctx, inst, efecto, inst.owner)
  }
}

/** ¿Hay slot libre para robar un Campeón? (mismo check que canExecuteEffect steal_champion) */
function canExecuteSteal(s: GameState, jugador: PlayerId): boolean {
  return s.players[jugador].campo.campeones.includes(null)
}

/**
 * Alba del dueño (§ efectos con reagrupar): libera a la Reserva el Éter que
 * ciertos efectos bloquearon CON SU EFECTO (Aurora steal, Ragnar grant_keyword).
 * Independiente del reagrupado normal 1A→2A de Éter pagado.
 *
 * Reglas del diseñador:
 * - "Al inicio de tu Alba reagrupa el Éter usado por este efecto" → 2A del dueño.
 * - Si el efecto es steal_champion con duracion 'mientras_ester_bloqueado':
 *   termina el robo. El campeón robado REGRESA al campo del rival original
 *   solo si el rival tiene slot libre (cualquier slot, no necesariamente el
 *   original). Si el rival está lleno, el campeón SE QUEDA controlado.
 * - Si el campeón ya salió del campo del ladrón (destruido/exilio/mano):
 *   no regresa — solo se limpia stolenBy.
 * - Si el steal no tiene duración o es 'permanente': el Éter se reagrupa
 *   (si el efecto tiene reagrupar) pero el campeón NO regresa.
 * - Tras reagrupar, la fuente puede volver a bloquear Éter (sin bloqueo activo).
 */
export function reagruparEfectosBloqueoAlba(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]
  const enCampo = [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate,
  ].filter((id): id is string => id !== null)

  for (const id of enCampo) {
    const inst = s.instances[id]
    if (!inst?.cardId || !inst.eterBloqueado || inst.eterBloqueado.length === 0) continue
    const meta = getCardMeta(inst.cardId)
    if (!meta || !('efectos' in meta) || !meta.efectos) continue

    const efectoReagrupar = meta.efectos.find(
      (e) =>
        e.reagrupar?.fase === 'alba' &&
        e.reagrupar?.turno === 'propio' &&
        (e.costo?.tipo === 'bloqueo_fijo' || e.costo?.tipo === 'eter_bloqueado'),
    )
    if (!efectoReagrupar) continue

    // Liberar el Éter del efecto → Reserva del dueño (NO 1A)
    const eteres = [...inst.eterBloqueado]
    delete inst.eterBloqueado
    delete inst.efectoUmbralDisparado
    delete inst.copyOneShotDisparado
    p.eterReserva.push(...eteres)
    ctx.emit({ type: 'eter_reagrupado', jugador, eterIds: eteres })

    // Steal con duración ligada al Éter bloqueado → termina el robo
    if (
      efectoReagrupar.efecto === 'steal_champion' &&
      efectoReagrupar.duracion === 'mientras_ester_bloqueado'
    ) {
      retornarCampeonesRobados(s, ctx, id, jugador)
    }
  }
}

/**
 * Termina un steal 'mientras_ester_bloqueado': campeones con stolenBy=fuente.
 * - Siguientes en el campo del ladrón:
 *   - Rival (dueño original del campeón) con slot libre → regresa a ese slot.
 *   - Rival lleno → SE QUEDA controlado por el ladrón (stolenBy se limpia;
 *     el control vive en la posición del campo).
 * - Ya fuera del campo del ladrón (muerte/exilio/mano): solo limpia stolenBy.
 */
export function retornarCampeonesRobados(
  s: GameState,
  ctx: Ctx,
  fuenteId: string,
  ladron: PlayerId,
): void {
  for (const other of Object.values(s.instances)) {
    if (other.stolenBy !== fuenteId) continue
    const enCampoLadron = s.players[ladron].campo.campeones.includes(other.cardInstanceId)
    if (!enCampoLadron) {
      // Salió del campo del ladrón: ya no hay control que devolver
      delete other.stolenBy
      continue
    }
    // Dueño original del campeón robado (other.owner se conservó al robar)
    const duenoOriginal = other.owner
    const campoOriginal = s.players[duenoOriginal].campo.campeones
    const slotLibre = campoOriginal.indexOf(null)
    if (slotLibre !== -1 && duenoOriginal !== ladron) {
      const idxLadron = s.players[ladron].campo.campeones.indexOf(other.cardInstanceId)
      if (idxLadron !== -1) s.players[ladron].campo.campeones[idxLadron] = null
      campoOriginal[slotLibre] = other.cardInstanceId
      delete other.stolenBy
      ctx.emit({
        type: 'carta_entrada_a_zona',
        cardInstanceId: other.cardInstanceId,
        zona: `2${String.fromCharCode(66 + slotLibre)}` as '2B' | '2C' | '2D' | '2E' | '2F',
        jugador: duenoOriginal,
        bocaArriba: true,
      })
    } else {
      // Campo rival lleno (o edge case): el control persiste en el campo del ladrón
      delete other.stolenBy
    }
  }
}

/** One-shot umbral: invoca el primer campeón de zonaOrigen (determinista) + equipa la fuente. */
function ejecutarInvocarEquiparUmbral(
  s: GameState,
  ctx: Ctx,
  inst: CardInstance,
  efecto: EfectoData,
  jugador: PlayerId,
): void {
  const zona = efecto.zonaOrigen ?? 'exilio'
  const p = s.players[jugador]
  const arr = zona === 'cementerio' ? p.cementerio : zona === 'mano' ? p.mano : zona === 'mazo' ? p.mazo : p.exilio
  for (const id of arr) {
    const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
    if (!meta || !esCampeon(meta)) continue
    if (invocarAlCampo(s, ctx, jugador, id)) {
      inst.equipadoA = id
      inst.vinculadoA = id
    }
    break // primer campeón (determinista)
  }
}

/**
 * Execute tutor effect — move chosen card from source zone to destination zone.
 * Called during resolution (contextoUso='objetivo-elegido') when the player picks a card.
 * Also handles the initial pending creation: if targets exist, creates pending objective.
 */
function executeTutor(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
  efectoData: EfectoData,
): void {
  const zonaOrigen = efectoData.objetivo?.zona ?? 'mazo'
  const zonaDestino = efectoData.objetivo?.zonaDestino ?? 'mano'
  const p = s.players[jugador]

  // Destino campo: verificar slot ANTES de remover de la origen (sin leak)
  if (zonaDestino === 'campo' && p.campo.campeones.indexOf(null) === -1) return

  for (const targetId of targetIds) {
    // Find and remove from source zone
    let removed = false

    if (zonaOrigen === 'mazo') {
      const idx = p.mazo.indexOf(targetId)
      if (idx !== -1) {
        p.mazo.splice(idx, 1)
        removed = true
      }
    } else if (zonaOrigen === 'cementerio') {
      const idx = p.cementerio.indexOf(targetId)
      if (idx !== -1) {
        p.cementerio.splice(idx, 1)
        removed = true
      }
    } else if (zonaOrigen === 'exilio') {
      const idx = p.exilio.indexOf(targetId)
      if (idx !== -1) {
        p.exilio.splice(idx, 1)
        removed = true
      }
    } else if (zonaOrigen === 'mano') {
      const idx = p.mano.indexOf(targetId)
      if (idx !== -1) {
        p.mano.splice(idx, 1)
        removed = true
      }
    }

    if (!removed) continue

    // Add to destination zone
    if (zonaDestino === 'mano') {
      p.mano.push(targetId)
      ctx.emit({ type: 'carta_robada', jugador, cardInstanceId: targetId })
    } else if (zonaDestino === 'campo') {
      // For tutor effects that put directly on field (uncommon)
      const slotLibre = p.campo.campeones.indexOf(null)
      if (slotLibre !== -1) {
        p.campo.campeones[slotLibre] = targetId
        ctx.emit({ type: 'carta_invocada', cardInstanceId: targetId, tipo: 'Campeón', slot: slotLibre })
      }
    }
  }
}

/**
 * Validate if cost is met.
 */
function validateCost(
  s: GameState,
  jugador: PlayerId,
  costo: NonNullable<EfectoData['costo']>,
  inst: CardInstance,
): boolean {
  const p = s.players[jugador]

  switch (costo.tipo) {
    case 'eter':
      // Check if player has enough ether in reserve
      return p.eterReserva.length >= (costo.cantidad ?? 1)

    case 'eter_bloqueado':
      // Check if player has enough blocked ether
      let totalBlocked = 0
      for (const champId of p.campo.campeones) {
        if (champId === null) continue
        const inst = s.instances[champId]
        totalBlocked += inst?.eterBloqueado?.length ?? 0
      }
      return totalBlocked >= (costo.cantidad ?? 1)

    case 'bloqueo_fijo':
      // Fixed block cost — always valid if player has ether
      return p.eterReserva.length >= (costo.cantidad ?? 1)

    case 'exhaust':
      // Exhaust self — check if not already exhausted
      return !inst?.agotado

    case 'exile_self':
      // Exile self — always valid
      return true

    case 'cemetery_self':
      // Send self to cemetery — always valid
      return true

    default:
      return true
  }
}

/**
 * Execute buff/debuff effect.
 */
function executeBuffDebuff(
  s: GameState,
  targetIds: string[],
  stats: EfectoData['stats'],
  duracion: EfectoData['duracion'],
  buffPerBlockedEther: boolean | undefined,
  efecto: EfectoData['efecto'],
  duracionTurnos?: number,
): void {
  if (!stats) return

  // Calculate modifier expiration — ExpiraModificador = 'ocaso' | 'alba-dueño' | 'permanente'
  const expira = duracion === 'permanente' ? 'permanente' :
                 duracion === 'mientras_en_campo' ? 'permanente' :
                 duracion === 'mientras_ester_bloqueado' ? 'permanente' :
                 duracion === 'mientras_equipped' ? 'permanente' :
                 'ocaso' // turno, 1_por_turno, n_turnos, hasta_fase → expira en Ocaso

  // For n_turnos: set turnosRestantes counter so the modifier expires after N owner Ocasos
  const turnosRestantes = duracion === 'n_turnos' ? duracionTurnos : undefined

  // Debuffs negate the stats (Card-Maker generates positive values for "pierde X ATQ")
  const sign = efecto === 'debuff' ? -1 : 1

  for (const targetId of targetIds) {
    let atqDelta = (stats.ATQ ?? 0) * sign
    let resDelta = (stats.RES ?? 0) * sign

    // Handle buffPerBlockedEther
    if (buffPerBlockedEther) {
      const targetInst = s.instances[targetId]
      const blockedCount = targetInst?.eterBloqueado?.length ?? 0
      atqDelta *= blockedCount
      resDelta *= blockedCount
    }

    if (atqDelta !== 0) {
      aplicarMod(s, targetId, 'poder', atqDelta, expira, turnosRestantes)
    }
    if (resDelta !== 0) {
      aplicarMod(s, targetId, 'resistencia', resDelta, expira, turnosRestantes)
    }
  }
}

/**
 * Execute destroy effect.
 * Uses destruirCarta (not enviarAlCementerio) to properly emit destruccion events,
 * check Inmortal/Indestructible keywords, and handle all destruction side effects.
 */
function executeDestroy(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    destruirCarta(s, ctx, targetId, 'efecto')
  }
}

/**
 * Execute exile effect.
 */
function executeExile(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    // Find which zone the card is in and remove it
    const owner = inst.owner
    const p = s.players[owner]

    // Remove from cemetery
    const cemIdx = p.cementerio.indexOf(targetId)
    if (cemIdx !== -1) {
      p.cementerio.splice(cemIdx, 1)
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from field
    const campoIdx = p.campo.campeones.indexOf(targetId)
    if (campoIdx !== -1) {
      p.campo.campeones[campoIdx] = null
      liberarEterBloqueado(s, ctx, targetId, '1A') // Fase 3a: carta deja el campo → Éter liberado
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from mystics
    const mistIdx = p.campo.misticasTacticas.indexOf(targetId)
    if (mistIdx !== -1) {
      p.campo.misticasTacticas[mistIdx] = null
      liberarEterBloqueado(s, ctx, targetId, '1A') // Fase 3a
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }

    // Remove from arcanas
    const arcIdx = p.campo.arcanasCombate.indexOf(targetId)
    if (arcIdx !== -1) {
      p.campo.arcanasCombate[arcIdx] = null
      liberarEterBloqueado(s, ctx, targetId, '1A') // Fase 3a
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador: owner })
      continue
    }
  }
}

/**
 * Execute draw effect.
 */
function executeDraw(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  cantidad: number,
): void {
  const p = s.players[jugador]

  for (let i = 0; i < cantidad; i++) {
    if (p.mazo.length === 0) break

    const cardId = p.mazo.shift()!
    p.mano.push(cardId)
    ctx.emit({ type: 'carta_robada', cardInstanceId: cardId, jugador })
  }
}

/**
 * Execute grant_keyword effect.
 */
function executeGrantKeyword(
  s: GameState,
  targetIds: string[],
  keyword: string | undefined,
  duracion: EfectoData['duracion'],
): void {
  if (!keyword) return

  const temporal = duracion !== 'permanente'

  for (const targetId of targetIds) {
    otorgarKeyword(s, targetId, keyword, temporal)
  }
}

/**
 * Execute return_hand effect.
 */
function executeReturnHand(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    const p = s.players[owner]

    // Remove from current zone
    const removed = removeFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    // Fase 3a: carta deja el campo → Éter bloqueado liberado (manual §7.7)
    liberarEterBloqueado(s, ctx, targetId, '1A')

    // Add to hand
    p.mano.push(targetId)
    ctx.emit({ type: 'carta_devuelta_a_mano', cardInstanceId: targetId, jugador: owner })
  }
}

/**
 * Execute steal_champion effect.
 */
function executeStealChampion(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
  inst: CardInstance,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  for (const targetId of targetIds) {
    const targetInst = s.instances[targetId]
    if (!targetInst) continue

    // Find in rival's field
    const rivalCampo = s.players[rival].campo.campeones
    const idx = rivalCampo.indexOf(targetId)
    if (idx === -1) continue

    // Remove from rival's field
    rivalCampo[idx] = null

    // Add to player's field
    const playerCampo = s.players[jugador].campo.campeones
    const slotLibre = playerCampo.indexOf(null)
    if (slotLibre === -1) {
      // Safety: no free slot — put champion back (shouldn't happen due to canExecuteEffect check)
      rivalCampo[idx] = targetId
      continue
    }

    playerCampo[slotLibre] = targetId
    targetInst.stolenBy = inst.cardInstanceId
    // Aurora's stolen champion is exhausted (game rule: "agotada")
    targetInst.agotado = true

    ctx.emit({ type: 'campeon_robado', cardInstanceId: targetId, jugador, rival })
  }
}

/**
 * Execute steal_ether effect.
 */
function executeStealEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  for (const targetId of targetIds) {
    // Remove from rival's ether
    const rivalP = s.players[rival]
    const idx = rivalP.eterReserva.indexOf(targetId)
    if (idx !== -1) {
      rivalP.eterReserva.splice(idx, 1)
      s.players[jugador].eterReserva.push(targetId)
      ctx.emit({ type: 'eter_robado', cardInstanceId: targetId, jugador, rival })
    }
  }
}

/**
 * Execute free_ether effect.
 */
function executeFreeEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  jugador: PlayerId,
): void {
  for (const targetId of targetIds) {
    // Remove from paid zone
    const p = s.players[jugador]
    const idx = p.eterPagado.indexOf(targetId)
    if (idx !== -1) {
      p.eterPagado.splice(idx, 1)
      p.eterReserva.push(targetId)
      ctx.emit({ type: 'eter_liberado', cardInstanceId: targetId, jugador })
    }
  }
}

/**
 * Remove an ether from its current zone (Reserva or Pagado).
 * Returns true if removed, false if not found.
 * NOTE: Does NOT touch eterBloqueado — blocked ether has special game semantics.
 */
function removeEterFromCurrentZone(
  s: GameState,
  targetId: string,
  owner: PlayerId,
): boolean {
  const p = s.players[owner]

  // Check Reserva (2A)
  const resIdx = p.eterReserva.indexOf(targetId)
  if (resIdx !== -1) {
    p.eterReserva.splice(resIdx, 1)
    return true
  }

  // Check Pagado (1A)
  const paidIdx = p.eterPagado.indexOf(targetId)
  if (paidIdx !== -1) {
    p.eterPagado.splice(paidIdx, 1)
    return true
  }

  return false
}

/**
 * Execute return_ether effect.
 * Respects cantidad field — only returns up to N ethers.
 */
function executeReturnEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
  cantidad?: number,
): void {
  const limit = cantidad ?? targetIds.length
  let count = 0
  for (const targetId of targetIds) {
    if (count >= limit) break
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner

    // Remove from ANY current zone
    const removed = removeEterFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    count++

    // Add to destination zone
    if (zonaDestino === 'reserva') {
      s.players[owner].eterReserva.push(targetId)
      ctx.emit({ type: 'eter_reagrupado', jugador: owner, eterIds: [targetId] })
    }
  }
}

/**
 * Execute mover effect.
 */
function executeMover(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    const p = s.players[owner]

    // Remove from ANY current zone
    const removed = removeEterFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    // Add to destination zone
    if (zonaDestino === 'pagado') {
      p.eterPagado.push(targetId)
      ctx.emit({ type: 'eter_movido', cardInstanceId: targetId, destino: 'pagado', jugador: owner })
    } else if (zonaDestino === 'reserva') {
      p.eterReserva.push(targetId)
      ctx.emit({ type: 'eter_movido', cardInstanceId: targetId, destino: 'reserva', jugador: owner })
    }
  }
}

/**
 * Execute toggle_exhaust effect.
 */
function executeToggleExhaust(
  s: GameState,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    inst.agotado = !inst.agotado
  }
}

/**
 * Execute rival_discard effect.
 * Uses enviarAlCementerio so the al-ser-enviado-al-cementerio trigger fires.
 */
function executeRivalDiscard(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  cantidad: number,
): void {
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'
  const p = s.players[rival]

  for (let i = 0; i < cantidad; i++) {
    if (p.mano.length === 0) break

    // Deterministic discard using ctx.next()
    const idx = Math.floor(ctx.next() * p.mano.length)
    const cardId = p.mano.splice(idx, 1)[0]
    // Use enviarAlCementerio so al-ser-enviado-al-cementerio triggers fire
    enviarAlCementerio(s, ctx, cardId)
    ctx.emit({ type: 'carta_descartada', jugador: rival, cardInstanceIds: [cardId] })
  }
}

/**
 * Remove card from current zone.
 */
function removeFromCurrentZone(
  s: GameState,
  targetId: string,
  owner: PlayerId,
): boolean {
  const p = s.players[owner]

  // Remove from cemetery
  const cemIdx = p.cementerio.indexOf(targetId)
  if (cemIdx !== -1) {
    p.cementerio.splice(cemIdx, 1)
    return true
  }

  // Remove from field
  const campoIdx = p.campo.campeones.indexOf(targetId)
  if (campoIdx !== -1) {
    p.campo.campeones[campoIdx] = null
    return true
  }

  // Remove from mystics
  const mistIdx = p.campo.misticasTacticas.indexOf(targetId)
  if (mistIdx !== -1) {
    p.campo.misticasTacticas[mistIdx] = null
    return true
  }

  // Remove from arcanas
  const arcIdx = p.campo.arcanasCombate.indexOf(targetId)
  if (arcIdx !== -1) {
    p.campo.arcanasCombate[arcIdx] = null
    return true
  }

  // Remove from exile
  const exiIdx = p.exilio.indexOf(targetId)
  if (exiIdx !== -1) {
    p.exilio.splice(exiIdx, 1)
    return true
  }

  return false
}