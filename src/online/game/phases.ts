import { reagruparEter } from './payments'
import { purgarEfectosTemporales, dispararTrigger } from './efectos'
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

  // 0. Expiran los efectos 'alba-dueño' del jugador (ADR-22)
  purgarEfectosTemporales(s, 'alba-dueño', jugador, ctx)

  // 0b. Liberar éteres bloqueados por habilidades activas (Aurora/Ragnar)
  //     "Al inicio de tu próxima Alba reagrupa el Éter usado por este efecto"
  for (const slot of p.campo.campeones) {
    if (!slot) continue
    const inst = s.instances[slot]
    if (!inst?.liberarEnAlba || inst.liberarEnAlba.length === 0) continue
    const eterIds = [...inst.liberarEnAlba]
    // Quitar de eterBloqueado del campeón
    if (inst.eterBloqueado) {
      inst.eterBloqueado = inst.eterBloqueado.filter((id) => !eterIds.includes(id))
    }
    // Limpiar liberarEnAlba
    delete inst.liberarEnAlba
    // Mover a Reserva (2A)
    p.eterReserva.push(...eterIds)
    ctx.emit({ type: 'eter_reagrupado', jugador, eterIds })
  }

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

  // 2. C2: Disparo al-inicio-alba ANTES de reagrupar (instancias = eterPagado del jugador)
  //    El Pasivo 1A (FB-005/DS-006) evalúa su condición en zona 1A viva.
  const eterPagadoSnapshot = [...p.eterPagado]
  if (eterPagadoSnapshot.length > 0) {
    dispararTrigger(s, ctx, 'al-inicio-alba', jugador, eterPagadoSnapshot)
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
