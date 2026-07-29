import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageUpload } from '../ImageUpload'

describe('ImageUpload', () => {
  it('renders the drop zone', () => {
    const onChange = vi.fn()
    render(<ImageUpload value={undefined} onChange={onChange} />)
    expect(screen.getByText('Arte de la carta')).toBeInTheDocument()
    expect(screen.getByText(/Soltó una imagen acá/)).toBeInTheDocument()
  })

  it('shows the image preview when value is set', () => {
    const onChange = vi.fn()
    render(<ImageUpload value="data:image/png;base64,test" onChange={onChange} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,test')
  })

  it('shows remove button when image is present', () => {
    const onChange = vi.fn()
    render(<ImageUpload value="data:image/png;base64,test" onChange={onChange} />)
    const removeBtn = screen.getByText('✕')
    expect(removeBtn).toBeInTheDocument()
  })

  it('calls onChange with undefined on remove', () => {
    const onChange = vi.fn()
    render(<ImageUpload value="data:image/png;base64,test" onChange={onChange} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('renders file input with correct accept attribute', () => {
    const onChange = vi.fn()
    const { container } = render(<ImageUpload value={undefined} onChange={onChange} />)
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/avif')
  })
})
