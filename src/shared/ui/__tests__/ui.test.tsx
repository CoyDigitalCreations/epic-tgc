import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Boton } from '../Boton'
import { Dock } from '../Dock'
import { Modal } from '../Modal'
import { Seccion } from '../Seccion'
import { TileCarta } from '../TileCarta'

describe('Modal', () => {
  it('es un diálogo modal cuyo nombre accesible es su título', () => {
    render(
      <Modal titulo="Cadena Global" subtitulo="Elegí o pasá prioridad.">
        <p>contenido</p>
      </Modal>,
    )
    const dialogo = screen.getByRole('dialog', { name: 'Cadena Global' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(within(dialogo).getByText('Elegí o pasá prioridad.')).toBeInTheDocument()
    expect(within(dialogo).getByText('contenido')).toBeInTheDocument()
  })

  it('el pie y la ✕ solo aparecen si se piden', async () => {
    const user = userEvent.setup()
    const onCerrar = vi.fn()
    const { rerender } = render(
      <Modal titulo="A">
        x
      </Modal>,
    )
    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()

    rerender(
      <Modal titulo="A" onCerrar={onCerrar} pie={<button>Aceptar</button>}>
        x
      </Modal>,
    )
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
  })

  it('el ícono es decorativo: no se lee', () => {
    render(
      <Modal titulo="Prevenir" icono="🛡">
        x
      </Modal>,
    )
    expect(screen.getByText('🛡')).toHaveAttribute('aria-hidden', 'true')
  })

  it('dos modales a la vez no comparten el id del título', () => {
    render(
      <>
        <Modal titulo="Uno">x</Modal>
        <Modal titulo="Dos">y</Modal>
      </>,
    )
    expect(screen.getByRole('dialog', { name: 'Uno' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Dos' })).toBeInTheDocument()
  })
})

describe('Boton', () => {
  it('el atajo es solo una pista visual: no cambia el nombre accesible', () => {
    render(<Boton atajo="↵">Aceptar efectos</Boton>)
    expect(screen.getByRole('button', { name: 'Aceptar efectos' })).toBeInTheDocument()
  })

  it('por defecto no envía formularios (type="button") y respeta disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Boton disabled onClick={onClick}>
        Pagar
      </Boton>,
    )
    const boton = screen.getByRole('button', { name: 'Pagar' })
    expect(boton).toHaveAttribute('type', 'button')
    await user.click(boton)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Dock', () => {
  it('es una región con nombre; "Cerrar" aparece solo con onCerrar', async () => {
    const user = userEvent.setup()
    const onCerrar = vi.fn()
    render(
      <Dock etiquetaAria="Cementerio" titulo="Cementerio" onCerrar={onCerrar}>
        <p>cartas</p>
      </Dock>,
    )
    expect(screen.getByRole('region', { name: 'Cementerio' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('sin título ni acciones no dibuja cabecera', () => {
    render(
      <Dock etiquetaAria="Solo contenido">
        <p>hola</p>
      </Dock>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})

describe('TileCarta', () => {
  it('con `seleccionada` expone aria-pressed y el ✓; sin ella no es un botón de alternar', () => {
    const { rerender } = render(<TileCarta seleccionada={false}>carta</TileCarta>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(<TileCarta seleccionada>carta</TileCarta>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true')

    rerender(<TileCarta>carta</TileCarta>)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
  })

  it('deshabilitada no dispara el clic', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <TileCarta disabled onClick={onClick}>
        carta
      </TileCarta>,
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('muestra el pie bajo la carta', () => {
    render(<TileCarta pie="aporte 1">carta</TileCarta>)
    expect(screen.getByText('aporte 1')).toBeInTheDocument()
  })
})

describe('Seccion', () => {
  it('muestra el contador solo si se pasa (incluido el 0)', () => {
    const { rerender } = render(<Seccion>Stack</Seccion>)
    expect(screen.getByRole('heading', { name: 'Stack' })).toBeInTheDocument()
    rerender(<Seccion cantidad={0}>Stack</Seccion>)
    expect(screen.getByRole('heading', { name: /^Stack\s*0$/ })).toBeInTheDocument()
  })
})
