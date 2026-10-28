/**
 * Cadena de efectos en combate (9.6, ADR-12).
 *
 * Mecanismo (sin efectos de cartas — esos son game-handlers, change 3):
 * - `abrirCadena(s, primerRespondedor)`: apertura CONDICIONAL — solo si el
 *   jugador tiene cartas respondibles (F5f: UNA regla, `motivoNoResponde`, manda la
 *   VELOCIDAD normal < Presteza < Fugaz; Arcana con su condición cumplida y colocada
 *   en turnos ANTERIORES §5.4 → flag `entradaEsteTurno`; Disparo de Campeón; Presteza/Fugaz de la mano —
 *   una Mística en el campo NO responde, §5.3).
 *   Una FUGAZ apilada cierra la pila al instante (nadie puede responderla).
 * - Pila + prioridad + pasesConsecutivos: con 2 pases seguidos la pila se
 *   resuelve en ORDEN INVERSO (§9.6): la última activación primero.
 * - Resolución (F5e, `resolverPila`, ÚNICA para global y combate): Mística jugada
 *   desde la mano → Cementerio; Arcana → 2G liberando el slot (se consumen); la
 *   Táctica y el Campeón con Disparo PERMANECEN en mesa. Cada respuesta eligió sus
 *   objetivos AL RESPONDER (`declararRespuesta`). Al cerrar la de combate,
 *   `continuarCombateTrasCadena` reanuda la sub-máquina de combate.
 *
 * F5d-2: la cadena también lleva TRIGGERS apilados (`cadena.triggers`, triggers.ts): resuelven debajo de las
 * respuestas y encima del opener, y la declaración en elección (`tipo` 'triggers' o cualquier tipo con
 * `triggers`) deja que su dueño elija los objetivos antes de abrir la ventana.
 *
 * 0 extracciones RNG (contrato 89 intacto). CICLO de import deliberado con
 * combat.ts: ambos módulos se usan mutuamente SOLO en runtime (ESM, seguro).
 */
import { esArcana, esArtefactoEquipable, esCostoBloqueo, esMistica, esPermanenteEnMesa, getCardMeta, type AnyCard } from './cards'
import { abrirVentanaAtaque, continuarCombateTrasCadena, rivalDe } from './combat'
import {
  abrirVentanaTriggers, armarTriggers, asentarTriggers, enResolucion, ordenResolucion, registrarObjetivoTrigger, resolverTrigger,
  resolverTriggersInmediatos,
} from './triggers'
import { condicionCumple, condicionEsCandado, dispararTrigger, velocidadDe } from './efectos'
import { interpretEffect } from './effectInterpreter'
import { aplicarPago, etersParaPagar, validarPago, type ContextoUso } from './payments'
import { enviarAlCementerio } from './replacements'
import { efectosNegados } from './reglas'
import { eterIdsParaHabilidad, pagarHabilidad } from './habilidadPago'
import { aplicarBloqueoAlJugar, bloqueoParaJugar, motivoBloqueoAlJugar } from './bloqueoAlJugar'
import { metaDeInstancia } from './efectosInstancia'
import type { CondicionEfecto, EfectoData } from '../../shared/types'
import type {
  Ctx, CadenaState, DeclaracionCadena, GameState, OpenerCadena, PlayerId, RespuestaApilada, RespuestaCadena, TriggerApilado,
} from './types'
import { slotAZona } from './zones'

type Velocidad = 'normal' | 'presteza' | 'fugaz'

/**
 * Velocidad que debe tener quien responde ahora (manual: PRESTEZA solo se responde con
 * PRESTEZA o FUGAZ; FUGAZ no se responde): la del tope de la pila o, con la pila vacía,
 * la de la jugada que abrió la ventana (opener / invocación). Normal = cualquiera.
 */
function velocidadRequeridaDe(state: GameState): Velocidad {
  const cadena = cadenaActiva(state)
  if (!cadena) return 'normal'
  const tope = cadena.pila.length > 0 ? cadena.pila[cadena.pila.length - 1] : cadena.efectoActual?.cardInstanceId
  return tope ? velocidadDe(state, tope) : 'normal'
}

/** Determina si una carta con velocidad `vel` puede responder a una cadena con velocidad `requerida`. */
function puedeResponder(vel: Velocidad, requerida: Velocidad): boolean {
  if (requerida === 'fugaz') return false // FUGAZ: nadie responde
  if (requerida === 'presteza') return vel === 'presteza' || vel === 'fugaz' // Solo PRESTEZA/FUGAZ
  return true // normal: cualquier velocidad responde
}

/**
 * ¿La Arcana `id` de `jugador` puede activarse AHORA? (F5f) Condiciones comunes de activar_arcana y de
 * responder con ella, para que nunca diverjan: en su campo y boca abajo; NO el turno en que se colocó
 * (§5.4: sí desde el turno siguiente, el del rival o cualquiera posterior); su `condicion` JSON: con trigger
 * inicio_alba/inicio_choque es un CANDADO (F5g, `condicionHabilitada`, fijado al ocurrir ese momento), el
 * resto de triggers se evalúa en vivo; un ARTEFACTO equipable exige un Campeón propio. Devuelve el motivo del rechazo o null.
 */
export function motivoArcanaNoActivable(state: GameState, jugador: PlayerId, id: string): string | null {
  const inst = state.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (!inst || !meta) return 'instancia no encontrada'
  if (!esArcana(meta)) return 'no es una Arcana'
  const p = state.players[jugador]
  if (!p.campo.arcanasCombate.includes(id)) return 'la Arcana no está en el campo'
  if (inst.bocaArriba) return 'la Arcana ya está boca arriba'
  if (inst.entradaEsteTurno) return 'la Arcana no se puede activar el turno en que fue colocada (§5.4)'
  const condicion = 'condicion' in meta ? (meta as { condicion?: CondicionEfecto }).condicion : undefined
  if (condicionEsCandado(condicion)) {
    // candado y llave (F5g): la condición se evaluó al ocurrir su trigger; habilitada = se puede activar ahora
    if (!inst.condicionHabilitada) return 'la condición de la Arcana no se cumplió al inicio de su momento (Alba/Choque)'
  } else {
    const condError = condicionCumple(state, condicion, jugador)
    if (condError) return condError
  }
  if (esArtefactoEquipable(meta) && !p.campo.campeones.some((c) => c !== null)) {
    return 'no puedes activar un ARTEFACTO sin un Campeón en tu campo'
  }
  return null
}

