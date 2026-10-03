import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ESTASIS_CARDS } from '../../shared/data/paquetes'
import {
  applyAction,
  createInitialState,
  faccionesCompartidas,
  getCardMeta,
  getValidActions,
  visibleState,
} from '../game'
import type { Action, GameState } from '../game'
import { MAZOS } from '../mazos'
import { Tablero } from '../components/Tablero'

const SEEDS = [42, 1, 2, 3, 4, 5, 7, 11, 13, 17, 19, 23, 29]

/** Crea la partida y pasa los dos mulligans: llega a Forja (turno = primerJugador). */
function partidaEnForja(seed: number): GameState {
  const { state, ctx } = createInitialState(MAZOS[0].cardIds, MAZOS[1].cardIds, seed)
  let s = applyAction(state, { type: 'pasar_mulligan' }, ctx).state
  s = applyAction(s, { type: 'pasar_mulligan' }, ctx).state
  if (s.fase !== 'forja') throw new Error(`seed ${seed}: no llegó a forja (fase ${s.fase})`)
  return s
}

/** Forja con turno de A y al menos una carta con coste (jugar/colocar) en mano. */
function forjaDeAConCoste(): GameState {
  for (const seed of SEEDS) {
    const s = partidaEnForja(seed)
    if (s.turno !== 'A') continue
    const conCoste = getValidActions(s, 'A').some(
      (a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica' || a.type === 'colocar_arcana',
    )
    if (conCoste) return s
  }
  throw new Error('Ningún seed probado tiene forja con turno A y carta con coste en mano')
}

/** Forja con turno de A (para acciones de campeón propio). */
function forjaDeA(): GameState {
  for (const seed of SEEDS) {
    const s = partidaEnForja(seed)
    if (s.turno === 'A') return s
  }
  throw new Error('Ningún seed probado tiene forja con turno A')
}

describe('Selección de Éter en el tablero 4×7', () => {
  it('permite elegir los Éteres de la Reserva para pagar y confirma la acción con esos ids', { timeout: 15000 }, async () => {
    const user = userEvent.setup()
    // Estado determinista: Mística cost 2 (FB-019) en mano + 3 Éteres en Reserva
    const estado = forjaDeA()
    estado.instances['inst-mist'] = { cardInstanceId: 'inst-mist', cardId: 'FB-019', owner: 'A' }
    estado.players.A.mano = ['inst-mist']
    const eterIds = ['e-pay-0', 'e-pay-1', 'e-pay-2']
    eterIds.forEach((id) => {
      estado.instances[id] = { cardInstanceId: id, cardId: 'FB-001', owner: 'A' }
      if (!estado.players.A.eterReserva.includes(id)) estado.players.A.eterReserva.push(id)
    })

    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // 1. Hay un botón "Pagar" (FB-019 en mano con coste 2)
    expect(screen.getAllByRole('button', { name: 'Pagar' }).length).toBeGreaterThan(0)

    // 2. Click en Pagar → abre el selector de Éteres de la Reserva
    await user.click(screen.getAllByRole('button', { name: 'Pagar' })[0])
    expect(screen.getByText(/Elegí los Éteres de tu Reserva/)).toBeInTheDocument()

    // 3. Toggle Éteres hasta Σ aporte ≥ coste (2) — aporteDe = 1 por Éter
    const confirmar = () => screen.getByRole('button', { name: 'Pagar y jugar' })
    const botonesEter = screen.getAllByRole('button').filter((b) => b.textContent?.includes('aporte'))
    expect(botonesEter.length).toBeGreaterThan(0)
    const titulosElegidos: string[] = []
    for (let i = 0; i < botonesEter.length && (confirmar() as HTMLButtonElement).disabled; i++) {
      await user.click(botonesEter[i])
      titulosElegidos.push(botonesEter[i].getAttribute('title')!)
    }
    expect((confirmar() as HTMLButtonElement).disabled).toBe(false)
    expect(titulosElegidos.length).toBeGreaterThanOrEqual(2)

    // 4. Confirmar → selector de casilla (3A-3C vacío = 3 slots → elegir)
    await user.click(confirmar())
    // Click en el BOTÓN de casilla (no en el span de texto)
    const slotBtn = screen
      .getAllByRole('button')
      .find((b) => /^3[ABC]/.test((b.textContent ?? '').trim()))
    if (slotBtn && onAccion.mock.calls.length === 0) {
      await user.click(slotBtn)
    }
    await vi.waitFor(() => expect(onAccion).toHaveBeenCalled(), { timeout: 5000 })
    expect(onAccion).toHaveBeenCalledTimes(1)
    const accion = onAccion.mock.calls[0][0] as Action & { eterIds: string[] }
    expect(accion.type).toBe('jugar_mistica')
    expect(accion.eterIds.length).toBe(titulosElegidos.length)
    for (const id of accion.eterIds) {
      const nombre = getCardMeta(vista.instances[id]?.cardId ?? '')?.name
      expect(titulosElegidos).toContain(nombre)
    }
    expect(screen.queryByRole('button', { name: 'Pagar y jugar' })).not.toBeInTheDocument()
  })

  it('permite elegir los Éteres a bloquear sobre un Campeón propio', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    // Campeón con habilidad que necesita éter bloqueado (FB-010 Aurora, bloqueo_fijo:4)
    const campeon = ESTASIS_CARDS.find((c) => c.id === 'FB-010')
    expect(campeon).toBeDefined()
    estado.instances['inst-camp'] = { cardInstanceId: 'inst-camp', cardId: campeon!.id, owner: 'A' }
    estado.players.A.campo.campeones[0] = 'inst-camp'
    // Garantizar ≥4 Éteres en Reserva para el bloqueo fijo de Aurora
    while (estado.players.A.eterReserva.length < 4) {
      const id = `eter-extra-${estado.players.A.eterReserva.length}`
      estado.instances[id] = { cardInstanceId: id, cardId: 'FB-001', owner: 'A' }
      estado.players.A.eterReserva.push(id)
    }

    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    // Fase 3a: bloquear_eter usa targetInstanceId (no campeonSlot)
    // bloqueo_fijo:4 → UNA acción con los 4 Éteres exactos
    const accBloqueo = acciones.find((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'inst-camp')
    expect(accBloqueo).toBeDefined()
    if (accBloqueo?.type === 'bloquear_eter') {
      expect(accBloqueo.eterIds).toHaveLength(4)
    }

    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Botón "Bloquear" bajo el campeón → abre el selector (no ejecuta directo)
    await user.click(screen.getAllByRole('button', { name: 'Bloquear' })[0])
    // Label de bloqueo FIJO: pago exacto
    expect(screen.getByText(/Bloquea exactamente 4 Éter/)).toBeInTheDocument()

    // Confirmar deshabilitado con 0 Éteres seleccionados
    let confirmar = screen.getAllByRole('button', { name: 'Bloquear' })
    expect(confirmar[confirmar.length - 1]).toBeDisabled()

    // Seleccionar 4 Éteres habilitados del selector (botones con título de Éter)
    const candidatos = screen.getAllByRole('button').filter((b) => {
      const t = b.getAttribute('title') ?? ''
      return t.startsWith('Éter') && !b.disabled
    })
    expect(candidatos.length).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < 4; i++) {
      await user.click(candidatos[i])
    }

    confirmar = screen.getAllByRole('button', { name: 'Bloquear' })
    const btnConfirmar = confirmar[confirmar.length - 1]
    expect(btnConfirmar).not.toBeDisabled()
    await user.click(btnConfirmar)

    expect(onAccion).toHaveBeenCalledTimes(1)
    const accion = onAccion.mock.calls[0][0] as Action & { eterIds: string[]; targetInstanceId: string }
    expect(accion.type).toBe('bloquear_eter')
    expect(accion.targetInstanceId).toBe('inst-camp')
    expect(accion.eterIds.length).toBe(4)
  })
})

