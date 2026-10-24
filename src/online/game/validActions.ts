import { getCardMeta, esArcana, efectoActivableDe, esCostoBloqueo } from './cards'
import { eterDeEfecto } from './eter'
import type { AnyCard } from '../../shared/types'
import type { Action } from './actions'
import { generarAccionesForja, validarActivarArcana } from './actions'
import { atacantesElegibles, asignacionForzada, ataquesSinBloquear, bloqueadoresDisponibles, rivalDe, tieneKeyword } from './combat'
import { respondiblesDe, respuestasDeMano } from './chain'
import { etersParaPagar } from './payments'
import { validarEquiparArtefacto } from './movimientos'
import type { GameState, PlayerId, CardInstance } from './types'

/**
 * El actor de la jugada actual NO es siempre `estado.turno`:
 * - Checkpoint prevent_destroy (Fase 2c) → el jugador que debe elegir.
 * - Cadena 9.6 abierta → el actor es `cadena.prioridad` (el turno queda congelado).
 * - Paso bloqueo (9.3, ADR-11) → el actor es el DEFENSOR (rival del activo).
 * - Resto → el jugador activo.
 * Usado por UI y por el servidor (Edge Function) para validar de quién es el turno.
 */
export function actorActual(estado: GameState): PlayerId | null {
  if (estado.fase === 'terminada') return null
  const preven = estado.preventivosPendientes?.[0]
  if (preven) return preven.jugador
  // Cadena GLOBAL (state.cadena) o de combate: el actor es SIEMPRE prioridad —
  // aunque la fase sea Forja. Sin esto, cadena global en Forja congela al
  // humano (solo rendirse) y el bot nunca pasa prioridad → FREEZE (seed 66676).
  const cadena = estado.combate?.cadena ?? estado.cadena
  if (cadena) return cadena.prioridad
  if (estado.fase === 'choque' && estado.combate?.paso === 'bloqueo') {
    return estado.turno === 'A' ? 'B' : 'A'
  }
  return estado.turno
}

/**
 * Acciones de bloqueo de Éter de `playerId` (decisión A9 — §8.3a: "cualquier
 * fase menos Alba"). `enCadena` permite exponerlo como RESPUESTA dentro de
 * una cadena (el bloqueo no participa de la pila — es estado directo).
 * En Choque CON combate en curso (fuera de cadena) no se expone: el paso de
 * bloqueo del defensor y la Ruptura forzosa tienen su propio flujo.
 */
