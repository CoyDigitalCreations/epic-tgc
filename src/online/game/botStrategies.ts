/**
 * Estrategias del Bot — 3 niveles de dificultad.
 *
 * Fácil: prioridades básicas (invocar > pasar)
 * Medio: considera combate y habilidades básicas
 * Difícil: evalúa el tablero completo, calcula trades, timing de habilidades
 */
import type { Action } from './actions'
import { getValidActions } from './validActions'
import { getCardMeta } from './cards'
import { statsDe, tieneDoubleAttackActivo } from './efectos'
import type { GameState, PlayerId } from './types'

/**
 * Heurística de prevenión del bot (Fase 2c — diseño aprobado):
 * prevenir SOLO si el vínculo en peligro es el ÚLTIMO vivo del controlador
 * (evita partida_terminada por derrota de vínculos). Si no, conserva la fuente.
 */
export function elegirPrevenicion(state: GameState, jugador: PlayerId): boolean {
  const vivos = state.players[jugador].vinculos.filter(
    (id) => id !== null && !state.instances[id]?.bocaArriba,
  ).length
  return vivos <= 1
}

export type Dificultad = 'facil' | 'medio' | 'dificil'

// ══════════════════════════════════════════════════════════════
// BOT FÁCIL — prioridades básicas
// ══════════════════════════════════════════════════════════════

export function botFacil(state: GameState, playerId: PlayerId): Action | null {
  const acciones = getValidActions(state, playerId)
  if (acciones.length === 0) return null

  // Prioridad: invocar > activar habilidad > equipar > jugar mística/arcana > bloquear éter > pasar
  const orden = [
    'jugar_campeon',
    'activar_habilidad',
    'equipar_artefacto',
    'jugar_mistica',
    'colocar_arcana',
    'bloquear_eter',
    'activar_arcana',
    'pasar_turno',
  ]

  for (const tipo of orden) {
    const accion = acciones.find((a) => a.type === tipo)
    if (accion) return accion
  }

  return acciones.find((a) => a.type !== 'rendirse' && a.type !== 'usar_transmutar') ?? null
}

// ══════════════════════════════════════════════════════════════
// BOT MEDIO — considera combate y habilidades
// ══════════════════════════════════════════════════════════════

export function botMedio(state: GameState, playerId: PlayerId): Action | null {
  const acciones = getValidActions(state, playerId)
  if (acciones.length === 0) return null

  // ── CHOQUE: decidir ataque/bloqueo ──
  if (state.fase === 'choque') {
    return estrategiaChoque(state, playerId, acciones)
  }

  // ── FORJA: priorizar según el estado ──
  return estrategiaForja(state, playerId, acciones)
}

function estrategiaForja(state: GameState, playerId: PlayerId, acciones: Action[]): Action | null {
  const p = state.players[playerId]

  // 1. Activar habilidades que destruyan cosas del rival (remove threats)
  const activarDestructivo = acciones.find((a) => {
    if (a.type !== 'activar_habilidad') return false
    const meta = getCardMeta(state.instances[a.cardInstanceId]?.cardId ?? '')
    if (!meta || !('efectos' in meta)) return false
    return meta.efectos?.some((e) => e.tipo === 'disparo' && e.efecto === 'destroy')
  })
  if (activarDestructivo) return activarDestructivo

  // 2. Invocar campeones si tenemos campo vacío
  const campeonesEnCampo = p.campo.campeones.filter(Boolean).length
  if (campeonesEnCampo < 3) {
    const invocar = acciones.find((a) => a.type === 'jugar_campeon')
    if (invocar) return invocar
  }

  // 3. Equipar artefactos si hay campeones sin equipar
  const equipar = acciones.find((a) => a.type === 'equipar_artefacto')
  if (equipar) return equipar

  // 4. Activar habilidades de buff/debuff
  const activarBuff = acciones.find((a) => a.type === 'activar_habilidad')
  if (activarBuff) return activarBuff

  // 5. Jugar místicas (si hay espacio)
  if (p.campo.misticasTacticas.filter(Boolean).length < 3) {
    const mistica = acciones.find((a) => a.type === 'jugar_mistica')
    if (mistica) return mistica
  }

  // 6. Colocar arcanas (si hay espacio)
  if (p.campo.arcanasCombate.filter(Boolean).length < 3) {
    const arcana = acciones.find((a) => a.type === 'colocar_arcana')
    if (arcana) return arcana
  }

  // 7. Activar arcanas
  const activarArcana = acciones.find((a) => a.type === 'activar_arcana')
  if (activarArcana) return activarArcana

  // 8. Bloquear éter (solo si hay campeones que lo necesiten)
  const bloquear = acciones.find((a) => a.type === 'bloquear_eter')
  if (bloquear) return bloquear

  // 9. Pasar turno
  return acciones.find((a) => a.type === 'pasar_turno') ?? acciones[0]
}

