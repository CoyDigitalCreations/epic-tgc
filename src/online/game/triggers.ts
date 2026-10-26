/**
 * Triggers apilados en la cadena (F5d-2, manual §9.6: "Los efectos que se disparan como consecuencia
 * de otra acción (por ejemplo, 'Al invocar...') se agregan a la cadena encima de la acción que los provocó").
 *
 * Hasta F5d-1 `dispararTrigger` ejecuta el efecto al instante. Esta capa es la INFRAESTRUCTURA para apilarlo.
 * Sitios de llamada en producción (construirTriggers + armarTriggers → declararOpener/declararVentana):
 * F5d-3 al-jugar-mistica (movimientos.ts), F5d-4 al-invocar (movimientos.ts), F5d-5 al-atacar (combat.ts).
 * `al-activar-habilidad` sigue sin disparador (pendiente de decisión del usuario).
 *
 * Modelo (genérico: lee el efecto de la carta fuente, nada atado a cartas concretas):
 * - Un `TriggerApilado` (types.ts) es serializable: (controlador, carta fuente, trigger, efectoIdx, objetivo
 *   elegido, payload). El efecto se vuelve a leer del meta (`triggersQueMatchean`) al armar y al resolver;
 *   la `condicion` se evalúa SOLO al apilar (decisión 10b): al resolver NO se re-evalúa.
 * - Cada efecto con match es UNA entrada, ordenada por efectoIdx. El camino inmediato (dispararTrigger)
 *   solo ejecuta el PRIMER efecto con match de cada carta; el apilado ejecuta todos. No duplica
 *   comportamiento (cada efecto es un índice distinto de efectos[]) pero sí alcanza efectos "hermanos" que
 *   antes se perdían: una carta con dos efectos del mismo trigger dispara ambos. Los datos actuales no
 *   tienen cartas así; si el Card-Maker permite dos, ambos se apilan.
 * - Los handlers por cardId (`registrarEfecto`) y genéricos (`registrarEfectoGenerico`) son funciones opacas,
 *   no serializables: NO se apilan; los sitios de llamada los siguen disparando con `dispararTrigger`.
 *
 * APILABLES ("nacen de una acción de jugador"), lista central TRIGGERS_APILABLES: al-invocar, al-atacar,
 * al-jugar-mistica, al-activar-habilidad. INMEDIATOS (no nacen de una acción de jugador, o por decisión):
 * al-matar-en-combate, al-ser-enviado-al-cementerio, al-ser-destruido-vinculo (muertes/daño), al-inicio-alba,
 * al-inicio-choque (fases), al-resolver-cadena (resolución de la cadena), al-pagar-eter (decisión del usuario:
 * sigue inmediato) y al-bloquear-eter (umbral, re-dispatch).
 *
 * Orden y resolución:
 * - `apilarTriggers` ordena de forma estable con el trigger del jugador ACTIVO (el del turno) primero y el del
 *   rival después: el del rival queda encima y resuelve primero (LIFO).
 * - Los objetivos se eligen AL APILAR (estilo Yugioh, decisión 8) con el patrón de F5d-1/F5e: se arman con
 *   `interpretEffect` en modo declaración, el DUEÑO del trigger es el elector (rival incluido: el tutor del
 *   rival lo elige el rival al armarse, no se pierde) y la ventana se abre al elegir el último.
 * - Resolución (chain.resolverPila): respuestas de la pila en reversa y, DEBAJO de ellas, los triggers en
 *   reversa; el opener al final. Un trigger apilado mientras la cadena ya tenía respuestas (la acción que lo
 *   provocó fue una respuesta) lleva `sobre` = esa respuesta y resuelve justo antes que ella.
 * - Reglas aprobadas: (a) si la fuente ya no está en el campo (ni en la pila, para cartas jugadas como
 *   respuesta; el opener NO cuenta: F5d-3) o perdió su vigencia (Vínculo boca abajo), el trigger se pierde
 *   sin efectos parciales; la `condicion` NO se re-evalúa al resolver (decisión 10b: se evaluó al apilar); (b) el objetivo elegido se revalida
 *   al resolver (resolveTargets, F5h): si ya no es válido, fizzle; (c) el costo de Éter se cobra AL RESOLVER:
 *   sin fondos, fizzle; (d) NO se pueden negar (negar/Marcha solo alcanza al opener); (e) al-pagar-eter
 *   sigue inmediato; (f) los triggers sin acción de jugador siguen inmediatos.
 * - Sin ventana posible (gate cerrado: el rival no puede responder, o la jugada es Fugaz) los triggers
 *   resuelven de inmediato en el mismo orden LIFO, ya con sus objetivos elegidos.
 * - Decisión 10a (F5d-3): cada trigger emite `trigger_apilado` (events.ts) UNA VEZ, AL APILAR (armarTriggers
 *   o el bucle inmediato de apilarTriggers), nunca al resolver. El objetivo elegido no viaja en el evento.
 * - La velocidad de la ventana la fija la jugada que la abre (opener / invocación / ataque); en una ventana
 *   de solo triggers, la fuente del último trigger apilado. Los triggers no entran a la pila de respuestas,
 *   así que no cuentan para la velocidad requerida (a revisar con el usuario).
 *
 * DECISIÓN (g) — trigger de acción generado mientras se resuelve la pila o un trigger (profundidadTriggers
 * > 0): la cadena YA está cerrada a respuestas (ambos pasaron), así que NO abre ventana ni se apila: se
 * resuelve de inmediato, en orden LIFO, como el camino inmediato clásico (sus elecciones, si las hay, van a
 * la cola de objetivosPendientes). Alternativa, de estilo Yugioh: abrir una ventana nueva al cerrar la
 * cadena; queda como mejora si el usuario la pide. Tope MAX_PROFUNDIDAD_TRIGGERS niveles anidados: más allá
 * el trigger se descarta (sin recursión infinita).
 */