function accionesBloqueoEter(state: GameState, playerId: PlayerId, enCadena = false): Action[] {
  const acciones: Action[] = []
  if (!enCadena && state.fase === 'choque' && state.combate) return acciones
  const p = state.players[playerId]
  // Campeones y Artefactos (Místicas/Arcanas) con costo-bloqueado en efectos[].
  // - bloqueo_fijo ("Bloquea X Éter") → UNA acción con el juego EXACTO.
  // - eter_bloqueado ("hasta X") → una acción por Éter hasta el máximo.
  const generarBloqueos = (targets: { id: string; inst: CardInstance; meta: AnyCard }[]) => {
    for (const t of targets) {
      // Fase 2 (b): una tanda de acciones POR CADA efecto fuente (NO-disparo
      // con costo-bloqueo). Carta de UN efecto → idéntico a antes; multi-efecto
      // → cada efecto valida/cuenta SOLO su Éter (eterDeEfecto) y la acción
      // lleva efectoIdx para que la ejecución etiquete la MISMA fuente.
      if (!('efectos' in t.meta) || !t.meta.efectos) continue
      const fuentes = t.meta.efectos
        .map((efecto, i) => ({ efecto, i }))
        .filter(({ efecto }) => esCostoBloqueo(efecto.costo) && efecto.tipo !== 'disparo')
      if (fuentes.length === 0) continue
      for (const { efecto, i } of fuentes) {
        // Fase 2 (c): la ZONA de origen del pago define los éteres disponibles
        const zonaOrigen = efecto.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
        const disponibles = zonaOrigen.filter((id) => {
          const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
          return meta !== null
        })
        const actuales = eterDeEfecto(state, t.id, i).length
        const maxEter = efecto.costo?.cantidad ?? 1
        const fijo = efecto.costo?.tipo === 'bloqueo_fijo'
        const multi = fuentes.length > 1 ? { efectoIdx: i } : {}
        if (fijo) {
          // Pago exacto: arma la acción completa con los Éteres que faltan.
          const falta = maxEter - actuales
          if (falta > 0 && disponibles.length >= falta) {
            acciones.push({
              type: 'bloquear_eter',
              eterIds: disponibles.slice(0, falta),
              targetInstanceId: t.id,
              ...multi,
            })
          }
        } else {
          let generados = actuales
          for (const eterId of disponibles) {
            if (generados >= maxEter) break
            acciones.push({ type: 'bloquear_eter', eterIds: [eterId], targetInstanceId: t.id, ...multi })
            generados++
          }
        }
      }
    }
  }
  const campeonesBloqueo = p.campo.campeones
    .filter((id): id is string => id !== null)
    .map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null }))
    .filter((t): t is { id: string; inst: CardInstance; meta: AnyCard } => t.inst != null && t.meta != null)
  generarBloqueos(campeonesBloqueo)
  // Fase 3a: Artefactos en 3A-3C / 3D-3F con costo-bloqueado (manual §7.7)
  const artefactosBloqueo = [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]
    .filter((id): id is string => id !== null)
    .map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null }))
    .filter((t): t is { id: string; inst: CardInstance; meta: AnyCard } => t.inst != null && t.meta != null)
  generarBloqueos(artefactosBloqueo)
  return acciones
}

/**
 * TODAS las asignaciones maximales de bloqueo (decisión A5 — §9.3: "El
 * defensor elige CON QUÉ Campeón(es) bloquear" pero debe bloquear lo máximo
 * posible). Genera C(ataques,k) × P(bloqueadores,k) con
 * k = min(disponibles, ataques) — ≤ 120 con 5v5. La PRIMERA es la greedy
 * determinista (ADR-19) para que los bots no cambien de comportamiento.
 */
function asignacionesMaximales(state: GameState): Record<string, string>[] {
  const k = Math.min(bloqueadoresDisponibles(state).length, ataquesSinBloquear(state).length)
  if (k === 0) return []
  const ataques = ataquesSinBloquear(state)
  const disponibles = bloqueadoresDisponibles(state)

  // Permutaciones de largo k de un arreglo (P(n,k))
  const perms = <T,>(arr: T[], largo: number): T[][] => {
    if (largo === 0) return [[]]
    const out: T[][] = []
    for (let i = 0; i < arr.length; i++) {
      const resto = [...arr.slice(0, i), ...arr.slice(i + 1)]
      for (const tail of perms(resto, largo - 1)) out.push([arr[i], ...tail])
    }
    return out
  }
  // Combinaciones de largo k de un arreglo (C(n,k))
  const combos = <T,>(arr: T[], largo: number): T[][] => {
    if (largo === 0) return [[]]
    const out: T[][] = []
    for (let i = 0; i <= arr.length - largo; i++) {
      for (const tail of combos(arr.slice(i + 1), largo - 1)) out.push([arr[i], ...tail])
    }
    return out
  }

  const greedy = asignacionForzada(state)
  const resultado: Record<string, string>[] = []
  if (greedy) resultado.push(greedy)
  for (const subAtaques of combos(ataques, k)) {
    for (const ordenBloqueadores of perms(disponibles, k)) {
      const asig: Record<string, string> = {}
      subAtaques.forEach((atk, i) => { asig[atk] = ordenBloqueadores[i] })
      if (greedy && JSON.stringify(asig) === JSON.stringify(greedy)) continue // ya está primero
      resultado.push(asig)
    }
  }
  return resultado
}

/**
 * Todos los subconjuntos NO vacíos de un arreglo (A6 — §9.2: "elige qué
 * Campeones atacan"). El PRIMERO es el conjunto completo (los bots hacen
 * find() de declarar_ataque y esperan "todos" primero).
 */
