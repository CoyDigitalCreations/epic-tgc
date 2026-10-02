// Diagnóstico seed 66099 — revisión de efectos actuales
// @vitest-environment node
import { describe, it } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida, botTonto } from '../bot'
import { expandirMazo } from './helpers'
import { getValidActions } from '../validActions'
import { applyAction } from '../actions'
import { createInitialState } from '../initialState'
import { getCardMeta } from '../cards'

const deckA = expandirMazo(ESTASIS_CARDS)
const deckB = expandirMazo(DISONANCIA_CARDS)

describe('Diagnóstico seed 66099 v2', () => {
  it('simula y reporta efectos detallados', () => {
    const seed = 66099
    const { state, ctx } = createInitialState(deckA, deckB, seed)

    let estado = state
    const log: string[] = []
    const errores: string[] = []
    let iteraciones = 0
    const maxIteraciones = 200

    while (estado.fase !== 'terminada' && iteraciones < maxIteraciones) {
      const cadena = estado.combate?.cadena ?? estado.cadena
      const actor: 'A' | 'B' =
        cadena
          ? cadena.prioridad
          : estado.fase === 'choque' && estado.combate?.paso === 'bloqueo'
            ? (estado.turno === 'A' ? 'B' : 'A')
            : estado.turno

      // Log acciones disponibles ANTES de que el bot decida
      if (iteraciones < 100 && estado.fase === 'forja') {
        const acciones = getValidActions(estado, actor)
        const habilidades = acciones.filter(a => a.type === 'activar_habilidad')
        const equipar = acciones.filter(a => a.type === 'equipar_artefacto')
        if (habilidades.length > 0 || equipar.length > 0) {
          log.push(`[iter ${iteraciones}] ${actor} tiene ${habilidades.length} activar_habilidad, ${equipar.length} equipar`)
          for (const h of habilidades) {
            const inst = estado.instances[h.cardInstanceId]
            const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
            log.push(`  → ${meta?.name}: efectos=${meta?.efectos?.map(e => e.tipo).join(',')}`)
          }
        }
      }

      const accion = botTonto(estado, actor)
      if (!accion) {
        errores.push(`[iter ${iteraciones}] sin acción para ${actor} en fase ${estado.fase}`)
        break
      }

      const r = applyAction(estado, accion, ctx)
      if (!r.ok) {
        errores.push(`[iter ${iteraciones}] FALLÓ: ${accion.type} → ${r.error}`)
        break
      }

      // Log eventos clave
      for (const e of r.events) {
        if (e.type === 'fase_iniciada' && (e.fase === 'alba' || e.fase === 'forja')) {
          log.push(`--- FASE: ${e.fase} (${e.jugador}) ---`)
          // Log estado del jugador al inicio de fase
          const p = estado.players[e.jugador]
          log.push(`  Mano: ${p.mano.length}, Mazo: ${p.mazo.length}, Reserva: ${p.eterReserva.length}, Pagado: ${p.eterPagado.length}`)
          log.push(`  Campeones: ${p.campo.campeones.filter(Boolean).length}, Místicas: ${p.campo.misticasTacticas.filter(Boolean).length}`)
        } else if (e.type === 'turno_iniciado') {
          log.push(`=== TURNO ${e.jugador} ===`)
        } else if (e.type === 'carta_invocada') {
          const meta = getCardMeta(estado.instances[e.cardInstanceId]?.cardId ?? '')
          log.push(`  INVOCAR: ${meta?.name} (${meta?.type})`)
        } else if (e.type === 'carta_activada') {
          const meta = getCardMeta(estado.instances[e.cardInstanceId]?.cardId ?? '')
          log.push(`  ACTIVAR: ${meta?.name}`)
        } else if (e.type === 'eter_bloqueado') {
          log.push(`  BLOQUEAR: ${e.eterIds.length} éter(es)`)
        } else if (e.type === 'carta_muerta') {
          const meta = getCardMeta(estado.instances[e.cardInstanceId]?.cardId ?? '')
          log.push(`  MUERTE: ${meta?.name}`)
        } else if (e.type === 'carta_salida_de_zona') {
          // skip
        } else if (e.type === 'carta_entrada_a_zona') {
          // skip
        }
      }

      estado = r.state
      iteraciones++
    }

    // Estado final detallado
    log.push('\n========== ESTADO FINAL ==========')
    log.push(`Iteraciones: ${iteraciones}, Fase: ${estado.fase}, Ganador: ${estado.ganador ?? 'N/A'}`)

    for (const j of ['A', 'B'] as const) {
      const p = estado.players[j]
      log.push(`\nJugador ${j}:`)
      log.push(`  Mano: ${p.mano.length}, Mazo: ${p.mazo.length}`)
      log.push(`  Reserva: ${p.eterReserva.length}, Pagado: ${p.eterPagado.length}`)
      
      // Detalle de campeones en campo
      for (const [i, id] of p.campo.campeones.entries()) {
        if (!id) continue
        const inst = estado.instances[id]
        const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
        const eters = inst?.eterBloqueado?.length ?? 0
        const equipado = Object.values(estado.instances).some(i => i?.equipadoA === id)
        log.push(`  2${String.fromCharCode(66+i)}: ${meta?.name} [${meta?.keywords?.join(',')}]${eters > 0 ? ` (${eters}É bloqueado)` : ''}${equipado ? ' [EQUIPADO]' : ''}`)
      }
      
      // Artefactos equipados
      for (const [id, inst] of Object.entries(estado.instances)) {
        if (inst?.equipadoA && inst.owner === j) {
          const art = getCardMeta(inst.cardId ?? '')
          const target = getCardMeta(estado.instances[inst.equipadoA]?.cardId ?? '')
          log.push(`  ARTEFACTO: ${art?.name} → ${target?.name ?? '¿?'}`)
        }
      }
    }

    // Acciones disponibles al final
    const accA = getValidActions(estado, 'A')
    const accB = getValidActions(estado, 'B')
    log.push(`\nAcciones finales: A=${accA.length} (${accA.map(a => a.type).join(',')}), B=${accB.length} (${accB.map(a => a.type).join(',')})`)

    if (errores.length > 0) {
      log.push(`\n--- ERRORES ---`)
      errores.forEach(e => log.push(e))
    }

    console.log(log.join('\n'))
    expect(errores.length).toBe(0)
  })
})