import { getCardMeta } from './cards'
import { instanciasEnCampo, triggersQueMatchean, type PayloadEfecto, type TriggerEfecto, type TriggerMatch } from './efectos'
import { canExecuteEffect, cobrarCostoEter, interpretEffect, objetivoCompleto } from './effectInterpreter'
import { resolveTargets } from './targetResolver'
import { abrirCadenaGlobal, declararVentana, marcarInicioAccion, type MarcadorAccion } from './chain'
import type { CadenaState, Ctx, DeclaracionCadena, GameState, TriggerApilado } from './types'

/** Triggers que nacen de una acción de jugador y por tanto se apilan (ver cabecera). */
export const TRIGGERS_APILABLES: readonly TriggerEfecto[] = ['al-invocar', 'al-atacar', 'al-jugar-mistica', 'al-activar-habilidad']

/** Niveles de resolución anidados que se toleran; más allá el trigger se descarta (decisión g). */
export const MAX_PROFUNDIDAD_TRIGGERS = 8

export function esTriggerApilable(trigger: TriggerEfecto): boolean {
  return TRIGGERS_APILABLES.includes(trigger)
}

/* ──────────────────────────── Construcción y orden ──────────────────────────── */

/**
 * Entradas apilables de `trigger` en las instancias `ids` (una por efecto con match, ver
 * triggersQueMatchean). Para los sitios de llamada: `apilarTriggers(s, ctx, construirTriggers(...))`.
 * Devuelve [] si el trigger no es apilable.
 */
export function construirTriggers(
  s: GameState,
  trigger: TriggerEfecto,
  jugador: TriggerApilado['jugador'],
  ids: readonly string[],
  payload?: Pick<PayloadEfecto, 'killerId' | 'victimaId' | 'contextoUso'>,
): TriggerApilado[] {
  if (!esTriggerApilable(trigger)) return []
  const datos: NonNullable<TriggerApilado['payload']> = {}
  if (payload?.killerId) datos.killerId = payload.killerId
  if (payload?.victimaId) datos.victimaId = payload.victimaId
  if (payload?.contextoUso) datos.contextoUso = payload.contextoUso
  return triggersQueMatchean(s, trigger, jugador, ids).map((m) => ({
    jugador,
    cardInstanceId: m.inst.cardInstanceId,
    trigger,
    efectoIdx: m.efectoIdx,
    ...(Object.keys(datos).length > 0 ? { payload: { ...datos } } : {}),
  }))
}