/**
 * REGLA ÚNICA de elegibilidad de una respuesta (F5f): ¿la carta `id` de `jugador` puede responder AHORA
 * a la cadena abierta (o a la jugada que abre la ventana)? Es lo que consultan respondiblesDe,
 * respuestasDeMano, validarResponderCadena, validarJugarRespuesta, getValidActions y el gate de apertura,
 * así que nunca divergen. Manda la VELOCIDAD (normal < Presteza < Fugaz), no el tipo de carta ni si
 * permanece en mesa. `origen`: 'campo' (carta ya en mesa) o 'mano' (Mística que se juega pagando; exige
 * PRESTEZA o FUGAZ). Devuelve el motivo del rechazo o null.
 */
/**
 * El Disparo que un Campeón usa al RESPONDER en una cadena (§9.6): el primero sin trigger (o `ninguno`), que es el que
 * `activar_habilidad` activa. Se paga, agota y elige su objetivo AL RESPONDER y resuelve en la pila. Un Disparo con trigger
 * `al_resolver_cadena` no pasa por aquí: lo despacha el trigger de la resolución (su coste se cobra al resolver).
 */
export function disparoDeRespuesta(meta: AnyCard | null | undefined): { efecto: EfectoData; efectoIdx: number } | null {
  if (!meta || !('efectos' in meta) || !meta.efectos) return null
  const efectoIdx = meta.efectos.findIndex((e) => e.tipo === 'disparo' && !!e.efecto && (!e.trigger || e.trigger === 'ninguno'))
  return efectoIdx === -1 ? null : { efecto: meta.efectos[efectoIdx], efectoIdx }
}

export function motivoNoResponde(state: GameState, jugador: PlayerId, id: string, origen: 'campo' | 'mano'): string | null {
  const cadena = cadenaActiva(state)
  const inst = state.instances[id]
  const meta = metaDeInstancia(state, id) // su Disparo incluye los copiados de otro Campeón
  if (!inst || !meta) return 'carta desconocida'
  // ya está en la pila (no responde dos veces) o es el opener (fondo de la pila, F5b)
  if (cadena && (cadena.pila.includes(id) || cadena.opener?.cardInstanceId === id)) return 'la carta ya está en la pila'
  const p = state.players[jugador]
  const vel = velocidadDe(state, id)
  const requerida = velocidadRequeridaDe(state)
  if (!puedeResponder(vel, requerida)) {
    return requerida === 'fugaz' ? 'una jugada FUGAZ no se puede responder' : 'una jugada PRESTEZA solo se responde con PRESTEZA o FUGAZ'
  }
  if (origen === 'mano') {
    if (!p.mano.includes(id)) return 'la carta no está en tu mano'
    if (!esMistica(meta)) return 'no es una Mística'
    if (vel === 'normal') return 'solo cartas con PRESTEZA o FUGAZ juegan desde la mano como respuesta'
    // una permanente (Artefacto, efecto continuo) se queda en mesa: necesita slot libre (y Campeón si se equipa)
    if (esPermanenteEnMesa(meta)) {
      if (!p.campo.misticasTacticas.includes(null)) return 'no tienes un slot libre para una carta que permanece en mesa'
      if (esArtefactoEquipable(meta) && !p.campo.campeones.some((c) => c !== null)) {
        return 'no puedes jugar un ARTEFACTO sin un Campeón en tu campo'
      }
    }
    const pagoIds = etersParaPagar(state, jugador, meta.id)
    if (pagoIds === null) return 'no puedes pagar su coste'
    // «Bloquea N Éter» al jugar (Último Refugio): hace falta una Mística o Arcana rival que copiar y Éter para pagar Y bloquear
    if (bloqueoParaJugar(state, jugador, meta, pagoIds) === null) return 'no hay una Mística o Arcana rival que copiar, o no te alcanza el Éter para pagar y bloquear'
    return null
  }
  // Decisión del usuario (2026-10-26, manual §5.3): las Místicas SOLO se juegan desde la mano. Una que ya está en el
  // campo (continua o ARTEFACTO) no se activa otra vez: no responde. Se responde con una Mística jugándola desde la
  // mano (origen 'mano', arriba), con Arcanas boca abajo o con Disparos de Campeones.
  if (esMistica(meta)) return 'las Místicas solo se juegan desde la mano: una Mística en el campo no responde (§5.3)'
  if (esArcana(meta)) {
    // responder la activa: mismas condiciones que activar_arcana y su coste se debe poder pagar (F5e)
    const motivo = motivoArcanaNoActivable(state, jugador, id)
    if (motivo) return motivo
    return etersParaPagar(state, jugador, meta.id) === null ? 'no puedes pagar su coste' : null
  }
  if (meta.type === 'Campeón' && 'efectos' in meta && meta.efectos?.some((e) => e.tipo === 'disparo')) {
    if (efectosNegados(state, id)) return 'los efectos de esta carta están negados'
    // Un Disparo con éter BLOQUEADO no agota al Campeón (manual §5.2/§8.3a): activar_habilidad lo permite con el
    // Campeón agotado, así que como respuesta también (antes la respuesta exigía Campeón enderezado).
    if (inst.agotado && !meta.efectos.some((e) => e.tipo === 'disparo' && esCostoBloqueo(e.costo))) return 'el Campeón está agotado'
    // Responder con el Disparo lo PAGA (igual que activar_habilidad): si no se puede pagar, no es una respuesta
    const disparo = disparoDeRespuesta(meta)
    if (disparo) {
      if (esCostoBloqueo(disparo.efecto.costo) && inst.opcionUsadaEsteTurno) return 'ya usaste esta habilidad este turno'
      if (eterIdsParaHabilidad(state, jugador, disparo.efecto) === null) return 'no puedes pagar su coste'
    }
    return null
  }
  return 'esta carta no puede responder'
}

