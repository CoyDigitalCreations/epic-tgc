import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AVISOS, CARTAS, CARTAS_ANTES, CARTAS_ELENA_32_DS_ANTES, carta } from '../test/cartasReales'
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
      'ID', 'Carta', 'Tipo', 'Rareza', 'Coste', 'ATQ', 'RES', 'Suma', 'Suma objetivo', 'Impuesto', 'Índice', 'Estado', 'Semáforo', 'Efecto por coste', 'Tabú',
    ])
    expect(within(tabla()).getAllByRole('row')).toHaveLength(67)
  })

  // Rediseño de Estásis: Elena es 3/2 (sigue por debajo) e Isolde 3/6 coste 4 (ya dentro); «por encima» lo ilustra Draven (DS-012).
  it('marca fuera de banda a Elena (por debajo) y a Draven (por encima), deja dentro a Isolde y no marca a Aurora ni Ragnar', () => {
    // Elena real (4/2, suma 6) ya está dentro de banda; el caso «por debajo» usa la Elena de antes (3/2, suma 5).
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    expect(celdas(/^FB-015/).slice(0, 12)).toEqual([
      'FB-015', 'Elena de Casa Serena', 'Campeón', 'Poco Común', '3', '4', '2', '6', '7.9', '0.1', '2.3', 'Dentro de banda',
    ])
    cleanup()
    // Draven de antes (4/4, «por encima»): con el rediseño de Disonancia (Lote 2) la real es 3/3 y cabe en banda, así que este caso usa la Disonancia de antes
    render(<Auditoria cartas={CARTAS_ELENA_32_DS_ANTES} avisos={AVISOS} />)
    expect(celdas(/^FB-015/).slice(0, 12)).toEqual([
      'FB-015', 'Elena de Casa Serena', 'Campeón', 'Poco Común', '3', '3', '2', '5', '7.9', '0.1', '2.3', 'Fuera de banda: por debajo',
    ])
    expect(celdas(/^DS-012/)[11]).toBe('Fuera de banda: por encima')
    // Intención cambiada con el tope de costo del 50 %: Isolde (3/6, suma 9) ya no cabe con su impuesto 1.4 (máximo 8.6)
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

  it('la columna «Efecto por coste» dice OK o el motivo corto, y una carta que falla no sale verde', () => {
    // El Éter del Despertar de antes del rediseño (Inmortal mientras bloqueado, índice 3.5) conserva el caso del tope de efecto.
    render(<Auditoria cartas={CARTAS_ANTES} avisos={AVISOS} />)
    // Tope de efecto estricto: Éter del Despertar (semáforo amarillo) pasa a rojo con su motivo.
    const despertar = celdas(/^FB-008/)
    expect(despertar[12]).toBe('Rojo')
    expect(despertar[13]).toBe('índice 3.5 > tope 2')
    // Lote 3: el Éter de la Sangre Eterna (draw, coste 1) queda exento del coste mínimo por verbo y ya no sale en rojo
    // (el caso «verbo bajo su coste» para un Campeón se prueba en efectoPorCoste.test.ts).
    const sangre = celdas(/^FB-003/)
    expect(sangre[12]).toBe('Verde')
    expect(sangre[13]).toBe('OK')
    // Una carta que pasa dice OK y conserva su semáforo.
    const rowena = celdas(/^FB-021/)
    expect(rowena[12]).toBe('Verde')
    expect(rowena[13]).toBe('OK')
    expect(within(tabla()).getByLabelText('Efecto por coste: índice 3.5 > tope 2')).toBeInTheDocument()
  })

  it('la columna «Tabú» dice puntos, nivel máximo y veredicto en palabras, sin cambiar las demás', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    const tabu = (id: RegExp) => celdas(id)[14]
    expect(tabu(/^FB-015/)).toBe('2 · nivel 2 · En el límite') // Elena declara 2 ataques
    expect(tabu(/^FB-010/)).toBe('6 · nivel 2 · Exenta') // Aurora: Única
    expect(tabu(/^DS-007/)).toBe('1 · nivel 1 · Excede') // Éter de coste 1 que arrebata Éter
    expect(tabu(/^FB-021/)).toBe('0 · nivel 0 · Dentro')
    expect(tabu(/^FB-025/)).toBe('0 · nivel 0 · Sin veredicto') // Vínculo de coste 0
    expect(celdas(/^FB-015/)[12]).toBe('Verde') // el semáforo de siempre
  })

  it('el tabú que excede se marca en rojo y con texto', () => {
    render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
    const celda = within(within(tabla()).getByRole('row', { name: /^DS-008/ })).getByText(/Excede/)
    expect(celda).toHaveClass('text-red-300')
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

  describe('enlace «Analizar»', () => {
    it('con onAnalizar agrega la columna y un botón por fila que avisa el id de la carta', async () => {
      const alAnalizar = vi.fn()
      render(<Auditoria cartas={CARTAS} avisos={AVISOS} onAnalizar={alAnalizar} />)
      expect(within(tabla()).getAllByRole('columnheader').at(-1)).toHaveTextContent('Analizar')
      expect(within(tabla()).getAllByRole('button', { name: /^Analizar / })).toHaveLength(66)
      await userEvent.click(screen.getByRole('button', { name: /^Analizar Elena/ }))
      expect(alAnalizar).toHaveBeenCalledExactlyOnceWith('FB-015')
    })

    it('sin onAnalizar no hay columna ni botones', () => {
      render(<Auditoria cartas={CARTAS} avisos={AVISOS} />)
      expect(within(tabla()).queryByRole('columnheader', { name: 'Analizar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Analizar / })).not.toBeInTheDocument()
    })
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
      // Con la Elena de antes (3/2) y la Disonancia de antes hay 6 ajustes (Elena, Isolde y cuatro de Disonancia); con las reales (Lote 2) solo queda Isolde.
      render(<Auditoria cartas={CARTAS_ELENA_32_DS_ANTES} avisos={AVISOS} />)
      await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
      expect(blobs).toHaveLength(1)
      expect(blobs[0].type).toBe('application/json')
      expect(descargas).toEqual([{ href: 'blob:ajustes', download: 'ajustes-balance.json' }])
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ajustes')
      const texto = await blobs[0].text()
      const json = JSON.parse(texto) as { version: string; cambios: { id: string; antes: unknown; despues: unknown; motivo: string }[] }
      expect(json.version).toBe('v1')
      expect(json.cambios).toHaveLength(6)
      expect(json.cambios[0].id).toBe('DS-011')
      expect(json.cambios.find((c) => c.id === 'FB-015')).toMatchObject({
        antes: { poder: 3, resistencia: 2 },
        despues: { poder: 4, resistencia: 2 },
      })
    })

    it('exporta todo lo publicado aunque haya filtros, y nunca la referencia', async () => {
      const referencia = { ...carta('Elena'), id: 'PR-999', esReferencia: true }
      const soloEstasis = CARTAS_ELENA_32_DS_ANTES.filter((c) => c.mazo === 'estasis')
      render(<Auditoria cartas={soloEstasis} publicadas={[...CARTAS_ELENA_32_DS_ANTES, referencia]} avisos={AVISOS} />)
      await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))
      await waitFor(() => expect(blobs).toHaveLength(1))
      const json = JSON.parse(await blobs[0].text()) as { cambios: { id: string }[] }
      expect(json.cambios.map((c) => c.id)).toHaveLength(6)
      expect(json.cambios.map((c) => c.id)).toContain('DS-011')
      expect(json.cambios.map((c) => c.id)).not.toContain('PR-999')
    })
  })
})
