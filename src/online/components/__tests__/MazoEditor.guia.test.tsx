import { render, screen, fireEvent, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { MazoEditor } from '../MazoEditor'
import { ESTASIS_CARDS, cardArtPath } from '../../../shared/data/paquetes'
import { useCardStore } from '../../../forge/store/useCardStore'
import { clearCardImages } from '../../../forge/utils/image-store'
import type { AnyCard } from '../../../shared/types'

/** Arma la selección completa de Estásis: 15 Éter + 45 Principal + 6 Vínculos = 66 copias. */
function seleccionarEstasisCompleto() {
  for (const c of ESTASIS_CARDS) {
    const copias = Number(c.limiteCopias ?? 1)
    const boton = screen.getByRole('button', { name: `Agregar copia de ${c.name}` })
    for (let i = 0; i < copias; i++) fireEvent.click(boton)
  }
}

describe('MazoEditor — guía del mazo (qué falta, inspector, lista agrupada)', () => {
  beforeEach(async () => {
    await clearCardImages()
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
  })

  it('dice qué falta para poder guardar y se actualiza al avanzar', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByText('Falta: un nombre · 15 de Éter · 45 de Principal · 6 Vínculos')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Nombre del mazo'), { target: { value: 'Parcial' } })
    expect(screen.getByText('Falta: 15 de Éter · 45 de Principal · 6 Vínculos')).toBeInTheDocument()
  })

  it('con el mazo completo avisa que está listo para guardar', { timeout: 30_000 }, () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Nombre del mazo'), { target: { value: 'Completo' } })
    seleccionarEstasisCompleto()
    expect(screen.getByText('✓ Mazo listo para guardar')).toBeInTheDocument()
    expect(screen.queryByText(/^Falta:/)).not.toBeInTheDocument()
  })

  it('el clic en una carta del catálogo la muestra en el inspector', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[1]
    const boton = screen.getByRole('button', { name: `Agregar copia de ${carta.name}` })
    fireEvent.click(boton.closest('.group')!)

    const inspector = screen.getByRole('region', { name: 'Inspector de carta' })
    expect(await within(inspector).findByRole('img', { name: carta.name })).toBeInTheDocument()
  })

  it('pasar el mouse por una carta NO cambia el inspector: solo el clic', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const [, a, b] = ESTASIS_CARDS
    const tarjeta = (nombre: string) =>
      screen.getByRole('button', { name: `Agregar copia de ${nombre}` }).closest('.group')!
    const inspector = screen.getByRole('region', { name: 'Inspector de carta' })

    fireEvent.click(tarjeta(a.name))
    expect(await within(inspector).findByRole('img', { name: a.name })).toBeInTheDocument()

    // El hover sobre otra carta no mueve lo que se está mirando
    fireEvent.mouseEnter(tarjeta(b.name))
    fireEvent.mouseOver(tarjeta(b.name))
    expect(within(inspector).getByRole('img', { name: a.name })).toBeInTheDocument()
    expect(within(inspector).queryByRole('img', { name: b.name })).not.toBeInTheDocument()

    // El clic sí
    fireEvent.click(tarjeta(b.name))
    expect(await within(inspector).findByRole('img', { name: b.name })).toBeInTheDocument()
    expect(within(inspector).queryByRole('img', { name: a.name })).not.toBeInTheDocument()
  })

  it('una carta de la lista del mazo también se inspecciona con clic, no con hover', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const [, a, b] = ESTASIS_CARDS
    for (const c of [a, b]) {
      fireEvent.click(screen.getByRole('button', { name: `Agregar copia de ${c.name}` }))
    }
    const inspector = screen.getByRole('region', { name: 'Inspector de carta' })
    const lista = screen.getByRole('region', { name: 'Tu mazo' })
    const fila = (nombre: string) => within(lista).getByRole('button', { name: `Sacar ${nombre} del mazo` }).closest('div[class*="group/fila"]')!

    fireEvent.click(fila(a.name))
    expect(await within(inspector).findByRole('img', { name: a.name })).toBeInTheDocument()

    fireEvent.mouseEnter(fila(b.name))
    expect(within(inspector).queryByRole('img', { name: b.name })).not.toBeInTheDocument()
  })

  it('la lista del mazo permite sumar y sacar copias sin volver al catálogo', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    // Una carta con al menos 2 copias permitidas, para poder sumar desde la lista
    const carta = ESTASIS_CARDS.find((c) => Number(c.limiteCopias ?? 1) >= 2)!
    fireEvent.click(screen.getByRole('button', { name: `Agregar copia de ${carta.name}` }))

    const lista = screen.getByRole('region', { name: 'Tu mazo' })
    expect(within(lista).getByRole('button', { name: `Sacar ${carta.name} del mazo` })).toBeInTheDocument()
    expect(screen.getByTestId('contadores').textContent).toContain('Total 1/66')

    fireEvent.click(within(lista).getByRole('button', { name: `Sumar ${carta.name} al mazo` }))
    expect(screen.getByTestId('contadores').textContent).toContain('Total 2/66')

    fireEvent.click(within(lista).getByRole('button', { name: `Sacar ${carta.name} del mazo` }))
    fireEvent.click(within(lista).getByRole('button', { name: `Sacar ${carta.name} del mazo` }))
    // Sin copias la fila desaparece de la lista
    expect(within(lista).queryByRole('button', { name: `Sacar ${carta.name} del mazo` })).not.toBeInTheDocument()
    expect(screen.getByTestId('contadores').textContent).toContain('Total 0/66')
  })

  it('"Sumar" desde la lista respeta el límite de copias de la carta', () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[0]
    const limite = Number(carta.limiteCopias ?? 1)
    fireEvent.click(screen.getByRole('button', { name: `Agregar copia de ${carta.name}` }))

    const lista = screen.getByRole('region', { name: 'Tu mazo' })
    const sumar = within(lista).getByRole('button', { name: `Sumar ${carta.name} al mazo` })
    for (let i = 0; i < limite + 2; i++) fireEvent.click(sumar)
    expect(screen.getByTestId('contadores').textContent).toContain(`Total ${limite}/66`)
    expect(sumar).toBeDisabled()
  })

  it('cada cupo muestra su barra: ✓ al completarse', { timeout: 30_000 }, () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const lista = screen.getByRole('region', { name: 'Tu mazo' })
    // Incompleto: sin ✓
    expect(within(lista).getByText('0/15')).toBeInTheDocument()
    expect(within(lista).queryByText(/✓/)).not.toBeInTheDocument()

    seleccionarEstasisCompleto()
    // Completo: cada barra marca ✓ con su cupo (texto exacto: el resumen oculto también contiene "15/15")
    expect(within(lista).getByText('✓ 15/15')).toBeInTheDocument()
    expect(within(lista).getByText('✓ 45/45')).toBeInTheDocument()
    expect(within(lista).getByText('✓ 6/6')).toBeInTheDocument()
  })
})

