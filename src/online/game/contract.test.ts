// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { CATALOGO_EVENTOS } from './events'
import type { GameEvent } from './events'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../shared/data/paquetes'
import { simularPartida } from './bot'
import { expandirMazo } from './__tests__/helpers'

/**
 * Contrato de eventos (ADR-10) — diseño central de game-core.
 * Los changes 2 (game-combat-chain) y 3 (game-handlers) consumen este catálogo:
 * renombrar, reordenar o eliminar cualquier evento rompe este test y `tsc -b`.
 */

export const NOMBRES_EVENTOS = [
  'partida_iniciada',
  'turno_iniciado',
  'fase_iniciada',
  'carta_entrada_a_zona',
  'carta_salida_de_zona',
  'carta_robada',
  'carta_invocada',
  'carta_descartada',
  'eter_pagado',
  'eter_bloqueado',
  'eter_reagrupado',
  'mazo_agotado',
  'mulligan_realizado',
  'rendicion',
  'partida_terminada',
  // Apéndice de combate (change 2, spec #1227 R14): los 15 del core NO se tocan.
  'ataque_declarado',
  'bloqueo_declarado',
  'carta_muerta',
  'destruccion',
  'destruccion_prevenida',
  'ruptura_realizada',
  'respuesta_encadenada',
  'prioridad_pasada',
  'carta_activada',
] as const

/** Guardia exhaustiva tipo-level: añadir/quitar un evento rompe `tsc -b`. */
function assertNunca(x: never): never {
  throw new Error(`Evento inesperado del catálogo: ${String(x)}`)
}

function validarExhaustividad(tipo: GameEvent['type']): void {
  switch (tipo) {
    case 'partida_iniciada': return
    case 'turno_iniciado': return
    case 'fase_iniciada': return
    case 'carta_entrada_a_zona': return
    case 'carta_salida_de_zona': return
    case 'carta_robada': return
    case 'carta_invocada': return
    case 'carta_descartada': return
    case 'eter_pagado': return
    case 'eter_bloqueado': return
    case 'eter_reagrupado': return
    case 'mazo_agotado': return
    case 'mulligan_realizado': return
    case 'rendicion': return
    case 'partida_terminada': return
    case 'ataque_declarado': return
    case 'bloqueo_declarado': return
    case 'carta_muerta': return
    case 'destruccion': return
    case 'destruccion_prevenida': return
    case 'ruptura_realizada': return
    case 'respuesta_encadenada': return
    case 'prioridad_pasada': return
    case 'carta_activada': return
    default: assertNunca(tipo)
  }
}

const esJugador = (x: unknown): x is 'A' | 'B' => x === 'A' || x === 'B'
const esId = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const esBooleano = (x: unknown): x is boolean => typeof x === 'boolean'
const esCausa = (x: unknown): x is 'combate' | 'efecto' | 'ruptura' =>
  x === 'combate' || x === 'efecto' || x === 'ruptura'