function estrategiaChoque(state: GameState, playerId: PlayerId, acciones: Action[]): Action | null {
  const rival: PlayerId = playerId === 'A' ? 'B' : 'A'

  // ── PASO BLOQUEO: el defensor decide ──
  if (state.combate?.paso === 'bloqueo') {
    return decidirBloqueo(state, acciones)
  }

  // ── PASO ATAQUE: el activo decide ──
  const declararAtaque = acciones.find((a) => a.type === 'declarar_ataque')
  if (!declararAtaque) {
    // No hay atacantes elegibles — pasar turno o resolver
    return acciones.find((a) => a.type === 'pasar_turno' || a.type === 'elegir_ruptura') ?? acciones[0]
  }

  // Evaluar si es favorable atacar
  if (declararAtaque.type === 'declarar_ataque') {
    const atacantes = declararAtaque.atacanteIds
    const campeonesRival = state.players[rival].campo.campeones.filter(Boolean)

    // Si el rival no tiene bloqueadores, atacar con todos
    if (campeonesRival.length === 0) {
      return declararAtaque
    }

    // Evaluar cada atacante: atacar si tiene más poder que la RES promedio del rival
    const atacantesFavorables = atacantes.filter((id) => {
      const stats = statsDe(state, id)
      const resPromedio = campeonesRival.reduce((acc, rid) => {
        const rStats = statsDe(state, rid as string)
        return acc + rStats.resistencia
      }, 0) / (campeonesRival.length || 1)
      return stats.poder > resPromedio
    })

    if (atacantesFavorables.length > 0) {
      return { type: 'declarar_ataque', atacanteIds: atacantesFavorables }
    }

    // Si no hay atacantes favorables, no atacar (pasar turno)
    return acciones.find((a) => a.type === 'pasar_turno') ?? declararAtaque
  }

  return declararAtaque
}

function decidirBloqueo(state: GameState, acciones: Action[]): Action | null {
  const declararBloqueo = acciones.find((a) => a.type === 'declarar_bloqueo')
  if (!declararBloqueo || declararBloqueo.type !== 'declarar_bloqueo') return acciones[0]

  // Bloquear solo si el bloqueador sobrevive
  const asignaciones = declararBloqueo.asignaciones
  const asignacionesFavorables: Record<string, string> = {}

  for (const [atacanteId, bloqueadorId] of Object.entries(asignaciones)) {
    const atacanteStats = statsDe(state, atacanteId)
    const bloqueadorStats = statsDe(state, bloqueadorId)
    // Bloquear si el bloqueador sobrevive (resistencia > poder del atacante)
    if (bloqueadorStats.resistencia > atacanteStats.poder) {
      asignacionesFavorables[atacanteId] = bloqueadorId
    }
  }

  if (Object.keys(asignacionesFavorables).length > 0) {
    return { type: 'declarar_bloqueo', asignaciones: asignacionesFavorables }
  }

  // No hay bloqueos favorables — pasar prioridad
  return acciones.find((a) => a.type === 'pasar_prioridad') ?? acciones[0]
}

// ══════════════════════════════════════════════════════════════
// BOT DIFÍCIL — evalúa el tablero completo
// ══════════════════════════════════════════════════════════════

export function botDificil(state: GameState, playerId: PlayerId): Action | null {
  const acciones = getValidActions(state, playerId)
  if (acciones.length === 0) return null

  // ── CHOQUE: estrategia avanzada ──
  if (state.fase === 'choque') {
    return estrategiaChoqueAvanzada(state, playerId, acciones)
  }

  // ── FORJA: evaluar todas las opciones y elegir la mejor ──
  return estrategiaForjaAvanzada(state, playerId, acciones)
}

function estrategiaForjaAvanzada(state: GameState, playerId: PlayerId, acciones: Action[]): Action | null {
  // Puntuar cada acción
  const puntuadas = acciones.map((a) => ({
    accion: a,
    puntos: evaluarAccionForja(state, playerId, a),
  })).sort((a, b) => b.puntos - a.puntos)

  return puntuadas[0]?.accion ?? null
}

