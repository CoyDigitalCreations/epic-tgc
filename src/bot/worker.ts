/**
 * Hilo aparte del bot: la búsqueda tarda segundos en las posiciones difíciles y en el hilo principal congelaría la interfaz.
 * Protocolo: { id, estado, yo, dificultad } → { id, accion }. `reiniciar` olvida la memoria anti-bucle (partida nueva).
 */
import type { Action, GameState, PlayerId } from '../online/game'
import type { Bot } from './arena'
import { crearBotNivel } from './niveles'

type Nivel = 'facil' | 'medio' | 'dificil'
export type Peticion = { tipo: 'jugar'; id: number; estado: GameState; yo: PlayerId; dificultad: Nivel } | { tipo: 'reiniciar' }
export interface Respuesta {
  id: number
  accion: Action | null
}

const ambito = self as unknown as { onmessage: ((e: { data: Peticion }) => void) | null; postMessage(m: Respuesta): void }
let bots: Partial<Record<Nivel, Bot>> = {}

ambito.onmessage = ({ data }) => {
  if (data.tipo === 'reiniciar') {
    bots = {}
    return
  }
  const bot = (bots[data.dificultad] ??= crearBotNivel(data.dificultad))
  let accion: Action | null = null
  try {
    accion = bot(data.estado, data.yo)
  } catch {
    accion = null
  }
  ambito.postMessage({ id: data.id, accion })
}