/** Validador de payload por evento: fija la FORMA exacta del contrato. */
const VALIDADORES: Record<GameEvent['type'], (e: GameEvent) => boolean> = {
  partida_iniciada: (e) => e.type === 'partida_iniciada' && esJugador(e.primerJugador),
  turno_iniciado: (e) => e.type === 'turno_iniciado' && esJugador(e.jugador),
  fase_iniciada: (e) =>
    e.type === 'fase_iniciada' &&
    (e.fase === 'alba' || e.fase === 'forja' || e.fase === 'choque' || e.fase === 'ocaso') &&
    esJugador(e.jugador),
  carta_entrada_a_zona: (e) =>
    e.type === 'carta_entrada_a_zona' &&
    esId(e.cardInstanceId) &&
    typeof e.zona === 'string' &&
    esJugador(e.jugador) &&
    esBooleano(e.bocaArriba),
  carta_salida_de_zona: (e) =>
    e.type === 'carta_salida_de_zona' && esId(e.cardInstanceId) && typeof e.zona === 'string' && esJugador(e.jugador),
  carta_robada: (e) => e.type === 'carta_robada' && esJugador(e.jugador) && esId(e.cardInstanceId),
  carta_invocada: (e) =>
    e.type === 'carta_invocada' && esId(e.cardInstanceId) && typeof e.tipo === 'string' && typeof e.slot === 'number',
  carta_descartada: (e) =>
    e.type === 'carta_descartada' && esJugador(e.jugador) && Array.isArray(e.cardInstanceIds) && e.cardInstanceIds.every(esId),
  eter_pagado: (e) =>
    e.type === 'eter_pagado' &&
    esJugador(e.jugador) &&
    Array.isArray(e.eterIds) &&
    e.eterIds.every(esId) &&
    typeof e.costo === 'number' &&
    typeof e.aportado === 'number',
  eter_bloqueado: (e) =>
    e.type === 'eter_bloqueado' &&
    esJugador(e.jugador) &&
    Array.isArray(e.eterIds) &&
    e.eterIds.every(esId) &&
    esId(e.campeonId),
  eter_reagrupado: (e) =>
    e.type === 'eter_reagrupado' && esJugador(e.jugador) && Array.isArray(e.eterIds) && e.eterIds.every(esId),
  mazo_agotado: (e) => e.type === 'mazo_agotado' && esJugador(e.jugador),
  mulligan_realizado: (e) => e.type === 'mulligan_realizado' && esJugador(e.jugador),
  rendicion: (e) => e.type === 'rendicion' && esJugador(e.jugador),
  partida_terminada: (e) =>
    e.type === 'partida_terminada' &&
    esJugador(e.ganador) &&
    (e.motivo === 'mazo_vacio' || e.motivo === 'rendicion' || e.motivo === 'vinculos'),
  ataque_declarado: (e) =>
    e.type === 'ataque_declarado' &&
    esJugador(e.jugador) &&
    Array.isArray(e.atacanteIds) &&
    e.atacanteIds.every(esId),
  bloqueo_declarado: (e) =>
    e.type === 'bloqueo_declarado' &&
    esJugador(e.jugador) &&
    typeof e.asignaciones === 'object' &&
    e.asignaciones !== null &&
    !Array.isArray(e.asignaciones) &&
    Object.keys(e.asignaciones).every(esId) &&
    Object.values(e.asignaciones).every(esId),
  carta_muerta: (e) =>
    e.type === 'carta_muerta' && esId(e.cardInstanceId) && esJugador(e.jugador) && esCausa(e.causa),
  destruccion: (e) =>
    e.type === 'destruccion' && esId(e.cardInstanceId) && esJugador(e.jugador) && esCausa(e.causa),
  destruccion_prevenida: (e) =>
    e.type === 'destruccion_prevenida' && esId(e.cardInstanceId) && esJugador(e.jugador) && esCausa(e.causa),
  ruptura_realizada: (e) =>
    e.type === 'ruptura_realizada' && esId(e.atacanteId) && typeof e.vinculoSlot === 'number' && esId(e.vinculoId),
  respuesta_encadenada: (e) =>
    e.type === 'respuesta_encadenada' && esJugador(e.jugador) && esId(e.cardInstanceId),
  prioridad_pasada: (e) => e.type === 'prioridad_pasada' && esJugador(e.jugador),
  carta_activada: (e) =>
    e.type === 'carta_activada' && esId(e.cardInstanceId) && esJugador(e.jugador) && typeof e.slot === 'number',
}

describe('contrato de eventos (ADR-10)', () => {
  it('el catálogo expone exactamente los 23 eventos del contrato en orden', () => {
    const nombres = CATALOGO_EVENTOS.map((e) => e.type)
    expect(nombres).toEqual([...NOMBRES_EVENTOS])
    expect(new Set(nombres).size).toBe(24)
  })

  it('el switch exhaustivo cubre TODO el tipo GameEvent (añadir/quitar rompe tsc)', () => {
    for (const evento of CATALOGO_EVENTOS) {
      // Si un tipo nuevo de evento no tiene case, la guardia lanza en runtime
      expect(() => validarExhaustividad(evento.type)).not.toThrow()
    }
  })

  it('los payloads de muestra del catálogo cumplen la forma del contrato', () => {
    for (const evento of CATALOGO_EVENTOS) {
      const valida = VALIDADORES[evento.type]
      expect(valida, `sin validador para ${evento.type}`).toBeDefined()
      expect(valida(evento), `payload inválido para ${evento.type}`).toBe(true)
    }
  })
})

const deckA = expandirMazo(ESTASIS_CARDS) // 66 cartas
const deckB = expandirMazo(DISONANCIA_CARDS) // 66 cartas

describe('integración bot ↔ contrato (5.8)', () => {
  it('todo evento emitido por el bot en una partida cumple la forma del contrato (5.7 + ADR-10)', () => {
    const { eventos, turnos } = simularPartida(deckA, deckB, 1)
    expect(turnos).toBeGreaterThan(0)
    expect(eventos.length).toBeGreaterThan(0)
    for (const evento of eventos) {
      const valida = VALIDADORES[evento.type]
      expect(valida, `sin validador para ${evento.type}`).toBeDefined()
      expect(valida(evento), `payload inválido para ${evento.type} en la partida simulada`).toBe(true)
    }
  })

  it('snapshot: la secuencia de acciones del bot (seed 1) queda fijada por el contrato', () => {
    const { eventos } = simularPartida(deckA, deckB, 1)
    expect(eventos.map((e) => e.type)).toMatchSnapshot()
  })
})
