/**
 * Bots BASE: los tres niveles originales del motor (`botTonto`), tal cual. Son la línea base contra la que se mide el bot nuevo
 * y NO se modifican: el contrato del motor (snapshot) depende de ellos.
 *
 * Única adición: si `botTonto` no devuelve nada aunque SÍ le toca actuar (p. ej. debe equipar un Artefacto mientras el rival tiene
 * un pendiente propio: `botTonto` solo busca `elegir_objetivo` y se queda sin acción), juega la primera acción legal que no sea
 * rendirse. Sin esto la arena contaría un fallo del bot viejo como partida anómala.
 */
import { actorActual, getValidActions } from '../online/game'
import { botTonto } from '../online/game/bot'
import type { Dificultad } from '../online/game/bot'
import type { Bot } from './arena'

export const botBase = (dificultad: Dificultad): Bot => (estado, yo) => {
  const accion = botTonto(estado, yo, dificultad)
  if (accion || actorActual(estado) !== yo) return accion
  return getValidActions(estado, yo).find((a) => a.type !== 'rendirse' && a.type !== 'usar_transmutar') ?? null
}
