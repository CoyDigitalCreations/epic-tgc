import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { MazoEditor } from '../MazoEditor'
import { ESTASIS_CARDS, cardArtPath } from '../../../shared/data/paquetes'
import { useCardStore } from '../../../forge/store/useCardStore'
import { clearCardImages, saveCardImage } from '../../../forge/utils/image-store'
import type { AnyCard } from '../../../shared/types'
import type { MazoPersonalizado } from '../../useMazosStore'

function limpiarColeccion() {
  useCardStore.getState().clearCards()
  localStorage.removeItem('epic-tgc-collection')
}

const campeonCustom = (overrides: Partial<AnyCard> = {}): AnyCard => ({
  id: 'custom-1',
  name: 'Guardián Estelar',
  type: 'Campeón',
  rarity: 'Rara',
  keywords: [],
  flavorText: 'Brilla en la oscuridad.',
  limiteCopias: 3,
  stats: { cost: 3, poder: 4, resistencia: 4 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const mazoValido = (nombre = 'Mi mazo'): MazoPersonalizado => ({
  id: 'mi-mazo',
  nombre,
  cardIds: Array.from({ length: 66 }, (_, i) => `carta-${i}`),
})

/** Arma la selección completa de Estásis: 15 Éter + 45 Principal + 6 Vínculos = 66 copias. */
async function seleccionarEstasisCompleto(user: ReturnType<typeof userEvent.setup>) {
  for (const c of ESTASIS_CARDS) {
    const copias = Number(c.limiteCopias ?? 1)
    const boton = screen.getByRole('button', { name: `Agregar copia de ${c.name}` })
    for (let i = 0; i < copias; i++) {
      fireEvent.click(boton)
    }
  }
}

describe('MazoEditor', () => {
  beforeEach(async () => {
    await clearCardImages()
    limpiarColeccion()
  })

  it('muestra el título, el input de nombre, filtros, contadores y el botón guardar deshabilitado', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Nuevo mazo personalizado' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del mazo')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByLabelText('Facción')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar carta...')).toBeInTheDocument()
    // Contadores en cero
    const contadores = screen.getByTestId('contadores')
    expect(contadores.textContent).toContain('0/15')
    expect(contadores.textContent).toContain('0/45')
    expect(contadores.textContent).toContain('0/6')
    expect(screen.getByRole('button', { name: 'Guardar mazo' })).toBeDisabled()
  })

  it('lista las cartas del catálogo (diseños) en el editor', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByText(ESTASIS_CARDS[0].name)).toBeInTheDocument()
  })

  it('muestra el arte estático de los diseños en cada fila', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const img = await screen.findByRole('img', { name: ESTASIS_CARDS[0].name })
    expect(img).toHaveAttribute('src', cardArtPath(ESTASIS_CARDS[0].id))
  })

  it('muestra el arte de una carta custom desde IndexedDB (hasImage)', async () => {
    useCardStore.getState().loadCards([campeonCustom({ hasImage: true })])
    await saveCardImage('custom-1', 'data:image/png;base64,ARTECUSTOM')
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)

    const img = await screen.findByRole('img', { name: 'Guardián Estelar' })
    expect(img).toHaveAttribute('src', 'data:image/png;base64,ARTECUSTOM')
  })

  it('las custom sin arte muestran placeholder (sin img rota)', () => {
    useCardStore.getState().loadCards([campeonCustom()])
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByText('Guardián Estelar')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Guardián Estelar' })).not.toBeInTheDocument()
  })

  it('muestra coste, ATQ/RES y efectos en la fila de un Campeón', () => {
    useCardStore.getState().loadCards([
      campeonCustom({
        stats: { cost: 3, poder: 4, resistencia: 4 },
        efectoPasivo: 'Gana +1 poder por Éter bloqueado.',
        efectoActivo: 'Paga 1 Éter: agota un Campeón rival.',
      }),
    ])
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const fila = screen.getByText('Guardián Estelar').closest('div.bg-surface-2') as HTMLElement

    // Datos de la carta: coste y estadísticas de combate
    expect(within(fila).getByText(/Coste 3/)).toBeInTheDocument()
    expect(within(fila).getByText(/ATQ 4 RES 4/)).toBeInTheDocument()
    // Efectos con su etiqueta (mismo criterio de nombres que CardPreview)
    expect(within(fila).getByText('Pasivo:')).toBeInTheDocument()
    expect(within(fila).getByText('Activo:')).toBeInTheDocument()
    expect(within(fila).getByText(/Gana \+1 poder por Éter bloqueado\./)).toBeInTheDocument()
    expect(within(fila).getByText(/Paga 1 Éter: agota un Campeón rival\./)).toBeInTheDocument()
  })

  it('muestra coste y efectos de un Éter (sin ATQ/RES)', () => {
    useCardStore.getState().loadCards([
      {
        id: 'custom-eter',
        name: 'Cristal Astral',
        type: 'Éter',
        rarity: 'Común',
        keywords: [],
        flavorText: '',
        limiteCopias: 15,
        stats: { cost: 1 },
        efectoReserva: 'Se reserva en tu zona de Éter.',
        efectoPago: 'Págalo para pagar costes.',
        efectoBloqueo: 'Bloquéalo sobre un Campeón.',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const fila = screen.getByText('Cristal Astral').closest('div.bg-surface-2') as HTMLElement

    expect(within(fila).getByText(/Coste 1/)).toBeInTheDocument()
    expect(within(fila).queryByText(/ATQ /)).not.toBeInTheDocument()
    expect(within(fila).getByText('Reserva:')).toBeInTheDocument()
    expect(within(fila).getByText('Pago:')).toBeInTheDocument()
    expect(within(fila).getByText('Bloqueo:')).toBeInTheDocument()
    expect(within(fila).getByText(/Se reserva en tu zona de Éter\./)).toBeInTheDocument()
  })

  it('el botón + agrega copias y actualiza los contadores; no pasa de limiteCopias', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[0]
    const limite = Number(carta.limiteCopias ?? 1)
    const mas = screen.getByRole('button', { name: `Agregar copia de ${carta.name}` })
    const menos = screen.getByRole('button', { name: `Quitar copia de ${carta.name}` })

    for (let i = 0; i < limite + 3; i++) {
      fireEvent.click(mas)
    }
    // El contador total muestra limiteCopias copias (no más)
    const contadores = screen.getByTestId('contadores')
    expect(contadores.textContent).toContain(`${limite}/66`)
    // El botón - quita copias
    fireEvent.click(menos)
    expect(screen.getByTestId('contadores').textContent).toContain(`${limite - 1}/66`)
  })

  it('filtra por tipo', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const eter = ESTASIS_CARDS.find((c) => c.type === 'Éter')!
    const noEter = ESTASIS_CARDS.find((c) => c.type !== 'Éter')!
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'Éter' } })
    expect(screen.getByText(eter.name)).toBeInTheDocument()
    expect(screen.queryByText(noEter.name)).not.toBeInTheDocument()
  })

  it('filtra por texto de búsqueda', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const buscada = ESTASIS_CARDS[1]
    fireEvent.change(screen.getByPlaceholderText('Buscar carta...'), {
      target: { value: buscada.name },
    })
    expect(screen.getByText(buscada.name)).toBeInTheDocument()
    expect(screen.queryByText(ESTASIS_CARDS[0].name)).not.toBeInTheDocument()
  })

  it('no habilita guardar con mazo inválido (incompleto)', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[0]
    fireEvent.change(screen.getByLabelText('Nombre del mazo'), { target: { value: 'Parcial' } })
    fireEvent.click(screen.getByRole('button', { name: `Agregar copia de ${carta.name}` }))
    expect(screen.getByRole('button', { name: 'Guardar mazo' })).toBeDisabled()
  })

  it('arma un mazo válido completo y onGuardar recibe 66 cardIds', async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn()
    render(<MazoEditor onGuardar={onGuardar} onCancelar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre del mazo'), { target: { value: 'Los Mutantes' } })
    await seleccionarEstasisCompleto(user)

    const contadores = screen.getByTestId('contadores')
    expect(contadores.textContent).toContain('15/15')
    expect(contadores.textContent).toContain('45/45')
    expect(contadores.textContent).toContain('6/6')

    const guardar = screen.getByRole('button', { name: 'Guardar mazo' })
    expect(guardar).toBeEnabled()
    await user.click(guardar)
    expect(onGuardar).toHaveBeenCalledTimes(1)
    const recibido = onGuardar.mock.calls[0][0] as { nombre: string; cardIds: string[] }
    expect(recibido.nombre).toBe('Los Mutantes')
    expect(recibido.cardIds).toHaveLength(66)
  })

  it('con inicial: precarga nombre y selección reconstruida desde los cardIds', () => {
    render(<MazoEditor inicial={mazoValido('Reconstruido')} onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByLabelText('Nombre del mazo')).toHaveValue('Reconstruido')
    expect(screen.getByTestId('contadores').textContent).toContain('66/66')
  })

  it('cancelar vuelve al menú sin guardar', async () => {
    const user = userEvent.setup()
    const onCancelar = vi.fn()
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={onCancelar} />)
    await user.click(screen.getByRole('button', { name: 'Volver al menú' }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
  })
})
