/**
 * Scry (F9c): «mira las N cartas del tope del mazo, reordénalas y manda las que quieras al fondo».
 *
 * El efecto (`iniciarScry`) NO decide nada: congela la partida con un `ScryPendiente` hasta que el jugador responde
 * con `ordenar_mazo`. Mientras exista, el único actor es quien mira (`actorActual`) y solo se acepta ordenar o
 * rendirse (validarAccion); las cartas se le revelan solo a él (visibleState).
 *
 * Una pendiente es VIGENTE por las cartas que siguen en el mazo: si entre medias alguna se robó o se movió, el
 * jugador ordena las que quedan; sin ninguna, la pendiente se descarta sola (`descartarScryMuertos`).
 */
import type { Action } from './actions'
import type { Ctx, GameState, PlayerId, ScryPendiente } from './types'

/** Cartas de la pendiente que siguen en el mazo, en el orden en que se miraron (tope primero). */
export function cartasVigentesScry(s: GameState, p: ScryPendiente): string[] {
  const mazo = s.players[p.mazoDe].mazo
  return p.cartas.filter((id) => mazo.includes(id))
}

/** La pendiente que se atiende ahora: el frente de la cola (FIFO) que aún tiene cartas por ordenar. */
export function scryActual(s: GameState): ScryPendiente | undefined {
  const frente = s.scryPendientes?.[0]
  return frente && cartasVigentesScry(s, frente).length > 0 ? frente : undefined
}

/** Quita del frente las pendientes sin cartas vigentes para que no atasquen la partida. Se llama tras cada acción. */
export function descartarScryMuertos(s: GameState): void {
  while (s.scryPendientes && s.scryPendientes.length > 0 && cartasVigentesScry(s, s.scryPendientes[0]).length === 0) {
    s.scryPendientes = s.scryPendientes.slice(1)
  }
  if (s.scryPendientes?.length === 0) delete s.scryPendientes
}

/**
 * Arma un scry: `jugador` mira (y ordenará) las `cantidad` cartas del tope del mazo de `mazoDe`. Con menos cartas
 * de las pedidas mira las que haya; con el mazo vacío no hace nada. El tope es el índice 0 (draw.ts).
 */
export function iniciarScry(s: GameState, ctx: Ctx, jugador: PlayerId, mazoDe: PlayerId, cantidad: number): void {
  const cartas = s.players[mazoDe].mazo.slice(0, Math.max(0, cantidad))
  if (cartas.length === 0) return
  s.scryPendientes = [...(s.scryPendientes ?? []), { jugador, mazoDe, cartas }]
  ctx.emit({ type: 'mazo_mirado', jugador, cantidad: cartas.length })
}

type OrdenarMazo = Extract<Action, { type: 'ordenar_mazo' }>

export function validarOrdenarMazo(state: GameState, action: OrdenarMazo): string | null {
  const pendiente = scryActual(state)
  if (!pendiente) return 'no hay un mazo por ordenar'
  if (action.jugador !== undefined && action.jugador !== pendiente.jugador) return 'el mazo lo ordena quien lo mira'
  const vigentes = cartasVigentesScry(state, pendiente)
  const enviadas = [...action.arriba, ...action.fondo]
  if (new Set(enviadas).size !== enviadas.length) return 'cartas repetidas'
  if (enviadas.length !== vigentes.length || !vigentes.every((id) => enviadas.includes(id))) {
    return 'debes ordenar exactamente las cartas que miraste'
  }
  return null
}

/**
 * `arriba` queda al tope en ese orden (la primera se roba primero) y `fondo` va al fondo del mazo, en ese orden
 * (la última de `fondo` queda de última). El resto del mazo conserva su orden entre ambos grupos.
 */
export function ejecutarOrdenarMazo(s: GameState, action: OrdenarMazo, ctx: Ctx): void {
  const pendiente = scryActual(s)
  if (!pendiente) return
  const miradas = new Set(action.arriba.concat(action.fondo))
  const p = s.players[pendiente.mazoDe]
  const resto = p.mazo.filter((id) => !miradas.has(id))
  p.mazo = [...action.arriba, ...resto, ...action.fondo]
  s.scryPendientes = s.scryPendientes!.slice(1)
  if (s.scryPendientes.length === 0) delete s.scryPendientes
  ctx.emit({ type: 'mazo_ordenado', jugador: pendiente.jugador, arriba: action.arriba.length, fondo: action.fondo.length })
}