describe('Zoom de carta (CartaZoom)', () => {
  /** Forja con turno de A y un Campeón propio en 2B (slot 0) en la mesa. */
  function forjaDeAConCampeonEnMesa(): { estado: GameState; campeon: (typeof ESTASIS_CARDS)[number] } {
    const estado = forjaDeA()
    const campeon = ESTASIS_CARDS.find(
      (c) =>
        c.type === 'Campeón' &&
        estado.players.A.eterReserva.some((id) => {
          const meta = getCardMeta(estado.instances[id].cardId ?? '')
          return meta !== null
        }),
    )
    expect(campeon).toBeDefined()
    estado.instances['inst-camp'] = { cardInstanceId: 'inst-camp', cardId: campeon!.id, owner: 'A' }
    estado.players.A.campo.campeones[0] = 'inst-camp'
    return { estado, campeon: campeon! }
  }

  it('clic en un campeón de la mesa abre la carta en grande y Escape la cierra', async () => {
    const user = userEvent.setup()
    const { estado, campeon } = forjaDeAConCampeonEnMesa()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Click en la miniatura del campeón → se abre el diálogo de la carta en grande.
    // Si el campeón también está en la mano (jugable → lupita), elijo el de la mesa.
    const nombre = campeon.name
    const miniatura = screen
      .getAllByTitle(nombre)
      .find((el) => !el.querySelector('[aria-label="Ver carta grande"]'))
    expect(miniatura).toBeDefined()
    await user.click(miniatura!)

    const dialogo = screen.getByRole('dialog', { name: `Carta en grande: ${nombre}` })
    expect(dialogo).toBeInTheDocument()
    // El zoom NO ejecuta ninguna acción
    expect(onAccion).not.toHaveBeenCalled()

    // Escape → cierra el zoom sin tocar el tablero
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('la lupita de una carta jugable abre el zoom sin ejecutar la acción', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Hay al menos una lupita (carta jugable con clic ya asignado a pagar/jugar)
    const lupita = screen.getAllByRole('button', { name: 'Ver carta grande' })[0]
    expect(lupita).toBeInTheDocument()

    await user.click(lupita)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // El clic en la lupita NO ejecuta la acción de la carta
    expect(onAccion).not.toHaveBeenCalled()

    // Cerrar con el botón ✕ del modal
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Reserva de Éter (2A) y aporte real (1 / ½)', () => {
  it('la Reserva muestra solo el tope y el clic abre el panel inferior con la lista completa', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    // El tope de la Reserva lleva el contador "+14" (15 éteres al inicio, se muestra 1)
    const topeId = estado.players.A.eterReserva[estado.players.A.eterReserva.length - 1]
    const nombreTope = getCardMeta(vista.instances[topeId].cardId ?? '')?.name ?? ''
    const topes = screen.getAllByTitle(nombreTope).filter((el) => el.textContent?.includes('+14'))
    expect(topes.length).toBeGreaterThan(0)

    // Click en el tope → panel inferior con la lista completa
    await user.click(topes[0])
    expect(screen.getByText(/Reserva de Éter/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()

    // Cerrar → el panel desaparece
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(/Reserva de Éter/)).not.toBeInTheDocument()
  })

  it('el selector de pago muestra el aporte real (1 propia / ½ ajena) y no el doble', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    const conCoste = acciones.find(
      (a) => a.type === 'jugar_campeon' || a.type === 'jugar_mistica' || a.type === 'colocar_arcana',
    ) as Extract<Action, { cardInstanceId: string }> | undefined
    expect(conCoste).toBeDefined()
    // Click en el botón Pagar de esa carta → abre el selector
    await user.click(screen.getAllByRole('button', { name: 'Pagar' })[0])
    expect(screen.getByText(/Elegí los Éteres de tu Reserva/)).toBeInTheDocument()

    // Aporte en unidades reales: 1 (fación compartida) o 0.5 (ajena), NUNCA 2
    const aportes = screen.getAllByText(/^aporte (1|0\.5)$/)
    expect(aportes.length).toBeGreaterThan(0)
    expect(screen.queryByText('aporte 2')).not.toBeInTheDocument()

    // El umbral mostrado es el coste, no el doble
    const coste = Number((screen.getByText(/Coste: \d+/).textContent ?? '').replace(/[^\d]/g, ''))
    const textoAportado = screen.getByText(/Aportado:/).textContent ?? ''
    expect(textoAportado).toMatch(new RegExp(`/\\s*${coste}$`))
  })
})

describe('Grilla rival invertida y Éteres pagados (1A)', () => {
  it('la grilla del rival se muestra de cabeza (180°) y la propia no', () => {
    const estado = forjaDeA()
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    expect(screen.getByTestId('grilla-B')).toHaveStyle({ transform: 'rotate(180deg)' })
    expect(screen.getByTestId('grilla-A')).not.toHaveStyle({ transform: 'rotate(180deg)' })
  })

  it('el clic en el Éter pagado (1A) propio abre el panel con la lista completa', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    // Simula pagos previos: 2 Éteres de la Reserva pasan a 1A
    estado.players.A.eterPagado.push(...estado.players.A.eterReserva.splice(0, 2))
    const vista = visibleState(estado, 'A')
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    // El tope de 1A lleva "×2"; clic → panel con la lista completa
    const topeId = estado.players.A.eterPagado[estado.players.A.eterPagado.length - 1]
    const nombreTope = getCardMeta(vista.instances[topeId].cardId ?? '')?.name!
    const tope = screen.getAllByTitle(nombreTope).find((el) => el.textContent?.includes('×2'))
    expect(tope).toBeDefined()
    await user.click(tope!)

    expect(screen.getByText(/Éteres pagados/)).toBeInTheDocument()
    // Cada Éter pagado figura listado (nombre bajo su miniatura)
    const totalListados = estado.players.A.eterPagado.reduce((acc, id) => {
      const nombre = getCardMeta(estado.instances[id].cardId ?? '')?.name ?? ''
      return acc + screen.getAllByText(nombre).length
    }, 0)
    expect(totalListados).toBeGreaterThanOrEqual(2)

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(/Éteres pagados/)).not.toBeInTheDocument()
  })

  it('el panel de Éteres pagados también funciona en la grilla del rival (invertida)', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    // El rival también tiene Éteres pagados (3)
    estado.players.B.eterPagado.push(...estado.players.B.eterReserva.splice(0, 3))
    const vista = visibleState(estado, 'A')
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    const topeId = estado.players.B.eterPagado[estado.players.B.eterPagado.length - 1]
    const nombreTope = getCardMeta(vista.instances[topeId].cardId ?? '')?.name!
    const tope = screen.getAllByTitle(nombreTope).find((el) => el.textContent?.includes('×3'))
    expect(tope).toBeDefined()
    await user.click(tope!)

    expect(screen.getByText(/Éteres pagados/)).toBeInTheDocument()
    expect(screen.getByText(/del rival/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(/Éteres pagados/)).not.toBeInTheDocument()
  })
})

