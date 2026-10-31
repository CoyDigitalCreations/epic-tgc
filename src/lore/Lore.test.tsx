import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../AppRoutes'
import Lore from './Lore'
import {
  ALL_CARDS,
  DISONANCIA_CARDS,
  ESTASIS_CARDS,
  disonanciaDistribucion,
  estasisDistribucion,
} from '../shared/data/paquetes'
import { CAMPEONAS, CAMPEONES_DISONANCIA, CASAS, CICLO, CICLO_DISONANCIA, ETER_SUR, NORTE_SUR, SECCIONES } from './contenido'

// jsdom no trae IntersectionObserver (framer-motion lo usa en `whileInView`): un no-op basta, los elementos quedan en su estado inicial
beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
})
afterAll(() => vi.unstubAllGlobals())

function renderLore() {
  return render(
    <MemoryRouter>
      <Lore />
    </MemoryRouter>,
  )
}

describe('Lore', () => {
  it('muestra la portada y las 7 secciones del índice', () => {
    renderLore()
    expect(screen.getByRole('heading', { level: 1, name: 'ÉTER ENGINE TCG' })).toBeInTheDocument()
    for (const s of SECCIONES) {
      const ancla = document.getElementById(s.id)
      expect(ancla).not.toBeNull()
      expect(within(ancla!).getByRole('heading', { level: 2 })).toHaveTextContent(new RegExp(s.titulo, 'i'))
    }
  })

  it('el índice lateral enlaza a cada sección por ancla', () => {
    renderLore()
    for (const s of SECCIONES) {
      const enlace = screen.getAllByRole('link', { name: new RegExp(s.titulo) }).find((a) => a.getAttribute('href') === `#${s.id}`)
      expect(enlace).toBeDefined()
      expect(document.getElementById(s.id)).not.toBeNull()
    }
  })

  it('presenta a las 9 primogénitas con su arte (solo ilustración, sin marco de carta)', () => {
    renderLore()
    expect(CAMPEONAS).toHaveLength(9)
    for (const c of CAMPEONAS) {
      // Aurora aparece dos veces (su sección y la rejilla): todas apuntan al mismo arte
      const imgs = screen.getAllByAltText(`Ilustración de ${c.nombre}, ${c.titulo}`)
      for (const img of imgs) expect(img).toHaveAttribute('src', `/cartas/${c.id}.webp`)
    }
    // Ninguna imagen del lore usa las cartas completas del manual
    expect([...document.querySelectorAll('img')].some((i) => i.getAttribute('src')?.includes('/manual/cartas/'))).toBe(false)
  })

  it('cada casa y cada paso del ciclo llevan su ilustración', () => {
    renderLore()
    for (const c of CASAS) expect(screen.getByAltText(`Arte de ${c.nombre}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    for (const [i, c] of CICLO.entries()) {
      expect(screen.getByAltText(`Arte del paso ${i + 1}: ${c.titulo}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    }
  })

  it('dibuja el mapa del Eje con los dos polos y las seis facetas', () => {
    renderLore()
    const mapa = screen.getByRole('img', { name: /Mapa del Eje/ })
    for (const n of ['ORDEN', 'CAOS', 'LEY', 'PURGA', 'CREACIÓN', 'DESTRUCCIÓN', 'MUTACIÓN', 'ENTROPÍA']) {
      expect(within(mapa).getByText(n)).toBeInTheDocument()
    }
  })
})

describe('Lore del sur (Disonancia)', () => {
  it('suma las secciones 8-10 al índice, en orden', () => {
    renderLore()
    expect(SECCIONES.map((s) => s.id).slice(-3)).toEqual(['sur', 'ragnar', 'disonancia'])
    for (const id of ['sur', 'ragnar', 'disonancia']) expect(document.getElementById(id)).not.toBeNull()
  })

  it('presenta a los 10 campeones del mazo con su arte y la ficha de juego', () => {
    renderLore()
    expect(CAMPEONES_DISONANCIA).toHaveLength(10)
    for (const c of CAMPEONES_DISONANCIA) {
      const imgs = screen.getAllByAltText(`Ilustración de ${c.nombre}, ${c.titulo}`)
      for (const img of imgs) expect(img).toHaveAttribute('src', `/cartas/${c.id}.webp`)
    }
    expect(screen.getByText(/Coste 4 · ATQ 9 \/ RES 9/)).toBeInTheDocument()
  })

  it('las nueve cartas de Éter del sur muestran su frase y los cuatro tiempos del Aprieto su ilustración', () => {
    renderLore()
    expect(ETER_SUR).toHaveLength(9)
    for (const e of ETER_SUR) {
      expect(screen.getByAltText(`Arte de ${e.nombre}`)).toHaveAttribute('src', `/cartas/${e.id}.webp`)
      expect(screen.getByText(`“${e.frase}”`)).toBeInTheDocument()
    }
    for (const [i, c] of CICLO_DISONANCIA.entries()) {
      expect(screen.getByAltText(`Arte del paso ${i + 1}: ${c.titulo}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    }
  })

  it('la tabla norte/sur tiene una fila por rasgo', () => {
    renderLore()
    const tabla = screen.getByRole('table', { name: /norte \(Estásis\) y el sur \(Disonancia\)/i })
    expect(within(tabla).getAllByRole('row')).toHaveLength(NORTE_SUR.length + 1)
  })

  it('los textos del lore coinciden con las cartas del seed (nombre, coste, ATQ/RES y Éter)', () => {
    const porId = new Map((ALL_CARDS as Array<{ id: string; name: string; stats: { cost: number; poder?: number; resistencia?: number } }>).map((c) => [c.id, c]))
    for (const c of CAMPEONES_DISONANCIA) {
      const carta = porId.get(c.id)!
      expect(carta.name).toBe(`${c.nombre}, ${c.titulo}`)
      expect(c.linea).toBe(`Coste ${carta.stats.cost} · ATQ ${carta.stats.poder} / RES ${carta.stats.resistencia}`)
    }
    for (const e of ETER_SUR) expect(porId.get(e.id)!.name).toBe(e.nombre)
  })

  it('los conteos del mazo que anuncia la página coinciden con los de los paquetes', () => {
    expect(disonanciaDistribucion()).toMatchObject({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    expect(DISONANCIA_CARDS).toHaveLength(33)
    expect(estasisDistribucion()).toMatchObject({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    expect(ESTASIS_CARDS).toHaveLength(32)
  })
})

describe('Rutas del lore', () => {
  it('/lore carga la página y /primogenitos.html redirige a ella', async () => {
    render(
      <MemoryRouter initialEntries={['/primogenitos.html']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'ÉTER ENGINE TCG' })).toBeInTheDocument()
  })
})
