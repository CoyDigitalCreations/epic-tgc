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
export { getValidActions, actorActual } from './validActions'
export { visibleState } from './visibleState'

// Economía de Éter
export { aporteDe, validarPago, aplicarPago, bloquearEter, reagruparEter, maxEterBloqueado, esBloqueoFijo } from './payments'
export type { ContextoUso } from './payments'

// Pasivo 1A: parejas legales Campeón + Éter para el modal de elección
export { parejasBloqueoOpcion } from './habilidades'
export type { ParejaBloqueo } from './habilidades'

// Fases
export { resolverAlba, robarCarta } from './phases'

// RNG y determinismo
export { createCtx, createCtxFromDraws, shuffleFisherYates } from './rng'

// Catálogo de cartas
export { getCardMeta, registrarCartas, faccionesCompartidas, esCampeon, esMistica, esArcana, esEter, esVinculo, campeonNecesitaEterBloqueado, costeEterHabilidad, efectoBloqueoAccion } from './cards'

// Reglas de campo
export { sacrificiosRequeridos, esSingular, copiasEnCampo, campeonesSacrificables } from './campo'

// Combate — sub-máquina 9.x (A6/A5: elección de atacantes y bloqueadores)
export { atacantesElegibles, bloqueadoresDisponibles } from './combat'

// Cadena de efectos en combate (9.6)
export { cadenaActiva, respondiblesDe, validarResponderCadena, validarPasarPrioridad } from './chain'

// Invariantes de partida (mazo estándar de 61)
export { verificarInvariantes, verificarZonaUnica } from './invariants'

// Zonas y límites
export { SLOTS_CAMPEONES, SLOTS_MISTICAS_TACTICAS, SLOTS_ARCANAS_COMBATE, SLOTS_VINCULOS, LIMITE_MANO, limiteSlots, slotAZona } from './zones'

// Eventos (contrato para game-combat-chain y game-handlers)
export type { GameEvent } from './events'
export { CATALOGO_EVENTOS, validarExhaustividadEventos } from './events'

// Bot y simulación
export { botTonto, simularPartida } from './bot'
export type { ResultadoSimulacion, Dificultad } from './bot'

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
  hastaAlba,
} from './effectRegistry'
export { dispararUmbralBloqueo, reagruparEfectosBloqueoAlba, retornarCampeonesRobados, ejecutarTramo, exhaustFijado } from './effectInterpreter'
export type { EfectoPendiente, AccionPendiente, EfectoDuracion, FaseTrigger, OwnerTrigger } from './effectRegistry'
import { registrarEfectos } from './handlers'
registrarEfectos() // C1 (ADR-20): registra los handlers de efectos al importar el motor