/**
 * Cartas YA EN EL CAMPO del jugador que pueden responder en la cadena (9.6 + global), todas por motivoNoResponde:
 * - Arcanas boca abajo que cumplan su condición, no estén en activación diferida (§5.4) y cuyo
 *   coste se pueda pagar (F5e: responder las activa, igual que activar_arcana)
 * - Campeones con efectos[] tipo disparo que no estén agotados
 * Las Místicas NO están aquí: solo se juegan desde la mano (manual §5.3, decisión 2026-10-26); las de la mano
 * son `respuestasDeMano`. Con la pila en Presteza solo responden PRESTEZA o FUGAZ; si el tope es FUGAZ, nadie.
 */
export function respondiblesDe(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  const enCampo = [...p.campo.misticasTacticas, ...p.campo.arcanasCombate, ...p.campo.campeones]
  return enCampo.filter((id): id is string => !!id && motivoNoResponde(state, playerId, id, 'campo') === null)
}

/**
 * Apertura CONDICIONAL de la cadena (C4): se abre SOLO si el primer
 * respondedor tiene cartas respondibles; si no, devuelve false y la
 * sub-máquina de combate continúa su flujo normal. La prioridad inicial es
 * del primer respondedor (defensor tras declarar_ataque y tras declarar_bloqueo, §9.6/F3;
 * en el bloqueo la ventana abre ANTES del daño, F5c).
 */
export function abrirCadena(s: GameState, primerRespondedor: PlayerId): boolean {
  const combate = s.combate
  if (!combate) return false
  // F5b: el gate cuenta también las Místicas Presteza de la mano que el rival PUEDA pagar
  if (respondiblesDe(s, primerRespondedor).length === 0 && respuestasDeMano(s, primerRespondedor).length === 0) return false
  s.cadena = { origen: 'combate', pila: [], prioridad: primerRespondedor, pasesConsecutivos: 0, faseAbierta: s.fase }
  return true
}

/**
 * Místicas con velocidad PRESTEZA o FUGAZ en la MANO de `playerId` — jugables como
 * RESPUESTA (ventana de activación, obs 1874: "Genérico: Presteza desde la
 * mano"). No confundir con respondiblesDe (cartas YA en campo que entran a
 * la pila sin pagar); éstas se juegan PAGANDO y entran directo a la pila.
 * F5f: la velocidad manda — también las FUGAZ y las permanentes (Artefacto) con slot libre;
 * solo cuenta lo jugable de verdad (motivoNoResponde: velocidad vs. tope, Éter para pagar).
 */
export function respuestasDeMano(state: GameState, playerId: PlayerId): string[] {
  return state.players[playerId].mano.filter((id) => motivoNoResponde(state, playerId, id, 'mano') === null)
}

/**
 * Apertura de cadena GLOBAL (fuera de combate): cuando un efecto se activa
 * y el rival podría responder. Se abre en s.cadena con origen 'global'.
 * FUGAZ no abre cadena — se resuelve inmediatamente.
 * `incluirMano` (obs 1874): también cuenta Místicas Presteza EN MANO del
 * rival (ventana de negación de activar_habilidad — jugables como respuesta).
 * Devuelve true si se abrió (rival tiene respondibles), false si no.
 */
export function abrirCadenaGlobal(
  s: GameState,
  jugadorActivo: PlayerId,
  efecto: { cardInstanceId: string; descripcion: string },
  incluirMano = false,
): boolean {
  // FUGAZ: no abre cadena, se resuelve inmediatamente
  const vel = velocidadDe(s, efecto.cardInstanceId)
  if (vel === 'fugaz') return false

  const rival: PlayerId = jugadorActivo === 'A' ? 'B' : 'A'
  // F5e: el gate se mide CON la cadena armada, para que la velocidad de la jugada que abre la
  // ventana cuente (una Presteza solo se responde con Presteza/Fugaz); sin respondedores se descarta
  s.cadena = {
    origen: 'global',
    pila: [],
    prioridad: rival, // el rival responde primero
    pasesConsecutivos: 0,
    faseAbierta: s.fase,
    efectoActual: { jugador: jugadorActivo, ...efecto },
    velocidadActual: vel,
  }
  const conCampo = respondiblesDe(s, rival).length > 0
  const conMano = incluirMano && respuestasDeMano(s, rival).length > 0
  if (!conCampo && !conMano) {
    s.cadena = undefined
    return false
  }
  return true
}

/**
 * Cadena activa (F5a: pila única en `s.cadena`, de combate o global).
 * Punto único de lectura para motor, bot, validActions y UI.
 */
export function cadenaActiva(s: GameState): CadenaState | undefined {
  return s.cadena
}

export function validarResponderCadena(state: GameState, cardInstanceId: string, eterIds?: string[]): string | null {
  const cadena = cadenaActiva(state)
  if (!cadena) return 'no hay cadena abierta'
  // El payload solo es válido para una carta del jugador con prioridad (regla única motivoNoResponde)
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return 'esa carta no puede responder ahora'
  }
  // F5e: una Arcana respondida paga su coste (eterIds; sin ellos el motor elige los de la Reserva)
  const meta = metaDeInstancia(state, cardInstanceId)
  if (meta && esArcana(meta) && eterIds !== undefined && meta.stats.cost > 0) {
    const pago = validarPago(state, cadena.prioridad, eterIds, meta.id)
    if (!pago.ok) return pago.error ?? 'pago inválido'
  }
  // Un Campeón que responde con su Disparo paga lo mismo que activar_habilidad: si indica Éteres, los justos y de su zona
  const disparo = meta?.type === 'Campeón' ? disparoDeRespuesta(meta) : null
  if (disparo && eterIds !== undefined) {
    const esperado = eterIdsParaHabilidad(state, cadena.prioridad, disparo.efecto)
    if (!esperado) return 'no puedes pagar su coste'
    if (eterIds.length !== esperado.length) return `${meta!.name} requiere exactamente ${esperado.length} Éter(es), indicaste ${eterIds.length}`
    const p = state.players[cadena.prioridad]
    const zona = esCostoBloqueo(disparo.efecto.costo) && disparo.efecto.costo?.origen === 'pagado' ? p.eterPagado : p.eterReserva
    if (new Set(eterIds).size !== eterIds.length) return 'éteres repetidos'
    for (const id of eterIds) if (!zona.includes(id)) return `el Éter ${id} no está en la zona de pago`
  }
  return null
}

