/**
 * Core del motor: dispatcher de acciones, tipos, applyAction.
 * Extraido de actions.ts para separacion de dominios (change: refactor-engine).
 */
import type { GameEvent } from './events'
import type { Ctx, GameState, PlayerId } from './types'
import { shuffleFisherYates } from './rng'

// Domain module imports (validators + executors)
import {
  validarJugarCampeon, validarJugarMistica, validarColocarArcana,
  validarColocarVinculo, validarEquiparArtefacto,
  ejecutarJugarCampeon, ejecutarJugarMistica, ejecutarColocarArcana,
  ejecutarColocarVinculo, ejecutarEquiparArtefacto,
} from './movimientos'
import {
  validarActivarArcana, validarActivarHabilidad, validarUsarTransmutar,
  validarElegirOpcion, validarElegirObjetivo,
  ejecutarActivarArcana, ejecutarActivarHabilidad, ejecutarUsarTransmutar,
  ejecutarElegirOpcion, ejecutarElegirObjetivo,
} from './habilidades'
import { validarBloquearEter, ejecutarBloquearEter } from './economia'
import {
  validarMulligan, validarPasarTurno, validarDescartarCarta,
  avanzarMulligan, ejecutarPasarTurno, ejecutarDescartarCarta,
} from './partida'
import {
  ejecutarDeclararAtaque, ejecutarDeclararBloqueo,
  validarDeclararAtaque, validarDeclararBloqueo,
  validarElegirRuptura, ejecutarElegirRuptura,
} from './combat'
import {
  validarResponderCadena, validarPasarPrioridad,
  ejecutarResponderCadena, ejecutarPasarPrioridad,
} from './chain'

/**
 * Acciones atomicas del jugador (superficie de applyAction/getValidActions).
 */
export type Action =
  | { type: 'mulligan' }
  | { type: 'pasar_mulligan' }
  | { type: 'rendirse' }
  | { type: 'pasar_turno' }
  | { type: 'colocar_vinculo'; cardInstanceId: string; slot: number }
  | {
      type: 'jugar_campeon'
      cardInstanceId: string
      slot: number
      eterIds: string[]
      sacrificios?: string[]
    }
  | { type: 'jugar_mistica'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'colocar_arcana'; cardInstanceId: string; slot: number }
  | { type: 'activar_arcana'; cardInstanceId: string; slot: number; eterIds: string[] }
  | { type: 'equipar_artefacto'; cardInstanceId: string; campeonInstanceId: string }
  | { type: 'bloquear_eter'; eterIds: string[]; campeonSlot: number }
  | { type: 'descartar_carta'; cardInstanceIds: string[] }
  | { type: 'elegir_opcion'; opcionId: string }
  | { type: 'elegir_objetivo'; objetivoId: string }
  | { type: 'usar_transmutar'; cardInstanceId: string; eterIds: string[] }
  | { type: 'activar_habilidad'; cardInstanceId: string; eterIds: string[]; objetivoId?: string }
  | { type: 'declarar_ataque'; atacanteIds: string[] }
  | { type: 'declarar_bloqueo'; asignaciones: Record<string, string> }
  | { type: 'elegir_ruptura'; atacanteId: string | null; vinculoSlot?: number }
  | { type: 'responder_cadena'; cardInstanceId: string }
  | { type: 'pasar_prioridad' }

export type ApplyActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; state: GameState; error: string }

/**
 * Aplica una accion de forma pura y ATOMICA (ADR-5):
 * 1. valida READ-ONLY sobre el estado de entrada (sin mutar, sin RNG);
 * 2. si es valida: structuredClone -> ejecuta (consume RNG, emite events);
 * 3. si no: { ok:false, state } devuelve el MISMO estado sin cambios.
 */
export function applyAction(state: GameState, action: Action, ctx: Ctx): ApplyActionResult {
  ctx.events.length = 0
  const error = validarAccion(state, action)
  if (error) return { ok: false, state, error }
  const s = structuredClone(state)
  ejecutarAccion(s, action, ctx)
  return { ok: true, state: s, events: [...ctx.events] }
}

