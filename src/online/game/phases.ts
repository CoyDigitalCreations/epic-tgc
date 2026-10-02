import { reagruparEter } from './payments'
import { purgarEfectosTemporales, dispararTrigger, crearOpcionBloqueo } from './efectos'
import { getCardMeta } from './cards'
import { resolverFaseEfectos } from './effectRegistry'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Alba AUTO-RESUELTA (ADR-3): nunca es un estado observable; se ejecuta dentro
 * de la acción que la dispara. Orden C2: purga 'alba-dueño' → enderezar →
 * DISPARO al-inicio-alba ANTES de reagrupar (para que Pasivo 1A evalúe 1A) →
 * reagrupar 1A→2A → robar 1.
 * Desviación: ADR-23 ordenaba tras reagrupar; Pasivo necesita 1A vivo.
 * Las transiciones forja→choque→ocaso→alba viven en actions.ts (C4).
 */
export function resolverAlba(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]

  // 0a. Effect Registry: resolver efectos pendientes de fase 'alba'
  resolverFaseEfectos(s, ctx, 'alba', jugador)

  // 0. Expiran los efectos 'alba-dueño' del jugador (ADR-22)
  purgarEfectosTemporales(s, 'alba-dueño', jugador, ctx)

  // 1. Enderezar Campeones (silencioso)
  for (const slot of p.campo.campeones) {
    if (slot) {
      const inst = s.instances[slot]
      if (inst.agotado) delete inst.agotado
      if (inst.atacoEsteTurno) delete inst.atacoEsteTurno
    }
  }
  // 1b. Activación diferida (§5.5, C4)
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
    if (id && s.instances[id]?.entradaEsteTurno) delete s.instances[id].entradaEsteTurno
  }

  // 2. C2: Disparo al-inicio-alba ANTES de reagrupar (instancias = eterPagado + vínculos del jugador)
  //    El Pasivo 1A (FB-005/DS-006) evalúa su condición en zona 1A viva.
  //    Los vínculos con efectos periódicos (FB-025, FB-029, DS-025, DS-029) también se evalúan aquí.
  const vinculosSnapshot = p.vinculos.filter((id): id is string => id !== null)
  const albaInstances = [...p.eterPagado, ...vinculosSnapshot]
  if (albaInstances.length > 0) {
    dispararTrigger(s, ctx, 'al-inicio-alba', jugador, albaInstances)
  }

  // Fase 2a — Pasivo 1A data-driven: Éteres en 1A con block_ether sin trigger
  // (tipo pago — FB-005/DS-006) ofrecen bloquear 1 Éter sin agotar, 1/turno.
  for (const eterId of p.eterPagado) {
    const eterInst = s.instances[eterId]
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
    if (!eterMeta || !('efectos' in eterMeta) || !eterMeta.efectos) continue
    const esPasivoBloqueo = eterMeta.efectos.some(
      (e) => e.efecto === 'block_ether' && !e.trigger && e.tipo === 'pago',
    )
    if (!esPasivoBloqueo) continue
    if (eterInst) eterInst.opcionUsadaEsteTurno = false
    crearOpcionBloqueo(s, jugador, eterId)
  }

  // 3. Reagrupar Éter pagado 1A → 2A (los bloqueados permanecen en el Campeón)
  reagruparEter(s, ctx, jugador)

  // 4. Robar 1 (no consume RNG: toma del tope)
  robarCarta(s, ctx, jugador)
}

/** Roba la carta del tope del mazo; mazo vacío → mazo_agotado + partida_terminada. */
export function robarCarta(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]
  const tope = p.mazo.shift()
  if (tope === undefined) {
    ctx.emit({ type: 'mazo_agotado', jugador })
    const ganador: PlayerId = jugador === 'A' ? 'B' : 'A'
    s.fase = 'terminada'
    s.ganador = ganador
    s.motivo = 'mazo_vacio'
    ctx.emit({ type: 'partida_terminada', ganador, motivo: 'mazo_vacio' })
    return
  }
  p.mano.push(tope)
  ctx.emit({ type: 'carta_robada', jugador, cardInstanceId: tope })
}

/**
 * Limpieza defensiva del combate al salir de Choque (ADR-11): la transición
 * choque→ocaso borra GameState.combate aunque el flujo normal ya lo resolvió.
 */
export function limpiarCombate(s: GameState): void {
  s.combate = undefined
}
