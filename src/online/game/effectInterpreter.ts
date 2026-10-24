/**
 * Generic Effect Interpreter
 *
 * Reads EfectoData structure and executes effects in the game engine.
 * Makes the engine data-driven — new cards only need EfectoData definition.
 */
import { resolveTargets } from './targetResolver'
import { robarCarta } from './draw'
import { aplicarMod, otorgarKeyword, crearOpcionBloqueo } from './efectos'
import { aplicarReglaTemporal } from './reglasTemporales'
import { REGLAS } from '../../shared/rules/reglas'
import { aplicarPago } from './payments'
import { enviarAlCementerio, destruirCarta, liberarEterBloqueado, liberarArtefactosEquipados } from './replacements'
import { eterDeEfecto, quitarEteres, liberarEterA, limpiarFlagsUmbralSiVacia, evaluarFinSteal } from './eter'
import { esCampeon, getCardMeta } from './cards'
import type { EfectoData } from '../../shared/types'
import type { CardInstance, Ctx, ExpiraModificador, GameState, PlayerId } from './types'
import type { PayloadEfecto } from './efectos'
import { cadenaActiva } from './chain'

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
  //   (patrón continuo: el costo se paga después, no aquí).
  // Only validate cost for DISPARO-style effects (no trigger, paid at activation).
  if (!efectoData.trigger && efectoData.tipo !== 'continuo' && costo && costo.tipo !== 'ninguno') {
    if (costo.tipo !== 'eter_bloqueado' && costo.tipo !== 'bloqueo_fijo') {
      if (!validateCost(s, jugador, costo, inst)) {
        return
      }
    }
  }

  // B8 (obs 1860): costo tipo 'eter' de un efecto TRIGGER-EADO — se COBRA al
  // resolverse (solo cuando el dispatch viene de dispararTrigger:
  // payload.cobrarCosto — los caminos de acción [activar_habilidad,
  // jugar_mistica, ...] ya cobraron su pago aparte y NO duplican). Sin fondos
  // en Reserva → fizzled: ni cobra ni resuelve.
  if (payload.cobrarCosto && costo && costo.tipo === 'eter' && inst.cardId) {
    const cant = costo.cantidad ?? 1
    const pCobro = s.players[jugador]
    if (pCobro.eterReserva.length < cant) return
    if (cant > 0) {
      const eterIdsCobro = pCobro.eterReserva.slice(0, cant)
      aplicarPago(s, ctx, jugador, eterIdsCobro, inst.cardId, { tipo: 'habilidad', cardInstanceId: inst.cardInstanceId })
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
      ...(payload.declararOpener ? { opener: payload.declararOpener } : {}),
    }]
    return
  }

  // F5b: declarar un opener solo arma la elección; el efecto resuelve al cierre
  if (payload.declararOpener) return

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
  // negar (REDISEÑO obs 1874): target IMPLÍCITO — la activación pendiente de
  // la ventana; sin elección (el candado con D1 se eliminó).
  // copy (Fase 3c): SÍ necesita elección (D1) — el jugador elige target
  // return_ether: automatic (target is rival's ether in a specific zone)
  if (efecto === 'draw' || efecto === 'rival_discard' || efecto === 'block_ether' ||
      efecto === 'double_attack' || efecto === 'negar') {
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
      executeBuffDebuff(s, targetIds, stats, duracion, efectoData.buffPerBlockedEther, efecto, efectoData.duracionTurnos, jugador, efectoData.duracionFase, efectoData.duracionControlador)
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
      executeGrantKeyword(s, targetIds, keyword, duracion, jugador, efectoData.duracionFase, efectoData.duracionControlador)
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
      executeReturnEther(s, ctx, targetIds, objetivo?.zonaDestino, cantidad, jugador, objetivo?.controladorDestino)
      break

    case 'mover':
      // Fase 3d: respeta cantidad (DS-027 "hasta 2") — mueve solo los primeros N
      executeMover(s, ctx, cantidad ? targetIds.slice(0, cantidad) : targetIds, objetivo?.zonaDestino, jugador, objetivo?.controladorDestino)
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

    case 'modificar_regla':
      executeModificarRegla(s, targetIds, jugador, efectoData)
      break

    case 'negar': {
      // REDISEÑO obs 1874 (Marcha de las Primeras): contador de UN SOLO USO —
      // niega la ACTIVACIÓN pendiente de la ventana (tipoNegacion 'activacion'):
      // el pago del activador NO se devuelve y el efecto NO se resuelve. Sin
      // activación pendiente → fizzled (la carta se consume igual: se jugó
      // como respuesta desde la mano y va al Cementerio §5.3).
      // El candado championNegado (negadoTargetId) se eliminó — el rival
      // PUEDE volver a activar. Los otros 7 tipoNegacion siguen sin
      // implementar (B3).
      const cadenaNeg = cadenaActiva(s)
      const pend = cadenaNeg?.opener
      if (pend && !pend.negada && pend.jugador !== jugador) {
        pend.negada = true
        ctx.emit({ type: 'activacion_negada', jugador, cardInstanceId: pend.cardInstanceId, fuente: inst.cardInstanceId })
      }
      break
    }

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

/** Invoca un campeón desde una zona del jugador al campo (enderezado, con invocación cansada: entradaEsteTurno).
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
  if (!inst?.cardId) return
  const meta = getCardMeta(inst.cardId)
  if (!meta || !('efectos' in meta) || !meta.efectos) return
  const bloqueadosEn = (idxEfecto: number): number => eterDeEfecto(s, targetInstanceId, idxEfecto).length

  for (const [idxEfecto, efecto] of meta.efectos.entries()) {
    // Capa 3b: tramos escalonados — UN bloqueo "hasta" con recompensas por
    // umbral. Cada tramo alcanzado arma su pendiente D1 (una elección por
    // tramo); tramosDisparados evita re-disparo mientras el Éter se sostiene
    // y se limpia al liberar (nuevo ciclo → tramos re-armados).
    if (efecto.tramos && efecto.tramos.length > 0) {
      if (efecto.costo?.tipo !== 'eter_bloqueado' && efecto.costo?.tipo !== 'bloqueo_fijo') continue
      // Fase 2 (e): el umbral cuenta SOLO el Éter de ESTA fuente/efecto
      const bloqueados = bloqueadosEn(idxEfecto)
      // Acumular los pendientes del batch — se insertan al frente PRESERVANDO
      // el orden de umbral (2 antes que 4; unshift directo los invertiría)
      const nuevosPendientes: typeof s.objetivosPendientes = []
      for (const tramo of [...efecto.tramos].sort((a, b) => a.umbral - b.umbral)) {
        if (bloqueados < tramo.umbral) continue
        if (inst.tramosDisparados?.includes(tramo.umbral)) continue
        // Objetivo del tramo: base del raíz + filtros propios del tramo (merge)
        if (!efecto.objetivo) continue
        const objetivoTramo = {
          ...efecto.objetivo,
          filtros: { ...efecto.objetivo.filtros, ...tramo.filtros },
        }
        const opciones = resolveTargets(s, objetivoTramo, inst.owner)
        if (opciones.length === 0) continue // sin válidos → se re-evalúa al próximo bloqueo
        inst.tramosDisparados = [...(inst.tramosDisparados ?? []), tramo.umbral]
        ctx.emit({ type: 'tramo_disparado', jugador: inst.owner, fuenteId: inst.cardInstanceId, umbral: tramo.umbral, efecto: tramo.efecto })
        // D1: una elección por tramo (mismo patrón steal)
        nuevosPendientes.push({
          jugador: inst.owner,
          instId: inst.cardInstanceId,
          trigger: 'al-bloquear-eter',
          opciones,
          tramoUmbral: tramo.umbral,
        })
      }
      if (nuevosPendientes.length > 0) {
        s.objetivosPendientes = [...nuevosPendientes, ...(s.objetivosPendientes ?? [])]
      }
      continue
    }

    const umbral = efecto.costo?.cantidad
    if (!umbral) continue
    if (efecto.costo?.tipo !== 'eter_bloqueado' && efecto.costo?.tipo !== 'bloqueo_fijo') continue
    // Fase 2 (e): el umbral legacy también cuenta SOLO el Éter de esta fuente
    if (bloqueadosEn(idxEfecto) < umbral) continue
    // Legacy one-shot (sin tramos): flag de protección — se limpia al liberar
    if (inst.efectoUmbralDisparado) continue

    // One-shot steal_champion (Aurora): no re-steal si ya controla uno robado por esta fuente
    if (efecto.efecto === 'steal_champion') {
      const yaRobo = Object.values(s.instances).some((i) => i.stolenBy === inst.cardInstanceId)
      if (yaRobo) continue
      if (!canExecuteSteal(s, inst.owner)) continue
      inst.efectoUmbralDisparado = true
      // D1: interpretEffect arma pendiente si hay opciones (incluso 1 — elección explícita)
      const pendientesAntes = s.objetivosPendientes?.length ?? 0
      interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true })
      // Mover el pendiente recién creado al FRENTE de la cola — el steal
      // es consecuencia directa de la acción del jugador (bloquear_eter),
      // no un trigger diferido. Sin esto queda enterrado detrás de
      // pendientes acumulados y getValidActions nunca lo expone.
      const pendientesDespues = s.objetivosPendientes?.length ?? 0
      if (pendientesDespues > pendientesAntes && s.objetivosPendientes) {
        const nuevo = s.objetivosPendientes.pop()!
        s.objetivosPendientes.unshift(nuevo)
      }
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
 * Capa 3b: ejecuta un TRAMO escalonado tras la elección D1 del jugador.
 * Reconstruye el efecto sintético del tramo (raíz + filtros mergeados) y:
 * - one-shot (toggle_exhaust, etc.): interpretEffect con objetivo elegido;
 * - fix_exhaust (sostén): setea fijadoExhaustTargetId — estado derivado que
 *   vive mientras la fuente tenga Éter bloqueado >= umbral del tramo.
 */
export function ejecutarTramo(
  s: GameState,
  ctx: Ctx,
  fuenteId: string,
  umbral: number,
  objetivoId: string,
): void {
  const inst = s.instances[fuenteId]
  if (!inst?.cardId) return
  const meta = getCardMeta(inst.cardId)
  if (!meta || !('efectos' in meta) || !meta.efectos) return

  const efectoRaiz = meta.efectos.find((e) => e.tramos?.some((t) => t.umbral === umbral))
  const tramo = efectoRaiz?.tramos?.find((t) => t.umbral === umbral)
  if (!efectoRaiz || !tramo) return

  // fix_exhaust: sostén — el estado vive en la fuente (derived state)
  if (tramo.efecto === 'fix_exhaust') {
    inst.fijadoExhaustTargetId = objetivoId
    ctx.emit({ type: 'exhaust_fijado', jugador: inst.owner, campeonId: objetivoId, fuenteId: inst.cardInstanceId })
    return
  }

  // One-shot: efecto sintético con el objetivo mergeado — interpretEffect
  // ejecuta directo (contextoUso 'objetivo-elegido' = resolución)
  const efectoTramo = {
    ...efectoRaiz,
    efecto: tramo.efecto,
    stats: tramo.stats ?? efectoRaiz.stats,
    keyword: tramo.keyword,
    cantidad: tramo.cantidad,
    duracion: tramo.duracion ?? efectoRaiz.duracion,
    duracionTurnos: tramo.duracionTurnos,
    costo: undefined, // el costo lo declara el raíz — ya pagado con el bloqueo
    trigger: undefined,
    tramos: undefined,
    objetivo: {
      ...efectoRaiz.objetivo!,
      filtros: { ...efectoRaiz.objetivo?.filtros, ...tramo.filtros },
    },
  }
  interpretEffect(s, ctx, inst, efectoTramo, {
    jugador: inst.owner,
    contextoUso: 'objetivo-elegido',
    objetivoId,
  })
}

/**
 * Estado derivado: ¿el campeón tiene el agotamiento fijado por un tramo
 * fix_exhaust activo? El fijado vive mientras la FUENTE siga en campo con
 * Éter bloqueado >= umbral del tramo (si libera Éter o sale la fuente, el
 * estado cae solo — patrón championNegado, sin flags de limpieza).
 */
export function exhaustFijado(s: GameState, champId: string): boolean {
  for (const jugador of ['A', 'B'] as PlayerId[]) {
    const campo = [
      ...s.players[jugador].campo.campeones,
      ...s.players[jugador].campo.misticasTacticas,
      ...s.players[jugador].campo.arcanasCombate,
    ]
    for (const id of campo) {
      if (!id) continue
      const fuente = s.instances[id]
      if (fuente?.fijadoExhaustTargetId !== champId) continue
      if (!fuente.cardId) continue
      const meta = getCardMeta(fuente.cardId)
      if (!meta || !('efectos' in meta) || !meta.efectos) continue
      const efecto = meta.efectos.find((e) => e.tramos?.some((t) => t.efecto === 'fix_exhaust'))
      const tramo = efecto?.tramos?.find((t) => t.efecto === 'fix_exhaust')
      if (!tramo) continue
      if ((fuente.eterBloqueado?.length ?? 0) >= tramo.umbral) return true
    }
  }
  return false
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

    const idxReagrupar = meta.efectos.findIndex(
      (e) =>
        e.reagrupar?.fase === 'alba' &&
        e.reagrupar?.turno === 'propio' &&
        (e.costo?.tipo === 'bloqueo_fijo' || e.costo?.tipo === 'eter_bloqueado'),
    )
    if (idxReagrupar === -1) continue

    // Fase 2 (d): el reagrupar libera SOLO el Éter de SU fuente/efecto — el
    // Éter de otros efectos de la misma carta permanece (eterDeEfecto: sin tag
    // cuenta como propio, fallback de compatibilidad).
    const eteres = eterDeEfecto(s, id, idxReagrupar)
    if (eteres.length === 0) continue
    quitarEteres(s, id, eteres)
    // Reserva de cada PAGADOR (NO 1A) — liberarEterA agrupa por pagadoPor
    const grupos = liberarEterA(s, eteres, '2A', jugador)
    for (const [pagador, ids] of Object.entries(grupos) as [PlayerId, string[]][]) {
      ctx.emit({ type: 'eter_reagrupado', jugador: pagador, eterIds: ids })
    }
    // Flags de umbrales/copy/tramos: solo si la carta quedó SIN Éter
    limpiarFlagsUmbralSiVacia(s, id)

    // Steal 'mientras_ester_bloqueado': termina SOLO si la fuente quedó sin
    // Éter de cualquier fuente (evaluarFinSteal lo decide — ≥1 lo sostiene).
    evaluarFinSteal(s, ctx, id)
  }
}