/** Orden ESTABLE de apilado: primero los del jugador activo (el del turno), después los del rival. */
export function ordenarTriggers(s: GameState, lista: readonly TriggerApilado[]): TriggerApilado[] {
  return [...lista.filter((t) => t.jugador === s.turno), ...lista.filter((t) => t.jugador !== s.turno)]
}

/**
 * El efecto de un trigger apilado, releído del meta (undefined si la carta o el match ya no existen).
 * `alResolver` (decisión 10b): la `condicion` NO se re-evalúa — se fijó al apilar; se conservan el
 * filtro de vigencia (Vínculo boca abajo) y el match del efecto.
 */
function matchDe(s: GameState, t: TriggerApilado, alResolver = false): TriggerMatch | undefined {
  return triggersQueMatchean(s, t.trigger, t.jugador, [t.cardInstanceId], alResolver ? { evaluarCondicion: false } : undefined)
    .find((m) => m.efectoIdx === t.efectoIdx)
}

function payloadBase(t: TriggerApilado): PayloadEfecto {
  return {
    jugador: t.jugador,
    fromTrigger: true,
    ...(t.payload?.killerId ? { killerId: t.payload.killerId } : {}),
    ...(t.payload?.victimaId ? { victimaId: t.payload.victimaId } : {}),
  }
}

/**
 * Arma la elección de objetivos de cada trigger (en orden de apilado) con el patrón de declaración de
 * F5d-1/F5e: interpretEffect en modo `declararOpener` solo crea el pendiente (marcado con el efectoIdx), sin
 * ejecutar nada ni cobrar el costo. El elector es `t.jugador`. Devuelve las entradas ordenadas y limpias
 * (sin objetivo ni `sobre`); las que ya no son válidas se omiten.
 */
export function armarTriggers(s: GameState, ctx: Ctx, lista: readonly TriggerApilado[]): TriggerApilado[] {
  const armados: TriggerApilado[] = []
  for (const t of ordenarTriggers(s, lista)) {
    if (!esTriggerApilable(t.trigger)) continue
    const inst = s.instances[t.cardInstanceId]
    const match = matchDe(s, t)
    if (!inst || !match) continue
    // Decisión 10a: `trigger_apilado` se emite UNA VEZ por trigger, AL APILAR (aquí, cuando arma su
    // elección de objetivo); al resolver NO se vuelve a emitir. El objetivo elegido no viaja en el evento.
    ctx.emit({ type: 'trigger_apilado', jugador: t.jugador, cardInstanceId: t.cardInstanceId, trigger: t.trigger, efectoIdx: t.efectoIdx })
    interpretEffect(s, ctx, inst, match.efecto, {
      ...payloadBase(t),
      cobrarCosto: false,
      declararOpener: { efectoIdx: t.efectoIdx },
      ...(t.payload?.contextoUso ? { contextoUso: t.payload.contextoUso } : {}),
    })
    armados.push({
      jugador: t.jugador,
      cardInstanceId: t.cardInstanceId,
      trigger: t.trigger,
      efectoIdx: t.efectoIdx,
      ...(t.payload ? { payload: { ...t.payload } } : {}),
    })
  }
  return armados
}

/**
 * Captura el objetivo que el dueño de un trigger eligió (elegir_objetivo sobre un pendiente armado por
 * armarTriggers). Devuelve true si el pendiente era de un trigger de la declaración. Un objetivo que ya no
 * existe se descarta (el trigger se pierde al resolver).
 */
export function registrarObjetivoTrigger(
  s: GameState,
  pendiente: { instId?: string; opener?: { efectoIdx: number } },
  objetivoId: string,
): boolean {
  const t = s.declaracionEnEleccion?.triggers?.find(
    (x) => x.objetivoId === undefined && x.cardInstanceId === pendiente.instId && x.efectoIdx === pendiente.opener?.efectoIdx,
  )
  if (!t) return false
  if (s.instances[objetivoId]) t.objetivoId = objetivoId
  return true
}

/* ──────────────────────────── Apilado ──────────────────────────── */

/**
 * Apila triggers de acción (ver cabecera): los ordena, arma la elección de objetivos de sus dueños y, al
 * elegir el último, abre la ventana (o resuelve ya si nadie puede responder). `previos` es el marcador de
 * pendientes del INICIO de la acción (marcarInicioAccion); por omisión se toma aquí.
 * Con profundidadTriggers > 0 (se está resolviendo una pila o un trigger) resuelven de inmediato (decisión g).
 */