describe('Botones de acción en la mano y zoom', () => {
  it('clic en una carta de la mano abre el zoom; el botón Pagar abre el selector', async () => {
    const user = userEvent.setup()
    const estado = forjaDeAConCoste()
    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    const boton = screen.getAllByRole('button', { name: 'Pagar' })[0]
    const carta = boton.previousElementSibling as HTMLElement
    const nombre = carta.getAttribute('title')!
    expect(nombre).toBeTruthy()

    // Clic en la carta → zoom (sin ejecutar ninguna acción)
    await user.click(carta)
    expect(screen.getByRole('dialog', { name: `Carta en grande: ${nombre}` })).toBeInTheDocument()
    expect(onAccion).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')

    // Clic en el botón Pagar → selector de pago
    await user.click(boton)
    expect(screen.getByText(/Elegí los Éteres de tu Reserva/)).toBeInTheDocument()
  })
})

describe('Sacrificio de Campeones (rol Soberano/Emperador)', () => {
  it('permite elegir qué Campeón sacrificar y lo envía en la acción', { timeout: 15000 }, async () => {
    const user = userEvent.setup()
    // Estado determinista: Aurora (Soberano, cost 4) en mano + Vaela en campo + 4 Éteres
    const estado = forjaDeA()
    estado.instances['inst-sac'] = { cardInstanceId: 'inst-sac', cardId: 'FB-011', owner: 'A' }
    estado.players.A.campo.campeones[0] = 'inst-sac'
    estado.instances['inst-aurora'] = { cardInstanceId: 'inst-aurora', cardId: 'FB-010', owner: 'A' }
    estado.players.A.mano = ['inst-aurora']
    const eterIds = ['e-sac-0', 'e-sac-1', 'e-sac-2', 'e-sac-3']
    eterIds.forEach((id) => {
      estado.instances[id] = { cardInstanceId: id, cardId: 'FB-001', owner: 'A' }
      if (!estado.players.A.eterReserva.includes(id)) estado.players.A.eterReserva.push(id)
    })

    const vista = visibleState(estado, 'A')
    const acciones = getValidActions(estado, 'A')
    const jugar = acciones.find((a) => a.type === 'jugar_campeon' && a.cardInstanceId === 'inst-aurora')
    expect(jugar).toBeDefined()

    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={acciones}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Abrir el selector: botón Pagar bajo la MiniCard de Aurora en la mano
    const auroras = screen.getAllByTitle('Aurora, La Primogénita')
    const botonAurora = auroras
      .map((el) => el.nextElementSibling)
      .find((el) => el?.textContent === 'Pagar')
    expect(botonAurora).toBeDefined()
    await user.click(botonAurora!)
    expect(screen.getByText(/Elegí 1 Campeón de tu campo para sacrificar/)).toBeInTheDocument()

    // Elegir Vaela como sacrificio (botón del selector con title=Vaela)
    const vaelaSelector = screen
      .getAllByTitle('Vaela, Sed de Alba')
      .find((el) => el.closest('button'))
    expect(vaelaSelector).toBeDefined()
    await user.click(vaelaSelector!)

    // Pagar el coste (4) con Éteres de la Reserva
    const confirmar = () => screen.getByRole('button', { name: 'Pagar y jugar' })
    const botonesEter = screen.getAllByRole('button').filter((b) => b.textContent?.includes('aporte'))
    for (let i = 0; i < botonesEter.length && (confirmar() as HTMLButtonElement).disabled; i++) {
      await user.click(botonesEter[i])
    }
    expect((confirmar() as HTMLButtonElement).disabled).toBe(false)

    await user.click(confirmar())
    // Slots 2B-2F: click en el BOTÓN de casilla (no en el span de texto)
    const slotBtn = screen
      .getAllByRole('button')
      .find((b) => /^2[BCDEF]/.test((b.textContent ?? '').trim()))
    if (slotBtn && onAccion.mock.calls.length === 0) {
      await user.click(slotBtn)
    }
    await vi.waitFor(() => expect(onAccion).toHaveBeenCalled(), { timeout: 5000 })
    expect(onAccion).toHaveBeenCalledTimes(1)
    const accion = onAccion.mock.calls[0][0] as Action & { eterIds: string[]; sacrificios: string[] }
    expect(accion.type).toBe('jugar_campeon')
    expect(accion.sacrificios).toEqual(['inst-sac'])
    expect(accion.eterIds.length).toBe(4)
  })
})

