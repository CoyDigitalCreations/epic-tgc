import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AVISOS, CARTAS, carta } from '../test/cartasReales'
import { Auditoria } from './Auditoria'

describe('Auditoria', () => {
  const tabla = () => screen.getByRole('table', { name: /auditoría de las cartas/i })
  const celdas = (nombre: RegExp) =>
    within(within(tabla()).getByRole('row', { name: nombre }))
      .getAllByRole('cell')
      .map((c) => c.textContent)

  it('lista todas las cartas con sus indicadores', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Auditoría' })).toBeInTheDocument()
    expect(within(tabla()).getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'ID', 'Carta', 'Tipo', 'Rareza', 'Coste', 'ATQ', 'RES', 'Suma', 'Suma objetivo', 'Impuesto', 'Índice', 'Estado', 'Semáforo',
    ])
    expect(within(tabla()).getAllByRole('row')).toHaveLength(66)
  })

  it('marca fuera de banda a Elena e Isolde y no a Aurora ni Ragnar', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    expect(celdas(/^FB-015/).slice(0, 12)).toEqual([
      'FB-015', 'Elena, Despertar del Éter', 'Campeón', 'Poco Común', '3', '3', '0', '3', '10', '0', '0.85', 'Fuera de banda: por debajo',
    ])
    expect(celdas(/^FB-014/)[11]).toBe('Fuera de banda: por encima')
    expect(celdas(/^FB-010/)[11]).toBe('Exenta: dentro de su tope propio')
    expect(celdas(/^DS-010/)[11]).toBe('Exenta: dentro de su tope propio')
  })

  it('una carta que no es Campeón muestra rayas en los stats', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    const mistica = celdas(/^FB-021/)
    expect(mistica.slice(5, 10)).toEqual(['—', '—', '—', '—', '0'])
    expect(mistica[12]).toBe('Verde')
  })

  it('muestra los avisos del cargador', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    const lista = screen.getByRole('list', { name: 'Avisos del cargador' })
    expect(within(lista).getByText(/FB-017: duración desconocida «hasta_alba_oponente»/)).toBeInTheDocument()
  })

  it('sin avisos lo dice', () => {
    render(<Auditoria cartas={CARTAS} avisos={[]} />)
    expect(screen.queryByRole('list', { name: 'Avisos del cargador' })).not.toBeInTheDocument()
    expect(screen.getByText('Sin avisos del cargador')).toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío pero deja la exportación', () => {
    render(<Auditoria cartas={[]} publicadas={CARTAS} avisos={AVISOS} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
    expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeInTheDocument()
  })

  describe('Exportar JSON', () => {
    let blobs: Blob[]
    let descargas: { href: string; download: string }[]
    const original = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL }

    beforeEach(() => {
      blobs = []
      descargas = []
      URL.createObjectURL = vi.fn((b: Blob) => {
        blobs.push(b)
        return 'blob:ajustes'
      })
      URL.revokeObjectURL = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        descargas.push({ href: this.href, download: this.download })
      })
    })
    afterEach(() => {
      URL.createObjectURL = original.crear
      URL.revokeObjectURL = original.revocar
      vi.restoreAllMocks()
    })

    it('descarga un Blob JSON con el formato de simulación', async () => {
      render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
      await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
      expect(blobs).toHaveLength(1)
      expect(blobs[0].type).toBe('application/json')
      expect(descargas).toEqual([{ href: 'blob:ajustes', download: 'ajustes-balance.json' }])
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ajustes')
      const texto = await blobs[0].text()
      const json = JSON.parse(texto) as { version: string; cambios: { id: string; antes: unknown; despues: unknown; motivo: string }[] }
      expect(json.version).toBe('v1')
      expect(json.cambios).toHaveLength(8)
      expect(json.cambios[0].id).toBe('DS-011')
      expect(json.cambios.find((c) => c.id === 'FB-015')).toMatchObject({
        antes: { poder: 3, resistencia: 0 },
        despues: { poder: 6, resistencia: 2 },
      })
    })

    it('exporta todo lo publicado aunque haya filtros, y nunca la referencia', async () => {
      const referencia = { ...carta('Elena'), id: 'PR-999', esReferencia: true }
      const soloEstasis = CARTAS.filter((c) => c.mazo === 'estasis')
      render(<Auditoria cartas={soloEstasis} publicadas={[...CARTAS, referencia]} avisos={AVISOS} />)
      await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
      await waitFor(() => expect(blobs).toHaveLength(1))
      const json = JSON.parse(await blobs[0].text()) as { cambios: { id: string }[] }
      expect(json.cambios.map((c) => c.id)).toHaveLength(8)
      expect(json.cambios.map((c) => c.id)).toContain('DS-011')
      expect(json.cambios.map((c) => c.id)).not.toContain('PR-999')
    })
  })
})