/**
 * Termina un steal 'mientras_ester_bloqueado': campeones con stolenBy=fuente.
 * MOVIDO a eter.ts (módulo hoja) — unifica las 3 copias inline que había
 * (replacements, effectRegistry —que ni devolvía el éter del ladrón—, y
 * ésta). Re-export para no romper imports existentes (index.ts, tests).
 */
export { retornarCampeonesRobados } from './eter'

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
  // Fallback chain: objetivo.zona → efectoData.zonaOrigen → 'mazo'
  // (FB-012: Card-Maker pone zonaOrigen a nivel carta, no en objetivo)
  const zonaOrigen = efectoData.objetivo?.zona ?? efectoData.zonaOrigen ?? 'mazo'
  const zonaDestino = efectoData.objetivo?.zonaDestino ?? 'mano'
  const p = s.players[jugador]

  // Destino campo: verificar slot ANTES de remover de la origen (sin leak)
  if (zonaDestino === 'campo' && p.campo.campeones.indexOf(null) === -1) return
  // Doctrina Capa 2 (bug B7): destino validado ANTES de remover — con un
  // destino no soportado la carta se removía de su origen y no entraba a
  // ninguna zona (leak de instancia). Soportados: mano, campo, cementerio,
  // exilio, mazo (al fondo).
  if (zonaDestino !== 'mano' && zonaDestino !== 'campo' && zonaDestino !== 'cementerio' &&
      zonaDestino !== 'exilio' && zonaDestino !== 'mazo') return

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
    } else if (zonaDestino === 'cementerio') {
      // Ya removida de la origen: enviarAlCementerio solo inserta en 2G (idempotente)
      // + libera Éter + dispara al-ser-enviado-al-cementerio (capa C5 correcta).
      enviarAlCementerio(s, ctx, targetId)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: targetId, zona: '2G', jugador, bocaArriba: true })
    } else if (zonaDestino === 'exilio') {
      p.exilio.push(targetId)
      ctx.emit({ type: 'carta_exiliada', cardInstanceId: targetId, jugador })
    } else if (zonaDestino === 'mazo') {
      p.mazo.push(targetId) // al fondo (bottom) — el tope queda intacto
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: targetId, zona: '3G', jugador, bocaArriba: false })
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
 * Execute modificar_regla: registra una modificación TEMPORAL de una regla del manual (Capa 2).
 * Los efectos permanentes mientras la carta está en juego (pasivo/continuo/Éter/Vínculo) NO pasan por
 * aquí: se derivan del estado en reglas.ts. Esto cubre los de resolución (hechizo, disparo, trigger).
 * Duración: misma traducción que buff — turno/n_turnos/hasta_fase expiran; permanente/mientras_* no.
 */
