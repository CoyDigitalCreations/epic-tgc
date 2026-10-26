/**
 * Vigencia y obsolescencia de los objetivos pendientes (F5h).
 *
 * `GameState.objetivosPendientes` guarda elecciones que alguien debe hacer. Entre que se
 * arma el pendiente y se elige (o se resuelve) el estado cambia: la opción puede salir de su
 * zona, exiliarse, volver a la mano o ganar un Protector. Dos conceptos, ambos genéricos
 * (leen el efecto de la carta fuente, nada atado a cartas concretas):
 *
 * - OBJETIVO VIGENTE: la instancia existe Y sigue siendo candidata del efecto que armó el
 *   pendiente (`resolveTargets` con los mismos filtros/zona que al armarlo). Si el efecto no
 *   se puede identificar (trigger de handler registrado a mano, estados de prueba) basta con
 *   que la instancia exista. Es la ÚNICA regla: la usan la oferta (getValidActions), el
 *   validador (elegir_objetivo), la ejecución y el resolvedor de pila/opener, para que no diverjan.
 *
 * - PENDIENTE OBSOLETO (se descarta de la cola, nunca se elige ni se ejecuta):
 *   1. su fuente ya no existe como instancia;
 *   2. no le queda ninguna opción vigente (fuera de una declaración en elección: dentro, la
 *      declaración cuenta sus pendientes y el elector lo resuelve como fizzle);
 *   3. nació en un turno que ya terminó: la cola solo vive hasta el Ocaso del turno en que se
 *      armó (quien pasa el turno renuncia a lo que no eligió). Desde H4 el pendiente de quien
 *      NO es el jugador del turno ya no se pierde por esta vía: su dueño lo elige de inmediato
 *      (ver `electorAjeno`: el turno queda congelado hasta que elija). Salvedad:
 *      los de UMBRAL de Éter bloqueado (`tramoUmbral` o trigger 'al-bloquear-eter', p. ej.
 *      steal_champion) son estado de una fuente que sigue bloqueando y se conservan mientras
 *      sigan cumpliendo 1 y 2.
 *   Los pendientes de una declaración en elección (`declaracionEnEleccion`), `equiparPendiente`,
 *   `preventivosPendientes` y `opcionesPendientes` no pasan por aquí.
 */
import { resolveTargets } from './targetResolver'
import { getCardMeta } from './cards'
import { objetivoCompleto, toHyphenTrigger, umbralTrigger } from './effectInterpreter'
import type { EfectoData } from '../../shared/types'
import type { GameState, PendienteObjetivo } from './types'

/** Trigger con el que interpretEffect arma el pendiente de un efecto (misma clave que `PendienteObjetivo.trigger`). */
function claveTrigger(efecto: EfectoData): string {
  return toHyphenTrigger(efecto.trigger) ?? umbralTrigger(efecto) ?? 'ninguno'
}

/** Opciones del pendiente que siguen siendo candidatas (ver cabecera). Conserva el orden de `opciones`. */
export function opcionesVigentes(s: GameState, p: PendienteObjetivo): string[] {
  const vivas = p.opciones.filter((id) => s.instances[id])
  if (vivas.length === 0) return vivas
  // F5f: Campeón al que equipar una respuesta Artefacto — debe seguir en el campo de quien equipa
  if (p.equipar) return vivas.filter((id) => s.players[p.jugador].campo.campeones.includes(id))
  const fuente = s.instances[p.instId]
  const meta = fuente?.cardId ? getCardMeta(fuente.cardId) : null
  const efectos = meta && 'efectos' in meta ? meta.efectos : undefined
  if (!fuente || !efectos) return vivas

  // Tramo escalonado (Capa 3b): objetivo del raíz con los filtros propios del tramo
  if (p.tramoUmbral !== undefined) {
    const raiz = efectos.find((e) => e.tramos?.some((t) => t.umbral === p.tramoUmbral))
    const tramo = raiz?.tramos?.find((t) => t.umbral === p.tramoUmbral)
    if (!raiz?.objetivo || !tramo) return vivas
    const candidatos = resolveTargets(s, { ...raiz.objetivo, filtros: { ...raiz.objetivo.filtros, ...tramo.filtros } }, fuente.owner)
    return vivas.filter((id) => candidatos.includes(id))
  }

  // Efecto que armó el pendiente: el índice exacto si lo trae (opener/respuesta) o los efectos con
  // objetivo cuyo trigger coincide (varios del mismo trigger: se acepta lo que valga para cualquiera)
  const armadores = p.opener
    ? [efectos[p.opener.efectoIdx]].filter((e): e is EfectoData => !!e?.objetivo && e.objetivo.tipo !== 'self')
    : efectos.filter((e) => !!e.objetivo && e.objetivo.tipo !== 'self' && claveTrigger(e) === p.trigger)
  if (armadores.length === 0) return vivas // no se identifica el efecto: basta con que la instancia exista
  const candidatos = new Set<string>()
  for (const e of armadores) for (const id of resolveTargets(s, objetivoCompleto(e), p.jugador, p.instId)) candidatos.add(id)
  return vivas.filter((id) => candidatos.has(id))
}

