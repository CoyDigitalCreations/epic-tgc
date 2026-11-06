import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { ResumenMazo } from './ResumenMazo'

const celdas = (nombre: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${nombre}`) }))
    .getAllByRole('cell')
    .map((c) => c.textContent)

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
    expect(screen.getByRole('row', { name: /^Estásis/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /^Disonancia/ })).not.toBeInTheDocument()
  })

  it('sin cartas muestra el estado vacío y ninguna tabla', () => {
    render(<ResumenMazo cartas={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
