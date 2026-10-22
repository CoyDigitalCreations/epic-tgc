/**
 * Cadena de efectos en combate (9.6, ADR-12).
 *
 * Mecanismo (sin efectos de cartas — esos son game-handlers, change 3):
 * - `abrirCadena(s, primerRespondedor)`: apertura CONDICIONAL — solo si el
 *   jugador tiene cartas respondibles (Táctica colocada en turnos ANTERIORES,
 *   Combate, Arcana colocada en turnos ANTERIORES; NO Místicas, NO Arcana
 *   recién colocada §5.5 → flag `entradaEsteTurno`).
 * - Pila + prioridad + pasesConsecutivos: con 2 pases seguidos la pila se
 *   resuelve en ORDEN INVERSO (L1183): la última activación primero.
 * - Resolución: Combate/Arcana → 2G liberando el slot (se consumen); la
 *   Táctica PERMANECE en mesa (solo sus efectos se resolverían — change 3).
 *   Al cerrar, `continuarCombateTrasCadena` reanuda la sub-máquina de combate.
 *
 * 0 extracciones RNG (contrato 89 intacto). CICLO de import deliberado con
 * combat.ts: ambos módulos se usan mutuamente SOLO en runtime (ESM, seguro).
 */
import { esArcana, esMistica, esPermanenteEnMesa, getCardMeta } from './cards'
import { continuarCombateTrasCadena } from './combat'
import { dispararTrigger, velocidadDe } from './efectos'
import { interpretEffect } from './effectInterpreter'
import { aplicarPago, validarPago, type ContextoUso } from './payments'
import { enviarAlCementerio } from './replacements'
import type { Ctx, CadenaState, GameState, PlayerId } from './types'
import { slotAZona } from './zones'

/**
 * Cartas del jugador que pueden responder en la cadena (9.6 + global):
 * - Místicas que NO estén en activación diferida (§5.5)
 * - Arcanas que NO estén en activación diferida (§5.5)
 * - Campeones con efectos[] tipo disparo que no estén agotados
 *
 * Filtro de velocidad: si el último efecto en la pila es PRESTEZA,
 * solo responden PRESTEZA o FUGAZ. Si es FUGAZ, nadie responde.
 */
