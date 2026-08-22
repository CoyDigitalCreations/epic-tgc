import { getCardMeta, faccionesCompartidas, esArcana, esCampeon, costeEterHabilidad, campeonNecesitaEterBloqueado } from './cards'
import type { Action } from './actions'
import { generarAccionesForja, validarActivarArcana } from './actions'
import { atacantesElegibles, asignacionForzada, ataquesSinBloquear, rivalDe, tieneKeyword } from './combat'
import { respondiblesDe } from './chain'
import { etersParaPagar } from './payments'
import type { GameState, PlayerId } from './types'

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
    // Activar Habilidades: Campeones con efectoContinuo o efectoDisparo
    // Continuo (bloquea éter): NO puede activar si agotado; agota al activar.
    // Disparo (paga éter): SÍ puede activar si agotado; NO agota.
    for (const champId of p.campo.campeones) {
      if (!champId) continue
      const inst = state.instances[champId]
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
      if (!meta) continue

      const tieneContinuo = 'efectoContinuo' in meta && !!(meta as any).efectoContinuo
      const tieneDisparo = 'efectoDisparo' in meta && !!meta.efectoDisparo

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
        // Patrón "Bloqueado": solo si NO es agota (Vorlag tiene "bloqueado" en texto pero es Agota)
        const esBloqueado = !('disparoAgota' in meta && (meta as any).disparoAgota) && meta.efectoDisparo!.includes('bloqueado')
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
    // FB-022 Último Refugio: campeón equipado puede invocar del cementerio (sin éter)
    for (const champId of p.campo.campeones) {
      if (!champId) continue
      const inst = state.instances[champId]
      if (!inst || inst.agotado) continue
      // Buscar si tiene FB-022 equipado
      const tieneFB022 = Object.values(state.instances).some(
        (i) => i?.cardId === 'FB-022' && i.equipadoA === champId,
      )
      if (!tieneFB022) continue
      // Verificar que hay campeones en el cementerio con coste ≤3
      const enCementerio = p.cementerio.filter((id): id is string => {
        const ci = state.instances[id]
        const cardId = ci?.cardId
        if (!cardId) return false
        const meta = getCardMeta(cardId)
        return !!meta && esCampeon(meta) && (meta.stats.cost ?? 99) <= 3
      })
      if (enCementerio.length > 0) {
        acciones.push({ type: 'activar_habilidad', cardInstanceId: champId, eterIds: [] })
      }
    }
    if (state.fase === 'forja') {
      // Jugadas por carta en mano (el generador garantiza payloads válidos)
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id)
        if (accion) acciones.push(accion)
      }
      // Bloqueo de Éter: solo para Campeones que TENGAN RAZÓN para bloquear
      // (habilidad activa/pasiva que use éter bloqueado, o Transmutar).
      // Draven, Emisario, etc. NO generan esta acción.
      // No genera acciones si el campeón ya tiene éteres bloqueados.
      p.campo.campeones.forEach((campeonId, slot) => {
        if (!campeonId) return
        const inst = state.instances[campeonId]
        const campeon = inst?.cardId ? getCardMeta(inst.cardId) : null
        if (!campeon) return
        if (!campeonNecesitaEterBloqueado(campeon)) return
        // No generar si ya tiene éteres bloqueados
        if ((inst.eterBloqueado?.length ?? 0) > 0) return
        const eterId = p.eterReserva.find((id) => {
          const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id]!.cardId!) : null
          return meta !== null
        })
        if (eterId !== undefined) {
          acciones.push({ type: 'bloquear_eter', eterIds: [eterId], campeonSlot: slot })
        }
      })
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