export function validarPasarPrioridad(state: GameState): string | null {
  if (!cadenaActiva(state)) return 'no hay cadena abierta'
  return null
}

/**
 * Validar jugar_respuesta (obs 1874 — "Genérico: Presteza desde la mano"):
 * Mística con PRESTEZA o FUGAZ en la mano del jugador con PRIORIDAD, en una cadena
 * abierta (F5f: regla única motivoNoResponde). Paga su coste; una carta de un solo uso va
 * mano → pila → Cementerio; una permanente (Artefacto) toma un slot libre al jugarse y se queda.
 */
export function validarJugarRespuesta(state: GameState, cardInstanceId: string, eterIds: string[], bloqueoEterIds?: string[]): string | null {
  const cadena = cadenaActiva(state)
  if (!cadena) return 'no hay cadena abierta'
  const jugador = cadena.prioridad
  const motivo = motivoNoResponde(state, jugador, cardInstanceId, 'mano')
  if (motivo) return motivo
  const meta = getCardMeta(state.instances[cardInstanceId]!.cardId!)!
  if ((meta.stats.cost ?? 0) > 0) {
    const pago = validarPago(state, jugador, eterIds, meta.id)
    if (!pago.ok) return pago.error ?? 'pago inválido'
  }
  return motivoBloqueoAlJugar(state, jugador, meta, eterIds, bloqueoEterIds)
}

/**
 * Ejecutar jugar_respuesta: paga → sale de la mano → ELIGE sus objetivos → PILA (sin slot en
 * campo). F5e: como toda carta con objetivo, la respuesta lo elige AL RESPONDER (estilo
 * Yugioh, decisión 8): si arma elecciones la respuesta queda en declaración
 * (`declaracionEnEleccion` tipo 'respuesta', elector = quien responde) y solo al elegir
 * el último entra a la pila y la prioridad alterna. Resolución en resolverPila (§5.3).
 */
export function ejecutarJugarRespuesta(
  s: GameState,
  cardInstanceId: string,
  eterIds: string[],
  ctx: Ctx,
  bloqueoEterIds?: string[],
): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  const p = s.players[jugador]
  const inst = s.instances[cardInstanceId]
  if (!inst?.cardId) return
  // F5e: el pago dispara al-pagar-eter de inmediato; sus elecciones son de la respuesta (F5d-1)
  const previos = marcarInicioAccion(s)
  const contextoUso: ContextoUso = { tipo: 'jugar', cardInstanceId }
  aplicarPago(s, ctx, jugador, eterIds, inst.cardId, contextoUso)
  const manoIdx = p.mano.indexOf(cardInstanceId)
  if (manoIdx !== -1) p.mano.splice(manoIdx, 1)
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId, zona: 'mano', jugador })
  // F5f: una carta que PERMANECE en mesa (Artefacto, efecto continuo) toma un slot al jugarse, como
  // jugar_mistica (§5.5: no responde el turno que entra); su efecto sigue resolviendo en la pila
  const meta = getCardMeta(inst.cardId)
  if (meta && esPermanenteEnMesa(meta)) {
    const slot = p.campo.misticasTacticas.indexOf(null)
    p.campo.misticasTacticas[slot] = cardInstanceId
    inst.entradaEsteTurno = true
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId, zona: slotAZona('misticasTacticas', slot) ?? '3A', jugador, bocaArriba: true })
    ctx.emit({ type: 'carta_invocada', cardInstanceId, tipo: 'Mística', slot })
    // «Bloquea N Éter» al jugar: ya en mesa, antes de elegir objetivo y entrar a la pila
    aplicarBloqueoAlJugar(s, ctx, jugador, cardInstanceId, bloqueoEterIds)
  }
  declararRespuesta(s, ctx, { jugador, cardInstanceId, origen: 'mano' }, previos)
}

/**
 * Responder con una carta del campo (Táctica/Mística, Arcana, Campeón con Disparo). F5e: la Arcana
 * PAGA su coste al responder (como activar_arcana; `eterIds` o, sin ellos, los de la Reserva) y se
 * revela; la respuesta elige sus objetivos antes de entrar a la pila (declararRespuesta).
 */
export function ejecutarResponderCadena(s: GameState, cardInstanceId: string, ctx: Ctx, eterIds?: string[]): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  const previos = marcarInicioAccion(s)
  const inst = s.instances[cardInstanceId]
  const meta = metaDeInstancia(s, cardInstanceId)
  if (inst && meta && esArcana(meta)) {
    const pagos = eterIds ?? etersParaPagar(s, jugador, meta.id) ?? []
    if (pagos.length > 0) aplicarPago(s, ctx, jugador, pagos, meta.id, { tipo: 'habilidad', cardInstanceId })
  }
  // Al activarse, la Arcana se revela (6.2: la pila es visible a ambos)
  if (meta && esArcana(meta)) {
    inst!.bocaArriba = true
    const slot = s.players[jugador].campo.arcanasCombate.indexOf(cardInstanceId)
    ctx.emit({ type: 'carta_activada', cardInstanceId, jugador, slot })
  }
  // Campeones con efecto disparo se revelan también
  if (meta && meta.type === 'Campeón' && 'efectos' in meta && meta.efectos?.some((e) => e.tipo === 'disparo')) {
    inst!.bocaArriba = true
    // Responder con el Disparo lo PAGA como activar_habilidad (Reserva → 1A y agota, o bloquea Éter): es parte de
    // declarar la respuesta, no de resolverla. Sin eterIds, el motor elige los primeros que sirvan.
    const disparo = disparoDeRespuesta(meta)
    if (disparo) pagarHabilidad(s, ctx, jugador, cardInstanceId, disparo.efecto, eterIds ?? eterIdsParaHabilidad(s, jugador, disparo.efecto) ?? [])
  }
  declararRespuesta(s, ctx, { jugador, cardInstanceId, origen: 'campo' }, previos)
}

/**
 * Pasa la prioridad: pasesConsecutivos++. Con 2 pases seguidos la pila se
 * resuelve en orden inverso (§9.6) y la cadena se cierra.
 */
