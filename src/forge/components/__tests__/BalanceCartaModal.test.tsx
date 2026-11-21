import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { AnyCard } from '../../../shared/types'
import { BalanceCartaModal } from '../modals/BalanceCartaModal'

const carta = (p: Record<string, unknown> = {}): AnyCard =>
  ({
    id: 'custom-1',
    name: 'Guardián de Prueba',
    type: 'Campeón',
    rarity: 'Común',
    keywords: [],
    flavorText: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    stats: { cost: 2, poder: 9, resistencia: 1 },
    ...p,
  }) as AnyCard

describe('BalanceCartaModal', () => {
  it('es un diálogo con el nombre de la carta y su coste', () => {
    render(<BalanceCartaModal card={carta()} onCerrar={() => {}} />)
    const dialogo = screen.getByRole('dialog', { name: /Balance de Guardián de Prueba/ })
    expect(dialogo).toHaveTextContent(/Campeón · coste 2/)
  })

  it('dice qué rebasa: ATQ 9 con coste 2 pasa el tope de 4', () => {
    render(<BalanceCartaModal card={carta()} onCerrar={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Rebasa .* límites?: .*tope de atq/)
    const fila = within(screen.getByRole('table', { name: /presupuestos e índices/i })).getByRole('row', { name: /Tope de ATQ/ })
    expect(within(fila).getByText('Rebasa')).toBeInTheDocument()
  })

  it('una carta dentro de todo lo dice', () => {
    render(<BalanceCartaModal card={carta({ stats: { cost: 3, poder: 3, resistencia: 3 } })} onCerrar={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('No rebasa ningún límite')
  })

  it('muestra los presupuestos pero NO la letalidad ni el ajuste del Tablero', () => {
    render(<BalanceCartaModal card={carta()} onCerrar={() => {}} />)
    expect(screen.getByRole('region', { name: 'Límites de la carta' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Poder de la carta' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tabú' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Letalidad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ajuste propuesto' })).not.toBeInTheDocument()
    expect(screen.getByText(/Cuántos rivales mata .* se ve en el Tablero de balance/)).toBeInTheDocument()
  })

  it('avisa de datos que el balanceador no conoce', () => {
    render(<BalanceCartaModal card={carta({ keywords: ['Volador'] })} onCerrar={() => {}} />)
    expect(within(screen.getByRole('list', { name: 'Avisos de la carta' })).getByText(/Volador/)).toBeInTheDocument()
  })

  it('se cierra con «Listo», con la ✕ y con Escape', () => {
    const onCerrar = vi.fn()
    render(<BalanceCartaModal card={carta()} onCerrar={onCerrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' })) // la ✕ de la cabecera
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCerrar).toHaveBeenCalledTimes(3)
  })

  it('el foco llega al botón «Listo» al abrir', () => {
    render(<BalanceCartaModal card={carta()} onCerrar={() => {}} />)
    expect(document.activeElement).toBe(within(screen.getByRole('dialog')).getByRole('button', { name: 'Listo' }))
  })

  it('una carta sin nombre no deja el título vacío', () => {
    render(<BalanceCartaModal card={carta({ name: '' })} onCerrar={() => {}} />)
    expect(screen.getByRole('dialog', { name: /Balance de carta sin nombre/ })).toBeInTheDocument()
  })
})
