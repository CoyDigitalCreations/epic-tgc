/**
 * Puerta del bot para la interfaz: pide la jugada a un Web Worker (sin congelar la pantalla) y, donde no hay Workers
 * (tests con jsdom, navegadores raros), la calcula en el mismo hilo. Un `MotorBot` por partida.
 */
import type { Action, GameState, PlayerId } from '../online/game'
import type { Bot } from './arena'
import { crearBotNivel } from './niveles'
import type { Peticion, Respuesta } from './worker'

export type Nivel = 'facil' | 'medio' | 'dificil'

/** Tiempo máximo que se espera al worker por jugada; pasado esto la interfaz usa el bot básico. */
const PLAZO_JUGADA_MS = 30_000

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
  let muerto = false
  // Si el worker se cae, nadie se queda esperando: respuesta vacía (la interfaz decide qué hacer)
  const vaciar = () => {
    pendientes.forEach((resolver) => resolver(null))
    pendientes.clear()
  }
  worker.onmessage = (e: MessageEvent<Respuesta>) => {
    pendientes.get(e.data.id)?.(e.data.accion)
    pendientes.delete(e.data.id)
  }
  // Un worker caído no vuelve: las jugadas siguientes devuelven null al instante (sin esperar el plazo)
  worker.onerror = () => {
    muerto = true
    vaciar()
  }
  const enviar = (p: Peticion) => {
    try {
      worker.postMessage(p)
    } catch {
      muerto = true
      vaciar()
    }
  }
  return {
    jugar: (estado, yo, dificultad) =>
      new Promise((resolver) => {
        if (muerto) return resolver(null)
        const id = ++siguiente
        // Plazo: si el worker se cuelga o nunca contesta, la partida no se queda esperando para siempre
        const reloj = setTimeout(() => {
          if (pendientes.delete(id)) resolver(null)
        }, PLAZO_JUGADA_MS)
        pendientes.set(id, (accion) => {
          clearTimeout(reloj)
          resolver(accion)
        })
        enviar({ tipo: 'jugar', id, estado, yo, dificultad })
      }),
    reiniciar: () => enviar({ tipo: 'reiniciar' }),
    cerrar: () => {
      vaciar()
      worker.terminate()
    },
  }
}
