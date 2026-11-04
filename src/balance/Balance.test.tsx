import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import Balance from './Balance'
import { instalarEntornoGraficas } from './test/entornoGraficas'

function Ubicacion() {
  return <output data-testid="url">{useLocation().search}</output>
}

function montar(entrada = '/balance') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <Balance />
      <Ubicacion />
    </MemoryRouter>,
  )
}

const PESTANAS = [
  ['resumen', 'Resumen por mazo'],
  ['dispersion', 'Dispersión de ATQ y RES'],
  ['presupuesto', 'Presupuesto de stats'],
  ['verbos', 'Mapa de verbos'],
  ['ranking', 'Ranking de poder'],
  ['curva', 'Curva de coste'],
  ['letalidad', 'Matriz de letalidad'],
  ['comparador', 'Comparador antes y después'],
  ['auditoria', 'Auditoría'],
] as const

const NOMBRE_INTERRUPTOR = 'Incluir cartas de referencia (paquete de pruebas, no publicado)'

describe('Balance', () => {
  let limpiar: () => void
  beforeEach(() => {
    limpiar = instalarEntornoGraficas()
  })
  afterEach(() => limpiar())

  it('muestra el encabezado y un texto de propósito en español neutro', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Tablero de balance' })).toBeInTheDocument()
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument()
  })

  it('ofrece las nueve vistas como pestañas y abre la primera', () => {
    montar()
    const tabs = within(screen.getByRole('tablist', { name: 'Vistas del tablero' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(PESTANAS.map(([, nombre]) => nombre))
    expect(screen.getByRole('tab', { name: 'Resumen por mazo' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Resumen por mazo' })).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /^Estásis/ })).getAllByRole('cell')[1]).toHaveTextContent('32')
  })

  it.each(PESTANAS)('la pestaña «%s» muestra su vista y guarda el parámetro vista', async (vista, nombre) => {
    montar()
    await userEvent.click(screen.getByRole('tab', { name: nombre }))
    expect(await screen.findByRole('heading', { level: 2, name: nombre })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: nombre })).toHaveAttribute('aria-selected', 'true')
    if (vista !== 'resumen') expect(screen.getByTestId('url')).toHaveTextContent(`vista=${vista}`)
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(nombre)
  })

  it('abre la vista indicada en la URL', () => {
    montar('/balance?vista=ranking')
    expect(screen.getByRole('tab', { name: 'Ranking de poder' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'Ranking de poder' })).toBeInTheDocument()
  })

  it('las flechas del teclado cambian de pestaña', async () => {
    montar()
    screen.getByRole('tab', { name: 'Resumen por mazo' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Dispersión de ATQ y RES' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Resumen por mazo' })).toHaveAttribute('aria-selected', 'true')
  })

  it('los filtros de la URL recortan las vistas', () => {
    montar('/balance?mazo=estasis')
    expect(screen.getByRole('form', { name: 'Filtros del tablero' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /^Estásis/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /^Disonancia/ })).not.toBeInTheDocument()
  })

  it('cambiar un filtro actualiza la URL', async () => {
    montar()
    await userEvent.selectOptions(screen.getByLabelText('Mazo'), 'disonancia')
    expect(screen.getByTestId('url')).toHaveTextContent('mazo=disonancia')
  })

  it.each(PESTANAS)('sin cartas con los filtros, «%s» muestra el estado vacío sin NaN', async (vista) => {
    montar(`/balance?coste=9&vista=${vista}`)
    expect(within(screen.getByRole('tabpanel')).getByRole('status')).toHaveTextContent(/Sin (cartas|Campeones) con estos filtros/)
    expect(document.body.textContent).not.toContain('NaN')
  })

  it('la Auditoría muestra los avisos del cargador', () => {
    montar('/balance?vista=auditoria')
    expect(screen.getByRole('list', { name: 'Avisos del cargador' })).toHaveTextContent('hasta_alba_oponente')
  })

  describe('cartas de referencia', () => {
    it('están apagadas por defecto', () => {
      montar()
      expect(screen.getByRole('switch', { name: NOMBRE_INTERRUPTOR })).not.toBeChecked()
      expect(screen.queryByText('Referencia (no publicadas)')).not.toBeInTheDocument()
    })

    it('al activarlas aparecen etiquetadas y no cambian pool, conteos ni exportación', async () => {
      const blobs: Blob[] = []
      const original = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL }
      URL.createObjectURL = vi.fn((b: Blob) => {
        blobs.push(b)
        return 'blob:x'
      })
      URL.revokeObjectURL = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      try {
        montar('/balance?vista=auditoria')
        const filas = () => within(screen.getByRole('table', { name: /auditoría de las cartas/i })).getAllByRole('row')
        expect(filas()).toHaveLength(66)

        await userEvent.click(screen.getByRole('switch', { name: NOMBRE_INTERRUPTOR }))
        const tabla = await screen.findByRole('table', { name: /cartas de referencia/i })
        expect(within(tabla).getAllByText('Referencia (no publicadas)').length).toBeGreaterThan(0)

        // Ninguna vista cambia: 65 cartas, pool de 18, y la exportación solo trae lo publicado.
        expect(filas()).toHaveLength(66)
        await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
        const json = JSON.parse(await blobs[0].text()) as { cambios: { id: string }[] }
        expect(json.cambios).toHaveLength(8)
        expect(json.cambios.some((c) => c.id.startsWith('PR-'))).toBe(false)

        await userEvent.click(screen.getByRole('tab', { name: 'Matriz de letalidad' }))
        const letalidad = await screen.findByRole('table', { name: /letalidad por campeón/i })
        expect(within(letalidad).getAllByRole('row')).toHaveLength(19)
        await userEvent.click(screen.getByRole('tab', { name: 'Resumen por mazo' }))
        await waitFor(() => expect(screen.getByRole('row', { name: /^Estásis/ })).toHaveTextContent('32'))
        expect(screen.getByRole('row', { name: /^Disonancia/ })).toHaveTextContent('33')
      } finally {
        URL.createObjectURL = original.crear
        URL.revokeObjectURL = original.revocar
        vi.restoreAllMocks()
      }
    })
  })
})