function validarAccion(state: GameState, action: Action): string | null {
  switch (action.type) {
    case 'rendirse':
      return state.fase === 'terminada' ? 'la partida ya termino' : null
    case 'mulligan':
      return validarMulligan(state)
    case 'pasar_mulligan':
      return state.fase !== 'pre_partida' ? 'pasar_mulligan solo en pre_partida' : null
    case 'pasar_turno':
      return validarPasarTurno(state)
    case 'descartar_carta':
      return validarDescartarCarta(state, action)
    case 'jugar_campeon':
      return validarJugarCampeon(state, action)
    case 'jugar_mistica':
      return validarJugarMistica(state, action)
    case 'colocar_arcana':
      return validarColocarArcana(state, action)
    case 'colocar_vinculo':
      return validarColocarVinculo(state, action)
    case 'activar_arcana':
      return validarActivarArcana(state, action)
    case 'equipar_artefacto':
      return validarEquiparArtefacto(state, action)
    case 'bloquear_eter':
      return validarBloquearEter(state, action)
    case 'elegir_opcion':
      return validarElegirOpcion(state, action)
    case 'elegir_objetivo':
      return validarElegirObjetivo(state, action)
    case 'usar_transmutar':
      return validarUsarTransmutar(state, action)
    case 'activar_habilidad':
      return validarActivarHabilidad(state, action)
    case 'declarar_ataque':
      return validarDeclararAtaque(state, action.atacanteIds)
    case 'declarar_bloqueo':
      return validarDeclararBloqueo(state, action.asignaciones)
    case 'elegir_ruptura':
      return validarElegirRuptura(state, action.atacanteId, action.vinculoSlot)
    case 'responder_cadena':
      return validarResponderCadena(state, action.cardInstanceId)
    case 'pasar_prioridad':
      return validarPasarPrioridad(state)
    default:
      return 'accion no disponible en esta fase'
  }
}

function ejecutarAccion(s: GameState, action: Action, ctx: Ctx): void {
  switch (action.type) {
    case 'rendirse': {
      ctx.emit({ type: 'rendicion', jugador: s.turno })
      const ganador: PlayerId = s.turno === 'A' ? 'B' : 'A'
      s.fase = 'terminada'
      s.ganador = ganador
      s.motivo = 'rendicion'
      ctx.emit({ type: 'partida_terminada', ganador, motivo: 'rendicion' })
      return
    }
    case 'mulligan': {
      const jugador = s.turno
      const p = s.players[jugador]
      const mazoReconstruido = shuffleFisherYates(ctx, [...p.mano, ...p.mazo])
      p.mano = mazoReconstruido.slice(0, 5)
      p.mazo = mazoReconstruido.slice(5)
      p.mulliganUsado = true
      ctx.emit({ type: 'mulligan_realizado', jugador })
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_mulligan': {
      avanzarMulligan(s, ctx)
      return
    }
    case 'pasar_turno': {
      ejecutarPasarTurno(s, ctx)
      return
    }
    case 'descartar_carta': {
      ejecutarDescartarCarta(s, action, ctx)
      return
    }
    case 'jugar_campeon': {
      ejecutarJugarCampeon(s, action, ctx)
      return
    }
    case 'jugar_mistica': {
      ejecutarJugarMistica(s, action, ctx)
      return
    }
    case 'colocar_arcana': {
      ejecutarColocarArcana(s, action, ctx)
      return
    }
    case 'colocar_vinculo': {
      ejecutarColocarVinculo(s, action, ctx)
      return
    }
    case 'activar_arcana': {
      ejecutarActivarArcana(s, action, ctx)
      return
    }
    case 'equipar_artefacto': {
      ejecutarEquiparArtefacto(s, action, ctx)
      return
    }
    case 'bloquear_eter': {
      ejecutarBloquearEter(s, action, ctx)
      return
    }
    case 'elegir_opcion': {
      ejecutarElegirOpcion(s, action, ctx)
      return
    }
    case 'elegir_objetivo': {
      ejecutarElegirObjetivo(s, action, ctx)
      return
    }
    case 'usar_transmutar': {
      ejecutarUsarTransmutar(s, action, ctx)
      return
    }
    case 'activar_habilidad': {
      ejecutarActivarHabilidad(s, action, ctx)
      return
    }
    case 'declarar_ataque': {
      ejecutarDeclararAtaque(s, action.atacanteIds, ctx)
      return
    }
    case 'declarar_bloqueo': {
      ejecutarDeclararBloqueo(s, action.asignaciones, ctx)
      return
    }
    case 'elegir_ruptura': {
      ejecutarElegirRuptura(s, action.atacanteId, action.vinculoSlot, ctx)
      return
    }
    case 'responder_cadena': {
      ejecutarResponderCadena(s, action.cardInstanceId, ctx)
      return
    }
    case 'pasar_prioridad': {
      ejecutarPasarPrioridad(s, ctx)
      return
    }
  }
}
