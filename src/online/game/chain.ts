/**
 * Cadena de efectos en combate (9.6, ADR-12).
 *
 * Mecanismo (sin efectos de cartas — esos son game-handlers, change 3):
 * - `abrirCadena(s, primerRespondedor)`: apertura CONDICIONAL — solo si el
 *   jugador tiene cartas respondibles (Táctica colocada en turnos ANTERIORES,
 *   Combate, Arcana colocada en turnos ANTERIORES; NO Místicas, NO Arcana
 *   recién colocada §5.5 → flag `entradaEsteTurno`).
 * - Pila + prioridad + pasesConsecutivos: con 2 pases seguidos la pila se
 *   resuelve en ORDEN INVERSO (§9.6): la última activación primero.
 * - Resolución (F5e, `resolverPila`, ÚNICA para global y combate): Mística jugada
 *   desde la mano → Cementerio; Arcana → 2G liberando el slot (se consumen); la
 *   Táctica y el Campeón con Disparo PERMANECEN en mesa. Cada respuesta eligió sus
 *   objetivos AL RESPONDER (`declararRespuesta`). Al cerrar la de combate,
 *   `continuarCombateTrasCadena` reanuda la sub-máquina de combate.
 *
 * 0 extracciones RNG (contrato 89 intacto). CICLO de import deliberado con
 * combat.ts: ambos módulos se usan mutuamente SOLO en runtime (ESM, seguro).
 */
import { esArcana, esMistica, esPermanenteEnMesa, getCardMeta } from './cards'
import { abrirVentanaAtaque, continuarCombateTrasCadena } from './combat'
import { dispararTrigger, velocidadDe } from './efectos'
import { interpretEffect } from './effectInterpreter'
import { aplicarPago, etersParaPagar, validarPago, type ContextoUso } from './payments'
import { enviarAlCementerio } from './replacements'
import type { AnyCard, EfectoData } from '../../shared/types'
import type {
  Ctx, CadenaState, DeclaracionCadena, GameState, OpenerCadena, PlayerId, RespuestaApilada, RespuestaCadena,
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

/**
 * ¿La Arcana de `playerId` puede activarse AHORA como respuesta? Su coste se puede pagar con la
 * Reserva (como activar_arcana, F5e). NO revisa `condicion` (§5.4): su trigger describe cuándo
 * se activa (inicio_alba...) y responder nunca la exigió; queda como duda de diseño. Las Arcanas
 * que permanecen en mesa (Artefacto, Éter bloqueado) no son respuestas de un solo uso.
 */
function arcanaActivableComoRespuesta(state: GameState, playerId: PlayerId, meta: AnyCard): boolean {
  if (esPermanenteEnMesa(meta)) return false
  return etersParaPagar(state, playerId, meta.id) !== null
}

/**
 * Cartas del jugador que pueden responder en la cadena (9.6 + global):
 * - Místicas que NO estén en activación diferida (§5.5)
 * - Arcanas boca abajo que NO estén en activación diferida (§5.5) y cuyo coste
 *   se pueda pagar (F5e: responder las activa, igual que activar_arcana)
 * - Campeones con efectos[] tipo disparo que no estén agotados
 *
 * Filtro de velocidad: si el último efecto en la pila es PRESTEZA,
 * solo responden PRESTEZA o FUGAZ. Si es FUGAZ, nadie responde.
 */
export function respondiblesDe(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  // Cartas que ya están en la pila de la cadena (no pueden responder dos veces)
  const cadena = cadenaActiva(state)
  const enPila = new Set(cadena?.pila ?? [])
  // F5b: el opener (fondo de la pila) no se responde a sí mismo
  if (cadena?.opener) enPila.add(cadena.opener.cardInstanceId)

  const velocidadRequerida = velocidadRequeridaDe(state)
  if (velocidadRequerida === 'fugaz') return [] // FUGAZ: nadie responde

  const res: string[] = []
  for (const id of p.campo.misticasTacticas) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && esMistica(meta) && !inst.entradaEsteTurno) {
      const vel = velocidadDe(state, id)
      if (puedeResponder(vel, velocidadRequerida)) res.push(id)
    }
  }
  for (const id of p.campo.arcanasCombate) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    if (esArcana(meta) && !inst.entradaEsteTurno && !inst.bocaArriba && arcanaActivableComoRespuesta(state, playerId, meta)) {
      const vel = velocidadDe(state, id)
      if (puedeResponder(vel, velocidadRequerida)) res.push(id)
    }
  }
  // Campeones con efecto Disparo (no agotados)
  for (const id of p.campo.campeones) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    if (inst?.agotado) continue
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && meta.type === 'Campeón' && 'efectos' in meta && meta.efectos?.some((e) => e.tipo === 'disparo')) {
      const vel = velocidadDe(state, id)
      if (puedeResponder(vel, velocidadRequerida)) res.push(id)
    }
  }
  return res
}

