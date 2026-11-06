// @vitest-environment node
/** MotorBot con Worker: un worker mudo o caído nunca debe dejar la partida esperando para siempre. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState } from '../online/game'
import { crearMotorBot } from './cliente'

class WorkerFalso {
  static ultimo: WorkerFalso
  onmessage: ((e: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  enviados: unknown[] = []
  terminado = false
  falloAlEnviar = false
  constructor() {
    WorkerFalso.ultimo = this
  }
  postMessage(m: unknown) {
    if (this.falloAlEnviar) throw new Error('DataCloneError')
    this.enviados.push(m)
  }
  terminate() {
    this.terminado = true
  }
}

const estado = {} as GameState
const accion = { type: 'pasar' } as never

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('Worker', WorkerFalso)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('MotorBot con Worker', () => {
  it('devuelve la acción cuando el worker contesta', async () => {
    const motor = crearMotorBot()
    const p = motor.jugar(estado, 'B', 'dificil')
    const w = WorkerFalso.ultimo
    const { id } = w.enviados[0] as { id: number }
    w.onmessage?.({ data: { id, accion } })
    expect(await p).toBe(accion)
  })

  it('si el worker nunca contesta, resuelve null al vencer el plazo', async () => {
    const motor = crearMotorBot()
    const p = motor.jugar(estado, 'B', 'dificil')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await p).toBeNull()
  })

  it('una respuesta tardía (tras el plazo) se ignora sin romper nada', async () => {
    const motor = crearMotorBot()
    const p = motor.jugar(estado, 'B', 'dificil')
    const w = WorkerFalso.ultimo
    const { id } = w.enviados[0] as { id: number }
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await p).toBeNull()
    expect(() => w.onmessage?.({ data: { id, accion } })).not.toThrow()
  })

  it('tras un error del worker, las jugadas siguientes devuelven null al instante', async () => {
    const motor = crearMotorBot()
    const w = WorkerFalso.ultimo
    const primera = motor.jugar(estado, 'B', 'dificil')
    w.onerror?.()
    expect(await primera).toBeNull()
    const enviadosAntes = w.enviados.length
    expect(await motor.jugar(estado, 'B', 'dificil')).toBeNull() // sin avanzar el reloj
    expect(w.enviados.length).toBe(enviadosAntes)
  })

  it('si postMessage lanza (estado no clonable), resuelve null en vez de colgarse', async () => {
    const motor = crearMotorBot()
    WorkerFalso.ultimo.falloAlEnviar = true
    expect(await motor.jugar(estado, 'B', 'dificil')).toBeNull()
  })

  it('cerrar() libera lo pendiente y termina el worker', async () => {
    const motor = crearMotorBot()
    const p = motor.jugar(estado, 'B', 'dificil')
    motor.cerrar()
    expect(await p).toBeNull()
    expect(WorkerFalso.ultimo.terminado).toBe(true)
  })
})
