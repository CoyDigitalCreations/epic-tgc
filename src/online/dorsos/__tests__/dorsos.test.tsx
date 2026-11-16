import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FACCIONES } from '../../../shared/types'
import type { CardInstance } from '../../game'
import { MiniCard } from '../../components/MiniCard'
import { DorsosContext } from '../contexto'
import { DorsoCarta } from '../DorsoCarta'
import { DORSO_INICIAL, DORSOS, normalizarDorso, normalizarDorsoBot, resolverDorsoBot } from '../dorsos'

const inst = (extra: Partial<CardInstance> = {}): CardInstance => ({
  cardInstanceId: 'x',
  cardId: null,
  owner: 'B',
  ...extra,
})

describe('catálogo de reversos', () => {
  it('ofrece 5 patrones con id correlativo desde 0 (el CHECK de la base admite 0-4)', () => {
    expect(DORSOS.map((d) => d.id)).toEqual([0, 1, 2, 3, 4])
    expect(new Set(DORSOS.map((d) => d.nombre)).size).toBe(5)
  })

  it('un valor desconocido cae al reverso inicial', () => {
    expect(normalizarDorso(3)).toBe(3)
    for (const raro of [-1, 5, 1.5, NaN, '2', null, undefined, {}]) expect(normalizarDorso(raro)).toBe(DORSO_INICIAL)
  })
})

describe('reverso del bot', () => {
  it('normalizarDorsoBot acepta «auto» y los reversos válidos; lo demás vuelve a «auto»', () => {
    expect(normalizarDorsoBot('auto')).toBe('auto')
    expect(normalizarDorsoBot(3)).toBe(3)
    for (const raro of [-1, 5, 1.5, NaN, '2', null, undefined, {}]) expect(normalizarDorsoBot(raro)).toBe('auto')
  })

  it('una elección explícita se respeta tal cual, incluso igual al reverso propio', () => {
    expect(resolverDorsoBot(2, 2, 123)).toBe(2)
    expect(resolverDorsoBot(0, 3, 5)).toBe(0)
  })

  it('«auto» es SIEMPRE distinto al propio, para cualquier reverso y semilla (también negativas o decimales)', () => {
    for (const propio of DORSOS.map((d) => d.id)) {
      for (const semilla of [0, 1, 2, 3, 4, 5, 7, 99_999, -1, -7, 3.9]) {
        const bot = resolverDorsoBot('auto', propio, semilla)
        expect(bot, `${propio}/${semilla}`).not.toBe(propio)
        expect(normalizarDorso(bot)).toBe(bot)
      }
    }
  })

  it('«auto» varía con la semilla: una partida nueva puede estrenar reverso', () => {
    const vistos = new Set([0, 1, 2, 3].map((s) => resolverDorsoBot('auto', 0, s)))
    expect(vistos.size).toBe(4)
  })

  it('«auto» es determinista: misma semilla y mismo reverso propio, mismo resultado', () => {
    expect(resolverDorsoBot('auto', 2, 42)).toBe(resolverDorsoBot('auto', 2, 42))
  })
})

describe('DorsoCarta', () => {
  it.each(DORSOS.map((d) => d.id))('el reverso %i dibuja las 8 facciones y el lienzo de la carta (744×1038)', (id) => {
    const { container } = render(<DorsoCarta id={id} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 744 1038')
    expect(svg.getAttribute('data-dorso')).toBe(String(id))
    const dibujadas = [...container.querySelectorAll('[data-faccion]')].map((g) => g.getAttribute('data-faccion'))
    expect([...dibujadas].sort()).toEqual([...FACCIONES].sort())
  })

  it('es monocromo: ningún color de facción ni relleno de esmalte', () => {
    const { container } = render(<DorsoCarta id={0} />)
    const colores = new Set<string>()
    for (const el of container.querySelectorAll('[stroke],[fill],[stop-color]')) {
      for (const a of ['stroke', 'fill', 'stop-color']) {
        const v = el.getAttribute(a)
        if (v && v.startsWith('#')) colores.add(v.toLowerCase())
      }
    }
    // Todos los tonos son azules-violáceos apagados (canal azul dominante), sin rojos/verdes/amarillos de facción
    for (const c of colores) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
      expect(b, c).toBeGreaterThanOrEqual(g)
      expect(b, c).toBeGreaterThanOrEqual(r)
    }
  })

  it('dos reversos en la misma página no comparten ids de SVG (cada patrón es suyo)', () => {
    const { container } = render(
      <>
        <DorsoCarta id={1} />
        <DorsoCarta id={1} />
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('un id fuera de rango se dibuja con el reverso inicial', () => {
    const { container } = render(<DorsoCarta id={99} />)
    expect(container.querySelector('svg')!.getAttribute('data-dorso')).toBe(String(DORSO_INICIAL))
  })
})

describe('MiniCard: el reverso es el de su DUEÑO', () => {
  it('una carta oculta del rival se ve con el reverso que eligió el rival, no el mío', () => {
    const { container } = render(
      <DorsosContext.Provider value={{ A: 1, B: 4 }}>
        <MiniCard inst={inst({ owner: 'B' })} />
      </DorsosContext.Provider>,
    )
    expect(container.querySelector('svg')!.getAttribute('data-dorso')).toBe('4')
  })

  it('mi carta propia boca abajo usa MI reverso', () => {
    const { container } = render(
      <DorsosContext.Provider value={{ A: 1, B: 4 }}>
        <MiniCard inst={inst({ owner: 'A', cardId: 'FB-010' })} bocaAbajo />
      </DorsosContext.Provider>,
    )
    expect(container.querySelector('svg')!.getAttribute('data-dorso')).toBe('1')
  })

  it('sin proveedor usa el reverso inicial', () => {
    const { container } = render(<MiniCard inst={inst()} />)
    expect(container.querySelector('svg')!.getAttribute('data-dorso')).toBe(String(DORSO_INICIAL))
  })

  it('el dorso conserva la proporción de la carta (no cambia el tamaño)', () => {
    const { container } = render(<MiniCard inst={inst()} anchoPx={100} />)
    const caja = container.querySelector<HTMLElement>('[aria-label="Carta boca abajo"]')!
    expect(caja.style.aspectRatio).toBe('744/1038')
    expect(caja.style.width).toBe('100px')
  })
})