export function ejecutarPasarPrioridad(s: GameState, ctx: Ctx): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  cadena.pasesConsecutivos++
  ctx.emit({ type: 'prioridad_pasada', jugador })
  if (cadena.pasesConsecutivos >= 2) {
    // Al cerrar la de combate se reanuda la sub-máquina (ataque → bloqueo → daño)
    cerrarCadena(s, ctx)
  } else {
    cadena.prioridad = jugador === 'A' ? 'B' : 'A'
  }
}

/* ──────────────── Respuestas de la pila (F5e) ──────────────── */

/**
 * Efectos de la carta que se resuelven como respuesta, con su índice en efectos[]:
 * los hechizos SIN trigger solo los aportan la Mística jugada desde la mano y la Arcana (la
 * Mística/Táctica del campo ya resolvió los suyos al jugarse); los efectos con trigger
 * 'al_resolver_cadena' (cualquier tipo de carta) los despacha dispararTrigger.
 */
function hechizosDeRespuesta(s: GameState, id: string, origen: RespuestaApilada['origen']) {
  const meta = metaDeInstancia(s, id)
  // Un Campeón que responde aporta su Disparo (ya pagado al responder); Mística/Arcana, sus hechizos
  if (meta && meta.type === 'Campeón' && origen === 'campo') {
    const disparo = disparoDeRespuesta(meta)
    return disparo ? [disparo] : []
  }
  const aportaHechizos = !!meta && (esArcana(meta) || (esMistica(meta) && origen === 'mano'))
  return aportaHechizos ? hechizosDelOpener(s, id).hechizos : []
}

/**
 * Declara una respuesta (F5e): arma las elecciones de objetivo de sus efectos (los hechizos
 * sin trigger y los 'al_resolver_cadena') y, junto con los pendientes que armó el pago, las
 * elige su jugador ANTES de que la respuesta entre a la pila (declararVentana). El efecto
 * NO se ejecuta aquí: resuelve en orden inverso con el objetivo ya fijado.
 */
function declararRespuesta(s: GameState, ctx: Ctx, respuesta: Omit<RespuestaCadena, 'objetivos'>, previos: MarcadorAccion): void {
  const { jugador, cardInstanceId, origen } = respuesta
  const inst = s.instances[cardInstanceId]
  if (inst) {
    // F5f: un ARTEFACTO equipable elige AL RESPONDER a qué Campeón propio se equipa (como toda elección, antes
    // de entrar a la pila; el equipo se asienta al elegir, igual que equipar_artefacto antes de abrir la ventana)
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null
    if (meta && esArtefactoEquipable(meta) && !inst.equipadoA) {
      const opciones = s.players[jugador].campo.campeones.filter((c): c is string => c !== null)
      if (opciones.length > 0) {
        s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId: cardInstanceId, trigger: 'equipar', opciones, equipar: true }]
      }
    }
    // El Disparo de un Campeón ya se pagó al responder: la elección de objetivo no vuelve a exigir el coste
    const costoPagado = meta?.type === 'Campeón'
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, cardInstanceId, origen)) {
      interpretEffect(s, ctx, inst, efecto, { jugador, fromTrigger: true, declararOpener: { efectoIdx }, ...(costoPagado ? { costoPagado } : {}) })
    }
    dispararTrigger(s, ctx, 'al-resolver-cadena', jugador, [cardInstanceId], { declarar: true, cobrarCosto: false })
  }
  declararVentana(s, ctx, { tipo: 'respuesta', jugador, respuesta: { jugador, cardInstanceId, origen } }, previos)
}

/** La respuesta ya eligió todo: entra a la pila (LIFO), la prioridad alterna y los pases se reinician. */
function asentarRespuesta(s: GameState, ctx: Ctx, respuesta: RespuestaCadena, triggers?: readonly TriggerApilado[]): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const { jugador, cardInstanceId, origen, objetivos } = respuesta
  cadena.pila.push(cardInstanceId)
  cadena.respuestas = { ...cadena.respuestas, [cardInstanceId]: { jugador, origen, ...(objetivos ? { objetivos } : {}) } }
  cadena.pasesConsecutivos = 0
  // F5d-2: los triggers que provocó la respuesta quedan encima de ella
  asentarTriggers(s, triggers)
  // Registrar velocidad del último efecto activado
  cadena.velocidadActual = velocidadDe(s, cardInstanceId)
  ctx.emit({ type: 'respuesta_encadenada', jugador, cardInstanceId })
  cadena.prioridad = jugador === 'A' ? 'B' : 'A'
  // FUGAZ (manual §10): se resuelve inmediatamente, sin respuesta del rival. Nadie puede responder a una
  // Fugaz (regla única de velocidad), así que la pila se cierra ya en vez de pedir pases forzados.
  if (cadena.velocidadActual === 'fugaz') cerrarCadena(s, ctx)
}

/** Equipa el ARTEFACTO de una respuesta al Campeón elegido (elegir_objetivo sobre el pendiente `equipar`). */
export function equiparComoRespuesta(s: GameState, ctx: Ctx, pendiente: { instId: string; jugador: PlayerId }, campeonId: string): void {
  const inst = s.instances[pendiente.instId]
  if (!inst || !s.instances[campeonId]) return
  inst.equipadoA = campeonId
  ctx.emit({ type: 'carta_activada', cardInstanceId: pendiente.instId, jugador: pendiente.jugador, slot: -1 })
}

/** Resuelve la pila y cierra la cadena; la de combate reanuda la sub-máquina (ataque → bloqueo → daño). */
function cerrarCadena(s: GameState, ctx: Ctx): void {
  const origen = s.cadena?.origen
  resolverPila(s, ctx)
  if (origen === 'combate' && s.combate) continuarCombateTrasCadena(s, ctx)
}

/**
 * Fizzle de un Artefacto sin receptor (F5g): su efecto se pierde. Si la carta sigue en un slot de mesa
 * (el Campeón se fue sin pasar por liberarArtefactosEquipados) va al Cementerio como cualquier carta que sale.
 */
