import { reagruparEter } from './payments'
import type { Ctx, GameState, PlayerId } from './types'

/**
 * Alba AUTO-RESUELTA (ADR-3): nunca es un estado observable; se ejecuta dentro
 * de la acción que la dispara. Orden: enderezar (silencioso) → reagrupar
 * 1A→2A (eter_reagrupado) → robar 1 (carta_robada; mazo vacío → derrota).
 * Las transiciones forja→choque→ocaso→alba viven en actions.ts (C4).
 */
export function resolverAlba(s: GameState, ctx: Ctx, jugador: PlayerId): void {
  const p = s.players[jugador]

  // 1. Enderezar Campeones (silencioso)
  for (const slot of p.campo.campeones) {
    if (slot) {
      const inst = s.instances[slot]
      if (inst.agotado) delete inst.agotado
      if (inst.atacoEsteTurno) delete inst.atacoEsteTurno
    }
  }

  // 2. Reagrupar Éter pagado 1A → 2A (los bloqueados permanecen en el Campeón)
  reagruparEter(s, ctx, jugador)

  // 3. Robar 1 (no consume RNG: toma del tope)
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