function evaluarAccionForja(state: GameState, playerId: PlayerId, accion: Action): number {
  const p = state.players[playerId]

  switch (accion.type) {
    case 'jugar_campeon': {
      // Prioridad alta si tenemos pocos campeones
      const campeonesEnCampo = p.campo.campeones.filter(Boolean).length
      let puntos = 10 + (3 - campeonesEnCampo) * 3
      // Bonus si el campeón tiene efecto útil
      const meta = getCardMeta(state.instances[accion.cardInstanceId]?.cardId ?? '')
      if (meta && 'efectos' in meta && meta.efectos?.length) {
        puntos += 5
      }
      return puntos
    }

    case 'activar_habilidad': {
      const meta = getCardMeta(state.instances[accion.cardInstanceId]?.cardId ?? '')
      if (!meta || !('efectos' in meta)) return 5
      const efecto = meta.efectos?.[0]
      if (!efecto) return 5
      // Bonus alto para efectos destructivos
      if (efecto.efecto === 'destroy') return 15
      // Bonus medio para buffs
      if (efecto.efecto === 'buff') return 12
      // Bonus para steal
      if (efecto.efecto === 'steal_champion') return 18
      return 8
    }

    case 'equipar_artefacto': {
      // Bonus si hay campeones que potenciar
      const campeonesEnCampo = p.campo.campeones.filter(Boolean).length
      return campeonesEnCampo > 0 ? 10 : 0
    }

    case 'jugar_mistica': {
      // Prioridad media
      const misticasEnCampo = p.campo.misticasTacticas.filter(Boolean).length
      return misticasEnCampo < 3 ? 7 : 2
    }

    case 'colocar_arcana': {
      // Prioridad media-baja
      const arcanasEnCampo = p.campo.arcanasCombate.filter(Boolean).length
      return arcanasEnCampo < 3 ? 6 : 1
    }

    case 'activar_arcana': {
      // Bonus si la recompensa es útil
      return 9
    }

    case 'bloquear_eter': {
      // Solo si es necesario
      return 3
    }

    case 'pasar_turno': {
      // Último recurso
      return 0
    }

    default:
      return 1
  }
}

function estrategiaChoqueAvanzada(state: GameState, playerId: PlayerId, acciones: Action[]): Action | null {
  const rival: PlayerId = playerId === 'A' ? 'B' : 'A'

  // ── PASO BLOQUEO ──
  if (state.combate?.paso === 'bloqueo') {
    return decidirBloqueoAvanzado(state, acciones)
  }

  // ── PASO ATAQUE ──
  const declararAtaque = acciones.find((a) => a.type === 'declarar_ataque')
  if (!declararAtaque) {
    return acciones.find((a) => a.type === 'pasar_turno' || a.type === 'elegir_ruptura') ?? acciones[0]
  }

  if (declararAtaque.type === 'declarar_ataque') {
    const atacantes = declararAtaque.atacanteIds
    const campeonesRival = state.players[rival].campo.campeones.filter(Boolean)

    // Si el rival no tiene bloqueadores, atacar con todos
    if (campeonesRival.length === 0) {
      return declararAtaque
    }

    // Evaluar cada atacante individualmente
    const atacantesFavorables: string[] = []

    for (const atacanteId of atacantes) {
      const atacanteStats = statsDe(state, atacanteId)
      const inst = state.instances[atacanteId]
      if (!inst) continue

      // No atacar si ya atacó este turno (salvo doble ataque activo — Fase 2b)
      if (inst.atacoEsteTurno && !tieneDoubleAttackActivo(state, atacanteId)) continue

      // Evaluar si es favorable vs cada bloqueador posible
      let favorable = true
      for (const bloqueadorId of campeonesRival) {
        const bloqueadorStats = statsDe(state, bloqueadorId as string)
        // Si el bloqueador sobrevive y el atacante muere, no es favorable
        if (bloqueadorStats.resistencia >= atacanteStats.poder &&
            atacanteStats.poder < bloqueadorStats.resistencia) {
          favorable = false
          break
        }
      }

      if (favorable) {
        atacantesFavorables.push(atacanteId)
      }
    }

    if (atacantesFavorables.length > 0) {
      return { type: 'declarar_ataque', atacanteIds: atacantesFavorables }
    }

    return acciones.find((a) => a.type === 'pasar_turno') ?? declararAtaque
  }

  return declararAtaque
}

function decidirBloqueoAvanzado(state: GameState, acciones: Action[]): Action | null {
  const declararBloqueo = acciones.find((a) => a.type === 'declarar_bloqueo')
  if (!declararBloqueo || declararBloqueo.type !== 'declarar_bloqueo') return acciones[0]

  const asignaciones = declararBloqueo.asignaciones
  const asignacionesFavorables: Record<string, string> = {}

  for (const [atacanteId, bloqueadorId] of Object.entries(asignaciones)) {
    const atacanteStats = statsDe(state, atacanteId)
    const bloqueadorStats = statsDe(state, bloqueadorId)

    // Bloquear si:
    // 1. El bloqueador sobrevive (resistencia > poder del atacante)
    // 2. O si el atacante es una amenaza grande (poder > 5) y podemos debilitarlo
    const bloqueadorSobrevive = bloqueadorStats.resistencia > atacanteStats.poder
    const atacanteAmenaza = atacanteStats.poder > 5

    if (bloqueadorSobrevive || atacanteAmenaza) {
      asignacionesFavorables[atacanteId] = bloqueadorId
    }
  }

  if (Object.keys(asignacionesFavorables).length > 0) {
    return { type: 'declarar_bloqueo', asignaciones: asignacionesFavorables }
  }

  return acciones.find((a) => a.type === 'pasar_prioridad') ?? acciones[0]
}