function executeModificarRegla(s: GameState, targetIds: string[], jugador: PlayerId, efectoData: EfectoData): void {
  const m = efectoData.regla
  if (!m) return
  const def = REGLAS[m.id]
  const { duracion, duracionTurnos, duracionFase, duracionControlador } = efectoData
  const expira: ExpiraModificador =
    duracion === undefined || duracion === 'permanente' || duracion === 'mientras_en_campo' || duracion === 'mientras_ester_bloqueado' || duracion === 'mientras_equipped'
      ? 'permanente'
      : duracion === 'hasta_fase'
        ? 'hasta-fase'
        : 'ocaso'
  const comunes = {
    regla: m.id,
    operacion: m.operacion,
    valor: m.valor,
    duenio: jugador,
    expira,
    ...(duracion === 'n_turnos' ? { turnosRestantes: duracionTurnos } : {}),
    ...(expira === 'hasta-fase' && duracionFase
      ? { expiraFase: duracionFase, expiraFaseJugador: duracionControlador === 'rival' ? (jugador === 'A' ? 'B' : 'A') : jugador }
      : {}),
  } as const
  const rival: PlayerId = jugador === 'A' ? 'B' : 'A'

  if (def.ambito === 'partida') {
    aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: 'partida' } })
  } else if (def.ambito === 'jugador') {
    const c = efectoData.objetivo?.controlador ?? 'propio'
    const afectados: PlayerId[] = c === 'ambos' ? ['A', 'B'] : c === 'rival' ? [rival] : [jugador]
    for (const j of afectados) aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: 'jugador', jugador: j } })
  } else {
    for (const instId of targetIds) aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: 'carta', instId } })
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
  caster?: PlayerId,
  duracionFase?: 'alba' | 'forja' | 'choque' | 'ocaso',
  duracionControlador?: 'propio' | 'rival',
): void {
  if (!stats) return

  // Calculate modifier expiration — ExpiraModificador = 'ocaso' | 'alba-dueño' | 'permanente' | 'hasta-fase' (B6)
  const expira = duracion === 'permanente' ? 'permanente' :
                 duracion === 'mientras_en_campo' ? 'permanente' :
                 duracion === 'mientras_ester_bloqueado' ? 'permanente' :
                 duracion === 'mientras_equipped' ? 'permanente' :
                 duracion === 'hasta_fase' ? 'hasta-fase' :
                 'ocaso' // turno, 1_por_turno, n_turnos → expira en Ocaso

  // B6: fase+dueño que dispara la purga — 'propio' = fase del que lanza,
  // 'rival' = fase del rival del que lanza (comparado con s.turno al entrar).
  const hastaFase = expira === 'hasta-fase' && duracionFase && caster
    ? { fase: duracionFase, jugador: duracionControlador === 'rival' ? (caster === 'A' ? 'B' : 'A') : caster }
    : undefined

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
      aplicarMod(s, targetId, 'poder', atqDelta, expira, turnosRestantes, hastaFase)
    }
    if (resDelta !== 0) {
      aplicarMod(s, targetId, 'resistencia', resDelta, expira, turnosRestantes, hastaFase)
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
      liberarArtefactosEquipados(s, ctx, targetId) // §10: el Artefacto equipado sale con el Campeón
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
 * §13.2: robar con el Mazo Principal vacío derrota AL MOMENTO de intentar
 * robar — sin importar el origen del robo (Alba o efecto). Comparte la misma
 * primitiva que el Alba (draw.ts) para que la derrota sea idéntica.
 */
function executeDraw(
  s: GameState,
  ctx: Ctx,
  jugador: PlayerId,
  cantidad: number,
): void {
  for (let i = 0; i < cantidad; i++) {
    if (s.fase === 'terminada') return // la partida ya terminó con este robo
    robarCarta(s, ctx, jugador)
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
  caster?: PlayerId,
  duracionFase?: 'alba' | 'forja' | 'choque' | 'ocaso',
  duracionControlador?: 'propio' | 'rival',
): void {
  if (!keyword) return

  // B6 (hasta_fase): la keyword vive en keywordsHastaFase — NO en
  // keywordsTemporales (así sobrevive al Ocaso hasta la fase objetivo) y
  // purgarHastaFase la retira al entrar esa fase+dueño.
  const hastaFase = duracion === 'hasta_fase' && duracionFase && caster
    ? { fase: duracionFase, jugador: duracionControlador === 'rival' ? (caster === 'A' ? 'B' : 'A') : caster }
    : undefined

  for (const targetId of targetIds) {
    if (hastaFase) {
      const inst = s.instances[targetId]
      if (inst) {
        inst.keywordsHastaFase = [...(inst.keywordsHastaFase ?? []), { keyword, ...hastaFase }]
      }
    } else {
      const temporal = duracion !== 'permanente'
      otorgarKeyword(s, targetId, keyword, temporal)
    }
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
    // §10: si un Campeón vuelve a la mano, su Artefacto equipado va al Cementerio
    liberarArtefactosEquipados(s, ctx, targetId)

    // Add to hand
    p.mano.push(targetId)
    ctx.emit({ type: 'carta_devuelta_a_mano', cardInstanceId: targetId, jugador: owner })
  }
}

/**
 * Execute steal_champion effect.
 *
 * Regla del Éter (manual §7.8, decisión 2026-10-14): el Éter bloqueado en un
 * Campeón pertenece al jugador que lo pagó. Al tomar control, el Éter del
 * Campeón robado se reagrupa DE INMEDIATO a la Reserva del dueño original —
 * el ladrón toma el Campeón SIN Éter y puede bloquear el suyo propio después.
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

    // §7.8: el Éter bloqueado del Campeón (pagado por su dueño) se reagrupa
    // inmediato a su PAGADOR — el ladrón lo toma sin Éter (Fase 2 (f):
    // liberarEterA agrupa por pagadoPor; fallback = dueño de la instancia).
    if (targetInst.eterBloqueado && targetInst.eterBloqueado.length > 0) {
      const eteres = [...targetInst.eterBloqueado]
      delete targetInst.eterBloqueado
      delete targetInst.efectoUmbralDisparado
      delete targetInst.copyOneShotDisparado
      delete targetInst.tramosDisparados
      delete targetInst.fijadoExhaustTargetId
      const grupos = liberarEterA(s, eteres, '2A', targetInst.owner)
      for (const [pagador, ids] of Object.entries(grupos) as [PlayerId, string[]][]) {
        ctx.emit({ type: 'eter_reagrupado', jugador: pagador, eterIds: ids })
      }
    }

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
    // El campeón robado conserva su estado de agotamiento tal cual estaba:
    // si estaba agotado llega agotado; si no, no. (regla del usuario / manual)

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
 * Remove an ether from its current zone (Reserva or Pagado) — de AMBOS
 * jugadores: con controladorDestino (B5) un Éter puede haber sido movido a la
 * zona de OTRO jugador sin cambiar inst.owner — buscar solo en `owner` lo
 * perdía (found=false → el mover se salteaba).
 * Returns true if removed, false if not found.
 * NOTE: Does NOT touch eterBloqueado — blocked ether has special game semantics.
 */
function removeEterFromCurrentZone(
  s: GameState,
  targetId: string,
  owner: PlayerId,
): boolean {
  for (const j of [owner, owner === 'A' ? 'B' : 'A'] as PlayerId[]) {
    const p = s.players[j]

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
  }

  return false
}

/**
 * B5 (obs 1860): jugador que recibe la ZONA DESTINO — objetivo.controladorDestino:
 * 'propio' → el que lanza (TRANSFIERE entre jugadores), 'rival' → rival del que
 * lanza, 'dueno'/ausente → inst.owner (DEFAULT — decisión usuario 2026-10-22:
 * FB-017 'a su zona de pago' y FB-027 'de su dueño' son la mayoría del seed;
 * DS-017 'a tu Reserva' necesita controladorDestino:'propio' en el Card-Maker).
 */
function jugadorDestino(
  controladorDestino: 'propio' | 'rival' | 'dueno' | undefined,
  jugador: PlayerId,
  inst: CardInstance,
): PlayerId {
  if (controladorDestino === 'propio') return jugador
  if (controladorDestino === 'rival') return jugador === 'A' ? 'B' : 'A'
  return inst.owner
}

/**
 * Execute return_ether effect.
 * Respects cantidad field — only returns up to N ethers.
 *
 * Doctrina Capa 2 (2026-10-22): el destino se determina ANTES de remover —
 * un destino desconocido NO remueve (antes solo existía 'reserva' y cualquier
 * otro destino removía el Éter sin insertarlo a ninguna parte = pérdida de
 * estado, bug B7). Destinos posibles: reserva, pagado, mano, cementerio,
 * exilio (si un efecto lo pide explícitamente, Capa 2 > §7.2).
 */
function executeReturnEther(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
  cantidad?: number,
  jugador?: PlayerId,
  controladorDestino?: 'propio' | 'rival' | 'dueno',
): void {
  if (!esDestinoEter(zonaDestino)) return // destino inválido → sin remoción (sin leak)
  const limit = cantidad ?? targetIds.length
  let count = 0
  for (const targetId of targetIds) {
    if (count >= limit) break
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    // B5: destino = jugadorDestino (controladorDestino), remoción del dueño físico
    const destino = jugador !== undefined ? jugadorDestino(controladorDestino, jugador, inst) : owner

    // Remove from ANY current zone
    const removed = removeEterFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    count++
    moverEterADestino(s, ctx, targetId, destino, zonaDestino!)
  }
}

/** ¿El destino es una zona válida para Éter? (destino decidido ANTES de remover) */
function esDestinoEter(zonaDestino: string | undefined): boolean {
  return zonaDestino === 'reserva' || zonaDestino === 'pagado' || zonaDestino === 'mano' ||
    zonaDestino === 'cementerio' || zonaDestino === 'exilio'
}

/** Inserta el Éter en su destino + evento correspondiente. */
function moverEterADestino(s: GameState, ctx: Ctx, eterId: string, owner: PlayerId, destino: string): void {
  const p = s.players[owner]
  if (destino === 'reserva') {
    p.eterReserva.push(eterId)
    ctx.emit({ type: 'eter_movido', cardInstanceId: eterId, destino: 'reserva', jugador: owner })
  } else if (destino === 'pagado') {
    p.eterPagado.push(eterId)
    ctx.emit({ type: 'eter_movido', cardInstanceId: eterId, destino: 'pagado', jugador: owner })
  } else if (destino === 'mano') {
    p.mano.push(eterId)
    ctx.emit({ type: 'eter_movido', cardInstanceId: eterId, destino: 'mano', jugador: owner })
  } else if (destino === 'cementerio') {
    p.cementerio.push(eterId)
    ctx.emit({ type: 'eter_movido', cardInstanceId: eterId, destino: 'cementerio', jugador: owner })
  } else if (destino === 'exilio') {
    p.exilio.push(eterId)
    ctx.emit({ type: 'eter_movido', cardInstanceId: eterId, destino: 'exilio', jugador: owner })
  }
}

/**
 * Execute mover effect.
 * Doctrina Capa 2: mismo contrato que executeReturnEther — destino válido
 * ANTES de remover; destino desconocido/ausente → no-op sin pérdida (bug B7).
 */
function executeMover(
  s: GameState,
  ctx: Ctx,
  targetIds: string[],
  zonaDestino: string | undefined,
  jugador?: PlayerId,
  controladorDestino?: 'propio' | 'rival' | 'dueno',
): void {
  if (!esDestinoEter(zonaDestino)) return
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue

    const owner = inst.owner
    // B5: la ZONA DESTINO es de jugadorDestino; la REMOCIÓN es del dueño
    // físico (removeEterFromCurrentZone busca en ambos players de todos modos).
    const destino = jugador !== undefined ? jugadorDestino(controladorDestino, jugador, inst) : owner

    // Remove from ANY current zone
    const removed = removeEterFromCurrentZone(s, targetId, owner)
    if (!removed) continue

    moverEterADestino(s, ctx, targetId, destino, zonaDestino!)
  }
}

/**
 * Execute toggle_exhaust effect.
 * Capa 3b: el campeón con agotamiento FIJADO (fix_exhaust activo) no puede
 * cambiar su estado de agotamiento — el toggle no lo afecta.
 */
function executeToggleExhaust(
  s: GameState,
  targetIds: string[],
): void {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId]
    if (!inst) continue
    if (exhaustFijado(s, targetId)) continue

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