/**
 * API pública del motor de reglas de Éter Online.
 *
 * TS puro sin DOM (0 imports react/react-dom/jsdom), determinístico:
 * mismo seed + misma secuencia de acciones → mismo estado final.
 * Corre idéntico en cliente (optimismo) y en Edge Functions (validación).
 */

// Creación y estado
export { createInitialState } from './initialState'
export type { GameState, PlayerId, Fase, MotivoFin, Zona, CardInstance, PlayerState, Ctx, SetupOptions } from './types'

// Acciones
export { applyAction } from './actions'
export type { Action, ApplyActionResult } from './actions'

// Validación y visión
export { getValidActions } from './validActions'
export { visibleState } from './visibleState'

// Economía de Éter
export { aporteDe, validarPago, aplicarPago, bloquearEter, reagruparEter } from './payments'
export type { ContextoUso } from './payments'

// Fases
export { resolverAlba, robarCarta } from './phases'

// RNG y determinismo
export { createCtx, shuffleFisherYates } from './rng'

// Catálogo de cartas
export { getCardMeta, registrarCartas, faccionesCompartidas, esCampeon, esMistica, esTactica, esArcana, esCombate, esEter, esVinculo, campeonNecesitaEterBloqueado } from './cards'

// Reglas de campo
export { sacrificiosRequeridos, esSingular, copiasEnCampo, campeonesSacrificables } from './campo'

// Cadena de efectos en combate (9.6)
export { respondiblesDe, validarResponderCadena, validarPasarPrioridad } from './chain'

// Invariantes de partida (mazo estándar de 61)
export { verificarInvariantes } from './invariants'

// Zonas y límites
export { SLOTS_CAMPEONES, SLOTS_MISTICAS_TACTICAS, SLOTS_ARCANAS_COMBATE, SLOTS_VINCULOS, LIMITE_MANO, limiteSlots, slotAZona } from './zones'

// Eventos (contrato para game-combat-chain y game-handlers)
export type { GameEvent } from './events'
export { CATALOGO_EVENTOS, validarExhaustividadEventos } from './events'

// Bot y simulación
export { botTonto, simularPartida } from './bot'
export type { ResultadoSimulacion } from './bot'

// Efectos de carta (change 3, ADR-20..29): infraestructura + handlers
export {
  registrarEfecto,
  limpiarRegistroEfectos,
  dispararTrigger,
  statsDe,
  keywordsDe,
  aplicarMod,
  otorgarKeyword,
  purgarEfectosTemporales,
  purgarKeywordsTemporales,
} from './efectos'
export { registrarEfectos } from './handlers'
export type { TriggerEfecto, PayloadEfecto, HandlerEfecto } from './efectos'
export type { Modificador, ExpiraModificador } from './types'
export {
  registrarEfectoPendiente,
  resolverFaseEfectos,
  limpiarEfectosFuente,
  cancelarEfectoPendiente,
  efectosPendientesDe,
  contarEfectosPendientes,
  duracionTurnos,
  hastaAlba,
  hastaFinTurno,
  permanente,
} from './effectRegistry'
export type { EfectoPendiente, EfectoAccion, EfectoDuracion, FaseTrigger, OwnerTrigger } from './effectRegistry'
import { registrarEfectos } from './handlers'
registrarEfectos() // C1 (ADR-20): registra los handlers de efectos al importar el motor
