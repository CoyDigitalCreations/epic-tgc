// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { simularPartida, botTonto } from '../bot'
import { expandirMazo } from './helpers'
import type { GameState, PlayerId } from '../types'

const deckA = expandirMazo(ESTASIS_CARDS) // 61: 15 Éter + 40 Principal + 6 Vínculos
const deckB = expandirMazo(DISONANCIA_CARDS)

function contarZonas(s: GameState, p: PlayerId): number {
  const st = s.players[p]
  const campo = [
    ...st.campo.campeones,
    ...st.campo.misticasTacticas,
    ...st.campo.arcanasCombate,
  ].filter((x): x is string => x !== null).length
  const vinculos = st.vinculos.filter((x): x is string => x !== null).length
  // Éter bloqueado: vive en Campeón.eterBloqueado (1B-1F), no en zonas del PlayerState
  let bloqueados = 0
  for (const id of st.campo.campeones) {
    if (!id) continue
    const bloq = s.instances[id]?.eterBloqueado
    if (bloq) bloqueados += bloq.length
  }
  return (
    st.mano.length +
    st.mazo.length +
    st.cementerio.length +
    st.exilio.length +
    st.eterReserva.length +
    st.eterPagado.length +
    campo +
    vinculos +
    bloqueados
  )
}

function bloquesPorJugador(s: GameState, p: PlayerId): number {
  const st = s.players[p]
  let bloqueados = 0
  for (const id of st.campo.campeones) {
    if (!id) continue
    const bloq = s.instances[id]?.eterBloqueado
    if (bloq) bloqueados += bloq.length
  }
  return st.eterReserva.length + st.eterPagado.length + bloqueados
}

describe('bot tonto (5.7)', () => {
  it('elige la primera acción válida que no sea rendirse; null si no es su turno', () => {
    const { estado } = simularPartida(deckA, deckB, 1)
    // el bot devuelve acciones solo para el jugador activo
    expect(botTonto(estado, estado.turno === 'A' ? 'B' : 'A')).toBeNull()
  })
})

describe('simularPartida (5.7) — invariantes en 10 seeds', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it.each(seeds)('seed %i: termina en <500 turnos con invariantes de zonas y Éter', (seed) => {
    const { estado, turnos } = simularPartida(deckA, deckB, seed)

    expect(turnos).toBeLessThan(500)
    expect(turnos).toBeGreaterThan(0)
    if (estado.fase === 'terminada') {
      expect(estado.ganador === 'A' || estado.ganador === 'B').toBe(true)
      expect(['mazo_vacio', 'rendicion']).toContain(estado.motivo)
    }

    for (const p of ['A', 'B'] as PlayerId[]) {
      const st = estado.players[p]
      expect(st.mano.length).toBeLessThanOrEqual(6)
      expect(bloquesPorJugador(estado, p)).toBe(15) // 15 Éter: 2A + 1A + bloqueados
      expect(st.campo.campeones.filter((x) => x !== null).length).toBeLessThanOrEqual(5)
      expect(st.campo.misticasTacticas.filter((x) => x !== null).length).toBeLessThanOrEqual(3)
      expect(st.campo.arcanasCombate.filter((x) => x !== null).length).toBeLessThanOrEqual(3)
      expect(contarZonas(estado, p)).toBe(61) // las 61 cartas siguen en zonas del dueño
    }
  })
})