function sinReceptor(s: GameState, ctx: Ctx, id: string): void {
  const inst = s.instances[id]
  if (!inst) return
  for (const grupo of ['misticasTacticas', 'arcanasCombate'] as const) {
    const idx = s.players[inst.owner].campo[grupo].indexOf(id)
    if (idx === -1) continue
    ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona: slotAZona(grupo, idx) ?? '3A', jugador: inst.owner })
    enviarAlCementerio(s, ctx, id)
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
    return
  }
}

/**
 * Resuelve UNA respuesta de la pila (F5e, compartido por la cadena global y la de combate),
 * con los objetivos que eligió al responder:
 * - Mística desde la MANO: hechizos + trigger al-resolver-cadena + Cementerio (un solo uso, §5.3).
 * - Arcana: hechizos + 2G (libera el slot 3D-3F) + trigger.
 * - Táctica/Mística en campo y Campeón con Disparo: solo el trigger; la carta PERMANECE.
 * Un objetivo que ya no es válido hace que ese efecto se pierda (no arma elecciones nuevas).
 */
function resolverRespuesta(s: GameState, ctx: Ctx, id: string, datos: RespuestaApilada | undefined): void {
  const inst = s.instances[id]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (!inst || !meta) return
  const p = s.players[inst.owner]
  // F5g: un ARTEFACTO que ya no tiene Campeón al que equiparse (se fue antes de resolver) pierde su efecto;
  // si seguía en mesa va al Cementerio. El Éter pagado se queda donde está (zona de pago).
  if (esArtefactoEquipable(meta) && !inst.equipadoA) {
    sinReceptor(s, ctx, id)
    return
  }
  const enCampo =
    p.campo.campeones.includes(id) || p.campo.misticasTacticas.includes(id) || p.campo.arcanasCombate.includes(id)
  // Sin datos (estado armado a mano) el origen se infiere de la zona de la carta
  const origen = datos?.origen ?? (enCampo ? 'campo' : 'mano')
  const objetivos = datos?.objetivos
  const jugador = datos?.jugador ?? inst.owner
  const opciones = { jugador, fromTrigger: true, sinEleccion: true, revalidarObjetivo: true } as const
  const hechizos = () => {
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, id, origen)) {
      const objetivoId = objetivos?.[efectoIdx]
      interpretEffect(s, ctx, inst, efecto, { ...opciones, contextoUso: objetivoId ? 'objetivo-elegido' : undefined, objetivoId })
    }
  }
  const trigger = () => dispararTrigger(s, ctx, 'al-resolver-cadena', jugador, [id], { sinEleccion: true, revalidarObjetivo: true, objetivosElegidos: objetivos })

  if (esMistica(meta) && origen === 'mano') {
    hechizos()
    trigger()
    if (esPermanenteEnMesa(meta)) return // F5f: Artefacto / efecto continuo: ya tomó su slot al jugarse y permanece
    if (p.exilio.includes(id)) return // su propio efecto la exilió («va al Exilio», §5.3): no pasa por el Cementerio
    enviarAlCementerio(s, ctx, id)
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
    return
  }
  if (esArcana(meta)) {
    hechizos()
    if (esPermanenteEnMesa(meta)) {
      // F5f: Arcana Artefacto / de efecto continuo (p. ej. con Presteza): permanece equipada en su slot
      trigger()
      return
    }
    // Arcana se consume: → 2G (guard: si ya salió del campo — fix A4 — no
    // se duplica el envío ni el trigger al-ser-enviado-al-cementerio)
    const idx = p.campo.arcanasCombate.indexOf(id)
    if (idx !== -1) {
      const zona = slotAZona('arcanasCombate', idx) ?? '3D'
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
      // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
    }
    trigger()
    return
  }
  // Campeón que respondió con su Disparo (§9.6): el coste ya se pagó al responder; aquí resuelve su efecto con el
  // objetivo elegido. Si salió del campo antes de resolver, o sus efectos quedaron negados, el efecto se pierde.
  if (meta.type === 'Campeón' && enCampo && !efectosNegados(s, id)) {
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, id, origen)) {
      const objetivoId = objetivos?.[efectoIdx]
      interpretEffect(s, ctx, inst, efecto, { ...opciones, costoPagado: true, contextoUso: objetivoId ? 'objetivo-elegido' : undefined, objetivoId })
    }
  }
  // Táctica / Mística en campo / Campeón Disparo: permanece, solo dispara el trigger
  trigger()
}

/**
 * Resolución de la pila en ORDEN INVERSO (§9.6), ÚNICA para la cadena global y la de combate
 * (F5e: antes la de combate solo trataba Arcanas y perdía las Presteza jugadas de la mano):
 * cada respuesta con resolverRespuesta y, al FONDO, el opener (obs 1874/F5b: Mística, Arcana
 * o habilidad), que resuelve ÚLTIMO salvo que una negación (tipoNegacion 'activacion') lo
 * haya cancelado (el pago NO se devuelve). Cierra la cadena; el llamador reanuda el combate.
 */
function resolverPila(s: GameState, ctx: Ctx): void {
  const cadena = s.cadena
  if (!cadena) return
  // F5d-2: orden = respuestas en reversa con los triggers apilados debajo de ellas (ordenResolucion), luego el
  // opener. Mientras resuelve, un trigger de acción nuevo no abre ventana (profundidadTriggers, decisión g).
  enResolucion(s, () => {
    // F9d: `pasoResolviendo` = posición del paso en curso (transitorio, dentro de esta acción): `redirect` lo usa para
    // hallar la entrada inmediatamente inferior. Al terminar los pasos se queda en `length` (el opener no tiene pasos debajo).
    const pasos = ordenResolucion(cadena)
    for (const [i, paso] of pasos.entries()) {
      s.pasoResolviendo = i
      if ('trigger' in paso) {
        resolverTrigger(s, ctx, paso.trigger) // no negable: negar/Marcha solo alcanza al opener
        continue
      }
      const id = paso.respuesta
      // una respuesta que salió de la pila a media resolución (p. ej. Artefacto al Cementerio) ya no resuelve
      if (!cadena.pila.includes(id)) continue
      resolverRespuesta(s, ctx, id, cadena.respuestas?.[id])
    }
    s.pasoResolviendo = pasos.length
    if (cadena.opener) resolverOpener(s, ctx, cadena.opener)
  })
  delete s.pasoResolviendo
  s.cadena = undefined
}

