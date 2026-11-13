import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { FACCIONES, FACCION_COLORS } from '../../../../../shared/types'
import { MedallonFaccion } from '..'
import { hexAHsl, idSvg, tonosEsmalte } from '../colores'

describe('colores del arte en código', () => {
  it('convierte hex a HSL', () => {
    const [h, s, l] = hexAHsl('#ff0000')
    expect(Math.round(h)).toBe(0)
    expect(Math.round(s)).toBe(100)
    expect(Math.round(l)).toBe(50)
  })

  it('un valor que no es hex devuelve un gris en vez de romper', () => {
    expect(hexAHsl('rojo')).toEqual([0, 0, 50])
  })

  it('el esmalte es más oscuro que el color de la facción (salvo el blanco, que se acota)', () => {
    const [, , lColor] = hexAHsl('#f97316')
    const medio = tonosEsmalte('#f97316').medio
    const lEsmalte = Number(/(\d+)%\)$/.exec(medio)?.[1])
    expect(lEsmalte).toBeLessThan(lColor)
    expect(tonosEsmalte('#ffffff').medio).toContain('66%')
  })

  it('idSvg quita los dos puntos de useId para poder usarlo en url(#…)', () => {
    expect(idSvg(':r1a:')).toBe('r1a')
  })
})

describe('MedallonFaccion', () => {
  it.each(FACCIONES)('dibuja el medallón de %s con su color y su nombre accesible', (faccion) => {
    const { getByRole, container } = render(<MedallonFaccion color={FACCION_COLORS[faccion]} nombre={faccion} size={50} />)
    expect(getByRole('img', { name: faccion })).toBeInTheDocument()
    expect(container.querySelector('image, img')).toBeNull()
  })

  it('sin nombre es decorativo (aria-hidden)', () => {
    const { container } = render(<MedallonFaccion color="#ec4899" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('dos medallones a la vez no comparten ids (los degradados no se pisan)', () => {
    const { container } = render(
      <>
        <MedallonFaccion color="#ec4899" nombre="Purga" />
        <MedallonFaccion color="#84cc16" nombre="Mutación" />
      </>,
    )
    const ids = Array.from(container.querySelectorAll('[id]')).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
