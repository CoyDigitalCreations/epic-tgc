import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { ResumenMazo } from './ResumenMazo'

// La vista trae dos tablas con una fila por mazo (resumen y tabú): cada ayudante mide la suya.
const celdasDe = (tabla: RegExp, nombre: string) =>
  within(within(screen.getByRole('table', { name: tabla })).getByRole('row', { name: new RegExp(`^${nombre}`) }))
    .getAllByRole('cell')
    .map((c) => c.textContent)
const celdas = (nombre: string) => celdasDe(/^resumen por mazo/i, nombre)
const celdasTabu = (nombre: string) => celdasDe(/^tabú por mazo/i, nombre)

describe('ResumenMazo', () => {
  it('muestra por mazo cartas, Campeones, identidad, fuera de banda y rotas', () => {
    render(<ResumenMazo cartas={CARTAS} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Resumen por mazo' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /resumen por mazo/i })).toBeInTheDocument()
    // Bandas v1.1: rotas = Campeones que pasan su presupuesto + cartas sin stats en rojo (1 Vínculo en Estásis, 3 en Disonancia).
    // Rediseño de Estásis (33 cartas): ningún Campeón sale de banda (Elena 4/2 suma 6 ya cabe, igual que Vaela, Mira, Titania e Isolde).
    // Disonancia (antes del Lote 2): Kael, Draven, Marek, Emisario.
    // Tope de efecto y coste mínimo por verbo suman a las rotas: Estásis solo FB-003 (verbo draw pide coste 2) más FB-028 (Vínculo en rojo);
    // Disonancia +5 (DS-002, DS-004, DS-006, DS-019, DS-020; Draven ya era rota).
    // Tope de efecto estricto para todo tipo no exento: Disonancia +1 (DS-009). Estásis ya no tiene ninguna (FB-005, FB-006, FB-008 y FB-032 pasan).
    // Con el tope de costo del 50 % Isolde (índice 4.75) sale de banda por encima y pasa a rota: Estásis 1 fuera y 3 rotas.
    // Lote 3 (Disonancia): los Éteres quedan exentos del coste mínimo por verbo (costeMinimoExento), así que FB-003 deja de ser rota: Estásis 1 fuera y 2 rotas
    // (Isolde y el Vínculo FB-028 en rojo).
    expect(celdas('Estásis')).toEqual(['Estásis', '33', '10', '31.6', '1', '2'])
    // Rediseño de Disonancia (Lote 2): identidad 39.5 % (antes 29.7), 0 Campeones fuera de banda (antes 4) y 9 rotas: los 5 Éteres que
    // «exceden» solo por el coste mínimo por verbo (DS-001, 002, 004, 007, 008; los arregla la exención de Éteres de coste 1 del Lote 3)
    // y 4 Vínculos en rojo (DS-026, 028, 029, 030). Cifras de la propuesta: identidad 39.5 %, 0 fuera.
    // Lote 3: la exención de Éteres de coste 1 deja las rotas en 4 (solo los Vínculos: coste 0, desvío = índice > 1.5, igual que FB-028 en Estásis),
    // y steal_ether pasa a identidad de Disonancia (DS-007, DS-010, DS-012, DS-028): identidad 19/38 = 50 % (antes 15/38 = 39.5), 0 fuera.
    expect(celdas('Disonancia')).toEqual(['Disonancia', '33', '10', '50', '0', '4'])
  })

  it('explica qué es una carta rota', () => {
    render(<ResumenMazo cartas={CARTAS} />)
    expect(screen.getByText(/rota/i, { selector: 'p' })).toBeInTheDocument()
  })

  it('con un solo mazo visible no muestra el otro', () => {
    render(<ResumenMazo cartas={CARTAS.filter((c) => c.mazo === 'estasis')} />)
    expect(screen.getAllByRole('row', { name: /^Estásis/ })).toHaveLength(2)
    expect(screen.queryByRole('row', { name: /^Disonancia/ })).not.toBeInTheDocument()
  })

  describe('tabú por mazo', () => {
    it('muestra por mazo el tabú total, el medio, las cartas por nivel y las que exceden su presupuesto', () => {
      render(<ResumenMazo cartas={CARTAS} />)
      expect(screen.getByRole('heading', { level: 3, name: 'Tabú por mazo' })).toBeInTheDocument()
      expect(
        within(screen.getByRole('table', { name: /^tabú por mazo/i }))
          .getAllByRole('columnheader')
          .map((c) => c.textContent),
      ).toEqual(['Mazo', 'Tabú total', 'Tabú medio', 'Cartas de nivel 0', 'Cartas de nivel 1', 'Cartas de nivel 2', 'Cartas de nivel 3', 'Exceden su presupuesto de tabú'])
      // Estásis: 18 puntos, 0.55 por carta, 23/6/4/0 por nivel y ninguna excede. Aurora (6 puntos) es la más cargada y está exenta.
      expect(celdasTabu('Estásis')).toEqual(['Estásis', '18', '0.55', '23', '6', '4', '0', '0'])
      // Disonancia: 17 puntos, 0.52 por carta, 21/11/1/0 por nivel y 3 exceden (los Éteres de coste 1 DS-006, DS-007 y DS-008).
      expect(celdasTabu('Disonancia')).toEqual(['Disonancia', '17', '0.52', '21', '11', '1', '0', '3'])
    })

    it('explica la escala y que las Únicas y los Soberanos quedan exentos pero los Éteres no', () => {
      render(<ResumenMazo cartas={CARTAS} />)
      expect(screen.getByText(/mide cuántas reglas del manual rompen/i, { selector: 'p' })).toHaveTextContent(/invariante del motor/)
      expect(screen.getByText(/mide cuántas reglas del manual rompen/i, { selector: 'p' })).toHaveTextContent(/los Éteres no/)
    })

    it('con un solo mazo visible no muestra el otro en la tabla de tabú', () => {
      render(<ResumenMazo cartas={CARTAS.filter((c) => c.mazo === 'disonancia')} />)
      const tabla = screen.getByRole('table', { name: /^tabú por mazo/i })
      expect(within(tabla).getByRole('row', { name: /^Disonancia/ })).toBeInTheDocument()
      expect(within(tabla).queryByRole('row', { name: /^Estásis/ })).not.toBeInTheDocument()
    })
  })

  it('sin cartas muestra el estado vacío y ninguna tabla', () => {
    render(<ResumenMazo cartas={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