export function apilarTriggers(s: GameState, ctx: Ctx, lista: readonly TriggerApilado[], previos: MarcadorAccion = marcarInicioAccion(s)): void {
  const validas = lista.filter((t) => esTriggerApilable(t.trigger) && !!s.instances[t.cardInstanceId])
  if (validas.length === 0) return
  if ((s.profundidadTriggers ?? 0) > 0) {
    for (const t of [...ordenarTriggers(s, validas)].reverse()) {
      // Decisión 10a: sin ventana tampoco hay re-emisión al resolver — una sola por trigger, aquí
      ctx.emit({ type: 'trigger_apilado', jugador: t.jugador, cardInstanceId: t.cardInstanceId, trigger: t.trigger, efectoIdx: t.efectoIdx })
      resolverTrigger(s, ctx, t, 'inmediato')
    }
    return
  }
  const triggers = armarTriggers(s, ctx, validas)
  if (triggers.length === 0) return
  declararVentana(s, ctx, { tipo: 'triggers', jugador: s.turno, triggers }, previos)
}

/** Mete los triggers ya armados a la cadena abierta, encima de lo que haya (la última respuesta de la pila, si la hay). */
export function asentarTriggers(s: GameState, triggers: readonly TriggerApilado[] | undefined): void {
  const cadena = s.cadena
  if (!cadena || !triggers || triggers.length === 0) return
  const sobre = cadena.pila.length > 0 ? cadena.pila[cadena.pila.length - 1] : undefined
  cadena.triggers = [...(cadena.triggers ?? []), ...triggers.map((t) => (sobre ? { ...t, sobre } : { ...t }))]
  cadena.pasesConsecutivos = 0 // algo nuevo entró a la pila: ambos deben volver a pasar
}

/** Sin ventana posible: los triggers resuelven ya, en orden LIFO (el último apilado primero). */
export function resolverTriggersInmediatos(s: GameState, ctx: Ctx, triggers: readonly TriggerApilado[] | undefined): void {
  for (const t of [...(triggers ?? [])].reverse()) resolverTrigger(s, ctx, t, 'elegido')
}

/**
 * Ventana de una declaración 'triggers' (sin jugada propia): si la cadena ya está abierta se suman a ella; si no, se
 * abre una global con prioridad del rival (gate con Presteza de mano pagable) y, si nadie puede responder, resuelven ya.
 */
export function abrirVentanaTriggers(s: GameState, ctx: Ctx, declaracion: Omit<DeclaracionCadena, 'pendientes'>): void {
  const triggers = declaracion.triggers ?? []
  if (triggers.length === 0) return
  if (s.cadena) {
    asentarTriggers(s, triggers)
    return
  }
  const ultimo = triggers[triggers.length - 1]
  const cardId = s.instances[ultimo.cardInstanceId]?.cardId
  const descripcion = (cardId ? getCardMeta(cardId)?.name : null) ?? ultimo.cardInstanceId
  if (abrirCadenaGlobal(s, declaracion.jugador, { cardInstanceId: ultimo.cardInstanceId, descripcion }, true)) {
    asentarTriggers(s, triggers)
    return
  }
  resolverTriggersInmediatos(s, ctx, triggers)
}

/* ──────────────────────────── Resolución ──────────────────────────── */

/** Un paso de la resolución: una respuesta de la pila o un trigger apilado. */
export type PasoResolucion = { respuesta: string } | { trigger: TriggerApilado }

/**
 * Orden de resolución de la cadena (sin el opener, que va al final): del tope al fondo. Cada respuesta de la pila
 * lleva encima los triggers que se apilaron sobre ella (`sobre`); los que no llevan `sobre` (o cuya respuesta ya
 * salió de la pila) van en el fondo, debajo de TODAS las respuestas y encima del opener. Dentro de un nivel el último
 * apilado resuelve primero. Sin triggers equivale a las respuestas de la pila en reversa.
 */