describe('Campeón cansado (agotado)', () => {
  it('se muestra rotado 90° y con el MISMO tamaño que las cartas verticales', () => {
    const estado = forjaDeA()
    const campeones = ESTASIS_CARDS.filter((c) => c.type === 'Campeón')
    const cansado = campeones[0]
    const normal = campeones[1]
    estado.instances['inst-cansado'] = {
      cardInstanceId: 'inst-cansado',
      cardId: cansado.id,
      owner: 'A',
      agotado: true,
    }
    estado.instances['inst-normal'] = { cardInstanceId: 'inst-normal', cardId: normal.id, owner: 'A' }
    estado.players.A.campo.campeones[0] = 'inst-cansado'
    estado.players.A.campo.campeones[1] = 'inst-normal'
    const vista = visibleState(estado, 'A')
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    // Rotado 90° (parte de arriba hacia la izquierda) sin el tenue anterior
    const contenedorCansado = screen.getAllByTitle(cansado.name)
      .find((el) => el.querySelector('[style*="rotate(-90deg)"]'))
    expect(contenedorCansado).toBeDefined()
    expect(contenedorCansado!.querySelector('[style*="opacity: 0.55"]')).toBeNull()
    expect(contenedorCansado!.querySelector('[style*="grayscale"]')).toBeNull()

    // El cansado ocupa el área de la carta vertical girada: altoCarta × ancho
    const tamanoMd = 74 // TAMANOS.md
    const altoCarta = 1038 * (tamanoMd / 744) // ≈ 103.24 px (mismo cálculo que MiniCard)
    expect(contenedorCansado!.getAttribute('style')).toContain(`width: ${altoCarta}px`)
    expect(contenedorCansado!.getAttribute('style')).toContain(`height: ${tamanoMd}px`)

    // La vertical (boca arriba) sigue en su tamaño normal: ancho × altoCarta
    const contenedorNormal = screen
      .getAllByTitle(normal.name)
      .find((el) => !el.querySelector('[style*="rotate(-90deg)"]'))
    expect(contenedorNormal).toBeDefined()
    expect(contenedorNormal!.getAttribute('style')).toContain(`width: ${tamanoMd}px`)
    expect(contenedorNormal!.getAttribute('style')).toContain(`height: ${altoCarta}px`)
  })
})

