import { getCardMeta, esArcana, costeEterHabilidad, cartaNecesitaEterBloqueado } from './cards'
import type { AnyCard } from '../../shared/types'
import type { Action } from './actions'
import { generarAccionesForja, validarActivarArcana } from './actions'
import { atacantesElegibles, asignacionForzada, ataquesSinBloquear, rivalDe, tieneKeyword } from './combat'
import { respondiblesDe } from './chain'
import { etersParaPagar, maxEterBloqueado, esBloqueoFijo } from './payments'
import { validarEquiparArtefacto } from './movimientos'
import type { GameState, PlayerId, CardInstance } from './types'

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
 * resolución (elegir_ruptura voluntaria + pasar_turno con limpieza).
 * (R12, R15; Ruptura C3/ADR-13)
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
      acciones.push({ type: 'pasar_prioridad' })
    }
    return acciones
  }

  if (state.turno === playerId) {
    const p = state.players[playerId]
    // C3 (D1): elegir_objetivo — frente de la cola FIFO del jugador activo
    // (patrón de elegir_opcion, pero aplica en forja Y choque: al-invocar y
    // al-atacar arman pendientes). Las opciones YA vienen filtradas.
    const pendiente = state.objetivosPendientes?.[0]
    if (pendiente && pendiente.jugador === playerId) {
      for (const objetivoId of pendiente.opciones) {
        acciones.push({ type: 'elegir_objetivo', objetivoId })
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

      // Check efectos[] for active abilities
      const tieneEfectos = 'efectos' in meta && meta.efectos
      const tieneContinuo = tieneEfectos && meta.efectos!.some((e) => e.tipo === 'continuo')
      const tieneDisparo = tieneEfectos && meta.efectos!.some((e) => e.tipo === 'disparo')

      if (tieneContinuo) {
        // Continuo: NO puede activar si agotado
        if (inst!.agotado) continue
        const costo = costeEterHabilidad(meta)
        const eteresValidos = p.eterReserva.filter((id) => {
          const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
          return eterMeta !== null
        })
        if (costo > 0 && eteresValidos.length >= costo) {
          acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) })
        } else if (costo === 0 && eteresValidos.length > 0) {
          acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: [eteresValidos[0]] })
        }
      } else if (tieneDisparo) {
        // Disparo: SÍ puede activar si agotado; NO agota
        // Check if it's a "blocked ether" pattern
        const esBloqueado = meta.efectos!.some((e) => e.costo?.tipo === 'eter_bloqueado')
        if (esBloqueado) {
          const costo = costeEterHabilidad(meta)
          const eteresValidos = p.eterReserva.filter((id) => {
            const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
            return eterMeta !== null
          })
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) })
          } else if (costo === 0 && eteresValidos.length > 0) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: [eteresValidos[0]] })
          }
        } else {
          // Patrón "Agota": necesita no agotado + no usado + N éteres
          if (inst!.agotado || inst!.opcionUsadaEsteTurno) continue
          const costo = costeEterHabilidad(meta)
          const costoReal = costo > 0 ? costo : 1
          if (p.eterReserva.length >= costoReal) {
            acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: p.eterReserva.slice(0, costoReal) })
          }
        }
      }
    }
    if (state.fase === 'forja') {
      // Jugadas por carta en mano (el generador garantiza payloads válidos)
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id)
        if (accion) acciones.push(accion)
      }
      // Bloqueo de Éter (Fase 3a): Campeones y Artefactos (Místicas/Arcanas)
      // con costo-bloqueado en efectos[].
      // - bloqueo_fijo ("Bloquea X Éter") → UNA acción con el juego EXACTO.
      // - eter_bloqueado ("hasta X") → una acción por Éter hasta el máximo.
      const generarBloqueos = (targets: { id: string; inst: CardInstance; meta: AnyCard }[]) => {
        for (const t of targets) {
          if (!cartaNecesitaEterBloqueado(t.meta)) continue
          const actuales = t.inst.eterBloqueado?.length ?? 0
          const maxEter = maxEterBloqueado(t.meta)
          const fijo = esBloqueoFijo(t.meta)
          const disponibles = p.eterReserva.filter((id) => {
            const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
            return meta !== null
          })
          if (fijo) {
            // Pago exacto: arma la acción completa con los Éteres que faltan.
            const falta = maxEter - actuales
            if (falta > 0 && disponibles.length >= falta) {
              acciones.push({
                type: 'bloquear_eter',
                eterIds: disponibles.slice(0, falta),
                targetInstanceId: t.id,
              })
            }
          } else {
            let generados = actuales
            for (const eterId of disponibles) {
              if (generados >= maxEter) break
              acciones.push({ type: 'bloquear_eter', eterIds: [eterId], targetInstanceId: t.id })
              generados++
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
      // C2: elegir_opcion — opciones pendientes del Pasivo 1A (FB-005/DS-006)
      for (const opcion of state.opcionesPendientes ?? []) {
        if (opcion.jugador === playerId) {
          acciones.push({ type: 'elegir_opcion', opcionId: opcion.eterId })
        }
      }
      // Activar Arcanas: el jugador puede activar sus Arcanas boca abajo pagando su coste
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
        // Paso ataque (9.2): 1 acción "todos los elegibles" + 1 por Campeón
        // (el payload mínimo nunca falla; primerTurno/cansados ya excluidos).
        const elegibles = atacantesElegibles(state)
        if (elegibles.length > 0) {
          acciones.push({ type: 'declarar_ataque', atacanteIds: elegibles })
          for (const id of elegibles) {
            acciones.push({ type: 'declarar_ataque', atacanteIds: [id] })
          }
        }
        // Tácticas jugables durante Choque (regla: se pueden jugar en cualquier fase de tu turno)
        for (const id of p.mano) {
          const accion = generarAccionesForja(state, playerId, id)
          if (accion) acciones.push(accion)
        }
        acciones.push({ type: 'pasar_turno' })
      } else if (combate.paso === 'resolucion') {
        // Resolución (9.4-A, ADR-13): Ruptura VOLUNTARIA del jugador activo —
        // null "no romper" + 1 por atacante sin bloquear que SOBREVIVIÓ con
        // slot de Vínculo vivo (0-5). Sin cardIds: el slot se elige a ciegas
        // (6.2, anti-cheat). Máx 1 por turno (rupturaUsadaEsteTurno).
        if (!combate.rupturaUsadaEsteTurno) {
          acciones.push({ type: 'elegir_ruptura', atacanteId: null })
          if (combate.rupturaDisponible) {
            const rival = rivalDe(state)
            for (const atacanteId of ataquesSinBloquear(state)) {
              if (!state.players[state.turno].campo.campeones.includes(atacanteId)) continue // murió en el daño
              state.players[rival].vinculos.forEach((vinculoId, slot) => {
                const v = vinculoId ? state.instances[vinculoId] : undefined
                if (vinculoId && !v?.bocaArriba) {
                  acciones.push({ type: 'elegir_ruptura', atacanteId, vinculoSlot: slot })
                }
              })
            }
          }
        }
        acciones.push({ type: 'pasar_turno' })
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
    // Bloqueo forzoso (9.3): 1 greedy determinista para el DEFENSOR — no hay
    // variante "no bloquear" (ej.2) ni sub-asignaciones (ej.6, ADR-19).
    const asignaciones = asignacionForzada(state)
    if (asignaciones) acciones.push({ type: 'declarar_bloqueo', asignaciones })
  }

  return acciones
}