describe('MazoEditor — visor del arte completo', () => {
  beforeEach(async () => {
    await clearCardImages()
    useCardStore.getState().clearCards()
    localStorage.removeItem('epic-tgc-collection')
  })

  /** Hace activa (inspeccionada) una carta del catálogo y espera a que su carta física sea clickeable. */
  async function abrirArteDe(carta: AnyCard) {
    fireEvent.click(screen.getByRole('button', { name: `Agregar copia de ${carta.name}` }).closest('.group')!)
    fireEvent.click(await screen.findByRole('button', { name: `Ver arte completo de ${carta.name}` }))
    return screen.getByRole('dialog', { name: `Arte completo: ${carta.name}` })
  }

  it('el clic en la carta del inspector abre el arte completo de esa carta', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[1]
    const visor = await abrirArteDe(carta)

    const arte = within(visor).getByRole('img', { name: `Arte completo de ${carta.name}` })
    expect(arte).toHaveAttribute('src', cardArtPath(carta.id))
    expect(within(visor).getByText(carta.name)).toBeInTheDocument()
  })

  it('se cierra con Escape', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    await abrirArteDe(ESTASIS_CARDS[1])
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('se cierra con la ✕ y con un clic afuera, pero no con un clic sobre el arte', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    const carta = ESTASIS_CARDS[1]

    let visor = await abrirArteDe(carta)
    fireEvent.click(within(visor).getByRole('img', { name: `Arte completo de ${carta.name}` }))
    expect(screen.getByRole('dialog')).toBeInTheDocument() // el arte NO cierra

    fireEvent.click(within(visor).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    visor = await abrirArteDe(carta)
    fireEvent.click(visor) // el fondo oscuro sí cierra
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el visor no cambia el mazo ni los contadores', async () => {
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    await abrirArteDe(ESTASIS_CARDS[1])
    expect(screen.getByTestId('contadores').textContent).toContain('Total 0/66')
  })

  it('una carta custom SIN arte no ofrece el visor (no hay nada que mostrar)', () => {
    useCardStore.getState().loadCards([
      {
        id: 'custom-sin-arte',
        name: 'Guardián Estelar',
        type: 'Campeón',
        rarity: 'Rara',
        keywords: [],
        flavorText: '',
        limiteCopias: 3,
        stats: { cost: 3, poder: 4, resistencia: 4 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    render(<MazoEditor onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar copia de Guardián Estelar' }).closest('.group')!)

    // Es la carta inspeccionada (su detalle está en el inspector)…
    const inspector = screen.getByRole('region', { name: 'Inspector de carta' })
    expect(within(inspector).getAllByText('Guardián Estelar').length).toBeGreaterThan(0)
    // …pero su carta física no es un botón
    expect(screen.queryByRole('button', { name: /Ver arte completo de Guardián Estelar/ })).not.toBeInTheDocument()
  })
})