export function ordenResolucion(cadena: CadenaState): PasoResolucion[] {
  const triggers = cadena.triggers ?? []
  const abajoArriba: PasoResolucion[] = triggers
    .filter((t) => !t.sobre || !cadena.pila.includes(t.sobre))
    .map((trigger) => ({ trigger }))
  for (const id of cadena.pila) {
    abajoArriba.push({ respuesta: id })
    for (const t of triggers) if (t.sobre === id) abajoArriba.push({ trigger: t })
  }
  return abajoArriba.reverse()
}

/** Ejecuta `fn` contando un nivel de resolución anidado (profundidadTriggers); el contador nunca queda en el estado. */
export function enResolucion(s: GameState, fn: () => void): void {
  s.profundidadTriggers = (s.profundidadTriggers ?? 0) + 1
  try {
    fn()
  } finally {
    const n = (s.profundidadTriggers ?? 1) - 1
    if (n <= 0) delete s.profundidadTriggers
    else s.profundidadTriggers = n
  }
}

/**
 * ¿La fuente sigue en juego para disparar? En el campo de su controlador o, si se jugó como RESPUESTA,
 * en la pila. Decisión 2: si la FUENTE sale del campo antes de resolver, el trigger se PIERDE. El
 * opener NO cuenta como "en la pila": F5d-3 corrigió el ancla `cadena.opener` que hacía inalcanzable
 * la regla para los triggers cuya fuente es la propia jugada (al-jugar-mistica) — una respuesta que
 * la saca del campo mata su trigger.
 */
function fuenteEnJuego(s: GameState, t: TriggerApilado): boolean {
  const id = t.cardInstanceId
  if (instanciasEnCampo(s, t.jugador).includes(id)) return true
  const cadena = s.cadena
  return !!cadena && cadena.pila.includes(id)
}

/**
 * Resuelve UN trigger apilado (ver cabecera, reglas a-d). Modos:
 * - 'elegido': el objetivo se eligió al apilar (`t.objetivoId`); sin objetivo elegido el efecto no arma pendientes
 *   nuevos (si necesitaba elegir, se pierde). Revalida fuente, vigencia, objetivo y fondos antes de cobrar nada;
 *   la `condicion` NO se re-evalúa (decisión 10b: se fijó al apilar).
 * - 'inmediato' (decisión g): como dispararTrigger — resuelve objetivos y costo ahora y las elecciones van a la cola.
 */
export function resolverTrigger(s: GameState, ctx: Ctx, t: TriggerApilado, modo: 'elegido' | 'inmediato' = 'elegido'): void {
  if (s.fase === 'terminada') return
  if ((s.profundidadTriggers ?? 0) >= MAX_PROFUNDIDAD_TRIGGERS) return
  const inst = s.instances[t.cardInstanceId]
  if (!inst || !fuenteEnJuego(s, t)) return // (a) la fuente se fue: el trigger se pierde
  const match = matchDe(s, t, true)
  if (!match) return // (a) la fuente perdió su vigencia (Vínculo boca abajo / efecto sin match); la condicion NO se re-evalúa
  const { efecto } = match
  const contextoUso = t.payload?.contextoUso
  enResolucion(s, () => {
    if (modo === 'inmediato') {
      interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), cobrarCosto: true, ...(contextoUso ? { contextoUso } : {}) })
      return
    }
    if (t.objetivoId !== undefined) {
      // (b) el objetivo debe seguir siendo candidato; (c) el costo se cobra al resolver y solo si el efecto va a ocurrir
      if (!canExecuteEffect(s, efecto.efecto, t.jugador)) return
      if (efecto.objetivo && efecto.objetivo.tipo !== 'self') {
        if (!resolveTargets(s, objetivoCompleto(efecto), t.jugador, t.cardInstanceId).includes(t.objetivoId)) return
      }
      if (efecto.costo && !cobrarCostoEter(s, ctx, inst, efecto.costo, t.jugador)) return
      interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), sinEleccion: true, contextoUso: 'objetivo-elegido', objetivoId: t.objetivoId })
      return
    }
    // Sin objetivo elegido: o el efecto no lo necesita (se ejecuta, cobrando el costo al resolver) o se pierde (sinEleccion)
    interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), cobrarCosto: true, sinEleccion: true, ...(contextoUso ? { contextoUso } : {}) })
  })
}