/* ──────────────── Opener de la pila (F5b) ──────────────── */

/** Hechizos del opener sin trigger (se resuelven al jugar/activar), con su índice en efectos[]. */
function hechizosDelOpener(s: GameState, cardInstanceId: string) {
  const inst = s.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  const res: { efecto: EfectoData; efectoIdx: number }[] = []
  if (!inst || !meta || !('efectos' in meta) || !meta.efectos) return { inst, meta, hechizos: res }
  meta.efectos.forEach((efecto, efectoIdx) => {
    if (efecto.tipo === 'hechizo' && !efecto.trigger && efecto.efecto) res.push({ efecto, efectoIdx })
  })
  return { inst, meta, hechizos: res }
}

/* ──────────── Declaración en elección (F5d-1, estilo Yugioh) ────────────
 * Toda acción de jugador con objetivo específico elige SUS objetivos al
 * declararse, ANTES de abrir la ventana de respuesta. Cada ejecutor toma un
 * marcador al INICIO de la acción (`marcarInicioAccion`); al terminar de
 * disparar triggers/pagos/sacrificios, los pendientes que no estaban en el
 * marcador nacieron de ella: pasan al FRENTE y se cuentan (la cola acumula
 * pendientes obsoletos que nadie elige; esos NO se esperan). Si hay
 * alguno, la ventana espera (`s.declaracionEnEleccion`) y se abre al elegir el
 * último; si no, se abre de inmediato (flujo idéntico al de siempre). */

/** Pendientes de la cola al inicio de una acción: lo que aparezca después nació de ella. */
export type MarcadorAccion = ReadonlySet<object>

export function marcarInicioAccion(s: GameState): MarcadorAccion {
  return new Set<object>(s.objetivosPendientes ?? [])
}

/** Mueve al frente (en orden de creación) los pendientes posteriores al marcador y devuelve cuántos son. */
function reclamarPendientes(s: GameState, previos: MarcadorAccion): number {
  const cola = s.objetivosPendientes ?? []
  const nuevos = cola.filter((pp) => !previos.has(pp))
  if (nuevos.length === 0) return 0
  s.objetivosPendientes = [...nuevos, ...cola.filter((pp) => previos.has(pp))]
  return nuevos.length
}

/**
 * Declara la ventana de una acción: si la acción armó elecciones (`previos`)
 * la apertura queda diferida a la última; si no, abre ya (gate incluido).
 */
export function declararVentana(s: GameState, ctx: Ctx, declaracion: Omit<DeclaracionCadena, 'pendientes'>, previos: MarcadorAccion): void {
  const pendientes = reclamarPendientes(s, previos)
  if (pendientes > 0) {
    s.declaracionEnEleccion = { ...declaracion, pendientes }
    return
  }
  abrirVentana(s, ctx, declaracion)
}

/**
 * Tras una elegir_objetivo con declaración en elección: las consecuencias de la
 * elección (triggers que arman más pendientes) también son de la declaración;
 * al elegir el último se abre la ventana.
 */
export function continuarDeclaracion(s: GameState, ctx: Ctx, previos: MarcadorAccion): void {
  const declaracion = s.declaracionEnEleccion
  if (!declaracion) return
  // la elección consumió el frente (-1) y pudo armar más (+n)
  declaracion.pendientes += reclamarPendientes(s, previos) - 1
  if (declaracion.pendientes > 0) return
  delete s.declaracionEnEleccion
  if (s.fase === 'terminada') return // la partida acabó durante la elección: no hay ventana
  abrirVentana(s, ctx, declaracion)
}

/** Abre la ventana que corresponde al tipo de declaración (gate: solo si el rival puede responder). */
function abrirVentana(s: GameState, ctx: Ctx, declaracion: Omit<DeclaracionCadena, 'pendientes'>): void {
  // F5d-2: los triggers que provocó la acción (con su objetivo ya elegido) entran a la cadena si la ventana
  // se abre; si nadie puede responder resuelven YA, antes de la jugada que los provocó (están encima de ella)
  const triggers = declaracion.triggers
  if (declaracion.tipo === 'opener') {
    abrirOpener(s, ctx, declaracion.opener!, triggers)
  } else if (declaracion.tipo === 'ataque') {
    if (triggers && triggers.length > 0 && s.combate) {
      if (abrirCadena(s, rivalDe(s))) {
        asentarTriggers(s, triggers)
        return
      }
      resolverTriggersInmediatos(s, ctx, triggers)
    }
    abrirVentanaAtaque(s, ctx)
  } else if (declaracion.tipo === 'respuesta') {
    // F5e: la cadena ya está abierta; la respuesta entra a la pila con sus objetivos fijados
    asentarRespuesta(s, ctx, declaracion.respuesta!, triggers)
  } else if (declaracion.tipo === 'triggers') {
    abrirVentanaTriggers(s, ctx, declaracion)
  } else {
    const id = declaracion.cardInstanceId!
    const cardId = s.instances[id]?.cardId
    // incluirMano: la invocación cuenta Presteza de mano pagable, igual que el opener (F5b)
    if (abrirCadenaGlobal(s, declaracion.jugador, { cardInstanceId: id, descripcion: (cardId ? getCardMeta(cardId)?.name : null) ?? id }, true)) {
      asentarTriggers(s, triggers)
    } else {
      resolverTriggersInmediatos(s, ctx, triggers)
    }
  }
}

/**
 * Declara un opener (jugar Mística, activar Arcana, activar habilidad). El
 * costo y el estado "ya aplicado" ya ocurrieron; aquí solo se prepara el EFECTO
 * diferido: los hechizos que requieren elección arman `objetivosPendientes`
 * (marcados con `opener`) y, junto con los pendientes de la acción (`previos`),
 * se eligen ANTES de abrir la ventana (declararVentana). La habilidad ya trae su
 * objetivo en la acción (`opener.objetivos`).
 */