/** Determina si una carta con velocidad `vel` puede responder a una cadena con velocidad `requerida`. */
function puedeResponder(vel: Velocidad, requerida: Velocidad): boolean {
  if (requerida === 'fugaz') return false // FUGAZ: nadie responde
  if (requerida === 'presteza') return vel === 'presteza' || vel === 'fugaz' // Solo PRESTEZA/FUGAZ
  return true // normal: cualquier velocidad responde
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
 * Místicas con keyword PRESTEZA en la MANO de `playerId` — jugables como
 * RESPUESTA (ventana de activación, obs 1874: "Genérico: Presteza desde la
 * mano"). No confundir con respondiblesDe (cartas YA en campo que entran a
 * la pila sin pagar); éstas se juegan PAGANDO y entran directo a la pila.
 */
export function respuestasDeMano(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  const res: string[] = []
  // F5e: la Presteza de la mano también respeta la velocidad: no responde a una FUGAZ
  if (!puedeResponder('presteza', velocidadRequeridaDe(state))) return res
  for (const id of p.mano) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && esMistica(meta) && 'keywords' in meta && meta.keywords?.includes('Presteza')) {
      // F5b: solo cuenta lo jugable de verdad — sin permanentes (validarJugarRespuesta
      // las rechaza) y con Éter suficiente para pagarla (gate de apertura + UI).
      if (esPermanenteEnMesa(meta)) continue
      if (etersParaPagar(state, playerId, meta.id) === null) continue
      res.push(id)
    }
  }
  return res
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
  // El payload solo es válido para una carta del jugador con prioridad
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return 'esa carta no puede responder ahora'
  }
  // F5e: una Arcana respondida paga su coste (eterIds; sin ellos el motor elige los de la Reserva)
  const inst = state.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (meta && esArcana(meta) && eterIds !== undefined && meta.stats.cost > 0) {
    const pago = validarPago(state, cadena.prioridad, eterIds, meta.id)
    if (!pago.ok) return pago.error ?? 'pago inválido'
  }
  return null
}

export function validarPasarPrioridad(state: GameState): string | null {
  if (!cadenaActiva(state)) return 'no hay cadena abierta'
  return null
}

/**
 * Validar jugar_respuesta (obs 1874 — "Genérico: Presteza desde la mano"):
 * Mística con PRESTEZA en la mano del jugador con PRIORIDAD, en una cadena
 * abierta. Paga su coste; NO necesita slot (mano → pila → resolución →
 * Cementerio si es de un solo uso). Rechaza permanentes (sin flujo de slot).
 */
export function validarJugarRespuesta(state: GameState, cardInstanceId: string, eterIds: string[]): string | null {
  const cadena = cadenaActiva(state)
  if (!cadena) return 'no hay cadena abierta'
  const jugador = cadena.prioridad
  const p = state.players[jugador]
  if (!p.mano.includes(cardInstanceId)) return 'la carta no está en tu mano'
  const inst = state.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (!meta || !esMistica(meta)) return 'no es una Mística'
  if (!('keywords' in meta) || !meta.keywords?.includes('Presteza')) {
    return 'solo cartas con PRESTEZA juegan desde la mano como respuesta'
  }
  if (esPermanenteEnMesa(meta)) {
    return 'esta carta permanece en mesa: no puede jugarse como respuesta'
  }
  if (!puedeResponder('presteza', velocidadRequeridaDe(state))) return 'una jugada FUGAZ no se puede responder'
  if ((meta.stats.cost ?? 0) > 0) {
    const pago = validarPago(state, jugador, eterIds, meta.id)
    if (!pago.ok) return pago.error ?? 'pago inválido'
  }
  return null
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
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
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
    resolverPila(s, ctx)
    // Al cerrar la de combate se reanuda la sub-máquina (ataque → bloqueo → daño)
    if (cadena.origen === 'combate' && s.combate) continuarCombateTrasCadena(s, ctx)
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
  const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id]!.cardId!) : null
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
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, cardInstanceId, origen)) {
      interpretEffect(s, ctx, inst, efecto, { jugador, fromTrigger: true, declararOpener: { efectoIdx } })
    }
    dispararTrigger(s, ctx, 'al-resolver-cadena', jugador, [cardInstanceId], { declarar: true, cobrarCosto: false })
  }
  declararVentana(s, ctx, { tipo: 'respuesta', jugador, respuesta: { jugador, cardInstanceId, origen } }, previos)
}

