/**
 * Bot DIFÍCIL (nuevo): elige la acción que mejor deja el tablero tras buscar unos pasos con el motor (ver busqueda.ts).
 * No toca el motor ni depende de sus detalles: solo `getValidActions`, `applyAction` y la información pública.
 */
import { actorActual, getValidActions } from '../online/game'
import type { Action, GameState, PlayerId } from '../online/game'
import type { Bot } from './arena'
import { atacantesRelevantes, CONFIG, esUtil, sinRepetidos, valorDe } from './busqueda'
import type { Config } from './busqueda'

/** Número en [0,1) que solo depende del estado (y de una sal): misma posición, misma "suerte". No toca el RNG de la partida. */
function azar(s: GameState, sal = 0): number {
  let h = 2166136261 ^ sal
  const mezcla = [s.turno === "A" ? 1 : 2, s.players.A.mazo.length, s.players.B.mazo.length, s.players.A.mano.length, s.players.B.mano.length, s.players.A.eterReserva.length, s.players.B.eterReserva.length]
  for (const n of mezcla) { h = Math.imul(h ^ n, 16777619) >>> 0 }
  return (h >>> 0) / 4294967296
}

/** Una jugada que aparece tantas veces en las últimas `VENTANA` se considera un bucle y se prueba la siguiente mejor (también si alternan dos jugadas). */
const REPETICIONES_MAX = 3
const VENTANA = 14

export function crearBotBusqueda(cfg: Config = CONFIG): Bot {
  // Red de seguridad contra bucles (p. ej. descartar y recuperar la misma carta): la búsqueda es de pocos pasos y no los ve todos
  const recientes: string[] = []

  return (s: GameState, yo: PlayerId): Action | null => {
    if (actorActual(s) !== yo) return null
    const acciones = atacantesRelevantes(s, sinRepetidos(getValidActions(s, yo).filter(esUtil)))
    if (acciones.length === 0) return null
    if (acciones.length === 1) return acciones[0]

    const pasar = acciones.find((a) => a.type === 'pasar_turno')
    const valoradas: { accion: Action; valor: number }[] = []
    for (const a of acciones) {
      if (a === pasar) continue
      valoradas.push({ accion: a, valor: valorDe(s, a, yo, cfg, acciones.length) })
    }
    valoradas.sort((x, y) => y.valor - x.valor)

    // Jugada libre: solo se hace algo si mejora lo que se logra pasando; si no, se pasa (evita ciclos sin sentido)
    if (pasar) {
      const vPasar = valorDe(s, pasar, yo, cfg, acciones.length)
      if (valoradas.length === 0 || valoradas[0].valor <= vPasar + 1e-9) valoradas.unshift({ accion: pasar, valor: vPasar })
    }

    // Detección de bucle: la misma jugada, sobre un tablero con la misma mano, repetida varias veces en las últimas jugadas
    const clave = (a: Action) => `${s.turno}|${s.fase}|${s.players[yo].mano.length}|${JSON.stringify(a)}`
    const repetida = (a: Action) => recientes.filter((k) => k === clave(a)).length >= REPETICIONES_MAX
    let elegida = valoradas[0].accion
    // Nivel: a veces se juega una de las mejores jugadas que no es la primera (error humano). Pseudoaleatorio pero determinista
    if (cfg.ruido > 0 && valoradas.length > 1 && azar(s) < cfg.ruido) {
      elegida = valoradas[1 + Math.floor(azar(s, 7) * Math.min(2, valoradas.length - 1))].accion
    }
    // La red anti-bucle va DESPUÉS del ruido: el ruido es determinista (mismo tablero, misma «suerte») y si no, repetiría el error
    if (repetida(elegida)) elegida = valoradas.find((v) => !repetida(v.accion))?.accion ?? elegida
    recientes.push(clave(elegida))
    if (recientes.length > VENTANA) recientes.shift()
    return elegida
  }
}

