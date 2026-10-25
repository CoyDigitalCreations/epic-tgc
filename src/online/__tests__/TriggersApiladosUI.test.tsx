import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getValidActions, visibleState } from '../game'
import type { GameState } from '../game'
import { Tablero } from '../components/Tablero'
import { PriorityModal } from '../components/PriorityModal'
import {
  PR, cargarCartasPrueba, escenaVacia, conCampeon, conMazo, conMano, conEteres,
} from '../game/__tests__/helpers/cartasPrueba'

/**
 * F5d-2 — UI mínima: la pila muestra los triggers apilados con su orden de resolución
 * (1° = el primero en resolver), sin tocar lo anterior. Escena armada a mano con el set de prueba.
 */
beforeAll(() => {
  cargarCartasPrueba()
})

/** Cadena global con prioridad de A y dos triggers apilados (el del rival resuelve primero) sobre la respuesta `resp`. */
function conTriggers(): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A')
  conMazo(s, 'B')
  conCampeon(s, 'A', 'ha', PR.HERALDO_ALIADO, 0)
  conCampeon(s, 'B', 'hb', PR.HOSTIGADOR, 0)
  conMano(s, 'B', 'resp', PR.PRESTEZA_DEBIL)
  conEteres(s, 'B', 1)
  s.cadena = {
    origen: 'global',
    pila: [],
    prioridad: 'A',
    pasesConsecutivos: 0,
    faseAbierta: 'forja',
    efectoActual: { jugador: 'B', cardInstanceId: 'hb', descripcion: 'Hostigador de Prueba' },
    triggers: [
      { jugador: 'A', cardInstanceId: 'ha', trigger: 'al-invocar', efectoIdx: 0, objetivoId: 'ha' },
      { jugador: 'B', cardInstanceId: 'hb', trigger: 'al-atacar', efectoIdx: 0, objetivoId: 'ha' },
    ],
  }
  return s
}

describe('triggers apilados en la UI', () => {
  it('PriorityModal lista los triggers con su orden de resolución, de quién son y su objetivo', () => {
    const s = conTriggers()
    render(
      <PriorityModal state={visibleState(s, 'A')} playerId="A" acciones={getValidActions(s, 'A')} onAccion={vi.fn()} onZoom={vi.fn()} />,
    )
    expect(screen.getByText('Triggers')).toBeInTheDocument()
    expect(screen.getByText('resuelve 1°')).toBeInTheDocument() // el del rival (hb)
    expect(screen.getByText('resuelve 2°')).toBeInTheDocument() // el del activo (ha)
    expect(screen.getByText(/Del rival/)).toBeInTheDocument()
    expect(screen.getByText(/Tuyo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pasar prioridad' })).toBeInTheDocument()
  })

  it('sin triggers el modal no muestra la sección (lo de siempre)', () => {
    const s = conTriggers()
    delete s.cadena!.triggers
    render(
      <PriorityModal state={visibleState(s, 'A')} playerId="A" acciones={getValidActions(s, 'A')} onAccion={vi.fn()} onZoom={vi.fn()} />,
    )
    expect(screen.queryByText('Triggers')).toBeNull()
  })

  it('el panel de cadena del Tablero muestra los triggers aunque la pila esté vacía', () => {
    const s = conTriggers()
    render(
      <Tablero vista={visibleState(s, 'A')} acciones={getValidActions(s, 'A')} leTocaA={true} log={[]} onAccion={vi.fn()} onAbandonar={vi.fn()} />,
    )
    expect(screen.getByText('trigger · resuelve 1°')).toBeInTheDocument()
    expect(screen.getByText('trigger · resuelve 2°')).toBeInTheDocument()
    expect(screen.queryByText('Sin cadena abierta.')).toBeNull()
  })
})
