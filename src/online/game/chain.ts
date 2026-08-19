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
import { esArcana, esMistica, getCardMeta } from './cards'
import { continuarCombateTrasCadena } from './combat'
import { dispararTrigger } from './efectos'
import { enviarAlCementerio } from './replacements'
import type { Ctx, CadenaState, GameState, PlayerId } from './types'
import { slotAZona } from './zones'

/**
 * Cartas del jugador que pueden responder en la cadena (9.6 + global):
 * - Tácticas colocadas en turnos anteriores
 * - Combates
 * - Arcanas colocadas en turnos anteriores
 * - Campeones con efectoDisparo que no estén agotados
 * Las Místicas nunca responden y la activación diferida §5.5
 * excluye Tácticas/Arcanas recién colocadas (entradaEsteTurno).
 */
export function respondiblesDe(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  // Cartas que ya están en la pila de la cadena (no pueden responder dos veces)
  const enPila = new Set(state.combate?.cadena?.pila ?? state.cadena?.pila ?? [])
  const res: string[] = []
  for (const id of p.campo.misticasTacticas) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    // Místicas responden si NO están en activación diferida (§5.5)
    if (meta && esMistica(meta) && !inst.entradaEsteTurno) res.push(id)
  }
  for (const id of p.campo.arcanasCombate) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    // Arcanas responden si NO están en activación diferida (§5.5)
    if (esArcana(meta) && !inst.entradaEsteTurno) res.push(id)
  }
  // Campeones con efecto Disparo (no agotados)
  for (const id of p.campo.campeones) {
    if (!id) continue
    if (enPila.has(id)) continue
    const inst = state.instances[id]
    if (inst?.agotado) continue
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && meta.type === 'Campeón' && 'efectoDisparo' in meta && (meta as any).efectoDisparo) {
      res.push(id)
    }
  }
  return res
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
 * Apertura de cadena GLOBAL (fuera de combate): cuando un efecto se activa
 * y el rival podría responder. Se abre en s.cadena (no en combate.cadena).
 * Devuelve true si se abrió (rival tiene respondibles), false si no.
 */
export function abrirCadenaGlobal(
  s: GameState,
  jugadorActivo: PlayerId,
  efecto: { cardInstanceId: string; descripcion: string },
): boolean {
  const rival: PlayerId = jugadorActivo === 'A' ? 'B' : 'A'
  if (respondiblesDe(s, rival).length === 0) return false
  s.cadena = {
    pila: [],
    prioridad: rival, // el rival responde primero
    pasesConsecutivos: 0,
    faseAbierta: s.fase,
    efectoActual: { jugador: jugadorActivo, ...efecto },
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

/** Apila la respuesta: pila.push, pases→0, la Arcana se REVELA (bocaArriba) y la prioridad alterna. */
export function ejecutarResponderCadena(s: GameState, cardInstanceId: string, ctx: Ctx): void {
  const cadena = cadenaActiva(s)
  if (!cadena) return
  const jugador = cadena.prioridad
  cadena.pila.push(cardInstanceId)
  cadena.pasesConsecutivos = 0
  // Al activarse, la Arcana se revela (6.2: la pila es visible a ambos)
  const inst = s.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (meta && esArcana(meta)) inst!.bocaArriba = true
  // Campeones Disparo se revelan también
  if (meta && meta.type === 'Campeón' && 'efectoDisparo' in meta && (meta as any).efectoDisparo) {
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
      const zona = slotAZona('arcanasCombate', idx) ?? '3D'
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
      // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
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
 * Combate/Arcana → 2G (se consumen); Táctica → permanece en mesa;
 * Campeón Disparo → permanece en campo. Se dispara al-resolver-cadena
 * para cada carta de la pila (LIFO) para que los handlers actúen.
 */
function resolverCadenaGlobal(s: GameState, ctx: Ctx): void {
  const cadena = s.cadena
  if (!cadena) return
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    if (esArcana(meta)) {
      // Arcana se consume: → 2G
      const p = s.players[inst.owner]
      const idx = p.campo.arcanasCombate.indexOf(id)
      const zona = slotAZona('arcanasCombate', idx) ?? '3D'
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
    } else {
      // Táctica / Campeón Disparo: permanece, pero dispara trigger para efectos
      dispararTrigger(s, ctx, 'al-resolver-cadena', inst.owner, [id])
    }
  }
  s.cadena = undefined
}