export function respondiblesDe(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  // Cartas que ya están en la pila de la cadena (no pueden responder dos veces)
  const cadena = state.combate?.cadena ?? state.cadena
  const enPila = new Set(cadena?.pila ?? [])

  // Determinar velocidad requerida basada en el último efecto de la pila
  let velocidadRequerida: 'normal' | 'presteza' | 'fugaz' = 'normal'
  if (cadena && cadena.pila.length > 0) {
    const ultimoId = cadena.pila[cadena.pila.length - 1]
    const velUltimo = velocidadDe(state, ultimoId)
    if (velUltimo === 'fugaz') return [] // FUGAZ: nadie resuelve
    if (velUltimo === 'presteza') velocidadRequerida = 'presteza' // Solo PRESTEZA/FUGAZ responden
  }

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
    if (esArcana(meta) && !inst.entradaEsteTurno) {
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
function puedeResponder(vel: 'normal' | 'presteza' | 'fugaz', requerida: 'normal' | 'presteza' | 'fugaz'): boolean {
  if (requerida === 'fugaz') return false // FUGAZ: nadie responde
  if (requerida === 'presteza') return vel === 'presteza' || vel === 'fugaz' // Solo PRESTEZA/FUGAZ
  return true // normal: cualquier velocidad responde
}

/**
 * Apertura CONDICIONAL de la cadena (C4): se abre SOLO si el primer
 * respondedor tiene cartas respondibles; si no, devuelve false y la
 * sub-máquina de combate continúa su flujo normal. La prioridad inicial es
 * del primer respondedor (defensor tras declarar_ataque L1181, atacante tras
 * declarar_bloqueo L1182).
 */
export function abrirCadena(s: GameState, primerRespondedor: PlayerId): boolean {
  const combate = s.combate
  if (!combate) return false
  if (respondiblesDe(s, primerRespondedor).length === 0) return false
  combate.cadena = { pila: [], prioridad: primerRespondedor, pasesConsecutivos: 0, faseAbierta: s.fase }
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
  for (const id of p.mano) {
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && esMistica(meta) && 'keywords' in meta && meta.keywords?.includes('Presteza')) {
      res.push(id)
    }
  }
  return res
}

/**
 * Apertura de cadena GLOBAL (fuera de combate): cuando un efecto se activa
 * y el rival podría responder. Se abre en s.cadena (no en combate.cadena).
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
  const conCampo = respondiblesDe(s, rival).length > 0
  const conMano = incluirMano && respuestasDeMano(s, rival).length > 0
  if (!conCampo && !conMano) return false
  s.cadena = {
    pila: [],
    prioridad: rival, // el rival responde primero
    pasesConsecutivos: 0,
    faseAbierta: s.fase,
    efectoActual: { jugador: jugadorActivo, ...efecto },
    velocidadActual: vel,
  }
  return true
}

/**
 * Obtiene la cadena activa (combate o global).
 * Prioriza combate.cadena si existe, luego s.cadena.
 */
function cadenaActiva(s: GameState): CadenaState | undefined {
  return s.combate?.cadena ?? s.cadena
}

/** Determina si la cadena activa es la de combate o la global. */
function esCadenaDeCombate(s: GameState): boolean {
  return !!s.combate?.cadena
}

export function validarResponderCadena(state: GameState, cardInstanceId: string): string | null {
  const cadena = cadenaActiva(state)
  if (!cadena) return 'no hay cadena abierta'
  // El payload solo es válido para una carta del jugador con prioridad
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return 'esa carta no puede responder ahora'
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
  if ((meta.stats.cost ?? 0) > 0) {
    const pago = validarPago(state, jugador, eterIds, meta.id)
    if (!pago.ok) return pago.error ?? 'pago inválido'
  }
  return null
}

/**
 * Ejecutar jugar_respuesta: paga → mano → PILA (sin slot en campo) — entra
 * como cualquier respuesta (LIFO) y alterna la prioridad. Resolución a cargo
 * de resolverCadenaGlobal (hechizos + consume la carta, §5.3).
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
  const contextoUso: ContextoUso = { tipo: 'jugar', cardInstanceId }
  aplicarPago(s, ctx, jugador, eterIds, inst.cardId, contextoUso)
  const manoIdx = p.mano.indexOf(cardInstanceId)
  if (manoIdx !== -1) p.mano.splice(manoIdx, 1)
  ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId, zona: 'mano', jugador })
  cadena.pila.push(cardInstanceId)
  cadena.pasesConsecutivos = 0
  cadena.velocidadActual = velocidadDe(s, cardInstanceId)
  ctx.emit({ type: 'respuesta_encadenada', jugador, cardInstanceId })
  cadena.prioridad = jugador === 'A' ? 'B' : 'A'
}

/** Apila la respuesta: pila.push, pases→0, la Arcana se REVELA (bocaArriba) y la prioridad alterna. */
export function ejecutarResponderCadena(s: GameState, cardInstanceId: string, ctx: Ctx): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  cadena.pila.push(cardInstanceId)
  cadena.pasesConsecutivos = 0
  // Registrar velocidad del último efecto activado
  cadena.velocidadActual = velocidadDe(s, cardInstanceId)
  // Al activarse, la Arcana se revela (6.2: la pila es visible a ambos)
  const inst = s.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (meta && esArcana(meta)) inst!.bocaArriba = true
  // Campeones con efecto disparo se revelan también
  if (meta && meta.type === 'Campeón' && 'efectos' in meta && meta.efectos?.some((e) => e.tipo === 'disparo')) {
    inst!.bocaArriba = true
  }
  ctx.emit({ type: 'respuesta_encadenada', jugador, cardInstanceId })
  cadena.prioridad = jugador === 'A' ? 'B' : 'A'
}

/**
 * Pasa la prioridad: pasesConsecutivos++. Con 2 pases seguidos la pila se
 * resuelve en orden inverso (L1183) y la cadena se cierra.
 */