/** La respuesta ya eligió todo: entra a la pila (LIFO), la prioridad alterna y los pases se reinician. */
function asentarRespuesta(s: GameState, ctx: Ctx, respuesta: RespuestaCadena): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const { jugador, cardInstanceId, origen, objetivos } = respuesta
  cadena.pila.push(cardInstanceId)
  cadena.respuestas = { ...cadena.respuestas, [cardInstanceId]: { jugador, origen, ...(objetivos ? { objetivos } : {}) } }
  cadena.pasesConsecutivos = 0
  // Registrar velocidad del último efecto activado
  cadena.velocidadActual = velocidadDe(s, cardInstanceId)
  ctx.emit({ type: 'respuesta_encadenada', jugador, cardInstanceId })
  cadena.prioridad = jugador === 'A' ? 'B' : 'A'
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
    enviarAlCementerio(s, ctx, id)
    ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
    return
  }
  if (esArcana(meta)) {
    hechizos()
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
  for (const id of [...cadena.pila].reverse()) resolverRespuesta(s, ctx, id, cadena.respuestas?.[id])
  if (cadena.opener) resolverOpener(s, ctx, cadena.opener)
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
  if (declaracion.tipo === 'opener') {
    abrirOpener(s, ctx, declaracion.opener!)
  } else if (declaracion.tipo === 'ataque') {
    abrirVentanaAtaque(s, ctx)
  } else if (declaracion.tipo === 'respuesta') {
    // F5e: la cadena ya está abierta; la respuesta entra a la pila con sus objetivos fijados
    asentarRespuesta(s, ctx, declaracion.respuesta!)
  } else {
    const id = declaracion.cardInstanceId!
    const cardId = s.instances[id]?.cardId
    // incluirMano: la invocación cuenta Presteza de mano pagable, igual que el opener (F5b)
    abrirCadenaGlobal(s, declaracion.jugador, { cardInstanceId: id, descripcion: (cardId ? getCardMeta(cardId)?.name : null) ?? id }, true)
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
export function declararOpener(s: GameState, ctx: Ctx, opener: OpenerCadena, previos: MarcadorAccion = marcarInicioAccion(s)): void {
  if (opener.tipo !== 'habilidad') {
    const { inst, hechizos } = hechizosDelOpener(s, opener.cardInstanceId)
    if (inst) {
      for (const { efecto, efectoIdx } of hechizos) {
        interpretEffect(s, ctx, inst, efecto, { jugador: opener.jugador, fromTrigger: true, declararOpener: { efectoIdx } })
      }
    }
  }
  declararVentana(s, ctx, { tipo: 'opener', jugador: opener.jugador, opener }, previos)
}

/**
 * Captura el objetivo elegido de un efecto de la declaración (elegir_objetivo sobre un
 * pendiente con `opener`: hechizo del opener, F5b, o efecto de una respuesta, F5e). Un
 * objetivo que ya no existe se descarta (el efecto se pierde al resolver). La ventana
 * (o la entrada a la pila) la abre continuarDeclaracion.
 */
export function registrarObjetivoOpener(
  s: GameState,
  pendiente: { opener?: { efectoIdx: number } },
  objetivoId: string,
): void {
  const destino = s.declaracionEnEleccion?.opener ?? s.declaracionEnEleccion?.respuesta
  if (!destino || !pendiente.opener) return
  if (s.instances[objetivoId]) destino.objetivos = { ...destino.objetivos, [pendiente.opener.efectoIdx]: objetivoId }
}

/** Abre la ventana con el opener al fondo (gate con mano Presteza pagable) o, si nadie puede responder, resuelve ya. */
function abrirOpener(s: GameState, ctx: Ctx, opener: OpenerCadena): void {
  const meta = s.instances[opener.cardInstanceId]?.cardId ? getCardMeta(s.instances[opener.cardInstanceId]!.cardId!) : null
  const abierto = abrirCadenaGlobal(
    s,
    opener.jugador,
    { cardInstanceId: opener.cardInstanceId, descripcion: meta?.name ?? opener.cardInstanceId },
    true, // incluirMano: Místicas Presteza pagables del rival en mano también cuentan
  )
  if (abierto && s.cadena) {
    s.cadena.opener = opener
    return
  }
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
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (!inst || !meta) return
  if (!opener.negada) {
    if (opener.tipo === 'habilidad') {
      const efecto = 'efectos' in meta ? meta.efectos?.[opener.efectoIdx ?? -1] : undefined
      const objetivoId = opener.objetivos?.[opener.efectoIdx ?? -1]
      if (efecto) {
        interpretEffect(s, ctx, inst, efecto, {
          jugador: opener.jugador,
          contextoUso: objetivoId ? 'objetivo-elegido' : undefined,
          objetivoId,
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