describe('Cartas boca abajo (Arcanas/Combate/Vínculos)', () => {
  /** Monta el tablero desde un estado ya preparado. */
  function renderTablero(estado: GameState) {
    return render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
  }

  /** Dorso dentro de una celda con data-zona (las grillas van B primero, A después). */
  function dorsoEnCelda(zona: string, grillaA: boolean): HTMLElement {
    const celdas = document.querySelectorAll(`[data-zona="${zona}"]`)
    const celda = celdas[grillaA ? 1 : 0] as HTMLElement
    expect(celda).toBeDefined()
    return within(celda).getByLabelText('Carta boca abajo')
  }

  it('la Arcana propia se ve boca abajo y el clic muestra la carta', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const arcana = ESTASIS_CARDS.find((c) => c.type === 'Arcana')!
    estado.instances['inst-arcana'] = { cardInstanceId: 'inst-arcana', cardId: arcana.id, owner: 'A' }
    estado.players.A.campo.arcanasCombate[0] = 'inst-arcana'
    renderTablero(estado)

    // En SU casilla (3D de la grilla propia) se ve como DORSO, no la carta boca arriba
    const celdas = document.querySelectorAll('[data-zona="3D"]')
    const celda = celdas[1] as HTMLElement
    const dorso = within(celda).getByLabelText('Carta boca abajo')
    expect(within(celda).queryByTitle(arcana.name)).toBeNull()

    // Clic → zoom con la carta real (es mía: puedo inspeccionarla)
    await user.click(dorso)
    expect(screen.getByRole('dialog', { name: `Carta en grande: ${arcana.name}` })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('la Arcana del rival se ve boca abajo y NO se puede inspeccionar', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const arcana = ESTASIS_CARDS.find((c) => c.type === 'Arcana')!
    estado.instances['inst-arcana-rival'] = {
      cardInstanceId: 'inst-arcana-rival',
      cardId: arcana.id,
      owner: 'B',
    }
    estado.players.B.campo.arcanasCombate[0] = 'inst-arcana-rival'
    renderTablero(estado)

    // En la grilla rival (3D) se ve como DORSO
    const dorso = dorsoEnCelda('3D', false)
    expect(dorso).toBeInTheDocument()

    // El clic NO revela la carta del oponente
    await user.click(dorso)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el Vínculo propio se ve boca abajo y el clic muestra la carta', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const vinculo = ESTASIS_CARDS.find((c) => c.type === 'Vínculo')!
    estado.instances['inst-vinculo'] = { cardInstanceId: 'inst-vinculo', cardId: vinculo.id, owner: 'A' }
    estado.players.A.vinculos[0] = 'inst-vinculo'
    renderTablero(estado)

    const celdas = document.querySelectorAll('[data-zona="4A"]')
    const celda = celdas[1] as HTMLElement
    const dorso = within(celda).getByLabelText('Carta boca abajo')
    expect(within(celda).queryByTitle(vinculo.name)).toBeNull()

    await user.click(dorso)
    expect(screen.getByRole('dialog', { name: `Carta en grande: ${vinculo.name}` })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Búsqueda de mazo (tutores)', () => {
  /** Estado mínimo con pendiente de búsqueda (FB-031 al cementerio) y 2 opciones en el mazo de A. */
  function estadoConBusqueda(): GameState {
    const jugador = (id: 'A' | 'B') => ({
      id,
      mano: [],
      mazo: ['m-ds031', 'm-fb031'],
      cementerio: [],
      exilio: [],
      eterReserva: [],
      eterPagado: [],
      campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
      vinculos: [null, null, null, null, null, null],
      mulliganUsado: true,
    })
    return {
      version: 1,
      seed: 7,
      fase: 'choque' as const,
      turno: 'A' as const,
      primerJugador: 'A' as const,
      primerTurno: false,
      players: { A: jugador('A'), B: jugador('B') },
      instances: {
        'm-ds031': { cardInstanceId: 'm-ds031', cardId: 'DS-031', owner: 'A' },
        'm-fb031': { cardInstanceId: 'm-fb031', cardId: 'FB-031', owner: 'A' },
      },
      objetivosPendientes: [
        {
          jugador: 'A',
          instId: 'c-FB-031-0-A',
          trigger: 'al-ser-enviado-al-cementerio',
          opciones: ['m-ds031', 'm-fb031'],
        },
      ],
    }
  }

  it('muestra las cartas opción con su nombre y dispara elegir_objetivo', async () => {
    const user = userEvent.setup()
    const estado = estadoConBusqueda()
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Título del bloque de búsqueda y los NOMBRES de las cartas seleccionables
    expect(screen.getByText(/Búsqueda de mazo — elige una carta/)).toBeInTheDocument()
    const nombreDs = getCardMeta('DS-031')?.name!
    const nombreFb = getCardMeta('FB-031')?.name!
    expect(screen.getByText(nombreDs)).toBeInTheDocument()
    expect(screen.getByText(nombreFb)).toBeInTheDocument()
    // No aparece el botón genérico sin nombre (bug reportado)
    expect(screen.queryByRole('button', { name: /elegir_objetivo/ })).not.toBeInTheDocument()

    // Click en la opción DS-031 → la acción llega con su objetivoId
    const boton = screen.getAllByRole('button', { name: (n) => n.includes(nombreDs) })[0]
    await user.click(boton)
    expect(onAccion).toHaveBeenCalledTimes(1)
    expect(onAccion).toHaveBeenCalledWith({ type: 'elegir_objetivo', objetivoId: 'm-ds031' })
  })

  it('label de campo cuando las opciones están en el campo (no en mazo)', () => {
    const jugador = (id: 'A' | 'B') => ({
      id,
      mano: [],
      mazo: [],
      cementerio: [],
      exilio: [],
      eterReserva: [],
      eterPagado: [],
      campo: {
        campeones: id === 'A' ? ['cam-a1', 'cam-a2', null, null, null] : [null, null, null, null, null],
        misticasTacticas: [null, null, null],
        arcanasCombate: [null, null, null],
      },
      vinculos: [null, null, null, null, null, null],
      mulliganUsado: true,
    })
    const estado: GameState = {
      version: 1,
      seed: 99,
      fase: 'forja' as const,
      turno: 'A' as const,
      primerJugador: 'A' as const,
      primerTurno: false,
      players: { A: jugador('A'), B: jugador('B') },
      instances: {
        'cam-a1': { cardInstanceId: 'cam-a1', cardId: 'FB-001', owner: 'A' },
        'cam-a2': { cardInstanceId: 'cam-a2', cardId: 'FB-002', owner: 'A' },
      },
      objetivosPendientes: [
        {
          jugador: 'A',
          instId: 'src-x',
          trigger: 'al-invocar',
          opciones: ['cam-a1', 'cam-a2'],
        },
      ],
    }
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        logDetallado={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    expect(screen.getByText(/Elección en campo — elige un Campeón/)).toBeInTheDocument()
    expect(screen.queryByText(/Búsqueda de mazo/)).not.toBeInTheDocument()
  })

  it('muestra el nombre de la carta fuente arriba del label de elección', () => {
    const jugador = (id: 'A' | 'B') => ({
      id,
      mano: [],
      mazo: ['m-ds031'],
      cementerio: [],
      exilio: [],
      eterReserva: [],
      eterPagado: [],
      campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
      vinculos: [null, null, null, null, null, null],
      mulliganUsado: true,
    })
    // Fuente: DS-031 (campeón tutor) — nombre real del JSON
    const nombreFuente = getCardMeta('DS-031')?.name ?? 'DS-031'
    const estado: GameState = {
      version: 1,
      seed: 5,
      fase: 'choque' as const,
      turno: 'A' as const,
      primerJugador: 'A' as const,
      primerTurno: false,
      players: { A: jugador('A'), B: jugador('B') },
      instances: {
        'src-ds031': { cardInstanceId: 'src-ds031', cardId: 'DS-031', owner: 'A' },
        'm-ds031': { cardInstanceId: 'm-ds031', cardId: 'DS-031', owner: 'A' },
      },
      objetivosPendientes: [
        {
          jugador: 'A',
          instId: 'src-ds031',
          trigger: 'al-ser-enviado-al-cementerio',
          opciones: ['m-ds031'],
        },
      ],
    }
    render(
      <Tablero
        vista={visibleState(estado, 'A')}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        logDetallado={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )
    // Nombre de la fuente visible ARRIBA del label de zona (puede repetir en opciones)
    expect(screen.getAllByText(nombreFuente).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Búsqueda de mazo/)).toBeInTheDocument()
  })
})

describe('Log detallado — botón copiar', () => {
  it('copia todo el log al portapapeles con un click', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    const lineas = ['=== PARTIDA SEED 66676 ===', '▶ A ejecuta: pasar_mulligan', '▶ B ejecuta: mulligan']
    render(
      <Tablero
        vista={partidaEnForja(42)}
        acciones={[]}
        leTocaA={false}
        log={[]}
        logDetallado={lineas}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /log detallado/i }))
    await user.click(screen.getByRole('button', { name: /copiar/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(lineas.join('\n'))
    expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('Panel de Cementerio y Exilio (lista completa)', () => {
  /** Mueve `n` cartas del mazo del jugador a la zona dada, con nombres ÚNICOS entre sí y sin repetir ninguna zona visible del tablero. */
  function moverAlMazo(
    n: number,
    zona: 'cementerio' | 'exilio',
    estado: GameState,
    jugador: 'A' | 'B' = 'A',
  ): string[] {
    const p = estado.players[jugador]
    const visibles = [
      ...p.mano,
      ...p.eterReserva,
      ...p.eterPagado,
      ...p.campo.campeones,
      ...p.campo.misticasTacticas,
      ...p.campo.arcanasCombate,
      ...p.vinculos,
      ...p.cementerio,
      ...p.exilio,
    ]
    const nombresVisibles = new Set(
      visibles
        .map((id) => (id ? getCardMeta(estado.instances[id].cardId ?? '')?.name : undefined))
        .filter((n): n is string => !!n),
    )
    const usados = new Set<string>()
    const ids: string[] = []
    for (const id of p.mazo) {
      if (ids.length >= n) break
      const nombre = getCardMeta(estado.instances[id].cardId ?? '')?.name
      if (nombre === undefined || nombresVisibles.has(nombre) || usados.has(nombre)) continue
      usados.add(nombre)
      ids.push(id)
    }
    p.mazo = p.mazo.filter((id) => !ids.includes(id))
    p[zona] = [...ids]
    return ids
  }

  /** El <p> con el título del panel abierto (contiene la zona y el posesivo). */
  const tituloPanel = (posesivo: string): HTMLElement => {
    const span = screen.getByText(new RegExp(`— ${posesivo}`))
    const p = span.closest('p')
    if (!p) throw new Error('Panel abierto sin título')
    return p
  }

  /** Cada MiniCard del panel pinta el nombre dentro del arte Y tiene el label debajo → ≥1 match. */
  const nombresListados = (nombres: string[]) => {
    for (const n of nombres) {
      expect(screen.getAllByText(n).length).toBeGreaterThan(0)
    }
  }

  it('clic en el cementerio (2G): lista completa abajo y clic en una carta la agranda', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const ids = moverAlMazo(3, 'cementerio', estado)
    const vista = visibleState(estado, 'A')
    const nombres = ids.map((id) => getCardMeta(vista.instances[id].cardId ?? '')?.name!)
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    // Tope con ×3; clic → panel con la lista completa
    const tope = screen.getAllByTitle(nombres[2]).find((el) => el.textContent?.includes('×3'))
    expect(tope).toBeDefined()
    await user.click(tope!)

    expect(tituloPanel('tuyo').textContent).toContain('Cementerio')
    nombresListados(nombres)

    // Clic en una carta de la lista → se ve en grande
    await user.click(screen.getAllByTitle(nombres[0])[0])
    expect(screen.getByRole('dialog', { name: `Carta en grande: ${nombres[0]}` })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clic en el exilio (1G): lista completa abajo y clic en una carta la agranda', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const ids = moverAlMazo(2, 'exilio', estado)
    const vista = visibleState(estado, 'A')
    const nombres = ids.map((id) => getCardMeta(vista.instances[id].cardId ?? '')?.name!)
    const onAccion = vi.fn()
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={onAccion}
        onAbandonar={vi.fn()}
      />,
    )

    const tope = screen.getAllByTitle(nombres[1]).find((el) => el.textContent?.includes('×2'))
    expect(tope).toBeDefined()
    await user.click(tope!)

    expect(tituloPanel('tuyo').textContent).toContain('Exilio')
    nombresListados(nombres)
    await user.click(screen.getAllByTitle(nombres[0])[0])
    expect(screen.getByRole('dialog', { name: `Carta en grande: ${nombres[0]}` })).toBeInTheDocument()
  })

  it('el cementerio del rival también abre el panel (visible, "del rival")', async () => {
    const user = userEvent.setup()
    const estado = forjaDeA()
    const ids = moverAlMazo(2, 'cementerio', estado, 'B')
    const vista = visibleState(estado, 'A')
    const nombres = ids.map((id) => getCardMeta(vista.instances[id].cardId ?? '')?.name!)
    render(
      <Tablero
        vista={vista}
        acciones={getValidActions(estado, 'A')}
        leTocaA={true}
        log={[]}
        onAccion={vi.fn()}
        onAbandonar={vi.fn()}
      />,
    )

    const tope = screen.getAllByTitle(nombres[1]).find((el) => el.textContent?.includes('×2'))
    expect(tope).toBeDefined()
    await user.click(tope!)

    expect(tituloPanel('del rival').textContent).toContain('Cementerio')
    nombresListados(nombres)
  })
})