export function ejecutarPasarPrioridad(s: GameState, ctx: Ctx): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  cadena.pasesConsecutivos++
  ctx.emit({ type: 'prioridad_pasada', jugador })
  if (cadena.pasesConsecutivos >= 2) {
    if (esCadenaDeCombate(s)) {
      resolverCadenaCombate(s, ctx)
    } else {
      resolverCadenaGlobal(s, ctx)
    }
  } else {
    cadena.prioridad = jugador === 'A' ? 'B' : 'A'
  }
}

/**
 * Resolución en ORDEN INVERSO (L1183): Combate/Arcana → 2G del dueño
 * (liberando el slot 3D-3F); la Táctica PERMANECE en mesa. Cierra la cadena
 * y reanuda la sub-máquina de combate.
 */
function resolverCadenaCombate(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  const cadena = combate?.cadena
  if (!combate || !cadena) return
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    if (esArcana(meta)) {
      const p = s.players[inst.owner]
      const idx = p.campo.arcanasCombate.indexOf(id)
      if (idx !== -1) {
        const zona = slotAZona('arcanasCombate', idx) ?? '3D'
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
        // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
        enviarAlCementerio(s, ctx, id)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
      }
      // Perfeccionamiento-tablero: dispatch al-resolver-cadena para efectos de Combate/Arcana
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
    }
    // Táctica: permanece (sus efectos se resuelven en change 3)
  }
  combate.cadena = undefined
  continuarCombateTrasCadena(s, ctx)
}

/**
 * Resolución de cadena GLOBAL (fuera de combate): LIFO (L1183).
 * - Respuesta desde la MANO (jugar_respuesta): la mística nunca entró al
 *   campo → resuelve sus hechizos y se consume (§5.3 un solo uso).
 * - Arcana → 2G (se consume); Táctica/Mística en campo → permanece;
 *   Campeón Disparo → permanece en campo. Se dispara al-resolver-cadena
 *   para cada carta de la pila (LIFO) para que los handlers actúen.
 * - FONDO DE PILA: la activación DIFERIDA de activar_habilidad (obs 1874)
 *   se resuelve salvo que una negación la haya cancelado (pago NO se devuelve).
 */
function resolverCadenaGlobal(s: GameState, ctx: Ctx): void {
  const cadena = s.cadena
  if (!cadena) return
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    const p = s.players[inst.owner]
    const enCampo =
      p.campo.campeones.includes(id) ||
      p.campo.misticasTacticas.includes(id) ||
      p.campo.arcanasCombate.includes(id)
    if (esMistica(meta) && !enCampo) {
      // Respuesta jugada desde la mano (jugar_respuesta)
      if ('efectos' in meta && meta.efectos) {
        for (const efecto of meta.efectos) {
          if (efecto.tipo === 'hechizo' && !efecto.trigger && efecto.efecto) {
            interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true })
          }
        }
      }
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
      continue
    }
    if (esArcana(meta)) {
      // Arcana se consume: → 2G (guard: si ya salió del campo — fix A4 — no
      // se duplica el envío ni el trigger al-ser-enviado-al-cementerio)
      const idx = p.campo.arcanasCombate.indexOf(id)
      if (idx !== -1) {
        const zona = slotAZona('arcanasCombate', idx) ?? '3D'
        ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
        enviarAlCementerio(s, ctx, id)
        ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
      }
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
    } else {
      // Táctica / Campeón Disparo: permanece, pero dispara trigger para efectos
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
    }
  }
  // Activación diferida (obs 1874): LIFO — se resuelve AL CIERRE, después de
  // las respuestas. Si una negación la canceló → fizzled (pago ya pagado se
  // mantiene: declarar/activar consumió su Éter y su 1/turno igual).
  const pend = cadena.activacionPendiente
  if (pend) {
    const champ = s.instances[pend.cardInstanceId]
    const metaChamp = champ?.cardId ? getCardMeta(champ.cardId) : null
    if (!pend.negada && champ && metaChamp && 'efectos' in metaChamp) {
      const efecto = metaChamp.efectos?.[pend.efectoIdx]
      if (efecto) {
        interpretEffect(s, ctx, champ, efecto, {
          jugador: pend.jugador,
          contextoUso: pend.objetivoId ? 'objetivo-elegido' : undefined,
          objetivoId: pend.objetivoId,
        })
      }
    }
  }
  s.cadena = undefined
}
