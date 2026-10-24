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
 * - Resolución: Combate/Arcana → 2G liberando el slot (se consumen); la
 *   Táctica PERMANECE en mesa (solo sus efectos se resolverían — change 3).
 *   Al cerrar, `continuarCombateTrasCadena` reanuda la sub-máquina de combate.
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
import type { EfectoData } from '../../shared/types'
import type { Ctx, CadenaState, DeclaracionCadena, GameState, OpenerCadena, PlayerId } from './types'
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
  const cadena = cadenaActiva(state)
  const enPila = new Set(cadena?.pila ?? [])
  // F5b: el opener (fondo de la pila) no se responde a sí mismo
  if (cadena?.opener) enPila.add(cadena.opener.cardInstanceId)

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
  const conCampo = respondiblesDe(s, rival).length > 0
  const conMano = incluirMano && respuestasDeMano(s, rival).length > 0
  if (!conCampo && !conMano) return false
  s.cadena = {
    origen: 'global',
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
 * Cadena activa (F5a: pila única en `s.cadena`, de combate o global).
 * Punto único de lectura para motor, bot, validActions y UI.
 */
export function cadenaActiva(s: GameState): CadenaState | undefined {
  return s.cadena
}

/** Determina si la cadena activa es la de combate o la global. */
function esCadenaDeCombate(s: GameState): boolean {
  return s.cadena?.origen === 'combate'
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
 * resuelve en orden inverso (§9.6) y la cadena se cierra.
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
 * Resolución en ORDEN INVERSO (§9.6): Combate/Arcana → 2G del dueño
 * (liberando el slot 3D-3F); la Táctica PERMANECE en mesa. Cierra la cadena
 * y reanuda la sub-máquina de combate.
 */
function resolverCadenaCombate(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  const cadena = s.cadena
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
  s.cadena = undefined
  continuarCombateTrasCadena(s, ctx)
}

/**
 * Resolución de cadena GLOBAL (fuera de combate): LIFO (§9.6).
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
  // F5b: el opener (Mística, Arcana o habilidad) resuelve ÚLTIMO.
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
 * Captura el objetivo elegido de un hechizo del opener (elegir_objetivo sobre un
 * pendiente con `opener`). Un objetivo que ya no existe se descarta (el hechizo
 * se pierde al resolver). La ventana la abre continuarDeclaracion.
 */
export function registrarObjetivoOpener(
  s: GameState,
  pendiente: { opener?: { efectoIdx: number } },
  objetivoId: string,
): void {
  const op = s.declaracionEnEleccion?.opener
  if (!op || !pendiente.opener) return
  if (s.instances[objetivoId]) op.objetivos = { ...op.objetivos, [pendiente.opener.efectoIdx]: objetivoId }
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
