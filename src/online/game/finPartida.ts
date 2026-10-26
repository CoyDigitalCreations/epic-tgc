/**
 * Fin de partida (F6, manual §13 y §5.5 "sexto Vínculo").
 *
 * La derrota NO se confirma en el instante en que se cumple su condición (se destruye el último Vínculo, falla un
 * robo) sino cuando terminan de resolverse los efectos pendientes: el efecto de un Vínculo recién destruido puede
 * evitar la derrota o derrotar también al rival. Si, al confirmar, AMBOS jugadores están derrotados, la partida
 * termina en EMPATE (no es un efecto de carta: es consecuencia de cómo se resuelven las jugadas).
 *
 * Punto de control ÚNICO: `confirmarFinDePartida`, al final de cada acción (core.ts, applyAction). Es idempotente.
 * - Por Vínculos NO hay bandera: se recalcula en cada punto de control (tiene algún Vínculo destruido, ninguno vivo y
 *   la regla `derrotaPorVinculos` lo permite), así un efecto puede evitar la derrota y la regla puede cambiar. Pedir
 *   "algún destruido" evita que un estado sin Vínculos (escenas de prueba) cuente como derrota.
 * - Por mazo vacío sí hay marca (`mazosAgotados`, draw.ts): "pierde en el momento de intentar robar".
 * - La rendición es inmediata (core.ts) y nunca da empate.
 */
import { cadenaActiva } from './chain'
import { electorAjeno } from './pendientes'
import { scryActual } from './scry'
import { reglaBool } from './reglas'
import type { Ctx, GameState, MotivoFin, PlayerId } from './types'

const JUGADORES: readonly PlayerId[] = ['A', 'B']

/** ¿`jugador` se quedó sin Vínculos (tiene al menos uno destruido y ninguno vivo) y la regla lo hace perder? */
function derrotadoPorVinculos(s: GameState, jugador: PlayerId): boolean {
  const insts = s.players[jugador].vinculos
    .filter((id): id is string => !!id)
    .map((id) => s.instances[id])
    .filter((v) => !!v)
  const vivos = insts.filter((v) => !v.bocaArriba).length
  const destruidos = insts.length - vivos
  return vivos === 0 && destruidos > 0 && reglaBool(s, 'derrotaPorVinculos', { jugador })
}

/** Motivo por el que `jugador` está derrotado AHORA, o null. */
export function motivoDerrota(s: GameState, jugador: PlayerId): 'vinculos' | 'mazo_vacio' | null {
  if (derrotadoPorVinculos(s, jugador)) return 'vinculos'
  if (s.mazosAgotados?.includes(jugador)) return 'mazo_vacio'
  return null
}

/**
 * ¿Queda algo OBLIGATORIO por resolver? (decisión del usuario, 2026-10-26): una cadena abierta, una elección en curso
 * (declaración, Artefacto por equipar), una prevención o la elección obligatoria del rival (H4, `electorAjeno`).
 * La cola OPCIONAL del jugador del turno no cuenta: se puede ignorar y no debe dejar la partida sin terminar.
 */
export function hayPendienteObligatorio(s: GameState): boolean {
  return !!cadenaActiva(s) || !!s.declaracionEnEleccion || !!s.equiparPendiente || (s.preventivosPendientes?.length ?? 0) > 0 || !!electorAjeno(s) || !!scryActual(s)
}

/** Punto de control: si ya no hay nada obligatorio pendiente, confirma la derrota (o el empate). */
export function confirmarFinDePartida(s: GameState, ctx: Ctx): void {
  if (s.fase === 'terminada' || hayPendienteObligatorio(s)) return
  const derrotas = JUGADORES.map((j) => ({ jugador: j, motivo: motivoDerrota(s, j) })).filter((d) => d.motivo !== null)
  if (derrotas.length === 0) return
  s.fase = 'terminada'
  if (derrotas.length === JUGADORES.length) {
    delete s.ganador
    s.motivo = 'empate'
    ctx.emit({ type: 'partida_terminada', ganador: null, motivo: 'empate' })
    return
  }
  const { jugador: perdedor, motivo } = derrotas[0]
  const ganador: PlayerId = perdedor === 'A' ? 'B' : 'A'
  const m: MotivoFin = motivo!
  s.ganador = ganador
  s.motivo = m
  ctx.emit({ type: 'partida_terminada', ganador, motivo: m })
}
