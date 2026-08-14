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
import { esArcana, esCombate, esTactica, getCardMeta } from './cards'
import { continuarCombateTrasCadena } from './combat'
import { enviarAlCementerio } from './replacements'
import type { Ctx, GameState, PlayerId } from './types'
import { slotAZona } from './zones'

/**
 * Cartas del jugador que pueden responder en la cadena (9.6): Tácticas
 * colocadas en turnos anteriores, Combates, Arcanas colocadas en turnos
 * anteriores. Las Místicas nunca responden y la activación diferida §5.5
 * excluye Tácticas/Arcanas recién colocadas (entradaEsteTurno).
 */
export function respondiblesDe(state: GameState, playerId: PlayerId): string[] {
  const p = state.players[playerId]
  const res: string[] = []
  for (const id of p.campo.misticasTacticas) {
    if (!id) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (meta && esTactica(meta) && !inst.entradaEsteTurno) res.push(id)
  }
  for (const id of p.campo.arcanasCombate) {
    if (!id) continue
    const inst = state.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    if (esCombate(meta)) res.push(id)
    else if (esArcana(meta) && !inst.entradaEsteTurno) res.push(id)
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
  combate.cadena = { pila: [], prioridad: primerRespondedor, pasesConsecutivos: 0 }
  return true
}

export function validarResponderCadena(state: GameState, cardInstanceId: string): string | null {
  if (state.fase !== 'choque') return 'responder_cadena solo en Choque'
  const cadena = state.combate?.cadena
  if (!cadena) return 'no hay cadena abierta'
  // El payload solo es válido para una carta del jugador con prioridad
  // (como declarar_bloqueo, el motor valida el estado, no la identidad).
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return 'esa carta no puede responder ahora (solo Táctica/Combate/Arcana de turnos anteriores)'
  }
  return null
}

export function validarPasarPrioridad(state: GameState): string | null {
  if (state.fase !== 'choque') return 'pasar_prioridad solo en Choque'
  if (!state.combate?.cadena) return 'no hay cadena abierta'
  return null
}

/** Apila la respuesta: pila.push, pases→0, la Arcana se REVELA (bocaArriba) y la prioridad alterna. */
export function ejecutarResponderCadena(s: GameState, cardInstanceId: string, ctx: Ctx): void {
  const cadena = s.combate!.cadena!
  const jugador = cadena.prioridad
  cadena.pila.push(cardInstanceId)
  cadena.pasesConsecutivos = 0
  // Al activarse, la Arcana se revela (6.2: la pila es visible a ambos)
  const inst = s.instances[cardInstanceId]
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
  if (meta && esArcana(meta)) inst!.bocaArriba = true
  ctx.emit({ type: 'respuesta_encadenada', jugador, cardInstanceId })
  cadena.prioridad = jugador === 'A' ? 'B' : 'A'
}

/**
 * Pasa la prioridad: pasesConsecutivos++. Con 2 pases seguidos la pila se
 * resuelve en orden inverso (L1183) y la cadena se cierra.
 */
export function ejecutarPasarPrioridad(s: GameState, ctx: Ctx): void {
  const cadena = s.combate?.cadena
  if (!cadena) return // defensivo: validado antes
  const jugador = cadena.prioridad
  cadena.pasesConsecutivos++
  ctx.emit({ type: 'prioridad_pasada', jugador })
  if (cadena.pasesConsecutivos >= 2) {
    resolverCadena(s, ctx)
  } else {
    cadena.prioridad = jugador === 'A' ? 'B' : 'A'
  }
}

/**
 * Resolución en ORDEN INVERSO (L1183): Combate/Arcana → 2G del dueño
 * (liberando el slot 3D-3F); la Táctica PERMANECE en mesa. Cierra la cadena
 * y reanuda la sub-máquina de combate.
 */
function resolverCadena(s: GameState, ctx: Ctx): void {
  const combate = s.combate
  const cadena = combate?.cadena
  if (!combate || !cadena) return
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    if (!meta) continue
    if (esCombate(meta) || esArcana(meta)) {
      const p = s.players[inst.owner]
      const idx = p.campo.arcanasCombate.indexOf(id)
      const zona = slotAZona('arcanasCombate', idx) ?? '3D'
      ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: id, zona, jugador: inst.owner })
      // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio
      enviarAlCementerio(s, ctx, id)
      ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: id, zona: '2G', jugador: inst.owner, bocaArriba: true })
    }
    // Táctica: permanece (sus efectos se resuelven en change 3)
  }
  combate.cadena = undefined
  continuarCombateTrasCadena(s, ctx)
}
