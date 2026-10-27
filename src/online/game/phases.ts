import { reagruparEter } from './payments'
import { robarCarta } from './draw'
import { purgarEfectosTemporales, purgarHastaFase, dispararTrigger, evaluarCandadosArcanas } from './efectos'
import { resolverFaseEfectos } from './effectRegistry'
import { reagruparEfectosBloqueoAlba, exhaustFijado } from './effectInterpreter'
import { confirmarFinDePartida } from './finPartida'
import { scryActual } from './scry'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Alba AUTO-RESUELTA (ADR-3): nunca es un estado observable; se ejecuta dentro
 * de la acción que la dispara. Orden del manual (§8.2): purga 'alba-dueño' →
 * 1. enderezar → 2. reagrupar el Éter → 3. efectos "al inicio de tu turno" → 4. robar 1.
 * Los efectos de inicio ven la zona de pago (1A) ya vacía: lo que muevan a 1A se queda ahí
 * durante el turno. El Pasivo 1A (FB-005/DS-006) NO es del Alba: es una habilidad del turno
 * (ver pasivosBloqueo1A).
 * Las transiciones forja→choque→ocaso→alba viven en actions.ts (C4).
 */
export function resolverAlba(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]

  // 0a. Effect Registry: resolver efectos pendientes de fase 'alba'
  resolverFaseEfectos(s, ctx, 'alba', jugador)

  // 0. Expiran los efectos 'alba-dueño' del jugador (ADR-22)
  // B6 (hasta_fase): el Alba de `jugador` es una fase purgadora — los efectos
  // 'hasta-fase' con fase='alba' de ESTE jugador expiran al entrar.
  purgarHastaFase(s, 'alba', jugador)
  purgarEfectosTemporales(s, 'alba-dueño', jugador, ctx)

  // 1. Enderezar Campeones (silencioso)
  //    Capa 3b: el campeón con agotamiento FIJADO por un tramo fix_exhaust
  //    activo NO se endereza (su agotamiento queda fijo mientras la fuente
  //    tenga Éter bloqueado >= umbral — estado derivado exhaustFijado).
  for (const slot of p.campo.campeones) {
    if (slot) {
      const inst = s.instances[slot]
      if (inst.agotado && !exhaustFijado(s, slot)) delete inst.agotado
      if (inst.atacoEsteTurno) delete inst.atacoEsteTurno
      if (inst.opcionUsadaEsteTurno) delete inst.opcionUsadaEsteTurno
    }
  }
  // 1b. Activación diferida (§5.5, C4)
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
    if (id && s.instances[id]?.entradaEsteTurno) delete s.instances[id].entradaEsteTurno
  }

  // 2. Reagrupar el Éter (§8.2): 1A → 2A (los bloqueados permanecen en el Campeón)
  reagruparEter(s, ctx, jugador)

  // 2b. Efectos con reagrupar alba propio (Aurora steal, Ragnar grant_keyword):
  //     liberan el Éter que bloquearon CON SU EFECTO a la Reserva (independiente
  //     del reagrupado 1A→2A). Si el efecto es steal con duracion
  //     'mientras_ester_bloqueado', termina el robo (retorno condicional).
  reagruparEfectosBloqueoAlba(s, ctx, jugador)

  // 3. Efectos "Al inicio de tu turno..." (§8.2) — DESPUÉS de reagrupar.
  //    Los vínculos con efectos periódicos (FB-025, FB-029, DS-025, DS-029) también se evalúan aquí.
  //    §5.5: SOLO vínculos DESTRUIDOS (bocaArriba) tienen efectos vigentes —
  //    los boca-abajo son solo vida. Los destruidos permanecen boca arriba y
  //    sus efectos se acumulan.
  //    fix A7 (2026-10-22, §8.2 "Se resuelven efectos 'Al inicio de tu turno...'"):
  //    ANTES solo se evaluaban Éter pagado + Vínculos (ALBA_SOLO_TIPOS) — un
  //    Campeón/Mística/Arcana con efectos[].trigger 'inicio_alba' NUNCA fireaba.
  //    Ahora entran TODAS las cartas en campo del jugador; dispararTrigger
  //    filtra internamente por los que realmente declaran ese trigger.
  //    F5g: ANTES de los efectos de inicio se fijan los candados de las Arcanas con trigger
  //    inicio_alba ("cuando empezó tu Alba controlas..."): el estado tras enderezar y reagrupar.
  evaluarCandadosArcanas(s, 'inicio_alba', jugador)
  const vinculosSnapshot = p.vinculos.filter((id): id is string => {
    if (!id) return false
    return s.instances[id]?.bocaArriba === true
  })
  const enCampoJugador = [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate,
  ].filter((id): id is string => id !== null)
  const albaInstances = [...vinculosSnapshot, ...enCampoJugador]
  if (albaInstances.length > 0) {
    dispararTrigger(s, ctx, 'al-inicio-alba', jugador, albaInstances)
  }

  // 3b. Un efecto de inicio de Alba pudo MIRAR el mazo (Scry): el jugador ordena ANTES de robar. El Alba espera (es el único
  //     caso en que el Alba es observable, ADR-3); el robo ocurre en reanudarAlba al resolverse el Scry.
  if (scryActual(s)) {
    s.albaPendiente = jugador
    return
  }

  robarDelAlba(s, ctx, jugador)
}

/** 4. Robar 1 (no consume RNG: toma del tope) y comprobar el fin de partida. */
function robarDelAlba(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  robarCarta(s, ctx, jugador)
  // F6: si el robo falló y no queda nada obligatorio por resolver, la derrota se confirma YA (la partida no pasa a la
  // Forja); el punto de control también cubre una derrota de Vínculos del rival que estuviera esperando
  confirmarFinDePartida(s, ctx)
}

/**
 * Termina un Alba que esperaba un Scry: cuando ya no hay mazo por ordenar (se ordenó, o las cartas miradas se
 * robaron/movieron y la pendiente murió) roba la carta del Alba. Se llama tras cada acción (core.applyAction).
 */
export function reanudarAlba(s: GameState, ctx: Ctx): void {
  const jugador = s.albaPendiente
  if (jugador === undefined || scryActual(s)) return
  delete s.albaPendiente
  robarDelAlba(s, ctx, jugador)
}

/** Roba la carta del tope del mazo; mazo vacío → mazo_agotado + partida_terminada. */
export { robarCarta } from './draw'

/**
 * Limpieza defensiva del combate al salir de Choque (ADR-11): la transición
 * choque→ocaso borra GameState.combate aunque el flujo normal ya lo resolvió.
 */
export function limpiarCombate(s: GameState): void {
  s.combate = undefined
}
