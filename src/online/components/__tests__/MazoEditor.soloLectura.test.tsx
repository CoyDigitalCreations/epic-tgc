import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { MazoEditor } from '../MazoEditor'
import { MAZOS } from '../../mazos'

const estasis = MAZOS[0]
const borrador = { nombre: estasis.nombre, cardIds: estasis.cardIds }

describe('MazoEditor en solo lectura (mazo oficial)', () => {
  it('muestra la lista del mazo y el inspector, sin catálogo, sin nombre editable y sin guardar', { timeout: 30_000 }, () => {
    render(<MazoEditor soloLectura borrador={borrador} onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Mazo oficial: Estásis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lista del mazo' })).toBeInTheDocument()
    expect(screen.getByTestId('contadores').textContent).toContain('66/66')
    expect(screen.queryByRole('region', { name: 'Catálogo de cartas' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Nombre del mazo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar mazo' })).not.toBeInTheDocument()
  })

  it('no ofrece sumar ni sacar cartas del mazo', { timeout: 30_000 }, () => {
    render(<MazoEditor soloLectura borrador={borrador} onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.queryAllByRole('button', { name: /^Sumar / })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /^Sacar / })).toHaveLength(0)
  })

  it('«Copiar a mis mazos» llama a onCopiar y «Volver» a onCancelar', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    const onCopiar = vi.fn()
    const onCancelar = vi.fn()
    render(<MazoEditor soloLectura borrador={borrador} onCopiar={onCopiar} onGuardar={vi.fn()} onCancelar={onCancelar} />)
    await user.click(screen.getByRole('button', { name: 'Copiar a mis mazos' }))
    expect(onCopiar).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
  })

  it('con la copia bloqueada deshabilita el botón y muestra el motivo', { timeout: 30_000 }, () => {
    render(
      <MazoEditor soloLectura borrador={borrador} onCopiar={vi.fn()} copiaBloqueada="Ya tienes 5 mazos personalizados." onGuardar={vi.fn()} onCancelar={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Copiar a mis mazos' })).toBeDisabled()
    expect(screen.getByText('Ya tienes 5 mazos personalizados.')).toBeInTheDocument()
  })
})

describe('MazoEditor con borrador (copia de un oficial)', () => {
  it('arranca como mazo NUEVO con el nombre y las 66 cartas del borrador, listo para guardar', { timeout: 30_000 }, () => {
    render(<MazoEditor borrador={{ nombre: 'Estásis (copia)', cardIds: estasis.cardIds }} onGuardar={vi.fn()} onCancelar={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Nuevo mazo personalizado' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nombre del mazo')).toHaveValue('Estásis (copia)')
    expect(screen.getByRole('button', { name: 'Guardar mazo' })).toBeEnabled()
  })

  it('si onGuardar devuelve un error, se muestra y el editor sigue abierto', { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn(() => ({ ok: false, error: 'Máximo 5 mazos personalizados.' }))
    render(<MazoEditor borrador={{ nombre: 'Estásis (copia)', cardIds: estasis.cardIds }} onGuardar={onGuardar} onCancelar={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Guardar mazo' }))
    expect(onGuardar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent('Máximo 5 mazos personalizados.')
    expect(screen.getByRole('button', { name: 'Guardar mazo' })).toBeInTheDocument()
  })
})
