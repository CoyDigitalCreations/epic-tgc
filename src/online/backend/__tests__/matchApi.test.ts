// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../supabase', () => ({ getSupabase: () => ({ functions: { invoke } }) }))

import { crearSala, unirseASala } from '../matchApi'

describe('matchApi — el motivo del rechazo llega al jugador', () => {
  beforeEach(() => invoke.mockReset())

  it('un status no-2xx muestra el `error` del cuerpo (mazo ilegal), no el mensaje genérico', async () => {
    const cuerpo = { error: 'Mazo A inválido: "Aurora" (FB-010) lleva 2 copias y su límite es 1' }
    invoke.mockImplementation(async () => ({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(cuerpo), { status: 422 }) },
    }))
    await expect(crearSala(['x'])).rejects.toThrow('lleva 2 copias y su límite es 1')
    await expect(unirseASala('abc123', ['x'])).rejects.toThrow('Mazo A inválido')
  })

  it('si el cuerpo no es JSON, queda el mensaje genérico', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: new Response('boom', { status: 500 }) },
    })
    await expect(crearSala(['x'])).rejects.toThrow('non-2xx')
  })

  it('un error sin respuesta asociada usa su mensaje', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'fallo de red' } })
    await expect(crearSala(['x'])).rejects.toThrow('fallo de red')
  })

  it('un 2xx con `error` en el cuerpo sigue lanzando ese error', async () => {
    invoke.mockResolvedValue({ data: { error: 'room not found' }, error: null })
    await expect(unirseASala('zzzzzz', ['x'])).rejects.toThrow('room not found')
  })

  it('un 2xx normal devuelve los datos', async () => {
    invoke.mockResolvedValue({ data: { gameId: 'g1', code: 'ABC123', seed: 1, player: 'A' }, error: null })
    await expect(crearSala(['x'])).resolves.toMatchObject({ gameId: 'g1', player: 'A' })
  })
})