function subconjuntosNoVacios<T>(arr: T[]): T[][] {
  const out: T[][] = [arr]
  const n = arr.length
  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    const sub: T[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) sub.push(arr[i])
    if (sub.length > 0 && sub.length < n) out.push(sub)
  }
  return out
}

/**
 * getValidActions(state, playerId) — acciones legales del jugador ACTIVO
 * (state.turno) en la fase activa; `rendirse` siempre (ADR-5: nunca acciones
 * que fallarán por validación; operan sobre el estado interno completo,
 * anti-cheat: los payloads solo referencian ids visibles al jugador, 6.2).
 *
 * Alcance C3: pre_partida (mulligan/pasar_mulligan del decisor, orden A→B).
 * C4: forja/choque → pasar_turno; ocaso → pasar_turno (mano ≤ 6) + descartar.
 * C5: forja → jugar/colocar por carta en mano (generador de payloads que
 * NUNCA fallan) + bloquear_eter por Campeón propio con Éter compartido.
 * C2: choque → sub-máquina (9.1): paso ataque (declarar_ataque del activo),
 * paso bloqueo (declarar_bloqueo FORZOSO del DEFENSOR — excepción al "solo
 * jugador activo": en paso bloqueo el actor es el RIVAL, ADR-11), paso
 * resolución (elegir_ruptura FORZOSA §9.4 — solo romper, sin "no romper";
 * si no hay objetivos válidos → pasar_turno con limpieza).
 * (R12, R15; Ruptura C3/ADR-13 + cambio de regla 2026-10-14)
 */
