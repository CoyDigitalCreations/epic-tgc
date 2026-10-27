import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EffectField } from '../EffectField'
import type { EfectoData } from '../../../../shared/types/cards'

const BASE: EfectoData = { tipo: 'disparo', efecto: 'destroy', objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' } }

describe('EffectField — filtros del objetivo plegables', () => {
  const panel = () => screen.getByText('Filtros del objetivo').closest('details') as HTMLDetailsElement

  it('van plegados por defecto, pero siguen en el DOM (todo es accesible)', () => {
    render(<EffectField label="" value={BASE} onChange={() => {}} cardType="Campeón" />)
    expect(panel().open).toBe(false)
    expect(panel()).toContainElement(screen.getByText('ATQ original max.'))
  })

  it('el título muestra cuántos filtros tienen valor', () => {
    const conFiltros: EfectoData = { ...BASE, objetivo: { ...BASE.objetivo!, filtros: { atqMax: 5, faccion: 'Orden' } } }
    render(<EffectField label="" value={conFiltros} onChange={() => {}} cardType="Campeón" />)
    expect(screen.getByText('Filtros del objetivo')).toHaveTextContent(/^Filtros del objetivo2$/)
  })

  it('sin filtros no muestra contador', () => {
    render(<EffectField label="" value={BASE} onChange={() => {}} cardType="Campeón" />)
    expect(screen.getByText('Filtros del objetivo')).toHaveTextContent(/^Filtros del objetivo$/)
  })

  it('editar un filtro dentro del panel sigue llamando a onChange con el filtro puesto', () => {
    const onChange = vi.fn()
    render(<EffectField label="" value={BASE} onChange={onChange} cardType="Campeón" />)
    const campo = screen.getByText('ATQ original max.').parentElement!.querySelector('input') as HTMLInputElement
    fireEvent.change(campo, { target: { value: '4' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ objetivo: expect.objectContaining({ filtros: { atqMax: 4 } }) }))
  })

  it('un objetivo sin filtros (Vínculo, «el Campeón que se invoca»…) no muestra el panel', () => {
    const invocado: EfectoData = { ...BASE, efecto: 'buff', objetivo: { tipo: 'invocado', controlador: 'propio', zona: 'campo' } }
    render(<EffectField label="" value={invocado} onChange={() => {}} cardType="Éter" />)
    expect(screen.queryByText('Filtros del objetivo')).toBeNull()
  })
})

describe('EffectField — stats en una sola fila', () => {
  it('ATQ, RES y «Buff por éter bloqueado» conviven y la casilla sigue ligada a su etiqueta', () => {
    const onChange = vi.fn()
    const buff: EfectoData = { tipo: 'pasivo', efecto: 'buff', stats: { ATQ: 1 }, objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' } }
    render(<EffectField label="" value={buff} onChange={onChange} cardType="Campeón" />)
    expect(screen.getByText('ATQ')).toBeInTheDocument()
    expect(screen.getByText('RES')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Buff por éter bloqueado'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ buffPerBlockedEther: true }))
  })

  it('sin etiqueta no se pinta el encabezado vacío', () => {
    const { container } = render(<EffectField label="" value={BASE} onChange={() => {}} cardType="Campeón" />)
    expect(container.querySelector('p.text-xs.font-semibold')).toBeNull()
  })
})
