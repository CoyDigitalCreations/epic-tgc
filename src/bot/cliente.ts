/**
 * Puerta del bot para la interfaz: pide la jugada a un Web Worker (sin congelar la pantalla) y, donde no hay Workers
 * (tests con jsdom, navegadores raros), la calcula en el mismo hilo. Un `MotorBot` por partida.
 */
import type { Action, GameState, PlayerId } from '../online/game'
import type { Bot } from './arena'
import { crearBotNivel } from './niveles'
import type { Peticion, Respuesta } from './worker'

export type Nivel = 'facil' | 'medio' | 'dificil'

export interface MotorBot {
  jugar(estado: GameState, yo: PlayerId, dificultad: Nivel): Promise<Action | null>
  /** Partida nueva: olvida la memoria anti-bucle. */
  reiniciar(): void
  cerrar(): void
}

function motorEnMismoHilo(): MotorBot {
  let bots: Partial<Record<Nivel, Bot>> = {}
  return {
    jugar: async (estado, yo, dificultad) => (bots[dificultad] ??= crearBotNivel(dificultad))(estado, yo),
    reiniciar: () => {
      bots = {}
    },
    cerrar: () => {},
  }
}

export function crearMotorBot(): MotorBot {
  if (typeof Worker === 'undefined') return motorEnMismoHilo()
  let worker: Worker
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return motorEnMismoHilo()
  }
  const pendientes = new Map<number, (a: Action | null) => void>()
  let siguiente = 0
  // Si el worker se cae, nadie se queda esperando: respuesta vacía (la interfaz decide qué hacer)
  const vaciar = () => {
    pendientes.forEach((resolver) => resolver(null))
    pendientes.clear()
  }
  worker.onmessage = (e: MessageEvent<Respuesta>) => {
    pendientes.get(e.data.id)?.(e.data.accion)
    pendientes.delete(e.data.id)
  }
  worker.onerror = vaciar
  const enviar = (p: Peticion) => worker.postMessage(p)
  return {
    jugar: (estado, yo, dificultad) =>
      new Promise((resolver) => {
        const id = ++siguiente
        pendientes.set(id, resolver)
        enviar({ tipo: 'jugar', id, estado, yo, dificultad })
      }),
    reiniciar: () => enviar({ tipo: 'reiniciar' }),
    cerrar: () => {
      vaciar()
      worker.terminate()
    },
  }
}