/** ¿El pendiente es de umbral de Éter bloqueado? (sobrevive al fin de turno mientras su fuente siga igual) */
function esDeUmbral(p: PendienteObjetivo): boolean {
  return p.tramoUmbral !== undefined || p.trigger === 'al-bloquear-eter'
}

/**
 * H4 (decisión 8): el pendiente que el DUEÑO ajeno al turno debe elegir YA. Nace al resolver una pila (el tutor del
 * rival al morir su Campeón, un efecto de una respuesta suya) y, fuera de una declaración en elección, queda al frente
 * de la cola: el elector es su dueño aunque no sea su turno (`actorActual`), y mientras no elija el resto del juego
 * espera (`validarAccion`: solo elegir / rendirse / prevenir). Los de umbral de Éter bloqueado NO entran: son estado de
 * una fuente que sigue bloqueando y se eligen en el turno de su dueño (ver `esDeUmbral`). Solo mira el FRENTE (la cola es
 * FIFO): un pendiente suyo detrás de uno de umbral espera a que el frente se atienda. Puro: no modifica el estado.
 */
export function electorAjeno(s: GameState): PendienteObjetivo | undefined {
  if (s.declaracionEnEleccion) return undefined
  const frente = s.objetivosPendientes?.[0]
  if (!frente || frente.jugador === s.turno || esDeUmbral(frente)) return undefined
  return opcionesVigentes(s, frente).length > 0 ? frente : undefined
}

/**
 * Fuera de una declaración en elección, quita del FRENTE de la cola los pendientes que ya no tienen
 * qué elegir (todas sus opciones dejaron de ser vigentes; criterio 2 de la cabecera), para que no
 * atasquen a los que van detrás. Devuelve cuántos quitó. Se llama tras cada acción (core.applyAction) y al ofrecer acciones.
 */
export function descartarFrentesMuertos(s: GameState): number {
  if (s.declaracionEnEleccion) return 0
  let quitados = 0
  while (s.objetivosPendientes && s.objetivosPendientes.length > 0) {
    const frente = s.objetivosPendientes[0]
    if (opcionesVigentes(s, frente).length > 0) break
    s.objetivosPendientes = s.objetivosPendientes.slice(1)
    quitados++
  }
  return quitados
}

/**
 * Fin de turno (Ocaso → Alba del rival): descarta de la cola todo pendiente obsoleto (criterios 1-3 de la
 * cabecera). Devuelve cuántos descartó. No toca el resto del estado.
 */
export function descartarPendientesObsoletos(s: GameState): number {
  const cola = s.objetivosPendientes
  if (!cola || cola.length === 0 || s.declaracionEnEleccion) return 0
  const vigentes = cola.filter((p) => esDeUmbral(p) && s.instances[p.instId] && opcionesVigentes(s, p).length > 0)
  if (vigentes.length === cola.length) return 0
  const descartados = cola.length - vigentes.length
  s.objetivosPendientes = vigentes
  return descartados
}