export function getValidActions(state: GameState, playerId: PlayerId): Action[] {
  // Checkpoint prevent_destroy (Fase 2c): mientras haya pendiente de prevenión,
  // SOLO el jugador que debe elegir recibe responder_prevenicion (ambas opciones).
  // El resto del motor queda congelado hasta resolver (determinismo ADR-5).
  const preven = state.preventivosPendientes?.[0]
  if (preven) {
    if (playerId !== preven.jugador) return []
    return [
      { type: 'responder_prevenicion', prevenir: true },
      { type: 'responder_prevenicion', prevenir: false },
    ]
  }
  // Pendiente de equipar ARTEFACTO: solo equipar_artefacto (+ rendirse).
  // El artefacto ya está en campo; los efectos se resuelven tras el equip.
  const equipPend = state.equiparPendiente
  if (equipPend) {
    // Defensa: si el artefacto ya está equipado (equip vía efecto u otro
    // camino), limpiar el pendiente y continuar con el flujo normal.
    const instPend = state.instances[equipPend.artefactoId]
    if (instPend?.equipadoA) {
      delete state.equiparPendiente
    } else {
      if (playerId !== equipPend.jugador) return [{ type: 'rendirse' }]
      const accionesEquip: Action[] = [{ type: 'rendirse' }]
      if (instPend) {
        const p = state.players[playerId]
        for (const campeonId of p.campo.campeones) {
          if (!campeonId) continue
          const accion: Action = { type: 'equipar_artefacto', cardInstanceId: equipPend.artefactoId, campeonInstanceId: campeonId }
          if (validarEquiparArtefacto(state, accion) !== null) continue
          accionesEquip.push(accion)
        }
      }
      return accionesEquip
    }
  }
  if (state.fase === 'terminada') return []
  const acciones: Action[] = [{ type: 'rendirse' }]

  if (state.turno === playerId && state.fase === 'pre_partida') {
    const p = state.players[playerId]
    // Mulligan opcional, 1 vez POR JUGADOR (manual §2) — el rival no afecta
    // tu derecho a mulliganear.
    if (!p.mulliganUsado) acciones.push({ type: 'mulligan' })
    acciones.push({ type: 'pasar_mulligan' })
  }

  // Cadena abierta (combate 9.6 O global): SOLO responder/pasar del jugador con prioridad —
  // el resto del turno queda CONGELADO (ni declarar_bloqueo del defensor, ni
  // Ruptura, ni pasar_turno del activo) hasta cerrar la cadena.
  const cadena = state.combate?.cadena ?? state.cadena
  if (cadena) {
    if (cadena.prioridad === playerId) {
      for (const id of respondiblesDe(state, playerId)) {
        acciones.push({ type: 'responder_cadena', cardInstanceId: id })
      }
      // Respuesta desde la MANO (obs 1874): Místicas Presteza jugadas pagando
      // su coste — entran directo a la pila (jugar_respuesta).
      for (const id of respuestasDeMano(state, playerId)) {
        const instR = state.instances[id]
        if (!instR?.cardId) continue
        const eterIds = etersParaPagar(state, playerId, instR.cardId)
        if (eterIds !== null) {
          acciones.push({ type: 'jugar_respuesta', cardInstanceId: id, eterIds })
        }
      }
      // A9 (§8.3a): el bloqueo de Éter es una activación de continuo válida
      // COMO RESPUESTA — se expone con prioridad en la cadena (estado
      // directo, no entra a la pila; la cadena no avanza por bloquear).
      acciones.push(...accionesBloqueoEter(state, playerId, true))
      acciones.push({ type: 'pasar_prioridad' })
    }
    return acciones
  }

  if (state.turno === playerId) {
    const p = state.players[playerId]
    // C3 (D1): elegir_objetivo — frente de la cola FIFO del jugador activo
    // (patrón de elegir_opcion, pero aplica en forja Y choque: al-invocar y
    // al-atacar arman pendientes). Fix 2026-10-14: las opciones se RE-VALIDAN
    // contra instances — si la carta opción salió de zona (muerte/exilio/robo)
    // antes de elegir, la acción no se ofrece (antes: panel vacío que no
    // hacía nada). Si el pendiente quedó sin opciones vivas se descarta
    // (mismo patrón defensivo que equiparPendiente) para no atascar la FIFO.
    const pendiente = state.objetivosPendientes?.[0]
    if (pendiente && pendiente.jugador === playerId) {
      const opcionesVivas = pendiente.opciones.filter((id) => state.instances[id])
      if (opcionesVivas.length === 0) {
        state.objetivosPendientes = state.objetivosPendientes!.slice(1)
      } else {
        for (const objetivoId of opcionesVivas) {
          acciones.push({ type: 'elegir_objetivo', objetivoId })
        }
      }
    }
    // C3d (D4): usar_transmutar — Campeón propio con keyword `Transmutar` en
    // campo (forja o choque): regresa hasta 2 Éteres pagados (1A) a la
    // Reserva. Solo se expone con 1A disponible y la variante de retorno
    // máximo (la vacía es una acción estrictamente dominada; el validador la
    // acepta igual, pero getValidActions nunca la sugiere).
    for (const champId of p.campo.campeones) {
      if (!champId || !tieneKeyword(state, champId, 'Transmutar')) continue
      if (p.eterPagado.length > 0) {
        acciones.push({ type: 'usar_transmutar', cardInstanceId: champId, eterIds: p.eterPagado.slice(0, 2) })
      }
    }
    // Activar Habilidades: Campeones con efectos[] tipo continuo o disparo
    // Continuo (bloquea éter): NO puede activar si agotado; agota al activar.
    // Disparo (paga éter): SÍ puede activar si agotado; NO agota.
    // NOTE: Alba is auto-resolved (ADR-3) and never an observable state.
    for (const champId of p.campo.campeones) {
      if (!champId) continue
      const inst = state.instances[champId]
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
      if (!meta) continue

      // Fase 3b → REDISEÑO obs 1874: el candado championNegado se eliminó —
      // la negación es un contador sobre la activación pendiente de la ventana.

      // Check efectos[] for active abilities — ROUTING POR EFECTO (§7.7).
      // El efecto que activar_habilidad ejecuta lo decide SU costo:
      // - costo-bloqueo (disparo) → patrón "Bloqueado": bloquea N y ejecuta,
      //   1/turno (puede activar agotado);
      // - pago 'eter' → patrón "Agota"/Continuo: paga a 1A, no agotado, 1/turno.
      // Continuos con costo-bloqueo (steal Aurora, double_attack FB-015) NO
      // llegan aquí: su acción es bloquear_eter (aura/umbral), nunca activar.
      const efectoAct = efectoActivableDe(meta, false)
      if (efectoAct && inst) {
        const costoBloqueo = esCostoBloqueo(efectoAct.costo)
        const costo = efectoAct.costo?.cantidad ?? 0
        // Fase 2 (c): el patrón Bloqueado paga desde la zona de ORIGEN del
        // costo ('pagado' 1A / default 'reserva' 2A); el patrón Agota (else)
        // sigue pagando desde Reserva → 1A por diseño.
        const zonaAct = costoBloqueo && efectoAct.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
        const eteresValidos = zonaAct.filter((id) => {
          const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
          return eterMeta !== null
        })
        if (costoBloqueo) {
          // Patrón "Bloqueado": 1/turno, costo exacto, sin check de agotado
          if (inst.opcionUsadaEsteTurno) continue
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) })
          }
        } else if (efectoAct.tipo === 'continuo') {
          // Continuo pagado: NO puede activar si agotado; 1/turno
          if (inst.agotado || inst.opcionUsadaEsteTurno) continue
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) })
          } else if (costo === 0 && eteresValidos.length > 0) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: [eteresValidos[0]] })
          }
        } else {
          // Patrón "Agota" (disparo pago): necesita no agotado + no usado
          if (inst.agotado || inst.opcionUsadaEsteTurno) continue
          const costoReal = costo > 0 ? costo : 1
          if (p.eterReserva.length >= costoReal) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: p.eterReserva.slice(0, costoReal) })
          }
        }
      }
    }
    // ── A8/A9 (§8.3a): Bloqueo de Éter y Activación de Arcanas en CUALQUIER
    // fase excepto Alba. En Choque solo cuando no hay combate en curso (los
    // flujos de bloqueo/ruptura/cadena del combate son propios); en Ocaso
    // solo si no hay descartes pendientes. Dentro de cadenas se exponen en
    // su rama arriba (respuesta con prioridad).
    const faseGeneralOk =
      state.fase === 'forja' ||
      (state.fase === 'choque' && !state.combate) ||
      (state.fase === 'ocaso' && p.mano.length <= 6)
    if (faseGeneralOk) {
      acciones.push(...accionesBloqueoEter(state, playerId))
      // Activar Arcanas (A8): el jugador activa sus Arcanas boca abajo pagando su coste
      for (const id of p.campo.arcanasCombate) {
        if (!id) continue
        const inst = state.instances[id]
        if (!inst || inst.bocaArriba) continue // solo boca abajo
        const meta = inst.cardId ? getCardMeta(inst.cardId) : null
        if (!meta || !esArcana(meta)) continue
        const eterIds = etersParaPagar(state, playerId, meta.id)
        if (!eterIds) continue
        const slot = p.campo.arcanasCombate.indexOf(id)
        const accion: Action = { type: 'activar_arcana', cardInstanceId: id, slot, eterIds }
        if (validarActivarArcana(state, accion) !== null) continue
        acciones.push(accion)
      }
    }
    if (state.fase === 'forja') {
      // Jugadas por carta en mano (el generador garantiza payloads válidos)
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id)
        if (accion) acciones.push(accion)
      }
      // C2: elegir_opcion — opciones pendientes del Pasivo 1A (FB-005/DS-006)
      for (const opcion of state.opcionesPendientes ?? []) {
        if (opcion.jugador === playerId) {
          acciones.push({ type: 'elegir_opcion', opcionId: opcion.eterId })
        }
      }
      // Equipar Artefacto: cartas con keyword ARTEFACTO en campo (3A-3C / 3D-3F) → Campeón propio (2B-2F)
      for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
        if (!id) continue
        const inst = state.instances[id]
        if (!inst || inst.equipadoA) continue // ya equipada
        const meta = inst.cardId ? getCardMeta(inst.cardId) : null
        if (!meta || !('keywords' in meta) || !meta.keywords?.includes('Artefacto')) continue
        // Generar una acción por cada campeón propio elegible
        for (const campeonId of p.campo.campeones) {
          if (!campeonId) continue
          const accion: Action = { type: 'equipar_artefacto', cardInstanceId: id, campeonInstanceId: campeonId }
          if (validarEquiparArtefacto(state, accion) !== null) continue
          acciones.push(accion)
        }
      }
      acciones.push({ type: 'pasar_turno' })
    } else if (state.fase === 'choque') {
      const combate = state.combate
      if (!combate) {
        // Paso ataque (9.2 + decisión A6 2026-10-22): el atacante elige
        // CUALQUIER subconjunto de elegibles — "todos" primero (los bots
        // hacen find() de declarar_ataque), luego los subconjuntos
        // (incluye individuales — la UI individual ya existía).
        const elegibles = atacantesElegibles(state)
        if (elegibles.length > 0) {
          for (const sub of subconjuntosNoVacios(elegibles)) {
            acciones.push({ type: 'declarar_ataque', atacanteIds: sub })
          }
        }
        // Tácticas jugables durante Choque (regla: se pueden jugar en cualquier fase de tu turno)
        for (const id of p.mano) {
          const accion = generarAccionesForja(state, playerId, id)
          if (accion) acciones.push(accion)
        }
        acciones.push({ type: 'pasar_turno' })
      } else if (combate.paso === 'resolucion') {
        // Resolución (9.4-A, Ruptura FORZOSA — decisión 2026-10-14): si quedó
        // al menos un ataque sin bloquear y hay Vínculos boca abajo del rival,
        // DEBE romperse 1 — ya no existe "no romper" (la elección es al atacar).
        // Sin cardIds: el slot se elige a ciegas (6.2, anti-cheat). Máx 1 por
        // turno (rupturaUsadaEsteTurno). Si no hay objetivos válidos (todo
        // bloqueado / sin Vínculos / atacante murió por efecto), solo pasar_turno.
        const opcionesRuptura: Action[] = []
        if (!combate.rupturaUsadaEsteTurno && combate.rupturaDisponible) {
          const rival = rivalDe(state)
          for (const atacanteId of ataquesSinBloquear(state)) {
            if (!state.players[state.turno].campo.campeones.includes(atacanteId)) continue // murió en el daño
            state.players[rival].vinculos.forEach((vinculoId, slot) => {
              const v = vinculoId ? state.instances[vinculoId] : undefined
              if (vinculoId && !v?.bocaArriba) {
                opcionesRuptura.push({ type: 'elegir_ruptura', atacanteId, vinculoSlot: slot })
              }
            })
          }
        }
        if (opcionesRuptura.length > 0) {
          // Forzosa: mientras haya Ruptura pendiente no se ofrece pasar_turno
          acciones.push(...opcionesRuptura)
        } else {
          acciones.push({ type: 'pasar_turno' })
        }
      }
      // Paso bloqueo: el actor es el DEFENSOR (rival) — el activo no tiene
      // acciones propias hasta resolver el bloqueo (R15).
    } else if (state.fase === 'ocaso') {
      if (p.mano.length <= 6) {
        acciones.push({ type: 'pasar_turno' })
      } else {
        for (const id of p.mano) {
          acciones.push({ type: 'descartar_carta', cardInstanceIds: [id] })
        }
      }
    }
  } else if (state.fase === 'choque' && playerId === rivalDe(state) && state.combate?.paso === 'bloqueo') {
    // Bloqueo forzoso (9.3, ADR-19 + decisión A5 2026-10-22): el DEFENSOR
    // ELIGE con qué Campeón(es) bloquear, pero debe bloquear lo máximo
    // posible (k = min(disponibles, ataques)). Se exponen TODAS las
    // asignaciones maximales — la PRIMERA es la greedy determinista
    // (los bots hacen find() y conservan su comportamiento previo).
    for (const asig of asignacionesMaximales(state)) {
      acciones.push({ type: 'declarar_bloqueo', asignaciones: asig })
    }
  }

  return acciones
}