export function declararOpener(
  s: GameState,
  ctx: Ctx,
  opener: OpenerCadena,
  previos: MarcadorAccion = marcarInicioAccion(s),
  triggers?: readonly TriggerApilado[],
): void {
  if (opener.tipo !== 'habilidad') {
    const { inst, hechizos } = hechizosDelOpener(s, opener.cardInstanceId)
    if (inst) {
      for (const { efecto, efectoIdx } of hechizos) {
        interpretEffect(s, ctx, inst, efecto, { jugador: opener.jugador, fromTrigger: true, declararOpener: { efectoIdx } })
      }
    }
  }
  // F5d-2: los triggers que provocó la jugada eligen sus objetivos junto con los del opener (los suyos primero)
  // y entran a la cadena encima de él. Sin triggers el flujo es idéntico al de siempre.
  const apilados = triggers && triggers.length > 0 ? armarTriggers(s, ctx, triggers) : undefined
  declararVentana(s, ctx, { tipo: 'opener', jugador: opener.jugador, opener, ...(apilados && apilados.length > 0 ? { triggers: apilados } : {}) }, previos)
}

/**
 * Captura el objetivo elegido de un efecto de la declaración (elegir_objetivo sobre un
 * pendiente con `opener`: hechizo del opener, F5b, o efecto de una respuesta, F5e). Un
 * objetivo que ya no existe se descarta (el efecto se pierde al resolver). La ventana
 * (o la entrada a la pila) la abre continuarDeclaracion.
 */
export function registrarObjetivoOpener(
  s: GameState,
  pendiente: { instId?: string; opener?: { efectoIdx: number } },
  objetivoId: string,
): void {
  // F5d-2: el pendiente puede ser de un trigger apilado de la declaración (se identifica por carta + efectoIdx)
  if (registrarObjetivoTrigger(s, pendiente, objetivoId)) return
  const destino = s.declaracionEnEleccion?.opener ?? s.declaracionEnEleccion?.respuesta
  if (!destino || !pendiente.opener) return
  if (s.instances[objetivoId]) destino.objetivos = { ...destino.objetivos, [pendiente.opener.efectoIdx]: objetivoId }
}

/** Abre la ventana con el opener al fondo (gate con mano Presteza pagable) o, si nadie puede responder, resuelve ya. */
function abrirOpener(s: GameState, ctx: Ctx, opener: OpenerCadena, triggers?: readonly TriggerApilado[]): void {
  const meta = s.instances[opener.cardInstanceId]?.cardId ? getCardMeta(s.instances[opener.cardInstanceId]!.cardId!) : null
  const abierto = abrirCadenaGlobal(
    s,
    opener.jugador,
    { cardInstanceId: opener.cardInstanceId, descripcion: meta?.name ?? opener.cardInstanceId },
    true, // incluirMano: Místicas Presteza pagables del rival en mano también cuentan
  )
  if (abierto && s.cadena) {
    s.cadena.opener = opener
    asentarTriggers(s, triggers) // F5d-2: encima del opener, debajo de las respuestas que lleguen
    return
  }
  // sin ventana: los triggers (encima de la jugada) resuelven antes que ella
  resolverTriggersInmediatos(s, ctx, triggers)
  resolverOpener(s, ctx, opener)
}

/**
 * Resuelve el opener (al cierre de la ventana o de inmediato si no se abrió).
 * Si una negación lo canceló, no hay efecto (el pago se mantiene). Después, la
 * Mística/Arcana de UN SOLO USO va al Cementerio y libera su slot (§5.3/§5.4);
 * el EFECTO CONTINUO y los ARTEFACTOS permanecen (esPermanenteEnMesa).
 */
function resolverOpener(s: GameState, ctx: Ctx, opener: OpenerCadena): void {
  const inst = s.instances[opener.cardInstanceId]
  const meta = metaDeInstancia(s, opener.cardInstanceId) // una habilidad copiada también se resuelve desde aquí
  if (!inst || !meta) return
  // F5g: el opener Artefacto cuyo Campeón desapareció antes de resolver pierde su efecto (la carta ya salió)
  const sinReceptorOpener = opener.tipo !== 'habilidad' && esArtefactoEquipable(meta) && !inst.equipadoA
  if (sinReceptorOpener) {
    sinReceptor(s, ctx, opener.cardInstanceId)
    return
  }
  // Una habilidad ya declarada cuya carta vio negados sus efectos antes de resolver tampoco resuelve (el pago se mantiene)
  const habilidadNegada = opener.tipo === 'habilidad' && efectosNegados(s, opener.cardInstanceId)
  if (!opener.negada && !habilidadNegada) {
    if (opener.tipo === 'habilidad') {
      const efecto = 'efectos' in meta ? meta.efectos?.[opener.efectoIdx ?? -1] : undefined
      const objetivoId = opener.objetivos?.[opener.efectoIdx ?? -1]
      if (efecto) {
        interpretEffect(s, ctx, inst, efecto, {
          jugador: opener.jugador,
          contextoUso: objetivoId ? 'objetivo-elegido' : undefined,
          objetivoId,
          costoPagado: true, // activar_habilidad ya cobró el coste (Reserva → 1A / bloqueado): no se vuelve a exigir
        })
      }
    } else {
      for (const { efecto, efectoIdx } of hechizosDelOpener(s, opener.cardInstanceId).hechizos) {
        const objetivoId = opener.objetivos?.[efectoIdx]
        interpretEffect(s, ctx, inst, efecto, {
          jugador: opener.jugador,
          fromTrigger: true,
          contextoUso: objetivoId ? 'objetivo-elegido' : undefined,
          objetivoId,
        })
      }
    }
  }
  if (opener.tipo === 'habilidad' || esPermanenteEnMesa(meta)) return
  const slots = opener.tipo === 'mistica' ? s.players[opener.jugador].campo.misticasTacticas : s.players[opener.jugador].campo.arcanasCombate
  const slotIdx = slots.indexOf(opener.cardInstanceId)
  if (slotIdx === -1) return
  const zonaSlot = slotAZona(opener.tipo === 'mistica' ? 'misticasTacticas' : 'arcanasCombate', slotIdx) ?? (opener.tipo === 'mistica' ? '3A' : '3D')
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: opener.cardInstanceId, zona: zonaSlot, jugador: opener.jugador })
  enviarAlCementerio(s, ctx, opener.cardInstanceId)
  ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: opener.cardInstanceId, zona: '2G', jugador: opener.jugador, bocaArriba: true })
}
